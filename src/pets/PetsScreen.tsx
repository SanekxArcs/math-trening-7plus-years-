import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Hand, Heart, Moon, PawPrint, Pause, Play, Plus, ShoppingBasket, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  PET_COOLDOWN_MS,
  REVIVE_PRICE,
  SPECIES,
  SPECIES_ORDER,
  activePet,
  adopt,
  buy,
  canPet,
  choose,
  cuddle,
  isAsleep,
  itemsFor,
  needsCare,
  onVacation,
  revive,
  setVacation,
  shownMood,
  whyNot,
  whyNotAdopt,
  type ItemKind,
  type Mood,
  type Pet,
  type ShopItem,
  type Species,
  type Stable,
  type Stat,
} from "@/engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import type { TranslationKey } from "@/i18n/translations";
import { updateStable, useLiveStable, useStable } from "@/game/useStable";
import { BottomBar } from "@/game/BottomBar";
import {
  Backdrop,
  GameDialog,
  SessionStats,
  ghostActionClass,
  primaryActionClass,
  secondaryActionClass,
} from "@/game/GameDialog";
import { Backdrop as WelcomeBackdrop, fieldClass, labelClass } from "@/game/WelcomeShell";
import type { MotionStyle } from "motion/react";
import { readSession } from "@/game/useLocalSession";
import { CoinCount, CoinIcon } from "./CoinCount";
import { PetArt, hasArt } from "./PetArt";

const MOOD_TEXT: Record<Mood, TranslationKey> = {
  happy: "moodHappy",
  ok: "moodOk",
  hungry: "moodHungry",
  dirty: "moodDirty",
  sad: "moodSad",
  sick: "moodSick",
  vacation: "moodVacation",
  asleep: "moodAsleep",
  gone: "moodGone",
};

const STATS: { stat: Stat; emoji: string; label: TranslationKey }[] = [
  { stat: "food", emoji: "🍎", label: "statFood" },
  { stat: "clean", emoji: "🫧", label: "statClean" },
  { stat: "happy", emoji: "💛", label: "statHappy" },
  { stat: "health", emoji: "❤️", label: "statHealth" },
];

const KINDS: { kind: ItemKind; label: TranslationKey }[] = [
  { kind: "food", label: "shopFood" },
  { kind: "play", label: "shopPlay" },
  { kind: "care", label: "shopCare" },
  { kind: "vet", label: "shopVet" },
];

export const SPECIES_NAME: Record<Species, TranslationKey> = {
  horse: "speciesHorse",
  cat: "speciesCat",
  dog: "speciesDog",
  bunny: "speciesBunny",
  unicorn: "speciesUnicorn",
};

const DEFAULT_NAME: Record<Species, TranslationKey> = {
  horse: "horseNamePlaceholder",
  cat: "catNamePlaceholder",
  dog: "dogNamePlaceholder",
  bunny: "bunnyNamePlaceholder",
  unicorn: "unicornNamePlaceholder",
};

const ITEM_NAME: Record<string, TranslationKey> = {
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
  sweet: "itemSweet",
  yarn: "itemYarn",
  ball: "itemBall",
  strawberry: "itemStrawberry",
  sponge: "itemSponge",
  bath: "itemBath",
  medicine: "itemMedicine",
};

/** Long enough that a child tapping the name does not stumble into it. */
const GROWN_UP_PRESS_MS = 2000;

/**
 * Where the coins go. Deliberately a screen of its own rather than a panel in
 * the game: the maths is where coins are earned, and nothing here should be
 * one stray tap away from a question.
 *
 * It is also where pause leads. With a game under way it opens on the paused
 * session — its numbers, and the way to finish for today — and its one big
 * button carries on playing.
 */
