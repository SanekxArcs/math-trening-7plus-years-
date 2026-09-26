import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  INITIAL_SCORE,
  goalForLevel,
  hasNextLevel,
  isGameLost,
  lossLimit,
  settingsForLevel,
} from "./index.ts";

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

describe("losing", () => {
  const settings = { ...DEFAULT_SETTINGS, goalEnabled: true, goalTarget: 300 };
  const score = (rawPoints: number) => ({ ...INITIAL_SCORE, rawPoints });

  it("is lost at minus a quarter of the goal", () => {
    expect(lossLimit(300)).toBe(75);
    expect(isGameLost(score(-74), settings)).toBe(false);
    expect(isGameLost(score(-75), settings)).toBe(true);
    expect(isGameLost(score(-120), settings)).toBe(true);
  });

  it("never loses the game on a single first mistake, however small the goal", () => {
    // A quarter of 20 is 5, less than the first penalty of 10.
    expect(lossLimit(20)).toBe(11);
    expect(isGameLost(score(-10), { ...settings, goalTarget: 20 })).toBe(false);
  });

  it("cannot be lost without a goal", () => {
    expect(isGameLost(score(-9999), { ...settings, goalEnabled: false })).toBe(false);
  });
});
