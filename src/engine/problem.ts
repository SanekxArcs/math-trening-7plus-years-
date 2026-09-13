import { randInt, pick, type Rng } from "./rng.ts";
import type { FactChoice } from "./mastery.ts";
import type { AnswerMode, Difficulty, GameSettings, Op, Problem } from "./types.ts";

const OPTION_COUNT: Record<Difficulty, number> = {
  easy: 2,
  medium: 4,
  hard: 6,
  expert: 0,
};

export function optionCount(difficulty: Difficulty): number {
  return OPTION_COUNT[difficulty];
}

export function answerMode(difficulty: Difficulty): AnswerMode {
  return difficulty === "expert" ? "type" : "choice";
}

/** How many tiles 50:50 removes. Always leaves the answer plus an equal number
 *  of decoys, so Easy drops to a coin flip and Hard drops to three. */
export function halfHalfRemoves(difficulty: Difficulty): number {
  const n = optionCount(difficulty);
  return n === 0 ? 0 : Math.floor(n / 2);
}

function operandRange(settings: GameSettings, which: 1 | 2): [number, number] {
  const limit = which === 1 ? settings.limit1 : settings.limit2;
  const min = settings.includeZeroOne ? 0 : 2;
  // A limit below the floor would otherwise produce operands above the limit,
  // or a reversed range that throws. Clamp instead of trusting the input.
  const max = Math.max(min, Math.floor(limit));
  return [min, max];
}

export function generateProblem(settings: GameSettings, rng: Rng): Problem {
  const op: Op = settings.ops.length > 0 ? pick(rng, settings.ops) : "add";
  const [min1, max1] = operandRange(settings, 1);
  const [min2, max2] = operandRange(settings, 2);
  return buildProblem({
    op,
    a: randInt(rng, min1, max1),
    b: randInt(rng, min2, max2),
  });
}

/**
 * Turns a chosen fact into the question as it will be shown.
 *
 * `factA`/`factB` always come back unchanged, so the answer lands in the same
 * grid cell however it was asked.
 */
export function buildProblem(choice: FactChoice): Problem {
  const { op } = choice;
  let { a, b } = choice;

  switch (op) {
    case "add":
      return { op, a, b, factA: a, factB: b, prompt: `${a} + ${b}`, answer: a + b, hint: null };

    case "sub": {
      // Keep the result non-negative: a 7-year-old has not met negatives yet.
      if (a < b) [a, b] = [b, a];
      return { op, a, b, factA: a, factB: b, prompt: `${a} − ${b}`, answer: a - b, hint: null };
    }

    case "mul":
      return {
        op,
        a,
        b,
        factA: a,
        factB: b,
        prompt: `${a} × ${b}`,
        answer: a * b,
        hint: { groups: b, perGroup: a },
      };

    case "div": {
      // Built from a known product so the division is always exact.
      // b is the divisor, so it can never be 0 even when 0/1 are enabled.
      if (b === 0) b = 1;
      const product = a * b;
      return {
        op,
        a: product,
        b,
        factA: a,
        factB: b,
        prompt: `${product} ÷ ${b}`,
        answer: a,
        hint: { groups: b, perGroup: a },
      };
    }
  }
}
