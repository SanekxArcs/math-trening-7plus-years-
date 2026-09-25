import { describe, expect, it } from "vitest";
import {
  BASE_POINTS,
  DEFAULT_SETTINGS,
  INITIAL_SCORE,
  applyAttempt,
  buildDistractors,
  buildOptions,
  clampAttemptMs,
  comboMultiplier,
  displayPoints,
  generateProblem,
  halfHalfRemoves,
  MAX_ATTEMPT_MS,
  nextQuestion,
  nextTierAt,
  optionCount,
  penaltyFor,
  seededRng,
  shuffle,
} from "./index.ts";
import type { Difficulty, GameSettings, Op } from "./index.ts";

const ALL_OPS: Op[] = ["add", "sub", "mul", "div"];
const CHOICE_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function settings(overrides: Partial<GameSettings> = {}): GameSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe("shuffle", () => {
  it("preserves the multiset", () => {
    const rng = seededRng(1);
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(rng, input);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it("does not mutate its input", () => {
    const input = [1, 2, 3];
    shuffle(seededRng(2), input);
    expect(input).toEqual([1, 2, 3]);
  });

  it("is close to uniform across positions", () => {
    // The old sort-with-random-comparator failed this badly. 4 slots, 40k runs,
    // so each slot should see each value ~10k times.
    const rng = seededRng(99);
    const counts = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
    const runs = 40_000;

    for (let i = 0; i < runs; i++) {
      const out = shuffle(rng, [0, 1, 2, 3]);
      out.forEach((value, position) => {
        (counts[position] as number[])[value]!++;
      });
    }

    const expected = runs / 4;
    for (const row of counts) {
      for (const count of row) {
        expect(Math.abs(count - expected) / expected).toBeLessThan(0.05);
      }
    }
  });
});

describe("generateProblem", () => {
  it("respects the configured limits", () => {
    const rng = seededRng(7);
    const config = settings({ ops: ALL_OPS, limit1: 12, limit2: 8 });

    for (let i = 0; i < 3000; i++) {
      const p = generateProblem(config, rng);
      if (p.op === "add" || p.op === "mul") {
        expect(p.a).toBeGreaterThanOrEqual(2);
        expect(p.a).toBeLessThanOrEqual(12);
        expect(p.b).toBeGreaterThanOrEqual(2);
        expect(p.b).toBeLessThanOrEqual(8);
      }
    }
  });

  it("never produces a negative subtraction result", () => {
    const rng = seededRng(11);
    const config = settings({ ops: ["sub"], limit1: 4, limit2: 20 });
    for (let i = 0; i < 2000; i++) {
      expect(generateProblem(config, rng).answer).toBeGreaterThanOrEqual(0);
    }
  });

  it("only produces exact divisions, and never divides by zero", () => {
    const rng = seededRng(13);
    const config = settings({ ops: ["div"], includeZeroOne: true, limit1: 10, limit2: 10 });
    for (let i = 0; i < 3000; i++) {
      const p = generateProblem(config, rng);
      expect(p.b).not.toBe(0);
      expect(p.a % p.b).toBe(0);
      expect(p.a / p.b).toBe(p.answer);
    }
  });

  it("computes every operation correctly", () => {
    const rng = seededRng(17);
    const config = settings({ ops: ALL_OPS, includeZeroOne: true });
    for (let i = 0; i < 5000; i++) {
      const p = generateProblem(config, rng);
      const expected = {
        add: p.a + p.b,
        sub: p.a - p.b,
        mul: p.a * p.b,
        div: p.a / p.b,
      }[p.op];
      expect(p.answer).toBe(expected);
    }
  });

  it("includes 0 and 1 only when asked to", () => {
    const withZero = settings({ ops: ["mul"], includeZeroOne: true });
    const without = settings({ ops: ["mul"], includeZeroOne: false });

    const seen = new Set<number>();
    const rngA = seededRng(23);
    for (let i = 0; i < 2000; i++) {
      const p = generateProblem(withZero, rngA);
      seen.add(p.a);
      seen.add(p.b);
    }
    expect(seen.has(0)).toBe(true);
    expect(seen.has(1)).toBe(true);

    const rngB = seededRng(29);
    for (let i = 0; i < 2000; i++) {
      const p = generateProblem(without, rngB);
      expect(p.a).toBeGreaterThanOrEqual(2);
      expect(p.b).toBeGreaterThanOrEqual(2);
    }
  });

  it("only attaches a picture hint to multiplication and division", () => {
    // "3 groups of 4" explains a product. + and − get their picture too, but
    // it is drawn from the operands in the UI, so the model carries nothing.
    const rng = seededRng(101);
    const config = settings({ ops: ALL_OPS, includeZeroOne: true });

    for (let i = 0; i < 5000; i++) {
      const p = generateProblem(config, rng);
      if (p.op === "add" || p.op === "sub") {
        expect(p.hint, p.prompt).toBeNull();
      } else if (p.op === "mul") {
        // For a product the picture totals the answer: 3 groups of 4 is 12.
        expect(p.hint, p.prompt).not.toBeNull();
        expect(p.hint!.groups * p.hint!.perGroup).toBe(p.answer);
        expect(p.hint!.perGroup).toBe(p.a);
        expect(p.hint!.groups).toBe(p.b);
      } else {
        // For a division the picture totals the *dividend*, and the answer is
        // the size of one group: 28 ÷ 7 draws 7 groups of 4.
        expect(p.hint, p.prompt).not.toBeNull();
        expect(p.hint!.groups * p.hint!.perGroup).toBe(p.a);
        expect(p.hint!.perGroup).toBe(p.answer);
        expect(p.hint!.groups).toBe(p.b);
      }
    }
  });

  it("survives a limit below the operand floor instead of throwing", () => {
    const rng = seededRng(31);
    const config = settings({ ops: ALL_OPS, limit1: 1, limit2: -5 });
    for (let i = 0; i < 500; i++) {
      expect(() => generateProblem(config, rng)).not.toThrow();
    }
  });
});

describe("buildDistractors", () => {
  it("returns the requested count, distinct, non-negative, never the answer", () => {
    const rng = seededRng(37);
    const config = settings({ ops: ALL_OPS, includeZeroOne: true, limit1: 12, limit2: 12 });

    for (let i = 0; i < 4000; i++) {
      const problem = generateProblem(config, rng);
      for (const count of [1, 3, 5]) {
        const decoys = buildDistractors(problem, count, rng);
        expect(decoys).toHaveLength(count);
        expect(new Set(decoys).size).toBe(count);
        for (const d of decoys) {
          expect(d).not.toBe(problem.answer);
          expect(d).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(d)).toBe(true);
        }
      }
    }
  });

  it("terminates for the degenerate answer of 0", () => {
    const problem = {
      op: "mul" as const,
      a: 0,
      b: 5,
      factA: 0,
      factB: 5,
      prompt: "0 × 5",
      answer: 0,
      hint: { groups: 5, perGroup: 0 },
    };
    const decoys = buildDistractors(problem, 5, seededRng(41));
    expect(decoys).toHaveLength(5);
    expect(decoys).not.toContain(0);
  });

  it("keeps decoys in the same magnitude as the answer", () => {
    // The old game drew decoys from 1..81 regardless of limits, so with a limit
    // of 12 the answer to 12x11=132 was the only option above 81.
    const rng = seededRng(43);
    const config = settings({ ops: ["mul"], limit1: 12, limit2: 12 });

    for (let i = 0; i < 2000; i++) {
      const problem = generateProblem(config, rng);
      if (problem.answer < 20) continue;
      for (const d of buildDistractors(problem, 5, rng)) {
        const ratio = d / problem.answer;
        expect(ratio).toBeGreaterThan(0.3);
        expect(ratio).toBeLessThan(3);
      }
    }
  });

  it("does not make the answer the largest or smallest option every time", () => {
    // The real giveaway test: if the answer is systematically extreme, a child
    // can win without doing arithmetic.
    const rng = seededRng(47);
    const config = settings({ ops: ALL_OPS, limit1: 10, limit2: 10 });
    let extreme = 0;
    const runs = 4000;

    for (let i = 0; i < runs; i++) {
      const problem = generateProblem(config, rng);
      const options = buildOptions(problem, "medium", rng);
      const max = Math.max(...options);
      const min = Math.min(...options);
      if (problem.answer === max || problem.answer === min) extreme++;
    }

    // With 4 options, chance alone puts the answer at an extreme half the time.
    expect(extreme / runs).toBeLessThan(0.6);
  });
});

describe("buildOptions", () => {
  it("gives each difficulty the right number of distinct tiles", () => {
    const rng = seededRng(53);
    for (const difficulty of CHOICE_DIFFICULTIES) {
      const config = settings({ ops: ALL_OPS, difficulty });
      for (let i = 0; i < 1000; i++) {
        const q = nextQuestion(config, rng);
        expect(q.options).toHaveLength(optionCount(difficulty));
        expect(new Set(q.options).size).toBe(optionCount(difficulty));
        expect(q.options).toContain(q.problem.answer);
        expect(q.mode).toBe("choice");
      }
    }
  });

  it("gives expert mode no options at all", () => {
    const q = nextQuestion(settings({ difficulty: "expert" }), seededRng(59));
    expect(q.options).toEqual([]);
    expect(q.mode).toBe("type");
  });

  it("places the answer uniformly across positions", () => {
    const rng = seededRng(61);
    const config = settings({ ops: ALL_OPS, difficulty: "medium" });
    const counts = [0, 0, 0, 0];
    const runs = 40_000;

    for (let i = 0; i < runs; i++) {
      const q = nextQuestion(config, rng);
      counts[q.options.indexOf(q.problem.answer)]!++;
    }

    const expected = runs / 4;
    for (const count of counts) {
      expect(Math.abs(count - expected) / expected).toBeLessThan(0.05);
    }
  });
});

describe("halfHalfRemoves", () => {
  it("always leaves the answer plus an equal number of decoys", () => {
    expect(halfHalfRemoves("easy")).toBe(1); // 2 -> 1
    expect(halfHalfRemoves("medium")).toBe(2); // 4 -> 2
    expect(halfHalfRemoves("hard")).toBe(3); // 6 -> 3
    expect(halfHalfRemoves("expert")).toBe(0);
  });
});

describe("comboMultiplier", () => {
  it("steps at 5, 15 and 30 and caps at x4", () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(4)).toBe(1);
    expect(comboMultiplier(5)).toBe(2);
    expect(comboMultiplier(14)).toBe(2);
    expect(comboMultiplier(15)).toBe(3);
    expect(comboMultiplier(29)).toBe(3);
    expect(comboMultiplier(30)).toBe(4);
    expect(comboMultiplier(500)).toBe(4);
  });

  it("reports the next threshold, and null at the cap", () => {
    expect(nextTierAt(0)).toBe(5);
    expect(nextTierAt(6)).toBe(15);
    expect(nextTierAt(20)).toBe(30);
    expect(nextTierAt(30)).toBeNull();
  });
});

