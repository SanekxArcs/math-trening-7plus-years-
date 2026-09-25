/**
 * Pets: a small tamagotchi paid for with maths.
 *
 * Pure like the rest of the engine — every function takes `now` and returns a
 * new value, so the whole economy can be tested against a fake clock and
 * tuned from this one file.
 *
 * The balance, in one paragraph: a level-1 win plus the once-a-day bonus is
 * 15 coins, and keeping one pet fed, clean and cheerful for a day costs 11 to
 * 15. One short session a day keeps a pet well; a second builds savings. Every
 * pet owned needs that every day, so a second pet is a real decision — twice
 * the care for twice the fun — not a free upgrade. Needs are capped at 100, so
 * no amount of play on Sunday feeds anyone through Wednesday. Left completely
 * alone, a pet is hungry after a day and a half, sick after two, and gone
 * after three and a half to four: a weekend away hurts, a week away does not
 * survive without the grown-ups' vacation switch.
 */

const HOUR = 60 * 60 * 1000;

/** The needs that fall on their own. 100 is full, clean and cheerful. */
export type Need = "food" | "clean" | "happy";

/** Everything with a bar. Health only falls when a need is neglected. */
export type Stat = Need | "health";

export type Species = "horse" | "cat" | "dog" | "bunny" | "unicorn";

export interface SpeciesInfo {
  emoji: string;
  /** 0 for the starter, which is adopted rather than bought. */
  price: number;
  /** How much each need drops in a day. The species' personality, in numbers. */
  decay: Record<Need, number>;
  /** Item ids from SHOP this pet eats and plays with. Care and vet are for everyone. */
  menu: readonly string[];
}

/**
 * The cat washes itself, the puppy wants playing with, the bunny never stops
 * eating, and the unicorn — the thing to save up for — is magic and easy.
 */
export const SPECIES: Record<Species, SpeciesInfo> = {
  horse: {
    emoji: "🐴",
    price: 0,
    decay: { food: 50, clean: 35, happy: 40 },
    menu: ["hay", "carrot", "apple", "oats", "sweet"],
  },
  cat: {
    emoji: "🐈",
    price: 60,
    decay: { food: 50, clean: 20, happy: 45 },
    menu: ["kibble", "milk", "shrimp", "fish", "yarn"],
  },
  dog: {
    emoji: "🐶",
    price: 80,
    decay: { food: 55, clean: 40, happy: 45 },
    menu: ["kibble", "bone", "sausage", "meat", "ball"],
  },
  bunny: {
    emoji: "🐰",
    price: 100,
    decay: { food: 60, clean: 25, happy: 35 },
    menu: ["hay", "carrot", "apple", "lettuce", "strawberry"],
  },
  unicorn: {
    emoji: "🦄",
    price: 250,
    decay: { food: 35, clean: 30, happy: 35 },
    menu: ["hay", "carrot", "apple", "cupcake", "sweet"],
  },
};

export const SPECIES_ORDER: readonly Species[] = ["horse", "cat", "dog", "bunny", "unicorn"];

export function isSpecies(value: unknown): value is Species {
  return typeof value === "string" && value in SPECIES;
}

/** Below this a need counts as neglected and starts costing health. */
export const LOW = 25;

/**
 * Health per hour. A need that is low hurts a little, one that is empty hurts
 * a lot, and a pet that is fed and clean heals by itself — medicine is a
 * shortcut, never the only way back.
 */
export const HEALTH_LOSS_LOW = 0.5;
export const HEALTH_LOSS_EMPTY = 2;
export const HEALTH_GAIN = 1;
/** Food and cleanliness both at least this, and health comes back on its own. */
export const HEAL_ABOVE = 50;

/** Happiness is left out of health on purpose: a sad pet is sad, not dying. */
const VITAL: readonly Need[] = ["food", "clean"];

/** Coins in the pocket on a fresh install, so the shop can be tried at once. */
export const STARTING_COINS = 10;
/** Extra coins for the first win of each calendar day. */
export const DAILY_BONUS = 5;
/** One coin for every this many points of goal. */
export const POINTS_PER_COIN = 20;
export const REVIVE_PRICE = 100;
/** What a revived pet comes back with — alive, but in need of looking after. */
export const REVIVE_LEVEL = 50;
/** Free cuddles, but not unlimited ones — otherwise happiness costs nothing. */
export const PET_COOLDOWN_MS = HOUR;
export const PET_HAPPY = 5;

