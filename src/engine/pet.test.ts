import { describe, expect, it } from "vitest";
import {
  DAILY_BONUS,
  NEW_STABLE,
  REVIVE_PRICE,
  SPECIES,
  SPECIES_ORDER,
  adopt,
  buy,
  canPet,
  choose,
  coinsForGoal,
  coinsForLevel,
  LEVEL_COINS,
  cuddle,
  findItem,
  isAsleep,
  putToSleep,
  shownMood,
  wakeUp,
  itemsFor,
  moodOf,
  newPet,
  payReward,
  revive,
  sessionReward,
  setVacation,
  tick,
  whyNot,
  whyNotAdopt,
  type Pet,
  type Species,
  type Stable,
} from "./index.ts";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const T0 = new Date(2026, 8, 25, 9, 0).getTime();

function full(species: Species = "horse"): Pet {
  return { ...newPet(species, "Sparky", T0), food: 100, clean: 100, happy: 100 };
}

function stable(pets: Pet[] = [full()], coins = 50): Stable {
  return { ...NEW_STABLE, coins, pets, activeId: pets[0]?.id ?? null };
}

describe("decay", () => {
  it("is still well after one day alone", () => {
    const pet = tick(full(), T0 + DAY);
    expect(pet.alive).toBe(true);
    expect(pet.food).toBeCloseTo(50);
    expect(pet.health).toBe(100);
    expect(moodOf(pet)).toBe("ok");
  });

  it("survives a weekend away, but comes back needing care", () => {
    const pet = tick(full(), T0 + 2.5 * DAY);
    expect(pet.alive).toBe(true);
    expect(pet.health).toBeLessThan(100);
    expect(moodOf(pet)).toBe("hungry");
  });

  it.each(SPECIES_ORDER)("gives a neglected %s at least three days, and not six", (species) => {
    expect(tick(full(species), T0 + 3 * DAY).alive).toBe(true);
    expect(tick(full(species), T0 + 6 * DAY).alive).toBe(false);
  });

  it("gives each species its own personality", () => {
    const cat = tick(full("cat"), T0 + DAY);
    const horse = tick(full("horse"), T0 + DAY);
    expect(cat.clean).toBeGreaterThan(horse.clean);
  });

  it("comes out the same whether checked every hour or once", () => {
    let stepped = full();
    for (let t = T0 + HOUR; t <= T0 + 3 * DAY; t += HOUR) stepped = tick(stepped, t);
    const once = tick(full(), T0 + 3 * DAY);
    expect(stepped.health).toBeCloseTo(once.health, 5);
    expect(stepped.food).toBeCloseTo(once.food, 5);
  });

  it("heals on its own once fed and clean", () => {
    expect(tick({ ...full(), health: 40 }, T0 + 10 * HOUR).health).toBeCloseTo(50);
  });

  it("never lets happiness alone cost health", () => {
    expect(tick({ ...full(), happy: 0 }, T0 + 10 * HOUR).health).toBe(100);
  });

  it("freezes every pet on vacation and does not charge for it afterwards", () => {
    const away = setVacation(stable([full("horse"), full("cat")]), true, T0);
    const later = { ...away, pets: away.pets.map((pet) => tick(pet, T0 + 14 * DAY)) };
    const back = setVacation(later, false, T0 + 14 * DAY);
    for (const pet of back.pets) {
      expect(pet.alive).toBe(true);
      expect(pet.food).toBe(100);
    }
    expect(tick(back.pets[0]!, T0 + 15 * DAY).food).toBeCloseTo(50);
  });

  it("gives nothing back for a clock set backwards", () => {
    const pet = tick(full(), T0 + DAY);
    expect(tick(pet, T0)).toBe(pet);
  });
});

