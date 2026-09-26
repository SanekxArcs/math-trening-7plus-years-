import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, LineChart, Loader2, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ghostActionClass, primaryActionClass } from "@/game/GameDialog";
import { WelcomeCard, WelcomeShell, fieldClass, labelClass } from "@/game/WelcomeShell";
import type { TranslationKey } from "@/i18n/translations";
import { useI18n } from "@/i18n/useI18n";

interface PairScreenProps {
  onSubmit: (pairCode: string, pin: string) => Promise<boolean>;
  error: TranslationKey | null;
  busy: boolean;
  /** Filled in when the dashboard is opened on the child's own device. */
  knownCode?: string | null;
}

export function PairScreen({ onSubmit, error, busy, knownCode }: PairScreenProps) {
  const { t } = useI18n();
  const [pairCode, setPairCode] = useState(knownCode ?? "");
  const [pin, setPin] = useState("");
  const [edited, setEdited] = useState(false);

  // `knownCode` is read out of IndexedDB, so it arrives after the first render —
  // a `useState` initial value would capture the empty string and never update.
  // `edited` makes sure this never overwrites something the parent has typed.
  useEffect(() => {
    if (!edited && knownCode) setPairCode(knownCode);
  }, [knownCode, edited]);

  const ready = pairCode.length === 6 && pin.length >= 4 && !busy;

  return (
    <WelcomeShell>
      <WelcomeCard
        as="form"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) void onSubmit(pairCode, pin);
        }}
        hero={<LineChart className="size-10 text-primary" aria-hidden />}
        className="space-y-6"
      >
        <div className="text-center">
          <h1 className="font-display text-3xl font-black">{t("parentDashboard")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {knownCode ? t("onThisDevice") : t("pairBlurb")}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="pair-code" className={labelClass}>
            {t("pairingCode")}
          </label>
          <input
            id="pair-code"
            value={pairCode}
            onChange={(event) => {
              setEdited(true);
              // The code alphabet is uppercase and unambiguous; normalising here
              // means a parent reading it off a screen never fails on case.
              setPairCode(
                event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
              );
            }}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABC234"
            className={cn(fieldClass, "text-center text-2xl tracking-[0.35em]")}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="pin" className={labelClass}>
            {t("pin")}
          </label>
          <input
            id="pin"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            // On the child's own device the code is already there: straight to the PIN.
            autoFocus={Boolean(knownCode)}
            className={cn(fieldClass, "text-center text-2xl tracking-[0.4em]")}
          />
        </div>

        {error && (
          <motion.p
            role="alert"
            key={error}
            animate={{ x: [0, -8, 7, -4, 0] }}
            transition={{ duration: 0.4 }}
            className="rounded-lg bg-wrong/10 px-3 py-2 text-sm font-bold text-wrong"
          >
            {t(error)}
          </motion.p>
        )}

        <div className="space-y-1">
          <button
            type="submit"
            disabled={!ready}
            className={cn(primaryActionClass, "disabled:pointer-events-none disabled:opacity-40")}
          >
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Lock className="size-5" aria-hidden />}
            {t("signIn")}
          </button>
          <Link to="/" className={cn(ghostActionClass, "text-sm")}>
            <ArrowLeft className="size-4" aria-hidden />
            {t("backToGame")}
          </Link>
        </div>
      </WelcomeCard>
    </WelcomeShell>
  );
}
