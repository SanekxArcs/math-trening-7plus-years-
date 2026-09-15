import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  DEFAULT_SETTINGS,
  INITIAL_SCORE,
  applyAttempt,
  clampAttemptMs,
  defaultRng,
  factId,
  halfHalfRemoves,
  isGoalReached,
  nextQuestion,
  randInt,
  type FactStat,
  type GameSettings,
  type Question,
  type ScoreState,
} from "@/engine";

/** Supplies what the child already knows, read at the moment a question is made. */
export type StatsSource = () => ReadonlyMap<string, FactStat>;

const NO_STATS: StatsSource = () => new Map();

/** How long the right answer stays on screen before the next question. */
export const REVEAL_MS = 1100;
export const TIMEOUT_REVEAL_MS = 1700;

export interface AttemptRecord {
  clientId: string;
  op: string;
  a: number;
  b: number;
  /** Canonical table cell; see Problem.factA. */
  factA: number;
  factB: number;
  prompt: string;
  answer: number;
  given: number | null;
  isCorrect: boolean;
  mode: "choice" | "type";
  optionsShown: number[];
  ms: number;
  usedHalfHalf: boolean;
  usedVisualHint: boolean;
  comboAt: number;
  pointsDelta: number;
  difficulty: string;
  createdAt: number;
}

export interface Outcome {
  isCorrect: boolean;
  given: number | null;
  delta: number;
  multiplier: number;
  tierUp: boolean;
  tierDown: boolean;
  timedOut: boolean;
}

export interface GameState {
  settings: GameSettings;
  question: Question;
  /** Bumped for every new question; used as the key that owns all timers. */
  questionId: number;
  askedAt: number;
  score: ScoreState;
  phase: "asking" | "revealed" | "finished";
  outcome: Outcome | null;
  /** Option indices removed by 50:50. */
  hidden: number[];
  usedHalfHalf: boolean;
  usedVisualHint: boolean;
  /** Epoch ms at which 50:50 becomes available again. */
  halfHalfReadyAt: number;
  typed: string;
  won: boolean;
  /** The session was ended on purpose rather than by reaching the goal. */
  stopped: boolean;
  /**
   * Every reason the clock is currently stopped. A set rather than a boolean
   * because two owners — the pause button and the tab going away — must not be
   * able to un-pause each other's pause.
   */
  pausedBy: PauseReason[];
  /** Derived from `pausedBy`; what the UI and the countdown read. */
  paused: boolean;
  /** Epoch ms the pause began, so the time away can be handed back. */
  pausedAt: number | null;
  /** Drained by the persistence effect, never read by the UI. */
  pending: AttemptRecord[];
}

/** Who stopped the clock. */
export type PauseReason = "manual" | "away";

type Action =
  | { type: "answer"; value: number; now: number }
  | { type: "timeout"; now: number }
  | { type: "next"; now: number; getStats: StatsSource }
  | { type: "halfHalf"; now: number }
  | { type: "visualHint" }
  | { type: "typeDigit"; digit: string }
  | { type: "backspace" }
  | { type: "pause"; reason: PauseReason; value: boolean; now: number }
  | { type: "stop" }
  | { type: "applySettings"; settings: GameSettings; now: number; getStats: StatsSource }
  | { type: "restart"; now: number; getStats: StatsSource }
  | { type: "drain" };

function freshQuestion(
  settings: GameSettings,
  state: Partial<GameState>,
  now: number,
  getStats: StatsSource,
) {
  const previous = state.question?.problem;
  return {
    question: nextQuestion(settings, defaultRng, {
      stats: getStats(),
      now,
      // Never ask the same cell twice running, however weak it is.
      avoid: previous
        ? factId(previous.op, previous.factA, previous.factB, settings.difficulty)
        : undefined,
    }),
    questionId: (state.questionId ?? 0) + 1,
    askedAt: now,
    phase: "asking" as const,
    outcome: null,
    hidden: [],
    usedHalfHalf: false,
    usedVisualHint: false,
    typed: "",
  };
}

/**
 * What is worth carrying across a reload: the points, the streaks and the
 * lifeline cooldown. The question on screen is not — a fresh one is no loss,
 * and rebuilding it is how a reload stays cheap.
 */
export interface SessionSnapshot {
  score: ScoreState;
  won: boolean;
  stopped: boolean;
  halfHalfReadyAt: number;
  /** Epoch ms, so whoever restores it can decide the session is too old. */
  savedAt: number;
}

