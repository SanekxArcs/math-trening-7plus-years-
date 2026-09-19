import { useCallback, useState } from "react";
import type { HintModel, Op, Problem, Question, ScoreState } from "@/engine";
import type { SessionSnapshot } from "./useGame";

const KEY = "math_master_session";

/**
 * How long a session is worth coming back to.
 *
 * This exists for the refresh, the accidental back-swipe and the browser that
 * reloads itself while the tablet is asleep — not for "carry on with
 * yesterday's points". A gap longer than this and the child gets a clean start,
 * which is what they expect when they sit down to play again.
 */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

const OPS: readonly string[] = ["add", "sub", "mul", "div"];

function isNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function num(value: unknown, fallback = 0): number {
  return isNum(value) ? value : fallback;
}

function fields(raw: unknown): Record<string, unknown> | null {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : null;
}

/**
 * Strict where the score is forgiving.
 *
 * A missing streak can safely become 0, but a half-read question is not a
 * question: a dropped option or a wrong answer field would leave the child
 * staring at something they cannot get right. Anything short of complete comes
 * back as null, and the game builds a fresh question instead.
 */
function toNumbers(raw: unknown): number[] | null {
  return Array.isArray(raw) && raw.every(isNum) ? (raw as number[]) : null;
}

function toHint(raw: unknown): HintModel | null {
  const source = fields(raw);
  if (!source || !isNum(source.groups) || !isNum(source.perGroup)) return null;
  return { groups: source.groups, perGroup: source.perGroup };
}

function toProblem(raw: unknown): Problem | null {
  const source = fields(raw);
  if (!source) return null;
  if (typeof source.op !== "string" || !OPS.includes(source.op)) return null;
  if (typeof source.prompt !== "string" || source.prompt === "") return null;
  if (![source.a, source.b, source.factA, source.factB, source.answer].every(isNum)) {
    return null;
  }

  return {
    op: source.op as Op,
    a: source.a as number,
    b: source.b as number,
    factA: source.factA as number,
    factB: source.factB as number,
    prompt: source.prompt,
    answer: source.answer as number,
    hint: toHint(source.hint),
  };
}

function toQuestion(raw: unknown): Question | null {
  const source = fields(raw);
  if (!source) return null;
  if (source.mode !== "choice" && source.mode !== "type") return null;

  const problem = toProblem(source.problem);
  const options = toNumbers(source.options);
  if (!problem || !options) return null;

  return { problem, options, mode: source.mode };
}

/**
 * Rebuilds a score from whatever is in storage. Every field is taken
 * defensively: this data is a year older than the code reading it in the worst
 * case, and a missing field must cost the child their streak, not the app.
 */
function toScore(raw: unknown): ScoreState {
  const source = fields(raw) ?? {};
  return {
    rawPoints: num(source.rawPoints),
    goodStreak: num(source.goodStreak),
    badStreak: num(source.badStreak),
    bestStreak: num(source.bestStreak),
    correct: num(source.correct),
    wrong: num(source.wrong),
  };
}

export function readSession(now: number = Date.now()): SessionSnapshot | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;

    const source = parsed as Record<string, unknown>;
    const savedAt = num(source.savedAt);
    if (savedAt <= 0 || now - savedAt > MAX_AGE_MS) return null;

    const question = toQuestion(source.question);

    return {
      score: toScore(source.score),
      won: source.won === true,
      stopped: source.stopped === true,
      halfHalfReadyAt: num(source.halfHalfReadyAt),
      question,
      // Tied to the question: without one there is nothing for a spent lifeline
      // or a removed tile to apply to, and carrying them would hide the next
      // question's options.
      usedHalfHalf: question !== null && source.usedHalfHalf === true,
      usedVisualHint: question !== null && source.usedVisualHint === true,
      hidden: question === null ? [] : (toNumbers(source.hidden) ?? []),
      savedAt,
    };
  } catch {
    return null;
  }
}

export function writeSession(snapshot: SessionSnapshot): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // Private mode or a full quota. Losing the resume is better than crashing.
  }
}

/**
 * The session that survives a reload.
 *
 * Read once, synchronously, at first render: the score and the question have to
 * be there in the very first frame, or the child sees a zero flash past before
 * their points come back — which reads as "it lost them" even when it did not.
 */
export function useLocalSession() {
  const [resume] = useState(() => readSession());
  const save = useCallback((snapshot: SessionSnapshot) => writeSession(snapshot), []);
  return [resume, save] as const;
}
