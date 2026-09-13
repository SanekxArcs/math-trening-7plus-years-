// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DEFAULT_SETTINGS, type GameSettings } from "@/engine";
import { I18nProvider } from "@/i18n/useI18n";
import { GameScreen } from "./GameScreen";

function renderGame(overrides: Partial<GameSettings> = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...overrides };
  // Pin the language so the assertions below are about behaviour, not about
  // whichever locale the test environment happens to report.
  localStorage.setItem("math_master_lang", "en");
  return render(
    <I18nProvider>
      <MemoryRouter>
        <GameScreen settings={settings} />
      </MemoryRouter>
    </I18nProvider>,
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

  it("never shows a question next to another question's answers", async () => {
    // The heading used to live in an AnimatePresence with mode="wait", so the
    // outgoing question stayed on screen while the tiles had already swapped to
    // the next one. A child reading the prompt was answering a different sum.
    //
    // The wait is on the *tiles* changing, not the prompt: waiting for the
    // prompt would step right past the window the bug lived in.
    const user = userEvent.setup();
    renderGame({ difficulty: "medium", timerEnabled: false, goalEnabled: false });

    for (let round = 0; round < 4; round++) {
      const answer = solveVisibleQuestion();
      const shown = optionButtons().map((b) => Number(b.textContent));

      expect(
        shown,
        `round ${round}: tiles ${shown.join(",")} do not answer the question on screen`,
      ).toContain(answer);

      await user.click(screen.getByRole("button", { name: `Answer ${answer}` }));

      const before = shown.join(",");
      await waitFor(
        () => {
          expect(optionButtons().map((b) => Number(b.textContent)).join(",")).not.toBe(
            before,
          );
        },
        { timeout: 4000 },
      );
    }
  }, 20_000);

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
