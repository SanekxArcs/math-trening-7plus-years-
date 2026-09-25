import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, KeyRound } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";
import { dockIconClass } from "./BottomBar";

/**
 * The pairing code, always reachable from the game.
 *
 * Collapsed to a key icon in the bottom bar so it is not something for a child
 * to fiddle with mid-question. Tapping pops the code up above the bar, and
 * tapping again copies it.
 */
export function PairCodeBadge({ pairCode }: { pairCode: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fold away on its own, so it cannot sit over the game indefinitely.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setOpen(false), 12_000);
    return () => window.clearTimeout(id);
  }, [open]);

  const reveal = async () => {
    if (!open) {
      setOpen(true);
      return;
    }
    try {
      await navigator.clipboard.writeText(pairCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Insecure context or permission denied; the code is on screen anyway.
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={reveal}
        aria-expanded={open}
        aria-label={open ? t("copyCode") : t("pairingCode")}
        className={cn(dockIconClass, open && "bg-card text-foreground")}
      >
        {copied ? (
          <Check className="size-5 text-correct" aria-hidden />
        ) : open ? (
          <Copy className="size-5" aria-hidden />
        ) : (
          <KeyRound className="size-5" aria-hidden />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute bottom-full left-0 mb-4 whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 font-display text-sm font-black tracking-[0.2em] text-foreground shadow-lg"
          >
            {pairCode}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
