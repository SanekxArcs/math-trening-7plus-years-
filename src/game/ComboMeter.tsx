import { AnimatePresence, motion } from "motion/react";
import { Flame, Snowflake } from "lucide-react";
import { comboMultiplier, nextTierAt, penaltyFor, type ScoreState } from "@/engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";

interface ComboMeterProps {
  score: ScoreState;
}

/**
 * Shows the child what their next answer is worth — and, during a bad run, what
 * it will cost. Making the escalating penalty visible is the whole point: an
 * invisible one just feels like the game turned against them.
 *
 * Compact enough to sit between the level and the purse. One chip, two moods:
 * fire while the streak builds, ice while it is broken, with a thin bar under
 * the fire showing how close the next multiplier is.
 */
export function ComboMeter({ score }: ComboMeterProps) {
  const { t } = useI18n();
  const multiplier = comboMultiplier(score.goodStreak);
  const target = nextTierAt(score.goodStreak);
  const inBadRun = score.badStreak > 0;
  const onFire = multiplier > 1;

  const previousTier = target === 5 ? 0 : target === 15 ? 5 : target === 30 ? 15 : 30;
  const progress =
    target === null
      ? 1
      : (score.goodStreak - previousTier) / (target - previousTier);

  return (
    <div className="flex min-w-0 justify-center">
      <AnimatePresence mode="popLayout" initial={false}>
        {inBadRun ? (
          <motion.div
            key="bad"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="flex h-9 items-center gap-1.5 rounded-full border border-streak-bad/30 bg-streak-bad/10 px-3 text-streak-bad"
          >
            <motion.span
              key={score.badStreak}
              initial={{ rotate: -90, scale: 1.4 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 14 }}
              className="flex"
            >
              <Snowflake className="size-4" aria-hidden />
            </motion.span>
            <span className="truncate font-display text-sm font-bold tabular-nums">
              {t("nextMistake", { points: penaltyFor(score.badStreak + 1) })}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="good"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="flex flex-col items-stretch gap-1"
          >
            <span
              className={cn(
                "relative flex h-8 items-center justify-center gap-1 rounded-full px-3 transition-colors duration-300",
                onFire
                  ? "bg-linear-to-b from-combo to-[oklch(0.7_0.19_50)] text-combo-foreground shadow-[0_2px_10px_-2px_var(--combo)]"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <motion.span
                animate={onFire ? { scale: [1, 1.18, 1], rotate: [0, -6, 6, 0] } : { scale: 1, rotate: 0 }}
                transition={
                  onFire ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }
                }
                className="flex"
              >
                <Flame className="size-4" fill={onFire ? "currentColor" : "none"} aria-hidden />
              </motion.span>
              <motion.span
                key={multiplier}
                initial={{ scale: 1.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                className="font-display text-sm font-black tabular-nums"
              >
                ×{multiplier}
              </motion.span>
              {score.goodStreak > 0 && (
                <span className="hidden whitespace-nowrap text-xs font-bold tabular-nums opacity-75 min-[400px]:inline">
                  {t("inARow", { count: score.goodStreak })}
                </span>
              )}
              {/* A ring that bursts off the chip at the moment a tier is reached. */}
              {onFire && (
                <motion.span
                  key={`ring-${multiplier}`}
                  initial={{ opacity: 0.8, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.5 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="pointer-events-none absolute inset-0 rounded-full border-2 border-combo"
                  aria-hidden
                />
              )}
            </span>

            <div
              className="relative mx-2 h-1.5 overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_2px_oklch(0_0_0/0.12)]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(1, progress) * 100)}
              aria-label={
                target === null ? undefined : `${target - score.goodStreak} more for the next multiplier`
              }
            >
              <motion.div
                className={cn(
                  "h-full rounded-full bg-linear-to-r from-combo to-[oklch(0.72_0.19_50)]",
                  onFire && "hud-stripes",
                )}
                initial={false}
                animate={{ width: `${Math.min(100, progress * 100)}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
