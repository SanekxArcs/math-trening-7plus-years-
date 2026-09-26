import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { convex } from "@/lib/convex";
import { currentLevel } from "@/game/useLocalLevel";
import { readStable } from "@/game/useStable";
import { db, type DeviceIdentity } from "./db";
import { flush } from "./outbox";
import { toBackup } from "./useProgressSync";

/**
 * How long each network step may take. Convex queues a call made while
 * offline instead of failing it, so without a limit an offline sign-out would
 * wait forever for a connection that is not coming.
 */
const STEP_MS = 4000;

function withinTime<T>(work: Promise<T>): Promise<T | undefined> {
  return Promise.race([work, new Promise<undefined>((resolve) => setTimeout(resolve, STEP_MS))]);
}

/** Kept across a sign-out: the next person to set up still reads their own language. */
const KEEP = new Set(["math_master_lang"]);

/**
 * Signs this device all the way out: the child's profile, pets, coins, level,
 * history and the dashboard session all leave it, and it opens on setup again.
 *
 * Everything that can be saved is sent first — answers still waiting in the
 * outbox, and the latest coins and pets — so that signing out loses nothing
 * the backup could have kept. Each step is best-effort: a device that is
 * offline still signs out, and the caller has already warned about what an
 * offline sign-out leaves behind.
 */
export async function signOutDevice(identity: DeviceIdentity | null, parentToken: string | null) {
  if (convex && identity) {
    const credentials = {
      profileId: identity.profileId as Id<"profiles">,
      deviceToken: identity.deviceToken,
    };
    try {
      await withinTime(flush(convex, identity));
    } catch {
      /* offline: those answers were warned about */
    }
    try {
      const stable = readStable();
      if (stable.savedAt > 0) {
        await withinTime(
          convex.mutation(api.progress.save, {
            ...credentials,
            progress: toBackup(stable, currentLevel()),
          }),
        );
      }
    } catch {
      /* the backup keeps whatever it last had */
    }
    try {
      await withinTime(convex.mutation(api.profiles.signOutDevice, credentials));
    } catch {
      /* the token then just goes unused */
    }
  }
  if (convex && parentToken) {
    try {
      await withinTime(convex.mutation(api.parent.logout, { token: parentToken }));
    } catch {
      /* it expires on its own */
    }
  }

  try {
    await db.delete();
  } catch {
    /* a blocked database is cleared on its next open instead */
  }
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("math_master_") && !KEEP.has(key)) localStorage.removeItem(key);
    }
  } catch {
    /* private mode */
  }

  // A full reload rather than a route change: several stores keep a copy in
  // memory, and a fresh start is the only way to be sure none of it survives.
  window.location.assign("/");
}
