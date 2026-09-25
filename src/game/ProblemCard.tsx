import { Fragment } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { Burst } from "./Burst";
import type { Outcome } from "./useGame";

interface ProblemCardProps {
  questionId: number;
  prompt: string;
  answer: number;
  /** Digits typed so far on the numpad; null for multiple choice. */
  typed: string | null;
  outcome: Outcome | null;
}

const OPERATOR = /^[+−×÷]$/;

/**
 * The sum, on its own stage.
 *
 * It is written out as a full equation — `7 × 8 = ?` — and the answer lands in
 * the slot: flipped in green when the child had it, shown plainly when they
 * did not, so every question ends with the right fact on screen. On the numpad
 * the slot fills as they type, which keeps their eyes on the sum instead of on
 * a separate display box.
 */
export function ProblemCard({ questionId, prompt, answer, typed, outcome }: ProblemCardProps) {
  const { t } = useI18n();
  const tokens = prompt.split(" ");
  const verdict = outcome ? (outcome.isCorrect ? "correct" : "wrong") : null;

  return (
    <motion.section
      animate={verdict === "wrong" ? { x: [0, -12, 10, -7, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
      className={cn(
        "relative rounded-xl border bg-card/85 px-4 pb-4 pt-7 shadow-[0_12px_32px_-16px_oklch(0.4_0.16_295/0.45)] backdrop-blur-md transition-[border-color,box-shadow] duration-300",
        verdict === "correct" && "border-correct/60 shadow-[0_0_0_4px_color-mix(in_oklch,var(--correct)_18%,transparent),0_12px_32px_-12px_var(--correct)]",
        verdict === "wrong" && "border-wrong/50 shadow-[0_0_0_4px_color-mix(in_oklch,var(--wrong)_14%,transparent)]",
        !verdict && "border-border/70",
      )}
    >
      {/* Soft stage light behind the sum; clipped here so the sparks are not. */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden>
        <span className="absolute left-1/2 top-0 h-40 w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
      </span>

      <div className="relative flex items-center justify-center gap-[0.25em] font-display text-[clamp(2.25rem,10vw,4.5rem)] font-black leading-none tabular-nums tracking-tight">
        {/* Deliberately not wrapped in AnimatePresence.
            With `mode="wait"` the outgoing question stayed on screen until its
            exit animation finished, while the answer tiles — which are not in
            an AnimatePresence — had already swapped to the next question. For a
            few hundred milliseconds the child saw the previous question above
            the next question's answers. Keying the heading makes it remount in
            the same frame as the tiles, so the two can never disagree.

            The tokens are separate spans so each can arrive on its own beat,
            with real spaces between them so the heading still reads "7 × 8". */}
        <h1 key={questionId} className="whitespace-nowrap">
          {tokens.map((token, i) => (
            <Fragment key={i}>
              {i > 0 && " "}
              <motion.span
                className={cn("inline-block", OPERATOR.test(token) && "text-primary")}
                initial={
                  OPERATOR.test(token)
                    ? { opacity: 0, scale: 0, rotate: -180 }
                    : { opacity: 0, y: -28, scale: 0.7 }
                }
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 20, delay: i * 0.07 }}
              >
                {token}
              </motion.span>
            </Fragment>
          ))}
        </h1>

        <motion.span
          key={`eq-${questionId}`}
          className="text-muted-foreground/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: tokens.length * 0.07 }}
          aria-hidden
        >
          =
        </motion.span>

        <AnswerSlot
          key={`slot-${questionId}`}
          answer={answer}
          typed={typed}
          verdict={verdict}
          delay={(tokens.length + 1) * 0.07}
        />
      </div>

      <div className="relative mt-3 flex h-9 items-center justify-center">
        <AnimatePresence>
          {outcome && (
            <motion.div
              key={`${questionId}-fb`}
              initial={{ opacity: 0, scale: 0.5, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1 font-display text-lg font-black tabular-nums",
                outcome.isCorrect ? "bg-correct/15 text-correct" : "bg-wrong/12 text-wrong",
              )}
            >
              {outcome.timedOut ? (
                <Clock className="size-4" aria-hidden />
              ) : outcome.isCorrect ? (
                <Check className="size-4" strokeWidth={3.5} aria-hidden />
              ) : (
                <X className="size-4" strokeWidth={3.5} aria-hidden />
              )}
              <p>
                {outcome.timedOut
                  ? t("timeUp")
                  : outcome.isCorrect
                    ? `+${outcome.delta}${outcome.multiplier > 1 ? ` ×${outcome.multiplier}!` : ""}`
                    : `${outcome.delta}`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

/**
 * Where the answer goes. A breathing "?" while the child thinks, their digits
 * as they type, and the answer itself once the question is settled.
 */
function AnswerSlot({
  answer,
  typed,
  verdict,
  delay,
}: {
  answer: number;
  typed: string | null;
  verdict: "correct" | "wrong" | null;
  delay: number;
}) {
  const typing = typed !== null && typed !== "" && !verdict;

  return (
    <motion.span
      className={cn(
        "relative inline-flex min-w-[1.5em] items-center justify-center rounded-2xl border-[3px] px-[0.2em] py-[0.08em] transition-colors duration-300",
        verdict === "correct" && "border-correct bg-correct text-correct-foreground",
        verdict === "wrong" && "border-correct border-dashed bg-correct/10 text-correct",
        !verdict && "border-dashed border-primary/40 bg-primary/5 text-primary",
      )}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 18, delay }}
      style={{ transformPerspective: 400 }}
      // On the numpad this is the display, so it has to be heard as it fills.
      {...(typed !== null ? { "aria-live": "polite" as const } : { "aria-hidden": true })}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {verdict ? (
          <motion.span
            key="answer"
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="inline-block"
          >
            {answer}
          </motion.span>
        ) : typing ? (
          <motion.span
            key="typed"
            className="inline-flex items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {typed.split("").map((digit, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ y: -14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 600, damping: 22 }}
              >
                {digit}
              </motion.span>
            ))}
            <motion.span
              className="ml-0.5 inline-block h-[0.8em] w-[0.08em] rounded-full bg-primary"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              aria-hidden
            />
          </motion.span>
        ) : (
          <motion.span
            key="blank"
            className="inline-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.35, 0.8, 0.35], scale: [1, 1.08, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            ?
          </motion.span>
        )}
      </AnimatePresence>
      {verdict === "correct" && <Burst distance={64} />}
    </motion.span>
  );
}