export function PetsScreen() {
  const { t } = useI18n();
  const stable = useLiveStable(useStable());
  const pet = activePet(stable);
  const [shopOpen, setShopOpen] = useState(false);
  // Read once: nothing on this screen changes the session.
  const [session] = useState(() => {
    const saved = readSession();
    return saved && !saved.stopped && !saved.won && !saved.lost ? saved : null;
  });

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pb-28 pt-4">
      <div className="fixed inset-0 -z-10">
        <WelcomeBackdrop />
      </div>

      {/* The twin of the game's HUD: the same frosted panel along the top. */}
      <header className="sticky top-3 z-30 flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/85 py-2 pl-2 pr-3 shadow-[0_12px_32px_-14px_oklch(0.4_0.16_295/0.45)] backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-linear-to-b from-(--option-3) to-[oklch(0.62_0.18_350)] text-white shadow-[0_4px_12px_-4px_var(--option-3)]">
            <PawPrint className="size-5" aria-hidden />
          </span>
          <h1 className="font-display text-2xl font-black">{t("myPets")}</h1>
        </div>
        <CoinCount coins={stable.coins} className="text-lg" />
      </header>

      {session && <PausedGame score={session.score} />}

      {pet ? (
        <>
          <PetTabs stable={stable} active={pet} onAdd={() => setShopOpen(true)} />
          {/* Keyed per pet: switching must not carry a floating reaction or a
              half-pressed grown-up switch over to the next one. */}
          <Stall key={pet.id} stable={stable} pet={pet} />
        </>
      ) : (
        <Adoption />
      )}

      <AnimatePresence>
        {shopOpen && <AdoptDialog stable={stable} onClose={() => setShopOpen(false)} />}
      </AnimatePresence>

      <BottomBar>
        {/* The same raised centre button as in the game, now saying "play":
            the way back is the button that brought the child here. */}
        <Link
          to="/"
          aria-label={session ? t("keepPlaying") : t("backToGame")}
          className="col-start-2 -my-5 flex size-18 items-center justify-center justify-self-center rounded-full border-b-4 border-black/15 bg-linear-to-b from-primary to-primary/80 text-primary-foreground shadow-[0_8px_18px_-6px_var(--primary)] ring-4 ring-card transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95 active:border-b-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Play className="ml-1 size-8" fill="currentColor" strokeWidth={0} aria-hidden />
        </Link>
      </BottomBar>
    </main>
  );
}

/**
 * The game waiting behind this screen: what the run has made so far, and the
 * way to call it a day. Finishing hands over to the game screen, which pays
 * the session out and puts the pets to bed.
 */
function PausedGame({ score }: { score: Parameters<typeof SessionStats>[0]["score"] }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl border border-border/70 bg-card/85 p-4 shadow-[0_12px_32px_-16px_oklch(0.4_0.16_295/0.45)] backdrop-blur-md"
      aria-label={t("gamePaused")}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-primary to-primary/75 text-primary-foreground shadow-[0_4px_12px_-4px_var(--primary)]">
          <Pause className="size-5" fill="currentColor" strokeWidth={0} aria-hidden />
        </span>
        <div className="min-w-0 text-left">
          <h2 className="font-display text-lg font-black leading-tight">{t("gamePaused")}</h2>
          <p className="text-xs text-muted-foreground">{t("gamePausedBlurb")}</p>
        </div>
      </div>
      <SessionStats score={score} className="mt-3" />
      <button
        type="button"
        onClick={() => navigate("/", { state: { finishToday: true } })}
        className={cn(ghostActionClass, "mt-1 py-2")}
      >
        <Moon className="size-4" aria-hidden />
        {t("finishToday")}
      </button>
    </motion.section>
  );
}

/** The first pet: always the horse, always free. */
function Adoption() {
  const { t } = useI18n();
  const [name, setName] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const chosen = name.trim() || t("horseNamePlaceholder");
    updateStable((stable) => adopt(stable, "horse", chosen, Date.now()));
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="overflow-hidden rounded-xl border border-border/70 bg-card/90 text-center shadow-[0_18px_50px_-20px_oklch(0.4_0.16_295/0.5)] backdrop-blur-md"
    >
      {/* A meadow for the horse to wait in: the same stage it will live on. */}
      <Meadow>
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.2 }}
          className="relative z-10"
        >
          <PetArt species="horse" mood="happy" animated className="size-48" />
        </motion.div>
      </Meadow>

      <div className="space-y-4 p-6 pt-5">
        <div>
          <h2 className="font-display text-3xl font-black">{t("nameYourHorse")}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("nameYourHorseBlurb")}</p>
        </div>
        <NameField value={name} onChange={setName} placeholder={t("horseNamePlaceholder")} />
        <button type="submit" className={primaryActionClass}>
          <Heart className="size-5" fill="currentColor" aria-hidden />
          {t("adoptHorse")}
        </button>
      </div>
    </motion.form>
  );
}

