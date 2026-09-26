import type { Difficulty, GameSettings, Op } from "@/engine";

const DAY = 86_400_000;
const LADDER: Difficulty[] = ["easy", "medium", "hard", "expert"];

export interface Day {
  day: string;
  total: number;
  correct: number;
}

export interface Week {
  total: number;
  correct: number;
  /** 0..1, or null for a week with no answers. */
  accuracy: number | null;
  daysPractised: number;
}

/** Sums a run of days into one week's numbers. */
export function summarise(days: Day[]): Week {
  const total = days.reduce((sum, day) => sum + day.total, 0);
  const correct = days.reduce((sum, day) => sum + day.correct, 0);
  return {
    total,
    correct,
    accuracy: total === 0 ? null : correct / total,
    daysPractised: days.filter((day) => day.total > 0).length,
  };
}

/** The 14-day window the server sends, split into last week and this week. */
export function weeks(daily: Day[]): { previous: Week; current: Week } {
  return { previous: summarise(daily.slice(0, -7)), current: summarise(daily.slice(-7)) };
}

export type SuggestionKind = "idle" | "harder" | "easier" | "hints" | "weakOp" | "timer" | "allGood";

export interface Suggestion {
  kind: SuggestionKind;
  /** Filled into the message: days, accuracy (whole %), op, difficulty, seconds. */
  params: { days?: number; accuracy?: number; op?: Op; difficulty?: Difficulty; seconds?: number };
  /** The settings change that acts on it, when there is one to offer. */
  patch?: Partial<GameSettings>;
}

export interface SuggestionInput {
  daily: Day[];
  byOperation: Record<string, { correct: number; total: number }>;
  averageMs: number;
  lastPlayedAt: number | null;
  settings: GameSettings;
  now: number;
}

/**
 * What a parent could usefully change, read off the last two weeks.
 *
 * Plain rules rather than anything clever, and each one cautious: it waits for
 * enough answers to mean something, and offers a single small step — one
 * difficulty up or down, five more seconds — rather than a new configuration.
 * The parent decides; the button only saves them finding the setting.
 */
export function suggest(input: SuggestionInput): Suggestion[] {
  const { settings } = input;
  const { current } = weeks(input.daily);
  const found: Suggestion[] = [];
  const percent = current.accuracy === null ? 0 : Math.round(current.accuracy * 100);
  const rung = LADDER.indexOf(settings.difficulty);

  if (input.lastPlayedAt !== null) {
    const days = Math.floor((input.now - input.lastPlayedAt) / DAY);
    if (days >= 2) found.push({ kind: "idle", params: { days } });
  }

  if (current.accuracy !== null && current.total >= 30 && current.accuracy >= 0.9 && rung < LADDER.length - 1) {
    const next = LADDER[rung + 1] as Difficulty;
    found.push({ kind: "harder", params: { accuracy: percent, difficulty: next }, patch: { difficulty: next } });
  }

  if (current.accuracy !== null && current.total >= 20 && current.accuracy < 0.6 && rung > 0) {
    const easier = LADDER[rung - 1] as Difficulty;
    found.push({ kind: "easier", params: { accuracy: percent, difficulty: easier }, patch: { difficulty: easier } });
  }

  if (current.accuracy !== null && current.total >= 20 && current.accuracy < 0.7 && !settings.visualHintEnabled) {
    found.push({ kind: "hints", params: {}, patch: { visualHintEnabled: true } });
  }

  // The weakest operation, when it is clearly behind and there is more than
  // one in play — narrowing to it is then a real, reversible option.
  if (settings.ops.length > 1) {
    const weakest = settings.ops
      .map((op) => ({ op, stats: input.byOperation[op] }))
      .filter((entry) => entry.stats && entry.stats.total >= 10)
      .map((entry) => ({ op: entry.op, accuracy: entry.stats!.correct / entry.stats!.total }))
      .sort((a, b) => a.accuracy - b.accuracy)[0];
    if (weakest && weakest.accuracy < 0.6) {
      found.push({
        kind: "weakOp",
        params: { op: weakest.op, accuracy: Math.round(weakest.accuracy * 100) },
        patch: { ops: [weakest.op] },
      });
    }
  }

  // Answers crowding the clock: the limit is testing speed more than maths.
  if (settings.timerEnabled && settings.timerSec < 60 && input.averageMs > settings.timerSec * 1000 * 0.75) {
    const seconds = Math.min(60, settings.timerSec + 5);
    found.push({ kind: "timer", params: { seconds }, patch: { timerSec: seconds } });
  }

  if (found.length === 0) found.push({ kind: "allGood", params: {} });
  return found;
}
