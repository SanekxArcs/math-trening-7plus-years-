import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TimerBarProps {
  /** Epoch ms the question was asked. */
  askedAt: number;
  seconds: number;
  running: boolean;
  className?: string;
}

/**
 * Driven by requestAnimationFrame rather than a 50ms interval fighting a CSS
 * transition, so the bar tracks the real deadline instead of drifting behind it.
 *
 * Calm, then warm, then urgent: the colour tells the child how much time is
 * left without them having to judge a bar's length mid-sum.
 */
export function TimerBar({ askedAt, seconds, running, className }: TimerBarProps) {
  const [fraction, setFraction] = useState(1);
  const frame = useRef(0);

  useEffect(() => {
    if (!running) return;

    const total = seconds * 1000;
    const tick = () => {
      const remaining = Math.max(0, askedAt + total - Date.now());
      setFraction(remaining / total);
      if (remaining > 0) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame.current);
  }, [askedAt, seconds, running]);

  const urgent = fraction < 0.25;
  const warm = fraction < 0.5;

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden bg-muted", className)}
      role="timer"
      aria-label="Time remaining"
    >
      <div
        className={cn(
          "h-full rounded-r-full transition-colors duration-500",
          urgent ? "bg-wrong animate-pulse" : warm ? "bg-combo" : "bg-primary",
        )}
        style={{ width: `${Math.max(0, fraction * 100)}%` }}
      />
    </div>
  );
}
