import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/engine";
import { buildSteps } from "./Onboarding";

const ids = (overrides: Partial<typeof DEFAULT_SETTINGS>) =>
  buildSteps({ ...DEFAULT_SETTINGS, ...overrides }).map((step) => step.id);

describe("the walkthrough", () => {
  it("explains the game as it is set up: timer, goal and helpers only when they are on", () => {
    const everything = ids({ timerEnabled: true, goalEnabled: true, halfHalfEnabled: true, visualHintEnabled: true });
    expect(everything).toEqual([
      "welcome", "answer", "points", "combo", "mistakes", "timer", "helpers", "levels", "pets", "bedtime", "grownups", "ready",
    ]);

    const plain = ids({ timerEnabled: false, goalEnabled: false, halfHalfEnabled: false, visualHintEnabled: false });
    expect(plain).not.toContain("timer");
    expect(plain).not.toContain("points");
    expect(plain).not.toContain("helpers");
  });

  it("talks about the keypad, not tiles, and leaves out 50:50, in expert mode", () => {
    const steps = buildSteps({ ...DEFAULT_SETTINGS, difficulty: "expert", halfHalfEnabled: true, visualHintEnabled: true });
    expect(steps.find((step) => step.id === "answer")?.body).toBe("onbAnswerBodyTyped");
    expect(steps.find((step) => step.id === "helpers")?.points?.map((point) => point.text)).toEqual(["onbHelperHint"]);
  });
});
