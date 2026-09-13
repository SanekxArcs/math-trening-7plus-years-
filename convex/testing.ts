import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Development utilities.
 *
 * Both are `internal`, so they are unreachable from the browser and exist only
 * for `npx convex run`. Verification runs and screenshot passes leave real
 * profiles behind in the dev deployment; this is how they get swept up.
 */

export const listProfiles = internalQuery({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    return profiles.map((profile) => ({
      pairCode: profile.pairCode,
      name: profile.name,
      createdAt: new Date(profile.createdAt).toISOString(),
    }));
  },
});

export const purgeProfile = internalMutation({
  args: { pairCode: v.string() },
  handler: async (ctx, { pairCode }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_pairCode", (q) => q.eq("pairCode", pairCode.toUpperCase()))
      .unique();
    if (!profile) return { deleted: false, reason: "no such pairing code" };

    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_profile_created", (q) => q.eq("profileId", profile._id))
      .collect();
    for (const attempt of attempts) await ctx.db.delete(attempt._id);

    const sessions = await ctx.db
      .query("parentSessions")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();
    for (const session of sessions) await ctx.db.delete(session._id);

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .unique();
    if (settings) await ctx.db.delete(settings._id);

    await ctx.db.delete(profile._id);
    return { deleted: true, name: profile.name, attempts: attempts.length };
  },
});
