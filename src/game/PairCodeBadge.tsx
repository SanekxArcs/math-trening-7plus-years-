import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, KeyRound } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";

/**
 * The pairing code, always reachable from the game.
 *
 * Collapsed to a key icon by default so it is not something for a child to
 * fiddle with mid-question, and it sits clear of the answer tiles. Tapping
 * reveals the code and copies it.
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
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center"
      // Clears the iOS home indicator and the numpad's bottom row.
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <motion.button
        type="button"
        onClick={reveal}
        layout
        aria-expanded={open}
        aria-label={open ? t("copyCode") : t("pairingCode")}
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-2 text-muted-foreground shadow-lg backdrop-blur transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
      >
        {copied ? (
          <Check className="size-4 text-correct" aria-hidden />
        ) : open ? (
          <Copy className="size-4" aria-hidden />
        ) : (
          <KeyRound className="size-4" aria-hidden />
        )}

        <AnimatePresence initial={false}>
          {open && (
            <motion.span
              key="code"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap font-display text-sm font-black tracking-[0.2em] text-foreground"
            >
              {pairCode}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
