// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { NEW_STABLE, REVIVE_PRICE, SPECIES, newPet, type Pet, type Stable } from "@/engine";
import { I18nProvider } from "@/i18n/useI18n";
import { parseStable } from "@/game/useStable";
import { PetsScreen } from "./PetsScreen";

const KEY = "math_master_stable";

function seed(pets: Pet[], coins: number) {
  const stable: Stable = { ...NEW_STABLE, coins, pets, activeId: pets[0]?.id ?? null, savedAt: 1 };
  localStorage.setItem(KEY, JSON.stringify(stable));
}

function saved(): Stable {
  return parseStable(localStorage.getItem(KEY));
}

function renderPets() {
  localStorage.setItem("math_master_lang", "en");
  return render(
    <I18nProvider>
      <MemoryRouter>
        <PetsScreen />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("PetsScreen", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with a free horse, named by the child", async () => {
    const user = userEvent.setup();
    renderPets();

    await user.type(screen.getByLabelText("Your pet's name"), "Bella");
    await user.click(screen.getByRole("button", { name: "Adopt" }));

    expect(await screen.findByRole("heading", { name: "Bella" })).toBeInTheDocument();
    expect(saved().pets[0]).toMatchObject({ species: "horse", name: "Bella" });
    expect(saved().coins).toBe(10);
  });

  it("feeds the pet on screen for coins", async () => {
    const user = userEvent.setup();
    seed([{ ...newPet("horse", "Bella", Date.now()), food: 30 }], 10);
    renderPets();

    await user.click(screen.getByRole("button", { name: "Hay, 2 coins" }));

    await waitFor(() => expect(saved().coins).toBe(8));
    expect(screen.getByRole("progressbar", { name: "Food" })).toHaveAttribute("aria-valuenow", "55");
  });

  it("does not sell what the pet does not need or the child cannot afford", () => {
    seed([newPet("horse", "Bella", Date.now())], 3);
    renderPets();

    const medicine = screen.getByRole("button", { name: /Medicine/ });
    expect(medicine).toBeDisabled();
    expect(within(medicine).getByText("Full")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shower/ })).toHaveTextContent("2 more");
  });

  it("adopts an orange cat for coins, with its own menu, and switches back", async () => {
    const user = userEvent.setup();
    seed([newPet("horse", "Bella", Date.now())], SPECIES.cat.price + 5);
    renderPets();

    await user.click(screen.getByRole("button", { name: /New pet/ }));
    const dialog = screen.getByRole("dialog");
    // Too dear for now, but shown, so there is something to save up for.
    expect(within(dialog).getByRole("button", { name: /Unicorn/ })).toBeDisabled();

    await user.click(within(dialog).getByRole("button", { name: /Orange cat/ }));
    await user.type(within(dialog).getByLabelText("Your pet's name"), "Rudy");
    await user.click(within(dialog).getByRole("button", { name: /Adopt · 🪙 60/ }));

    expect(await screen.findByRole("heading", { name: "Rudy" })).toBeInTheDocument();
    expect(saved().coins).toBe(5);
    expect(saved().pets.map((pet) => pet.species)).toEqual(["horse", "cat"]);
    expect(screen.getByRole("button", { name: /Fish/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hay/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Bella" }));
    expect(await screen.findByRole("heading", { name: "Bella" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hay/ })).toBeInTheDocument();
  });

  it("offers a way back once a pet is gone, for enough coins", async () => {
    const user = userEvent.setup();
    const gone = { ...newPet("horse", "Bella", Date.now()), alive: false, diedAt: Date.now(), health: 0 };
    seed([gone], REVIVE_PRICE);
    renderPets();

    expect(screen.getByText("Bella is now in pet heaven.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hay/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: /Bring Bella back/ }));

    await waitFor(() => expect(saved().pets[0]!.alive).toBe(true));
    expect(saved().coins).toBe(0);
  });
});

describe("parseStable", () => {
  it("carries a one-horse save from the first version over as the first pet", () => {
    const old = {
      coins: 42,
      lastBonusDay: "2026-09-25",
      savedAt: 5,
      horse: { name: "Bella", food: 60, clean: 50, happy: 40, health: 90, alive: true, updatedAt: 1 },
    };
    const stable = parseStable(JSON.stringify(old));
    expect(stable.coins).toBe(42);
    expect(stable.activeId).toBe("horse");
    expect(stable.pets).toHaveLength(1);
    expect(stable.pets[0]).toMatchObject({ id: "horse", species: "horse", name: "Bella", food: 60 });
  });

  it("keeps the coins when the pets cannot be read", () => {
    const stable = parseStable(JSON.stringify({ coins: 7, pets: [{ nonsense: true }] }));
    expect(stable.coins).toBe(7);
    expect(stable.pets).toEqual([]);
    expect(stable.activeId).toBeNull();
  });
});
