// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("lets a sleeping pet sleep: no care until a sum is solved", () => {
    const horse = newPet("horse", "Sparky", Date.now());
    const stable: Stable = { ...NEW_STABLE, coins: 20, pets: [horse], activeId: "horse", savedAt: 1, asleepSince: 1 };
    localStorage.setItem(KEY, JSON.stringify(stable));
    renderPets();

    expect(screen.getByRole("status")).toHaveTextContent("Sparky is fast asleep");
    expect(screen.getByRole("button", { name: "Hay, 2 coins" })).toBeDisabled();
  });

  it("holds the paused game, with the way to finish for today", () => {
    seed([newPet("horse", "Sparky", Date.now())], 10);
    localStorage.setItem(
      "math_master_session",
      JSON.stringify({
        savedAt: Date.now(),
        score: { rawPoints: 40, goodStreak: 2, badStreak: 0, bestStreak: 3, correct: 4, wrong: 1 },
      }),
    );
    renderPets();

    const paused = screen.getByRole("region", { name: "Game paused" });
    expect(within(paused).getByRole("button", { name: /Finish for today/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Keep playing" })).toBeInTheDocument();
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

  it("dresses the pet up: try it on, buy it, and it is on", async () => {
    const user = userEvent.setup();
    seed([newPet("horse", "Bella", Date.now())], 450);
    renderPets();

    await user.click(screen.getByRole("tab", { name: /Dress up/ }));
    await user.click(screen.getByRole("tab", { name: /Hats/ }));
    await user.click(screen.getByRole("button", { name: "Golden crown, 400 coins" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("This is how Bella would look!")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /Buy · 🪙 400/ }));

    await waitFor(() => expect(saved().coins).toBe(50));
    expect(saved().pets[0]).toMatchObject({ owned: ["crown"], worn: { hat: "crown" } });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // Owned now: a tap takes it off, and another puts it back, for nothing.
    await user.click(screen.getByRole("button", { name: "Golden crown, Take off" }));
    await waitFor(() => expect(saved().pets[0]!.worn.hat).toBeUndefined());
    expect(saved().coins).toBe(50);
  });

  it("opens the wardrobe on the K-pop shelf, with idol and hunter gear from every slot", async () => {
    const user = userEvent.setup();
    seed([newPet("dog", "Buddy", Date.now())], 500);
    renderPets();

    await user.click(screen.getByRole("tab", { name: /Dress up/ }));
    expect(screen.getByRole("tab", { name: /K-pop/ })).toHaveAttribute("aria-selected", "true");
    for (const name of ["Idol headset", "Gat hat", "Magpie friend", "Golden necklace", "Star shades", "Hunter's sword", "Concert stage"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /Golden crown/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: /Concert stage/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Buy · 🪙 450/ }));
    await waitFor(() => expect(saved().pets[0]!.worn.home).toBe("stage"));
  });

  it("saves up for what is too dear, and shows how far there is to go", async () => {
    const user = userEvent.setup();
    seed([newPet("horse", "Bella", Date.now())], 120);
    renderPets();

    await user.click(screen.getByRole("tab", { name: /Dress up/ }));
    await user.click(screen.getByRole("tab", { name: /Hats/ }));
    await user.click(screen.getByRole("button", { name: "Golden crown, 400 coins" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: /Buy/ })).toBeNull();
    expect(within(dialog).getByText(/280 more coins to go/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Save up for this" }));

    await waitFor(() => expect(saved().wish).toEqual({ petId: "horse", itemId: "crown" }));
    expect(screen.getByText("Saving for: Golden crown")).toBeInTheDocument();
    expect(saved().coins).toBe(120);
  });

  it("plays catch: the pet gets happier for what was caught, and then rests", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      seed([{ ...newPet("horse", "Bella", Date.now()), happy: 20 }], 10);
      renderPets();

      await user.click(screen.getByRole("button", { name: /Play catch/ }));
      await user.click(screen.getByRole("button", { name: "Go!" }));
      await vi.advanceTimersByTimeAsync(700);
      const treat = screen.getAllByRole("button").find((button) => button.closest(".absolute.inset-0.z-30") && button.textContent);
      expect(treat).toBeDefined();
      await user.pointer({ keys: "[MouseLeft>]", target: treat! });

      await vi.advanceTimersByTimeAsync(21_000);
      expect(await screen.findByRole("button", { name: "Done" })).toBeInTheDocument();
      expect(saved().pets[0]!.happy).toBeGreaterThan(20);
      expect(saved().pets[0]!.lastPlayedAt).toBeGreaterThan(0);

      await user.click(screen.getByRole("button", { name: "Done" }));
      expect(screen.getByRole("button", { name: /Play catch/ })).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  }, 30_000);

  it("adopts the blue tiger, who loves ramyeon", async () => {
    const user = userEvent.setup();
    seed([newPet("horse", "Bella", Date.now())], SPECIES.tiger.price);
    renderPets();

    await user.click(screen.getByRole("button", { name: /New pet/ }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Blue tiger/ }));
    await user.click(within(dialog).getByRole("button", { name: /Adopt · 🪙 300/ }));

    expect(await screen.findByRole("heading", { name: "Derpy" })).toBeInTheDocument();
    expect(saved().coins).toBe(0);
    expect(screen.getByRole("button", { name: /Ramyeon/ })).toBeInTheDocument();
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

  it("gives pets from before the wardrobe an empty one", () => {
    const old = { coins: 5, pets: [{ species: "cat", name: "Rudy", food: 60, clean: 50, happy: 40, health: 90, updatedAt: 1 }] };
    const stable = parseStable(JSON.stringify(old));
    expect(stable.pets[0]).toMatchObject({ owned: [], worn: {}, lastPlayedAt: 0 });
    expect(stable.wish).toBeNull();
  });

  it("drops accessories that do not exist, do not fit, or are not owned", () => {
    const raw = {
      coins: 5,
      pets: [
        {
          species: "cat",
          name: "Rudy",
          food: 60,
          clean: 50,
          happy: 40,
          health: 90,
          updatedAt: 1,
          owned: ["crown", "saddle", "jetpack", "crown"],
          worn: { hat: "crown", back: "saddle", face: "sunglasses" },
        },
      ],
      wish: { petId: "cat", itemId: "crown" },
    };
    const stable = parseStable(JSON.stringify(raw));
    expect(stable.pets[0]!.owned).toEqual(["crown"]);
    expect(stable.pets[0]!.worn).toEqual({ hat: "crown" });
    // Already owned, so not something to wish for any more.
    expect(stable.wish).toBeNull();
  });

  it("keeps the coins when the pets cannot be read", () => {
    const stable = parseStable(JSON.stringify({ coins: 7, pets: [{ nonsense: true }] }));
    expect(stable.coins).toBe(7);
    expect(stable.pets).toEqual([]);
    expect(stable.activeId).toBeNull();
  });
});
