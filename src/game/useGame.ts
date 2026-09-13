import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  DEFAULT_SETTINGS,
  INITIAL_SCORE,
  applyAttempt,
  defaultRng,
  halfHalfRemoves,
  isGoalReached,
  nextQuestion,
  randInt,
  type GameSettings,
  type Question,
  type ScoreState,
} from "@/engine";

/** How long the right answer stays on screen before the next question. */
export const REVEAL_MS = 1100;
export const TIMEOUT_REVEAL_MS = 1700;

export interface AttemptRecord {
  clientId: string;
  op: string;
  a: number;
  b: number;
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
  /** True while any dialog is open — freezes the countdown. */
  paused: boolean;
  /** Drained by the persistence effect, never read by the UI. */
  pending: AttemptRecord[];
}

type Action =
  | { type: "answer"; value: number; now: number }
  | { type: "timeout"; now: number }
  | { type: "next"; now: number }
  | { type: "halfHalf"; now: number }
  | { type: "visualHint" }
  | { type: "typeDigit"; digit: string }
  | { type: "backspace" }
  | { type: "pause"; value: boolean }
  | { type: "applySettings"; settings: GameSettings; now: number }
  | { type: "restart"; now: number }
  | { type: "drain" };

function freshQuestion(settings: GameSettings, state: Partial<GameState>, now: number) {
  return {
    question: nextQuestion(settings, defaultRng),
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

export function createInitialState(
  settings: GameSettings = DEFAULT_SETTINGS,
  now: number = Date.now(),
): GameState {
  return {
    settings,
    score: INITIAL_SCORE,
    won: false,
    paused: false,
    pending: [],
    halfHalfReadyAt: 0,
    ...freshQuestion(settings, {}, now),
  };
}

function settle(
  state: GameState,
  given: number | null,
  timedOut: boolean,
  now: number,
): GameState {
  const { problem, options, mode } = state.question;
  const isCorrect = !timedOut && given === problem.answer;

  const elapsed = now - state.askedAt;
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
      if (state.phase !== "asking") return state;
      return settle(state, action.value, false, action.now);

    case "timeout":
      if (state.phase !== "asking") return state;
      return settle(state, null, true, action.now);

    case "next":
      if (state.phase === "finished") return state;
      return { ...state, ...freshQuestion(state.settings, state, action.now) };

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

    case "pause":
      // Identity-stable when nothing changes, so a caller that dispatches this
      // from an effect on every render cannot spin.
      return state.paused === action.value ? state : { ...state, paused: action.value };

    case "applySettings": {
      // Difficulty or operations changing mid-question would leave stale tiles
      // on screen, so a settings change always starts a clean round.
      return {
        ...state,
        settings: action.settings,
        ...freshQuestion(action.settings, state, action.now),
      };
    }

    case "restart":
      return {
        ...state,
        score: INITIAL_SCORE,
        won: false,
        halfHalfReadyAt: 0,
        ...freshQuestion(state.settings, state, action.now),
      };

    case "drain":
      return state.pending.length === 0 ? state : { ...state, pending: [] };
  }
}

export interface UseGameOptions {
  settings: GameSettings;
  onAttempt?: (records: AttemptRecord[]) => void;
}

export function useGame({ settings, onAttempt }: UseGameOptions) {
  const [state, dispatch] = useReducer(
    gameReducer,
    settings,
    (initial: GameSettings) => createInitialState(initial),
  );

  // Settings arriving from the parent dashboard (or from local storage on boot)
  // are pushed in as an action rather than held in two places. The ref tracks
  // what has already been applied, so this never reads state it does not
  // declare as a dependency.
  const appliedSettings = useRef(settings);
  useEffect(() => {
    if (appliedSettings.current === settings) return;
    appliedSettings.current = settings;
    dispatch({ type: "applySettings", settings, now: Date.now() });
  }, [settings, appliedSettings]);

  /**
   * One owner for the advance-to-next-question timer, keyed on the question and
   * phase. React tears it down whenever either changes, so a settings save or a
   * restart during the reveal window can never leave a stale timeout behind to
   * skip the following question — the bug that made the old version flash
   * questions past the player.
   */
  useEffect(() => {
    if (state.phase !== "revealed") return;
    const delay = state.outcome?.timedOut ? TIMEOUT_REVEAL_MS : REVEAL_MS;
    const id = window.setTimeout(() => dispatch({ type: "next", now: Date.now() }), delay);
    return () => window.clearTimeout(id);
  }, [state.phase, state.questionId, state.outcome?.timedOut]);

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
    setPaused: useCallback((value: boolean) => dispatch({ type: "pause", value }), []),
    restart: useCallback(() => dispatch({ type: "restart", now: Date.now() }), []),
  };
}
