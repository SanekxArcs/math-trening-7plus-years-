import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { checkDevice } from "./auth";
import { sha256 } from "./sha256.js";

const DEFAULTS = {
  ops: ["add", "mul"] as ("add" | "sub" | "mul" | "div")[],
  limit1: 9,
  limit2: 9,
  includeZeroOne: false,
  difficulty: "medium" as const,
  timerEnabled: false,
  timerSec: 10,
  goalEnabled: true,
  goalTarget: 200,
  halfHalfEnabled: true,
  halfHalfCooldownSec: 30,
  visualHintEnabled: true,
  soundEnabled: true,
  adaptive: true,
};

export const findByPairCode = internalQuery({
  args: { pairCode: v.string() },
  handler: async (ctx, { pairCode }) =>
    ctx.db
      .query("profiles")
      .withIndex("by_pairCode", (q) => q.eq("pairCode", pairCode))
      .unique(),
});

export const insert = internalMutation({
  args: {
    name: v.string(),
    avatarEmoji: v.string(),
    pairCode: v.string(),
    pinHash: v.string(),
    pinSalt: v.string(),
    deviceTokenHash: v.string(),
    locale: v.string(),
  },
  handler: async (ctx, args) => {
    const clash = await ctx.db
      .query("profiles")
      .withIndex("by_pairCode", (q) => q.eq("pairCode", args.pairCode))
      .unique();
    if (clash) throw new ConvexError("PAIR_CODE_TAKEN");

    const profileId = await ctx.db.insert("profiles", {
      ...args,
      createdAt: Date.now(),
    });

    await ctx.db.insert("settings", {
      profileId,
      ...DEFAULTS,
      updatedAt: Date.now(),
      updatedBy: "device",
    });

    return { profileId, pairCode: args.pairCode };
  },
});

export const addDevice = internalMutation({
  args: { profileId: v.id("profiles"), tokenHash: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("devices", { ...args, createdAt: Date.now() });
  },
});

/**
 * A device signing itself out: its token stops working here and now, rather
 * than lingering valid on a tablet that has been handed on.
 *
 * A linked device's token is simply deleted. The device that made the profile
 * holds the profile's own token, which cannot be deleted — so it is replaced
 * with one nobody holds. Every other linked device keeps working either way.
 */
export const signOutDevice = mutation({
  args: { profileId: v.id("profiles"), deviceToken: v.string() },
  handler: async (ctx, { profileId, deviceToken }) => {
    const profile = await checkDevice(ctx, profileId, deviceToken);
    if (!profile) return;
    const tokenHash = sha256(deviceToken);
    if (profile.deviceTokenHash === tokenHash) {
      await ctx.db.patch(profileId, { deviceTokenHash: `revoked:${crypto.randomUUID()}` });
      return;
    }
    const linked = await ctx.db
      .query("devices")
      .withIndex("by_profile_token", (q) => q.eq("profileId", profileId).eq("tokenHash", tokenHash))
      .unique();
    if (linked) await ctx.db.delete(linked._id);
  },
});
