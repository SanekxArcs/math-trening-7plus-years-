import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  EMPTY_FACT,
  FLUENT_MS,
  HALF_LIFE_DAYS,
  buildProblem,
  factId,
  masteryBand,
  nextQuestion,
  parseFactId,
  pickFact,
  seededRng,
  selectionWeight,
  strengthNow,
  updateFact,
  type FactStat,
  type GameSettings,
} from "./index.ts";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 13);

function settings(overrides: Partial<GameSettings> = {}): GameSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

const fast = { isCorrect: true, ms: 1200, difficulty: "medium" as const, aided: false };
const slow = { isCorrect: true, ms: 9000, difficulty: "medium" as const, aided: false };
const wrong = { isCorrect: false, ms: 3000, difficulty: "medium" as const, aided: false };

/** Answers a fact `times` over, returning the final record. */
function drill(outcome: typeof fast, times: number, from: FactStat = EMPTY_FACT): FactStat {
  let stat = from;
  for (let i = 0; i < times; i++) stat = updateFact(stat, outcome, NOW);
  return stat;
}

describe("factId", () => {
  it("round-trips", () => {
    const id = factId("mul", 7, 8, "hard");
    expect(id).toBe("mul:7:8:hard");
    expect(parseFactId(id)).toEqual({ op: "mul", a: 7, b: 8, difficulty: "hard" });
  });

  it("keeps difficulties apart", () => {
    // Knowing 7x8 among two tiles is not the same as typing it from memory.
    expect(factId("mul", 7, 8, "easy")).not.toBe(factId("mul", 7, 8, "expert"));
  });
});

describe("updateFact", () => {
  it("starts from nothing and grows with correct answers", () => {
    expect(strengthNow(EMPTY_FACT, NOW)).toBe(0);
    const once = updateFact(EMPTY_FACT, fast, NOW);
    expect(once.strength).toBeGreaterThan(0);
    expect(once.attempts).toBe(1);
    expect(once.correct).toBe(1);
  });

  it("rewards a fast answer more than a slow one", () => {
    expect(updateFact(EMPTY_FACT, fast, NOW).strength).toBeGreaterThan(
      updateFact(EMPTY_FACT, slow, NOW).strength,
    );
  });

  it("gives less credit when a lifeline was used", () => {
    const unaided = updateFact(EMPTY_FACT, fast, NOW).strength;
    const aided = updateFact(EMPTY_FACT, { ...fast, aided: true }, NOW).strength;
    expect(aided).toBeGreaterThan(0);
    expect(aided).toBeLessThan(unaided);
  });

  it("approaches but never reaches certainty", () => {
    const stat = drill(fast, 50);
    expect(stat.strength).toBeGreaterThan(0.9);
    expect(stat.strength).toBeLessThan(1);
  });

  it("costs far more for a mistake than one correct answer earns", () => {
    const known = drill(fast, 10);
    const after = updateFact(known, wrong, NOW);
    expect(after.strength).toBeLessThan(known.strength * 0.5);
    // One right answer does not undo it.
    expect(updateFact(after, fast, NOW).strength).toBeLessThan(known.strength);
  });

  it("tracks the best time, not the latest", () => {
    let stat = updateFact(EMPTY_FACT, { ...fast, ms: 5000 }, NOW);
    stat = updateFact(stat, { ...fast, ms: 1500 }, NOW);
    stat = updateFact(stat, { ...fast, ms: 8000 }, NOW);
    expect(stat.bestMs).toBe(1500);
    expect(stat.totalMs).toBe(14_500);
  });

  it("does not let a wrong answer set the best time", () => {
    const stat = updateFact(EMPTY_FACT, { ...wrong, ms: 50 }, NOW);
    expect(stat.bestMs).toBe(0);
  });

  it("treats the fluent threshold as the pivot for speed credit", () => {
    const atFluent = updateFact(EMPTY_FACT, { ...fast, ms: FLUENT_MS.medium }, NOW).strength;
    const wayOver = updateFact(EMPTY_FACT, { ...fast, ms: FLUENT_MS.medium * 3 }, NOW).strength;
    expect(atFluent).toBeGreaterThan(wayOver);
    // Past twice the threshold there is no speed credit left to lose.
    const twice = updateFact(EMPTY_FACT, { ...fast, ms: FLUENT_MS.medium * 2 }, NOW).strength;
    expect(wayOver).toBeCloseTo(twice, 10);
  });
});

