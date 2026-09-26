import { useState } from "react";
import { AnimatePresence, motion, type MotionStyle } from "motion/react";
import { Check, Star } from "lucide-react";
import {
  SLOTS,
  accessoriesFor,
  setWish,
  whyNotDress,
  wishProgress,
  type Accessory,
  type Collection,
  type Pet,
  type Slot,
  type Stable,
} from "@/engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { updateStable } from "@/game/useStable";
import { Backdrop, GameDialog, ghostActionClass, primaryActionClass, secondaryActionClass } from "@/game/GameDialog";
import { CoinIcon } from "./CoinCount";
import { PetArt } from "./PetArt";
import { Scene, ScenePreview } from "./Scene";
import { AccessoryPreview } from "./art/accessories";
import { ACCESSORY_NAME, SLOT_NAME } from "./names";

/** A wardrobe tab: one slot, or a themed collection gathered from all of them. */
type Shelf = Slot | Collection;

/** A hue per slot, from the answer-tile palette. */
const SLOT_HUE: Record<Slot, string> = {
  hat: "var(--option-3)",
  neck: "var(--option-0)",
  face: "var(--option-2)",
  back: "var(--option-4)",
  home: "var(--option-5)",
};

/**
 * The wardrobe: everything this pet can wear, a slot at a time. Owned things
 * go on and off with a tap, as often as liked — dressing up is free play.
 * Anything not owned yet opens the try-on, which is where it is bought or
 * wished for; nothing this dear is ever one stray tap away.
 */
