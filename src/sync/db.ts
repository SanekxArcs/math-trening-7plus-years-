import Dexie, { type Table } from "dexie";
import type { AttemptRecord } from "@/game/useGame";
import type { StoredFact } from "./facts";

export interface OutboxRow extends AttemptRecord {
  /** 0 = still owed to the server. Indexed, so the flush query is cheap. */
  synced: 0 | 1;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

/** Credentials this device holds for one kid profile. */
export interface DeviceIdentity {
  profileId: string;
  deviceToken: string;
  pairCode: string;
  name: string;
}

class MathMasterDb extends Dexie {
  outbox!: Table<OutboxRow, string>;
  meta!: Table<MetaRow, string>;
  facts!: Table<StoredFact, string>;

  constructor() {
    super("math-master");
    this.version(1).stores({
      outbox: "clientId, synced, createdAt",
      meta: "key",
    });
    // Per-fact mastery, added in v2. Dexie migrates existing databases in
    // place, so an installed app keeps its outbox and settings mirror.
    this.version(2).stores({
      outbox: "clientId, synced, createdAt",
      meta: "key",
      facts: "id, lastSeenAt",
    });
  }
}

export const db = new MathMasterDb();

async function getMeta<T>(key: string): Promise<T | null> {
  try {
    const row = await db.meta.get(key);
    return row ? (row.value as T) : null;
  } catch {
    // A blocked or corrupt IndexedDB must never stop the child playing.
    return null;
  }
}

async function setMeta(key: string, value: unknown): Promise<void> {
  try {
    await db.meta.put({ key, value });
  } catch {
    /* ignore — see above */
  }
}

export const getIdentity = () => getMeta<DeviceIdentity>("identity");
export const saveIdentity = (identity: DeviceIdentity) => setMeta("identity", identity);
export const clearIdentity = () => setMeta("identity", null);

/**
 * Last known settings. Convex is the source of truth, but the game reads this
 * mirror so a cold start with no signal still uses the parent's real
 * configuration rather than silently falling back to defaults.
 */
export const getSettingsMirror = <T>() => getMeta<T>("settings");
export const saveSettingsMirror = (settings: unknown) => setMeta("settings", settings);