export function createInitialState(
  settings: GameSettings = DEFAULT_SETTINGS,
  now: number = Date.now(),
  getStats: StatsSource = NO_STATS,
  resume: SessionSnapshot | null = null,
): GameState {
  const state: GameState = {
    settings,
    score: resume?.score ?? INITIAL_SCORE,
    won: resume?.won ?? false,
    stopped: resume?.stopped ?? false,
    pausedBy: [],
    paused: false,
    pausedAt: null,
    pending: [],
    // Restored too, so reloading the page is not a way to skip the wait.
    halfHalfReadyAt: resume?.halfHalfReadyAt ?? 0,
    ...freshQuestion(settings, {}, now, getStats),
  };

  // A session that had already ended comes back ended, showing the same summary
  // it was showing before — rather than silently resuming above the goal, where
  // the next right answer would fire the win a second time.
  return state.won || state.stopped ? { ...state, phase: "finished" } : state;
}

function settle(
  state: GameState,
  given: number | null,
  timedOut: boolean,
  now: number,
): GameState {
  const { problem, options, mode } = state.question;
  const isCorrect = !timedOut && given === problem.answer;

  // Time spent with the game paused was already handed back by shifting
  // `askedAt` forward, and the cap catches everything that was not a pause.
  const elapsed = clampAttemptMs(now - state.askedAt);
  const fast =
    isCorrect &&
    state.settings.timerEnabled &&
    elapsed < (state.settings.timerSec * 1000) / 2;

  const result = applyAttempt(state.score, {
    isCorrect,
    difficulty: state.settings.difficulty,
    usedHalfHalf: state.usedHalfHalf,
    usedVisualHint: state.usedVisualHint,
    fast,
  });

  const record: AttemptRecord = {
    clientId: crypto.randomUUID(),
    op: problem.op,
    a: problem.a,
    b: problem.b,
    factA: problem.factA,
    factB: problem.factB,
    prompt: problem.prompt,
    answer: problem.answer,
    given,
    isCorrect,
    mode,
    optionsShown: options,
    ms: elapsed,
    usedHalfHalf: state.usedHalfHalf,
    usedVisualHint: state.usedVisualHint,
    comboAt: state.score.goodStreak,
    pointsDelta: result.delta,
    difficulty: state.settings.difficulty,
    createdAt: now,
  };

  const won = isGoalReached(result.state, state.settings);

  return {
    ...state,
    score: result.state,
    phase: won ? "finished" : "revealed",
    won,
    outcome: {
      isCorrect,
      given,
      delta: result.delta,
      multiplier: result.multiplier,
      tierUp: result.tierUp,
      tierDown: result.tierDown,
      timedOut,
    },
    pending: [...state.pending, record],
  };
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "answer":
      // Paused is not merely a visual state: an answer that arrives while the
      // clock is stopped — a stray tap behind the dialog, a queued event from
      // before the tab was hidden — is not one the child gave to a question
      // they were looking at.
      if (state.phase !== "asking" || state.paused) return state;
      return settle(state, action.value, false, action.now);

    case "timeout":
      if (state.phase !== "asking" || state.paused) return state;
      return settle(state, null, true, action.now);

    case "next":
      if (state.phase === "finished") return state;
      return {
        ...state,
        ...freshQuestion(state.settings, state, action.now, action.getStats),
      };

    case "halfHalf": {
      if (state.phase !== "asking") return state;
      if (state.usedHalfHalf || action.now < state.halfHalfReadyAt) return state;

      const removeCount = halfHalfRemoves(state.settings.difficulty);
      if (removeCount <= 0) return state;

      const wrongIndices = state.question.options
        .map((value, index) => ({ value, index }))
        .filter(({ value }) => value !== state.question.problem.answer)
        .map(({ index }) => index);

      // Partial Fisher-Yates. The old version looped `while (toHide.length < 2)`
      // picking at random, which spins forever the moment there are fewer than
      // two wrong options to find.
      for (let i = wrongIndices.length - 1; i > 0; i--) {
        const j = randInt(defaultRng, 0, i);
        const swap = wrongIndices[i] as number;
        wrongIndices[i] = wrongIndices[j] as number;
        wrongIndices[j] = swap;
      }

      return {
        ...state,
        hidden: wrongIndices.slice(0, removeCount),
        usedHalfHalf: true,
        halfHalfReadyAt: action.now + state.settings.halfHalfCooldownSec * 1000,
      };
    }

    case "visualHint":
      return state.usedVisualHint ? state : { ...state, usedVisualHint: true };

    case "typeDigit": {
      if (state.phase !== "asking") return state;
      if (state.typed.length >= 4) return state;
      if (state.typed === "0") return { ...state, typed: action.digit };
      return { ...state, typed: state.typed + action.digit };
    }

    case "backspace":
      return { ...state, typed: state.typed.slice(0, -1) };

    case "pause": {
      // Identity-stable when nothing changes, so a caller that dispatches this
      // from an effect on every render cannot spin.
      const held = state.pausedBy.includes(action.reason);
      if (held === action.value) return state;

      const pausedBy = action.value
        ? [...state.pausedBy, action.reason]
        : state.pausedBy.filter((reason) => reason !== action.reason);
      const paused = pausedBy.length > 0;

      // Still paused for some other reason; nothing to settle up.
      if (paused === state.paused) return { ...state, pausedBy };

      if (paused) return { ...state, pausedBy, paused: true, pausedAt: action.now };

      /**
       * Resuming. The question is given back exactly the time the game was
       * away by moving its start forward, which fixes the recorded response
       * time and the countdown in one move — a child who left a 10-second
       * timer at 6 seconds comes back to 6 seconds.
       *
       * Capped at `now`: a settings change or a restart can build a fresh
       * question while the pause is still running, and without this its start
       * would land in the future and the next answer would be recorded as
       * instant — an undeserved speed credit against a fact they never saw.
       */
      const away = state.pausedAt === null ? 0 : Math.max(0, action.now - state.pausedAt);
      return {
        ...state,
        pausedBy,
        paused: false,
        pausedAt: null,
        askedAt: Math.min(action.now, state.askedAt + away),
      };
    }

    /**
     * Ending a session deliberately. The question on screen is abandoned, not
     * answered: it is recorded as nothing at all, because a child who stops to
     * eat lunch has not got it wrong.
     */
    case "stop":
      if (state.phase === "finished") return state;
      return {
        ...state,
        phase: "finished",
        stopped: true,
        pausedBy: [],
        paused: false,
        pausedAt: null,
      };

    case "applySettings": {
      // Difficulty or operations changing mid-question would leave stale tiles
      // on screen, so a settings change always starts a clean round.
      return {
        ...state,
        settings: action.settings,
        ...freshQuestion(action.settings, state, action.now, action.getStats),
      };
    }

    case "restart":
      return {
        ...state,
        score: INITIAL_SCORE,
        won: false,
        stopped: false,
        pausedBy: [],
        paused: false,
        pausedAt: null,
        halfHalfReadyAt: 0,
        ...freshQuestion(state.settings, state, action.now, action.getStats),
      };

    case "drain":
      return state.pending.length === 0 ? state : { ...state, pending: [] };
  }
}

