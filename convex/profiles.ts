import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

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
