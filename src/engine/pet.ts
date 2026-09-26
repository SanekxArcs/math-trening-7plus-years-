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
 *
 * Above the care sits the wardrobe: hats, collars, glasses, capes and whole new
 * homes, bought one pet at a time and priced in days and weeks of saving, not
 * minutes. They change nothing about the needs — care always comes first — so
 * they are what the savings are for, and the wish list keeps the next one in
 * sight. Two free things keep the pets lively between purchases: a cuddle an
 * hour, and a short catching game every couple of hours.
 */

const HOUR = 60 * 60 * 1000;

/** The needs that fall on their own. 100 is full, clean and cheerful. */
export type Need = "food" | "clean" | "happy";

/** Everything with a bar. Health only falls when a need is neglected. */
export type Stat = Need | "health";

export type Species = "horse" | "cat" | "dog" | "bunny" | "unicorn" | "tiger";

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
  // The goofy blue tiger from the demon-hunter idols' world: the dearest pet,
  // always hungry for ramyeon and always up for a game.
  tiger: {
    emoji: "🐯",
    price: 300,
    decay: { food: 55, clean: 30, happy: 45 },
    menu: ["kibble", "milk", "sausage", "ramyeon", "yarn"],
  },
};

export const SPECIES_ORDER: readonly Species[] = ["horse", "cat", "dog", "bunny", "unicorn", "tiger"];

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
/** Extra coins for each level above the first: climbing is worth it on its own. */
export const LEVEL_COINS = 5;
export const REVIVE_PRICE = 100;
/** What a revived pet comes back with — alive, but in need of looking after. */
export const REVIVE_LEVEL = 50;
/** Free cuddles, but not unlimited ones — otherwise happiness costs nothing. */
export const PET_COOLDOWN_MS = HOUR;
export const PET_HAPPY = 5;

/** The catching game: free, short, and not on tap all day. */
export const PLAY_COOLDOWN_MS = 2 * HOUR;
export const PLAY_ROUND_MS = 20_000;
export const PLAY_HAPPY_PER_CATCH = 2;
export const PLAY_HAPPY_MAX = 30;

/** A new thing to wear is exciting, whatever the pet's day was like. */
export const ACCESSORY_JOY = 40;

/** Where an accessory goes. "home" is the scene the pet stands in. */
export type Slot = "hat" | "neck" | "face" | "back" | "home";
export const SLOTS: readonly Slot[] = ["hat", "neck", "face", "back", "home"];

/** One of each slot at a time; ids from ACCESSORIES. */
export type Worn = Partial<Record<Slot, string>>;

export interface Accessory {
  id: string;
  slot: Slot;
  price: number;
  /** Left out for things every pet can wear. */
  only?: readonly Species[];
  /** A themed set, gathered on a tab of its own in the wardrobe. */
  collection?: Collection;
}

/** The K-pop demon hunters' things: idol gear, hunter gear, their world. */
export type Collection = "kpop";

/**
 * The wardrobe, cheapest first within each slot. The cheapest is two or three
 * days of saving next to a pet's care; the dearest are weeks — a crown or a
 * trip to space is meant to be worked towards and remembered, and every pet
 * has its own wardrobe, so a second pet means a second collection.
 */
export const ACCESSORIES: readonly Accessory[] = [
  { id: "bow", slot: "hat", price: 40 },
  { id: "partyHat", slot: "hat", price: 60 },
  { id: "flowerCrown", slot: "hat", price: 90 },
  { id: "cowboyHat", slot: "hat", price: 140 },
  { id: "wizardHat", slot: "hat", price: 220 },
  { id: "crown", slot: "hat", price: 400 },
  { id: "micHeadset", slot: "hat", price: 120, collection: "kpop" },
  { id: "gat", slot: "hat", price: 180, collection: "kpop" },
  { id: "magpie", slot: "hat", price: 260, collection: "kpop" },
  { id: "bandana", slot: "neck", price: 45 },
  { id: "bell", slot: "neck", price: 70 },
  { id: "bowTie", slot: "neck", price: 100 },
  { id: "pearls", slot: "neck", price: 160 },
  { id: "medal", slot: "neck", price: 260 },
  { id: "goldenNecklace", slot: "neck", price: 220, collection: "kpop" },
  { id: "roundGlasses", slot: "face", price: 80 },
  { id: "sunglasses", slot: "face", price: 120 },
  { id: "heartGlasses", slot: "face", price: 180 },
  { id: "starShades", slot: "face", price: 150, collection: "kpop" },
  { id: "saddle", slot: "back", price: 150, only: ["horse", "unicorn"] },
  { id: "cape", slot: "back", price: 200 },
  { id: "wings", slot: "back", price: 320 },
  { id: "hunterSword", slot: "back", price: 350, collection: "kpop" },
  { id: "beach", slot: "home", price: 150 },
  { id: "snow", slot: "home", price: 200 },
  { id: "candy", slot: "home", price: 280 },
  { id: "castle", slot: "home", price: 380 },
  { id: "space", slot: "home", price: 500 },
  { id: "seoul", slot: "home", price: 400, collection: "kpop" },
  { id: "stage", slot: "home", price: 450, collection: "kpop" },
];