/** Sky, sun, a drifting cloud and a green hill: the backdrop every pet stands in. */
function Meadow({ children, night = false, gone = false }: { children: React.ReactNode; night?: boolean; gone?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center overflow-hidden px-6 pt-6",
        night
          ? "bg-linear-to-b from-indigo-400 via-indigo-300 to-violet-300 dark:from-indigo-950 dark:via-indigo-950 dark:to-violet-950"
          : gone
            ? "bg-linear-to-b from-indigo-200 to-violet-100 dark:from-indigo-950 dark:to-violet-950"
            : "bg-linear-to-b from-sky-300 via-sky-200 to-sky-100 dark:from-sky-900 dark:via-sky-950 dark:to-sky-950",
      )}
    >
      {!night && !gone && (
        <span className="pointer-events-none absolute inset-0" aria-hidden>
          <span className="absolute right-6 top-5 size-12 rounded-full bg-[oklch(0.92_0.14_90)] shadow-[0_0_40px_10px_oklch(0.92_0.14_90/0.6)]" />
          <motion.span
            className="absolute top-8 h-6 w-20 rounded-full bg-white/80 shadow-[14px_-8px_0_-2px_rgb(255_255_255/0.8),-12px_-4px_0_-4px_rgb(255_255_255/0.8)]"
            initial={{ left: "-20%" }}
            animate={{ left: "110%" }}
            transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
          />
        </span>
      )}
      {children}
      {/* The hill the pet stands on. */}
      <span
        className={cn(
          "pointer-events-none absolute -bottom-10 left-1/2 h-24 w-[140%] -translate-x-1/2 rounded-[50%]",
          night ? "bg-indigo-900/40 dark:bg-indigo-900/60" : gone ? "bg-violet-200/70 dark:bg-violet-900/40" : "bg-lime-300 dark:bg-lime-900",
        )}
        aria-hidden
      />
    </div>
  );
}

function NameField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const { t } = useI18n();
  return (
    <label className="block w-full space-y-1.5 text-left">
      <span className={labelClass}>{t("petName")}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 20))}
        placeholder={placeholder}
        className={cn(fieldClass, "text-center text-2xl")}
      />
    </label>
  );
}

/**
 * Every pet at a glance, with a dot on any that needs looking after — so the
 * cat going hungry is not hidden behind the horse being the one on screen.
 */
