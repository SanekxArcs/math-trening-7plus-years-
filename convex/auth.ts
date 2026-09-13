import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { safeEqual, sha256 } from "./sha256.js";

export const PARENT_SESSION_MS = 1000 * 60 * 60 * 12;

/**
 * Every parent-facing function goes through here.
 *
 * Access control lives on the server, not in the router: hiding the /parent
 * route would stop nobody, least of all the child whose settings and score are
 * on the other side of it.
 */
export async function requireParent(
  ctx: QueryCtx | MutationCtx,
  token: string,
): Promise<Doc<"profiles">> {
  const session = await ctx.db
    .query("parentSessions")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", sha256(token)))
    .unique();

  if (!session) throw new ConvexError("Not signed in");
  if (session.expiresAt < Date.now()) throw new ConvexError("Session expired");

  const profile = await ctx.db.get(session.profileId);
  if (!profile) throw new ConvexError("Profile no longer exists");
  return profile;
}

/** The kid's device proves itself with a secret issued when the profile was made. */
export async function requireDevice(
  ctx: QueryCtx | MutationCtx,
  profileId: Id<"profiles">,
  deviceToken: string,
): Promise<Doc<"profiles">> {
  const profile = await ctx.db.get(profileId);
  if (!profile) throw new ConvexError("Unknown profile");
  if (!safeEqual(profile.deviceTokenHash, sha256(deviceToken))) {
    throw new ConvexError("Device is not linked to this profile");
  }
  return profile;
}
