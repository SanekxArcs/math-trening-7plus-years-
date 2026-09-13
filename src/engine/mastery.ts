import { randInt, type Rng } from "./rng.ts";
import type { Difficulty, GameSettings, Op } from "./types.ts";

/**
 * What the app knows about one fact, for one difficulty.
 *
 * A "fact" is a single cell of a times table: `mul:7:8`. Tracking these rather
 * than a per-operation percentage is what lets the app stop asking 2×2 and keep
 * asking 7×8 — which is the entire point of practising.
 */
export interface FactStat {
  attempts: number;
  correct: number;
  /** Sum of response times, for the average shown in the dashboard grid. */
  totalMs: number;
  /** Fastest correct answer, which is the better signal of real recall. */
  bestMs: number;
  /** 0..1 as measured at `lastSeenAt`; decays from there. See `strengthNow`. */
  strength: number;
  lastSeenAt: number;
}

export const EMPTY_FACT: FactStat = {
  attempts: 0,
  correct: 0,
  totalMs: 0,
  bestMs: 0,
  strength: 0,
  lastSeenAt: 0,
};

/**
 * Answering inside this is "fluent" for the difficulty; twice it earns nothing
 * for speed. Expert is slower because the answer has to be typed, and Easy is
 * quicker because two tiles can be scanned at a glance.
 */
export const FLUENT_MS: Record<Difficulty, number> = {
  easy: 3500,
  medium: 4500,
  hard: 5500,
  expert: 7000,
};

/**
 * Knowledge fades. Without this, a fact drilled once in March would count as
 * known in September and never come back round.
 */
export const HALF_LIFE_DAYS = 21;

const DAY_MS = 86_400_000;

/** Stable id for a fact at a difficulty: `mul:7:8:medium`. */
export function factId(op: Op, a: number, b: number, difficulty: Difficulty): string {
  return `${op}:${a}:${b}:${difficulty}`;
}

export function parseFactId(id: string): {
  op: Op;
  a: number;
  b: number;
  difficulty: Difficulty;
} | null {
  const [op, a, b, difficulty] = id.split(":");
  if (!op || !a || !b || !difficulty) return null;
  return {
    op: op as Op,
    a: Number(a),
    b: Number(b),
    difficulty: difficulty as Difficulty,
  };
}

export interface FactOutcome {
  isCorrect: boolean;
  ms: number;
  difficulty: Difficulty;
  /** True when 50:50 or the picture hint was used — they did not do it alone. */
  aided: boolean;
}

/**
 * Folds one answer into a fact's record.
 *
 * Gains are asymptotic, so strength approaches 1 without ever quite arriving —
 * there is no point at which the app decides a child is finished with a fact.
 * A mistake costs far more than a single correct answer earns, because one
 * confident wrong answer says more about what they know than one right one.
 */
export function updateFact(stat: FactStat, outcome: FactOutcome, now: number): FactStat {
  const base = strengthNow(stat, now);

  const next: FactStat = {
    attempts: stat.attempts + 1,
    correct: stat.correct + (outcome.isCorrect ? 1 : 0),
    totalMs: stat.totalMs + outcome.ms,
    bestMs:
      outcome.isCorrect && (stat.bestMs === 0 || outcome.ms < stat.bestMs)
        ? outcome.ms
        : stat.bestMs,
    strength: base,
    lastSeenAt: now,
  };

  if (!outcome.isCorrect) {
    next.strength = base * 0.4;
    return next;
  }

  const fluent = FLUENT_MS[outcome.difficulty];
  // 1 when instant, 0 at twice the fluent time. Clamped, so a child who wandered
  // off mid-question is not punished beyond "no speed credit".
  const speed = Math.max(0, Math.min(1, 1 - outcome.ms / (2 * fluent)));

  // Deliberately unhurried: three quick correct answers should read as "getting
  // there", not "knows it". Fluency is the thing being measured, and fluency is
  // built from repetition spread over days, not from one good minute.
  let gain = 0.1 + 0.18 * speed;
  // Getting there with a lifeline is worth something, but not full credit.
  if (outcome.aided) gain *= 0.4;

  next.strength = base + gain * (1 - base);
  return next;
}

/** Strength decayed to `now`. Everything that reads strength goes through this. */
export function strengthNow(stat: FactStat, now: number): number {
  if (stat.attempts === 0 || stat.lastSeenAt === 0) return 0;
  const days = Math.max(0, (now - stat.lastSeenAt) / DAY_MS);
  return stat.strength * Math.pow(0.5, days / HALF_LIFE_DAYS);
}

export type MasteryBand = "unseen" | "learning" | "practising" | "known";

