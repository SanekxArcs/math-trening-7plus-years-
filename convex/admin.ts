import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { sha256 } from "./sha256.js";

const DAY = 86_400_000;
/** How far back the activity numbers look, and how many answers they read at most. */
const WINDOW_DAYS = 30;
const SAMPLE = 8000;
/** Deletions per mutation, well inside Convex's per-transaction limits. */
const BATCH = 500;

/**
 * Every admin function goes through here. The page itself is public; this is
 * what makes it useless without the password.
 */
async function isAdmin(ctx: QueryCtx | MutationCtx, token: string): Promise<boolean> {
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", sha256(token)))
    .unique();
  return session !== null && session.expiresAt >= Date.now();
}

async function requireAdmin(ctx: QueryCtx | MutationCtx, token: string): Promise<void> {
  if (!(await isAdmin(ctx, token))) throw new ConvexError("ADMIN_SIGNED_OUT");
}

export const openSession = internalMutation({
  args: { tokenHash: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    // Drop expired sessions as new ones open, so the table never grows.
    for (const stale of await ctx.db.query("adminSessions").collect()) {
      if (stale.expiresAt < Date.now()) await ctx.db.delete(stale._id);
    }
    await ctx.db.insert("adminSessions", { ...args, createdAt: Date.now() });
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", sha256(token)))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

const dayKey = (at: number) => new Date(at).toISOString().slice(0, 10);

/**
 * Everything the admin page shows, in one read: headline numbers, a daily
 * activity series, the latest answers across everyone, and a row per user.
 *
 * Bounded like the parent dashboard: the last 30 days of answers, capped, so
 * the page keeps working however long the app has been running.
 */
export const overview = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    // Null rather than a throw: a subscribed query that throws takes the page
    // down, where a session that ran out should just mean "sign in again".
    if (!(await isAdmin(ctx, token))) return null;
    const now = Date.now();
    const since = now - WINDOW_DAYS * DAY;

    const profiles = await ctx.db.query("profiles").take(2000);
    const progress = await ctx.db.query("progress").take(2000);
    const devices = await ctx.db.query("devices").take(4000);
    const recent = await ctx.db
      .query("attempts")
      .withIndex("by_created", (q) => q.gte("createdAt", since))
      .order("desc")
      .take(SAMPLE);

    const progressBy = new Map(progress.map((row) => [row.profileId, row]));
    const devicesBy = new Map<Id<"profiles">, number>();
    for (const device of devices) devicesBy.set(device.profileId, (devicesBy.get(device.profileId) ?? 0) + 1);

    type Usage = { last: number; answers: number; correct: number; week: number };
    const usage = new Map<Id<"profiles">, Usage>();
    const byDay = new Map<string, { total: number; correct: number; active: Set<string> }>();
    const activeSince = (from: number) => new Set(recent.filter((a) => a.createdAt >= from).map((a) => a.profileId)).size;

    for (const attempt of recent) {
      const entry = usage.get(attempt.profileId) ?? { last: 0, answers: 0, correct: 0, week: 0 };
      entry.last = Math.max(entry.last, attempt.createdAt);
      entry.answers++;
      if (attempt.isCorrect) entry.correct++;
      if (attempt.createdAt >= now - 7 * DAY) entry.week++;
      usage.set(attempt.profileId, entry);

      const bucket = byDay.get(dayKey(attempt.createdAt)) ?? { total: 0, correct: 0, active: new Set<string>() };
      bucket.total++;
      if (attempt.isCorrect) bucket.correct++;
      bucket.active.add(attempt.profileId);
      byDay.set(dayKey(attempt.createdAt), bucket);
    }

    // Dense, oldest first: a quiet day shows as a gap, not as nothing.
    const daily = Array.from({ length: 14 }, (_, i) => {
      const day = dayKey(now - (13 - i) * DAY);
      const bucket = byDay.get(day);
      return { day, total: bucket?.total ?? 0, correct: bucket?.correct ?? 0, active: bucket?.active.size ?? 0 };
    });

    const week = recent.filter((a) => a.createdAt >= now - 7 * DAY);
    const names = new Map(profiles.map((profile) => [profile._id, profile]));

    return {
      totals: {
        users: profiles.length,
        newThisWeek: profiles.filter((profile) => profile.createdAt >= now - 7 * DAY).length,
        activeToday: activeSince(now - DAY),
        activeWeek: activeSince(now - 7 * DAY),
        activeMonth: activeSince(since),
        answersWeek: week.length,
        accuracyWeek: week.length === 0 ? null : week.filter((a) => a.isCorrect).length / week.length,
        devices: profiles.length + devices.length,
        sampled: recent.length,
        capped: recent.length === SAMPLE,
      },
      daily,
      feed: recent.slice(0, 40).map((attempt) => ({
        id: attempt._id,
        profileId: attempt.profileId,
        name: names.get(attempt.profileId)?.name ?? "?",
        avatarEmoji: names.get(attempt.profileId)?.avatarEmoji ?? "❔",
        prompt: attempt.prompt,
        answer: attempt.answer,
        given: attempt.given,
        isCorrect: attempt.isCorrect,
        createdAt: attempt.createdAt,
      })),
      users: profiles
        .map((profile) => {
          const used = usage.get(profile._id);
          const saved = progressBy.get(profile._id);
          return {
            id: profile._id,
            name: profile.name,
            avatarEmoji: profile.avatarEmoji,
            pairCode: profile.pairCode,
            locale: profile.locale,
            createdAt: profile.createdAt,
            lastActiveAt: used?.last ?? null,
            answersMonth: used?.answers ?? 0,
            answersWeek: used?.week ?? 0,
            accuracy: used && used.answers > 0 ? used.correct / used.answers : null,
            level: saved?.level ?? 1,
            coins: saved?.coins ?? null,
            pets: saved?.pets.length ?? 0,
            devices: 1 + (devicesBy.get(profile._id) ?? 0),
          };
        })
        .sort((a, b) => (b.lastActiveAt ?? b.createdAt / 1e6) - (a.lastActiveAt ?? a.createdAt / 1e6)),
    };
  },
});

