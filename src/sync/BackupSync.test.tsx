// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

const sync = vi.hoisted(() => ({ fail: true, calls: 0 }));

vi.mock("./useProgressSync", () => ({
  useProgressSync: () => {
    sync.calls++;
    if (sync.fail) {
      throw new Error("Could not find public function for 'progress:forDevice'");
    }
  },
}));

const { BackupSync } = await import("./BackupSync");

const identity = { profileId: "p1", deviceToken: "t1", pairCode: "ABC234", name: "Zosia" };

describe("BackupSync", () => {
  it("keeps the game on screen when the backup fails, and tries again later", () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <>
        <BackupSync identity={identity} />
        <p>the game</p>
      </>,
    );
    expect(screen.getByText("the game")).toBeInTheDocument();

    sync.fail = false;
    const before = sync.calls;
    act(() => vi.advanceTimersByTime(60_000));
    expect(sync.calls).toBeGreaterThan(before);

    warn.mockRestore();
    error.mockRestore();
    vi.useRealTimers();
  });
});
