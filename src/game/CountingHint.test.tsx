// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n/useI18n";
import { CountingHint, countSteps } from "./CountingHint";

function renderHint(op: "add" | "sub", a: number, b: number) {
  localStorage.setItem("math_master_lang", "en");
  const view = render(
    <I18nProvider>
      <CountingHint op={op} a={a} b={b} />
    </I18nProvider>,
  );
  const dots = (state: string) => view.container.querySelectorAll(`[data-dot="${state}"]`).length;
  return { ...view, dots };
}

/** Runs the whole count: one beat per step, plus the longer opening beat. */
function runCount(steps: number) {
  for (let i = 0; i <= steps; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
}

describe("countSteps", () => {
  it("goes one by one below ten", () => {
    expect(countSteps(0)).toEqual([]);
    expect(countSteps(5)).toEqual([1, 1, 1, 1, 1]);
  });

  it("jumps the tens first, then the ones", () => {
    expect(countSteps(13)).toEqual([10, 1, 1, 1]);
    expect(countSteps(40)).toEqual([10, 10, 10, 10]);
  });
});

describe("CountingHint", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("draws both numbers of a sum, each in its own colour", () => {
    const { dots } = renderHint("add", 8, 5);
    expect(dots("first")).toBe(8);
    expect(dots("second")).toBe(5);
  });

  it("counts on from the first number rather than from one", () => {
    const { dots } = renderHint("add", 8, 5);

    fireEvent.click(screen.getByRole("button", { name: /Count on/ }));
    // Before anything moves it says where it starts: at eight, not at one.
    expect(screen.getByText("So far: 8")).toBeInTheDocument();
    expect(dots("waiting")).toBe(5);

    runCount(5);
    expect(screen.getByText("Altogether: 13")).toBeInTheDocument();
    expect(dots("second")).toBe(5);
  });

  it("marks what a subtraction takes away, then takes it", () => {
    const { dots } = renderHint("sub", 12, 5);
    expect(dots("first")).toBe(7);
    expect(dots("marked")).toBe(5);

    fireEvent.click(screen.getByRole("button", { name: /Take away/ }));
    expect(screen.getByText("Left: 12")).toBeInTheDocument();

    runCount(5);
    expect(screen.getByText("Left: 7")).toBeInTheDocument();
    expect(dots("gone")).toBe(5);
    expect(dots("first")).toBe(7);
  });

  it("offers no counting when there is nothing to count on", () => {
    const { dots } = renderHint("add", 6, 0);
    expect(dots("first")).toBe(6);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("says so rather than drawing an empty box for zero", () => {
    renderHint("sub", 0, 0);
    expect(screen.getByText(/it is zero/)).toBeInTheDocument();
  });
});
