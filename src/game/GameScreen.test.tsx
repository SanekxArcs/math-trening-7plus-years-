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

function coins(): number {
  return JSON.parse(localStorage.getItem("math_master_stable") ?? "{}").coins;
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

  it("closes the picture hint when the next question arrives", async () => {
    // The open state used to be a plain flag, so answering with the hint open
    // carried it over and the next question showed its picture unasked.
    const user = userEvent.setup();
    renderGame({
      difficulty: "medium",
      ops: ["mul"],
      timerEnabled: false,
      goalEnabled: false,
      visualHintEnabled: true,
    });

    await user.click(screen.getByRole("button", { name: /Show hint/ }));
    expect(screen.getByText("Picture hint")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: `Answer ${solveVisibleQuestion()}` }));

    expect(
      await screen.findByRole("button", { name: /Show hint/ }, { timeout: 4000 }),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Picture hint")).not.toBeInTheDocument());
  }, 10_000);

  it("offers a picture hint for addition too", async () => {
    const user = userEvent.setup();
    renderGame({
      difficulty: "medium",
      ops: ["add"],
      timerEnabled: false,
      goalEnabled: false,
      visualHintEnabled: true,
    });

    await user.click(screen.getByRole("button", { name: /Show hint/ }));
    expect(screen.getByRole("button", { name: /Count on/ })).toBeInTheDocument();
  });

  it("pauses on demand, and finishing ends the session", async () => {
    const user = userEvent.setup();
    renderGame({ timerEnabled: false, goalEnabled: false });

    await user.click(screen.getByRole("button", { name: "Pause the game" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Paused");

    await user.click(screen.getByRole("button", { name: /Keep playing/ }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(optionButtons().length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Pause the game" }));
    await user.click(screen.getByRole("button", { name: /Finish for now/ }));

    expect(await screen.findByText("Nice work!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play again" })).toBeInTheDocument();
  });

  it("keeps the points when the page is reloaded", async () => {
    // The bug this covers: a refresh — a stray swipe, a sleeping tablet, the
    // browser reclaiming the tab — dropped the child back to zero mid-run.
    const user = userEvent.setup();
    const first = renderGame({ difficulty: "medium", timerEnabled: false, goalEnabled: false });

    const answer = solveVisibleQuestion();
    await user.click(screen.getByRole("button", { name: `Answer ${answer}` }));
    await screen.findByText("+10");

    first.unmount();
    const { container } = renderGame({
      difficulty: "medium",
      timerEnabled: false,
      goalEnabled: false,
    });

    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    // The purse sits in the header too, and a fresh one also holds 10.
    const points = within(header!)
      .getAllByText("10")
      .filter((element) => !element.closest('[role="img"]'));
    expect(points).toHaveLength(1);
  });

  it("asks the same question again after a reload", async () => {
    // The dodge this closes: a hard question, a refresh, and the board rolled
    // an easier one while the score stayed exactly where it was.
    const options = { difficulty: "medium" as const, timerEnabled: false, goalEnabled: false };
    const first = renderGame(options);

    const prompt = screen.getByRole("heading", { level: 1 }).textContent;
    const tiles = optionButtons().map((button) => button.textContent);

    first.unmount();
    renderGame(options);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(prompt);
    expect(optionButtons().map((button) => button.textContent)).toEqual(tiles);
  });

  it("offers the next level once the goal is reached, and plays it", async () => {
    const user = userEvent.setup();
    // Easy scores 5 a question, so one right answer finishes this goal.
    const { container } = renderGame({
      difficulty: "easy",
      timerEnabled: false,
      goalEnabled: true,
      goalTarget: 5,
    });

    const answer = solveVisibleQuestion();
    await user.click(screen.getByRole("button", { name: `Answer ${answer}` }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("10 points to win")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Play level 2/ }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const header = container.querySelector("header");
    expect(within(header!).getByText("Lv 2")).toBeInTheDocument();
    // A new level starts from nothing — the points just banked do not carry.
    expect(within(header!).getByText("0")).toBeInTheDocument();
  });

  it("does not move a child up for stopping early", async () => {
    const user = userEvent.setup();
    renderGame({ timerEnabled: false, goalEnabled: true, goalTarget: 500 });

    await user.click(screen.getByRole("button", { name: "Pause the game" }));
    await user.click(screen.getByRole("button", { name: /Finish for now/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Play again" })).toBeInTheDocument();
    expect(within(dialog).queryByText(/Play level/)).toBeNull();
  });

  it("pays coins for a level won, and not again when the summary is reloaded", async () => {
    const user = userEvent.setup();
    const options = { difficulty: "easy" as const, timerEnabled: false, goalEnabled: true, goalTarget: 5 };
    const first = renderGame(options);

    const answer = solveVisibleQuestion();
    await user.click(screen.getByRole("button", { name: `Answer ${answer}` }));

    const dialog = await screen.findByRole("dialog");
    // One coin for a goal of 5, plus the first win of the day.
    expect(within(dialog).getByText(/\+1 coins/)).toBeInTheDocument();
    expect(within(dialog).getByText("+5 first win today!")).toBeInTheDocument();
    expect(coins()).toBe(16);

    first.unmount();
    renderGame(options);
    await screen.findByRole("dialog");
    expect(coins()).toBe(16);
  });

  it("pays nothing for stopping short of the goal", async () => {
    const user = userEvent.setup();
    renderGame({ timerEnabled: false, goalEnabled: true, goalTarget: 500 });

    await user.click(screen.getByRole("button", { name: "Pause the game" }));
    await user.click(screen.getByRole("button", { name: /Finish for now/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByText(/coins/)).toBeNull();
    expect(localStorage.getItem("math_master_stable")).toBeNull();
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
    // Found, not got: the points roll up to their new total rather than jump.
    expect(await within(header!).findByText("5")).toBeInTheDocument();
  });
});
