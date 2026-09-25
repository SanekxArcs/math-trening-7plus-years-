import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Hand, Heart, Plus } from "lucide-react";
import { Link } from "react-router-dom";
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
  itemsFor,
  moodOf,
  needsCare,
  onVacation,
  revive,
  setVacation,
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
import { CoinCount } from "./CoinCount";

const MOOD_TEXT: Record<Mood, TranslationKey> = {
  happy: "moodHappy",
  ok: "moodOk",
  hungry: "moodHungry",
  dirty: "moodDirty",
  sad: "moodSad",
  sick: "moodSick",
  vacation: "moodVacation",
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
 */
export function PetsScreen() {
  const { t } = useI18n();
  const stable = useLiveStable(useStable());
  const pet = activePet(stable);
  const [shopOpen, setShopOpen] = useState(false);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-4 pb-28 pt-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black">{t("myPets")}</h1>
        <CoinCount coins={stable.coins} />
      </header>

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
        <Link
          to="/"
          className="col-span-3 flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-display text-lg font-black text-primary-foreground shadow-md focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowLeft className="size-5" aria-hidden />
          {t("backToGame")}
        </Link>
      </BottomBar>
    </main>
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
    <form
      onSubmit={submit}
      className="flex flex-col items-center gap-4 rounded-[--radius-xl] bg-card p-8 text-center shadow-lg"
    >
      <motion.span
        className="text-[7rem] leading-none"
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        aria-hidden
      >
        🐴
      </motion.span>
      <h2 className="font-display text-3xl font-black">{t("nameYourHorse")}</h2>
      <p className="text-muted-foreground">{t("nameYourHorseBlurb")}</p>
      <NameField value={name} onChange={setName} placeholder={t("horseNamePlaceholder")} />
      <button
        type="submit"
        className="w-full rounded-[--radius-lg] border-b-8 border-primary/60 bg-primary py-4 font-display text-xl font-black text-primary-foreground shadow-xl focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
      >
        {t("adoptHorse")}
      </button>
    </form>
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
    <label className="w-full text-left">
      <span className="text-sm font-bold text-muted-foreground">{t("petName")}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 20))}
        placeholder={placeholder}
        className="mt-1 w-full rounded-[--radius-lg] border-2 border-input bg-background px-4 py-3 font-display text-xl font-bold focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
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
    <nav aria-label={t("myPets")} className="flex gap-2 overflow-x-auto pb-1">
      {stable.pets.map((pet) => (
        <button
          key={pet.id}
          type="button"
          onClick={() => updateStable((current) => choose(current, pet.id))}
          aria-pressed={pet.id === active.id}
          aria-label={pet.name}
          className={cn(
            "relative flex shrink-0 items-center gap-2 rounded-full border-2 py-1.5 pl-2 pr-4 font-display font-bold transition-colors focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none",
            pet.id === active.id ? "border-primary bg-secondary" : "border-transparent bg-card shadow-sm",
          )}
        >
          <span className={cn("text-2xl leading-none", !pet.alive && "grayscale")} aria-hidden>
            {SPECIES[pet.species].emoji}
          </span>
          <span className="max-w-24 truncate">{pet.name}</span>
          {needsCare(pet) && (
            <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-card bg-wrong" />
          )}
        </button>
      ))}
      {canAddMore && (
        <button
          type="button"
          onClick={onAdd}
          className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-dashed border-border px-4 py-1.5 font-display font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Plus className="size-4" aria-hidden />
          {t("newPet")}
        </button>
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
    <Overlay>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("adoptTitle")}
        className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-[--radius-xl] bg-card p-6 text-center shadow-2xl"
      >
        <h2 className="font-display text-2xl font-black">{t("adoptTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("adoptBlurb")}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {choices.map((species) => {
            const info = SPECIES[species];
            const short = info.price - stable.coins;
            const affordable = whyNotAdopt(stable, species) === null;
            return (
              <button
                key={species}
                type="button"
                onClick={() => setPicked(species)}
                disabled={!affordable}
                aria-pressed={picked === species}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-[--radius-lg] border-2 p-3 transition-colors disabled:opacity-50 focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none",
                  picked === species ? "border-primary bg-secondary" : "border-border bg-background",
                )}
              >
                <span className="text-5xl leading-none" aria-hidden>
                  {info.emoji}
                </span>
                <span className="font-bold">{t(SPECIES_NAME[species])}</span>
                <span className="font-display text-sm font-black tabular-nums text-combo-foreground">
                  {affordable ? `🪙 ${info.price}` : `🪙 ${t("needMore", { coins: short })}`}
                </span>
              </button>
            );
          })}
        </div>

        {picked && (
          <div className="mt-4">
            <NameField value={name} onChange={setName} placeholder={t(DEFAULT_NAME[picked])} />
          </div>
        )}

        <button
          type="button"
          onClick={confirm}
          disabled={!picked}
          className="mt-5 w-full rounded-[--radius-lg] border-b-8 border-primary/60 bg-primary py-4 font-display text-lg font-black text-primary-foreground shadow-xl disabled:opacity-40 focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
        >
          {picked ? t("adoptFor", { price: SPECIES[picked].price }) : t("pickAPet")}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-[--radius-lg] py-3 font-display font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t("cancel")}
        </button>
      </div>
    </Overlay>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-6 backdrop-blur-sm"
    >
      {children}
    </motion.div>
  );
}

