import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { deleteProfileRows, purgeHistory } from "./admin";

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

/** Fills in settings fields added after a row was written. */
export const backfill = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("settings").collect();
    let patched = 0;
    for (const row of rows) {
      if (row.adaptive === undefined) {
        await ctx.db.patch(row._id, { adaptive: true });
        patched++;
      }
    }
    return { scanned: rows.length, patched };
  },
});

/**
 * Deletes a profile and everything attached to it.
 *
 * `expectName` is required and must match: purging by pairing code alone is one
 * transposed character away from deleting a real child's history, and that has
 * already happened once.
 */
export const purgeProfile = internalMutation({
  args: { pairCode: v.string(), expectName: v.string() },
  handler: async (ctx, { pairCode, expectName }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_pairCode", (q) => q.eq("pairCode", pairCode.toUpperCase()))
      .unique();
    if (!profile) return { deleted: false, reason: "no such pairing code" };
    if (profile.name !== expectName) {
      return {
        deleted: false,
        reason: `pairing code ${pairCode} belongs to "${profile.name}", not "${expectName}"`,
      };
    }

    await deleteProfileRows(ctx, profile._id);
    // History in batches, like the admin page: one mutation holding a long
    // history would hit the transaction limits and delete nothing.
    if (await purgeHistory(ctx, profile._id)) {
      await ctx.scheduler.runAfter(0, internal.admin.purgeRemaining, { profileId: profile._id });
    }
    return { deleted: true, name: profile.name };
  },
});
