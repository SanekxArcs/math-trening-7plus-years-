import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Star, TriangleAlert, Trophy } from "lucide-react";
import { lossLimit, type ScoreState } from "@/engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { CoinCount } from "@/pets/CoinCount";
import type { SyncStatus } from "@/sync/useSync";
import { ComboMeter } from "./ComboMeter";
import { SyncBadge } from "./SyncBadge";
import { TimerBar } from "./TimerBar";
import { useCountUp } from "./useCountUp";

export interface GameHudProps {
  score: ScoreState;
  level: number;
  coins: number;
  syncStatus?: SyncStatus | null | undefined;
  /** Points to win the round, or null when the parent turned the goal off. */
  goal: number | null;
  timer: { askedAt: number; seconds: number; running: boolean } | null;
}

/**
 * Everything the child reads while playing, in one panel: level, combo and
 * purse on top, the points and the road to the goal under them, and the clock
 * running along the bottom edge.
 *
 * One panel rather than loose pieces so it reads as a single instrument — the
 * eye learns where each thing lives and stops hunting. Read-only on purpose:
 * everything to tap lives in the bar at the bottom, under the thumb.
 */
export function GameHud({ score, level, coins, syncStatus, goal, timer }: GameHudProps) {
  // The real total, below zero included: a wrong answer is seen to cost
  // something. Coins are still paid on the floored total, so a bad run can
  // never take coins away.
  const points = score.rawPoints;
  const shown = useCountUp(points);
  const pulse = useAnswerPulse(score);

  return (
    <header className="sticky top-3 z-30 overflow-hidden rounded-xl border border-border/70 bg-card/85 shadow-[0_12px_32px_-14px_oklch(0.4_0.16_295/0.45)] backdrop-blur-md">
      {/* A hairline of light along the top edge, the way a real game panel catches it. */}
      <span
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent"
        aria-hidden
      />

      <div className="flex flex-col gap-3 px-4 pb-3 pt-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <LevelBadge level={level} className="justify-self-start" />
          <ComboMeter score={score} />
          <div className="flex items-center gap-2 justify-self-end">
            {syncStatus && <SyncBadge status={syncStatus} />}
            <CoinCount coins={coins} className="text-lg" />
          </div>
        </div>

        {goal !== null ? (
          <GoalBar points={points} shown={shown} goal={goal} pulse={pulse} />
        ) : (
          <div className="flex justify-center">
            <Points shown={shown} pulse={pulse} />
          </div>
        )}
      </div>

      {timer && (
        <TimerBar askedAt={timer.askedAt} seconds={timer.seconds} running={timer.running} />
      )}
    </header>
  );
}

function LevelBadge({ level, className }: { level: number; className?: string }) {
  const { t } = useI18n();
  return (
    <motion.div
      // Keyed so a new level lands with a stamp rather than just changing digits.
      key={level}
      initial={{ scale: 0.4, rotate: -14, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 16 }}
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-linear-to-b from-primary to-primary/80 py-1 pl-1 pr-3 text-primary-foreground shadow-[0_3px_10px_-3px_var(--primary)]",
        className,
      )}
    >
      <span className="flex size-6 items-center justify-center rounded-full bg-primary-foreground/20">
        <Star className="size-3.5" fill="currentColor" aria-hidden />
      </span>
      <span className="whitespace-nowrap font-display text-sm font-black tabular-nums">
        {t("levelShort", { level })}
      </span>
    </motion.div>
  );
}

type Pulse = { id: number; kind: "gain" | "loss" } | null;

/**
 * One beat per answer: "gain" for a right one, "loss" for a wrong one. Keyed on
 * the answer counts rather than the points, so a mistake at 0 — where the shown
 * score cannot drop — still registers.
 */
function useAnswerPulse(score: ScoreState): Pulse {
  const [pulse, setPulse] = useState<Pulse>(null);
  const previous = useRef({ correct: score.correct, wrong: score.wrong });

  useEffect(() => {
    const before = previous.current;
    previous.current = { correct: score.correct, wrong: score.wrong };
    const kind =
      score.correct > before.correct ? "gain" : score.wrong > before.wrong ? "loss" : null;
    if (kind) setPulse((p) => ({ id: (p?.id ?? 0) + 1, kind }));
  }, [score.correct, score.wrong]);

  return pulse;
}

/**
 * The points readout. A right answer pops it with a green glow, a wrong one
 * shakes it with a red one. `total` is the goal, when there is one.
 */
