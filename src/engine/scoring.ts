import type { Difficulty, GameSettings } from "./types.ts";

export interface ScoreState {
  /** True running total. May go negative; see `displayPoints`. */
  rawPoints: number;
  goodStreak: number;
  badStreak: number;
  bestStreak: number;
  correct: number;
  wrong: number;
}

export const INITIAL_SCORE: ScoreState = {
  rawPoints: 0,
  goodStreak: 0,
  badStreak: 0,
  bestStreak: 0,
  correct: 0,
  wrong: 0,
};

/** Harder input is worth more: six tiles can be guessed, a typed answer cannot. */
export const BASE_POINTS: Record<Difficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 15,
  expert: 25,
};

/** Checked high-to-low; the first tier the streak reaches wins. */
const COMBO_TIERS = [
  { from: 30, multiplier: 4 },
  { from: 15, multiplier: 3 },
  { from: 5, multiplier: 2 },
  { from: 0, multiplier: 1 },
] as const;

/**
 * Penalties climb much faster than the combo does, by design: a bad run should
 * hurt quickly enough to be worth escaping, and the only way out is a correct
 * answer. Last entry repeats as the cap.
 */
const PENALTIES = [10, 25, 45, 70] as const;

const HALF_HALF_FACTOR = 0.5;
const VISUAL_HINT_FACTOR = 0.75;
const FAST_FACTOR = 1.25;

export function comboMultiplier(goodStreak: number): number {
  for (const tier of COMBO_TIERS) {
    if (goodStreak >= tier.from) return tier.multiplier;
  }
  return 1;
}

/** `badStreak` is 1-based: the first wrong answer in a row is 1. */
export function penaltyFor(badStreak: number): number {
  if (badStreak <= 0) return 0;
  const index = Math.min(badStreak, PENALTIES.length) - 1;
  return PENALTIES[index] as number;
}

/** Streak length that unlocks the next multiplier, or null at the cap. */
export function nextTierAt(goodStreak: number): number | null {
  const ascending = [...COMBO_TIERS].reverse();
  for (const tier of ascending) {
    if (goodStreak < tier.from) return tier.from;
  }
  return null;
}

export interface AttemptInput {
  isCorrect: boolean;
  difficulty: Difficulty;
  usedHalfHalf: boolean;
  usedVisualHint: boolean;
  /** Answered in under half the allotted time. Only ever true with the timer on. */
  fast: boolean;
}

export interface AttemptResult {
  state: ScoreState;
  /** Signed points change, already rounded. */
  delta: number;
  /** Multiplier that was applied (1 for a wrong answer). */
  multiplier: number;
  /** The multiplier just went up — the moment worth celebrating. */
  tierUp: boolean;
  /** The penalty just got worse than last time. */
  tierDown: boolean;
}

/**
 * The single place where a score changes. Pure: same input, same output, no
 * clock, no storage, no DOM.
 */
export function applyAttempt(
  state: ScoreState,
  input: AttemptInput,
): AttemptResult {
  const previousMultiplier = comboMultiplier(state.goodStreak);
  const previousPenalty = penaltyFor(state.badStreak);

  if (input.isCorrect) {
    const goodStreak = state.goodStreak + 1;
    const multiplier = comboMultiplier(goodStreak);

    let modifier = 1;
    if (input.usedHalfHalf) modifier *= HALF_HALF_FACTOR;
    if (input.usedVisualHint) modifier *= VISUAL_HINT_FACTOR;
    if (input.fast) modifier *= FAST_FACTOR;

    const delta = Math.round(BASE_POINTS[input.difficulty] * multiplier * modifier);

    return {
      state: {
        rawPoints: state.rawPoints + delta,
        goodStreak,
        badStreak: 0, // a correct answer is the only way out of a bad run
        bestStreak: Math.max(state.bestStreak, goodStreak),
        correct: state.correct + 1,
        wrong: state.wrong,
      },
      delta,
      multiplier,
      tierUp: multiplier > previousMultiplier,
      tierDown: false,
    };
  }

  const badStreak = state.badStreak + 1;
  const delta = -penaltyFor(badStreak);

  return {
    state: {
      rawPoints: state.rawPoints + delta,
      goodStreak: 0, // one mistake ends the combo outright
      badStreak,
      bestStreak: state.bestStreak,
      correct: state.correct,
      wrong: state.wrong + 1,
    },
    delta,
    multiplier: 1,
    tierUp: false,
    tierDown: -delta > previousPenalty,
  };
}

/**
 * What the child sees. The true total is kept in `rawPoints` for the parent
 * dashboard, but a visible negative score reads as "you are bad at this" to a
 * seven-year-old, so the display floors at zero.
 */
export function displayPoints(state: ScoreState): number {
  return Math.max(0, state.rawPoints);
}

export function isGoalReached(
  state: ScoreState,
  settings: GameSettings,
): boolean {
  return settings.goalEnabled && displayPoints(state) >= settings.goalTarget;
}
