// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_SETTINGS } from "@/engine";
import { I18nProvider } from "@/i18n/useI18n";

// The sliders measure themselves; jsdom has nothing to measure with.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const update = vi.hoisted(() => vi.fn(async (_args: unknown) => null));
vi.mock("convex/react", () => ({ useMutation: () => update }));

const { SettingsForm } = await import("./SettingsForm");

function renderForm() {
  localStorage.setItem("math_master_lang", "en");
  return render(
    <I18nProvider>
      <SettingsForm token="t" settings={{ ...DEFAULT_SETTINGS, ops: ["add", "mul"] }} locale="en" name="Zosia" />
    </I18nProvider>,
  );
}

describe("SettingsForm", () => {
  beforeEach(() => update.mockClear());

  it("shows the save bar only once something has changed, and saves just that", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.queryByText("Unsaved changes")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Dividing/ }));
    expect(await screen.findByText("Unsaved changes")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save settings" }));
    expect(update).toHaveBeenCalledWith({
      token: "t",
      patch: expect.objectContaining({ ops: ["add", "mul", "div"] }),
    });
  });

  it("puts everything back on discard", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /Dividing/ }));
    await user.click(await screen.findByRole("button", { name: /Discard/ }));

    await waitFor(() => expect(screen.queryByText("Unsaved changes")).toBeNull());
    expect(screen.getByRole("button", { name: /Dividing/ })).toHaveAttribute("aria-pressed", "false");
    expect(update).not.toHaveBeenCalled();
  });

  it("does not count the order operations were ticked in as a change", async () => {
    const user = userEvent.setup();
    renderForm();
    // Off and on again: the same set, in a different order than it started.
    await user.click(screen.getByRole("button", { name: /Adding/ }));
    await user.click(screen.getByRole("button", { name: /Adding/ }));
    await waitFor(() => expect(screen.queryByText("Unsaved changes")).toBeNull());
  });

  it("says the whole configuration back in one line", () => {
    renderForm();
    expect(screen.getByText(/Adding, Times tables · numbers up to/)).toBeInTheDocument();
  });
});