function Points({ shown, total, pulse }: { shown: number; total?: number; pulse: Pulse }) {
  const { t } = useI18n();
  return (
    <span className="relative flex shrink-0 items-baseline gap-1">
      {pulse && (
        <motion.span
          key={`glow-${pulse.id}`}
          initial={{ opacity: 0.7, scale: 0.5 }}
          animate={{ opacity: 0, scale: 1.8 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 h-8 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md",
            pulse.kind === "gain" ? "bg-correct/60" : "bg-wrong/50",
          )}
          aria-hidden
        />
      )}
      {/* The number is its own element so it can be read — and found — alone. */}
      <motion.span
        key={pulse?.id ?? 0}
        animate={
          pulse?.kind === "gain"
            ? { scale: [1, 1.3, 1] }
            : pulse?.kind === "loss"
              ? { x: [0, -6, 5, -4, 2, 0] }
              : {}
        }
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={cn(
          "relative inline-block font-display text-xl font-black leading-none tabular-nums transition-colors duration-300",
          shown < 0 ? "text-wrong" : "text-primary",
        )}
      >
        {shown}
      </motion.span>
      <span className="relative font-display text-sm font-bold tabular-nums text-muted-foreground">
        {total !== undefined ? `/ ${total}` : t("points")}
      </span>
    </span>
  );
}

/**
 * The road to the goal. The trophy at the end wakes up in the last stretch, so
 * a child can feel the finish coming without doing the subtraction.
 *
 * Below zero the same bar turns round and becomes the danger meter: red,
 * filling towards the limit where the game is lost, with a warning sign where
 * the trophy was — so the child can see how close the edge is before they
 * reach it, not only after.
 */
function GoalBar({
  points,
  shown,
  goal,
  pulse,
}: {
  points: number;
  shown: number;
  goal: number;
  pulse: Pulse;
}) {
  const { t } = useI18n();
  const danger = points < 0;
  const limit = lossLimit(goal);
  const fraction = danger
    ? Math.min(1, -points / limit)
    : Math.max(0, Math.min(1, points / goal));
  const close = fraction >= (danger ? 0.5 : 0.75);

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative h-4 flex-1 rounded-full bg-muted shadow-[inset_0_1px_3px_oklch(0_0_0/0.14)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={danger ? limit : goal}
        aria-valuenow={danger ? Math.min(-points, limit) : Math.max(0, Math.min(points, goal))}
        {...(danger ? { "aria-label": t("lossLimitLabel", { points: -limit }) } : {})}
      >
        <motion.div
          className={cn(
            "hud-sheen relative h-full overflow-hidden rounded-full bg-linear-to-r",
            danger
              ? "from-wrong to-[oklch(0.7_0.2_40)] shadow-[0_0_10px_-2px_var(--wrong)]"
              : "from-correct to-[oklch(0.8_0.17_135)] shadow-[0_0_10px_-2px_var(--correct)]",
          )}
          initial={false}
          animate={{ width: `${fraction * 100}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
        >
          {/* Top highlight: what makes a flat bar read as a glossy tube. */}
          <span
            className="absolute inset-x-1.5 top-0.5 h-1 rounded-full bg-white/40"
            aria-hidden
          />
        </motion.div>
        {/* Quarter marks, faint, so progress has landmarks. */}
        {[0.25, 0.5, 0.75].map((at) => (
          <span
            key={at}
            className="absolute top-1/2 h-2 w-0.5 -translate-y-1/2 rounded-full bg-foreground/10"
            style={{ left: `${at * 100}%` }}
            aria-hidden
          />
        ))}
      </div>

      <Points shown={shown} total={danger ? -limit : goal} pulse={pulse} />

      <motion.span
        animate={close ? { scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] } : { scale: 1, rotate: 0 }}
        transition={
          close ? { duration: danger ? 0.8 : 1.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }
        }
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors duration-500",
          danger
            ? "bg-linear-to-b from-wrong to-[oklch(0.5_0.2_15)] text-wrong-foreground shadow-[0_0_14px_-2px_var(--wrong)]"
            : close
              ? "bg-linear-to-b from-combo to-[oklch(0.7_0.19_50)] text-combo-foreground shadow-[0_0_14px_-2px_var(--combo)]"
              : "bg-muted text-muted-foreground",
        )}
      >
        {danger ? <TriangleAlert className="size-4" aria-hidden /> : <Trophy className="size-4" aria-hidden />}
      </motion.span>
    </div>
  );
}
