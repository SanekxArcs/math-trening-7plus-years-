import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Lightbulb, Play, RefreshCw, Square, X } from "lucide-react";
import type { HintModel, Problem } from "@/engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { CountingHint } from "./CountingHint";
import { ShareHint } from "./ShareHint";
import { VisualHint, nextHintMode, type HintMode } from "./VisualHint";

/** One group per beat. Slow enough to say the number out loud alongside it. */
const STEP_MS = 850;

/**
 * Whether this question has a picture to show. × and ÷ carry their groups on
 * the problem; + and − are drawn straight from the operands, so every question
 * has one.
 */
export function hasPictureHint(problem: Problem): boolean {
  return problem.hint !== null || problem.op === "add" || problem.op === "sub";
}

interface HintPanelProps {
  problem: Problem;
  onClose: () => void;
}

/**
 * The card around the picture hint: a header naming it, and the picture that
 * fits the question — groups for × and ÷, ten-frames for + and −.
 */
export function HintPanel({ problem, onClose }: HintPanelProps) {
  const { t } = useI18n();
  const { op, a, b, hint } = problem;

  return (
    <div className="space-y-3 rounded-[--radius-lg] border-2 border-primary/15 bg-card/80 p-4 shadow-md">
      <header className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lightbulb className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {t("pictureHint")}
          </p>
          {/* Named, with the sum spelled out: "3 groups of 4" is the sentence
              the picture is a drawing of, so it sits right above it.
              Multiplication only — for 28 ÷ 7 the same words read "7 groups
              of 4", which is the answer. For + and − the colour key instead,
              so the child can tell which dots are which number. */}
          {op === "mul" && hint && (
            <p className="font-display text-lg font-black leading-tight">
              {t("groupsOf", { groups: hint.groups, perGroup: hint.perGroup })}
            </p>
          )}
          {(op === "add" || op === "sub") && (
            <p className="flex items-center gap-2 font-display text-lg font-black leading-tight tabular-nums">
              <Swatch className="bg-primary/80" />
              {a}
              <span className="text-muted-foreground">{op === "add" ? "+" : "−"}</span>
              <Swatch className={op === "add" ? "bg-combo" : "bg-wrong/80"} />
              {b}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("hideHint")}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>

      {op === "add" || op === "sub" ? (
        <CountingHint op={op} a={a} b={b} />
      ) : (
        hint && <GroupsHint hint={hint} op={op} />
      )}
    </div>
  );
}

function Swatch({ className }: { className: string }) {
  return <span className={cn("inline-block size-3 rounded-full", className)} aria-hidden />;
}

/**
 * The groups picture, plus the part that actually teaches: working it out.
 *
 * A static array of dots shows a child *that* the answer is twelve; the
 * animation shows them *why*, in the method they are meant to end up with.
 * For × that is skip counting — 4, 8, 12 — with the multiples collecting in a
 * trail underneath. For ÷ it is sharing: the dots start in a pile and are dealt
 * into the boxes one round at a time, and the rounds it takes are the answer.
 * The static view stays the default because sometimes they only need a reminder.
 */
function GroupsHint({ hint, op }: { hint: HintModel; op: "mul" | "div" }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<HintMode>("boxes");
  const [step, setStep] = useState<number | null>(null);
  const timer = useRef(0);

  const { groups, perGroup } = hint;
  const total = groups * perGroup;
  const animatable = groups > 0 && perGroup > 0 && total <= 144;
  // × lights one group per beat; ÷ deals one round per beat.
  const steps = op === "mul" ? groups : perGroup;
  const running = step !== null && step < steps;
  const finished = step !== null && step >= steps;

  const stop = useCallback(() => {
    window.clearTimeout(timer.current);
    setStep(null);
  }, []);

  // One step per beat. Keyed on `step`, so each step schedules only the next
  // one and any unmount or restart cancels cleanly. Sharing gets a longer first
  // beat: the child needs a moment to see the full pile before it moves.
  useEffect(() => {
    if (step === null || step >= steps) return;
    const wait = op === "div" && step === 0 ? STEP_MS * 1.4 : STEP_MS;
    timer.current = window.setTimeout(() => setStep((current) => (current ?? 0) + 1), wait);
    return () => window.clearTimeout(timer.current);
  }, [step, steps, op]);

  const multiples = Array.from({ length: op === "mul" ? (step ?? 0) : 0 }, (_, i) => (i + 1) * perGroup);

  return (
    <div className="space-y-3">
      <div className="rounded-[--radius-lg] bg-muted/50 p-3">
        {op === "div" && step !== null ? (
          <ShareHint hint={hint} round={step} />
        ) : (
          <VisualHint hint={hint} mode={mode} litGroups={step} />
        )}
      </div>

      {/* Never unmounted between steps: an exit animation would make it blink
          out and land a beat behind the dots it is counting. */}
      <div className="flex min-h-8 flex-wrap items-center justify-center gap-1.5">
        {op === "mul" &&
          multiples.map((value, i) => {
            const latest = i === multiples.length - 1;
            return (
              <motion.span
                key={i}
                initial={{ scale: 0.4, opacity: 0, y: 6 }}
                animate={{ scale: latest ? 1.15 : 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-display font-black tabular-nums",
                  latest
                    ? finished
                      ? "bg-correct text-lg text-correct-foreground shadow-sm"
                      : "bg-primary text-lg text-primary-foreground shadow-sm"
                    : "bg-primary/10 text-sm text-primary",
                )}
              >
                {value}
              </motion.span>
            );
          })}
        {op === "mul" && finished && (
          <span className="ml-1 font-display text-lg font-black text-correct">
            {t("countedTotal", { total })}
          </span>
        )}
        {op === "div" && step !== null && step > 0 && (
          <motion.p
            key={step}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className={cn(
              "font-display text-xl font-black tabular-nums",
              finished ? "text-correct" : "text-primary",
            )}
          >
            {t("eachGets", { total: Math.min(step, perGroup) })}
          </motion.p>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {animatable && (
          <button
            type="button"
            onClick={() => (running ? stop() : setStep(0))}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-sm focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
          >
            {running ? (
              <Square className="size-3.5" aria-hidden />
            ) : (
              <Play className="size-3.5" aria-hidden />
            )}
            {running
              ? t("stopCounting")
              : op === "mul"
                ? finished
                  ? t("countAgain")
                  : t("countTogether")
                : finished
                  ? t("shareAgain")
                  : t("shareOut")}
          </button>
        )}

        {/* Sharing has one layout of its own; switching views mid-deal would
            drop every dot in flight. */}
        {!(op === "div" && step !== null) && (
          <button
            type="button"
            onClick={() => setMode(nextHintMode)}
            className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground shadow-sm focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            {t("changeView")}
          </button>
        )}
      </div>
    </div>
  );
}
