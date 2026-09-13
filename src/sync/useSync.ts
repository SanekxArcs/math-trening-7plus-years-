import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { convex } from "@/lib/convex";
import { DEFAULT_SETTINGS, type GameSettings } from "@/engine";
import type { AttemptRecord } from "@/game/useGame";
import {
  getIdentity,
  getSettingsMirror,
  saveIdentity,
  saveSettingsMirror,
  type DeviceIdentity,
} from "./db";
import { enqueue, flush, pendingCount } from "./outbox";

/** `undefined` while IndexedDB is still being read, `null` when unclaimed. */
export type IdentityState = DeviceIdentity | null | undefined;

export function useDeviceIdentity() {
  const [identity, setIdentity] = useState<IdentityState>(undefined);

  useEffect(() => {
    let cancelled = false;
    void getIdentity().then((stored) => {
      if (!cancelled) setIdentity(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const claim = useCallback(
    async (name: string, pin: string, locale: string, avatarEmoji: string) => {
      if (!convex) throw new Error("No backend configured");

      const created = await convex.action(api.secure.createProfile, {
        name,
        pin,
        locale,
        avatarEmoji,
      });
      const next: DeviceIdentity = {
        profileId: created.profileId,
        deviceToken: created.deviceToken,
        pairCode: created.pairCode,
        name,
      };
      await saveIdentity(next);
      setIdentity(next);
      return next;
    },
    [],
  );

  return { identity, claim };
}

/**
 * Settings, local-first.
 *
 * The mirror is read immediately so the first question uses the parent's real
 * configuration even with no signal; Convex then overwrites it live, which is
 * how a change made on the dashboard reaches the tablet mid-session without
 * either side refreshing.
 */
export function useSyncedSettings(identity: IdentityState): {
  settings: GameSettings;
  locale: string | null;
} {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [locale, setLocale] = useState<string | null>(null);

  useEffect(() => {
    void getSettingsMirror<GameSettings>().then((mirrored) => {
      if (mirrored) setSettings((current) => ({ ...current, ...mirrored }));
    });
  }, []);

  const remote = useQuery(
    api.attempts.settingsForDevice,
    identity && convex
      ? { profileId: identity.profileId as Id<"profiles">, deviceToken: identity.deviceToken }
      : "skip",
  );

  useEffect(() => {
    if (!remote) return;
    const {
      _id: _ignoredId,
      _creationTime: _ignoredTime,
      profileId: _ignoredProfile,
      updatedAt: _ignoredAt,
      updatedBy: _ignoredBy,
      locale: remoteLocale,
      ...fields
    } = remote;
    setLocale(remoteLocale);

    // Replace wholesale rather than merge, so a setting the parent turned off
    // cannot linger from the mirror. `adaptive` is spelled out because an older
    // row may not have it, and spreading `undefined` would beat the default.
    const next: GameSettings = {
      ...DEFAULT_SETTINGS,
      ...fields,
      adaptive: fields.adaptive ?? DEFAULT_SETTINGS.adaptive,
    };
    setSettings(next);
    void saveSettingsMirror(next);
  }, [remote]);

  return { settings, locale };
}

export interface SyncStatus {
  pending: number;
  online: boolean;
  syncing: boolean;
  lastError: string | null;
}

/**
 * Owns the outbox drain. Attempts are written locally first and always; the
 * network is a background concern that never sits on the game loop.
 */
export function useOutboxSync(identity: IdentityState) {
  const [status, setStatus] = useState<SyncStatus>({
    pending: 0,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    syncing: false,
    lastError: null,
  });

  // A single in-flight drain. Without this, a burst of answers plus an `online`
  // event would start overlapping flushes that fight over the same rows.
  const draining = useRef(false);

  const drain = useCallback(async () => {
    if (!convex || !identity || draining.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    draining.current = true;
    setStatus((s) => ({ ...s, syncing: true }));
    try {
      const { remaining } = await flush(convex, identity);
      setStatus((s) => ({ ...s, pending: remaining, syncing: false, lastError: null }));
    } catch (error) {
      setStatus((s) => ({
        ...s,
        syncing: false,
        pending: s.pending,
        lastError: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      draining.current = false;
    }
  }, [identity]);

  const record = useCallback(
    async (records: AttemptRecord[]) => {
      await enqueue(records);
      setStatus((s) => ({ ...s, pending: s.pending + records.length }));
      void drain();
    },
    [drain],
  );

  useEffect(() => {
    void pendingCount().then((pending) => setStatus((s) => ({ ...s, pending })));
  }, []);

  useEffect(() => {
    void drain();
  }, [drain]);

  useEffect(() => {
    const goOnline = () => {
      setStatus((s) => ({ ...s, online: true }));
      void drain();
    };
    const goOffline = () => setStatus((s) => ({ ...s, online: false }));

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // A backstop for the case the browser never fires `online` — common when a
    // tablet wakes from sleep on a flaky network.
    const id = window.setInterval(() => void drain(), 30_000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.clearInterval(id);
    };
  }, [drain]);

  return { status, record, drain };
}
