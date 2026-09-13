import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

interface HalfHalfButtonProps {
  readyAt: number;
  cooldownSec: number;
  usedThisRound: boolean;
  disabled: boolean;
  onUse: () => void;
}

/**
 * 50:50 with a visible cooldown. The countdown ring matters more than the
 * number: "wait until the circle fills" is readable by a child who cannot yet
 * read "18 seconds remaining".
 */
export function HalfHalfButton({
  readyAt,
  cooldownSec,
  usedThisRound,
  disabled,
  onUse,
}: HalfHalfButtonProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (now >= readyAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [readyAt, now]);

  const remainingMs = Math.max(0, readyAt - now);
  const cooling = remainingMs > 0;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress = cooling ? 1 - remainingMs / (cooldownSec * 1000) : 1;
  const unavailable = disabled || usedThisRound || cooling;

  return (
    <motion.button
      type="button"
      onClick={onUse}
      disabled={unavailable}
      whileTap={unavailable ? { scale: 1 } : { scale: 0.94 }}
      aria-label={
        cooling ? `50:50 ready in ${remainingSec} seconds` : "Use 50:50 — removes half the wrong answers"
      }
      className={cn(
        "relative flex items-center gap-2 overflow-hidden rounded-full border-b-4 px-5 py-3 font-display font-bold shadow-md transition-colors",
        "focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none",
        unavailable
          ? "border-black/5 bg-muted text-muted-foreground"
          : "border-primary/50 bg-secondary text-secondary-foreground",
      )}
    >
      {cooling && (
        <span
          className="absolute inset-0 origin-left bg-primary/15"
          style={{ transform: `scaleX(${progress})` }}
          aria-hidden
        />
      )}
      <Scissors className="relative size-5" aria-hidden />
      <span className="relative">50:50</span>
      <span className="relative rounded-md bg-black/5 px-1.5 py-0.5 text-xs tabular-nums">
        {cooling ? `${remainingSec}s` : "½ points"}
      </span>
    </motion.button>
  );
}
