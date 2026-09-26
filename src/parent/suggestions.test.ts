import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/engine";
import { suggest, weeks, type Day, type SuggestionInput } from "./suggestions";

const NOW = new Date(2026, 8, 25, 18, 0).getTime();
const DAY = 86_400_000;

/** Fourteen days, oldest first, with this week's answers spread over its last days. */
function daily(thisWeek: { total: number; correct: number }, lastWeek = { total: 0, correct: 0 }): Day[] {
  return Array.from({ length: 14 }, (_, i) => {
    const day = new Date(NOW - (13 - i) * DAY).toISOString().slice(0, 10);
    if (i === 13) return { day, ...thisWeek };
    if (i === 6) return { day, ...lastWeek };
    return { day, total: 0, correct: 0 };
  });
}

function input(overrides: Partial<SuggestionInput> = {}): SuggestionInput {
  return {
    daily: daily({ total: 0, correct: 0 }),
    byOperation: {},
    averageMs: 3000,
    lastPlayedAt: NOW,
    settings: { ...DEFAULT_SETTINGS, difficulty: "medium", timerEnabled: false },
    now: NOW,
    ...overrides,
  };
}

const kinds = (overrides: Partial<SuggestionInput>) => suggest(input(overrides)).map((s) => s.kind);

describe("parent suggestions", () => {
  it("splits the fortnight into last week and this week", () => {
    const { previous, current } = weeks(daily({ total: 10, correct: 9 }, { total: 4, correct: 2 }));
    expect(current).toMatchObject({ total: 10, correct: 9, daysPractised: 1 });
    expect(previous.accuracy).toBe(0.5);
  });

  it("says all is well when nothing stands out", () => {
    expect(kinds({})).toEqual(["allGood"]);
  });

  it("notices a break in practice", () => {
    expect(suggest(input({ lastPlayedAt: NOW - 3 * DAY }))[0]).toMatchObject({ kind: "idle", params: { days: 3 } });
  });

  it("offers one step harder for a strong week, and one step easier for a hard one", () => {
    const strong = suggest(input({ daily: daily({ total: 40, correct: 38 }) }));
    expect(strong[0]).toMatchObject({ kind: "harder", patch: { difficulty: "hard" } });

    const tough = suggest(input({ daily: daily({ total: 30, correct: 12 }) }));
    expect(tough.find((s) => s.kind === "easier")?.patch).toEqual({ difficulty: "easy" });
  });

  it("waits for enough answers before judging", () => {
    expect(kinds({ daily: daily({ total: 8, correct: 8 }) })).toEqual(["allGood"]);
  });

  it("points at the operation clearly behind the others", () => {
    const result = suggest(
      input({
        settings: { ...DEFAULT_SETTINGS, ops: ["add", "mul"], timerEnabled: false },
        byOperation: { add: { correct: 18, total: 20 }, mul: { correct: 5, total: 20 } },
      }),
    );
    expect(result.find((s) => s.kind === "weakOp")).toMatchObject({ params: { op: "mul", accuracy: 25 }, patch: { ops: ["mul"] } });
  });

  it("offers more time when answers crowd the clock", () => {
    const result = suggest(
      input({ settings: { ...DEFAULT_SETTINGS, timerEnabled: true, timerSec: 10 }, averageMs: 8500 }),
    );
    expect(result.find((s) => s.kind === "timer")?.patch).toEqual({ timerSec: 15 });
  });
});
