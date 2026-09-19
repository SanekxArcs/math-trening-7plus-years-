// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { readSession, writeSession } from "./useLocalSession";

const T0 = 1_700_000_000_000;

const snapshot = {
  score: {
    rawPoints: 85,
    goodStreak: 3,
    badStreak: 0,
    bestStreak: 4,
    correct: 9,
    wrong: 2,
  },
  won: false,
  stopped: false,
  halfHalfReadyAt: T0 + 5000,
  question: {
    problem: {
      op: "mul" as const,
      a: 8,
      b: 7,
      factA: 8,
      factB: 7,
      prompt: "8 × 7",
      answer: 56,
      hint: { groups: 7, perGroup: 8 },
    },
    options: [56, 48, 63, 54],
    mode: "choice" as const,
  },
  usedHalfHalf: true,
  usedVisualHint: false,
  hidden: [1, 3],
  savedAt: T0,
};

describe("the stored session", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a session saved a moment ago", () => {
    writeSession(snapshot);
    expect(readSession(T0 + 30_000)).toEqual(snapshot);
  });

  it("forgets a session from hours ago", () => {
    // Sitting down to play again is a new game, not yesterday's half-finished
    // one — and a restored score the child does not remember earning is worse
    // than no score at all.
    writeSession(snapshot);
    expect(readSession(T0 + 7 * 60 * 60 * 1000)).toBeNull();
  });

  it("ignores junk rather than letting it reach the game", () => {
    localStorage.setItem("math_master_session", "not json");
    expect(readSession(T0)).toBeNull();

    localStorage.setItem("math_master_session", JSON.stringify({ savedAt: T0 }));
    expect(readSession(T0)?.score.rawPoints).toBe(0);
  });

  it("drops a half-written question rather than asking an unanswerable one", () => {
    // A missing answer, a text operand, tiles that are not numbers: each one
    // would reach the board as a question the child cannot get right.
    const broken = [
      { ...snapshot.question, problem: { ...snapshot.question.problem, answer: null } },
      { ...snapshot.question, problem: { ...snapshot.question.problem, op: "power" } },
      { ...snapshot.question, options: [56, "48", 63, 54] },
      { ...snapshot.question, mode: "guess" },
    ];

    for (const question of broken) {
      writeSession({ ...snapshot, question } as never);
      const restored = readSession(T0);
      expect(restored?.score.rawPoints).toBe(85);
      expect(restored?.question).toBeNull();
    }
  });

  it("forgets the spent lifelines along with the question they belonged to", () => {
    // Otherwise the next question would come up with two of its tiles already
    // hidden and 50:50 greyed out, for no reason the child can see.
    writeSession({ ...snapshot, question: null });

    const restored = readSession(T0);
    expect(restored?.usedHalfHalf).toBe(false);
    expect(restored?.hidden).toEqual([]);
  });
});
