import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, MAX_ATTEMPT_MS, type Question } from "@/engine";
import { createInitialState, gameReducer, type GameState } from "./useGame";

const T0 = 1_700_000_000_000;

function fresh(overrides: Partial<typeof DEFAULT_SETTINGS> = {}): GameState {
  return createInitialState({ ...DEFAULT_SETTINGS, ...overrides }, T0);
}

/** The response time the game recorded for the answer just given. */
function recordedMs(state: GameState): number {
  const last = state.pending.at(-1);
  if (!last) throw new Error("no attempt was recorded");
  return last.ms;
}

describe("the clock", () => {
  it("hands back the time the game spent paused", () => {
    let state = fresh();
    // Two seconds of real thinking, a five-minute interruption, one more second.
    state = gameReducer(state, {
      type: "pause",
      reason: "manual",
      value: true,
      now: T0 + 2000,
    });
    state = gameReducer(state, {
      type: "pause",
      reason: "manual",
      value: false,
      now: T0 + 302_000,
    });
    state = gameReducer(state, { type: "answer", value: 1, now: T0 + 303_000 });

    expect(recordedMs(state)).toBe(3000);
  });

  it("stays paused until every reason is gone", () => {
    let state = fresh();
    // Tapped pause, then the tablet was put to sleep: coming back from sleep
    // must not dismiss the pause the child is looking at.
    state = gameReducer(state, { type: "pause", reason: "manual", value: true, now: T0 });
    state = gameReducer(state, { type: "pause", reason: "away", value: true, now: T0 + 500 });
    state = gameReducer(state, {
      type: "pause",
      reason: "away",
      value: false,
      now: T0 + 60_000,
    });

    expect(state.paused).toBe(true);

    state = gameReducer(state, {
      type: "pause",
      reason: "manual",
      value: false,
      now: T0 + 61_000,
    });
    expect(state.paused).toBe(false);

    state = gameReducer(state, { type: "answer", value: 1, now: T0 + 62_000 });
    expect(recordedMs(state)).toBe(1000);
  });

  it("is identity-stable when nothing changes", () => {
    // The visibility listener re-asserts "not away" on every event. Returning a
    // new state for that would re-run every effect keyed on it, forever.
    const state = fresh();
    expect(gameReducer(state, { type: "pause", reason: "away", value: false, now: T0 })).toBe(
      state,
    );
  });

  it("ignores an answer that arrives while the clock is stopped", () => {
    const paused = gameReducer(fresh(), {
      type: "pause",
      reason: "away",
      value: true,
      now: T0,
    });
    expect(gameReducer(paused, { type: "answer", value: 1, now: T0 + 10 })).toBe(paused);
    expect(gameReducer(paused, { type: "timeout", now: T0 + 10 })).toBe(paused);
  });

  it("records an abandoned question as two minutes, not as an hour", () => {
    const state = gameReducer(fresh(), {
      type: "answer",
      value: 1,
      now: T0 + 3_600_000,
    });
    expect(recordedMs(state)).toBe(MAX_ATTEMPT_MS);
  });

  it("never starts a question in the future", () => {
    // A settings change lands while the game is paused, so the new question's
    // clock starts mid-pause. Resuming must not push its start past now and
    // make the next answer look instant.
    let state = fresh();
    state = gameReducer(state, { type: "pause", reason: "away", value: true, now: T0 });
    state = gameReducer(state, {
      type: "applySettings",
      settings: { ...DEFAULT_SETTINGS, difficulty: "hard" },
      now: T0 + 100_000,
      getStats: () => new Map(),
    });
    state = gameReducer(state, {
      type: "pause",
      reason: "away",
      value: false,
      now: T0 + 100_000,
    });
    state = gameReducer(state, { type: "answer", value: 1, now: T0 + 104_000 });

    expect(recordedMs(state)).toBe(4000);
  });
});

