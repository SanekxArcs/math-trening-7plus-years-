import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { useCountUp } from "@/game/useCountUp";

/**
 * The purse. On a payout the coin flips and the count rolls up, so money coming
 * in is seen as well as counted; spending just ticks down.
 */
export function CoinCount({ coins, className }: { coins: number; className?: string }) {
  const { t } = useI18n();
  const shown = useCountUp(coins, 900);

  // Only a gain spins the coin — paying for hay is not a celebration.
  const previous = useRef(coins);
  const [spin, setSpin] = useState(0);
  useEffect(() => {
    if (coins > previous.current) setSpin((n) => n + 1);
    previous.current = coins;
  }, [coins]);

  return (
    <span
      className={cn(
        "relative flex items-center gap-1.5 rounded-full border border-combo/40 bg-linear-to-b from-combo/25 to-combo/10 py-1 pl-1 pr-3.5 font-display text-xl font-black tabular-nums text-combo-foreground shadow-sm dark:text-combo",
        className,
      )}
      role="img"
      aria-label={`${coins} ${t("coins", { coins })}`}
    >
      <motion.span
        key={spin}
        initial={spin ? { rotateY: 0, scale: 1.25 } : false}
        animate={{ rotateY: 360, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="flex"
        style={{ transformPerspective: 200 }}
      >
        <CoinIcon className="size-7" />
      </motion.span>
      {shown}
    </span>
  );
}

/** A proper coin rather than the 🪙 emoji, which renders differently everywhere. */
export function CoinIcon({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset="1" stopColor="#d98a0b" />
        </linearGradient>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd64a" />
          <stop offset="1" stopColor="#f2a516" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#${id}-rim)`} />
      <circle cx="16" cy="16" r="11.5" fill={`url(#${id}-face)`} stroke="#c47a06" strokeOpacity=".45" />
      <path
        d="M16 9.5l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z"
        fill="#fff6c9"
        stroke="#c47a06"
        strokeOpacity=".5"
        strokeWidth=".8"
        strokeLinejoin="round"
      />
      <ellipse cx="11.5" cy="8.5" rx="4.5" ry="2" fill="#fff" opacity=".45" transform="rotate(-25 11.5 8.5)" />
    </svg>
  );
}
