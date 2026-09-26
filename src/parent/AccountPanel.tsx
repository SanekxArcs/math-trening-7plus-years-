import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { AnimatePresence, motion, type MotionStyle } from "motion/react";
import { Check, Copy, KeyRound, Loader2, Lock, LogOut, Smartphone, TriangleAlert, UserRound } from "lucide-react";
import { api } from "@convex/_generated/api";
import { convex } from "@/lib/convex";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { Backdrop, GameDialog, ghostActionClass, primaryActionClass, secondaryActionClass } from "@/game/GameDialog";
import { fieldClass, labelClass } from "@/game/WelcomeShell";
import { pendingCount } from "@/sync/outbox";
import { signOutDevice } from "@/sync/signOut";
import type { DeviceIdentity } from "@/sync/db";
import { Panel, PanelTitle } from "./ui";
import { QrCode } from "@/pair/QrCode";

const AVATARS = ["🦊", "🐼", "🦁", "🐸", "🦄", "🐙", "🐝", "🦖"];

interface AccountPanelProps {
  token: string;
  profile: { id: string; name: string; avatarEmoji: string; pairCode: string };
  /** This device's own credentials, when the dashboard is open on the child's device. */
  device: DeviceIdentity | null;
  onLeave: () => void;
}

export function AccountPanel({ token, profile, device, onLeave }: AccountPanelProps) {
  return (
    <div className="space-y-4">
      <ProfileSection token={token} profile={profile} />
      <PairingSection pairCode={profile.pairCode} />
      <PinSection token={token} />
      <Panel delay={0.12}>
        <SignOutChoices token={token} name={profile.name} device={device} onLeave={onLeave} />
      </Panel>
    </div>
  );
}

function ProfileSection({ token, profile }: { token: string; profile: AccountPanelProps["profile"] }) {
  const { t } = useI18n();
  const update = useMutation(api.parent.updateProfile);
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatarEmoji);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = name.trim() !== profile.name || avatar !== profile.avatarEmoji;

  const save = async () => {
    setState("saving");
    try {
      await update({ token, name: name.trim(), avatarEmoji: avatar });
      setState("saved");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
    }
  };

  return (
    <Panel>
      <PanelTitle icon={UserRound} title={t("secProfile")} hint={t("secProfileHint")} />
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="child-name" className={labelClass}>
            {t("name")}
          </label>
          <input
            id="child-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={24}
            autoComplete="off"
            className={fieldClass}
          />
        </div>
        <fieldset className="space-y-2">
          <legend className={labelClass}>{t("pickABuddy")}</legend>
          <div className="grid grid-cols-8 gap-1.5 pt-1">
            {AVATARS.map((emoji, index) => {
              const picked = avatar === emoji;
              return (
                <motion.button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  aria-pressed={picked}
                  data-tone={picked ? "solid" : undefined}
                  whileTap={{ scale: 0.9 }}
                  className="answer-tile flex aspect-square items-center justify-center text-xl sm:text-2xl"
                  style={{ "--tile": `var(--option-${index % 6})` } as MotionStyle}
                >
                  <span className="relative">{emoji}</span>
                </motion.button>
              );
            })}
          </div>
        </fieldset>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || name.trim().length === 0 || state === "saving"}
          className={cn(secondaryActionClass, "disabled:opacity-50", state === "saved" && "text-correct")}
        >
          {state === "saving" && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {state === "saved" && <Check className="size-4" strokeWidth={3} aria-hidden />}
          {state === "saved" ? t("profileSaved") : state === "error" ? t("couldNotSave") : t("saveProfile")}
        </button>
      </div>
    </Panel>
  );
}

function PairingSection({ pairCode }: { pairCode: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pairCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the code is on screen regardless */
    }
  };
  return (
    <Panel delay={0.04}>
      <PanelTitle icon={KeyRound} title={t("pairingCode")} hint={t("pairingCodeHint")} hue="var(--option-1)" />
      <div className="flex flex-wrap items-center gap-4">
        <QrCode code={pairCode} className="size-32 shrink-0" />
        <div className="space-y-2">
        <p className="flex gap-1" role="img" aria-label={pairCode.split("").join(" ")}>
          {pairCode.split("").map((char, index) => (
            <span
              key={`${char}-${index}`}
              className="answer-tile flex h-11 w-9 items-center justify-center font-display text-xl font-black"
              style={{ "--tile": `var(--option-${index % 6})` } as React.CSSProperties}
            >
              <span className="relative">{char}</span>
            </span>
          ))}
        </p>
        <button type="button" onClick={copy} className={cn(ghostActionClass, "w-auto px-3", copied && "text-correct")}>
          {copied ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? t("copied") : t("copyCode")}
        </button>
        <p className="max-w-60 text-xs text-muted-foreground">{t("qrHint")}</p>
        </div>
      </div>
    </Panel>
  );
}

