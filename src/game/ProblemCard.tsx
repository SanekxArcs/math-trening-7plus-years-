import { Fragment, useLayoutEffect, useRef } from "react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
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
  /** Where the tapped right answer sits on screen, so it can jump from there into the slot. */
  flyFrom: DOMRect | null;
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
 *
 * A right tile's number does not just appear there: it jumps out of the tile
 * and lands in the slot, so the child sees their answer complete the sum.
 */
export function ProblemCard({
  questionId,
  prompt,
  answer,
  typed,
  outcome,
  flyFrom,
}: ProblemCardProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const tokens = prompt.split(" ");
  const verdict = outcome ? (outcome.isCorrect ? "correct" : "wrong") : null;

  return (
    <motion.section
      animate={verdict === "wrong" ? { x: [0, -12, 10, -7, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
      className={cn(
        "relative z-10 rounded-xl border bg-card/85 px-4 py-8 shadow-[0_12px_32px_-16px_oklch(0.4_0.16_295/0.45)] backdrop-blur-md transition-[border-color,box-shadow] duration-300",
        verdict === "correct" && "border-correct/60 shadow-[0_0_0_4px_color-mix(in_oklch,var(--correct)_18%,transparent),0_12px_32px_-12px_var(--correct)]",
        verdict === "wrong" && "border-wrong/50 shadow-[0_0_0_4px_color-mix(in_oklch,var(--wrong)_14%,transparent)]",
        !verdict && "border-border/70",
      )}
    >
      {/* Soft stage light behind the sum; clipped here so the sparks are not. */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden>
        <span className="absolute left-1/2 top-1/2 h-32 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/12 blur-3xl" />
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
          className="text-muted-foreground"
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
          flyFrom={verdict === "correct" ? flyFrom : null}
          delay={(tokens.length + 1) * 0.07}
        />
      </div>

      {/* The verdict hangs off the card's bottom edge like a badge, rather than
          holding an empty row open inside it that pushed the sum off centre. */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-4 flex justify-center">
        <AnimatePresence>
          {outcome && (
            <motion.div
              key={`${questionId}-fb`}
              initial={{ opacity: 0, scale: 0.5, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 18,
                // After the landing, when the answer flew there.
                delay: flyFrom && outcome.isCorrect && !reduceMotion ? FLIGHT_S : 0,
              }}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full border-2 bg-card px-4 font-display text-lg font-black tabular-nums shadow-md",
                outcome.isCorrect ? "border-correct/40 text-correct" : "border-wrong/35 text-wrong",
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

/** How long the answer's jump from tile to slot takes. */
const FLIGHT_S = 0.55;

/**
 * Where the answer goes. A breathing "?" while the child thinks, their digits
 * as they type, and the answer itself once the question is settled.
 */
function AnswerSlot({
  answer,
  typed,
  verdict,
  flyFrom,
  delay,
}: {
  answer: number;
  typed: string | null;
  verdict: "correct" | "wrong" | null;
  flyFrom: DOMRect | null;
  delay: number;
}) {
  const typing = typed !== null && typed !== "" && !verdict;
  const reduce = useReducedMotion();
  const slot = useRef<HTMLSpanElement>(null);
  const [number, animate] = useAnimate<HTMLSpanElement>();
  const flying = verdict === "correct" && flyFrom !== null && !reduce;

  /**
   * The jump, as a FLIP: the number is laid out in the slot, then sent back to
   * where the tile is and animated home along an arc. Done before paint, so it
   * is never seen sitting in the slot first. No portal or copy of the tile is
   * needed — the card sits above the tiles, so the number passes over them.
   */
  useLayoutEffect(() => {
    if (!flying || !flyFrom || !slot.current || !number.current) return;
    const to = slot.current.getBoundingClientRect();
    const dx = flyFrom.left + flyFrom.width / 2 - (to.left + to.width / 2);
    const dy = flyFrom.top + flyFrom.height / 2 - (to.top + to.height / 2);
    // The peak of the arc: a little above the straight line, like a hop.
    const peak = dy * 0.35 - 70;
    void animate(
      number.current,
      { x: [dx, dx * 0.4, 0], y: [dy, peak, 0], scale: [0.85, 1.35, 1], rotate: [0, -14, 0] },
      { duration: FLIGHT_S, ease: ["easeOut", "easeIn"], times: [0, 0.5, 1] },
    );
    // Only on arrival: it lands, and the slot takes the hit.
    void animate(slot.current, { scale: [1, 1.2, 0.95, 1] }, { duration: 0.35, delay: FLIGHT_S });
  }, [flying, flyFrom, animate, number]);

  return (
    <motion.span
      ref={slot}
      className={cn(
        "relative inline-flex min-w-[1.5em] items-center justify-center rounded-2xl border-[3px] px-[0.2em] py-[0.08em] transition-colors duration-300",
        verdict === "correct" && "border-correct bg-correct text-correct-foreground",
        verdict === "wrong" && "border-correct border-dashed bg-correct/10 text-correct",
        !verdict && "border-dashed border-primary/40 bg-primary/5 text-primary",
      )}
      style={{
        transformPerspective: 400,
        // The slot turns green as the number lands, not as it takes off.
        transitionDelay: flying ? `${FLIGHT_S * 0.85}s` : "0s",
      }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 18, delay }}
      // On the numpad this is the display, so it has to be heard as it fills.
      {...(typed !== null ? { "aria-live": "polite" as const } : { "aria-hidden": true })}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {verdict ? (
          flying ? (
            // Coloured in flight like the tile it left, until the slot turns
            // green under it.
            <span key="flown" ref={number} className="relative z-20 inline-block">
              {answer}
            </span>
          ) : (
            <motion.span
              key="answer"
              initial={{ rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="inline-block"
            >
              {answer}
            </motion.span>
          )
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
      {verdict === "correct" && <Burst distance={64} delay={flying ? FLIGHT_S : 0} />}
    </motion.span>
  );
}
