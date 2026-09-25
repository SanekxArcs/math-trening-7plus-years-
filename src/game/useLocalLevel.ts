import { useCallback, useSyncExternalStore } from "react";

const KEY = "math_master_level";

/**
 * The level is kept apart from the session on purpose.
 *
 * A session is one sitting and is forgotten after a few hours; a level is
 * something the child earned and expects to still have tomorrow. It also never
 * goes down on its own — a level lost to a bad afternoon would undo the only
 * thing the game gives them to keep.
 */
export function readLevel(): number {
  if (typeof localStorage === "undefined") return 1;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 1;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  } catch {
    return 1;
  }
}

/** Only used when storage refuses writes, so private mode keeps the level this sitting. */
let memory = 1;
const listeners = new Set<() => void>();

function getSnapshot(): number {
  return Math.max(readLevel(), memory);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Moves the level up to at least `level`, never down. Shared by the "next
 * level" button and the backup restoring a level earned on another device.
 */
export function raiseLevel(level: number): void {
  if (level <= getSnapshot()) return;
  try {
    localStorage.setItem(KEY, String(level));
  } catch {
    // Private mode or a full quota: they still get the level this sitting.
    memory = level;
  }
  for (const listener of listeners) listener();
}

export function useLocalLevel() {
  const level = useSyncExternalStore(subscribe, getSnapshot, () => 1);
  const advance = useCallback(() => raiseLevel(getSnapshot() + 1), []);
  return [level, advance] as const;
}
