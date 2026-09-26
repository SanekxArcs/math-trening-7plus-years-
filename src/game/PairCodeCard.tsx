import { useState } from "react";
import { motion, type MotionStyle } from "motion/react";
import { Check, Copy, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { primaryActionClass, secondaryActionClass } from "./GameDialog";
import { WelcomeCard, WelcomeShell } from "./WelcomeShell";
import { QrCode } from "@/pair/QrCode";

interface PairCodeCardProps {
  pairCode: string;
  name: string;
  onDone: () => void;
}

/**
 * Shown once, immediately after a profile is created.
 *
 * Without this the code is unreachable: it is generated on the device and only
 * displayed inside the dashboard, which cannot be opened without it. The parent
 * has to see it exactly once, at the only moment they are certainly present.
 *
 * Each character gets a tile of its own, so it can be read out and copied
 * down one at a time without losing the place.
 */
export function PairCodeCard({ pairCode, name, onDone }: PairCodeCardProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pairCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied or insecure context. The code is on screen
      // regardless, which is the part that matters.
    }
  };

  return (
    <WelcomeShell>
      <WelcomeCard hero={<KeyRound className="size-10 text-primary" aria-hidden />} className="space-y-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-black">{t("writeThisDown")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("pairCodeBlurb", { name })}</p>
        </div>

        <p
          className="flex select-all justify-center gap-1.5 sm:gap-2"
          role="img"
          aria-label={pairCode.split("").join(" ")}
        >
          {pairCode.split("").map((char, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: -20, rotateX: 90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.3 + index * 0.08 }}
              className="answer-tile flex h-13 w-10 items-center justify-center font-display text-3xl font-black sm:h-16 sm:w-12"
              style={{ "--tile": `var(--option-${index % 6})`, transformPerspective: 400 } as MotionStyle}
            >
              <span className="relative">{char}</span>
            </motion.span>
          ))}
        </p>

        {/* The quickest way onto the parent's phone: point its camera here. */}
        <div className="flex items-center gap-4 rounded-lg bg-muted/40 p-3 text-left">
          <QrCode code={pairCode} className="size-28 shrink-0" />
          <p className="text-sm text-muted-foreground">{t("qrHint")}</p>
        </div>

        <button type="button" onClick={copy} className={cn(secondaryActionClass, copied && "text-correct")}>
          {copied ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? t("copied") : t("copyCode")}
        </button>

        <p className="text-xs text-muted-foreground">{t("pairCodeFindAgain")}</p>

        <button type="button" onClick={onDone} className={primaryActionClass}>
          {t("gotIt")}
        </button>
      </WelcomeCard>
    </WelcomeShell>
  );
}