describe("strengthNow", () => {
  it("halves over the half-life", () => {
    const stat = drill(fast, 20);
    const later = strengthNow(stat, NOW + HALF_LIFE_DAYS * DAY);
    expect(later).toBeCloseTo(stat.strength / 2, 5);
  });

  it("keeps fading, so nothing stays learned forever untouched", () => {
    const stat = drill(fast, 20);
    const a = strengthNow(stat, NOW + 30 * DAY);
    const b = strengthNow(stat, NOW + 120 * DAY);
    expect(b).toBeLessThan(a);
    expect(b).toBeGreaterThan(0);
  });

  it("does not grow if the clock goes backwards", () => {
    const stat = drill(fast, 5);
    expect(strengthNow(stat, NOW - 10 * DAY)).toBeCloseTo(stat.strength, 10);
  });
});

describe("masteryBand", () => {
  it("reports unseen for a fact with no attempts", () => {
    expect(masteryBand(undefined, NOW)).toBe("unseen");
    expect(masteryBand(EMPTY_FACT, NOW)).toBe("unseen");
  });

  it("moves through the bands as practice accumulates", () => {
    expect(masteryBand(drill(fast, 1), NOW)).toBe("learning");
    expect(masteryBand(drill(fast, 3), NOW)).toBe("practising");
    expect(masteryBand(drill(fast, 10), NOW)).toBe("known");
  });

  it("drops back down after a long gap", () => {
    const known = drill(fast, 10);
    expect(masteryBand(known, NOW)).toBe("known");
    expect(masteryBand(known, NOW + 60 * DAY)).not.toBe("known");
  });
});

describe("selectionWeight", () => {
  it("puts a fact they got wrong above one they have never seen", () => {
    // The ordering that matters: a demonstrated mistake is the most useful
    // thing to ask next. These two used to weigh exactly the same, so a wrong
    // answer vanished back into a table of sixty unseen cells.
    const gotWrong = updateFact(EMPTY_FACT, wrong, NOW);
    expect(selectionWeight(gotWrong, NOW)).toBeGreaterThan(selectionWeight(undefined, NOW));
  });

  it("ranks the whole ladder in the order practice should follow", () => {
    const gotWrong = selectionWeight(updateFact(EMPTY_FACT, wrong, NOW), NOW);
    const shaky = selectionWeight(drill(fast, 1), NOW);
    const unseen = selectionWeight(undefined, NOW);
    const practising = selectionWeight(drill(fast, 4), NOW);
    const known = selectionWeight(drill(fast, 20), NOW);

    expect(gotWrong).toBeGreaterThan(shaky);
    expect(shaky).toBeGreaterThan(unseen);
    expect(unseen).toBeGreaterThan(practising);
    expect(practising).toBeGreaterThan(known);
  });

  it("never reaches zero, so mastered facts still come round", () => {
    expect(selectionWeight(drill(fast, 200), NOW)).toBeGreaterThan(0);
  });

  it("rises again as a fact decays", () => {
    const known = drill(fast, 20);
    expect(selectionWeight(known, NOW + 60 * DAY)).toBeGreaterThan(
      selectionWeight(known, NOW),
    );
  });
});

