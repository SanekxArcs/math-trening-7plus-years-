import { motion, type MotionStyle } from "motion/react";
import {
  Eye,
  Flame,
  KeyRound,
  Moon,
  MousePointerClick,
  Play,
  Scissors,
  Settings2,
  Star,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PetArt } from "@/pets/PetArt";
import { CoinIcon } from "@/pets/CoinCount";

/**
 * The pictures for the walkthrough: each a tiny, looping replica of the real
 * thing on the game screen — the same candy tiles, the same bars and chips —
 * so what the child learns here is what they will recognise when they play.
 * Decoration only; every slide's text says it all in words.
 */

const loop = { repeat: Infinity, repeatDelay: 0.8 } as const;

function Tile({ value, index, className, style }: { value: number; index: number; className?: string; style?: MotionStyle }) {
  return (
    <motion.span
      className={cn("answer-tile flex h-12 w-16 items-center justify-center font-display text-2xl font-black", className)}
      style={{ "--tile": `var(--option-${index})`, ...style } as MotionStyle}
    >
      <span className="relative">{value}</span>
    </motion.span>
  );
}

export function WelcomeScene() {
  return (
    <div className="relative flex items-end justify-center gap-2">
      {["+", "×", "÷"].map((char, i) => (
        <motion.span
          key={char}
          className="absolute font-display text-4xl font-black text-primary/40"
          style={{ left: `${10 + i * 38}%`, top: i === 1 ? "-10%" : "5%" }}
          animate={{ y: [0, -10, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
        >
          {char}
        </motion.span>
      ))}
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
        <PetArt species="horse" mood="happy" animated className="size-36" />
      </motion.div>
      <motion.span animate={{ rotateY: [0, 360] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}>
        <CoinIcon className="mb-4 size-10" />
      </motion.span>
    </div>
  );
}

/** A sum, four tiles, and a finger that taps the right one — which turns green. */
export function AnswerScene() {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="font-display text-4xl font-black tabular-nums">
        3 <span className="text-primary">+</span> 4 = <span className="text-primary">?</span>
      </p>
      <div className="relative grid grid-cols-2 gap-x-2.5 gap-y-3">
        <Tile value={6} index={0} />
        <span className="relative">
          <Tile value={7} index={1} />
          {/* The same tile turning green the moment the finger lands on it. */}
          <motion.span
            className="answer-tile absolute inset-0 flex items-center justify-center font-display text-2xl font-black"
            data-state="correct"
            animate={{ opacity: [0, 0, 1, 1] }}
            transition={{ duration: 2.4, times: [0, 0.45, 0.5, 1], ...loop }}
          >
            <span className="relative">7</span>
          </motion.span>
        </span>
        <Tile value={8} index={2} />
        <Tile value={5} index={3} />
        <motion.span
          className="pointer-events-none absolute text-foreground drop-shadow"
          initial={{ left: "10%", top: "110%" }}
          animate={{ left: ["10%", "78%", "78%", "10%"], top: ["110%", "20%", "25%", "110%"], scale: [1, 1, 0.8, 1] }}
          transition={{ duration: 2.4, times: [0, 0.4, 0.5, 1], ...loop }}
        >
          <MousePointerClick className="size-8" aria-hidden />
        </motion.span>
      </div>
    </div>
  );
}

/** The goal bar filling, with points popping off it. */
export function PointsScene() {
  return (
    <div className="flex w-full max-w-64 flex-col items-center gap-4">
      <motion.span
        className="font-display text-2xl font-black text-correct"
        animate={{ y: [8, -6, -6], opacity: [0, 1, 0] }}
        transition={{ duration: 1.2, ...loop }}
      >
        +10
      </motion.span>
      <div className="flex w-full items-center gap-2.5">
        <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_3px_oklch(0_0_0/0.14)]">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-correct to-[oklch(0.8_0.17_135)]"
            animate={{ width: ["10%", "40%", "70%", "100%"] }}
            transition={{ duration: 3, ease: "easeInOut", ...loop }}
          />
        </div>
        <motion.span
          className="flex size-9 items-center justify-center rounded-full bg-linear-to-b from-combo to-[oklch(0.7_0.19_50)] text-combo-foreground"
          animate={{ scale: [1, 1, 1.3, 1], rotate: [0, 0, -10, 0] }}
          transition={{ duration: 3, times: [0, 0.85, 0.95, 1], ...loop }}
        >
          <Trophy className="size-4.5" aria-hidden />
        </motion.span>
      </div>
    </div>
  );
}

/** The flame chip climbing ×1 → ×2 → ×3 → ×4. */
export function ComboScene() {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4].map((multiplier, i) => (
        <motion.span
          key={multiplier}
          className={cn(
            "flex items-center gap-1 rounded-full px-3 py-2 font-display font-black",
            multiplier === 1 ? "bg-muted text-muted-foreground" : "bg-linear-to-b from-combo to-[oklch(0.7_0.19_50)] text-combo-foreground",
          )}
          initial={{ opacity: 0.3, scale: 0.8 }}
          animate={{ opacity: [0.3, 1, 1, 0.3], scale: [0.8, 1.15, 1, 0.8] }}
          transition={{ duration: 3.2, times: [0, 0.1, 0.8, 1], delay: i * 0.6, repeat: Infinity, repeatDelay: 0.4 }}
        >
          <Flame className="size-4" fill={multiplier > 1 ? "currentColor" : "none"} aria-hidden />×{multiplier}
        </motion.span>
      ))}
    </div>
  );
}