export interface UseGameOptions {
  settings: GameSettings;
  onAttempt?: (records: AttemptRecord[]) => void;
  /** A session to carry on from, read once at mount and ignored afterwards. */
  resume?: SessionSnapshot | null;
  /** Called whenever the score changes, for whoever stores it. */
  onSessionChange?: (snapshot: SessionSnapshot) => void;
  /**
   * Read synchronously whenever a question is built. A getter rather than a
   * value because the map is mutated in place as answers land, and the reducer
   * needs whatever is current at that instant.
   */
  getStats?: StatsSource;
}

export function useGame({
  settings,
  onAttempt,
  getStats = NO_STATS,
  resume = null,
  onSessionChange,
}: UseGameOptions) {
  const statsRef = useRef(getStats);
  statsRef.current = getStats;
  const readStats = useCallback<StatsSource>(() => statsRef.current(), []);

  const [state, dispatch] = useReducer(
    gameReducer,
    settings,
    // `resume` is read here and nowhere else: the initializer runs once, so a
    // stale snapshot arriving later can never overwrite live play.
    (initial: GameSettings) => createInitialState(initial, Date.now(), readStats, resume),
  );

  // Settings arriving from the parent dashboard (or from local storage on boot)
  // are pushed in as an action rather than held in two places. The ref tracks
  // what has already been applied, so this never reads state it does not
  // declare as a dependency.
  const appliedSettings = useRef(settings);
  useEffect(() => {
    if (appliedSettings.current === settings) return;
    appliedSettings.current = settings;
    dispatch({ type: "applySettings", settings, now: Date.now(), getStats: readStats });
  }, [settings, appliedSettings, readStats]);

  /**
   * One owner for the advance-to-next-question timer, keyed on the question and
   * phase. React tears it down whenever either changes, so a settings save or a
   * restart during the reveal window can never leave a stale timeout behind to
   * skip the following question — the bug that made the old version flash
   * questions past the player.
   */
  useEffect(() => {
    if (state.phase !== "revealed") return;
    // Paused counts as away: the next question waits rather than being asked to
    // an empty room and starting its clock there.
    if (state.paused) return;
    const delay = state.outcome?.timedOut ? TIMEOUT_REVEAL_MS : REVEAL_MS;
    const id = window.setTimeout(
      () => dispatch({ type: "next", now: Date.now(), getStats: readStats }),
      delay,
    );
    return () => window.clearTimeout(id);
  }, [state.phase, state.questionId, state.paused, state.outcome?.timedOut, readStats]);

  /**
   * The countdown. Paused while a dialog is open, so the clock cannot run out
   * behind the settings sheet and charge the child for a wrong answer they
   * never saw.
   */
  useEffect(() => {
    if (!state.settings.timerEnabled) return;
    if (state.phase !== "asking") return;
    if (state.paused) return;

    const deadline = state.askedAt + state.settings.timerSec * 1000;
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      dispatch({ type: "timeout", now: Date.now() });
      return;
    }

    const id = window.setTimeout(
      () => dispatch({ type: "timeout", now: Date.now() }),
      remaining,
    );
    return () => window.clearTimeout(id);
  }, [
    state.questionId,
    state.phase,
    state.paused,
    state.askedAt,
    state.settings.timerEnabled,
    state.settings.timerSec,
  ]);

  /**
   * The pause nobody presses.
   *
   * A child does not tap "pause" before wandering off — they switch apps, or
   * the tablet sleeps. Without this the countdown would expire unseen and
   * charge them for a wrong answer they never saw, and the question they left
   * would come back recorded as a twenty-minute answer.
   */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () =>
      dispatch({
        type: "pause",
        reason: "away",
        value: document.visibilityState === "hidden",
        now: Date.now(),
      });

    document.addEventListener("visibilitychange", sync);
    // Covers the case where the app is restored into a hidden tab.
    sync();
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  /**
   * Keep the stored session in step with the score.
   *
   * Written on every change rather than on unload, because a tab that is killed
   * — the browser reclaiming memory on a tablet, a crash, a force-quit — never
   * gets an unload event, and that is exactly the case this is here for.
   */
  useEffect(() => {
    onSessionChange?.({
      score: state.score,
      won: state.won,
      stopped: state.stopped,
      halfHalfReadyAt: state.halfHalfReadyAt,
      savedAt: Date.now(),
    });
  }, [state.score, state.won, state.stopped, state.halfHalfReadyAt, onSessionChange]);

  // Hand finished attempts to whoever persists them, then clear the queue.
  useEffect(() => {
    if (state.pending.length === 0) return;
    onAttempt?.(state.pending);
    dispatch({ type: "drain" });
  }, [state.pending, onAttempt]);

  const answer = useCallback(
    (value: number) => dispatch({ type: "answer", value, now: Date.now() }),
    [],
  );
  const submitTyped = useCallback(() => {
    dispatch({ type: "answer", value: Number(state.typed), now: Date.now() });
  }, [state.typed]);

  return {
    state,
    answer,
    submitTyped,
    typeDigit: useCallback((digit: string) => dispatch({ type: "typeDigit", digit }), []),
    backspace: useCallback(() => dispatch({ type: "backspace" }), []),
    useHalfHalf: useCallback(() => dispatch({ type: "halfHalf", now: Date.now() }), []),
    useVisualHint: useCallback(() => dispatch({ type: "visualHint" }), []),
    pause: useCallback(
      () => dispatch({ type: "pause", reason: "manual", value: true, now: Date.now() }),
      [],
    ),
    resume: useCallback(
      () => dispatch({ type: "pause", reason: "manual", value: false, now: Date.now() }),
      [],
    ),
    stop: useCallback(() => dispatch({ type: "stop" }), []),
    restart: useCallback(
      () => dispatch({ type: "restart", now: Date.now(), getStats: readStats }),
      [readStats],
    ),
  };
}
