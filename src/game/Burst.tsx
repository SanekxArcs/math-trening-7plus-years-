import { motion, useReducedMotion } from "motion/react";

const COLORS = ["#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#60a5fa"];
const COUNT = 10;

/**
 * A ring of sparks thrown off whatever it sits in — the tile a right answer was
 * tapped on, the slot the answer lands in. Local and small on purpose: the
 * full-screen confetti is saved for combo tiers and wins, so it keeps meaning
 * something.
 *
 * Mount it with a fresh key to fire it again.
 */
export function Burst({ distance = 56, delay = 0 }: { distance?: number; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <span
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
      aria-hidden
    >
      {Array.from({ length: COUNT }, (_, i) => {
        const angle = (i / COUNT) * Math.PI * 2 + (i % 2) * 0.3;
        const reach = distance * (i % 2 ? 0.75 : 1);
        return (
          <motion.span
            key={i}
            className={i % 3 === 0 ? "absolute size-2.5 rotate-45 rounded-[2px]" : "absolute size-2 rounded-full"}
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * reach,
              y: Math.sin(angle) * reach,
              scale: [0, 1.3, 0],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.7, ease: "easeOut", delay }}
          />
        );
      })}
    </span>
  );
}
