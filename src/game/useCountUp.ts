import { useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * A number that rolls up to its target instead of jumping there, so a gain is
 * watched as well as read.
 *
 * Only gains roll. A loss, or a reset to a new level, snaps at once: watching
 * points drain away is a punishment in itself, and a board that still shows the
 * old total after a restart reads as a bug. It starts at the target, too, so a
 * score restored after a reload is simply there rather than counted up from 0.
 *
 * `from` overrides that for a number that should be seen arriving — the
 * totals on a summary card, counted up from 0 as the card opens.
 */
export function useCountUp(target: number, durationMs = 650, from?: number): number {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(from ?? target);
  const current = useRef(from ?? target);

  useLayoutEffect(() => {
    const origin = current.current;
    // From below zero it snaps too: that is a restart after a lost game, and
    // counting up through the old debt would replay the loss.
    if (reduce || target <= origin || origin < 0) {
      current.current = target;
      setShown(target);
      return;
    }

    // Timed from the first frame's own clock, not performance.now(): the two
    // are not guaranteed to agree, and a frame stamped "before" the start ran
    // the roll backwards into negative numbers.
    let start: number | null = null;
    let frame = 0;
    const tick = (now: number) => {
      start ??= now;
      const t = Math.min(1, Math.max(0, (now - start) / durationMs));
      const eased = 1 - (1 - t) ** 3;
      current.current = Math.round(origin + (target - origin) * eased);
      setShown(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduce]);

  return shown;
}
