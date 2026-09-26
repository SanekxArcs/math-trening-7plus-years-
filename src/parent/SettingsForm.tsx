import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { Calculator, Check, Gauge, Keyboard, LifeBuoy, Loader2, Trophy, Undo2, Volume2 } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { lossLimit, type Difficulty, type GameSettings, type Op } from "@/engine";
import { cn } from "@/lib/utils";
import { LANGS, LANG_LABELS, type TranslationKey } from "@/i18n/translations";
import { useI18n } from "@/i18n/useI18n";
import { primaryActionClass } from "@/game/GameDialog";
import { opLabel } from "./charts";
import { OP_HUE, OP_SYMBOL, Panel, PanelTitle } from "./ui";

const OPS: Op[] = ["add", "sub", "mul", "div"];

const DIFFICULTIES: { value: Difficulty; label: TranslationKey; hint: TranslationKey; tiles: number }[] = [
  { value: "easy", label: "diffEasy", hint: "diffEasyHint", tiles: 2 },
  { value: "medium", label: "diffMedium", hint: "diffMediumHint", tiles: 4 },
  { value: "hard", label: "diffHard", hint: "diffHardHint", tiles: 6 },
  { value: "expert", label: "diffExpert", hint: "diffExpertHint", tiles: 0 },
];

const RANGE_PRESETS = [5, 10, 12, 20];

/** Equal as settings go: the operations are a set, whatever order they were ticked in. */
function sameSettings(a: GameSettings, b: GameSettings): boolean {
  const keys = Object.keys(a) as (keyof GameSettings)[];
  return keys.every((key) =>
    key === "ops" ? [...a.ops].sort().join() === [...b.ops].sort().join() : a[key] === b[key],
  );
}
const GOAL_PRESETS = [100, 200, 300, 500, 1000];

interface SettingsFormProps {
  token: string;
  settings: GameSettings;
  /** The child's current language, as stored on their profile. */
  locale: string;
  name: string;
}

/**
 * Writes straight through to Convex, which pushes the change to the child's
 * device live — there is no "apply on their end" step and no refresh on either
 * side.
 *
 * Grouped by the question a parent is asking — what to practise, how hard,
 * what the rules are, what help there is — with a sentence at the top that
 * says the whole configuration back in words, and a save bar that only
 * appears once there is something to save.
 */
