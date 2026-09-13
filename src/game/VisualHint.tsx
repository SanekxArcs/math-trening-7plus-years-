import { motion } from "motion/react";
import type { HintModel } from "@/engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";

export const HINT_MODES = ["boxes", "rows", "columns"] as const;
export type HintMode = (typeof HINT_MODES)[number];

export function nextHintMode(mode: HintMode): HintMode {
  const index = HINT_MODES.indexOf(mode);
  return HINT_MODES[(index + 1) % HINT_MODES.length] as HintMode;
}

interface VisualHintProps {
  hint: HintModel;
  mode: HintMode;
  /** How many groups have been counted so far; null when not counting. */
  litGroups?: number | null;
}

/**
 * Renders `groups` groups of `perGroup` marks — "3 groups of 4" made literal.
 *
 * Rendering and mode-switching are separate concerns here: this component is
 * pure output, and the mode lives with whoever owns the Change View button. In
 * the old version the render function cycled the mode as a side effect, so the
 * layout reshuffled itself on every new question, and on multiplication it was
 * called twice per question and skipped a mode each time.
 */
export function VisualHint({ hint, mode, litGroups = null }: VisualHintProps) {
  const { t } = useI18n();
  const { groups, perGroup } = hint;

  // A hint that needs scrolling stops being a hint.
  if (groups <= 0 || perGroup <= 0 || groups * perGroup > 144) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {groups === 0 || perGroup === 0 ? t("nothingToCount") : t("tooManyToDraw")}
      </p>
    );
  }

  return (
    <div
      className="flex flex-wrap items-start justify-center gap-2"
      role="img"
      aria-label={
        litGroups === null
          ? t("groupsOf", { groups, perGroup })
          : t("runningTotal", { total: litGroups * perGroup })
      }
    >
      {Array.from({ length: groups }, (_, groupIndex) => (
        <motion.div
          key={groupIndex}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            // While counting, groups not yet reached recede rather than vanish:
            // the child still needs to see how many are left to go.
            opacity: litGroups === null || groupIndex < litGroups ? 1 : 0.25,
            scale: litGroups !== null && groupIndex === litGroups - 1 ? 1.08 : 1,
          }}
          transition={
            litGroups === null
              ? { delay: groupIndex * 0.05 }
              : { type: "spring", stiffness: 300, damping: 20 }
          }
          className={cn(
            "rounded-xl border-2 border-primary/20 bg-card p-2 shadow-sm",
            mode === "boxes" && "grid gap-1",
            mode === "rows" && "flex w-12 flex-col gap-1",
            mode === "columns" && "flex h-12 flex-row items-end gap-1",
          )}
          style={
            mode === "boxes"
              ? // Rows of five. A group of 7 shown as 6+1 is a worse picture of
                // "seven" than 5+2, which is the five-frame a child is taught to
                // count with.
                { gridTemplateColumns: `repeat(${Math.min(perGroup, 5)}, minmax(0, 1fr))` }
              : {}
          }
        >
          {Array.from({ length: perGroup }, (_, markIndex) => (
            <motion.span
              key={markIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: groupIndex * 0.05 + markIndex * 0.015 }}
              className={cn(
                "bg-primary/70",
                mode === "boxes" && "size-3 rounded",
                mode === "rows" && "h-1.5 w-full rounded-full",
                mode === "columns" && "h-full w-1.5 rounded-full",
              )}
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
}
