import type { ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { AttemptRecord } from "@/game/useGame";
import { db, type DeviceIdentity, type OutboxRow } from "./db";

/** Server-side batch cap, kept well under Convex's per-mutation write limits. */
const BATCH = 50;

/** Local history we keep after syncing, so the child's recent run is readable offline. */
const KEEP_SYNCED = 2000;

export async function enqueue(records: AttemptRecord[]): Promise<void> {
  if (records.length === 0) return;
  try {
    await db.outbox.bulkPut(records.map((record) => ({ ...record, synced: 0 as const })));
  } catch {
    // Losing a row to a full or blocked IndexedDB is bad, but blocking the next
    // question on it would be worse.
  }
}

export async function pendingCount(): Promise<number> {
  try {
    return await db.outbox.where("synced").equals(0).count();
  } catch {
    return 0;
  }
}

/**
 * Drains the outbox to Convex.
 *
 * Safe to call concurrently with itself and safe to retry: the server
 * de-duplicates on `clientId`, so a batch that was actually written before the
 * connection dropped is simply ignored on the next attempt rather than
 * double-counted. That is what lets this retry blindly instead of having to
 * reason about which half of a failed request landed.
 */
export async function flush(
  client: ConvexReactClient,
  identity: DeviceIdentity,
): Promise<{ sent: number; remaining: number }> {
  let sent = 0;

  for (;;) {
    const rows: OutboxRow[] = await db.outbox
      .where("synced")
      .equals(0)
      .limit(BATCH)
      .toArray();

    if (rows.length === 0) break;

    const records = rows.map(({ synced: _synced, ...record }) => record);
    await client.mutation(api.attempts.record, {
      profileId: identity.profileId as Id<"profiles">,
      deviceToken: identity.deviceToken,
      records,
    });

    await db.outbox.bulkPut(rows.map((row) => ({ ...row, synced: 1 as const })));
    sent += rows.length;

    if (rows.length < BATCH) break;
  }

  await prune();
  return { sent, remaining: await pendingCount() };
}

/** Keeps the local mirror from growing without bound on a long-lived tablet. */
async function prune(): Promise<void> {
  try {
    const syncedCount = await db.outbox.where("synced").equals(1).count();
    if (syncedCount <= KEEP_SYNCED) return;

    const excess = await db.outbox
      .where("synced")
      .equals(1)
      .limit(syncedCount - KEEP_SYNCED)
      .toArray();

    // Oldest first, so pruning removes history the parent is least likely to
    // be looking at.
    excess.sort((a, b) => a.createdAt - b.createdAt);
    await db.outbox.bulkDelete(excess.map((row) => row.clientId));
  } catch {
    /* pruning is best-effort */
  }
}
