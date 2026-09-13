import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface OptionGridProps {
  options: number[];
  answer: number;
  hidden: number[];
  revealed: boolean;
  chosen: number | null;
  onPick: (value: number) => void;
}

export function OptionGrid({
  options,
  answer,
  hidden,
  revealed,
  chosen,
  onPick,
}: OptionGridProps) {
  // Two tiles read better side by side; four and six want two columns of large
  // targets on a tablet held in portrait.
  const columns = options.length === 2 ? "grid-cols-2" : "grid-cols-2";

  return (
    <div className={cn("grid gap-3 sm:gap-4", columns)}>
      {options.map((value, index) => {
        const isHidden = hidden.includes(index);
        const isAnswer = value === answer;
        const isChosen = chosen === value;

        const showCorrect = revealed && isAnswer;
        const showWrong = revealed && isChosen && !isAnswer;

        return (
          <motion.button
            key={`${value}-${index}`}
            type="button"
            disabled={revealed || isHidden}
            onClick={() => onPick(value)}
            aria-label={`Answer ${value}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: isHidden ? 0.12 : 1,
              y: 0,
              scale: showCorrect ? 1.04 : 1,
            }}
            transition={{ delay: index * 0.04, type: "spring", stiffness: 320, damping: 24 }}
            whileTap={revealed || isHidden ? { scale: 1 } : { scale: 0.95 }}
            className={cn(
              "relative rounded-[--radius-lg] border-b-8 py-7 font-display text-4xl font-black tabular-nums shadow-lg transition-colors sm:py-9 sm:text-5xl",
              "focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none",
              "disabled:cursor-not-allowed",
              showCorrect && "border-correct/70 bg-correct text-correct-foreground",
              showWrong && "border-wrong/70 bg-wrong text-wrong-foreground",
              !showCorrect && !showWrong && "border-black/10 bg-card text-foreground",
            )}
            style={
              showCorrect || showWrong
                ? {}
                : { color: `var(--option-${index % 6})` }
            }
          >
            {value}
          </motion.button>
        );
      })}
    </div>
  );
}
