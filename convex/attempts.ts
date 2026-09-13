import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireDevice } from "./auth";

const attemptFields = {
  clientId: v.string(),
  op: v.string(),
  a: v.number(),
  b: v.number(),
  prompt: v.string(),
  answer: v.number(),
  given: v.union(v.number(), v.null()),
  isCorrect: v.boolean(),
  mode: v.string(),
  optionsShown: v.array(v.number()),
  ms: v.number(),
  usedHalfHalf: v.boolean(),
  usedVisualHint: v.boolean(),
  comboAt: v.number(),
  pointsDelta: v.number(),
  difficulty: v.string(),
  createdAt: v.number(),
};

/**
 * Accepts a batch from the device outbox.
 *
 * Idempotent on `clientId`: replaying a queue after a flaky reconnect — which
 * is the normal case on a tablet, not the exception — can never double-count an
 * answer or inflate the score the parent sees. This is the single property that
 * makes offline sync trustworthy rather than merely present.
 */
export const record = mutation({
  args: {
    profileId: v.id("profiles"),
    deviceToken: v.string(),
    records: v.array(v.object(attemptFields)),
  },
  handler: async (ctx, { profileId, deviceToken, records }) => {
    await requireDevice(ctx, profileId, deviceToken);

    let inserted = 0;
    for (const record of records) {
      const existing = await ctx.db
        .query("attempts")
        .withIndex("by_client", (q) =>
          q.eq("profileId", profileId).eq("clientId", record.clientId),
        )
        .unique();

      if (existing) continue;
      await ctx.db.insert("attempts", { profileId, ...record });
      inserted++;
    }

    return { accepted: records.length, inserted };
  },
});

/** Live settings for the kid's device. Parent edits arrive through this. */
export const settingsForDevice = query({
  args: { profileId: v.id("profiles"), deviceToken: v.string() },
  handler: async (ctx, { profileId, deviceToken }) => {
    await requireDevice(ctx, profileId, deviceToken);
    return ctx.db
      .query("settings")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .unique();
  },
});