export function SettingsForm({ token, settings, locale, name }: SettingsFormProps) {
  const { t } = useI18n();
  const update = useMutation(api.parent.updateSettings);
  const updateLocale = useMutation(api.parent.updateLocale);
  const [draft, setDraft] = useState<GameSettings>(settings);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const dirty = !sameSettings(draft, settings);

  // Adopt server changes (another device, another tab, a suggestion applied)
  // unless the parent is mid-edit — clobbering a half-made change would be
  // worse than a form that is briefly stale. "Mid-edit" is the draft having
  // moved away from what the server last said.
  const lastServer = useRef(settings);
  useEffect(() => {
    const previous = lastServer.current;
    lastServer.current = settings;
    setDraft((current) => (sameSettings(current, previous) ? settings : current));
  }, [settings]);

  useEffect(() => {
    if (state !== "saved") return;
    const id = window.setTimeout(() => setState("idle"), 2400);
    return () => window.clearTimeout(id);
  }, [state]);

  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (state === "error") setState("idle");
  };

  const toggleOp = (op: Op) => {
    const next = draft.ops.includes(op)
      ? draft.ops.filter((candidate) => candidate !== op)
      : [...draft.ops, op];
    if (next.length === 0) return; // the server rejects this too
    set("ops", OPS.filter((candidate) => next.includes(candidate)));
  };

  const save = async () => {
    setState("saving");
    setMessage(null);
    try {
      await update({ token, patch: draft });
      setState("saved");
    } catch (cause) {
      setState("error");
      setMessage(cause instanceof Error ? cause.message : t("couldNotSave"));
    }
  };

  const summary = [
    draft.ops.map((op) => opLabel(t, op)).join(", "),
    t("summaryRange", { a: draft.limit1, b: draft.limit2 }),
    t(DIFFICULTIES.find((d) => d.value === draft.difficulty)?.label ?? "diffMedium"),
    draft.goalEnabled ? t("summaryGoal", { points: draft.goalTarget }) : t("summaryNoGoal"),
    draft.timerEnabled ? t("summaryTimer", { seconds: draft.timerSec }) : t("summaryNoTimer"),
  ].join(" · ");

  return (
    <div className="space-y-4 pb-24">
      <Panel className="bg-linear-to-br from-primary/12 to-card/90">
        <p className="text-xs font-black uppercase tracking-widest text-primary">{t("summaryTitle", { name })}</p>
        <p className="mt-1 font-display text-lg font-bold leading-snug">{summary}</p>
      </Panel>

      <Panel delay={0.03}>
        <PanelTitle icon={Calculator} title={t("secWhat")} hint={t("secWhatHint")} />
        <div className="grid grid-cols-2 gap-2.5">
          {OPS.map((op) => {
            const on = draft.ops.includes(op);
            return (
              <button
                key={op}
                type="button"
                onClick={() => toggleOp(op)}
                aria-pressed={on}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg border-2 p-3 text-left font-bold transition-[border-color,background-color,opacity]",
                  on ? "border-transparent" : "border-dashed border-border bg-card opacity-70 hover:opacity-100",
                )}
                style={on ? { background: `color-mix(in oklch, ${OP_HUE[op]} 16%, var(--card))`, borderColor: OP_HUE[op] } : undefined}
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg font-display text-2xl font-black text-white shadow-sm"
                  style={{ background: on ? OP_HUE[op] : "var(--muted-foreground)" }}
                  aria-hidden
                >
                  {OP_SYMBOL[op]}
                </span>
                <span className="min-w-0 flex-1 leading-tight">{opLabel(t, op)}</span>
                {on && <Check className="size-4 shrink-0" strokeWidth={3} style={{ color: OP_HUE[op] }} aria-hidden />}
              </button>
            );
          })}
        </div>

        <div className="mt-5 space-y-5">
          <SliderField
            label={t("biggestFirst")}
            value={draft.limit1}
            min={1}
            max={100}
            presets={RANGE_PRESETS}
            onChange={(value) => set("limit1", value)}
          />
          <SliderField
            label={t("biggestSecond")}
            value={draft.limit2}
            min={1}
            max={100}
            presets={RANGE_PRESETS}
            onChange={(value) => set("limit2", value)}
          />
          <ToggleRow
            id="include-zero-one"
            label={t("includeZeroOne")}
            hint={t("includeZeroOneHint")}
            checked={draft.includeZeroOne}
            onChange={(value) => set("includeZeroOne", value)}
          />
          <ToggleRow
            id="adaptive"
            label={t("adaptivePractice")}
            hint={t("adaptivePracticeHint")}
            checked={draft.adaptive}
            onChange={(value) => set("adaptive", value)}
          />
        </div>
      </Panel>

      <Panel delay={0.06}>
        <PanelTitle icon={Gauge} title={t("difficulty")} hint={t("difficultyHint")} hue="var(--option-2)" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {DIFFICULTIES.map((option) => {
            const on = draft.difficulty === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => set("difficulty", option.value)}
                aria-pressed={on}
                className={cn(
                  "relative rounded-lg border-2 p-3 text-left transition-colors",
                  on ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/40",
                )}
              >
                {on && (
                  <motion.span
                    layoutId="difficulty-check"
                    className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground"
                    aria-hidden
                  >
                    <Check className="size-3.5" strokeWidth={3.5} />
                  </motion.span>
                )}
                {/* The answer tiles the child will see, drawn small. */}
                <span className="mb-2 flex h-5 items-center gap-0.5" aria-hidden>
                  {option.tiles === 0 ? (
                    <Keyboard className="size-5 text-primary" />
                  ) : (
                    Array.from({ length: option.tiles }, (_, i) => (
                      <span key={i} className="size-2.5 rounded-sm" style={{ background: `var(--option-${i})` }} />
                    ))
                  )}
                </span>
                <span className="block font-bold">{t(option.label)}</span>
                <span className="block text-xs text-muted-foreground">{t(option.hint)}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel delay={0.09}>
        <PanelTitle icon={Trophy} title={t("secRules")} hint={t("secRulesHint")} hue="var(--combo)" />
        <div className="space-y-5">
          <ToggleRow
            id="goal"
            label={t("pointsGoal")}
            hint={draft.goalEnabled ? t("goalLossHint", { points: -lossLimit(draft.goalTarget) }) : t("goalOffHint")}
            checked={draft.goalEnabled}
            onChange={(value) => set("goalEnabled", value)}
          />
          {draft.goalEnabled && (
            <SliderField
              label={t("pointsToWin")}
              value={draft.goalTarget}
              min={100}
              max={10000}
              step={100}
              presets={GOAL_PRESETS}
              onChange={(value) => set("goalTarget", value)}
            />
          )}
          <ToggleRow
            id="timer"
            label={t("timeLimit")}
            hint={t("timeLimitHint")}
            checked={draft.timerEnabled}
            onChange={(value) => set("timerEnabled", value)}
          />
          {draft.timerEnabled && (
            <SliderField
              label={t("secondsPerQuestion")}
              value={draft.timerSec}
              min={3}
              max={60}
              presets={[5, 10, 20, 30]}
              onChange={(value) => set("timerSec", value)}
              format={(value) => t("secondsShort", { seconds: value })}
            />
          )}
        </div>
      </Panel>

      <Panel delay={0.12}>
        <PanelTitle icon={LifeBuoy} title={t("secHelpers")} hint={t("secHelpersHint")} hue="var(--option-4)" />
        <div className="space-y-5">
          <ToggleRow
            id="halfhalf"
            label={t("halfHalfLifeline")}
            hint={t("halfHalfLifelineHint")}
            checked={draft.halfHalfEnabled}
            onChange={(value) => set("halfHalfEnabled", value)}
          />
          {draft.halfHalfEnabled && (
            <SliderField
              label={t("waitBetweenUses")}
              value={draft.halfHalfCooldownSec}
              min={0}
              max={300}
              step={5}
              presets={[0, 30, 60, 120]}
              onChange={(value) => set("halfHalfCooldownSec", value)}
              format={(value) => (value === 0 ? t("noWait") : t("secondsShort", { seconds: value }))}
            />
          )}
          <ToggleRow
            id="visual-hint"
            label={t("pictureHint")}
            hint={t("pictureHintHint")}
            checked={draft.visualHintEnabled}
            onChange={(value) => set("visualHintEnabled", value)}
          />
        </div>
      </Panel>

      <Panel delay={0.15}>
        <PanelTitle icon={Volume2} title={t("secSoundLanguage")} hue="var(--option-5)" />
        <div className="space-y-5">
          <ToggleRow
            id="sound"
            label={t("sound")}
            checked={draft.soundEnabled}
            onChange={(value) => set("soundEnabled", value)}
          />
          <div>
            <p className="mb-2 text-sm font-bold">{t("language")}</p>
            <p className="mb-2 text-xs text-muted-foreground">{t("languageHint")}</p>
            <div className="flex flex-wrap gap-2">
              {LANGS.map((code) => (
                <button
                  key={code}
                  type="button"
                  // Saves immediately rather than waiting for the save bar: this
                  // is the one setting whose effect the parent wants to see on the
                  // child's screen while they are still looking at it.
                  onClick={() => void updateLocale({ token, locale: code })}
                  aria-pressed={locale === code}
                  className={cn(
                    "rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors",
                    locale === code ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  {LANG_LABELS[code]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <SaveBar
        visible={dirty || state === "saving" || state === "saved" || state === "error"}
        state={state}
        message={message}
        dirty={dirty}
        onDiscard={() => {
          setDraft(settings);
          setState("idle");
          setMessage(null);
        }}
        onSave={save}
      />
    </div>
  );
}

/**
 * Floats over the bottom of the page while there is something unsaved, and
 * lingers a moment afterwards to confirm the change reached the child's device.
 */
function SaveBar({
  visible,
  state,
  message,
  dirty,
  onDiscard,
  onSave,
}: {
  visible: boolean;
  state: "idle" | "saving" | "saved" | "error";
  message: string | null;
  dirty: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const { t } = useI18n();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed inset-x-0 bottom-0 z-40 px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-xl border border-border/70 bg-card/95 p-2.5 pl-4 shadow-[0_-4px_32px_-12px_oklch(0.4_0.16_295/0.5)] backdrop-blur-md">
            <p role="status" className={cn("min-w-0 flex-1 text-sm font-bold", state === "error" && "text-wrong")}>
              {state === "saved"
                ? t("savedToDevice")
                : state === "error"
                  ? (message ?? t("couldNotSave"))
                  : t("unsavedChanges")}
            </p>
            {dirty && state !== "saving" && (
              <button
                type="button"
                onClick={onDiscard}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
              >
                <Undo2 className="size-4" aria-hidden />
                <span className="hidden sm:inline">{t("discard")}</span>
              </button>
            )}
            {state === "saved" && !dirty ? (
              <span className="flex items-center gap-1.5 rounded-full bg-correct/15 px-4 py-2 text-sm font-bold text-correct">
                <Check className="size-4" strokeWidth={3} aria-hidden />
              </span>
            ) : (
              <button
                type="button"
                onClick={onSave}
                disabled={state === "saving" || !dirty}
                className={cn(primaryActionClass, "w-auto px-5 py-2.5 text-base disabled:opacity-60")}
              >
                {state === "saving" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {t("saveSettings")}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <label htmlFor={id} className="text-sm font-bold">
          {label}
        </label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** A slider with the common values one tap away, for when dragging to exactly 12 is fiddly. */
function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  presets = [],
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  presets?: number[];
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  const show = format ?? String;
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold">{label}</span>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-display text-lg font-black tabular-nums text-primary">
          {show(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onValueChange={([next]) => {
          if (typeof next === "number") onChange(next);
        }}
      />
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              aria-pressed={value === preset}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums transition-colors",
                value === preset
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {show(preset)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
