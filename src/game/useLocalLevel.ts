import { useCallback, useSyncExternalStore } from "react";
import { touchStable } from "./useStable";

const KEY = "math_master_level";

/**
 * The level is kept apart from the session on purpose.
 *
 * A session is one sitting and is forgotten after a few hours; a level is
 * something the child earned and expects to still have tomorrow. It goes down
 * only one way: losing a game — the points sunk to minus a quarter of the goal
 * — sends the child back to level 1, and that is a rule of the game, spelled
 * out on screen, never something that happens quietly.
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
let memory: number | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): number {
  return memory ?? readLevel();
}

function write(level: number): void {
  try {
    localStorage.setItem(KEY, String(level));
    memory = null;
  } catch {
    // Private mode or a full quota: they still get the level this sitting.
    memory = level;
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Moves the level up to at least `level`, never down: the "next level" button.
 */
export function raiseLevel(level: number): void {
  if (level <= getSnapshot()) return;
  write(level);
}

/** Sets the level outright, up or down — for a backup newer than this device. */
export function setLevel(level: number): void {
  const next = Math.max(1, Math.floor(level));
  if (next === getSnapshot()) return;
  write(next);
}

export function useLocalLevel() {
  const level = useSyncExternalStore(subscribe, getSnapshot, () => 1);
  const advance = useCallback(() => raiseLevel(getSnapshot() + 1), []);
  /**
   * Back to level 1 after a lost game. The stable is stamped too, because the
   * level travels inside its backup: without a newer stamp the backup would
   * look newer and hand the old level straight back.
   */
  const reset = useCallback(() => {
    setLevel(1);
    touchStable();
  }, []);
  return [level, advance, reset] as const;
}
