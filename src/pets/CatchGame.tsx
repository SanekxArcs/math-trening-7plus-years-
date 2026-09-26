import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PLAY_ROUND_MS, itemsFor, playJoy, type Species } from "@/engine";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";
import { playSound } from "@/game/sound";

/**
 * The catching game: treats pop up around the pet and are gone again in a
 * moment; every one tapped in time is caught. Twenty seconds, no coins, no
 * way to lose — it is a thing to do with the pet, not another test.
 *
 * Drawn over the pet's scene, so the pet is right there hopping for every
 * catch. The round only counts if it is played to the end.
 */

/** How long a treat waits to be caught, and how often a new one appears. */
const TREAT_MS = 1500;
const SPAWN_MS = 620;
const MAX_TREATS = 4;
const GOLD_CHANCE = 0.15;
const GOLD_WORTH = 3;
/** How often the timer bar moves; a CSS transition smooths the steps. */
const CLOCK_MS = 250;

interface Treat {
  id: number;
  x: number;
  y: number;
  emoji: string;
  gold: boolean;
}

export type GamePhase = "ready" | "playing" | "done";

export function CatchGame({
  species,
  name,
  sound,
  phase,
  caught,
  onStart,
  onCatch,
  onEnd,
  onClose,
}: {
  species: Species;
  name: string;
  sound: boolean;
  phase: GamePhase;
  caught: number;
  onStart: () => void;
  onCatch: (worth: number) => void;
  onEnd: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [treats, setTreats] = useState<Treat[]>([]);
  const [left, setLeft] = useState(PLAY_ROUND_MS);
  const next = useRef(0);

  useEffect(() => {
    if (phase !== "playing") return;
    const menu = itemsFor(species)
      .filter((item) => item.kind === "food" || item.kind === "play")
      .map((item) => item.emoji);
    const started = Date.now();
    const timers = new Set<number>();

    const spawn = () => {
      const id = ++next.current;
      const gold = Math.random() < GOLD_CHANCE;
      const treat: Treat = {
        id,
        // Kept inside the scene, clear of the timer along the top.
        x: 8 + Math.random() * 78,
        y: 18 + Math.random() * 62,
        emoji: gold ? "⭐" : menu[Math.floor(Math.random() * menu.length)]!,
        gold,
      };
      setTreats((current) => (current.length >= MAX_TREATS ? current : [...current, treat]));
      const gone = window.setTimeout(() => {
        setTreats((current) => current.filter((each) => each.id !== id));
        timers.delete(gone);
      }, TREAT_MS);
      timers.add(gone);
    };

    spawn();
    const spawner = window.setInterval(spawn, SPAWN_MS);
    const clock = window.setInterval(() => {
      const remaining = Math.max(0, PLAY_ROUND_MS - (Date.now() - started));
      setLeft(remaining);
      if (remaining === 0) {
        window.clearInterval(spawner);
        window.clearInterval(clock);
        setTreats([]);
        onEnd();
      }
    }, CLOCK_MS);

    return () => {
      window.clearInterval(spawner);
      window.clearInterval(clock);
      for (const id of timers) window.clearTimeout(id);
      setTreats([]);
    };
    // One round per "playing"; the callbacks are fresh each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, species]);

  const grab = (treat: Treat) => {
    setTreats((current) => current.filter((each) => each.id !== treat.id));
    playSound(treat.gold ? "buy" : "pop", sound);
    onCatch(treat.gold ? GOLD_WORTH : 1);
  };

  return (
    <div className="absolute inset-0 z-30">
      {phase === "playing" && (
        <>
          <div className="absolute inset-x-3 top-3 flex items-center gap-2">
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/60 shadow-inner">
              <div
                className="h-full rounded-full bg-linear-to-r from-correct to-combo transition-[width] duration-250 ease-linear"
                style={{ width: `${(left / PLAY_ROUND_MS) * 100}%` }}
              />
            </div>
            <span className="rounded-full bg-card/90 px-2.5 py-0.5 font-display text-sm font-black tabular-nums shadow" role="status">
              {t("playCaught", { count: caught })}
            </span>
          </div>
          <AnimatePresence>
            {treats.map((treat) => (
              <motion.button
                key={treat.id}
                type="button"
                aria-label={treat.emoji}
                onPointerDown={() => grab(treat)}
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 1.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 16 }}
                className={cn(
                  "absolute flex size-16 -translate-x-1/2 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full text-4xl",
                  treat.gold
                    ? "bg-combo/40 shadow-[0_0_24px_6px_var(--combo)]"
                    : "bg-white/55 shadow-[0_6px_16px_-6px_oklch(0_0_0/0.35)]",
                )}
                style={{ left: `${treat.x}%`, top: `${treat.y}%` }}
              >
                {treat.emoji}
              </motion.button>
            ))}
          </AnimatePresence>
        </>
      )}

      {phase !== "playing" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black/25 p-6 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ scale: 0.8, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="w-full max-w-64 rounded-xl bg-card/95 p-4 text-center shadow-xl"
          >
            {phase === "ready" ? (
              <>
                <p className="text-4xl" aria-hidden>🎾</p>
                <h3 className="mt-1 font-display text-xl font-black">{t("playTitle")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t("playBlurb")}</p>
                <button
                  type="button"
                  onClick={onStart}
                  className="mt-3 w-full rounded-lg border-b-4 border-black/20 bg-linear-to-b from-correct to-correct/80 py-2.5 font-display text-lg font-black text-correct-foreground shadow active:translate-y-0.5 active:border-b-2"
                >
                  {t("playStart")}
                </button>
              </>
            ) : (
              <>
                <p className="text-4xl" aria-hidden>🏆</p>
                <h3 className="mt-1 font-display text-lg font-black">{t("playDone", { count: caught, name })}</h3>
                <p className="mt-1 font-display text-2xl font-black text-correct">💛 {t("playJoy", { joy: playJoy(caught) })}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full rounded-lg border-b-4 border-black/20 bg-linear-to-b from-primary to-primary/80 py-2.5 font-display text-lg font-black text-primary-foreground shadow active:translate-y-0.5 active:border-b-2"
                >
                  {t("playClose")}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
