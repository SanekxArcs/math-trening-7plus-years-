import { useEffect, useState } from "react";
import { Scissors } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { PowerButton } from "./PowerButton";

interface HalfHalfButtonProps {
  readyAt: number;
  cooldownSec: number;
  usedThisRound: boolean;
  disabled: boolean;
  onUse: () => void;
}

/**
 * 50:50 with a visible cooldown. The countdown ring round the icon matters
 * more than the number: "wait until the circle fills" is readable by a child
 * who cannot yet read "18 seconds remaining".
 */
export function HalfHalfButton({
  readyAt,
  cooldownSec,
  usedThisRound,
  disabled,
  onUse,
}: HalfHalfButtonProps) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (now >= readyAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [readyAt, now]);

  const remainingMs = Math.max(0, readyAt - now);
  const cooling = remainingMs > 0;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress = cooling ? 1 - remainingMs / (cooldownSec * 1000) : 1;
  const unavailable = disabled || usedThisRound || cooling;

  return (
    <PowerButton
      icon={<Scissors className="size-5" aria-hidden />}
      onClick={onUse}
      disabled={unavailable}
      charge={cooling ? progress : null}
      aria-label={cooling ? t("halfHalfReady", { seconds: remainingSec }) : t("useHalfHalf")}
    />
  );
}
