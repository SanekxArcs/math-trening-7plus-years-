// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { NEW_STABLE, newPet, type Stable } from "@/engine";
import { parseStable, updateStable } from "@/game/useStable";
import { readLevel } from "@/game/useLocalLevel";

const remote = vi.hoisted(() => ({ value: undefined as unknown }));
const save = vi.hoisted(() => vi.fn(async (_args: unknown) => ({ status: "ok", applied: true })));

vi.mock("convex/react", () => ({
  useQuery: () => remote.value,
  useMutation: () => save,
}));
vi.mock("@/lib/convex", () => ({ convex: {} }));

const { useProgressSync } = await import("./useProgressSync");

const identity = { profileId: "p1", deviceToken: "t1", pairCode: "ABC234", name: "Zosia" };
const T0 = new Date(2026, 8, 25, 9, 0).getTime();

function local(): Stable {
  return parseStable(localStorage.getItem("math_master_stable"));
}

function backup(overrides: Partial<Stable & { level: number }> = {}) {
  return {
    status: "ok",
    progress: {
      ...NEW_STABLE,
      coins: 77,
      pets: [newPet("horse", "Bella", T0)],
      activeId: "horse",
      savedAt: T0,
      level: 3,
      ...overrides,
    },
  };
}

describe("useProgressSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    save.mockClear();
    remote.value = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("restores a newer backup onto a fresh device, level included", () => {
    remote.value = backup();
    renderHook(() => useProgressSync(identity));

    expect(local().coins).toBe(77);
    expect(local().pets[0]?.name).toBe("Bella");
    expect(readLevel()).toBe(3);
  });

  it("sends nothing before the backup has been read", () => {
    updateStable((stable) => ({ ...stable, coins: 1 }));
    renderHook(() => useProgressSync(identity));
    act(() => vi.advanceTimersByTime(5000));
    expect(save).not.toHaveBeenCalled();
  });

  it("does not overwrite a newer backup with a fresh device's empty stable", () => {
    remote.value = backup();
    renderHook(() => useProgressSync(identity));
    act(() => vi.advanceTimersByTime(5000));
    expect(save).not.toHaveBeenCalled();
  });

  it("sends a level lowered by a lost game, rather than taking the backup's higher one", () => {
    remote.value = backup({ savedAt: 1, level: 3 });
    // The lost game stamps the stable, so this device's copy is the newer.
    updateStable((stable) => ({ ...stable, coins: 12 }));
    localStorage.setItem("math_master_level", "1");
    renderHook(() => useProgressSync(identity));

    expect(readLevel()).toBe(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(save.mock.calls[0]?.[0]).toMatchObject({ progress: { level: 1 } });
  });

  it("sends a change made on this device once it is newer than the backup", () => {
    remote.value = backup({ savedAt: 1 });
    updateStable((stable) => ({ ...stable, coins: 12 }));
    renderHook(() => useProgressSync(identity));

    act(() => vi.advanceTimersByTime(1000));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.[0]).toMatchObject({ progress: { coins: 12 } });
  });
});
