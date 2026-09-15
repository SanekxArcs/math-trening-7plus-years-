import { useCallback, useState } from "react";
import type { ScoreState } from "@/engine";
import type { SessionSnapshot } from "./useGame";

const KEY = "math_master_session";

/**
 * How long a session is worth coming back to.
 *
 * This exists for the refresh, the accidental back-swipe and the browser that
 * reloads itself while the tablet is asleep — not for "carry on with
 * yesterday's points". A gap longer than this and the child gets a clean start,
 * which is what they expect when they sit down to play again.
 */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Rebuilds a score from whatever is in storage. Every field is taken
 * defensively: this data is a year older than the code reading it in the worst
 * case, and a missing field must cost the child their streak, not the app.
 */
function toScore(raw: unknown): ScoreState {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    rawPoints: num(source.rawPoints),
    goodStreak: num(source.goodStreak),
    badStreak: num(source.badStreak),
    bestStreak: num(source.bestStreak),
    correct: num(source.correct),
    wrong: num(source.wrong),
  };
}

export function readSession(now: number = Date.now()): SessionSnapshot | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;

    const source = parsed as Record<string, unknown>;
    const savedAt = num(source.savedAt);
    if (savedAt <= 0 || now - savedAt > MAX_AGE_MS) return null;

    return {
      score: toScore(source.score),
      won: source.won === true,
      stopped: source.stopped === true,
      halfHalfReadyAt: num(source.halfHalfReadyAt),
      savedAt,
    };
  } catch {
    return null;
  }
}

export function writeSession(snapshot: SessionSnapshot): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // Private mode or a full quota. Losing the resume is better than crashing.
  }
}

/**
 * The session that survives a reload.
 *
 * Read once, synchronously, at first render: the score has to be there in the
 * very first frame, or the child sees a zero flash past before their points
 * come back — which reads as "it lost them" even when it did not.
 */
export function useLocalSession() {
  const [resume] = useState(() => readSession());
  const save = useCallback((snapshot: SessionSnapshot) => writeSession(snapshot), []);
  return [resume, save] as const;
}