describe("the shop", () => {
  it("feeds for coins", () => {
    const fed = buy(stable([{ ...full(), food: 30 }], 10), "horse", "hay", T0);
    expect(fed.pets[0]!.food).toBe(55);
    expect(fed.coins).toBe(8);
  });

  it("caps needs at 100", () => {
    expect(buy(stable([{ ...full(), food: 90 }]), "horse", "oats", T0).pets[0]!.food).toBe(100);
  });

  it("feeds only the pet it was bought for", () => {
    const both = stable([{ ...full("horse"), food: 30 }, { ...full("cat"), food: 30 }]);
    const fed = buy(both, "cat", "fish", T0);
    expect(fed.pets.find((pet) => pet.id === "cat")!.food).toBe(75);
    expect(fed.pets.find((pet) => pet.id === "horse")!.food).toBe(30);
  });

  it("keeps each pet to its own menu", () => {
    const hungryCat = stable([{ ...full("cat"), food: 10 }]);
    expect(whyNot(hungryCat, "cat", findItem("hay")!)).toBe("notForThisPet");
    expect(whyNot(hungryCat, "cat", findItem("fish")!)).toBeNull();
    expect(whyNot(hungryCat, "cat", findItem("medicine")!)).toBe("full");
  });

  it("refuses what would change nothing, what cannot be paid for, and a pet that is gone", () => {
    const hay = findItem("hay")!;
    expect(whyNot(stable(), "horse", hay)).toBe("full");
    expect(whyNot(stable([{ ...full(), food: 10 }], 1), "horse", hay)).toBe("coins");
    expect(whyNot(stable([{ ...full(), alive: false }]), "horse", hay)).toBe("gone");
  });

  it.each(SPECIES_ORDER)("keeps a %s's daily upkeep within a level-1 win and the bonus", (species) => {
    // What a day of decay costs to undo at the cheapest price per point.
    const items = itemsFor(species);
    const cheapest = (stat: "food" | "clean" | "happy") =>
      Math.min(
        ...items
          .filter((item) => item.effect[stat] !== undefined)
          .map((item) => item.price / item.effect[stat]!),
      );
    const decay = SPECIES[species].decay;
    const upkeep =
      decay.food * cheapest("food") + decay.clean * cheapest("clean") + decay.happy * cheapest("happy");
    expect(upkeep).toBeLessThanOrEqual(coinsForGoal(200) + DAILY_BONUS);
  });

  it("gives every species a full menu: food, a meal, a toy", () => {
    for (const species of SPECIES_ORDER) {
      const kinds = itemsFor(species).map((item) => item.kind);
      expect(kinds).toContain("food");
      expect(kinds).toContain("play");
      expect(SPECIES[species].menu.every((id) => findItem(id))).toBe(true);
    }
  });
});

describe("adopting", () => {
  it("gives the first pet free, and makes it the one on screen", () => {
    const first = adopt(NEW_STABLE, "horse", "Bella", T0);
    expect(first.coins).toBe(NEW_STABLE.coins);
    expect(first.activeId).toBe("horse");
  });

  it("charges for the next one, one of each kind", () => {
    const owner = stable([full()], 70);
    const withCat = adopt(owner, "cat", "Rudy", T0);
    expect(withCat.coins).toBe(70 - SPECIES.cat.price);
    expect(withCat.pets).toHaveLength(2);
    expect(withCat.activeId).toBe("cat");

    expect(whyNotAdopt(withCat, "cat")).toBe("owned");
    expect(whyNotAdopt(withCat, "unicorn")).toBe("coins");
    expect(adopt(withCat, "unicorn", "Star", T0)).toBe(withCat);
  });

  it("joins the family holiday if one is on", () => {
    const away = setVacation(stable([full()], 100), true, T0);
    expect(adopt(away, "cat", "Rudy", T0).pets[1]!.vacation).toBe(true);
  });

  it("switches between pets", () => {
    const two = adopt(stable([full()], 100), "cat", "Rudy", T0);
    expect(choose(two, "horse").activeId).toBe("horse");
    expect(choose(two, "dog")).toBe(two);
  });
});

describe("petting", () => {
  it("is free, cheers the pet up, and has a cooldown", () => {
    const petted = cuddle(stable([{ ...full(), happy: 50 }]), "horse", T0);
    expect(petted.pets[0]!.happy).toBe(55);
    expect(petted.coins).toBe(50);
    expect(canPet(petted.pets[0]!, T0 + HOUR / 2)).toBe(false);
    expect(canPet(petted.pets[0]!, T0 + HOUR)).toBe(true);
  });
});

