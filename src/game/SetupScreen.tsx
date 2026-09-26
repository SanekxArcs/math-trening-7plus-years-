import { useState } from "react";
import { motion, type MotionStyle } from "motion/react";
import { Check, KeyRound, LineChart, Loader2, Lock, Play, RotateCcw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { parsePairCode } from "@/pair/pairLink";
import { ScanButton } from "@/pair/QrScanner";
import { cn } from "@/lib/utils";
import { LANGS, LANG_LABELS } from "@/i18n/translations";
import { useI18n } from "@/i18n/useI18n";
import { ghostActionClass, primaryActionClass, secondaryActionClass } from "./GameDialog";
import { WelcomeCard, WelcomeShell, fieldClass, labelClass } from "./WelcomeShell";

const AVATARS = ["🦊", "🐼", "🦁", "🐸", "🦄", "🐙", "🐝", "🦖"];

interface SetupScreenProps {
  onCreate: (name: string, pin: string, locale: string, avatarEmoji: string) => Promise<unknown>;
  /** Links this device to a profile that already exists. */
  onRestore?: (pairCode: string, pin: string) => Promise<unknown>;
}

/** The language switch, above the card: the first thing to set, for everything below. */
function LanguagePicker() {
  const { t, lang, setLang } = useI18n();
  return (
    <fieldset>
      <legend className="sr-only">{t("language")}</legend>
      <div className="flex gap-1 rounded-full border border-border/70 bg-card/80 p-1 shadow-sm backdrop-blur">
        {LANGS.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={lang === code}
            className="relative rounded-full px-3 py-1.5 text-sm font-bold transition-colors focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
          >
            {/* One highlight that slides between the options. */}
            {lang === code && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 rounded-full bg-linear-to-b from-primary to-primary/80 shadow-[0_3px_10px_-3px_var(--primary)]"
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
              />
            )}
            <span className={cn("relative", lang === code ? "text-primary-foreground" : "text-muted-foreground")}>
              {LANG_LABELS[code]}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * One-time setup on the child's device.
 *
 * The PIN is the parent's, not the child's — it is what stops the kid opening
 * the dashboard and raising their own target — so the copy says so plainly
 * rather than leaving them to guess who is meant to type it. It sits in its
 * own panel, visibly apart from the child's half of the form.
 */
export function SetupScreen({ onCreate, onRestore }: SetupScreenProps) {
  const { t, lang } = useI18n();
  // "Play on this device" from a scanned QR code lands here with the code.
  const [params] = useSearchParams();
  const linkedCode = parsePairCode(params.get("restore") ?? "");
  const [restoring, setRestoring] = useState(linkedCode !== null);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0] as string);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinValid = /^\d{4,8}$/.test(pin);
  const ready = name.trim().length > 0 && pinValid && pin === confirmPin && !busy;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;

    setBusy(true);
    setError(null);
    try {
      await onCreate(name.trim(), pin, lang, avatar);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("couldNotCreate"));
      setBusy(false);
    }
  };

  if (restoring && onRestore) {
    return (
      <RestoreForm onRestore={onRestore} initialCode={linkedCode} onCancel={() => setRestoring(false)} />
    );
  }

  return (
    <WelcomeShell top={<LanguagePicker />}>
      <WelcomeCard
        as="form"
        onSubmit={submit}
        // The buddy they pick is the badge: choosing one is seen at once.
        hero={<span className="text-5xl leading-none">{avatar}</span>}
        heroKey={avatar}
        className="space-y-6"
      >
        <div className="text-center">
          <h1 className="font-display text-3xl font-black">{t("whosPlaying")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("setupBlurb")}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="kid-name" className={labelClass}>
            {t("name")}
          </label>
          <input
            id="kid-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            maxLength={24}
            className={cn(fieldClass, "text-center text-2xl")}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className={labelClass}>{t("pickABuddy")}</legend>
          <div className="grid grid-cols-4 gap-x-2.5 gap-y-3.5 pt-1">
            {AVATARS.map((emoji, index) => {
              const picked = avatar === emoji;
              return (
                <motion.button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  aria-pressed={picked}
                  // The same candy tiles as the answers, the picked one filled in.
                  data-tone={picked ? "solid" : undefined}
                  initial={{ opacity: 0, y: 14, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: picked ? 1.06 : 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 20,
                    delay: 0.25 + index * 0.04,
                    scale: { type: "spring", stiffness: 420, damping: 20 },
                  }}
                  whileTap={{ scale: 0.92 }}
                  className="answer-tile flex aspect-square items-center justify-center text-3xl"
                  style={{ "--tile": `var(--option-${index % 6})` } as MotionStyle}
                >
                  <span className="relative">{emoji}</span>
                  {picked && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border-2 border-card bg-correct text-correct-foreground shadow"
                      aria-hidden
                    >
                      <Check className="size-3.5" strokeWidth={4} />
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-2.5 rounded-lg border border-dashed border-border bg-muted/40 p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-foreground/80 text-background">
              <Lock className="size-3.5" aria-hidden />
            </span>
            <label htmlFor="parent-pin" className={labelClass}>
              {t("parentPin")}
            </label>
          </div>
          <p className="text-xs text-muted-foreground">{t("parentPinBlurb")}</p>
          <input
            id="parent-pin"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            className={cn(fieldClass, "text-center tracking-[0.4em]")}
          />
          <input
            aria-label={t("repeat")}
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder={t("repeat")}
            className={cn(
              fieldClass,
              "text-center tracking-[0.4em] placeholder:tracking-normal",
              confirmPin.length > 0 && pin === confirmPin && pinValid && "border-correct",
            )}
          />
          {confirmPin.length > 0 && pin !== confirmPin && (
            <p className="text-xs font-bold text-wrong">{t("pinsDoNotMatch")}</p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm font-bold text-wrong">
            {error}
          </p>
        )}

        <div className="space-y-2.5">
          <button type="submit" disabled={!ready} className={cn(primaryActionClass, "disabled:pointer-events-none disabled:opacity-40")}>
            {busy ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <Play className="size-5" fill="currentColor" aria-hidden />
            )}
            {t("startPlaying")}
          </button>

          {/* A tablet whose site data was cleared lands here too, and a second
              profile would start the child over with no coins and no horse. */}
          {onRestore && (
            <button type="button" onClick={() => setRestoring(true)} className={secondaryActionClass}>
              <RotateCcw className="size-4" aria-hidden />
              {t("haveProfile")}
            </button>
          )}

          {/* A parent opening the app on their own laptop lands here, on a form
              that asks them to create a second profile for a child who already
              has one. This is the way out: the pairing code and PIN they already
              have are enough to reach the dashboard from any device. */}
          <Link to="/parent" className={cn(ghostActionClass, "py-2 text-sm")}>
            <LineChart className="size-4" aria-hidden />
            {t("parentLogin")}
          </Link>
        </div>
      </WelcomeCard>
    </WelcomeShell>
  );
}

function RestoreForm({
  onRestore,
  initialCode,
  onCancel,
}: {
  onRestore: (pairCode: string, pin: string) => Promise<unknown>;
  initialCode: string | null;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [pairCode, setPairCode] = useState(initialCode ?? "");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = pairCode.length === 6 && /^\d{4,8}$/.test(pin) && !busy;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await onRestore(pairCode, pin);
    } catch (cause) {
      // The server gives one answer for a wrong code and a wrong PIN alike;
      // anything else is the network.
      setError(String(cause).includes("do not match") ? t("pairWrong") : t("pairFailed"));
      setBusy(false);
    }
  };

  return (
    <WelcomeShell>
      <WelcomeCard
        as="form"
        onSubmit={submit}
        hero={<KeyRound className="size-10 text-primary" aria-hidden />}
        className="space-y-6"
      >
        <div className="text-center">
          <h1 className="font-display text-3xl font-black">{t("restoreTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("restoreBlurb")}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="restore-code" className={labelClass}>
            {t("pairingCode")}
          </label>
          <input
            id="restore-code"
            value={pairCode}
            onChange={(event) =>
              setPairCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
            }
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABC234"
            className={cn(fieldClass, "text-center text-2xl tracking-[0.35em]")}
          />
          <ScanButton onCode={setPairCode} />
        </div>

        <div className="space-y-2">
          <label htmlFor="restore-pin" className={labelClass}>
            {t("pin")}
          </label>
          <input
            id="restore-pin"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            autoFocus={initialCode !== null}
            className={cn(fieldClass, "text-center tracking-[0.4em]")}
          />
        </div>

        {error && (
          <motion.p
            role="alert"
            initial={{ x: 0 }}
            animate={{ x: [0, -8, 7, -4, 0] }}
            transition={{ duration: 0.4 }}
            className="rounded-lg bg-wrong/10 px-3 py-2 text-sm font-bold text-wrong"
          >
            {error}
          </motion.p>
        )}

        <div className="space-y-1">
          <button type="submit" disabled={!ready} className={cn(primaryActionClass, "disabled:pointer-events-none disabled:opacity-40")}>
            {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
            {t("restore")}
          </button>
          <button type="button" onClick={onCancel} className={cn(ghostActionClass, "text-sm")}>
            {t("newProfileInstead")}
          </button>
        </div>
      </WelcomeCard>
    </WelcomeShell>
  );
}