function PetTabs({ stable, active, onAdd }: { stable: Stable; active: Pet; onAdd: () => void }) {
  const { t } = useI18n();
  const canAddMore = stable.pets.length < SPECIES_ORDER.length;

  return (
    <nav aria-label={t("myPets")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-1">
      {stable.pets.map((pet) => {
        const on = pet.id === active.id;
        return (
          <motion.button
            key={pet.id}
            type="button"
            onClick={() => updateStable((current) => choose(current, pet.id))}
            aria-pressed={on}
            aria-label={pet.name}
            whileTap={{ scale: 0.94 }}
            className={cn(
              "relative flex shrink-0 items-center gap-2 rounded-full border-b-4 py-1 pl-1 pr-4 font-display font-bold transition-colors focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none",
              on
                ? "border-black/20 bg-linear-to-b from-primary to-primary/80 text-primary-foreground shadow-[0_6px_16px_-6px_var(--primary)]"
                : "border-black/10 bg-card/90 text-foreground shadow-sm backdrop-blur hover:bg-card",
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-card shadow-inner">
              <PetArt species={pet.species} className={cn("size-7", !pet.alive && "grayscale")} />
            </span>
            <span className="max-w-24 truncate">{pet.name}</span>
            {needsCare(pet) && (
              <span className="absolute -right-0.5 -top-0.5 flex size-3.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-wrong opacity-75" />
                <span className="relative size-3.5 rounded-full border-2 border-card bg-wrong" />
              </span>
            )}
          </motion.button>
        );
      })}
      {canAddMore && (
        <motion.button
          type="button"
          onClick={onAdd}
          whileTap={{ scale: 0.94 }}
          className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-dashed border-primary/40 bg-card/60 px-4 py-2 font-display font-bold text-primary backdrop-blur transition-colors hover:bg-card focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Plus className="size-4" strokeWidth={3} aria-hidden />
          {t("newPet")}
        </motion.button>
      )}
    </nav>
  );
}

function AdoptDialog({ stable, onClose }: { stable: Stable; onClose: () => void }) {
  const { t } = useI18n();
  const choices = SPECIES_ORDER.filter((species) => whyNotAdopt(stable, species) !== "owned");
  const [picked, setPicked] = useState<Species | null>(null);
  const [name, setName] = useState("");

  const confirm = () => {
    if (!picked) return;
    const chosen = name.trim() || t(DEFAULT_NAME[picked]);
    updateStable((current) => adopt(current, picked, chosen, Date.now()));
    onClose();
  };

  return (
    <Backdrop>
      <GameDialog
        hero={
          picked ? (
            <motion.span key={picked} initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="flex">
              <PetArt species={picked} animated className="size-18" />
            </motion.span>
          ) : (
            <PawPrint className="size-10" aria-hidden />
          )
        }
      >
        <h2 className="font-display text-2xl font-black">{t("adoptTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("adoptBlurb")}</p>

        <div className="mt-5 grid grid-cols-2 gap-x-2.5 gap-y-3.5">
          {choices.map((species, index) => {
            const info = SPECIES[species];
            const short = info.price - stable.coins;
            const affordable = whyNotAdopt(stable, species) === null;
            const on = picked === species;
            return (
              <motion.button
                key={species}
                type="button"
                onClick={() => setPicked(species)}
                disabled={!affordable}
                aria-pressed={on}
                data-state={!affordable ? "dim" : undefined}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, scale: on ? 1.04 : 1 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "answer-tile flex flex-col items-center gap-1 p-3 disabled:cursor-default",
                  on && "outline-4 outline-offset-2 outline-primary",
                )}
                style={{ "--tile": `var(--option-${index % 6})` } as MotionStyle}
              >
                <PetArt species={species} className="relative size-14" />
                <span className="relative text-sm font-black text-foreground">{t(SPECIES_NAME[species])}</span>
                <span className="relative flex items-center gap-1 rounded-full bg-card/80 px-2 py-0.5 font-display text-xs font-black tabular-nums text-foreground">
                  <CoinIcon className="size-3.5" />
                  {affordable ? info.price : t("needMore", { coins: short })}
                </span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {picked && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 overflow-hidden">
              <NameField value={name} onChange={setName} placeholder={t(DEFAULT_NAME[picked])} />
            </motion.div>
          )}
        </AnimatePresence>

        <button type="button" onClick={confirm} disabled={!picked} className={cn(primaryActionClass, "mt-5 disabled:opacity-40")}>
          {picked ? t("adoptFor", { price: SPECIES[picked].price }) : t("pickAPet")}
        </button>
        <button type="button" onClick={onClose} className={cn(ghostActionClass, "mt-1")}>
          {t("cancel")}
        </button>
      </GameDialog>
    </Backdrop>
  );
}

/** A hue per kind of item, from the answer-tile palette. */
const KIND_HUE: Record<ItemKind, string> = {
  food: "var(--option-1)",
  play: "var(--option-3)",
  care: "var(--option-0)",
  vet: "var(--option-4)",
};

function Stall({ stable, pet }: { stable: Stable; pet: Pet }) {
  const { t } = useI18n();
  const mood = shownMood(stable, pet);
  /** Everything waits for morning: a sleeping pet is not fed or played with. */
  const asleep = isAsleep(stable) && pet.alive;
  /** The emoji that floats up from the pet after something is used. */
  const [reaction, setReaction] = useState<{ id: number; emoji: string } | null>(null);
  const [grownUpOpen, setGrownUpOpen] = useState(false);
  const pressTimer = useRef<number | null>(null);

  const react = (emoji: string) => setReaction((last) => ({ id: (last?.id ?? 0) + 1, emoji }));

  const use = (item: ShopItem) => {
    updateStable((current) => buy(current, pet.id, item.id, Date.now()));
    react(item.emoji);
  };

  const pat = () => {
    updateStable((current) => cuddle(current, pet.id, Date.now()));
    react("💕");
  };

  const startPress = () => {
    pressTimer.current = window.setTimeout(() => setGrownUpOpen(true), GROWN_UP_PRESS_MS);
  };
  const endPress = () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const now = Date.now();
  const petReady = canPet(pet, now);
  const petMinutes = Math.ceil((pet.lastPettedAt + PET_COOLDOWN_MS - now) / 60_000);
  const items = itemsFor(pet.species);
  const vacation = onVacation(stable);
  const worried = mood === "sick" || mood === "gone" || mood === "hungry" || mood === "dirty" || mood === "sad";

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-xl border border-border/70 bg-card/90 shadow-[0_18px_50px_-20px_oklch(0.4_0.16_295/0.5)] backdrop-blur-md"
      >
        <Meadow night={asleep} gone={!pet.alive}>
          {asleep && <NightSky />}
          <div className="relative z-10">
            <PetFigure pet={pet} mood={mood} onPet={petReady && !asleep ? pat : undefined} />
          </div>

          <AnimatePresence>
            {reaction && (
              <motion.span
                key={reaction.id}
                initial={{ opacity: 1, y: 0, scale: 0.8 }}
                animate={{ opacity: 0, y: -90, scale: 1.6 }}
                transition={{ duration: 1.1 }}
                onAnimationComplete={() => setReaction(null)}
                className="pointer-events-none absolute top-1/3 z-20 text-5xl"
                aria-hidden
              >
                {reaction.emoji}
              </motion.span>
            )}
          </AnimatePresence>
        </Meadow>

        <div className="px-5 pb-5 pt-3 text-center">
          {/* The grown-up switch hides behind a long press on the name: findable
              by someone who was told where it is, not by a child tapping around. */}
          <h2
            className="select-none font-display text-3xl font-black text-foreground"
            onPointerDown={startPress}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            onPointerCancel={endPress}
            onContextMenu={(event) => event.preventDefault()}
          >
            {pet.name}
          </h2>
          {/* What the pet would say, in a speech bubble — urgent ones in red. */}
          <motion.p
            key={mood}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "relative mx-auto mt-2 inline-block rounded-2xl px-4 py-2 text-sm font-bold",
              worried ? "bg-wrong/10 text-wrong" : "bg-secondary text-secondary-foreground",
            )}
            role="status"
          >
            {t(MOOD_TEXT[mood], { name: pet.name })}
          </motion.p>
        </div>
      </motion.section>

      {pet.alive ? (
        // `disabled` on a fieldset reaches every button inside: all the care
        // waits until a solved sum wakes the pet.
        <fieldset disabled={asleep} className={cn("contents", asleep && "[&_button]:opacity-50")}>
          <section className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-[0_12px_32px_-18px_oklch(0.4_0.16_295/0.45)] backdrop-blur-md">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {STATS.map(({ stat, emoji, label }) => (
                <StatBar key={stat} emoji={emoji} label={t(label)} value={pet[stat]} />
              ))}
            </div>
            <button
              type="button"
              onClick={pat}
              disabled={!petReady}
              className={cn(secondaryActionClass, "mt-4 py-2.5 text-base disabled:opacity-60")}
            >
              <Hand className="size-5" aria-hidden />
              {t("petHorse")}
              {!petReady && (
                <span className="text-sm font-bold text-muted-foreground">· {t("petAgainIn", { minutes: petMinutes })}</span>
              )}
            </button>
          </section>

          <section className="space-y-4 rounded-xl border border-border/70 bg-card/90 p-4 shadow-[0_12px_32px_-18px_oklch(0.4_0.16_295/0.45)] backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-b from-combo to-[oklch(0.7_0.19_50)] text-combo-foreground">
                <ShoppingBasket className="size-4" aria-hidden />
              </span>
              <h3 className="font-display text-lg font-black">{t("shopTitle")}</h3>
            </div>
            {KINDS.map(({ kind, label }) => (
              <div key={kind}>
                <h4 className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">{t(label)}</h4>
                <div className="grid grid-cols-3 gap-x-2.5 gap-y-3.5 sm:grid-cols-4">
                  {items
                    .filter((item) => item.kind === kind)
                    .map((item) => (
                      <ItemButton
                        key={item.id}
                        item={item}
                        hue={KIND_HUE[kind]}
                        refusal={whyNot(stable, pet.id, item)}
                        coins={stable.coins}
                        onUse={() => use(item)}
                      />
                    ))}
                </div>
              </div>
            ))}
          </section>
        </fieldset>
      ) : (
        <Revive pet={pet} coins={stable.coins} />
      )}

      <AnimatePresence>
        {grownUpOpen && (
          <Backdrop>
            <GameDialog hero={<span className="text-5xl leading-none">🏖️</span>}>
              <h2 className="font-display text-2xl font-black">{t("vacationTitle")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("vacationBlurb")}</p>
              <button
                type="button"
                onClick={() => {
                  updateStable((current) => setVacation(current, !vacation, Date.now()));
                  setGrownUpOpen(false);
                }}
                className={cn(primaryActionClass, "mt-6")}
              >
                {vacation ? t("vacationOff") : t("vacationOn")}
              </button>
              <button type="button" onClick={() => setGrownUpOpen(false)} className={cn(ghostActionClass, "mt-1")}>
                {t("cancel")}
              </button>
            </GameDialog>
          </Backdrop>
        )}
      </AnimatePresence>
    </>
  );
}

