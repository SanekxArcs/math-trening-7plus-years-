import { motion, type MotionStyle } from "motion/react";
import { Check, Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";

interface NumpadProps {
  value: string;
  revealed: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Expert mode's only input. Deliberately not an `<input type="number">`: the OS
 * keyboard on a tablet covers the question it is meant to answer, and its
 * spinner arrows invite a child to hunt for the answer one step at a time.
 *
 * No display of its own: what is typed appears in the sum's answer slot, right
 * where the answer belongs.
 */
export function Numpad({ value, revealed, onDigit, onBackspace, onSubmit }: NumpadProps) {
  const { t } = useI18n();
  const disabled = revealed;

  return (
    <div className="grid grid-cols-3 gap-x-2.5 gap-y-3.5 sm:gap-x-3 sm:gap-y-4">
      {KEYS.map((key, i) => (
        <NumKey key={key} index={i} label={key} disabled={disabled} onClick={() => onDigit(key)} />
      ))}

      <NumKey
        index={9}
        label={<Delete className="size-7" aria-hidden />}
        ariaLabel={t("deleteDigit")}
        disabled={disabled || value.length === 0}
        onClick={onBackspace}
        tone="muted"
      />
      <NumKey index={10} label="0" disabled={disabled} onClick={() => onDigit("0")} />
      <NumKey
        index={11}
        label={<Check className="size-8" strokeWidth={3.5} aria-hidden />}
        ariaLabel={t("checkAnswer")}
        disabled={disabled || value.length === 0}
        onClick={onSubmit}
        tone="primary"
      />
    </div>
  );
}

const TONE_HUE = {
  default: "var(--primary)",
  muted: "var(--muted-foreground)",
  primary: "var(--correct)",
} as const;

function NumKey({
  index,
  label,
  ariaLabel,
  disabled,
  onClick,
  tone = "default",
}: {
  index: number;
  label: React.ReactNode;
  ariaLabel?: string;
  disabled: boolean;
  onClick: () => void;
  tone?: keyof typeof TONE_HUE;
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      data-tone={tone === "primary" ? "solid" : undefined}
      data-state={disabled ? "dim" : undefined}
      initial={{ opacity: 0, y: 16, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 24, delay: index * 0.025 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      className={cn(
        // 64px minimum target: a seven-year-old's aim on a moving tablet.
        "answer-tile flex min-h-16 items-center justify-center font-display text-3xl font-black tabular-nums",
        "disabled:cursor-default",
      )}
      style={{ "--tile": TONE_HUE[tone] } as MotionStyle}
    >
      {label}
    </motion.button>
  );
}
