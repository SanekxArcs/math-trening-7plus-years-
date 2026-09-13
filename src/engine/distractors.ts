import { randInt, shuffle, type Rng } from "./rng.ts";
import { optionCount } from "./problem.ts";
import type { Difficulty, Problem } from "./types.ts";

/**
 * Wrong options are modelled on the mistakes children actually make, not drawn
 * at random.
 *
 * The old game generated decoys from a hardcoded 1..81 range regardless of the
 * configured limits, so with Limit = 12 the answer to 12x11 was the only option
 * above 81 — every large question gave itself away, and the child learned to
 * spot the outlier instead of to multiply. Decoys here are always adjacent
 * facts, off-by-ones, or the result of applying the wrong operation, so the
 * only way to tell them apart is to do the sum.
 */
function candidatesFor(problem: Problem): number[] {
  const { op, a, b, answer } = problem;
  const near = [answer - 1, answer + 1, answer - 2, answer + 2];

  switch (op) {
    case "add":
      return [
        ...near,
        a - b, // applied the wrong operation
        b - a,
        answer + 10, // carry slips
        answer - 10,
        a + b + b,
      ];

    case "sub":
      return [
        ...near,
        a + b, // applied the wrong operation
        answer + 10, // borrow slips
        answer - 10,
        a - b - b,
        b,
      ];

    case "mul":
      // answer +/- a and +/- b are the neighbouring table facts: for 7x8=56
      // these give 48 (6x8), 63 (7x9), 49 (7x7) and 64 (8x8) — exactly the
      // answers a child lands on when they recite one step too far.
      return [
        answer - a,
        answer + a,
        answer - b,
        answer + b,
        ...near,
        a + b, // applied the wrong operation
        a * b + a * 2,
      ];

    case "div":
      return [
        ...near,
        b, // returned the divisor instead of the quotient
        answer + b,
        answer - b,
        a - b, // a is the dividend here
        answer * 2,
      ];
  }
}

/**
 * Always returns exactly `count` distinct non-negative values, none equal to
 * the answer. Termination is guaranteed: the random phase is capped and a
 * deterministic sweep finishes the job.
 */
export function buildDistractors(
  problem: Problem,
  count: number,
  rng: Rng,
): number[] {
  if (count <= 0) return [];

  const { answer } = problem;
  const chosen = new Set<number>();

  /**
   * How far from the answer a decoy may sit. A "wrong operation" decoy is a
   * real mistake for 3x4 (a+b = 7 against 12) but absurd for 12x10 (22 against
   * 120) — and an absurd decoy is worse than no decoy, because it lets the
   * child win by spotting the outlier. Same guard, both phases.
   */
  const span = Math.max(4, Math.round(Math.abs(answer) * 0.6));

  const offer = (value: number, enforceSpan = true): boolean => {
    if (!Number.isInteger(value)) return false;
    if (value < 0) return false;
    if (value === answer) return false;
    if (enforceSpan && Math.abs(value - answer) > span) return false;
    if (chosen.has(value)) return false;
    chosen.add(value);
    return true;
  };

  for (const value of shuffle(rng, candidatesFor(problem))) {
    if (chosen.size >= count) break;
    offer(value);
  }

  for (let attempt = 0; chosen.size < count && attempt < 200; attempt++) {
    offer(answer + randInt(rng, -span, span));
  }

  // Deterministic fill, span waived so the count is always met. Only reachable
  // for tiny answers, where the span holds fewer distinct non-negative values
  // than we need — answer 0 with six tiles, for instance.
  for (let step = 1; chosen.size < count; step++) {
    if (!offer(answer + step, false)) offer(answer - step, false);
  }

  return [...chosen].slice(0, count);
}

/** The full shuffled option list, answer included. Empty for typed answers. */
export function buildOptions(
  problem: Problem,
  difficulty: Difficulty,
  rng: Rng,
): number[] {
  const total = optionCount(difficulty);
  if (total === 0) return [];
  return shuffle(rng, [
    problem.answer,
    ...buildDistractors(problem, total - 1, rng),
  ]);
}
