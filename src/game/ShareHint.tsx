import { useId } from "react";
import { LayoutGroup, motion } from "motion/react";
import type { HintModel } from "@/engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";

interface ShareHintProps {
  hint: HintModel;
  /** How many rounds have been dealt: each round puts one dot in every box. */
  round: number;
}

/**
 * Division as sharing: 28 ÷ 7 is 28 dots dealt out into 7 boxes, one each per
 * round, until none are left. How many each box ends up with is the answer.
 *
 * Each dot keeps one `layoutId` from the pile to its box, so dealing it is a
 * flight across the card rather than a dot vanishing here and appearing there.
 * The child watches the same dot move, which is the whole point.
 */
export function ShareHint({ hint, round }: ShareHintProps) {
  const { t } = useI18n();
  // Scoped per panel: the previous question's card is still animating out when
  // the next one opens, and shared ids would send dots flying between them.
  const scope = useId();
  const { groups, perGroup } = hint;
  const total = groups * perGroup;
  const rounds = Math.min(round, perGroup);
  const left = total - rounds * groups;

  // Dealt from the end of the pile, so the dots still waiting stay put.
  const dotId = (r: number, g: number) => `${scope}-${total - 1 - (r * groups + g)}`;

  return (
    <LayoutGroup id={scope}>
      <div
        className="flex flex-col items-center gap-4"
        role="img"
        aria-label={t("eachGets", { total: rounds })}
      >
        {/* The pile, in rows of ten. Fixed width so it shrinks from the end
            rather than reflowing as dots leave. */}
        <div className="flex min-h-3 w-[9.75rem] flex-wrap gap-1">
          {Array.from({ length: left }, (_, k) => (
            <motion.span
              key={k}
              layoutId={`${scope}-${k}`}
              className="size-3 rounded bg-primary/70"
            />
          ))}
        </div>

        <div className="flex flex-wrap items-start justify-center gap-2">
          {Array.from({ length: groups }, (_, g) => (
            <div
              key={g}
              className={cn(
                "grid gap-1 rounded-xl border-2 bg-card p-2 shadow-sm transition-colors",
                rounds === perGroup ? "border-correct/60" : "border-primary/20",
              )}
              style={{ gridTemplateColumns: `repeat(${Math.min(perGroup, 5)}, minmax(0, 1fr))` }}
            >
              {/* A slot for every dot the box will hold, so the box does not
                  grow and shove its neighbours about as it fills. */}
              {Array.from({ length: perGroup }, (_, r) =>
                r < rounds ? (
                  <motion.span
                    key={r}
                    layoutId={dotId(r, g)}
                    transition={{ type: "spring", stiffness: 240, damping: 22, delay: g * 0.04 }}
                    className="size-3 rounded bg-primary/70"
                  />
                ) : (
                  <span key={r} className="size-3 rounded border border-dashed border-primary/25" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </LayoutGroup>
  );
}
