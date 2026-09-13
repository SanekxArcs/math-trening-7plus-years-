import { defaultRng, type Rng } from "./rng.ts";
import { answerMode, buildProblem, generateProblem } from "./problem.ts";
import { buildOptions } from "./distractors.ts";
import { pickFact, type FactStat } from "./mastery.ts";
import type { GameSettings, Question } from "./types.ts";

export * from "./types.ts";
export * from "./rng.ts";
export * from "./problem.ts";
export * from "./distractors.ts";
export * from "./scoring.ts";
export * from "./mastery.ts";

export interface NextQuestionOptions {
  /** What the child already knows, keyed by `factId`. */
  stats?: ReadonlyMap<string, FactStat> | undefined;
  now?: number | undefined;
  /** Fact id of the previous question, so it is not asked twice running. */
  avoid?: string | undefined;
}

/**
 * The one call the UI makes to get a round.
 *
 * With `stats` and `settings.adaptive`, the question is drawn towards the facts
 * the child is weakest on; without either it falls back to a uniform draw, so
 * the game still works on a fresh install with nothing recorded.
 */
export function nextQuestion(
  settings: GameSettings,
  rng: Rng = defaultRng,
  options: NextQuestionOptions = {},
): Question {
  const problem =
    settings.adaptive && options.stats
      ? buildProblem(
          pickFact(settings, options.stats, rng, options.now ?? Date.now(), {
            avoid: options.avoid,
          }),
        )
      : generateProblem(settings, rng);

  return {
    problem,
    options: buildOptions(problem, settings.difficulty, rng),
    mode: answerMode(settings.difficulty),
  };
}