export interface Pet {
  /** The species doubles as the id: one of each kind. */
  id: Species;
  species: Species;
  name: string;
  food: number;
  clean: number;
  happy: number;
  health: number;
  alive: boolean;
  /** Epoch ms the stats above were last brought up to date. */
  updatedAt: number;
  diedAt: number | null;
  /** Everything frozen: set by a grown-up for holidays and sick days. */
  vacation: boolean;
  lastPettedAt: number;
}

export interface Stable {
  coins: number;
  /** Local calendar day ("2026-09-25") the daily bonus was last paid. */
  lastBonusDay: string | null;
  /** Empty until the child first visits and names their horse. */
  pets: Pet[];
  /** The pet on screen. Null only while there are no pets. */
  activeId: Species | null;
  /**
   * Epoch ms of the last change, 0 for a stable nobody has touched. What
   * decides which copy wins when the device and the backup disagree.
   */
  savedAt: number;
}

export const NEW_STABLE: Stable = {
  coins: STARTING_COINS,
  lastBonusDay: null,
  pets: [],
  activeId: null,
  savedAt: 0,
};

export type ItemKind = "food" | "play" | "care" | "vet";

export interface ShopItem {
  id: string;
  emoji: string;
  kind: ItemKind;
  price: number;
  effect: Partial<Record<Stat, number>>;
}

/**
 * Every menu follows the same five price points — a cheap filler, a small
 * treat, a bigger treat, a big meal and a toy — so no pet is cheaper to feed
 * by accident, and nothing is a strictly worse buy than something else.
 */
export const SHOP: readonly ShopItem[] = [
  { id: "hay", emoji: "🌾", kind: "food", price: 2, effect: { food: 25 } },
  { id: "kibble", emoji: "🥫", kind: "food", price: 2, effect: { food: 25 } },
  { id: "carrot", emoji: "🥕", kind: "food", price: 3, effect: { food: 10, happy: 10 } },
  { id: "milk", emoji: "🥛", kind: "food", price: 3, effect: { food: 10, happy: 10 } },
  { id: "bone", emoji: "🦴", kind: "food", price: 3, effect: { food: 10, happy: 10 } },
  { id: "apple", emoji: "🍎", kind: "food", price: 4, effect: { food: 15, happy: 15 } },
  { id: "shrimp", emoji: "🍤", kind: "food", price: 4, effect: { food: 15, happy: 15 } },
  { id: "sausage", emoji: "🌭", kind: "food", price: 4, effect: { food: 15, happy: 15 } },
  { id: "oats", emoji: "🥣", kind: "food", price: 5, effect: { food: 45 } },
  { id: "fish", emoji: "🐟", kind: "food", price: 5, effect: { food: 45 } },
  { id: "meat", emoji: "🍖", kind: "food", price: 5, effect: { food: 45 } },
  { id: "lettuce", emoji: "🥬", kind: "food", price: 5, effect: { food: 45 } },
  { id: "cupcake", emoji: "🧁", kind: "food", price: 5, effect: { food: 45 } },
  { id: "sweet", emoji: "🍬", kind: "play", price: 4, effect: { happy: 25 } },
  { id: "yarn", emoji: "🧶", kind: "play", price: 4, effect: { happy: 25 } },
  { id: "ball", emoji: "🎾", kind: "play", price: 4, effect: { happy: 25 } },
  { id: "strawberry", emoji: "🍓", kind: "play", price: 4, effect: { happy: 25 } },
  { id: "sponge", emoji: "🧽", kind: "care", price: 2, effect: { clean: 20, happy: 10 } },
  { id: "bath", emoji: "🚿", kind: "care", price: 5, effect: { clean: 60 } },
  { id: "medicine", emoji: "💊", kind: "vet", price: 12, effect: { health: 40 } },
];

export function findItem(id: string): ShopItem | undefined {
  return SHOP.find((item) => item.id === id);
}

