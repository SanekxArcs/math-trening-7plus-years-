import { Link, Navigate, useSearchParams } from "react-router-dom";
import { motion, type MotionStyle } from "motion/react";
import { Gamepad2, LineChart, Link2 } from "lucide-react";
import { convex } from "@/lib/convex";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { ghostActionClass } from "@/game/GameDialog";
import { WelcomeCard, WelcomeShell } from "@/game/WelcomeShell";
import { useDeviceIdentity } from "@/sync/useSync";
import { parsePairCode } from "./pairLink";

/**
 * Where a scanned QR code lands. A code can mean two things on a new device —
 * "let me see my child's progress" or "let my child play here" — so this asks
 * rather than guessing, and hands the code on to whichever is picked.
 */
export function PairLanding() {
  const [params] = useSearchParams();
  const code = parsePairCode(params.get("code") ?? "");
  if (!code || !convex) return <Navigate to="/" replace />;
  return <Choose code={code} />;
}

function Choose({ code }: { code: string }) {
  const { t } = useI18n();
  const { identity } = useDeviceIdentity();
  // Still reading this device's credentials: wait, rather than flash an option that then vanishes.
  const unlinked = identity === null;

  return (
    <WelcomeShell>
      <WelcomeCard hero={<Link2 className="size-10 text-primary" aria-hidden />} className="space-y-5 text-center">
        <div>
          <h1 className="font-display text-2xl font-black">{t("pairLandingTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("pairLandingBlurb")}</p>
        </div>

        <p className="flex justify-center gap-1.5" role="img" aria-label={code.split("").join(" ")}>
          {code.split("").map((char, index) => (
            <motion.span
              key={`${char}-${index}`}
              initial={{ opacity: 0, y: -16, rotateX: 90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.2 + index * 0.06 }}
              className="answer-tile flex h-12 w-10 items-center justify-center font-display text-2xl font-black"
              style={{ "--tile": `var(--option-${index % 6})`, transformPerspective: 400 } as MotionStyle}
            >
              <span className="relative">{char}</span>
            </motion.span>
          ))}
        </p>

        <div className="space-y-2.5 text-left">
          <Option
            to={`/parent?code=${code}`}
            icon={LineChart}
            title={t("openDashboard")}
            hint={t("openDashboardHint")}
          />
          {unlinked && (
            <Option to={`/?restore=${code}`} icon={Gamepad2} title={t("playHere")} hint={t("playHereHint")} />
          )}
          {identity && <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">{t("alreadyLinked")}</p>}
        </div>

        <Link to="/" className={cn(ghostActionClass, "text-sm")}>
          {t("backToGame")}
        </Link>
      </WelcomeCard>
    </WelcomeShell>
  );
}

function Option({
  to,
  icon: Icon,
  title,
  hint,
}: {
  to: string;
  icon: typeof LineChart;
  title: string;
  hint: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border-2 border-border bg-card p-3.5 transition-[border-color,translate] hover:-translate-y-0.5 hover:border-primary/50 focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-primary to-primary/80 text-primary-foreground shadow-[0_4px_12px_-4px_var(--primary)]">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg font-black">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </Link>
  );
}
