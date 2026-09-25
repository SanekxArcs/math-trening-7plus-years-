import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";

/** The purse. Pops when it changes, so a payout is seen as well as counted. */
export function CoinCount({ coins, className }: { coins: number; className?: string }) {
  const { t } = useI18n();
  return (
    <motion.span
      key={coins}
      initial={{ scale: 1.2 }}
      animate={{ scale: 1 }}
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-combo/20 px-4 py-2 font-display text-xl font-black tabular-nums text-combo-foreground",
        className,
      )}
      role="img"
      aria-label={`${coins} ${t("coins")}`}
    >
      <span aria-hidden>🪙</span>
      {coins}
    </motion.span>
  );
}
