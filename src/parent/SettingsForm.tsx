import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Check, Loader2 } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import type { Difficulty, GameSettings, Op } from "@/engine";
import { OP_LABELS } from "./charts";

const OPS: Op[] = ["add", "sub", "mul", "div"];

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: "easy", label: "Easy", hint: "2 answers" },
  { value: "medium", label: "Medium", hint: "4 answers" },
  { value: "hard", label: "Hard", hint: "6 answers" },
  { value: "expert", label: "Expert", hint: "type it in" },
];

interface SettingsFormProps {
  token: string;
  settings: GameSettings;
}

/**
 * Writes straight through to Convex, which pushes the change to the child's
 * device live — there is no "apply on their end" step and no refresh on either
 * side.
 */
export function SettingsForm({ token, settings }: SettingsFormProps) {
  const update = useMutation(api.parent.updateSettings);
  const [draft, setDraft] = useState<GameSettings>(settings);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Adopt server changes (another device, another tab) unless the parent is
  // mid-edit — clobbering a half-typed number would be worse than a stale form.
  useEffect(() => {
    if (state === "idle") setDraft(settings);
  }, [settings, state]);

  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setState("idle");
  };

  const toggleOp = (op: Op) => {
    const next = draft.ops.includes(op)
      ? draft.ops.filter((candidate) => candidate !== op)
      : [...draft.ops, op];
    if (next.length === 0) return; // the server rejects this too
    set("ops", next);
  };

  const save = async () => {
    setState("saving");
    setMessage(null);
    try {
      await update({ token, patch: draft });
      setState("saved");
      window.setTimeout(() => setState("idle"), 2000);
    } catch (cause) {
      setState("error");
      setMessage(cause instanceof Error ? cause.message : "Could not save");
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Operations
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {OPS.map((op) => {
            const on = draft.ops.includes(op);
            return (
              <button
                key={op}
                type="button"
                onClick={() => toggleOp(op)}
                aria-pressed={on}
                className={`rounded-[--radius-md] border-2 px-4 py-3 text-left font-bold transition-colors ${
                  on ? "border-primary bg-secondary" : "border-border bg-card text-muted-foreground"
                }`}
              >
                {OP_LABELS[op]}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Difficulty
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {DIFFICULTIES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => set("difficulty", option.value)}
              aria-pressed={draft.difficulty === option.value}
              className={`rounded-[--radius-md] border-2 px-4 py-3 text-left transition-colors ${
                draft.difficulty === option.value
                  ? "border-primary bg-secondary"
                  : "border-border bg-card"
              }`}
            >
              <span className="block font-bold">{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <NumberField
          id="limit1"
          label="Biggest first number"
          value={draft.limit1}
          min={1}
          max={100}
          onChange={(value) => set("limit1", value)}
        />
        <NumberField
          id="limit2"
          label="Biggest second number"
          value={draft.limit2}
          min={1}
          max={100}
          onChange={(value) => set("limit2", value)}
        />
      </section>

      <ToggleRow
        id="include-zero-one"
        label="Include 0 and 1"
        hint="×0 and ×1 are rules worth drilling, but they make easy questions."
        checked={draft.includeZeroOne}
        onChange={(value) => set("includeZeroOne", value)}
      />

      <section className="space-y-4 rounded-[--radius-md] bg-muted/40 p-4">
        <ToggleRow
          id="timer"
          label="Time limit"
          checked={draft.timerEnabled}
          onChange={(value) => set("timerEnabled", value)}
        />
        {draft.timerEnabled && (
          <SliderField
            label="Seconds per question"
            value={draft.timerSec}
            min={3}
            max={60}
            onChange={(value) => set("timerSec", value)}
            format={(value) => `${value}s`}
          />
        )}
      </section>

      <section className="space-y-4 rounded-[--radius-md] bg-muted/40 p-4">
        <ToggleRow
          id="goal"
          label="Points goal"
          checked={draft.goalEnabled}
          onChange={(value) => set("goalEnabled", value)}
        />
        {draft.goalEnabled && (
          <SliderField
            label="Points to win a round"
            value={draft.goalTarget}
            min={20}
            max={1000}
            step={10}
            onChange={(value) => set("goalTarget", value)}
          />
        )}
      </section>

      <section className="space-y-4 rounded-[--radius-md] bg-muted/40 p-4">
        <ToggleRow
          id="halfhalf"
          label="50:50 lifeline"
          hint="Halves the points for that question."
          checked={draft.halfHalfEnabled}
          onChange={(value) => set("halfHalfEnabled", value)}
        />
        {draft.halfHalfEnabled && (
          <SliderField
            label="Wait between uses"
            value={draft.halfHalfCooldownSec}
            min={0}
            max={300}
            step={5}
            onChange={(value) => set("halfHalfCooldownSec", value)}
            format={(value) => (value === 0 ? "no wait" : `${value}s`)}
          />
        )}
        <ToggleRow
          id="visual-hint"
          label="Picture hint"
          hint="Shows the groups of dots. Worth ¾ points."
          checked={draft.visualHintEnabled}
          onChange={(value) => set("visualHintEnabled", value)}
        />
        <ToggleRow
          id="sound"
          label="Sound"
          checked={draft.soundEnabled}
          onChange={(value) => set("soundEnabled", value)}
        />
      </section>

      {message && (
        <p role="alert" className="text-sm font-bold text-wrong">
          {message}
        </p>
      )}

      <Button
        onClick={save}
        disabled={state === "saving"}
        size="lg"
        className="w-full font-display text-lg"
      >
        {state === "saving" && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {state === "saved" && <Check className="size-4" aria-hidden />}
        {state === "saved" ? "Saved — sent to their device" : "Save settings"}
      </Button>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          // Clamp here as well as on the server, so the form cannot show a
          // value the backend will silently refuse to store.
          if (Number.isFinite(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
        }}
        className="h-12 font-display text-xl"
      />
    </div>
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
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="font-bold">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold">{label}</span>
        <span className="font-display text-lg tabular-nums text-primary">
          {format ? format(value) : value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => {
          if (typeof next === "number") onChange(next);
        }}
      />
    </div>
  );
}
