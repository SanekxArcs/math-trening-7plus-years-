import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { checkDevice } from "./auth";
import { progressFields } from "./schema";

/** The backed-up progress, for the device to restore from. */
export const forDevice = query({
  args: { profileId: v.id("profiles"), deviceToken: v.string() },
  handler: async (ctx, { profileId, deviceToken }) => {
    if (!(await checkDevice(ctx, profileId, deviceToken))) {
      return { status: "unlinked" as const };
    }
    const row = await ctx.db
      .query("progress")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .unique();
    if (!row) return { status: "ok" as const, progress: null };
    const { coins, lastBonusDay, pets, activeId, savedAt, level } = row;
    return {
      status: "ok" as const,
      progress: { coins, lastBonusDay, pets, activeId, savedAt, level },
    };
  },
});

/**
 * Backs up the device's progress.
 *
 * The newest snapshot wins, by the device clock of the change it carries: a
 * device coming back online with an older copy — the tablet that sat in a
 * drawer while the phone was played on — must not overwrite newer progress.
 * The level is part of the snapshot like everything else: losing a game sends
 * it back to 1, so "keep the highest" would quietly undo that.
 */
export const save = mutation({
  args: {
    profileId: v.id("profiles"),
    deviceToken: v.string(),
    progress: v.object(progressFields),
  },
  handler: async (ctx, { profileId, deviceToken, progress }) => {
    if (!(await checkDevice(ctx, profileId, deviceToken))) {
      return { status: "unlinked" as const };
    }

    const incoming = {
      ...progress,
      coins: Math.max(0, Math.floor(progress.coins)),
      level: Math.max(1, Math.floor(progress.level)),
    };

    const existing = await ctx.db
      .query("progress")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .unique();

    if (!existing) {
      await ctx.db.insert("progress", { profileId, ...incoming, updatedAt: Date.now() });
      return { status: "ok" as const, applied: true };
    }

    if (incoming.savedAt < existing.savedAt) {
      return { status: "ok" as const, applied: false };
    }

    await ctx.db.patch(existing._id, { ...incoming, updatedAt: Date.now() });
    return { status: "ok" as const, applied: true };
  },
});
