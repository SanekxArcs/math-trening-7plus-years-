// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/i18n/useI18n";
import { SetupScreen } from "./SetupScreen";

function renderSetup(onRestore: (pairCode: string, pin: string) => Promise<unknown>) {
  localStorage.setItem("math_master_lang", "en");
  return render(
    <I18nProvider>
      <MemoryRouter>
        <SetupScreen onCreate={vi.fn()} onRestore={onRestore} />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("SetupScreen restore", () => {
  it("links this device to an existing profile with the pairing code and PIN", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn(async () => undefined);
    renderSetup(onRestore);

    await user.click(screen.getByRole("button", { name: /Already have a profile/ }));
    await user.type(screen.getByLabelText("Pairing code"), "abc234");
    await user.type(screen.getByLabelText("PIN"), "1234");
    await user.click(screen.getByRole("button", { name: "Restore" }));

    expect(onRestore).toHaveBeenCalledWith("ABC234", "1234");
  });

  it("says so when the code and PIN do not match", async () => {
    const user = userEvent.setup();
    renderSetup(async () => {
      throw new Error("That pairing code and PIN do not match");
    });

    await user.click(screen.getByRole("button", { name: /Already have a profile/ }));
    await user.type(screen.getByLabelText("Pairing code"), "ABC234");
    await user.type(screen.getByLabelText("PIN"), "9999");
    await user.click(screen.getByRole("button", { name: "Restore" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("do not match");
  });
});