describe("stopping", () => {
  it("ends the session without recording the abandoned question", () => {
    const state = gameReducer(fresh(), { type: "stop" });

    expect(state.phase).toBe("finished");
    expect(state.stopped).toBe(true);
    expect(state.won).toBe(false);
    expect(state.pending).toHaveLength(0);
  });

  it("freezes the game: no further answers and no next question", () => {
    const stopped = gameReducer(fresh(), { type: "stop" });

    expect(gameReducer(stopped, { type: "answer", value: 1, now: T0 + 10 })).toBe(stopped);
    expect(
      gameReducer(stopped, { type: "next", now: T0 + 10, getStats: () => new Map() }),
    ).toBe(stopped);
  });

  it("clears the pause and the stop when a new session starts", () => {
    let state = gameReducer(fresh(), { type: "pause", reason: "manual", value: true, now: T0 });
    state = gameReducer(state, { type: "stop" });
    state = gameReducer(state, { type: "restart", now: T0 + 1000, getStats: () => new Map() });

    expect(state.stopped).toBe(false);
    expect(state.paused).toBe(false);
    expect(state.phase).toBe("asking");
    expect(state.score.correct).toBe(0);
  });
});

describe("resuming a session", () => {
  /** A four-tile question, as Medium asks them. */
  const stored: Question = {
    problem: {
      op: "mul",
      a: 8,
      b: 7,
      factA: 8,
      factB: 7,
      prompt: "8 × 7",
      answer: 56,
      hint: { groups: 7, perGroup: 8 },
    },
    options: [56, 48, 63, 54],
    mode: "choice",
  };

  const snapshot = {
    score: {
      rawPoints: 140,
      goodStreak: 6,
      badStreak: 0,
      bestStreak: 6,
      correct: 12,
      wrong: 1,
    },
    won: false,
    lost: false,
    stopped: false,
    halfHalfReadyAt: T0 + 20_000,
    question: stored,
    usedHalfHalf: false,
    usedVisualHint: false,
    hidden: [],
    savedAt: T0,
  };

  it("carries the points, the combo and the lifeline cooldown across a reload", () => {
    const state = createInitialState(DEFAULT_SETTINGS, T0, () => new Map(), snapshot);

    expect(state.score).toEqual(snapshot.score);
    expect(state.halfHalfReadyAt).toBe(T0 + 20_000);
    expect(state.phase).toBe("asking");
  });

  it("asks the same question again, so a reload cannot dodge a hard one", () => {
    const state = createInitialState(DEFAULT_SETTINGS, T0, () => new Map(), snapshot);

    expect(state.question).toEqual(stored);
    // The clock starts over: a slow reload is not the child's thinking time.
    expect(state.askedAt).toBe(T0);
  });

  it("does not refund the lifelines already spent on that question", () => {
    const state = createInitialState(DEFAULT_SETTINGS, T0, () => new Map(), {
      ...snapshot,
      usedHalfHalf: true,
      usedVisualHint: true,
      hidden: [1, 2],
    });

    expect(state.usedHalfHalf).toBe(true);
    expect(state.usedVisualHint).toBe(true);
    expect(state.hidden).toEqual([1, 2]);
  });

  it("builds a fresh question when the stored one no longer fits the settings", () => {
    // The parent moved the child up to Hard overnight: six tiles, not four.
    const state = createInitialState(
      { ...DEFAULT_SETTINGS, difficulty: "hard" },
      T0,
      () => new Map(),
      snapshot,
    );

    expect(state.question.options).toHaveLength(6);
  });

  it("keeps the restored question when settings arrive from the server", () => {
    // The synced profile's settings land a moment after boot. Identical values
    // through a different object used to rebuild the question and hand the
    // child an easier one — the reload dodge by another route.
    const state = createInitialState(DEFAULT_SETTINGS, T0, () => new Map(), snapshot);
    const applied = gameReducer(state, {
      type: "applySettings",
      settings: { ...DEFAULT_SETTINGS },
      now: T0 + 800,
      getStats: () => new Map(),
    });

    expect(applied.question).toEqual(stored);
    expect(applied.questionId).toBe(state.questionId);
  });

  it("leaves the question alone when only the sound changes", () => {
    const state = fresh();
    const applied = gameReducer(state, {
      type: "applySettings",
      settings: { ...DEFAULT_SETTINGS, soundEnabled: false },
      now: T0 + 5000,
      getStats: () => new Map(),
    });

    expect(applied.question).toBe(state.question);
    expect(applied.settings.soundEnabled).toBe(false);
  });

  it("comes back finished when the session had already ended", () => {
    const state = createInitialState(DEFAULT_SETTINGS, T0, () => new Map(), {
      ...snapshot,
      won: true,
      lost: false,
    });

    expect(state.phase).toBe("finished");
    expect(state.won).toBe(true);
  });

  it("starts clean with nothing stored", () => {
    expect(fresh().score.rawPoints).toBe(0);
  });
});
