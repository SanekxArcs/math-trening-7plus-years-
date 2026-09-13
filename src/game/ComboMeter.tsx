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
 */
export function ComboMeter({ score }: ComboMeterProps) {
  const { t } = useI18n();
  const multiplier = comboMultiplier(score.goodStreak);
  const target = nextTierAt(score.goodStreak);
  const inBadRun = score.badStreak > 0;

  const previousTier = target === 5 ? 0 : target === 15 ? 5 : target === 30 ? 15 : 30;
  const progress =
    target === null
      ? 1
      : (score.goodStreak - previousTier) / (target - previousTier);

  return (
    <div className="flex items-center gap-3">
      <AnimatePresence mode="wait">
        {inBadRun ? (
          <motion.div
            key="bad"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="flex items-center gap-1.5 rounded-full bg-streak-bad/15 px-3 py-1.5 text-streak-bad"
          >
            <Snowflake className="size-4" aria-hidden />
            <span className="font-display text-sm font-bold tabular-nums">
              {t("nextMistake", { points: penaltyFor(score.badStreak + 1) })}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="good"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5",
              multiplier > 1
                ? "bg-combo/25 text-combo-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Flame
              className={cn("size-4", multiplier > 1 && "text-combo")}
              aria-hidden
            />
            <motion.span
              key={multiplier}
              initial={{ scale: 1.6 }}
              animate={{ scale: 1 }}
              className="font-display text-sm font-bold tabular-nums"
            >
              ×{multiplier}
            </motion.span>
            {score.goodStreak > 0 && (
              <span className="text-xs tabular-nums opacity-70">
                {t("inARow", { count: score.goodStreak })}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!inBadRun && target !== null && (
        <div
          className="h-2 w-16 overflow-hidden rounded-full bg-muted"
          aria-label={`${target - score.goodStreak} more for the next multiplier`}
        >
          <motion.div
            className="h-full rounded-full bg-combo"
            animate={{ width: `${Math.min(100, progress * 100)}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          />
        </div>
      )}
    </div>
  );
}
