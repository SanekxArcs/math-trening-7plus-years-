import { motion, type MotionStyle } from "motion/react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { Burst } from "./Burst";

interface OptionGridProps {
  /** Bumped per question: what re-paints the tiles and drops the new numbers in. */
  questionId: number;
  options: number[];
  answer: number;
  hidden: number[];
  revealed: boolean;
  chosen: number | null;
  /** `from` is where the tapped tile is, so the answer can fly out of it. */
  onPick: (value: number, from: DOMRect) => void;
}

type TileState = "correct" | "wrong" | "dim" | "hidden" | undefined;

const HUES = 6;

/**
 * How far the palette turns for a question. The step between one question and
 * the next is 1..5 places — never a whole turn — so every tile is guaranteed
 * a new colour, and the varying step keeps the pattern from feeling mechanical.
 * Closed form of summing `1 + (k % 5)` for k = 1..q.
 */
function paletteShift(questionId: number): number {
  const q = Math.max(0, questionId);
  const r = q % 5;
  return (q + 10 * Math.floor(q / 5) + (r * (r + 1)) / 2) % HUES;
}

/**
 * The answers, as chunky candy tiles in their own colours. The look lives in
 * `.answer-tile` in index.css; this decides which state each tile is in and
 * how it moves between them.
 *
 * Nothing but the number goes inside a tile as text — the badge and sparks are
 * icons and shapes — so a tile's text is always exactly its value.
 *
 * The tiles stay mounted from question to question, so each new question can
 * repaint them: the colours morph in a wave (a registered `--c`, see
 * index.css), a shine sweeps across, and the new number drops in. The numbers
 * themselves swap in the same frame as the sum, never after it.
 */
export function OptionGrid({
  questionId,
  options,
  answer,
  hidden,
  revealed,
  chosen,
  onPick,
}: OptionGridProps) {
  const { t } = useI18n();
  const shift = paletteShift(questionId);

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-5">
      {options.map((value, index) => {
        const isHidden = hidden.includes(index);
        const isAnswer = value === answer;
        const isChosen = chosen === value;

        const state: TileState = revealed
          ? isAnswer
            ? "correct"
            : isChosen
              ? "wrong"
              : "dim"
          : isHidden
            ? "hidden"
            : undefined;

        return (
          <motion.button
            key={index}
            type="button"
            disabled={revealed || isHidden}
            onClick={(event) => onPick(value, event.currentTarget.getBoundingClientRect())}
            aria-label={t("answerN", { value })}
            data-state={state}
            // Dealt in like cards, one after another.
            initial={{ opacity: 0, y: 24, scale: 0.7, rotate: index % 2 ? 6 : -6 }}
            animate={{
              opacity: 1,
              y: 0,
              rotate: 0,
              scale:
                state === "correct" ? [1, 1.1, 1.04] : state === "hidden" ? 0.9 : state === "dim" ? 0.96 : 1,
              x: state === "wrong" ? [0, -8, 8, -5, 5, 0] : 0,
            }}
            transition={{
              default: { type: "spring", stiffness: 380, damping: 22, delay: revealed ? 0 : index * 0.05 },
              scale: { duration: 0.35 },
              x: { duration: 0.4 },
            }}
            whileTap={revealed || isHidden ? {} : { scale: 0.97 }}
            className={cn(
              "answer-tile py-7 font-display text-4xl font-black tabular-nums sm:py-9 sm:text-5xl",
              "disabled:cursor-default",
            )}
            style={
              {
                "--tile": `var(--option-${(index + shift) % HUES})`,
                // The repaint runs across the grid as a wave, not all at once.
                "--stagger": `${index * 0.06}s`,
              } as MotionStyle
            }
          >
            {/* Shine across the tile as its new colour comes in. */}
            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
              <motion.span
                key={questionId}
                className="absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-white/60 to-transparent"
                initial={{ left: "-60%", opacity: 1 }}
                animate={{ left: "120%", opacity: 0.6 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.06 }}
              />
            </span>
            <motion.span
              key={questionId}
              className="relative inline-block"
              initial={{ y: -18, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20, delay: index * 0.06 }}
            >
              {value}
            </motion.span>

            {(state === "correct" || state === "wrong") && (
              <motion.span
                className={cn(
                  "absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full border-[3px] border-card shadow-md",
                  state === "correct" ? "bg-correct text-correct-foreground" : "bg-wrong text-wrong-foreground",
                )}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.1 }}
                aria-hidden
              >
                {state === "correct" ? (
                  <Check className="size-4" strokeWidth={4} />
                ) : (
                  <X className="size-4" strokeWidth={4} />
                )}
              </motion.span>
            )}

            {/* Sparks only off the tile the child actually tapped. */}
            {state === "correct" && isChosen && <Burst distance={80} />}
          </motion.button>
        );
      })}
    </div>
  );
}
