import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireParent } from "./auth";
import { settingsPatchFields } from "./schema";
import { sha256 } from "./sha256.js";

export const openSession = internalMutation({
  args: { profileId: v.id("profiles"), tokenHash: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    // Opportunistically drop this profile's expired sessions so the table does
    // not grow without bound.
    const stale = await ctx.db
      .query("parentSessions")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
    for (const session of stale) {
      if (session.expiresAt < Date.now()) await ctx.db.delete(session._id);
    }

    await ctx.db.insert("parentSessions", { ...args, createdAt: Date.now() });
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("parentSessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", sha256(token)))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

export const overview = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const profile = await requireParent(ctx, token);

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .unique();

    // Bounded on purpose: the dashboard summarises recent practice, and an
    // unbounded collect() would eventually blow the read limit on a profile
    // with months of history.
    const recent = await ctx.db
      .query("attempts")
      .withIndex("by_profile_created", (q) => q.eq("profileId", profile._id))
      .order("desc")
      .take(500);

    const byOperation: Record<string, { correct: number; total: number }> = {};
    const byFact: Record<string, { correct: number; total: number; wrongAnswers: number[] }> = {};
    let correct = 0;
    let totalMs = 0;

    for (const attempt of recent) {
      if (attempt.isCorrect) correct++;
      totalMs += attempt.ms;

      const op = (byOperation[attempt.op] ??= { correct: 0, total: 0 });
      op.total++;
      if (attempt.isCorrect) op.correct++;

      const key = `${attempt.op}:${attempt.a}:${attempt.b}`;
      const fact = (byFact[key] ??= { correct: 0, total: 0, wrongAnswers: [] });
      fact.total++;
      if (attempt.isCorrect) fact.correct++;
      else if (attempt.given !== null) fact.wrongAnswers.push(attempt.given);
    }

    // The facts worth practising: most-missed first, ties broken by attempts.
    const weakest = Object.entries(byFact)
      .filter(([, stats]) => stats.total - stats.correct > 0)
      .sort((a, b) => {
        const missedA = a[1].total - a[1].correct;
        const missedB = b[1].total - b[1].correct;
        return missedB - missedA || b[1].total - a[1].total;
      })
      .slice(0, 8)
      .map(([key, stats]) => ({ fact: key, ...stats }));

    return {
      profile: {
        id: profile._id,
        name: profile.name,
        avatarEmoji: profile.avatarEmoji,
        pairCode: profile.pairCode,
        locale: profile.locale,
      },
      settings,
      stats: {
        sampled: recent.length,
        correct,
        accuracy: recent.length === 0 ? 0 : correct / recent.length,
        averageMs: recent.length === 0 ? 0 : Math.round(totalMs / recent.length),
        byOperation,
        weakest,
      },
    };
  },
});

export const history = query({
  args: {
    token: v.string(),
    limit: v.optional(v.number()),
    before: v.optional(v.number()),
  },
  handler: async (ctx, { token, limit, before }) => {
    const profile = await requireParent(ctx, token);
    const take = Math.min(limit ?? 50, 200);

    const rows = await ctx.db
      .query("attempts")
      .withIndex("by_profile_created", (q) =>
        before === undefined
          ? q.eq("profileId", profile._id)
          : q.eq("profileId", profile._id).lt("createdAt", before),
      )
      .order("desc")
      .take(take);

    return {
      rows,
      nextBefore: rows.length === take ? rows[rows.length - 1]?.createdAt : null,
    };
  },
});

export const updateSettings = mutation({
  args: { token: v.string(), patch: v.object(settingsPatchFields) },
  handler: async (ctx, { token, patch }) => {
    const profile = await requireParent(ctx, token);

    const current = await ctx.db
      .query("settings")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .unique();
    if (!current) throw new ConvexError("Settings row is missing");

    const next = { ...patch };
    if (next.ops !== undefined && next.ops.length === 0) {
      throw new ConvexError("Pick at least one operation");
    }
    for (const [key, bounds] of Object.entries(LIMITS)) {
      const value = next[key as keyof typeof next];
      if (typeof value === "number") {
        (next as Record<string, unknown>)[key] = Math.min(
          bounds.max,
          Math.max(bounds.min, Math.round(value)),
        );
      }
    }

    await ctx.db.patch(current._id, {
      ...next,
      updatedAt: Date.now(),
      updatedBy: "parent" as const,
    });
  },
});

/** Server-side clamps, so a hand-crafted request cannot set limit1 to -5. */
const LIMITS = {
  limit1: { min: 1, max: 100 },
  limit2: { min: 1, max: 100 },
  timerSec: { min: 3, max: 120 },
  goalTarget: { min: 20, max: 5000 },
  halfHalfCooldownSec: { min: 0, max: 600 },
} as const;