describe("pickFact", () => {
  const config = settings({ ops: ["mul"], limit1: 9, limit2: 9, difficulty: "medium" });

  it("stays inside the configured limits", () => {
    const rng = seededRng(5);
    for (let i = 0; i < 2000; i++) {
      const choice = pickFact(config, new Map(), rng, NOW);
      expect(choice.op).toBe("mul");
      expect(choice.a).toBeGreaterThanOrEqual(2);
      expect(choice.a).toBeLessThanOrEqual(9);
      expect(choice.b).toBeGreaterThanOrEqual(2);
      expect(choice.b).toBeLessThanOrEqual(9);
    }
  });

  it("asks a weak fact far more often than a mastered one", () => {
    // Everything is mastered except 7x8, which has never been seen.
    const stats = new Map<string, FactStat>();
    const mastered = drill(fast, 30);
    for (let a = 2; a <= 9; a++) {
      for (let b = 2; b <= 9; b++) {
        if (a === 7 && b === 8) continue;
        stats.set(factId("mul", a, b, "medium"), mastered);
      }
    }

    const rng = seededRng(11);
    const runs = 3000;
    let weak = 0;
    for (let i = 0; i < runs; i++) {
      const choice = pickFact(config, stats, rng, NOW);
      if (choice.a === 7 && choice.b === 8) weak++;
    }

    // One cell out of 64; a uniform draw would find it ~1.6% of the time.
    expect(weak / runs).toBeGreaterThan(0.35);
  });

  it("still returns mastered facts sometimes, so they are not forgotten", () => {
    const stats = new Map<string, FactStat>();
    const mastered = drill(fast, 30);
    for (let a = 2; a <= 9; a++) {
      for (let b = 2; b <= 9; b++) stats.set(factId("mul", a, b, "medium"), mastered);
    }

    const rng = seededRng(13);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const c = pickFact(config, stats, rng, NOW);
      seen.add(`${c.a}:${c.b}`);
    }
    // It keeps drawing from the whole table rather than locking onto one cell.
    expect(seen.size).toBeGreaterThan(20);
  });

  it("does not ask the same fact twice in a row", () => {
    const stats = new Map<string, FactStat>();
    const rng = seededRng(17);
    let previous: string | undefined;

    for (let i = 0; i < 800; i++) {
      const choice = pickFact(config, stats, rng, NOW, { avoid: previous });
      const id = factId(choice.op, choice.a, choice.b, config.difficulty);
      expect(id).not.toBe(previous);
      previous = id;
    }
  });

  it("keeps difficulties independent", () => {
    // Mastered on easy, untouched on expert: the expert draw must not benefit.
    const stats = new Map<string, FactStat>();
    const mastered = drill(fast, 30);
    for (let a = 2; a <= 9; a++) {
      for (let b = 2; b <= 9; b++) stats.set(factId("mul", a, b, "easy"), mastered);
    }

    const expert = settings({ ...config, difficulty: "expert" });
    const weights = [...Array(20)].map(() => {
      const c = pickFact(expert, stats, seededRng(3), NOW);
      return selectionWeight(stats.get(factId(c.op, c.a, c.b, "expert")), NOW);
    });
    // Every expert fact is still unseen, so all weights are the unseen weight.
    expect(new Set(weights).size).toBe(1);
  });
});

describe("adaptive nextQuestion", () => {
  it("draws towards weak facts when stats are supplied", () => {
    const config = settings({ ops: ["mul"], limit1: 9, limit2: 9, adaptive: true });
    const stats = new Map<string, FactStat>();
    const mastered = drill(fast, 30);
    for (let a = 2; a <= 9; a++) {
      for (let b = 2; b <= 9; b++) {
        if (a === 6 && b === 7) continue;
        stats.set(factId("mul", a, b, "medium"), mastered);
      }
    }

    const rng = seededRng(23);
    let hits = 0;
    for (let i = 0; i < 1000; i++) {
      const q = nextQuestion(config, rng, { stats, now: NOW });
      if (q.problem.factA === 6 && q.problem.factB === 7) hits++;
    }
    expect(hits / 1000).toBeGreaterThan(0.3);
  });

  it("falls back to a uniform draw with no stats, so a fresh install works", () => {
    const config = settings({ ops: ["mul"], adaptive: true });
    const rng = seededRng(29);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const q = nextQuestion(config, rng);
      seen.add(`${q.problem.factA}:${q.problem.factB}`);
    }
    expect(seen.size).toBeGreaterThan(30);
  });

  it("is ignored when adaptive practice is switched off", () => {
    const config = settings({ ops: ["mul"], limit1: 9, limit2: 9, adaptive: false });
    const stats = new Map<string, FactStat>();
    const mastered = drill(fast, 30);
    for (let a = 2; a <= 9; a++) {
      for (let b = 2; b <= 9; b++) {
        if (a === 6 && b === 7) continue;
        stats.set(factId("mul", a, b, "medium"), mastered);
      }
    }

    const rng = seededRng(31);
    let hits = 0;
    for (let i = 0; i < 2000; i++) {
      const q = nextQuestion(config, rng, { stats, now: NOW });
      if (q.problem.factA === 6 && q.problem.factB === 7) hits++;
    }
    // Uniform over 64 cells is about 1.6%.
    expect(hits / 2000).toBeLessThan(0.06);
  });
});

describe("fact identity across operations", () => {
  it("puts a division in the same cell as its multiplication", () => {
    const mul = buildProblem({ op: "mul", a: 4, b: 7 });
    const div = buildProblem({ op: "div", a: 4, b: 7 });

    expect(mul.prompt).toBe("4 × 7");
    expect(div.prompt).toBe("28 ÷ 7");
    // Different questions, different answers — but the same table cell.
    expect([div.factA, div.factB]).toEqual([mul.factA, mul.factB]);
    expect(div.answer).toBe(4);
    expect(mul.answer).toBe(28);
  });

  it("uses the swapped operands for subtraction", () => {
    const problem = buildProblem({ op: "sub", a: 3, b: 9 });
    expect(problem.prompt).toBe("9 − 3");
    expect([problem.factA, problem.factB]).toEqual([9, 3]);
  });
});
