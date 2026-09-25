export type Op = "add" | "sub" | "mul" | "div";

export type Difficulty = "easy" | "medium" | "hard" | "expert";

/** How the child gives the answer. Expert types; everything else picks a tile. */
export type AnswerMode = "choice" | "type";

export interface GameSettings {
  ops: Op[];
  limit1: number;
  limit2: number;
  /** When false, operands start at 2 — the old behaviour. */
  includeZeroOne: boolean;
  difficulty: Difficulty;
  timerEnabled: boolean;
  timerSec: number;
  goalEnabled: boolean;
  goalTarget: number;
  halfHalfEnabled: boolean;
  halfHalfCooldownSec: number;
  visualHintEnabled: boolean;
  soundEnabled: boolean;
  /** Bias questions towards facts the child is weakest on. */
  adaptive: boolean;
}

/**
 * Groups of dots for the visual hint: `groups` rows of `perGroup` items.
 * Only multiplication and division carry one — it is the only place where
 * "3 groups of 4" explains the answer rather than just restating it. Addition
 * and subtraction have a picture hint too, but it is ten-frames drawn straight
 * from `a` and `b`, so there is nothing extra to store.
 */
export interface HintModel {
  groups: number;
  perGroup: number;
}

export interface Problem {
  op: Op;
  /** Left operand exactly as displayed. */
  a: number;
  /** Right operand exactly as displayed. */
  b: number;
  /**
   * The operands that identify this cell of the times table, which are not
   * always the ones on screen: "28 ÷ 7" is the fact (4, 7), so it lands in the
   * same grid square whether it is asked as a division or as 4 × 7.
   */
  factA: number;
  factB: number;
  prompt: string;
  answer: number;
  hint: HintModel | null;
}

export interface Question {
  problem: Problem;
  /** Shuffled, includes the answer. Empty in type mode. */
  options: number[];
  mode: AnswerMode;
}

export const DEFAULT_SETTINGS: GameSettings = {
  ops: ["add", "mul"],
  limit1: 9,
  limit2: 9,
  includeZeroOne: false,
  difficulty: "medium",
  timerEnabled: false,
  timerSec: 10,
  goalEnabled: true,
  goalTarget: 200,
  halfHalfEnabled: true,
  halfHalfCooldownSec: 30,
  visualHintEnabled: true,
  soundEnabled: true,
  adaptive: true,
};