function PinSection({ token }: { token: string }) {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const digits = (value: string) => value.replace(/\D/g, "").slice(0, 8);
  const ready = /^\d{4,8}$/.test(current) && /^\d{4,8}$/.test(next) && next === repeat && state !== "saving";

  const change = async () => {
    if (!convex || !ready) return;
    setState("saving");
    setError(null);
    try {
      await convex.action(api.secure.changePin, { token, currentPin: current, newPin: next });
      setState("saved");
      setCurrent("");
      setNext("");
      setRepeat("");
      window.setTimeout(() => setState("idle"), 2500);
    } catch (cause) {
      setState("idle");
      setError(String(cause).includes("current PIN") ? t("pinWrongCurrent") : t("couldNotSave"));
    }
  };

  const field = (id: string, label: string, value: string, onChange: (value: string) => void, auto: string) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(digits(event.target.value))}
        type="password"
        inputMode="numeric"
        autoComplete={auto}
        className={cn(fieldClass, "text-center tracking-[0.4em]")}
      />
    </div>
  );

  return (
    <Panel delay={0.08}>
      <PanelTitle icon={Lock} title={t("changePin")} hint={t("changePinHint")} hue="var(--foreground)" />
      <div className="grid gap-3 sm:grid-cols-3">
        {field("pin-current", t("currentPin"), current, setCurrent, "current-password")}
        {field("pin-new", t("newPin"), next, setNext, "new-password")}
        {field("pin-repeat", t("repeat"), repeat, setRepeat, "new-password")}
      </div>
      {repeat.length > 0 && next !== repeat && (
        <p className="mt-2 text-xs font-bold text-wrong">{t("pinsDoNotMatch")}</p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-wrong">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={change}
        disabled={!ready}
        className={cn(secondaryActionClass, "mt-4 disabled:opacity-50", state === "saved" && "text-correct")}
      >
        {state === "saving" && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {state === "saved" && <Check className="size-4" strokeWidth={3} aria-hidden />}
        {state === "saved" ? t("pinChanged") : t("changePin")}
      </button>
    </Panel>
  );
}

/**
 * The two ways out, side by side so the difference is obvious: locking the
 * dashboard again, and taking the child's profile off this device entirely.
 */
export function SignOutChoices({
  token,
  name,
  device,
  onLeave,
}: {
  token: string;
  name: string;
  device: DeviceIdentity | null;
  onLeave: () => void;
}) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <PanelTitle icon={LogOut} title={t("signOut")} hue="var(--wrong)" />
      <div className="space-y-2.5">
        <Choice icon={Lock} title={t("leaveDashboard")} hint={t("leaveDashboardHint")} onClick={onLeave} />
        {device ? (
          <Choice
            icon={Smartphone}
            title={t("signOutDevice")}
            hint={t("signOutDeviceHint", { name })}
            onClick={() => setConfirming(true)}
            danger
          />
        ) : (
          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">{t("signOutElsewhere")}</p>
        )}
      </div>
      <AnimatePresence>
        {confirming && device && (
          <ConfirmSignOut token={token} name={name} device={device} onCancel={() => setConfirming(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function Choice({
  icon: Icon,
  title,
  hint,
  onClick,
  danger = false,
}: {
  icon: typeof Lock;
  title: string;
  hint: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none",
        danger ? "border-wrong/30 hover:border-wrong/60 hover:bg-wrong/5" : "border-border hover:border-primary/40 hover:bg-secondary/50",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          danger ? "bg-wrong/12 text-wrong" : "bg-secondary text-secondary-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className={cn("block font-bold", danger && "text-wrong")}>{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

/**
 * The last check before the device forgets the child. It says what goes, what
 * is kept safe, and — if the device is offline or behind — what would be lost.
 */
function ConfirmSignOut({
  token,
  name,
  device,
  onCancel,
}: {
  token: string;
  name: string;
  device: DeviceIdentity;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const online = typeof navigator === "undefined" || navigator.onLine;

  useEffect(() => {
    void pendingCount().then(setPending).catch(() => setPending(0));
  }, []);

  // Portalled: the panel it opens from is animated, and a transformed
  // ancestor would pin this "fixed" overlay inside the panel instead of the page.
  return createPortal(
    <Backdrop>
      <GameDialog tone="lost" hero={<Smartphone className="size-10" aria-hidden />}>
        <h2 className="font-display text-2xl font-black">{t("signOutConfirmTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("signOutDeviceHint", { name })}</p>
        {(pending > 0 || !online) && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-wrong/10 p-3 text-left text-sm font-bold text-wrong">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {pending > 0 ? t("signOutPending", { count: pending }) : t("signOutOffline")}
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void signOutDevice(device, token);
          }}
          className={cn(primaryActionClass, "mt-6 from-wrong to-wrong/80 shadow-[0_10px_24px_-10px_var(--wrong)]")}
        >
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <LogOut className="size-5" aria-hidden />}
          {busy ? t("signingOut") : t("signOutConfirm")}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={cn(ghostActionClass, "mt-1")}>
          {t("cancel")}
        </button>
      </GameDialog>
    </Backdrop>,
    document.body,
  );
}