describe("penaltyFor", () => {
  it("escalates and then caps", () => {
    expect(penaltyFor(0)).toBe(0);
    expect(penaltyFor(1)).toBe(10);
    expect(penaltyFor(2)).toBe(25);
    expect(penaltyFor(3)).toBe(45);
    expect(penaltyFor(4)).toBe(70);
    expect(penaltyFor(99)).toBe(70);
  });

  it("grows faster than the combo does", () => {
    // Four wrong answers cost more than four right ones earn, which is what
    // makes a bad run feel urgent.
    const earned = [1, 2, 3, 4].reduce(
      (sum, streak) => sum + BASE_POINTS.medium * comboMultiplier(streak),
      0,
    );
    const lost = [1, 2, 3, 4].reduce((sum, streak) => sum + penaltyFor(streak), 0);
    expect(lost).toBeGreaterThan(earned);
  });
});

describe("applyAttempt", () => {
  const correct = {
    isCorrect: true,
    difficulty: "medium" as Difficulty,
    usedHalfHalf: false,
    usedVisualHint: false,
    fast: false,
  };
  const wrong = { ...correct, isCorrect: false };

  it("awards base points at the start", () => {
    const result = applyAttempt(INITIAL_SCORE, correct);
    expect(result.delta).toBe(10);
    expect(result.state.goodStreak).toBe(1);
    expect(result.multiplier).toBe(1);
  });

  it("applies x2 on the fifth correct answer in a row", () => {
    let state = INITIAL_SCORE;
    let last = applyAttempt(state, correct);
    for (let i = 0; i < 4; i++) {
      last = applyAttempt(state, correct);
      state = last.state;
    }
    expect(state.goodStreak).toBe(4);
    expect(last.multiplier).toBe(1);

    last = applyAttempt(state, correct);
    expect(last.state.goodStreak).toBe(5);
    expect(last.multiplier).toBe(2);
    expect(last.delta).toBe(20);
    expect(last.tierUp).toBe(true);
  });

  it("rewards a fast answer", () => {
    expect(applyAttempt(INITIAL_SCORE, { ...correct, fast: true }).delta).toBe(13);
  });

  it("scores nothing and ends the run when the picture hint was used", () => {
    let state = INITIAL_SCORE;
    for (let i = 0; i < 6; i++) state = applyAttempt(state, correct).state;
    expect(state.goodStreak).toBe(6);
    expect(state.rawPoints).toBe(80); // 5 x10 then the x2 tier

    const hinted = applyAttempt(state, { ...correct, usedVisualHint: true });
    expect(hinted.delta).toBe(0);
    expect(hinted.state.rawPoints).toBe(80); // no points, but none taken away
    expect(hinted.state.goodStreak).toBe(0); // the run ends
    expect(hinted.state.correct).toBe(7); // it was still a correct answer
    expect(hinted.state.wrong).toBe(0);
    expect(hinted.state.bestStreak).toBe(6);
  });

  it("lets the picture hint clear a bad run without paying a penalty", () => {
    let state = INITIAL_SCORE;
    for (let i = 0; i < 3; i++) state = applyAttempt(state, wrong).state;
    expect(state.badStreak).toBe(3);
    const points = state.rawPoints;

    const hinted = applyAttempt(state, { ...correct, usedVisualHint: true });
    expect(hinted.state.badStreak).toBe(0);
    expect(hinted.state.rawPoints).toBe(points);
  });

  it("takes the harsher of the two lifelines when both were used", () => {
    let state = INITIAL_SCORE;
    for (let i = 0; i < 6; i++) state = applyAttempt(state, correct).state;

    const both = applyAttempt(state, {
      ...correct,
      usedHalfHalf: true,
      usedVisualHint: true,
    });
    // 50:50 alone would keep the streak; the picture hint ends it either way.
    expect(both.delta).toBe(0);
    expect(both.state.goodStreak).toBe(0);
  });

  it("scores nothing for a 50:50 answer but keeps the streak alive", () => {
    let state = INITIAL_SCORE;
    for (let i = 0; i < 4; i++) state = applyAttempt(state, correct).state;
    expect(state.goodStreak).toBe(4);
    expect(state.rawPoints).toBe(40);

    const lifeline = applyAttempt(state, { ...correct, usedHalfHalf: true });
    expect(lifeline.delta).toBe(0);
    expect(lifeline.state.rawPoints).toBe(40);
    // The run continues — and this answer is what carries them to the x2 tier.
    expect(lifeline.state.goodStreak).toBe(5);
    expect(lifeline.state.correct).toBe(5);
    expect(lifeline.multiplier).toBe(2);
    expect(lifeline.tierUp).toBe(true);

    // The next unaided answer is worth the higher multiplier.
    expect(applyAttempt(lifeline.state, correct).delta).toBe(20);
  });

  it("ignores the speed bonus when 50:50 was used", () => {
    expect(
      applyAttempt(INITIAL_SCORE, { ...correct, usedHalfHalf: true, fast: true }).delta,
    ).toBe(0);
  });

  it("scales with difficulty", () => {
    for (const difficulty of ["easy", "medium", "hard", "expert"] as Difficulty[]) {
      const result = applyAttempt(INITIAL_SCORE, { ...correct, difficulty });
      expect(result.delta).toBe(BASE_POINTS[difficulty]);
    }
  });

  it("ends the combo outright on one mistake", () => {
    let state = INITIAL_SCORE;
    for (let i = 0; i < 20; i++) state = applyAttempt(state, correct).state;
    expect(comboMultiplier(state.goodStreak)).toBe(3);

    const result = applyAttempt(state, wrong);
    expect(result.state.goodStreak).toBe(0);
    expect(result.state.badStreak).toBe(1);
    expect(result.delta).toBe(-10);
    expect(result.state.bestStreak).toBe(20);
  });

  it("escalates a bad run and only a correct answer clears it", () => {
    let state = INITIAL_SCORE;
    const deltas: number[] = [];
    for (let i = 0; i < 5; i++) {
      const result = applyAttempt(state, wrong);
      deltas.push(result.delta);
      state = result.state;
    }
    expect(deltas).toEqual([-10, -25, -45, -70, -70]);
    expect(state.badStreak).toBe(5);

    const recovered = applyAttempt(state, correct);
    expect(recovered.state.badStreak).toBe(0);
    expect(recovered.state.goodStreak).toBe(1);
  });

  it("tracks counts and keeps the true total while flooring the display", () => {
    let state = INITIAL_SCORE;
    for (let i = 0; i < 3; i++) state = applyAttempt(state, wrong).state;

    expect(state.rawPoints).toBe(-80);
    expect(displayPoints(state)).toBe(0);
    expect(state.wrong).toBe(3);
    expect(state.correct).toBe(0);
  });

  it("is pure — the input state is never mutated", () => {
    const before = { ...INITIAL_SCORE, goodStreak: 4, rawPoints: 40 };
    const snapshot = { ...before };
    applyAttempt(before, correct);
    applyAttempt(before, wrong);
    expect(before).toEqual(snapshot);
  });
});

describe("response times", () => {
  it("keeps a real answer exactly as measured", () => {
    expect(clampAttemptMs(3421)).toBe(3421);
  });

  it("caps an abandoned question rather than letting it skew an average", () => {
    // Ten minutes and an hour are the same event — the tablet was put down —
    // and neither should be able to move a fact's average more than the cap.
    expect(clampAttemptMs(600_000)).toBe(MAX_ATTEMPT_MS);
    expect(clampAttemptMs(3_600_000)).toBe(MAX_ATTEMPT_MS);
  });

  it("treats an impossible time as slow, never as instant", () => {
    // A clock that moved backwards mid-question, or a missing value from an
    // older build. It has to land on a real number — NaN would poison every
    // sum it touches — and on the safe side of it: reading as instant would
    // earn speed credit for a fact the child never demonstrated.
    expect(clampAttemptMs(-5)).toBe(MAX_ATTEMPT_MS);
    expect(clampAttemptMs(Number.NaN)).toBe(MAX_ATTEMPT_MS);
    expect(clampAttemptMs(Number.POSITIVE_INFINITY)).toBe(MAX_ATTEMPT_MS);
  });
});