/** A shop item, as a candy tile in its kind's colour, with its price on a coin. */
function ItemButton({
  item,
  hue,
  refusal,
  coins,
  onUse,
}: {
  item: ShopItem;
  hue: string;
  refusal: ReturnType<typeof whyNot>;
  coins: number;
  onUse: () => void;
}) {
  const { t } = useI18n();
  const name = t(ITEM_NAME[item.id] ?? "itemHay");
  return (
    <motion.button
      type="button"
      onClick={onUse}
      disabled={refusal !== null}
      aria-label={t("buyItem", { item: name, price: item.price })}
      data-state={refusal !== null ? "dim" : undefined}
      whileTap={refusal === null ? { scale: 0.92, rotate: -3 } : {}}
      className="answer-tile flex flex-col items-center gap-1 px-1.5 pb-2 pt-2.5 disabled:cursor-default"
      style={{ "--tile": hue } as MotionStyle}
    >
      <span className="relative text-4xl leading-none drop-shadow-sm" aria-hidden>
        {item.emoji}
      </span>
      <span className="relative text-xs font-bold leading-tight text-foreground">{name}</span>
      <span className="relative flex items-center gap-1 rounded-full bg-card/85 px-2 py-0.5 font-display text-xs font-black tabular-nums text-foreground">
        {refusal === "full" ? (
          <>
            <Sparkles className="size-3 text-correct" aria-hidden />
            {t("itemFull")}
          </>
        ) : (
          <>
            <CoinIcon className="size-3.5" />
            {refusal === "coins" ? t("needMore", { coins: item.price - coins }) : item.price}
          </>
        )}
      </span>
    </motion.button>
  );
}

