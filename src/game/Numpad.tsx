import { motion } from "motion/react";
import { Check, Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumpadProps {
  value: string;
  revealed: boolean;
  correct: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Expert mode's only input. Deliberately not an `<input type="number">`: the OS
 * keyboard on a tablet covers the question it is meant to answer, and its
 * spinner arrows invite a child to hunt for the answer one step at a time.
 */
export function Numpad({
  value,
  revealed,
  correct,
  onDigit,
  onBackspace,
  onSubmit,
}: NumpadProps) {
  const disabled = revealed;

  return (
    <div className="space-y-4">
      <motion.div
        animate={
          revealed && !correct ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }
        }
        transition={{ duration: 0.4 }}
        className={cn(
          "flex h-20 items-center justify-center rounded-[--radius-lg] border-4 bg-card font-display text-5xl font-black tabular-nums",
          revealed && correct && "border-correct text-correct",
          revealed && !correct && "border-wrong text-wrong",
          !revealed && "border-border text-foreground",
        )}
        aria-live="polite"
      >
        {value === "" ? (
          <span className="text-muted-foreground/40">?</span>
        ) : (
          value
        )}
      </motion.div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {KEYS.map((key) => (
          <NumKey key={key} label={key} disabled={disabled} onClick={() => onDigit(key)} />
        ))}

        <NumKey
          label={<Delete className="size-7" aria-hidden />}
          ariaLabel="Delete last digit"
          disabled={disabled || value.length === 0}
          onClick={onBackspace}
          tone="muted"
        />
        <NumKey label="0" disabled={disabled} onClick={() => onDigit("0")} />
        <NumKey
          label={<Check className="size-8" aria-hidden />}
          ariaLabel="Check answer"
          disabled={disabled || value.length === 0}
          onClick={onSubmit}
          tone="primary"
        />
      </div>
    </div>
  );
}

function NumKey({
  label,
  ariaLabel,
  disabled,
  onClick,
  tone = "default",
}: {
  label: React.ReactNode;
  ariaLabel?: string;
  disabled: boolean;
  onClick: () => void;
  tone?: "default" | "primary" | "muted";
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      whileTap={disabled ? { scale: 1 } : { scale: 0.93 }}
      className={cn(
        // 64px minimum target: a seven-year-old's aim on a moving tablet.
        "flex min-h-16 items-center justify-center rounded-[--radius-md] border-b-4 font-display text-3xl font-black tabular-nums shadow-md transition-colors",
        "focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none",
        "disabled:opacity-35",
        tone === "primary" && "border-primary/60 bg-primary text-primary-foreground",
        tone === "muted" && "border-black/10 bg-muted text-muted-foreground",
        tone === "default" && "border-black/10 bg-card text-foreground",
      )}
    >
      {label}
    </motion.button>
  );
}
