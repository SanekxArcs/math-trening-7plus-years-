"use node";

import { pbkdf2Sync, randomBytes } from "node:crypto";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { sha256 } from "./sha256.js";
import type { Id } from "./_generated/dataModel";

/**
 * Everything that needs the Node runtime, in one file.
 *
 * Convex runs `"use node"` modules separately from the V8 runtime that queries
 * and mutations use, and such a module may only export actions — so the key
 * derivation helpers live here beside the two actions that need them rather
 * than in a shared module the V8 bundle would try to pull in.
 */

const ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const PARENT_SESSION_MS = 1000 * 60 * 60 * 12;

/** No O/0, I/1 or S/5 — this code gets read aloud and written on a fridge. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRTUVWXYZ2346789";

function generatePairCode(): string {
  return Array.from(
    randomBytes(6),
    (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length],
  ).join("");
}

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashPin(pin: string, salt: string): string {
  return pbkdf2Sync(pin, salt, ITERATIONS, KEY_LENGTH, "sha256").toString("base64");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Creates a kid profile and returns the two credentials the app then holds: the
 * pairing code a parent types on another machine, and the device token this
 * tablet keeps so it can post attempts. The PIN never leaves this call.
 */
export const createProfile = action({
  args: {
    name: v.string(),
    avatarEmoji: v.optional(v.string()),
    pin: v.string(),
    locale: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ profileId: Id<"profiles">; pairCode: string; deviceToken: string }> => {
    if (!/^\d{4,8}$/.test(args.pin)) throw new ConvexError("PIN must be 4 to 8 digits");
    if (args.name.trim().length === 0) throw new ConvexError("Name is required");

    const pinSalt = randomBytes(16).toString("base64");
    const pinHash = hashPin(args.pin, pinSalt);
    const deviceToken = generateToken();

    // Retry the astronomically unlikely code collision rather than handing the
    // user an error they can do nothing about.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const { profileId, pairCode } = await ctx.runMutation(internal.profiles.insert, {
          name: args.name.trim(),
          avatarEmoji: args.avatarEmoji ?? "🦊",
          pairCode: generatePairCode(),
          pinHash,
          pinSalt,
          deviceTokenHash: sha256(deviceToken),
          locale: args.locale ?? "pl",
        });
        return { profileId, pairCode, deviceToken };
      } catch (error) {
        if (!String((error as ConvexError<string>)?.data ?? error).includes("PAIR_CODE_TAKEN")) {
          throw error;
        }
      }
    }
    throw new ConvexError("Could not allocate a pairing code, please try again");
  },
});

/**
 * Pairing code plus PIN, exchanged for a session token.
 *
 * The code alone is deliberately not enough: it gets written on a fridge and
 * read out over calls, and it unlocks both the child's history and the settings
 * that govern their game.
 */
export const parentLogin = action({
  args: { pairCode: v.string(), pin: v.string() },
  handler: async (
    ctx,
    { pairCode, pin },
  ): Promise<{
    token: string;
    profileId: Id<"profiles">;
    name: string;
    expiresAt: number;
  }> => {
    const profile = await ctx.runQuery(internal.profiles.findByPairCode, {
      pairCode: pairCode.trim().toUpperCase(),
    });

    // Identical rejection either way, so probing codes cannot be told apart
    // from probing PINs.
    if (!profile || !safeEqual(profile.pinHash, hashPin(pin, profile.pinSalt))) {
      throw new ConvexError("That pairing code and PIN do not match");
    }

    const token = generateToken();
    const expiresAt = Date.now() + PARENT_SESSION_MS;
    await ctx.runMutation(internal.parent.openSession, {
      profileId: profile._id,
      tokenHash: sha256(token),
      expiresAt,
    });

    return { token, profileId: profile._id, name: profile.name, expiresAt };
  },
});
