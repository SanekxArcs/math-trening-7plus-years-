import { ConvexReactClient } from "convex/react";

const url = import.meta.env.VITE_CONVEX_URL;

/**
 * The client is optional on purpose.
 *
 * Play must work with no backend at all — a fresh install on a tablet with no
 * signal, or a misconfigured env. Everything that needs Convex checks for null
 * and falls back to the local Dexie mirror; nothing in the game loop awaits it.
 */
export const convex = url ? new ConvexReactClient(url) : null;

if (!url && import.meta.env.DEV) {
  console.warn(
    "[math-master] VITE_CONVEX_URL is not set — running local-only. " +
      "Sync and the parent dashboard are disabled.",
  );
}