export function masteryBand(stat: FactStat | undefined, now: number): MasteryBand {
  if (!stat || stat.attempts === 0) return "unseen";
  const strength = strengthNow(stat, now);
  if (strength < 0.45) return "learning";
  if (strength < 0.7) return "practising";
  return "known";
}

/**
 * How much a fact deserves to be asked. Squared, so a half-learned fact is
 * picked roughly four times as often as a nearly-known one.
 *
 * The floor is deliberate and never zero: a fact the child has mastered still
 * comes round occasionally, which is what stops "learned" quietly becoming
 * "forgotten" between one term and the next.
 */
export const WEIGHT_FLOOR = 0.015;

/**
 * A fact the child has actually got wrong outranks one they have never been
 * asked. Without this multiplier the two weigh the same, and in a table of
 * sixty-odd unseen cells a known mistake comes back about one time in sixty —
 * which is the exact opposite of practising what needs practising.
 */
const ATTEMPTED_PRIORITY = 2.2;

/**
 * Standing of a fact that has never been asked. Sits between "shaky" and
 * "getting there", so new material is introduced steadily without crowding out
 * the mistakes the child has already made.
 */
export const UNSEEN_WEIGHT = 1;

export function selectionWeight(stat: FactStat | undefined, now: number): number {
  if (!stat || stat.attempts === 0) return UNSEEN_WEIGHT;
  const gap = 1 - strengthNow(stat, now);
  return gap * gap * ATTEMPTED_PRIORITY + WEIGHT_FLOOR;
}

/** A fact to ask, in canonical (not necessarily displayed) operand order. */
export interface FactChoice {
  op: Op;
  a: number;
  b: number;
}

/**
 * Tables up to this many cells are considered in full; anything larger is
 * sampled. 9x9 is 81 and 12x12 is 144, so in practice every real configuration
 * gets the exact treatment and sampling is only a guard against someone setting
 * both limits to 100.
 */
const ENUMERATE_LIMIT = 900;

/** Candidates drawn per question once the table is too large to enumerate. */
const SAMPLE_SIZE = 24;

export interface PickOptions {
  /** Fact id of the previous question, so the same one is not asked twice running. */
  avoid?: string | undefined;
}

/**
 * Chooses the next fact, biased towards what the child does not know.
 *
 * Every cell of the table is weighed, so a single weak fact among sixty-three
 * mastered ones is still found about half the time — sampling a handful of
 * candidates instead capped that at the odds of the weak fact appearing in the
 * sample at all, which is roughly one in five. Absurd limits (100 x 100) fall
 * back to sampling so the work per question stays bounded.
 */
export function pickFact(
  settings: GameSettings,
  stats: ReadonlyMap<string, FactStat>,
  rng: Rng,
  now: number,
  options: PickOptions = {},
): FactChoice {
  const ops = settings.ops.length > 0 ? settings.ops : (["add"] as Op[]);
  const min = settings.includeZeroOne ? 0 : 2;
  const max1 = Math.max(min, Math.floor(settings.limit1));
  const max2 = Math.max(min, Math.floor(settings.limit2));

  const span1 = max1 - min + 1;
  const span2 = max2 - min + 1;
  const cells = ops.length * span1 * span2;

  const canonical = (op: Op, a: number, b: number): FactChoice => {
    // Match what the problem builder will display, so the id we weigh is the id
    // the answer will be recorded under.
    if (op === "sub" && a < b) return { op, a: b, b: a };
    if (op === "div" && b === 0) return { op, a, b: 1 };
    return { op, a, b };
  };

  const candidates: FactChoice[] = [];

  if (cells <= ENUMERATE_LIMIT) {
    for (const op of ops) {
      for (let a = min; a <= max1; a++) {
        for (let b = min; b <= max2; b++) candidates.push(canonical(op, a, b));
      }
    }
  } else {
    for (let i = 0; i < SAMPLE_SIZE; i++) {
      candidates.push(
        canonical(
          ops[randInt(rng, 0, ops.length - 1)] as Op,
          randInt(rng, min, max1),
          randInt(rng, min, max2),
        ),
      );
    }
  }

  // Weighted draw rather than "take the weakest": always picking the single
  // worst fact would drill one cell into the ground and make the next question
  // predictable. Proportional selection keeps the bias without the rut.
  let total = 0;
  const weights = candidates.map((candidate) => {
    const id = factId(candidate.op, candidate.a, candidate.b, settings.difficulty);
    const weight = options.avoid === id ? 0 : selectionWeight(stats.get(id), now);
    total += weight;
    return weight;
  });

  // Everything was excluded — only possible when the table has a single cell.
  if (total <= 0) return candidates[0] ?? { op: ops[0] as Op, a: min, b: min };

  let ticket = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    ticket -= weights[i] as number;
    if (ticket <= 0) return candidates[i] as FactChoice;
  }
  return candidates[candidates.length - 1] as FactChoice;
}
