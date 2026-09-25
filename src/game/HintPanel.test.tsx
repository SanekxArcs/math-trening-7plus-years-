// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { buildProblem } from "@/engine";
import { I18nProvider } from "@/i18n/useI18n";
import { HintPanel, hasPictureHint } from "./HintPanel";

function renderPanel(op: "add" | "sub" | "mul" | "div", a: number, b: number) {
  localStorage.setItem("math_master_lang", "en");
  return render(
    <I18nProvider>
      <HintPanel problem={buildProblem({ op, a, b })} onClose={() => {}} />
    </I18nProvider>,
  );
}

function tick(beats: number) {
  for (let i = 0; i < beats; i++) {
    act(() => {
      vi.advanceTimersByTime(1200);
    });
  }
}

describe("HintPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("has a picture for every kind of question", () => {
    for (const op of ["add", "sub", "mul", "div"] as const) {
      expect(hasPictureHint(buildProblem({ op, a: 4, b: 3 })), op).toBe(true);
    }
  });

  it("skip counts a product, collecting the multiples as it goes", () => {
    // 4 × 3 is 3 groups of 4.
    renderPanel("mul", 4, 3);
    fireEvent.click(screen.getByRole("button", { name: /Count together/ }));

    tick(2);
    // Each counted group wears its running total, and the trail repeats it.
    expect(screen.getAllByText("4").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("8").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("12")).not.toBeInTheDocument();

    tick(1);
    expect(screen.getByText("Altogether: 12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Count again/ })).toBeInTheDocument();
  });

  it("shares a division out one round at a time until each box has the answer", () => {
    // 12 ÷ 3: twelve dots dealt into three boxes.
    renderPanel("div", 4, 3);
    fireEvent.click(screen.getByRole("button", { name: /Share out/ }));

    // The pile is full and the boxes are empty before anything is dealt.
    expect(screen.getByRole("img", { name: "Each box gets: 0" })).toBeInTheDocument();

    tick(1);
    expect(screen.getByText("Each box gets: 1")).toBeInTheDocument();

    tick(3);
    expect(screen.getByText("Each box gets: 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Share again/ })).toBeInTheDocument();
  });

  it("keeps the answer out of the header for a division", () => {
    // "3 groups of 4" would be the answer to 12 ÷ 3 spelled out in words.
    renderPanel("div", 4, 3);
    expect(screen.queryByText(/groups of/)).not.toBeInTheDocument();
  });
});
