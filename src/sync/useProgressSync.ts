import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { convex } from "@/lib/convex";
import type { Pet, Stable } from "@/engine";
import { readStable, restoreStable, useStable } from "@/game/useStable";
import { raiseLevel, useLocalLevel } from "@/game/useLocalLevel";
import type { IdentityState } from "./useSync";

/** Long enough to fold a burst of shop taps into one write. */
const PUSH_DELAY_MS = 800;
const RETRY_MS = 30_000;

/** Exactly the fields the server validates — nothing extra rides along. */
function toPet(pet: Pet): Pet {
  const {
    id, species, name, food, clean, happy, health, alive, updatedAt, diedAt, vacation, lastPettedAt,
  } = pet;
  return {
    id, species, name, food, clean, happy, health, alive, updatedAt, diedAt, vacation, lastPettedAt,
  };
}

function toBackup(stable: Stable, level: number) {
  return {
    coins: stable.coins,
    lastBonusDay: stable.lastBonusDay,
    pets: stable.pets.map(toPet),
    activeId: stable.activeId,
    savedAt: stable.savedAt,
    level,
  };
}

/**
 * Keeps coins, the pets and the level backed up to the profile.
 *
 * Local-first like everything else: the device's copy is what the game plays
 * with, and this copies it up when it changes and down when the backup is
 * newer — which is what a freshly linked device sees on its first load. The
 * newest change wins as a whole; the level is the highest either side has.
 *
 * Nothing is sent until the backup has been read at least once. A device
 * that has just been linked starts with an empty stable, and pushing that
 * before looking would be the one way to lose the pets this exists to keep.
 */
export function useProgressSync(identity: IdentityState): void {
  const stable = useStable();
  const [level] = useLocalLevel();
  const [retry, setRetry] = useState(0);
  const save = useMutation(api.progress.save);

  const args =
    identity && convex
      ? { profileId: identity.profileId as Id<"profiles">, deviceToken: identity.deviceToken }
      : null;
  const remote = useQuery(api.progress.forDevice, args ?? "skip");

  // Down: a newer backup replaces the device's copy.
  useEffect(() => {
    if (remote?.status !== "ok" || !remote.progress) return;
    const { level: backedUpLevel, ...backup } = remote.progress;
    raiseLevel(backedUpLevel);
    if (backup.savedAt > readStable().savedAt) restoreStable(backup);
  }, [remote]);

  // Up: a newer device copy, or a higher level, is sent after a short pause.
  useEffect(() => {
    if (!args || remote?.status !== "ok") return;
    const backup = remote.progress;
    const newer = stable.savedAt > (backup?.savedAt ?? 0);
    const higher = level > (backup?.level ?? 1);
    if (!newer && !higher) return;

    const id = window.setTimeout(() => {
      save({ ...args, progress: toBackup(stable, level) }).catch(() => {
        // Offline or a blip. The copy on the device is safe; the retry below
        // tries again, and the next change does too.
      });
    }, PUSH_DELAY_MS);
    return () => window.clearTimeout(id);
    // `args` is rebuilt every render; its contents are what matter.
  }, [args?.profileId, args?.deviceToken, remote, stable, level, retry, save]);

  useEffect(() => {
    const bump = () => setRetry((n) => n + 1);
    window.addEventListener("online", bump);
    const id = window.setInterval(bump, RETRY_MS);
    return () => {
      window.removeEventListener("online", bump);
      window.clearInterval(id);
    };
  }, []);
}