/**
 * The pet itself. Every state it can be in shows on the figure, not only in
 * the bars: a child who cannot read "Clean 20%" yet can see the mud.
 *
 * Drawn species animate themselves in CSS (see PetArt); the rest are still
 * emoji, bobbed from here, with their mood in a badge beside them.
 */
function PetFigure({ pet, mood, onPet }: { pet: Pet; mood: Mood; onPet: (() => void) | undefined }) {
  const gone = mood === "gone";
  const cheerful = mood === "happy" || mood === "ok";
  const mud = pet.alive ? Math.floor((100 - pet.clean) / 25) : 0;

  if (hasArt(pet.species)) {
    return (
      <motion.button
        type="button"
        onClick={onPet}
        disabled={!onPet}
        aria-hidden
        tabIndex={-1}
        className="relative mt-2 select-none"
        {...(onPet ? { whileTap: { scale: 0.92, rotate: -3 } } : {})}
      >
        <PetArt species={pet.species} mood={mood} mud={mud} animated className="size-56" />
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onPet}
      disabled={!onPet}
      aria-hidden
      tabIndex={-1}
      className="relative mt-4 select-none text-[9rem] leading-none"
      animate={
        gone
          ? { y: [0, -10, 0] }
          : cheerful
            ? { y: [0, -12, 0], rotate: [0, -3, 0] }
            : { y: [0, -3, 0] }
      }
      transition={{ repeat: Infinity, duration: gone ? 3 : cheerful ? 1.6 : 3 }}
      {...(onPet ? { whileTap: { scale: 0.92 } } : {})}
    >
      {gone && <span className="absolute -top-12 left-1/2 -translate-x-1/2 text-6xl">😇</span>}
      <span className={cn(gone && "opacity-40 grayscale")}>{SPECIES[pet.species].emoji}</span>

      {/* Mud: one splat per quarter of cleanliness lost. */}
      {["left-6 top-16", "right-8 top-24", "left-12 bottom-6", "right-4 bottom-10"]
        .slice(0, mud)
        .map((place) => (
          <span key={place} className={cn("absolute size-5 rounded-full bg-amber-800/70", place)} />
        ))}

      {mood === "sick" && <span className="absolute -right-4 top-2 text-5xl">🤒</span>}
      {mood === "hungry" && <span className="absolute -right-4 top-2 text-5xl">🍽️</span>}
      {mood === "sad" && <span className="absolute -right-4 top-2 text-5xl">💧</span>}
      {mood === "happy" && <span className="absolute -right-4 top-2 text-5xl">✨</span>}
      {mood === "vacation" && <span className="absolute -right-4 top-2 text-5xl">🏖️</span>}
      {mood === "asleep" && <span className="absolute -right-4 top-2 text-5xl">💤</span>}
    </motion.button>
  );
}