function Stall({ stable, pet }: { stable: Stable; pet: Pet }) {
  const { t } = useI18n();
  const mood = moodOf(pet);
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

  return (
    <>
      <section
        className={cn(
          "relative flex flex-col items-center overflow-hidden rounded-[--radius-xl] p-6 shadow-lg",
          pet.alive
            ? "bg-gradient-to-b from-sky-200 via-sky-100 to-lime-200 dark:from-sky-900 dark:via-sky-950 dark:to-lime-950"
            : "bg-gradient-to-b from-indigo-200 to-violet-100 dark:from-indigo-950 dark:to-violet-950",
        )}
      >
        <PetFigure pet={pet} mood={mood} onPet={petReady ? pat : undefined} />

        <AnimatePresence>
          {reaction && (
            <motion.span
              key={reaction.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -90, scale: 1.6 }}
              transition={{ duration: 1.1 }}
              onAnimationComplete={() => setReaction(null)}
              className="pointer-events-none absolute top-1/3 text-5xl"
              aria-hidden
            >
              {reaction.emoji}
            </motion.span>
          )}
        </AnimatePresence>

        {/* The grown-up switch hides behind a long press on the name: findable
            by someone who was told where it is, not by a child tapping around. */}
        <h2
          className="mt-2 select-none font-display text-3xl font-black text-foreground"
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onPointerCancel={endPress}
          onContextMenu={(event) => event.preventDefault()}
        >
          {pet.name}
        </h2>
        <p
          className={cn(
            "mt-1 text-center font-bold",
            mood === "sick" || mood === "gone" ? "text-wrong" : "text-foreground/80",
          )}
          role="status"
        >
          {t(MOOD_TEXT[mood], { name: pet.name })}
        </p>
      </section>

      {pet.alive ? (
        <>
          <section className="grid grid-cols-2 gap-3">
            {STATS.map(({ stat, emoji, label }) => (
              <StatBar key={stat} emoji={emoji} label={t(label)} value={pet[stat]} />
            ))}
          </section>

          <button
            type="button"
            onClick={pat}
            disabled={!petReady}
            className="flex items-center justify-center gap-2 rounded-full bg-card px-5 py-3 font-display font-bold shadow-md transition-colors enabled:hover:bg-accent disabled:text-muted-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Hand className="size-5" aria-hidden />
            {t("petHorse")}
            {!petReady && (
              <span className="text-sm font-bold">· {t("petAgainIn", { minutes: petMinutes })}</span>
            )}
          </button>

          {KINDS.map(({ kind, label }) => (
            <section key={kind}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {t(label)}
              </h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {items
                  .filter((item) => item.kind === kind)
                  .map((item) => (
                    <ItemButton
                      key={item.id}
                      item={item}
                      refusal={whyNot(stable, pet.id, item)}
                      coins={stable.coins}
                      onUse={() => use(item)}
                    />
                  ))}
              </div>
            </section>
          ))}
        </>
      ) : (
        <Revive pet={pet} coins={stable.coins} />
      )}

      <AnimatePresence>
        {grownUpOpen && (
          <Overlay>
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-[--radius-xl] bg-card p-8 text-center shadow-2xl"
            >
              <span className="text-6xl" aria-hidden>
                🏖️
              </span>
              <h2 className="mt-3 font-display text-2xl font-black">{t("vacationTitle")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("vacationBlurb")}</p>
              <button
                type="button"
                onClick={() => {
                  updateStable((current) => setVacation(current, !vacation, Date.now()));
                  setGrownUpOpen(false);
                }}
                className="mt-6 w-full rounded-[--radius-lg] border-b-8 border-primary/60 bg-primary py-4 font-display text-lg font-black text-primary-foreground shadow-xl focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
              >
                {vacation ? t("vacationOff") : t("vacationOn")}
              </button>
              <button
                type="button"
                onClick={() => setGrownUpOpen(false)}
                className="mt-3 w-full rounded-[--radius-lg] py-3 font-display font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
              >
                {t("cancel")}
              </button>
            </div>
          </Overlay>
        )}
      </AnimatePresence>
    </>
  );
}

