import { defaultRng, type Rng } from "./rng.ts";
import { answerMode, generateProblem } from "./problem.ts";
import { buildOptions } from "./distractors.ts";
import type { GameSettings, Question } from "./types.ts";

export * from "./types.ts";
export * from "./rng.ts";
export * from "./problem.ts";
export * from "./distractors.ts";
export * from "./scoring.ts";

/** The one call the UI makes to get a round. */
export function nextQuestion(
  settings: GameSettings,
  rng: Rng = defaultRng,
): Question {
  const problem = generateProblem(settings, rng);
  return {
    problem,
    options: buildOptions(problem, settings.difficulty, rng),
    mode: answerMode(settings.difficulty),
  };
}
