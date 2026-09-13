import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TimerBarProps {
  /** Epoch ms the question was asked. */
  askedAt: number;
  seconds: number;
  running: boolean;
}

/**
 * Driven by requestAnimationFrame rather than a 50ms interval fighting a CSS
 * transition, so the bar tracks the real deadline instead of drifting behind it.
 */
export function TimerBar({ askedAt, seconds, running }: TimerBarProps) {
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

  return (
    <div
      className="h-3 w-full overflow-hidden rounded-full bg-muted"
      role="timer"
      aria-label="Time remaining"
    >
      <div
        className={cn(
          "h-full rounded-full transition-colors",
          urgent ? "bg-wrong" : "bg-primary",
          urgent && "animate-pulse",
        )}
        style={{ width: `${Math.max(0, fraction * 100)}%` }}
      />
    </div>
  );
}
