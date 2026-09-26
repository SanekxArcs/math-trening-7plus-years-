import type { Slot, Species } from "@/engine";
import type { TranslationKey } from "@/i18n/translations";

/** What each thing in the pets' world is called, as a translation key. */

export const SPECIES_NAME: Record<Species, TranslationKey> = {
  horse: "speciesHorse",
  cat: "speciesCat",
  dog: "speciesDog",
  bunny: "speciesBunny",
  unicorn: "speciesUnicorn",
  tiger: "speciesTiger",
};

export const DEFAULT_NAME: Record<Species, TranslationKey> = {
  horse: "horseNamePlaceholder",
  cat: "catNamePlaceholder",
  dog: "dogNamePlaceholder",
  bunny: "bunnyNamePlaceholder",
  unicorn: "unicornNamePlaceholder",
  tiger: "tigerNamePlaceholder",
};

/** What a tapped pet says back. */
export const SPECIES_SAYS: Record<Species, TranslationKey> = {
  horse: "saysHorse",
  cat: "saysCat",
  dog: "saysDog",
  bunny: "saysBunny",
  unicorn: "saysUnicorn",
  tiger: "saysTiger",
};

export const ITEM_NAME: Record<string, TranslationKey> = {
  hay: "itemHay",
  kibble: "itemKibble",
  carrot: "itemCarrot",
  milk: "itemMilk",
  bone: "itemBone",
  apple: "itemApple",
  shrimp: "itemShrimp",
  sausage: "itemSausage",
  oats: "itemOats",
  fish: "itemFish",
  meat: "itemMeat",
  lettuce: "itemLettuce",
  cupcake: "itemCupcake",
  ramyeon: "itemRamyeon",
  sweet: "itemSweet",
  yarn: "itemYarn",
  ball: "itemBall",
  strawberry: "itemStrawberry",
  sponge: "itemSponge",
  bath: "itemBath",
  medicine: "itemMedicine",
};

export const ACCESSORY_NAME: Record<string, TranslationKey> = {
  bow: "accBow",
  partyHat: "accPartyHat",
  flowerCrown: "accFlowerCrown",
  cowboyHat: "accCowboyHat",
  wizardHat: "accWizardHat",
  crown: "accCrown",
  bandana: "accBandana",
  bell: "accBell",
  bowTie: "accBowTie",
  pearls: "accPearls",
  medal: "accMedal",
  roundGlasses: "accRoundGlasses",
  sunglasses: "accSunglasses",
  heartGlasses: "accHeartGlasses",
  saddle: "accSaddle",
  cape: "accCape",
  wings: "accWings",
  beach: "accBeach",
  snow: "accSnow",
  candy: "accCandy",
  castle: "accCastle",
  space: "accSpace",
  micHeadset: "accMicHeadset",
  gat: "accGat",
  magpie: "accMagpie",
  goldenNecklace: "accGoldenNecklace",
  starShades: "accStarShades",
  hunterSword: "accHunterSword",
  seoul: "accSeoul",
  stage: "accStage",
};

export const SLOT_NAME: Record<Slot, TranslationKey> = {
  hat: "slotHat",
  neck: "slotNeck",
  face: "slotFace",
  back: "slotBack",
  home: "slotHome",
};
