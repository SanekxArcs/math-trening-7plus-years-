import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { checkDevice } from "./auth";
import { EMPTY_FACT, factId, updateFact } from "../src/engine/mastery.ts";
import { clampAttemptMs } from "../src/engine/timing.ts";
import type { Difficulty, Op } from "../src/engine/types.ts";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const attemptFields = {
  clientId: v.string(),
  op: v.string(),
  a: v.number(),
  b: v.number(),
  factA: v.number(),
  factB: v.number(),
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
    // Same reasoning as the query: a device whose profile has gone should be
    // told so once, rather than retrying the same rejected batch every 30
    // seconds for the life of the install.
    if (!(await checkDevice(ctx, profileId, deviceToken))) {
      return { accepted: records.length, inserted: 0, unlinked: true as const };
    }

    let inserted = 0;
    for (const record of records) {
      const existing = await ctx.db
        .query("attempts")
        .withIndex("by_client", (q) =>
          q.eq("profileId", profileId).eq("clientId", record.clientId),
        )
        .unique();

      if (existing) continue;

      // The device already caps this, but the cap is enforced here too: it is
      // the last point before a wild response time — an old build, a wrong
      // clock — becomes part of an average the parent reads as fact.
      const row = { ...record, ms: clampAttemptMs(record.ms) };
      await ctx.db.insert("attempts", { profileId, ...row });
      await foldIntoFact(ctx, profileId, row);
      inserted++;
    }

    return { accepted: records.length, inserted, unlinked: false as const };
  },
});

/**
 * Keeps the per-fact record in step with the attempt just written.
 *
 * Runs inside the same idempotency guard as the insert, so a replayed batch
 * cannot count an answer twice here either — that guarantee is what lets the
 * dashboard grid be trusted rather than merely indicative.
 *
 * The maths is imported from the same engine module the device uses, so the
 * strength a parent sees can never drift from the one driving the child's
 * question selection.
 */
async function foldIntoFact(
  ctx: MutationCtx,
  profileId: Id<"profiles">,
  record: {
    op: string;
    factA: number;
    factB: number;
    difficulty: string;
    isCorrect: boolean;
    ms: number;
    usedHalfHalf: boolean;
    usedVisualHint: boolean;
    createdAt: number;
  },
) {
  const factKey = factId(
    record.op as Op,
    record.factA,
    record.factB,
    record.difficulty as Difficulty,
  );

  const existing = await ctx.db
    .query("factStats")
    .withIndex("by_profile_fact", (q) =>
      q.eq("profileId", profileId).eq("factKey", factKey),
    )
    .unique();

  const next = updateFact(
    existing
      ? {
          attempts: existing.attempts,
          correct: existing.correct,
          totalMs: existing.totalMs,
          bestMs: existing.bestMs,
          strength: existing.strength,
          lastSeenAt: existing.lastSeenAt,
        }
      : EMPTY_FACT,
    {
      isCorrect: record.isCorrect,
      ms: record.ms,
      difficulty: record.difficulty as Difficulty,
      aided: record.usedHalfHalf || record.usedVisualHint,
    },
    record.createdAt,
  );

  if (existing) {
    await ctx.db.patch(existing._id, next);
    return;
  }

  await ctx.db.insert("factStats", {
    profileId,
    factKey,
    op: record.op,
    a: record.factA,
    b: record.factB,
    difficulty: record.difficulty,
    ...next,
  });
}

/** Live settings for the kid's device. Parent edits arrive through this. */
export const settingsForDevice = query({
  args: { profileId: v.id("profiles"), deviceToken: v.string() },
  handler: async (ctx, { profileId, deviceToken }) => {
    const profile = await checkDevice(ctx, profileId, deviceToken);
    // Reported, not thrown: this query is subscribed for the life of the app,
    // and a profile deleted from the dashboard would otherwise crash the game
    // a child is in the middle of.
    if (!profile) return { status: "unlinked" as const };

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .unique();

    // The locale rides along on the same subscription, so a language change
    // made by the parent reaches the tablet without a second round trip.
    return {
      status: "ok" as const,
      settings: settings ? { ...settings, locale: profile.locale } : null,
    };
  },
});
