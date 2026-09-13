import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Play, RefreshCw, Square } from "lucide-react";
import type { HintModel } from "@/engine";
import { useI18n } from "@/i18n/useI18n";
import { VisualHint, nextHintMode, type HintMode } from "./VisualHint";

/** One group per beat. Slow enough to say the number out loud alongside it. */
const STEP_MS = 850;

interface HintPanelProps {
  hint: HintModel;
  /** The answer to the question the picture belongs to. */
  answer: number;
}

/**
 * The picture hint, plus the part that actually teaches: counting it.
 *
 * A static array of dots shows a child *that* the answer is twelve; stepping
 * through it group by group with a running total shows them *why* — it is skip
 * counting, 4, 8, 12, which is the method they are meant to end up with. The
 * static view stays the default because sometimes they only need a reminder.
 */
export function HintPanel({ hint, answer }: HintPanelProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<HintMode>("boxes");
  const [lit, setLit] = useState<number | null>(null);
  const timer = useRef(0);

  const total = hint.groups * hint.perGroup;

  /**
   * Counting up is offered only when the picture totals the answer — that is,
   * for multiplication. A division draws the same picture but the other way
   * round: 28 ÷ 7 is 7 groups of 4, so counting the dots reaches 28 while the
   * answer is 4. Skip counting there would walk the child to the wrong number,
   * so the picture stays and the button does not appear.
   */
  const countable =
    hint.groups > 0 && hint.perGroup > 0 && total <= 144 && total === answer;
  const counting = lit !== null && lit < hint.groups;
  const finished = lit !== null && lit >= hint.groups;

  const stop = useCallback(() => {
    window.clearTimeout(timer.current);
    setLit(null);
  }, []);

  // Advance one group per beat. Keyed on `lit`, so each step schedules only the
  // next one and any unmount or restart cancels cleanly.
  useEffect(() => {
    if (lit === null || lit >= hint.groups) return;
    timer.current = window.setTimeout(() => setLit((current) => (current ?? 0) + 1), STEP_MS);
    return () => window.clearTimeout(timer.current);
  }, [lit, hint.groups]);

  const counted = (lit ?? 0) * hint.perGroup;

  return (
    <div className="space-y-3">
      <VisualHint hint={hint} mode={mode} litGroups={lit} />

      {/* Fixed height so the picture does not jump when the total appears. The
          number is never unmounted between steps — an exit animation would make
          it blink out and land a beat behind the dots it is counting. */}
      <div className="flex h-8 items-center justify-center">
        {lit !== null && lit > 0 && (
          <motion.p
            key={lit}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="font-display text-xl font-black tabular-nums text-primary"
          >
            {finished
              ? t("countedTotal", { total: counted })
              : t("runningTotal", { total: counted })}
          </motion.p>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {countable && (
          <button
            type="button"
            onClick={() => (counting ? stop() : setLit(0))}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-sm focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
          >
            {counting ? (
              <Square className="size-3.5" aria-hidden />
            ) : (
              <Play className="size-3.5" aria-hidden />
            )}
            {counting ? t("stopCounting") : finished ? t("countAgain") : t("countTogether")}
          </button>
        )}

        <button
          type="button"
          onClick={() => setMode(nextHintMode)}
          className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground shadow-sm focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          {t("changeView")}
        </button>
      </div>
    </div>
  );
}
