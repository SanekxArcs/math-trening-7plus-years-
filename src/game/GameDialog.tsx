import { motion } from "motion/react";
import { Check, Flame, Star, Target } from "lucide-react";
import type { ScoreState } from "@/engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { useCountUp } from "./useCountUp";

/**
 * The game's full-screen moments — paused, level won, good night — share one
 * frame: the frosted panel of the HUD and dock, with a round badge floating
 * over its top edge that says at a glance what kind of moment it is.
 */

export function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-scrim p-5 pt-16 backdrop-blur-sm"
    >
      {children}
    </motion.div>
  );
}

export type DialogTone = "primary" | "win" | "night" | "lost";

const HERO_TONE: Record<DialogTone, string> = {
  primary: "from-primary to-primary/75 text-primary-foreground shadow-[0_10px_30px_-8px_var(--primary)]",
  win: "from-combo to-[oklch(0.7_0.19_50)] text-combo-foreground shadow-[0_10px_30px_-8px_var(--combo)]",
  lost: "from-wrong to-[oklch(0.5_0.2_15)] text-wrong-foreground shadow-[0_10px_30px_-8px_var(--wrong)]",
  night:
    "from-[oklch(0.42_0.14_280)] to-[oklch(0.28_0.1_275)] text-[oklch(0.95_0.05_90)] shadow-[0_10px_30px_-8px_oklch(0.35_0.14_280)]",
};

export function GameDialog({
  hero,
  tone = "primary",
  children,
}: {
  /** What sits in the badge: an icon, or the pet itself. */
  hero: React.ReactNode;
  tone?: DialogTone;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ scale: 0.85, y: 30, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.9, y: 20, opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="relative my-auto w-full max-w-sm rounded-xl border border-border/70 bg-card/95 px-6 pb-6 pt-16 text-center shadow-2xl backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <span
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent"
        aria-hidden
      />
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.1 }}
        className={cn(
          "absolute left-1/2 top-0 flex size-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-linear-to-b ring-8 ring-card",
          HERO_TONE[tone],
        )}
      >
        {hero}
      </motion.div>
      {children}
    </motion.div>
  );
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("font-display text-3xl font-black leading-tight", className)}>{children}</h2>
  );
}

/** The one thing to do next: big, 3D, pressable — the dock's centre button in bar form. */
export const primaryActionClass =
  "flex w-full items-center justify-center gap-2 rounded-lg border-b-[6px] border-black/20 bg-linear-to-b from-primary to-primary/80 py-4 font-display text-xl font-black text-primary-foreground shadow-[0_10px_24px_-10px_var(--primary)] transition-[translate,border-width] duration-150 hover:-translate-y-0.5 active:translate-y-1 active:border-b-2 focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none";

/** A real alternative, but not the suggested one. */
export const secondaryActionClass =
  "flex w-full items-center justify-center gap-2 rounded-lg border border-border/70 border-b-4 border-b-black/10 bg-secondary py-3 font-display text-lg font-bold text-secondary-foreground transition-[translate,border-width] duration-150 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none";

/** The quiet way out. */
export const ghostActionClass =
  "flex w-full items-center justify-center gap-2 rounded-lg py-3 font-display font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none";

/**
 * The session in four numbers, each counted up from 0 as the card opens so the
 * total is watched arriving — the payoff for the run, not a line of small print.
 */
export function SessionStats({ score, className }: { score: ScoreState; className?: string }) {
  const { t } = useI18n();
  const answered = score.correct + score.wrong;
  const accuracy = answered === 0 ? null : Math.round((score.correct / answered) * 100);

  const stats = [
    { icon: Star, value: score.rawPoints, label: t("sumPoints"), hue: "var(--primary)" },
    { icon: Check, value: score.correct, label: t("sumCorrect"), hue: "var(--correct)" },
    { icon: Flame, value: score.bestStreak, label: t("sumStreak"), hue: "var(--combo)" },
    { icon: Target, value: accuracy, suffix: "%", label: t("sumAccuracy"), hue: "var(--option-0)" },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-2.5", className)}>
      {stats.map((stat, i) => (
        <StatTile key={stat.label} index={i} {...stat} />
      ))}
    </div>
  );
}

function StatTile({
  icon: Icon,
  value,
  suffix = "",
  label,
  hue,
  index,
}: {
  icon: typeof Star;
  value: number | null;
  suffix?: string;
  label: string;
  hue: string;
  index: number;
}) {
  const shown = useCountUp(value ?? 0, 900, 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.2 + index * 0.07 }}
      className="flex items-center gap-2.5 rounded-lg p-2.5 text-left"
      style={{ background: `color-mix(in oklch, ${hue} 12%, var(--card))` }}
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
        style={{ background: hue }}
      >
        <Icon className="size-4" strokeWidth={3} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-xl font-black leading-none tabular-nums">
          {value === null ? "—" : `${shown}${suffix}`}
        </span>
        <span className="block truncate text-xs font-bold text-muted-foreground">{label}</span>
      </span>
    </motion.div>
  );
}
