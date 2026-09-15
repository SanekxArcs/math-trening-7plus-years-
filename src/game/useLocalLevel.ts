import { useCallback, useState } from "react";

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

export function useLocalLevel() {
  const [level, setLevel] = useState(readLevel);

  const advance = useCallback(() => {
    setLevel((current) => {
      const next = current + 1;
      try {
        localStorage.setItem(KEY, String(next));
      } catch {
        // Private mode or a full quota: they still get the level this sitting.
      }
      return next;
    });
  }, []);

  return [level, advance] as const;
}
