import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface PowerButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  /** Required: the button is an icon alone, so this is its only name. */
  "aria-label": string;
  "aria-expanded"?: boolean;
  disabled?: boolean;
  /** Toggled on, like an open hint. */
  active?: boolean;
  /** 0..1 while recharging; drawn as a ring filling round the button. */
  charge?: number | null;
}

/**
 * The lifelines — 50:50 and the picture hint — as round icon buttons flanking
 * pause in the dock. Icons only: what each one does and costs is taught once,
 * by the onboarding, not spelled out on every question. The name is still on
 * the button for screen readers and as a hover tooltip.
 */
export function PowerButton({
  icon,
  onClick,
  disabled = false,
  active = false,
  charge = null,
  ...aria
}: PowerButtonProps) {
  const R = 22;
  const C = 2 * Math.PI * R;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={aria["aria-label"]}
      whileTap={disabled ? {} : { scale: 0.9 }}
      {...aria}
      className={cn(
        "relative flex size-12 shrink-0 items-center justify-center rounded-full border-b-4 transition-[translate,border-width,background-color,color,box-shadow] duration-150",
        "focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none",
        disabled
          ? "cursor-default border-black/5 bg-muted text-muted-foreground/60"
          : active
            ? "border-black/10 bg-accent text-accent-foreground ring-2 ring-primary/60"
            : "border-black/15 bg-linear-to-b from-secondary to-accent text-primary shadow-[0_4px_12px_-6px_var(--primary)] hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2",
      )}
    >
      {icon}
      {charge !== null && (
        <svg
          viewBox="0 0 48 48"
          className="pointer-events-none absolute -inset-1 size-14 -rotate-90"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r={R} fill="none" strokeWidth="3" className="stroke-muted" />
          <circle
            cx="24"
            cy="24"
            r={R}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className="stroke-primary transition-[stroke-dashoffset] duration-200 ease-linear"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - charge)}
          />
        </svg>
      )}
    </motion.button>
  );
}
