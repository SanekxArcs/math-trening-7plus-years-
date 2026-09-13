import { useState } from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

const AVATARS = ["🦊", "🐼", "🦁", "🐸", "🦄", "🐙", "🐝", "🦖"];

interface SetupScreenProps {
  onCreate: (name: string, pin: string, locale: string, avatarEmoji: string) => Promise<unknown>;
}

/**
 * One-time setup on the child's device.
 *
 * The PIN is the parent's, not the child's — it is what stops the kid opening
 * the dashboard and raising their own target — so the copy says so plainly
 * rather than leaving them to guess who is meant to type it.
 */
export function SetupScreen({ onCreate }: SetupScreenProps) {
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
      await onCreate(name.trim(), pin, navigator.language.slice(0, 2) || "pl", avatar);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the profile");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-8">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-7 rounded-[--radius-xl] bg-card p-7 shadow-xl"
      >
        <div className="text-center">
          <h1 className="font-display text-3xl font-black">Who's playing?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up once. You can change everything later from the parent dashboard.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="kid-name" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Name
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
            Pick a buddy
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
            Parent PIN (4–8 digits)
          </label>
          <p className="text-xs text-muted-foreground">
            Grown-ups only. This unlocks the dashboard and the settings.
          </p>
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
            aria-label="Confirm parent PIN"
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder="Repeat"
            className="w-full rounded-[--radius-sm] border-2 border-border bg-background px-4 py-3 font-display text-xl tracking-[0.4em] outline-none focus-visible:border-ring"
          />
          {confirmPin.length > 0 && pin !== confirmPin && (
            <p className="text-xs font-bold text-wrong">The two PINs do not match.</p>
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
          Start playing
        </button>
      </motion.form>
    </main>
  );
}