export function findAccessory(id: string): Accessory | undefined {
  return ACCESSORIES.find((item) => item.id === id);
}

/** What this pet can wear, in wardrobe order. */
export function accessoriesFor(species: Species): Accessory[] {
  return ACCESSORIES.filter((item) => !item.only || item.only.includes(species));
}

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
  /** Epoch ms of the last catching game, 0 for never. */
  lastPlayedAt: number;
  /** Accessory ids bought for this pet. Kept forever, worn or not. */
  owned: string[];
  worn: Worn;
}

/** The one thing being saved up for, shown with how far there is to go. */
export interface Wish {
  petId: Species;
  itemId: string;
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
  /**
   * Epoch ms the child finished for the day and the pets went to bed; null
   * while they are up. Cleared by the next answer given.
   */
  asleepSince: number | null;
  wish: Wish | null;
}

export const NEW_STABLE: Stable = {
  coins: STARTING_COINS,
  lastBonusDay: null,
  pets: [],
  activeId: null,
  savedAt: 0,
  asleepSince: null,
  wish: null,
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
  { id: "ramyeon", emoji: "🍜", kind: "food", price: 5, effect: { food: 45 } },
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
    lastPlayedAt: 0,
    owned: [],
    worn: {},
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

export function canPlay(pet: Pet, now: number): boolean {
  return pet.alive && now - pet.lastPlayedAt >= PLAY_COOLDOWN_MS;
}

/** What a round of the catching game is worth, capped so it never replaces care. */
export function playJoy(caught: number): number {
  return Math.min(PLAY_HAPPY_MAX, Math.max(0, Math.floor(caught)) * PLAY_HAPPY_PER_CATCH);
}

/**
 * A round of the catching game played. The cooldown starts when it is paid,
 * not when it begins, so a round cut short by leaving the screen costs
 * nothing and pays nothing.
 */
export function finishPlay(stable: Stable, petId: Species, caught: number, now: number): Stable {
  const found = findPet(stable, petId);
  if (!found) return stable;
  const pet = tick(found, now);
  if (!canPlay(pet, now)) return withPet(stable, pet);
  return withPet(stable, { ...pet, happy: clamp(pet.happy + playJoy(caught)), lastPlayedAt: now });
}

export type DressRefusal = "noPet" | "gone" | "notForThisPet" | "owned" | "coins";

/** Why this pet cannot have this accessory bought for it, or null if it can. */
export function whyNotDress(stable: Stable, petId: Species, item: Accessory): DressRefusal | null {
  const pet = findPet(stable, petId);
  if (!pet) return "noPet";
  if (!pet.alive) return "gone";
  if (!accessoriesFor(pet.species).includes(item)) return "notForThisPet";
  if (pet.owned.includes(item.id)) return "owned";
  if (stable.coins < item.price) return "coins";
  return null;
}

/** Bought, put on at once — nobody saves for a crown to keep it in a drawer. */
export function buyAccessory(stable: Stable, petId: Species, itemId: string, now: number): Stable {
  const item = findAccessory(itemId);
  const found = findPet(stable, petId);
  if (!item || !found) return stable;
  const ticked = tick(found, now);
  const current = withPet(stable, ticked);
  if (whyNotDress(current, petId, item) !== null) return current;

  const pet: Pet = {
    ...ticked,
    owned: [...ticked.owned, item.id],
    worn: { ...ticked.worn, [item.slot]: item.id },
    happy: clamp(ticked.happy + ACCESSORY_JOY),
  };
  const fulfilled = current.wish?.petId === petId && current.wish.itemId === itemId;
  return {
    ...withPet(current, pet),
    coins: current.coins - item.price,
    wish: fulfilled ? null : current.wish,
  };
}

/** Puts an owned accessory on, or takes it off if it is already on. Free, as often as liked. */
export function toggleWear(stable: Stable, petId: Species, itemId: string): Stable {
  const item = findAccessory(itemId);
  const pet = findPet(stable, petId);
  if (!item || !pet || !pet.alive || !pet.owned.includes(itemId)) return stable;
  const worn = { ...pet.worn };
  if (worn[item.slot] === itemId) delete worn[item.slot];
  else worn[item.slot] = itemId;
  return withPet(stable, { ...pet, worn });
}

/** Picks the thing to save for, or clears it with null. Owned things are not wished for. */
export function setWish(stable: Stable, petId: Species, itemId: string | null): Stable {
  if (itemId === null) return stable.wish === null ? stable : { ...stable, wish: null };
  const item = findAccessory(itemId);
  const pet = findPet(stable, petId);
  if (!item || !pet || pet.owned.includes(itemId) || !accessoriesFor(pet.species).includes(item)) {
    return stable;
  }
  if (stable.wish?.petId === petId && stable.wish.itemId === itemId) return stable;
  return { ...stable, wish: { petId, itemId } };
}

/** The wish as something to draw, or null if there is none worth showing. */
export function wishProgress(stable: Stable): { pet: Pet; item: Accessory; have: number; ready: boolean } | null {
  const wish = stable.wish;
  if (!wish) return null;
  const pet = findPet(stable, wish.petId);
  const item = findAccessory(wish.itemId);
  if (!pet || !item || pet.owned.includes(item.id)) return null;
  const have = Math.min(stable.coins, item.price);
  return { pet, item, have, ready: stable.coins >= item.price };
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

/**
 * Bedtime: "finish for today" puts the pets to sleep, and the next sum solved
 * wakes them. It is a ritual, not a pause — needs keep falling while they
 * sleep, exactly as they would awake. Freezing them would let a child stop
 * playing and never have a pet go hungry, which is the one thing the economy
 * above is built to prevent. Only the grown-ups' vacation switch stops time.
 */
export function putToSleep(stable: Stable, now: number): Stable {
  if (stable.pets.length === 0 || stable.asleepSince !== null) return stable;
  return { ...stable, asleepSince: now };
}

export function wakeUp(stable: Stable): Stable {
  if (stable.asleepSince === null) return stable;
  return { ...stable, asleepSince: null };
}

export function isAsleep(stable: Stable): boolean {
  return stable.asleepSince !== null && stable.pets.length > 0;
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

/**
 * Coins for winning a given level: the goal's worth, plus a flat step for
 * every level climbed. The goal already grows with the level, but by itself
 * that only pays for the extra maths; the step is the prize for moving up.
 */
export function coinsForLevel(goal: number, level: number): number {
  return coinsForGoal(goal) + LEVEL_COINS * Math.max(0, Math.floor(level) - 1);
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
  /** The level played; 1 when left out. */
  level?: number;
}

/**
 * What a finished session pays, or null for nothing.
 *
 * A level won pays by its goal and its level. Stopping early pays nothing — otherwise
 * "finish for now" and start again would be a way round the level. The one
 * exception is a game with the goal switched off, where there is no level to
 * win at all: there the points themselves are paid out at the same rate, so a
 * parent turning the goal off does not quietly starve the pets.
 */
export function sessionReward(stable: Stable, session: SessionEnd, now: number): Reward | null {
  const coins = session.won
    ? coinsForLevel(session.goal, session.level ?? 1)
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
export type Mood =
  | "gone"
  | "vacation"
  | "asleep"
  | "sick"
  | "hungry"
  | "dirty"
  | "sad"
  | "happy"
  | "ok";

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

/**
 * The face to draw: the pet's own mood, unless the whole stable has gone to
 * bed. Kept apart from `moodOf` so the nudges still know a sleeping pet is
 * hungry — it will be the moment it wakes.
 */
export function shownMood(stable: Stable, pet: Pet): Mood {
  const mood = moodOf(pet);
  if (mood === "gone" || mood === "vacation") return mood;
  return isAsleep(stable) ? "asleep" : mood;
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
