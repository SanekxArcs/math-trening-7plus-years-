import { useState } from "react";
import { useMutation } from "convex/react";
import { motion } from "motion/react";
import {
  BarChart3,
  CalendarDays,
  Check,
  CircleUserRound,
  History,
  LayoutDashboard,
  PartyPopper,
  SlidersHorizontal,
  Table2,
  Clock,
  Flame,
  HeartPulse,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { moodOf, tick, type GameSettings, type Mood, type Pet } from "@/engine";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/i18n/translations";
import { useI18n } from "@/i18n/useI18n";
import { PetArt } from "@/pets/PetArt";
import { readPet } from "@/game/useStable";
import { primaryActionClass } from "@/game/GameDialog";
import { AccuracyByOperation, EmptyNote, PracticeTrend, opLabel } from "./charts";
import { suggest, weeks, type Suggestion } from "./suggestions";
import { DeltaChip, OP_HUE, OP_SYMBOL, Panel, PanelTitle } from "./ui";

export type OverviewData = FunctionReturnType<typeof api.parent.overview>;

const DIFFICULTY_LABEL: Record<string, TranslationKey> = {
  easy: "diffEasy",
  medium: "diffMedium",
  hard: "diffHard",
  expert: "diffExpert",
};

const MOOD_LABEL: Record<Mood, TranslationKey> = {
  happy: "moodHappy",
  ok: "moodOk",
  hungry: "moodHungry",
  dirty: "moodDirty",
  sad: "moodSad",
  sick: "moodSick",
  vacation: "moodVacation",
  asleep: "moodAsleep",
  gone: "moodGone",
};

/**
 * The first thing a parent sees: how this week went against the last, what
 * is worth doing about it, and the detail underneath for whoever wants it.
 */
export function Overview({
  data,
  settings,
  token,
}: {
  data: OverviewData;
  settings: GameSettings;
  token: string;
}) {
  const { t } = useI18n();
  const { stats } = data;
  const { current, previous } = weeks(stats.daily);
  const now = Date.now();

  const suggestions = suggest({
    daily: stats.daily,
    byOperation: stats.byOperation,
    averageMs: stats.averageMs,
    lastPlayedAt: stats.lastPlayedAt ?? null,
    settings,
    now,
  });

  const percent = (value: number | null) => (value === null ? null : Math.round(value * 100));
  const accuracyNow = percent(current.accuracy);
  const accuracyBefore = percent(previous.accuracy);

  return (
    <div className="space-y-4">
      <Welcome />
      <Panel>
        <PanelTitle icon={CalendarDays} title={t("thisWeek")} hint={t("vsLastWeek")} />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <WeekTile
            icon={BarChart3}
            hue="var(--primary)"
            label={t("questions")}
            value={String(current.total)}
            delta={<DeltaChip now={current.total} before={previous.total} />}
          />
          <WeekTile
            icon={Target}
            hue="var(--correct)"
            label={t("accuracy")}
            value={accuracyNow === null ? "—" : `${accuracyNow}%`}
            delta={
              accuracyNow !== null && accuracyBefore !== null ? (
                <DeltaChip now={accuracyNow} before={accuracyBefore} unit="%" />
              ) : null
            }
          />
          <WeekTile
            icon={CalendarDays}
            hue="var(--option-0)"
            label={t("daysPractised")}
            value={`${current.daysPractised}/7`}
            delta={<DeltaChip now={current.daysPractised} before={previous.daysPractised} />}
          />
          <WeekTile
            icon={Clock}
            hue="var(--combo)"
            label={t("averageTime")}
            value={stats.averageMs === 0 ? "—" : `${(stats.averageMs / 1000).toFixed(1)}s`}
          />
        </div>
      </Panel>

      <Panel delay={0.05}>
        <PanelTitle icon={Lightbulb} title={t("suggestionsTitle")} hint={t("suggestionsHint")} hue="var(--combo)" />
        <ul className="space-y-2">
          {suggestions.map((suggestion) => (
            // Keyed on the change too: "Ready for Hard?" applied becomes "Ready for
            // Expert?", which must not inherit the first one's "Applied".
            <SuggestionRow key={`${suggestion.kind}:${JSON.stringify(suggestion.patch ?? null)}`} suggestion={suggestion} token={token} />
          ))}
        </ul>
      </Panel>

      <PetsPanel pets={(data.progress?.pets ?? []).flatMap((raw) => readPet(raw) ?? [])} now={now} />

      <div className="grid gap-4 md:grid-cols-2">
        <Panel delay={0.1}>
          <PanelTitle icon={CalendarDays} title={t("practiceLast14")} />
          <PracticeTrend daily={stats.daily} />
        </Panel>
        <Panel delay={0.12}>
          <PanelTitle icon={Target} title={t("accuracyByOperation")} hue="var(--correct)" />
          <AccuracyByOperation byOperation={stats.byOperation} />
        </Panel>
      </div>

      <Panel delay={0.15}>
        <PanelTitle icon={Flame} title={t("worthPractising")} hint={t("worthPractisingHint")} hue="var(--wrong)" />
        {stats.weakest.length === 0 ? (
          <EmptyNote>{t("noRepeatedMistakes")}</EmptyNote>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {stats.weakest.map((entry) => {
              const [op = "", a, b] = entry.fact.split(":");
              const missed = entry.total - entry.correct;
              const wrong = [...new Set(entry.wrongAnswers)].slice(0, 3);
              return (
                <li
                  key={entry.fact}
                  className="flex items-center gap-3 rounded-lg p-2.5"
                  style={{ background: `color-mix(in oklch, ${OP_HUE[op] ?? "var(--primary)"} 10%, var(--card))` }}
                >
                  <span className="min-w-[5.5rem] font-display text-xl font-black tabular-nums">
                    {a} {OP_SYMBOL[op] ?? op} {b}
                  </span>
                  <span className="min-w-0 text-xs text-muted-foreground">
                    <span className="block font-bold text-foreground">
                      {t("missedOf", { missed, total: entry.total })}
                    </span>
                    {wrong.length > 0 && (
                      <span className="block truncate">
                        {t("answeredWith")} <span className="font-bold tabular-nums text-wrong">{wrong.join(", ")}</span>
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

const WELCOMED = "math_master_parent_welcomed";

/**
 * The parent's walkthrough: a card, once, saying what each tab is for. Short
 * enough to read in passing, gone for good after "Got it".
 */
function Welcome() {
  const { t } = useI18n();
  const [shown, setShown] = useState(() => {
    try {
      return localStorage.getItem(WELCOMED) === null;
    } catch {
      return false;
    }
  });
  if (!shown) return null;

  const rows = [
    { icon: LayoutDashboard, text: t("pwOverview") },
    { icon: Table2, text: t("pwTables") },
    { icon: History, text: t("pwHistory") },
    { icon: SlidersHorizontal, text: t("pwSettings") },
    { icon: CircleUserRound, text: t("pwAccount") },
  ];

  return (
    <Panel className="bg-linear-to-br from-combo/15 via-card/90 to-card/90">
      <PanelTitle icon={PartyPopper} title={t("pwTitle")} hint={t("pwBody")} hue="var(--combo)" />
      <ul className="space-y-2">
        {rows.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-2.5 text-sm">
            <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(WELCOMED, "1");
          } catch {
            /* private mode */
          }
          setShown(false);
        }}
        className={cn(primaryActionClass, "mt-4 w-auto px-5 py-2 text-base")}
      >
        {t("gotIt")}
      </button>
    </Panel>
  );
}

function WeekTile({
  icon: Icon,
  hue,
  label,
  value,
  delta,
}: {
  icon: typeof Target;
  hue: string;
  label: string;
  value: string;
  delta?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg p-3" style={{ background: `color-mix(in oklch, ${hue} 10%, var(--card))` }}>
      <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
        <span className="font-display text-2xl font-black tabular-nums">{value}</span>
        {delta}
      </div>
    </div>
  );
}

/** One piece of advice, with its one-tap fix when it has one. */
function SuggestionRow({ suggestion, token }: { suggestion: Suggestion; token: string }) {
  const { t } = useI18n();
  const update = useMutation(api.parent.updateSettings);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const { params } = suggestion;

  const vars = {
    days: params.days ?? 0,
    accuracy: params.accuracy ?? 0,
    op: params.op ? opLabel(t, params.op) : "",
    level: params.difficulty ? t(DIFFICULTY_LABEL[params.difficulty] ?? "diffMedium") : "",
    seconds: params.seconds ?? 0,
  };
  const text: Record<Suggestion["kind"], TranslationKey> = {
    idle: "sugIdle",
    harder: "sugHarder",
    easier: "sugEasier",
    hints: "sugHints",
    weakOp: "sugWeakOp",
    timer: "sugTimer",
    allGood: "sugAllGood",
  };
  const good = suggestion.kind === "allGood" || suggestion.kind === "harder";

  const apply = async () => {
    if (!suggestion.patch) return;
    setState("saving");
    try {
      await update({ token, patch: suggestion.patch });
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          good ? "bg-correct/15 text-correct" : "bg-combo/20 text-combo-foreground dark:text-combo",
        )}
      >
        {good ? <Sparkles className="size-4" aria-hidden /> : <TriangleAlert className="size-4" aria-hidden />}
      </span>
      <p className="min-w-0 flex-1 text-sm">{t(text[suggestion.kind], vars)}</p>
      {suggestion.patch && (
        <button
          type="button"
          onClick={apply}
          disabled={state === "saving" || state === "done"}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border-b-2 px-3 py-1.5 text-sm font-bold transition-[translate,background-color] active:translate-y-px",
            state === "done"
              ? "border-transparent bg-correct/15 text-correct"
              : "border-black/15 bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {state === "saving" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {state === "done" && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
          {state === "done" ? t("applied") : state === "error" ? t("couldNotSave") : t("apply")}
        </button>
      )}
    </li>
  );
}

/** The pets as of the last backup, brought up to now, so a hungry one shows. */
function PetsPanel({ pets, now }: { pets: Pet[]; now: number }) {
  const { t } = useI18n();
  return (
    <Panel delay={0.08}>
      <PanelTitle icon={HeartPulse} title={t("petsTitle")} hint={t("petsHint")} hue="var(--option-3)" />
      {pets.length === 0 ? (
        <EmptyNote>{t("noPetsYet")}</EmptyNote>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {pets.map((stored, index) => {
            const pet = tick(stored, now);
            const mood = moodOf(pet);
            const worry = mood === "hungry" || mood === "dirty" || mood === "sad" || mood === "sick" || mood === "gone";
            return (
              <motion.li
                key={pet.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-2.5",
                  worry ? "border-wrong/30 bg-wrong/5" : "border-border/60 bg-background/60",
                )}
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card shadow-inner">
                  <PetArt species={pet.species} mood={mood} worn={pet.worn} className={cn("size-10", !pet.alive && "grayscale")} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-black">{pet.name}</p>
                  <p className={cn("line-clamp-2 text-xs", worry ? "font-bold text-wrong" : "text-muted-foreground")}>
                    {t(MOOD_LABEL[mood], { name: pet.name })}
                  </p>
                  {pet.alive && (
                    <div className="mt-1.5 flex gap-1" aria-hidden>
                      {(["food", "clean", "happy", "health"] as const).map((stat) => (
                        <span key={stat} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              pet[stat] < 25 ? "bg-wrong" : pet[stat] < 50 ? "bg-combo" : "bg-correct",
                            )}
                            style={{ width: `${pet[stat]}%` }}
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
