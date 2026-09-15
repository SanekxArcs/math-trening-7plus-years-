import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, goalForLevel, hasNextLevel, settingsForLevel } from "./index.ts";

describe("levels", () => {
  it("asks for half again as many points each time, in round numbers", () => {
    expect(goalForLevel(200, 1)).toBe(200);
    expect(goalForLevel(200, 2)).toBe(300);
    expect(goalForLevel(200, 3)).toBe(450);
    expect(goalForLevel(200, 4)).toBe(680);
  });

  it("stops at the ceiling the dashboard can set", () => {
    expect(goalForLevel(200, 40)).toBe(10000);
    expect(hasNextLevel({ ...DEFAULT_SETTINGS, goalTarget: 10000 }, 1)).toBe(false);
    expect(hasNextLevel(DEFAULT_SETTINGS, 1)).toBe(true);
  });

  it("changes the target and nothing else", () => {
    const leveled = settingsForLevel(DEFAULT_SETTINGS, 3);

    expect(leveled.goalTarget).toBe(450);
    expect({ ...leveled, goalTarget: DEFAULT_SETTINGS.goalTarget }).toEqual(DEFAULT_SETTINGS);
  });

  it("hands back the very same settings at level 1", () => {
    // Identity matters: the game reads a new settings object as a settings
    // change and starts a fresh round, so level 1 must not build one.
    expect(settingsForLevel(DEFAULT_SETTINGS, 1)).toBe(DEFAULT_SETTINGS);
  });

  it("has no levels at all when the goal is switched off", () => {
    const noGoal = { ...DEFAULT_SETTINGS, goalEnabled: false };
    expect(settingsForLevel(noGoal, 5)).toBe(noGoal);
    expect(hasNextLevel(noGoal, 1)).toBe(false);
  });
});
