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
});
