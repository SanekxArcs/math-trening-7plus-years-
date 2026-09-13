// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DEFAULT_SETTINGS, type GameSettings } from "@/engine";
import { GameScreen } from "./GameScreen";

function renderGame(overrides: Partial<GameSettings> = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...overrides };
  return render(
    <MemoryRouter>
      <GameScreen settings={settings} />
    </MemoryRouter>,
  );
}

/** Reads the question off the screen and works out the answer independently. */
function solveVisibleQuestion(): number {
  const prompt = screen.getByRole("heading", { level: 1 }).textContent ?? "";
  const [left, op, right] = prompt.split(" ");
  const a = Number(left);
  const b = Number(right);
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return a / b;
    default:
      throw new Error(`Unrecognised prompt: "${prompt}"`);
  }
}

function optionButtons() {
  return screen
    .getAllByRole("button")
    .filter((button) => button.getAttribute("aria-label")?.startsWith("Answer "));
}

describe("GameScreen", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders a solvable question with the configured number of tiles", () => {
    renderGame({ difficulty: "hard", timerEnabled: false });

    expect(optionButtons()).toHaveLength(6);
    const answer = solveVisibleQuestion();
    expect(optionButtons().map((b) => Number(b.textContent))).toContain(answer);
  });

  it("awards points for a correct answer", async () => {
    const user = userEvent.setup();
    renderGame({ difficulty: "medium", timerEnabled: false, goalEnabled: false });

    const answer = solveVisibleQuestion();
    await user.click(screen.getByRole("button", { name: `Answer ${answer}` }));

    expect(await screen.findByText("+10")).toBeInTheDocument();
  });

  it("charges the first-mistake penalty and shows the escalating one", async () => {
    const user = userEvent.setup();
    renderGame({ difficulty: "medium", timerEnabled: false, goalEnabled: false });

    const answer = solveVisibleQuestion();
    const wrong = optionButtons().find((b) => Number(b.textContent) !== answer);
    expect(wrong).toBeDefined();

    await user.click(wrong!);

    expect(await screen.findByText("-10")).toBeInTheDocument();
    // The meter must warn what the next mistake costs — an invisible escalation
    // just feels like the game turned against them.
    expect(await screen.findByText("−25 next")).toBeInTheDocument();
  });

  it("50:50 dims half the wrong tiles and never the answer", async () => {
    const user = userEvent.setup();
    renderGame({
      difficulty: "medium",
      timerEnabled: false,
      halfHalfEnabled: true,
      goalEnabled: false,
    });

    const answer = solveVisibleQuestion();
    await user.click(screen.getByRole("button", { name: /Use 50:50/ }));

    const disabled = optionButtons().filter((b) => b.hasAttribute("disabled"));
    expect(disabled).toHaveLength(2);
    for (const button of disabled) {
      expect(Number(button.textContent)).not.toBe(answer);
    }
  });

  it("uses the numpad instead of tiles in expert mode", async () => {
    const user = userEvent.setup();
    renderGame({ difficulty: "expert", timerEnabled: false, goalEnabled: false });

    expect(optionButtons()).toHaveLength(0);

    const answer = solveVisibleQuestion();
    for (const digit of String(answer)) {
      await user.click(screen.getByRole("button", { name: digit }));
    }
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    expect(await screen.findByText(`+${25}`)).toBeInTheDocument();
  });

  it("keeps the goal bar and points in step", async () => {
    const user = userEvent.setup();
    const { container } = renderGame({
      difficulty: "easy",
      timerEnabled: false,
      goalEnabled: true,
      goalTarget: 100,
    });

    const answer = solveVisibleQuestion();
    await user.click(screen.getByRole("button", { name: `Answer ${answer}` }));

    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(within(header!).getByText("5")).toBeInTheDocument();
  });
});