function ItemButton({
  item,
  refusal,
  coins,
  onUse,
}: {
  item: ShopItem;
  refusal: ReturnType<typeof whyNot>;
  coins: number;
  onUse: () => void;
}) {
  const { t } = useI18n();
  const name = t(ITEM_NAME[item.id] ?? "itemHay");
  return (
    <button
      type="button"
      onClick={onUse}
      disabled={refusal !== null}
      aria-label={t("buyItem", { item: name, price: item.price })}
      className="flex flex-col items-center gap-1 rounded-[--radius-lg] border-b-4 border-black/10 bg-card p-3 shadow-md transition-transform enabled:active:translate-y-0.5 disabled:opacity-50 focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="text-4xl" aria-hidden>
        {item.emoji}
      </span>
      <span className="text-sm font-bold leading-tight">{name}</span>
      <span className="font-display text-sm font-black tabular-nums text-combo-foreground">
        {refusal === "full"
          ? t("itemFull")
          : refusal === "coins"
            ? `🪙 ${t("needMore", { coins: item.price - coins })}`
            : `🪙 ${item.price}`}
      </span>
    </button>
  );
}

/**
 * The pet itself, drawn from emoji so it needs no assets and works offline.
 * Every state it can be in shows on the figure, not only in the bars: a child
 * who cannot read "Clean 20%" yet can see the mud.
 */
function PetFigure({ pet, mood, onPet }: { pet: Pet; mood: Mood; onPet: (() => void) | undefined }) {
  const gone = mood === "gone";
  const cheerful = mood === "happy" || mood === "ok";
  const mud = pet.alive ? Math.floor((100 - pet.clean) / 25) : 0;

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
    </motion.button>
  );
}

function StatBar({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  const shown = Math.round(value);
  return (
    <div className="rounded-[--radius-lg] bg-card p-3 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between text-sm font-bold">
        <span>
          <span aria-hidden>{emoji}</span> {label}
        </span>
        <span className="tabular-nums text-muted-foreground">{shown}%</span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuenow={shown}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className={cn(
            "h-full rounded-full",
            value < 25 ? "bg-wrong" : value < 50 ? "bg-combo" : "bg-correct",
          )}
          animate={{ width: `${value}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 24 }}
        />
      </div>
    </div>
  );
}

function Revive({ pet, coins }: { pet: Pet; coins: number }) {
  const { t } = useI18n();
  const ready = coins >= REVIVE_PRICE;
  return (
    <section className="flex flex-col items-center gap-4 rounded-[--radius-xl] bg-card p-6 text-center shadow-lg">
      <Heart className="size-10 text-wrong" aria-hidden />
      <p className="font-bold">{t("reviveBlurb", { price: REVIVE_PRICE, name: pet.name })}</p>
      <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-combo"
          animate={{ width: `${Math.min(100, (coins / REVIVE_PRICE) * 100)}%` }}
        />
      </div>
      <p className="font-display text-lg font-black tabular-nums">
        🪙 {Math.min(coins, REVIVE_PRICE)} / {REVIVE_PRICE}
      </p>
      {ready && (
        <button
          type="button"
          onClick={() => updateStable((stable) => revive(stable, pet.id, Date.now()))}
          className="w-full rounded-[--radius-lg] border-b-8 border-primary/60 bg-primary py-4 font-display text-xl font-black text-primary-foreground shadow-xl focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t("revive", { name: pet.name })} · 🪙 {REVIVE_PRICE}
        </button>
      )}
    </section>
  );
}
