import type { GameSettings } from "./types.ts";
import type { ScoreState } from "./scoring.ts";

/** Each level asks for half again as many points as the one before. */
const GROWTH = 1.5;

/** The highest goal the dashboard can set, and so the highest a level can ask. */
export const MAX_GOAL = 10000;

/**
 * The goal a level plays to, rounded to a whole ten so the target on screen is
 * a number a child can read back — 450, not 449.9999999.
 */
export function goalForLevel(baseGoal: number, level: number): number {
  const steps = Math.max(0, Math.floor(level) - 1);
  // Level 1 is the parent's number exactly as they typed it. Rounding it would
  // quietly move a target a grown-up chose, and would make a small goal look
  // like it had no level above it.
  if (steps === 0) return Math.min(MAX_GOAL, baseGoal);
  const raw = baseGoal * GROWTH ** steps;
  return Math.min(MAX_GOAL, Math.round(raw / 10) * 10);
}

/**
 * The child's own progression, laid over whatever the parent configured.
 *
 * Levels only ever ask for *more* than the parent's setting, never less, and
 * they touch nothing else: the questions, the tiles and the time limit stay
 * exactly as the grown-up set them. Identity-stable at level 1, because the
 * game treats a new settings object as a settings change and starts a fresh
 * round when it sees one.
 */
export function settingsForLevel(settings: GameSettings, level: number): GameSettings {
  if (level <= 1 || !settings.goalEnabled) return settings;
  return { ...settings, goalTarget: goalForLevel(settings.goalTarget, level) };
}

/**
 * Whether there is a harder level left to offer. Once the goal has hit the
 * ceiling, the next level would play to the same target, and a "next level"
 * that changes nothing is a promise the game does not keep.
 */
export function hasNextLevel(settings: GameSettings, level: number): boolean {
  if (!settings.goalEnabled) return false;
  return goalForLevel(settings.goalTarget, level + 1) > goalForLevel(settings.goalTarget, level);
}

/** How far below zero a level can fall, as a share of its goal, before it is lost. */
export const LOSS_SHARE = 0.25;

/**
 * The points below zero that end the game: a quarter of the goal being
 * played to, so a bigger level can absorb a proportionally bigger bad run.
 */
export function lossLimit(goal: number): number {
  return Math.max(1, Math.ceil(goal * LOSS_SHARE));
}

/**
 * Lost: the true total has sunk to minus a quarter of the goal. The level is
 * then gone too — the child starts again from level 1. Only a game with a
 * goal can be lost; with the goal switched off there is no level to lose.
 */
export function isGameLost(score: ScoreState, settings: GameSettings): boolean {
  return settings.goalEnabled && score.rawPoints <= -lossLimit(settings.goalTarget);
}
