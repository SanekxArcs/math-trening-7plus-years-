import { useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/useI18n";

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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 rounded-[--radius-xl] bg-card p-7 text-center shadow-xl"
      >
        <KeyRound className="mx-auto size-10 text-primary" aria-hidden />

        <div>
          <h1 className="font-display text-2xl font-black">{t("writeThisDown")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("pairCodeBlurb", { name })}</p>
        </div>

        <p
          className="select-all rounded-[--radius-md] bg-muted py-5 font-display text-4xl font-black tracking-[0.3em]"
          aria-label={pairCode.split("").join(" ")}
        >
          {pairCode}
        </p>

        <Button variant="outline" onClick={copy} className="w-full">
          {copied ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
          {copied ? t("copied") : t("copyCode")}
        </Button>

        <p className="text-xs text-muted-foreground">{t("pairCodeFindAgain")}</p>

        <Button onClick={onDone} size="lg" className="w-full font-display text-lg">
          {t("gotIt")}
        </Button>
      </motion.div>
    </main>
  );
}
