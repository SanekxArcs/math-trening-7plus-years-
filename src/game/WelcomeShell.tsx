import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * The first screens anyone sees — making a profile, restoring one, writing
 * down the pairing code — share this stage: soft light behind, maths symbols
 * drifting past, the name of the game on top, and the same frosted card with
 * a floating badge that the game itself uses for its big moments.
 */
export function WelcomeShell({ children, top }: { children: React.ReactNode; top?: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center overflow-hidden px-4 pb-10 pt-8">
      <Backdrop />
      <div className="relative flex w-full max-w-md flex-col items-center gap-5">
        <Brand />
        {top}
        {children}
      </div>
    </main>
  );
}

/** The wordmark: a candy tile with a times sign, and the name beside it. */
function Brand() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="flex items-center gap-2.5"
    >
      <motion.span
        initial={{ rotate: -20, scale: 0.6 }}
        animate={{ rotate: -8, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.1 }}
        className="flex size-11 items-center justify-center rounded-2xl border-b-4 border-black/20 bg-linear-to-b from-primary to-primary/75 font-display text-2xl font-black text-primary-foreground shadow-[0_8px_18px_-6px_var(--primary)]"
        aria-hidden
      >
        ×
      </motion.span>
      <span className="font-display text-2xl font-black tracking-tight">
        Math <span className="text-primary">Master</span>
      </span>
    </motion.div>
  );
}

const SYMBOLS = [
  { char: "+", left: "8%", top: "14%", size: "text-5xl", hue: "var(--option-0)", delay: 0 },
  { char: "×", left: "84%", top: "10%", size: "text-6xl", hue: "var(--option-2)", delay: 1.2 },
  { char: "7", left: "90%", top: "46%", size: "text-5xl", hue: "var(--option-1)", delay: 0.6 },
  { char: "÷", left: "4%", top: "52%", size: "text-6xl", hue: "var(--option-4)", delay: 1.8 },
  { char: "3", left: "12%", top: "84%", size: "text-5xl", hue: "var(--option-3)", delay: 0.9 },
  { char: "−", left: "82%", top: "82%", size: "text-6xl", hue: "var(--option-5)", delay: 2.4 },
];

/** Decoration only: coloured glows and symbols drifting slowly up and down. */
export function Backdrop() {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <span className="absolute -left-24 -top-24 size-80 rounded-full bg-primary/20 blur-3xl" />
      <span className="absolute -right-24 top-1/3 size-72 rounded-full bg-(--option-3)/20 blur-3xl" />
      <span className="absolute -bottom-24 left-1/4 size-80 rounded-full bg-(--option-0)/20 blur-3xl" />
      {SYMBOLS.map((symbol) => (
        <motion.span
          key={symbol.char + symbol.left}
          className={cn("absolute font-display font-black opacity-25", symbol.size)}
          style={{ left: symbol.left, top: symbol.top, color: symbol.hue }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={
            reduce
              ? { opacity: 0.25, scale: 1 }
              : { opacity: 0.25, scale: 1, y: [0, -18, 0], rotate: [0, 8, 0] }
          }
          transition={{
            opacity: { duration: 0.6, delay: symbol.delay * 0.2 },
            scale: { duration: 0.6, delay: symbol.delay * 0.2 },
            y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: symbol.delay },
            rotate: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: symbol.delay },
          }}
        >
          {symbol.char}
        </motion.span>
      ))}
    </div>
  );
}

/**
 * The card itself, with its badge. `heroKey` remounts the badge's contents,
 * so changing it — picking a new buddy — lands with a pop.
 */
export function WelcomeCard({
  hero,
  heroKey,
  className,
  children,
  as = "div",
  onSubmit,
}: {
  hero: React.ReactNode;
  heroKey?: string;
  className?: string;
  children: React.ReactNode;
  as?: "div" | "form";
  onSubmit?: (event: React.FormEvent) => void;
}) {
  const Card = as === "form" ? motion.form : motion.div;
  return (
    <Card
      {...(onSubmit ? { onSubmit } : {})}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.1 }}
      className={cn(
        "relative mt-12 w-full rounded-xl border border-border/70 bg-card/85 px-6 pb-6 pt-16 shadow-[0_18px_50px_-20px_oklch(0.4_0.16_295/0.5)] backdrop-blur-md",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent"
        aria-hidden
      />
      <span className="absolute left-1/2 top-0 flex size-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-linear-to-b from-secondary to-accent shadow-[0_10px_30px_-8px_var(--primary)] ring-8 ring-card">
        <motion.span
          key={heroKey}
          className="flex"
          initial={{ scale: 0.3, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 13 }}
        >
          {hero}
        </motion.span>
      </span>
      {children}
    </Card>
  );
}

/** Text inputs on these screens: large, rounded, with a clear focus glow. */
export const fieldClass =
  "w-full rounded-lg border-2 border-border bg-background/80 px-4 py-3 font-display text-xl font-bold outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_18%,transparent)]";

export const labelClass = "text-xs font-black uppercase tracking-widest text-muted-foreground";