/** A mistake costs more each time, and the bar turns into the danger meter. */
export function MistakesScene() {
  return (
    <div className="flex w-full max-w-64 flex-col items-center gap-3">
      <div className="flex gap-2 font-display text-xl font-black text-wrong">
        {["−10", "−25", "−45"].map((cost, i) => (
          <motion.span
            key={cost}
            className="rounded-full bg-wrong/12 px-2.5 py-1"
            animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, 0] }}
            transition={{ duration: 3, times: [0, 0.15, 0.85, 1], delay: i * 0.5, repeat: Infinity, repeatDelay: 0.5 }}
          >
            {cost}
          </motion.span>
        ))}
      </div>
      <div className="flex w-full items-center gap-2.5">
        <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-wrong to-[oklch(0.7_0.2_40)]"
            animate={{ width: ["0%", "35%", "80%"] }}
            transition={{ duration: 3, ...loop }}
          />
        </div>
        <motion.span
          className="flex size-9 items-center justify-center rounded-full bg-wrong text-wrong-foreground"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <TriangleAlert className="size-4.5" aria-hidden />
        </motion.span>
      </div>
    </div>
  );
}

/** The clock line running down, calm to urgent. */
export function TimerScene() {
  return (
    <div className="w-full max-w-64 overflow-hidden rounded-full bg-muted">
      <motion.div
        className="h-3 rounded-full"
        animate={{
          width: ["100%", "50%", "20%", "0%"],
          backgroundColor: ["var(--primary)", "var(--combo)", "var(--wrong)", "var(--wrong)"],
        }}
        transition={{ duration: 4, ease: "linear", ...loop }}
      />
    </div>
  );
}

/** The two lifeline buttons as they sit in the dock, taking turns to be pressed. */
export function HelpersScene({ halfHalf, hint }: { halfHalf: boolean; hint: boolean }) {
  const buttons = [
    ...(halfHalf ? [{ icon: Scissors, key: "half" }] : []),
    ...(hint ? [{ icon: Eye, key: "hint" }] : []),
  ];
  return (
    <div className="flex gap-6">
      {buttons.map(({ icon: Icon, key }, i) => (
        <motion.span
          key={key}
          className="flex size-16 items-center justify-center rounded-full border-b-4 border-black/15 bg-linear-to-b from-secondary to-accent text-primary shadow-[0_6px_16px_-6px_var(--primary)]"
          animate={{ y: [0, 0, 3, 0], scale: [1, 1, 0.92, 1] }}
          transition={{ duration: 2, times: [0, 0.4, 0.5, 0.6], delay: i, repeat: Infinity }}
        >
          <Icon className="size-7" aria-hidden />
        </motion.span>
      ))}
    </div>
  );
}

/** A level badge stamping in, and coins falling into a pile. */
export function LevelsScene() {
  return (
    <div className="relative flex flex-col items-center gap-3">
      <motion.span
        className="flex items-center gap-1.5 rounded-full bg-linear-to-b from-primary to-primary/80 py-1.5 pl-1.5 pr-4 font-display text-lg font-black text-primary-foreground shadow-[0_6px_16px_-6px_var(--primary)]"
        animate={{ scale: [0.6, 1.1, 1], rotate: [-12, 4, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-primary-foreground/20">
          <Star className="size-4" fill="currentColor" aria-hidden />
        </span>
        2
      </motion.span>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            animate={{ y: [-40, 0, 0], opacity: [0, 1, 1], rotateY: [0, 360, 360] }}
            transition={{ duration: 2.8, times: [0, 0.3, 1], delay: i * 0.15, repeat: Infinity }}
          >
            <CoinIcon className="size-8" />
          </motion.span>
        ))}
      </div>
    </div>
  );
}

/** The pet, being fed and washed. */
export function PetsScene() {
  return (
    <div className="relative flex items-end justify-center">
      {["🥕", "🧽", "🎾"].map((emoji, i) => (
        <motion.span
          key={emoji}
          className="absolute text-3xl"
          style={{ left: `${15 + i * 30}%` }}
          animate={{ y: [0, -60], opacity: [0, 1, 0] }}
          transition={{ duration: 2, delay: i * 0.7, repeat: Infinity, repeatDelay: 0.2 }}
        >
          {emoji}
        </motion.span>
      ))}
      <PetArt species="horse" mood="happy" animated className="size-36" />
    </div>
  );
}

export function BedtimeScene() {
  return (
    <div className="relative flex items-end justify-center rounded-2xl bg-linear-to-b from-indigo-400 to-violet-300 px-10 pt-4 dark:from-indigo-950 dark:to-violet-950">
      <Moon className="absolute right-4 top-3 size-8 fill-[oklch(0.95_0.06_95)] text-[oklch(0.95_0.06_95)]" aria-hidden />
      <PetArt species="horse" mood="asleep" animated className="size-32" />
    </div>
  );
}

export function GrownUpsScene() {
  return (
    <div className="flex items-center gap-5">
      {[Settings2, KeyRound].map((Icon, i) => (
        <motion.span
          key={i}
          className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.6, delay: i * 0.8, repeat: Infinity, repeatDelay: 0.8 }}
        >
          <Icon className="size-7" aria-hidden />
        </motion.span>
      ))}
    </div>
  );
}

export function ReadyScene() {
  return (
    <motion.span
      className="flex size-24 items-center justify-center rounded-full border-b-4 border-black/20 bg-linear-to-b from-primary to-primary/80 text-primary-foreground shadow-[0_12px_30px_-8px_var(--primary)] ring-8 ring-primary/15"
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 1.2, repeat: Infinity }}
    >
      <Play className="ml-1.5 size-11" fill="currentColor" strokeWidth={0} aria-hidden />
    </motion.span>
  );
}