/** What this pet can be given, in shop order. */
export function itemsFor(species: Species): ShopItem[] {
  const menu = SPECIES[species].menu;
  return SHOP.filter(
    (item) => item.kind === "care" || item.kind === "vet" || menu.includes(item.id),
  );
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function newPet(species: Species, name: string, now: number): Pet {
  return {
    id: species,
    species,
    name,
    food: 80,
    clean: 80,
    happy: 80,
    health: 100,
    alive: true,
    updatedAt: now,
    diedAt: null,
    vacation: false,
    lastPettedAt: 0,
  };
}

export function findPet(stable: Stable, id: Species | null): Pet | undefined {
  return id === null ? undefined : stable.pets.find((pet) => pet.id === id);
}

export function activePet(stable: Stable): Pet | undefined {
  return findPet(stable, stable.activeId) ?? stable.pets[0];
}

function withPet(stable: Stable, pet: Pet): Stable {
  return { ...stable, pets: stable.pets.map((each) => (each.id === pet.id ? pet : each)) };
}

function healthRate(pet: Pet): number {
  const worst = Math.min(...VITAL.map((need) => pet[need]));
  if (worst <= 0) return -HEALTH_LOSS_EMPTY;
  if (worst < LOW) return -HEALTH_LOSS_LOW;
  if (worst >= HEAL_ABOVE) return HEALTH_GAIN;
  return 0;
}

/**
 * Brings a pet up to `now`.
 *
 * Stepped an hour at a time rather than solved in one go, because health's
 * rate depends on the needs and the needs keep moving: a pet left for three
 * days spent the first day fine, the second going hungry and the third getting
 * sick, and a single jump would charge it the third day's rate for all three.
 * The loop is bounded by death, which always comes within about a hundred
 * steps of neglect.
 */
export function tick(pet: Pet, now: number): Pet {
  // A clock set backwards gets no refund, and a paused or lost pet does not
  // change — but the timestamp moves, so turning vacation off does not charge
  // for the holiday afterwards.
  if (now <= pet.updatedAt) return pet;
  if (!pet.alive || pet.vacation) return { ...pet, updatedAt: now };

  const decay = SPECIES[pet.species].decay;
  let next = { ...pet };
  let t = pet.updatedAt;
  while (t < now) {
    const step = Math.min(HOUR, now - t);
    const hours = step / HOUR;

    const health = clamp(next.health + healthRate(next) * hours);
    next = {
      ...next,
      food: clamp(next.food - (decay.food / 24) * hours),
      clean: clamp(next.clean - (decay.clean / 24) * hours),
      happy: clamp(next.happy - (decay.happy / 24) * hours),
      health,
    };
    t += step;

    if (health <= 0) {
      return { ...next, alive: false, diedAt: t, updatedAt: now };
    }
  }
  return { ...next, updatedAt: now };
}

export function tickAll(stable: Stable, now: number): Stable {
  return { ...stable, pets: stable.pets.map((pet) => tick(pet, now)) };
}

export type BuyRefusal = "noPet" | "gone" | "notForThisPet" | "coins" | "full";

/**
 * Why an item cannot be given to this pet right now, or null if it can.
 * "full" stops a child spending coins on something that would change nothing
 * — a bath for a pet that is already spotless is a lesson in the wrong thing.
 */
export function whyNot(stable: Stable, petId: Species, item: ShopItem): BuyRefusal | null {
  const pet = findPet(stable, petId);
  if (!pet) return "noPet";
  if (!pet.alive) return "gone";
  if (!itemsFor(pet.species).includes(item)) return "notForThisPet";
  const helps = Object.keys(item.effect).some((stat) => pet[stat as Stat] < 100);
  if (!helps) return "full";
  if (stable.coins < item.price) return "coins";
  return null;
}

export function buy(stable: Stable, petId: Species, itemId: string, now: number): Stable {
  const item = findItem(itemId);
  const found = findPet(stable, petId);
  if (!item || !found) return stable;
  const ticked = tick(found, now);
  const current = withPet(stable, ticked);
  if (whyNot(current, petId, item) !== null) return current;

  const pet = { ...ticked };
  for (const [stat, amount] of Object.entries(item.effect)) {
    pet[stat as Stat] = clamp(pet[stat as Stat] + (amount ?? 0));
  }
  return { ...withPet(current, pet), coins: current.coins - item.price };
}

export function canPet(pet: Pet, now: number): boolean {
  return pet.alive && now - pet.lastPettedAt >= PET_COOLDOWN_MS;
}

export function cuddle(stable: Stable, petId: Species, now: number): Stable {
  const found = findPet(stable, petId);
  if (!found) return stable;
  const pet = tick(found, now);
  if (!canPet(pet, now)) return withPet(stable, pet);
  return withPet(stable, { ...pet, happy: clamp(pet.happy + PET_HAPPY), lastPettedAt: now });
}

export function revive(stable: Stable, petId: Species, now: number): Stable {
  const pet = findPet(stable, petId);
  if (!pet || pet.alive || stable.coins < REVIVE_PRICE) return stable;
  return {
    ...withPet(stable, {
      ...pet,
      food: REVIVE_LEVEL,
      clean: REVIVE_LEVEL,
      happy: REVIVE_LEVEL,
      health: REVIVE_LEVEL,
      alive: true,
      diedAt: null,
      updatedAt: now,
    }),
    coins: stable.coins - REVIVE_PRICE,
  };
}

export type AdoptRefusal = "owned" | "coins";

export function whyNotAdopt(stable: Stable, species: Species): AdoptRefusal | null {
  if (stable.pets.some((pet) => pet.species === species)) return "owned";
  // The very first pet is always the free one, whatever its price tag.
  const price = stable.pets.length === 0 ? 0 : SPECIES[species].price;
  if (stable.coins < price) return "coins";
  return null;
}

/**
 * A new pet joins the family and becomes the one on screen. It arrives with
 * the vacation switch matching the others, so a grown-up's holiday covers it
 * too.
 */
export function adopt(stable: Stable, species: Species, name: string, now: number): Stable {
  if (whyNotAdopt(stable, species) !== null) return stable;
  const price = stable.pets.length === 0 ? 0 : SPECIES[species].price;
  const vacation = stable.pets.some((pet) => pet.vacation);
  const pet = { ...newPet(species, name, now), vacation };
  return {
    ...stable,
    coins: stable.coins - price,
    pets: [...stable.pets, pet],
    activeId: species,
  };
}

export function choose(stable: Stable, petId: Species): Stable {
  if (!findPet(stable, petId) || stable.activeId === petId) return stable;
  return { ...stable, activeId: petId };
}

/** One switch for the whole family: a holiday is a holiday for everyone. */
export function setVacation(stable: Stable, on: boolean, now: number): Stable {
  if (stable.pets.length === 0) return stable;
  // Settle up to this moment first, under the old rule: time before the switch
  // was flipped still counts, time after it does not.
  return {
    ...stable,
    pets: stable.pets.map((pet) => ({ ...tick(pet, now), vacation: on })),
  };
}

export function onVacation(stable: Stable): boolean {
  return stable.pets.length > 0 && stable.pets.every((pet) => pet.vacation);
}

/** The local calendar day, so "first win of the day" means the child's day. */
export function dayKey(now: number): string {
  const date = new Date(now);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Coins for a level won. Proportional to the goal, so a bigger level pays
 * more but not more per minute: the child is paid for maths done, and moving
 * up is never a way to earn less.
 */
export function coinsForGoal(goal: number): number {
  return Math.max(1, Math.round(goal / POINTS_PER_COIN));
}

export interface Reward {
  coins: number;
  bonus: number;
}

export interface SessionEnd {
  won: boolean;
  goalEnabled: boolean;
  /** The goal the level was played to. */
  goal: number;
  points: number;
}

/**
 * What a finished session pays, or null for nothing.
 *
 * A level won pays by its goal. Stopping early pays nothing — otherwise
 * "finish for now" and start again would be a way round the level. The one
 * exception is a game with the goal switched off, where there is no level to
 * win at all: there the points themselves are paid out at the same rate, so a
 * parent turning the goal off does not quietly starve the pets.
 */
export function sessionReward(stable: Stable, session: SessionEnd, now: number): Reward | null {
  const coins = session.won
    ? coinsForGoal(session.goal)
    : session.goalEnabled
      ? 0
      : Math.floor(session.points / POINTS_PER_COIN);
  if (coins <= 0) return null;
  return { coins, bonus: stable.lastBonusDay === dayKey(now) ? 0 : DAILY_BONUS };
}

export function payReward(stable: Stable, reward: Reward, now: number): Stable {
  return {
    ...stable,
    coins: stable.coins + reward.coins + reward.bonus,
    lastBonusDay: reward.bonus > 0 ? dayKey(now) : stable.lastBonusDay,
  };
}

/**
 * The one thing the pet would say if it could, most urgent first. Drives the
 * face, the message under it and the nudges elsewhere.
 */
export type Mood = "gone" | "vacation" | "sick" | "hungry" | "dirty" | "sad" | "happy" | "ok";

export function moodOf(pet: Pet): Mood {
  if (!pet.alive) return "gone";
  if (pet.vacation) return "vacation";
  if (pet.health < 50) return "sick";
  if (pet.food < LOW) return "hungry";
  if (pet.clean < LOW) return "dirty";
  if (pet.happy < LOW) return "sad";
  if (pet.food >= 70 && pet.clean >= 70 && pet.happy >= 70) return "happy";
  return "ok";
}

/** Worth a nudge: something is low, or worse. */
export function needsCare(pet: Pet): boolean {
  const mood = moodOf(pet);
  return mood === "gone" || mood === "sick" || mood === "hungry" || mood === "dirty" || mood === "sad";
}

/** The first pet that needs looking after, for the game screen's nudge. */
export function petNeedingCare(stable: Stable): Pet | undefined {
  return stable.pets.find(needsCare);
}
