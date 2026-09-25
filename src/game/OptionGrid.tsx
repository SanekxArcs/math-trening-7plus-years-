import { motion, type MotionStyle } from "motion/react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { Burst } from "./Burst";

interface OptionGridProps {
  options: number[];
  answer: number;
  hidden: number[];
  revealed: boolean;
  chosen: number | null;
  onPick: (value: number) => void;
}

type TileState = "correct" | "wrong" | "dim" | "hidden" | undefined;

/**
 * The answers, as chunky candy tiles in their own colours. The look lives in
 * `.answer-tile` in index.css; this decides which state each tile is in and
 * how it moves between them.
 *
 * Nothing but the number goes inside a tile as text — the badge and sparks are
 * icons and shapes — so a tile's text is always exactly its value.
 */
export function OptionGrid({
  options,
  answer,
  hidden,
  revealed,
  chosen,
  onPick,
}: OptionGridProps) {
  const { t } = useI18n();

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
            key={`${value}-${index}`}
            type="button"
            disabled={revealed || isHidden}
            onClick={() => onPick(value)}
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
            style={{ "--tile": `var(--option-${index % 6})` } as MotionStyle}
          >
            {value}

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