/** Deletes up to BATCH of a profile's answers and fact stats; says whether any are left. */
async function purgeHistory(ctx: MutationCtx, profileId: Id<"profiles">): Promise<boolean> {
  const attempts = await ctx.db
    .query("attempts")
    .withIndex("by_profile_created", (q) => q.eq("profileId", profileId))
    .take(BATCH);
  for (const row of attempts) await ctx.db.delete(row._id);
  const facts = await ctx.db
    .query("factStats")
    .withIndex("by_profile_fact", (q) => q.eq("profileId", profileId))
    .take(BATCH);
  for (const row of facts) await ctx.db.delete(row._id);
  return attempts.length === BATCH || facts.length === BATCH;
}

/** The leftover history of a deleted profile, cleared in the background a batch at a time. */
export const purgeRemaining = internalMutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    if (await purgeHistory(ctx, profileId)) {
      await ctx.scheduler.runAfter(0, internal.admin.purgeRemaining, { profileId });
    }
  },
});

/**
 * Deletes a user and everything attached to them.
 *
 * The name must be typed back exactly — the same guard as the command-line
 * purge, which exists because deleting by id alone once took the wrong child.
 * The profile goes at once, so it vanishes from every list and its devices
 * are signed out; a long history is then cleared in batches behind it.
 */
export const deleteProfile = mutation({
  args: { token: v.string(), profileId: v.id("profiles"), confirmName: v.string() },
  handler: async (ctx, { token, profileId, confirmName }) => {
    await requireAdmin(ctx, token);
    const profile = await ctx.db.get(profileId);
    if (!profile) return { deleted: false as const };
    if (profile.name.trim() !== confirmName.trim()) throw new ConvexError("NAME_MISMATCH");

    for (const table of ["parentSessions", "progress", "settings"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_profile", (q) => q.eq("profileId", profileId))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
    const linked = await ctx.db
      .query("devices")
      .withIndex("by_profile_token", (q) => q.eq("profileId", profileId))
      .collect();
    for (const row of linked) await ctx.db.delete(row._id);

    await ctx.db.delete(profileId);
    if (await purgeHistory(ctx, profileId)) {
      await ctx.scheduler.runAfter(0, internal.admin.purgeRemaining, { profileId });
    }
    return { deleted: true as const, name: profile.name };
  },
});
