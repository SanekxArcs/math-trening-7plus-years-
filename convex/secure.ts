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

/** Admin sessions last a working day, like the parents'. */
const ADMIN_SESSION_MS = 1000 * 60 * 60 * 12;
/** Anything shorter is too easy to guess for the key to every child's data. */
const ADMIN_PASSWORD_MIN = 12;

/**
 * The owner's way in. The password lives only in the Convex environment
 * (`npx convex env set ADMIN_PASSWORD …`), never in the app bundle, so the
 * page can be public without the power behind it being.
 */
export const adminLogin = action({
  args: { password: v.string() },
  handler: async (ctx, { password }): Promise<{ token: string; expiresAt: number }> => {
    const expected = process.env.ADMIN_PASSWORD ?? "";
    if (expected.length < ADMIN_PASSWORD_MIN) throw new ConvexError("ADMIN_NOT_SET_UP");
    // Counted before the check, so a burst of parallel guesses is limited too:
    // ten tries per quarter of an hour, then a quarter of an hour locked.
    const gate = await ctx.runMutation(internal.admin.beginLogin, {});
    if (gate.locked) throw new ConvexError("ADMIN_LOCKED");
    // A pause on every attempt, right or wrong: guessing gets slow.
    await new Promise((resolve) => setTimeout(resolve, 600));
    // Compared as hashes, so the comparison runs over equal-length strings.
    if (!safeEqual(sha256(password), sha256(expected))) throw new ConvexError("ADMIN_WRONG");
    await ctx.runMutation(internal.admin.loginSucceeded, {});

    const token = generateToken();
    const expiresAt = Date.now() + ADMIN_SESSION_MS;
    await ctx.runMutation(internal.admin.openSession, { tokenHash: sha256(token), expiresAt });
    return { token, expiresAt };
  },
});

/**
 * A new PIN, from inside the dashboard. The current PIN is asked for again
 * even though the parent is signed in: a dashboard left open on a shared
 * laptop should not be enough to lock the parent out of their own child's
 * profile.
 */
export const changePin = action({
  args: { token: v.string(), currentPin: v.string(), newPin: v.string() },
  handler: async (ctx, { token, currentPin, newPin }): Promise<void> => {
    if (!/^\d{4,8}$/.test(newPin)) throw new ConvexError("PIN must be 4 to 8 digits");
    const current = await ctx.runQuery(internal.parent.pinForSession, { token });
    if (!safeEqual(current.pinHash, hashPin(currentPin, current.pinSalt))) {
      throw new ConvexError("The current PIN is not right");
    }
    const pinSalt = randomBytes(16).toString("base64");
    await ctx.runMutation(internal.parent.setPin, {
      profileId: current.profileId,
      pinHash: hashPin(newPin, pinSalt),
      pinSalt,
      keepToken: token,
    });
  },
});

/**
 * Puts an existing profile back on a device: the tablet whose site data was
 * cleared, or a second one. The same pairing code and PIN as the dashboard,
 * because this hands out a device token — enough to write to the child's
 * history and read their progress.
 */
export const linkDevice = action({
  args: { pairCode: v.string(), pin: v.string() },
  handler: async (
    ctx,
    { pairCode, pin },
  ): Promise<{ profileId: Id<"profiles">; pairCode: string; deviceToken: string; name: string }> => {
    const profile = await ctx.runQuery(internal.profiles.findByPairCode, {
      pairCode: pairCode.trim().toUpperCase(),
    });
    if (!profile || !safeEqual(profile.pinHash, hashPin(pin, profile.pinSalt))) {
      throw new ConvexError("That pairing code and PIN do not match");
    }

    const deviceToken = generateToken();
    await ctx.runMutation(internal.profiles.addDevice, {
      profileId: profile._id,
      tokenHash: sha256(deviceToken),
    });
    return { profileId: profile._id, pairCode: profile.pairCode, deviceToken, name: profile.name };
  },
});