export function Wardrobe({
  stable,
  pet,
  onTry,
  onToggle,
}: {
  stable: Stable;
  pet: Pet;
  onTry: (item: Accessory) => void;
  onToggle: (item: Accessory) => void;
}) {
  const { t } = useI18n();
  const items = accessoriesFor(pet.species);
  // The K-pop shelf comes first and opens first: it is the one asked for.
  const shelves: Shelf[] = [
    ...(items.some((item) => item.collection === "kpop") ? (["kpop"] as const) : []),
    ...SLOTS.filter((each) => items.some((item) => item.slot === each)),
  ];
  const [shelf, setShelf] = useState<Shelf>(shelves[0] ?? "hat");
  const onShelf = (item: Accessory, each: Shelf) => (each === "kpop" ? item.collection === each : item.slot === each);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("wardrobeBlurb", { name: pet.name })}</p>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist">
        {shelves.map((each) => {
          const on = each === shelf;
          const count = items.filter((item) => onShelf(item, each) && pet.owned.includes(item.id)).length;
          const kpop = each === "kpop";
          return (
            <button
              key={each}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setShelf(each)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border-b-4 px-3.5 py-1.5 font-display text-sm font-bold transition-colors focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none",
                on
                  ? kpop
                    ? "border-black/20 bg-linear-to-r from-fuchsia-500 via-violet-500 to-amber-400 text-white shadow-[0_4px_14px_-4px_var(--color-fuchsia-500)]"
                    : "border-black/20 bg-linear-to-b from-primary to-primary/80 text-primary-foreground"
                  : kpop
                    ? "border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-700 hover:bg-fuchsia-500/25 dark:text-fuchsia-300"
                    : "border-black/10 bg-muted/70 text-foreground hover:bg-muted",
              )}
            >
              {kpop ? `✨ ${t("collectionKpop")}` : t(SLOT_NAME[each])}
              {count > 0 && (
                <span className={cn("rounded-full px-1.5 text-xs tabular-nums", on ? "bg-white/25" : "bg-card")}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-x-2.5 gap-y-3.5 sm:grid-cols-4">
        {items
          .filter((item) => onShelf(item, shelf))
          .map((item, index) => (
            <AccessoryTile
              key={item.id}
              item={item}
              index={index}
              themed={shelf !== "kpop" && item.collection === "kpop"}
              owned={pet.owned.includes(item.id)}
              worn={pet.worn[item.slot] === item.id}
              wished={stable.wish?.petId === pet.id && stable.wish.itemId === item.id}
              coins={stable.coins}
              onPress={() => (pet.owned.includes(item.id) ? onToggle(item) : onTry(item))}
            />
          ))}
      </div>
    </div>
  );
}

function AccessoryTile({
  item,
  index,
  themed,
  owned,
  worn,
  wished,
  coins,
  onPress,
}: {
  item: Accessory;
  index: number;
  /** Part of a collection, shown on a plain slot shelf: marked so it stands out. */
  themed: boolean;
  owned: boolean;
  worn: boolean;
  wished: boolean;
  coins: number;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const name = t(ACCESSORY_NAME[item.id] ?? "accBow");
  const affordable = coins >= item.price;
  return (
    <motion.button
      type="button"
      onClick={onPress}
      aria-pressed={owned ? worn : undefined}
      aria-label={owned ? `${name}, ${worn ? t("takeOff") : t("wear")}` : t("buyItem", { item: name, price: item.price })}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileTap={{ scale: 0.92, rotate: -3 }}
      className={cn(
        "answer-tile flex flex-col items-center gap-1 px-1.5 pb-2 pt-2.5",
        worn && "outline-4 outline-offset-2 outline-correct",
      )}
      style={{ "--tile": SLOT_HUE[item.slot] } as MotionStyle}
    >
      {wished && (
        <Star className="absolute right-1.5 top-1.5 z-10 size-4 fill-combo text-combo drop-shadow" aria-hidden />
      )}
      {themed && (
        <span className="absolute left-1.5 top-1 z-10 text-sm drop-shadow" aria-hidden>
          ✨
        </span>
      )}
      {item.slot === "home" ? (
        <ScenePreview home={item.id} className="relative h-12 w-16 rounded-md shadow-inner" />
      ) : (
        <AccessoryPreview id={item.id} slot={item.slot} className="relative h-12 w-14 drop-shadow-sm" />
      )}
      <span className="relative text-xs font-bold leading-tight text-foreground">{name}</span>
      <span
        className={cn(
          "relative flex items-center gap-1 rounded-full px-2 py-0.5 font-display text-xs font-black tabular-nums",
          worn ? "bg-correct text-correct-foreground" : "bg-card/85 text-foreground",
        )}
      >
        {owned ? (
          worn ? (
            <>
              <Check className="size-3" strokeWidth={3} aria-hidden />
              {t("wearing")}
            </>
          ) : (
            t("wear")
          )
        ) : (
          <>
            <CoinIcon className="size-3.5" />
            <span className={cn(!affordable && "opacity-60")}>{item.price}</span>
          </>
        )}
      </span>
    </motion.button>
  );
}

/**
 * The try-on: the pet wearing the thing, before it is bought. Where it can be
 * afforded this is the till; where it cannot, it shows how far there is to go
 * and offers to make it the thing being saved for.
 */
export function TryOnDialog({
  stable,
  pet,
  item,
  onBuy,
  onClose,
}: {
  stable: Stable;
  pet: Pet;
  item: Accessory;
  onBuy: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const name = t(ACCESSORY_NAME[item.id] ?? "accBow");
  const refusal = whyNotDress(stable, pet.id, item);
  const affordable = refusal === null;
  const wished = stable.wish?.petId === pet.id && stable.wish.itemId === item.id;
  const fraction = Math.min(1, stable.coins / item.price);
  const worn = { ...pet.worn, [item.slot]: item.id };

  return (
    <Backdrop>
      <GameDialog
        tone="win"
        hero={
          item.slot === "home" ? (
            <ScenePreview home={item.id} className="size-16 rounded-full" />
          ) : (
            <AccessoryPreview id={item.id} slot={item.slot} className="size-16" />
          )
        }
      >
        <h2 className="font-display text-2xl font-black">{name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("tryOnBlurb", { name: pet.name })}</p>

        <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
          <Scene home={worn.home}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
              className="relative z-10"
            >
              <PetArt species={pet.species} mood="happy" worn={worn} animated className="size-40" />
            </motion.div>
          </Scene>
        </div>

        {affordable ? (
          <button type="button" onClick={onBuy} className={cn(primaryActionClass, "mt-5")}>
            {t("buyAccessory", { price: item.price })}
          </button>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_3px_oklch(0_0_0/0.14)]">
              <motion.div
                className="hud-sheen relative h-full overflow-hidden rounded-full bg-linear-to-r from-combo to-[oklch(0.72_0.19_50)]"
                initial={{ width: 0 }}
                animate={{ width: `${fraction * 100}%` }}
              />
            </div>
            <p className="flex items-center justify-center gap-1.5 font-display text-lg font-black tabular-nums">
              <CoinIcon className="size-6" />
              {Math.min(stable.coins, item.price)} / {item.price}
            </p>
            <p className="text-sm font-bold text-muted-foreground">
              {t("wishLeft", { coins: item.price - stable.coins })}
            </p>
            <button
              type="button"
              onClick={() => {
                updateStable((current) => setWish(current, pet.id, wished ? null : item.id));
                if (!wished) onClose();
              }}
              aria-pressed={wished}
              className={cn(secondaryActionClass, "py-2.5 text-base")}
            >
              <Star className={cn("size-5", wished ? "fill-combo text-combo" : "text-combo")} aria-hidden />
              {wished ? t("stopSaving") : t("saveForIt")}
            </button>
          </div>
        )}
        <button type="button" onClick={onClose} className={cn(ghostActionClass, "mt-1")}>
          {t("cancel")}
        </button>
      </GameDialog>
    </Backdrop>
  );
}

/**
 * The thing being saved for, and how far there is to go. Shown on the pets
 * screen whichever pet is on it: the savings are the whole stable's.
 */
export function WishBanner({ stable, onOpen }: { stable: Stable; onOpen: (pet: Pet, item: Accessory) => void }) {
  const { t } = useI18n();
  const wish = wishProgress(stable);
  return (
    <AnimatePresence>
      {wish && (
        <motion.button
          type="button"
          onClick={() => onOpen(wish.pet, wish.item)}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border p-3 text-left shadow-[0_12px_32px_-18px_oklch(0.4_0.16_295/0.45)] backdrop-blur-md transition-colors focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none",
            wish.ready ? "border-combo/60 bg-combo/15 hover:bg-combo/20" : "border-border/70 bg-card/90 hover:bg-card",
          )}
        >
          <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-card shadow-inner">
            <PetArt species={wish.pet.species} worn={{ ...wish.pet.worn, [wish.item.slot]: wish.item.id }} mood="happy" className="size-10" />
            <Star className="absolute -right-1 -top-1 size-5 fill-combo text-combo drop-shadow" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display font-black">
              {t("savingFor", { item: t(ACCESSORY_NAME[wish.item.id] ?? "accBow") })}
            </span>
            <span className="mt-1 block h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.span
                className="block h-full rounded-full bg-linear-to-r from-combo to-[oklch(0.72_0.19_50)]"
                initial={false}
                animate={{ width: `${(wish.have / wish.item.price) * 100}%` }}
              />
            </span>
            <span className="mt-1 block text-xs font-bold text-muted-foreground">
              {wish.ready ? t("wishReady") : t("wishLeft", { coins: wish.item.price - wish.have })}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 font-display text-sm font-black tabular-nums">
            <CoinIcon className="size-4" />
            {wish.have}/{wish.item.price}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
