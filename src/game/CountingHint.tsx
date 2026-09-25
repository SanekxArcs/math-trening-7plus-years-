import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";

/** One step per beat — a touch quicker than the groups, since a step is one dot. */
const STEP_MS = 700;

/** Two blocks of a hundred: the most two operands of 100 can add up to. */
const MAX_DOTS = 200;

/**
 * How the second number is counted on (or taken away): tens first, then ones.
 *
 * Counting 57 on one dot at a time would take most of a minute, and it is not
 * how a child is taught to do it anyway — 34 + 13 is "34, 44, then 45, 46, 47".
 * Below ten there is nothing to jump, so it goes one by one.
 */
export function countSteps(n: number): number[] {
  const tens = n >= 10 ? Math.floor(n / 10) : 0;
  return [...Array<number>(tens).fill(10), ...Array<number>(n - tens * 10).fill(1)];
}

type DotState = "first" | "second" | "waiting" | "marked" | "gone";

const DOT_CLASS: Record<DotState, string> = {
  first: "bg-primary/80",
  second: "bg-combo",
  // Not counted on yet: the space it will fill, so the child sees how far to go.
  waiting: "border-2 border-dashed border-combo/70",
  marked: "bg-wrong/80",
  // Taken away, but its outline stays: "twelve take away five" should still
  // show that there *were* twelve.
  gone: "border-2 border-dashed border-wrong/40",
};

function dotSize(total: number): string {
  if (total <= 20) return "size-6";
  if (total <= 50) return "size-4";
  if (total <= 100) return "size-3";
  return "size-2.5";
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

interface CountingHintProps {
  op: "add" | "sub";
  a: number;
  b: number;
}

/**
 * The picture for + and −, drawn on ten-frames.
 *
 * Dots go in rows of ten split five and five — the frame a child learns to
 * read at a glance — and in blocks of a hundred for the big sums. Addition
 * lays the second number straight after the first in its own colour, so 8 + 5
 * visibly fills the ten and spills three over. Subtraction marks the dots that
 * go, from the end.
 *
 * The animation is the strategy, not decoration: it starts *at* the first
 * number and counts on from there, or counts back as the marked dots leave.
 * Never from one — counting everything from scratch is the habit to grow out of.
 */
export function CountingHint({ op, a, b }: CountingHintProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<number | null>(null);
  const timer = useRef(0);

  const steps = useMemo(() => countSteps(b), [b]);
  const total = op === "add" ? a + b : a;
  const drawable = total > 0 && total <= MAX_DOTS;
  const countable = drawable && b > 0;

  const counting = step !== null && step < steps.length;
  const finished = step !== null && step >= steps.length;
  const done = step === null ? 0 : steps.slice(0, step).reduce((sum, n) => sum + n, 0);
  const lastStep = step !== null && step > 0 ? (steps[step - 1] ?? 0) : 0;
  const running = op === "add" ? a + done : a - done;

  // One step per beat, keyed on `step` so any stop, restart or unmount cancels.
  // The first beat is a little longer: that is where the child says the
  // starting number before anything moves.
  useEffect(() => {
    if (step === null || step >= steps.length) return;
    timer.current = window.setTimeout(
      () => setStep((current) => (current ?? 0) + 1),
      step === 0 ? STEP_MS * 1.4 : STEP_MS,
    );
    return () => window.clearTimeout(timer.current);
  }, [step, steps.length]);

  const stop = () => {
    window.clearTimeout(timer.current);
    setStep(null);
  };

  if (!drawable) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {total === 0 ? t("nothingHere") : t("tooManyToDraw")}
      </p>
    );
  }

  /** Where dot `i` is in the story, and whether it moved on this very beat. */
  const describe = (i: number): { state: DotState; fresh: boolean } => {
    if (op === "add") {
      if (i < a) return { state: "first", fresh: false };
      const k = i - a;
      if (step === null || k < done) {
        return { state: "second", fresh: step !== null && k >= done - lastStep };
      }
      return { state: "waiting", fresh: false };
    }
    if (i < a - b) return { state: "first", fresh: false };
    // Taken from the end, so the last dot goes first.
    const k = a - 1 - i;
    if (k < done) return { state: "gone", fresh: k >= done - lastStep };
    return { state: "marked", fresh: false };
  };

  const size = dotSize(total);
  const blocks = chunk(
    Array.from({ length: total }, (_, i) => i),
    100,
  ).map((block) => chunk(block, 10));

  return (
    <div className="space-y-3">
      <div className="rounded-[--radius-lg] bg-muted/50 p-3">
        <div
          className="flex flex-wrap items-start justify-center gap-4"
          role="img"
          aria-label={
            step === null
              ? t(op === "add" ? "addPicture" : "subPicture", { a, b })
              : t(op === "add" ? "runningTotal" : "leftTotal", { total: running })
          }
        >
          {blocks.map((rows, blockIndex) => (
            <div key={blockIndex} className="flex flex-col items-start gap-1">
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2.5">
                  {[row.slice(0, 5), row.slice(5)]
                    .filter((half) => half.length > 0)
                    .map((half, halfIndex) => (
                      <div key={halfIndex} className="flex gap-1">
                        {half.map((i) => {
                          const { state, fresh } = describe(i);
                          return (
                            <motion.span
                              key={i}
                              data-dot={state}
                              initial={{ opacity: 0, scale: 0.4 }}
                              animate={{
                                opacity: state === "gone" ? 0.6 : 1,
                                scale: fresh ? [1.45, 1] : state === "gone" ? 0.75 : 1,
                                y: fresh && state === "gone" ? [-6, 0] : 0,
                              }}
                              transition={
                                step === null
                                  ? { delay: Math.min(i * 0.012, 0.7) }
                                  : { type: "spring", stiffness: 380, damping: 16 }
                              }
                              className={cn(
                                "rounded-full transition-colors duration-300",
                                size,
                                DOT_CLASS[state],
                              )}
                            />
                          );
                        })}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Fixed height, as in the groups picture, so nothing jumps. The step
          ("+10", "−1") pops beside the total so the child hears the jump and
          the landing: "thirty-four… plus ten… forty-four". */}
      <div className="flex h-8 items-center justify-center gap-2">
        {step !== null && (
          <>
            <motion.p
              key={step}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="font-display text-xl font-black tabular-nums text-primary"
            >
              {op === "sub"
                ? t("leftTotal", { total: running })
                : finished
                  ? t("countedTotal", { total: running })
                  : t("runningTotal", { total: running })}
            </motion.p>
            <AnimatePresence>
              {lastStep > 0 && !finished && (
                <motion.span
                  key={step}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={cn(
                    "rounded-full px-2 py-0.5 font-display text-sm font-black tabular-nums",
                    op === "add" ? "bg-combo/25 text-combo-foreground" : "bg-wrong/15 text-wrong",
                  )}
                >
                  {op === "add" ? `+${lastStep}` : `−${lastStep}`}
                </motion.span>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {countable && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => (counting ? stop() : setStep(0))}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-sm focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
          >
            {counting ? (
              <Square className="size-3.5" aria-hidden />
            ) : (
              <Play className="size-3.5" aria-hidden />
            )}
            {counting
              ? t("stopCounting")
              : finished
                ? t("countAgain")
                : t(op === "add" ? "countOn" : "takeAway")}
          </button>
        </div>
      )}
    </div>
  );
}