describe("revive", () => {
  const gone = { ...full(), alive: false, diedAt: T0, food: 0, health: 0 };

  it("costs the full price and brings the pet back half-well", () => {
    const back = revive(stable([gone], REVIVE_PRICE + 5), "horse", T0 + DAY);
    expect(back.coins).toBe(5);
    expect(back.pets[0]!.alive).toBe(true);
    expect(back.pets[0]!.health).toBe(50);
    expect(back.pets[0]!.updatedAt).toBe(T0 + DAY);
  });

  it("does nothing without enough coins", () => {
    const before = stable([gone], REVIVE_PRICE - 1);
    expect(revive(before, "horse", T0)).toBe(before);
  });
});

describe("coins", () => {
  it("pays in proportion to the goal", () => {
    expect(coinsForGoal(200)).toBe(10);
    expect(coinsForGoal(300)).toBe(15);
    expect(coinsForGoal(5)).toBe(1);
  });

  const win = { won: true, goalEnabled: true, goal: 200, points: 210 };

  it("pays the daily bonus once per calendar day", () => {
    const first = sessionReward(NEW_STABLE, win, T0)!;
    expect(first).toEqual({ coins: 10, bonus: DAILY_BONUS });
    const paid = payReward(NEW_STABLE, first, T0);
    expect(paid.coins).toBe(NEW_STABLE.coins + 10 + DAILY_BONUS);

    expect(sessionReward(paid, win, T0 + 2 * HOUR)!.bonus).toBe(0);
    expect(sessionReward(paid, win, T0 + DAY)!.bonus).toBe(DAILY_BONUS);
  });

  it("pays nothing for stopping short of the goal", () => {
    expect(sessionReward(NEW_STABLE, { ...win, won: false, points: 190 }, T0)).toBeNull();
  });

  it("pays for points when there is no goal to win", () => {
    const free = { won: false, goalEnabled: false, goal: 200, points: 130 };
    expect(sessionReward(NEW_STABLE, free, T0)!.coins).toBe(6);
    expect(sessionReward(NEW_STABLE, { ...free, points: 15 }, T0)).toBeNull();
  });
});

describe("bedtime", () => {
  const withHorse = adopt(NEW_STABLE, "horse", "Sparky", T0);

  it("puts the pets to bed and the next sum wakes them", () => {
    const night = putToSleep(withHorse, T0);
    expect(isAsleep(night)).toBe(true);
    expect(shownMood(night, night.pets[0]!)).toBe("asleep");
    expect(isAsleep(wakeUp(night))).toBe(false);
  });

  it("has no one to put to bed in an empty stable", () => {
    expect(putToSleep(NEW_STABLE, T0)).toBe(NEW_STABLE);
    expect(isAsleep(NEW_STABLE)).toBe(false);
  });

  it("keeps the first bedtime, not a later one", () => {
    const night = putToSleep(withHorse, T0);
    expect(putToSleep(night, T0 + 1000).asleepSince).toBe(T0);
  });

  it("does not stop the pets getting hungry while they sleep", () => {
    // Sleep is a ritual, not a pause: freezing needs would let a child stop
    // playing and never have a pet go hungry.
    const night = putToSleep(withHorse, T0);
    const morning = tick(night.pets[0]!, T0 + 24 * 60 * 60 * 1000);
    expect(morning.food).toBeLessThan(night.pets[0]!.food);
  });

  it("still shows a pet that is gone as gone, asleep or not", () => {
    const night = putToSleep(withHorse, T0);
    const gone = { ...night.pets[0]!, alive: false };
    expect(shownMood(night, gone)).toBe("gone");
  });
});

describe("level rewards", () => {
  it("pays more for every level climbed", () => {
    expect(coinsForLevel(200, 1)).toBe(coinsForGoal(200));
    expect(coinsForLevel(200, 2)).toBe(coinsForGoal(200) + LEVEL_COINS);
    expect(coinsForLevel(200, 3)).toBe(coinsForGoal(200) + 2 * LEVEL_COINS);
  });

  it("pays the level step on a won session", () => {
    const win = { won: true, goalEnabled: true, goal: 300, points: 300, level: 2 };
    expect(sessionReward(NEW_STABLE, win, T0)!.coins).toBe(coinsForGoal(300) + LEVEL_COINS);
  });
});
