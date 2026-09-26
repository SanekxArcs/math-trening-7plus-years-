import { motion } from "motion/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Translate } from "@/i18n/useI18n";

/**
 * The dashboard's building blocks, in the game's own look — the frosted
 * panels of the HUD — but calmer: this is read at a desk, not played with.
 */

export function Panel({
  children,
  className,
  delay = 0,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
} & React.AriaAttributes & { role?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28, delay }}
      className={cn(
        "relative rounded-xl border border-border/70 bg-card/90 p-5 shadow-[0_12px_32px_-18px_oklch(0.4_0.16_295/0.45)] backdrop-blur-md",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.section>
  );
}

/** A panel's heading: a tinted icon, a title, and an optional line under it. */
export function PanelTitle({
  icon: Icon,
  title,
  hint,
  hue = "var(--primary)",
  action,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  hint?: string | undefined;
  hue?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
        style={{ background: `linear-gradient(180deg, color-mix(in oklch, ${hue} 85%, white), ${hue})` }}
      >
        <Icon className="size-4.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-black leading-tight">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/** Up or down against last week. Arrow and sign as well as colour, never colour alone. */
export function DeltaChip({ now, before, unit = "" }: { now: number; before: number; unit?: string }) {
  const diff = Math.round(now - before);
  if (diff === 0) return null;
  const up = diff > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
        up ? "bg-correct/15 text-correct" : "bg-wrong/12 text-wrong",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {up ? "+" : "−"}
      {Math.abs(diff)}
      {unit}
    </span>
  );
}

/** "just now", "5 min ago", "yesterday", "3 days ago" — how parents say it. */
export function timeAgo(t: Translate, then: number, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - then) / 60_000));
  if (minutes < 2) return t("justNow");
  if (minutes < 60) return t("minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t("yesterday");
  return t("daysAgo", { count: days });
}

export const OP_SYMBOL: Record<string, string> = { add: "+", sub: "−", mul: "×", div: "÷" };

/** A hue per operation, from the answer-tile palette, so each reads the same everywhere. */
export const OP_HUE: Record<string, string> = {
  add: "var(--option-0)",
  sub: "var(--option-3)",
  mul: "var(--option-2)",
  div: "var(--option-4)",
};
