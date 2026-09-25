import { useState } from "react";
import { motion } from "motion/react";
import { Loader2, LineChart, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { LANGS, LANG_LABELS } from "@/i18n/translations";
import { useI18n } from "@/i18n/useI18n";

const AVATARS = ["🦊", "🐼", "🦁", "🐸", "🦄", "🐙", "🐝", "🦖"];

interface SetupScreenProps {
  onCreate: (name: string, pin: string, locale: string, avatarEmoji: string) => Promise<unknown>;
  /** Links this device to a profile that already exists. */
  onRestore?: (pairCode: string, pin: string) => Promise<unknown>;
}

/**
 * One-time setup on the child's device.
 *
 * The PIN is the parent's, not the child's — it is what stops the kid opening
 * the dashboard and raising their own target — so the copy says so plainly
 * rather than leaving them to guess who is meant to type it.
 */
export function SetupScreen({ onCreate, onRestore }: SetupScreenProps) {
  const { t, lang, setLang } = useI18n();
  const [restoring, setRestoring] = useState(false);
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
    return <RestoreForm onRestore={onRestore} onCancel={() => setRestoring(false)} />;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-8">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-7 rounded-[--radius-xl] bg-card p-7 shadow-xl"
      >
        <fieldset className="space-y-2">
          <legend className="sr-only">{t("language")}</legend>
          <div className="flex justify-center gap-2">
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={`rounded-full border-2 px-3 py-1.5 text-sm font-bold transition-colors ${
                  lang === code ? "border-primary bg-secondary" : "border-border bg-card"
                }`}
              >
                {LANG_LABELS[code]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="text-center">
          <h1 className="font-display text-3xl font-black">{t("whosPlaying")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("setupBlurb")}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="kid-name" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {t("name")}
          </label>
          <input
            id="kid-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            maxLength={24}
            className="w-full rounded-[--radius-md] border-2 border-border bg-background px-4 py-3 font-display text-xl outline-none focus-visible:border-ring"
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {t("pickABuddy")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setAvatar(emoji)}
                aria-pressed={avatar === emoji}
                className={`flex size-12 items-center justify-center rounded-2xl border-2 text-2xl transition-colors ${
                  avatar === emoji ? "border-primary bg-secondary" : "border-border bg-background"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2 rounded-[--radius-md] bg-muted/50 p-4">
          <label htmlFor="parent-pin" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {t("parentPin")}
          </label>
          <p className="text-xs text-muted-foreground">{t("parentPinBlurb")}</p>
          <input
            id="parent-pin"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            className="w-full rounded-[--radius-sm] border-2 border-border bg-background px-4 py-3 font-display text-xl tracking-[0.4em] outline-none focus-visible:border-ring"
          />
          <input
            aria-label={t("repeat")}
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder={t("repeat")}
            className="w-full rounded-[--radius-sm] border-2 border-border bg-background px-4 py-3 font-display text-xl tracking-[0.4em] outline-none focus-visible:border-ring"
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

        <button
          type="submit"
          disabled={!ready}
          className="flex w-full items-center justify-center gap-2 rounded-[--radius-lg] border-b-8 border-primary/60 bg-primary py-5 font-display text-xl font-black text-primary-foreground shadow-xl disabled:opacity-40"
        >
          {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
          {t("startPlaying")}
        </button>

        {/* A tablet whose site data was cleared lands here too, and a second
            profile would start the child over with no coins and no horse. */}
        {onRestore && (
          <button
            type="button"
            onClick={() => setRestoring(true)}
            className="flex w-full items-center justify-center gap-2 rounded-[--radius-md] border-2 border-border py-3 font-display font-bold text-foreground transition-colors hover:bg-secondary focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
          >
            <RotateCcw className="size-4" aria-hidden />
            {t("haveProfile")}
          </button>
        )}

        {/* A parent opening the app on their own laptop lands here, on a form
            that asks them to create a second profile for a child who already
            has one. This is the way out: the pairing code and PIN they already
            have are enough to reach the dashboard from any device. */}
        <Link
          to="/parent"
          className="flex items-center justify-center gap-2 rounded-[--radius-md] py-2 text-sm font-bold text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
        >
          <LineChart className="size-4" aria-hidden />
          {t("parentLogin")}
        </Link>
      </motion.form>
    </main>
  );
}

function RestoreForm({
  onRestore,
  onCancel,
}: {
  onRestore: (pairCode: string, pin: string) => Promise<unknown>;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [pairCode, setPairCode] = useState("");
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-8">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 rounded-[--radius-xl] bg-card p-7 shadow-xl"
      >
        <div className="text-center">
          <h1 className="font-display text-3xl font-black">{t("restoreTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("restoreBlurb")}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="restore-code" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
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
            className="w-full rounded-[--radius-md] border-2 border-border bg-background px-4 py-3 text-center font-display text-2xl tracking-[0.35em] outline-none focus-visible:border-ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="restore-pin" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {t("pin")}
          </label>
          <input
            id="restore-pin"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            className="w-full rounded-[--radius-md] border-2 border-border bg-background px-4 py-3 font-display text-xl tracking-[0.4em] outline-none focus-visible:border-ring"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm font-bold text-wrong">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!ready}
          className="flex w-full items-center justify-center gap-2 rounded-[--radius-lg] border-b-8 border-primary/60 bg-primary py-5 font-display text-xl font-black text-primary-foreground shadow-xl disabled:opacity-40"
        >
          {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
          {t("restore")}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-[--radius-md] py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t("newProfileInstead")}
        </button>
      </motion.form>
    </main>
  );
}