/** Twinkling stars and a moon over the sleeping pet. Decoration only. */
function NightSky() {
  const stars = [
    [12, 14, 0],
    [28, 30, 0.6],
    [70, 12, 1.2],
    [86, 34, 0.3],
    [52, 22, 0.9],
    [18, 52, 1.5],
  ] as const;
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      <span className="absolute right-6 top-5 size-10 rounded-full bg-[oklch(0.95_0.06_95)] shadow-[0_0_30px_8px_oklch(0.95_0.08_95/0.5),inset_-6px_-4px_0_oklch(0.85_0.08_85)]" />
      {stars.map(([left, top, delay]) => (
        <motion.span
          key={`${left}-${top}`}
          className="absolute size-1.5 rounded-full bg-white"
          style={{ left: `${left}%`, top: `${top}%` }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: 2.4, repeat: Infinity, delay }}
        />
      ))}
    </span>
  );
}

/** One need, as a glossy bar like the game's goal bar: green, then amber, then red. */
function StatBar({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  const shown = Math.round(value);
  const tone = value < 25 ? "bg-wrong" : value < 50 ? "bg-combo" : "bg-correct";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm font-bold">
        <span className="flex items-center gap-1.5">
          <span aria-hidden>{emoji}</span> {label}
        </span>
        <span className={cn("tabular-nums", value < 25 ? "text-wrong" : "text-muted-foreground")}>{shown}%</span>
      </div>
      <div
        className="relative h-3.5 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_3px_oklch(0_0_0/0.14)]"
        role="progressbar"
        aria-label={label}
        aria-valuenow={shown}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className={cn("relative h-full overflow-hidden rounded-full transition-colors duration-500", tone, value < 25 && "animate-pulse")}
          initial={false}
          animate={{ width: `${value}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 24 }}
        >
          <span className="absolute inset-x-1.5 top-0.5 h-1 rounded-full bg-white/40" aria-hidden />
        </motion.div>
      </div>
    </div>
  );
}

/** A pet that is gone, and the savings bar that brings them back. */
function Revive({ pet, coins }: { pet: Pet; coins: number }) {
  const { t } = useI18n();
  const ready = coins >= REVIVE_PRICE;
  const fraction = Math.min(1, coins / REVIVE_PRICE);
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 rounded-xl border border-border/70 bg-card/90 p-5 text-center shadow-[0_12px_32px_-18px_oklch(0.4_0.16_295/0.45)] backdrop-blur-md"
    >
      <motion.span
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex size-14 items-center justify-center rounded-full bg-linear-to-b from-wrong to-[oklch(0.5_0.2_15)] text-white shadow-[0_8px_20px_-8px_var(--wrong)]"
      >
        <Heart className="size-7" fill="currentColor" aria-hidden />
      </motion.span>
      <p className="font-bold">{t("reviveBlurb", { price: REVIVE_PRICE, name: pet.name })}</p>
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_3px_oklch(0_0_0/0.14)]">
        <motion.div
          className="hud-sheen relative h-full overflow-hidden rounded-full bg-linear-to-r from-combo to-[oklch(0.72_0.19_50)]"
          initial={false}
          animate={{ width: `${fraction * 100}%` }}
        />
      </div>
      <p className="flex items-center gap-1.5 font-display text-lg font-black tabular-nums">
        <CoinIcon className="size-6" />
        {Math.min(coins, REVIVE_PRICE)} / {REVIVE_PRICE}
      </p>
      {ready && (
        <button
          type="button"
          onClick={() => updateStable((stable) => revive(stable, pet.id, Date.now()))}
          className={primaryActionClass}
        >
          <Heart className="size-5" fill="currentColor" aria-hidden />
          {t("revive", { name: pet.name })} · 🪙 {REVIVE_PRICE}
        </button>
      )}
    </motion.section>
  );
}
