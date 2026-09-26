import { useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  masteryBand,
  strengthNow,
  type Difficulty,
  type FactStat,
  type MasteryBand,
  type Op,
} from "@/engine";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";
import { EmptyNote, OP_KEYS } from "./charts";

const OPS: Op[] = ["add", "sub", "mul", "div"];

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert"];

const DIFFICULTY_KEYS = {
  easy: "diffEasy",
  medium: "diffMedium",
  hard: "diffHard",
  expert: "diffExpert",
} as const;

const SYMBOL: Record<Op, string> = { add: "+", sub: "−", mul: "×", div: "÷" };

const BAND_CLASS: Record<MasteryBand, string> = {
  unseen: "bg-transparent text-muted-foreground/50",
  // The lightest step is too pale for white text; the darker two keep it.
  learning: "bg-mastery-1 text-[oklch(0.25_0.08_295)]",
  practising: "bg-mastery-2 text-white",
  known: "bg-mastery-3 text-white",
};

interface Tip {
  x: number;
  y: number;
  lines: string[];
}

/**
 * Every cell of every table, coloured by how well the child knows it.
 *
 * This is the view that answers "what is actually left to learn" — a
 * per-operation percentage cannot, because it averages 2×2 together with 7×8.
 * Strength is decayed to now on render, so a table drilled in the spring shows
 * as faded by the autumn rather than as permanently mastered.
 */
export function TablesGrid({
  token,
  limit1,
  limit2,
  includeZeroOne,
  initialDifficulty,
}: {
  token: string;
  limit1: number;
  limit2: number;
  includeZeroOne: boolean;
  initialDifficulty: Difficulty;
}) {
  const { t, lang } = useI18n();
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const rows = useQuery(api.parent.tables, { token, difficulty });

  const now = Date.now();
  const byKey = useMemo(() => {
    const map = new Map<string, FactStat>();
    for (const row of rows ?? []) {
      map.set(`${row.op}:${row.a}:${row.b}`, {
        attempts: row.attempts,
        correct: row.correct,
        totalMs: row.totalMs,
        bestMs: row.bestMs,
        strength: row.strength,
        lastSeenAt: row.lastSeenAt,
      });
    }
    return map;
  }, [rows]);

  const min = includeZeroOne ? 0 : 2;
  const max1 = Math.max(min, Math.min(20, Math.floor(limit1)));
  const max2 = Math.max(min, Math.min(20, Math.floor(limit2)));
  const cols = Array.from({ length: max2 - min + 1 }, (_, i) => min + i);
  const rowsRange = Array.from({ length: max1 - min + 1 }, (_, i) => min + i);

  const seen = (rows ?? []).filter((row) => row.attempts > 0).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {DIFFICULTIES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setDifficulty(value)}
            aria-pressed={difficulty === value}
            className={cn(
              "rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors",
              difficulty === value
                ? "border-primary bg-secondary"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {t(DIFFICULTY_KEYS[value])}
          </button>
        ))}
      </div>

      <Legend />

      {rows === undefined ? (
        <EmptyNote>{t("loading")}</EmptyNote>
      ) : seen === 0 ? (
        <EmptyNote>{t("noTablesYet")}</EmptyNote>
      ) : (
        OPS.map((op) => (
          <OperationGrid
            key={op}
            op={op}
            label={t(OP_KEYS[op])}
            rows={rowsRange}
            cols={cols}
            stats={byKey}
            now={now}
            lang={lang}
            t={t}
          />
        ))
      )}
    </div>
  );
}

function Legend() {
  const { t } = useI18n();
  const items: { band: MasteryBand; label: string }[] = [
    { band: "unseen", label: t("bandUnseen") },
    { band: "learning", label: t("bandLearning") },
    { band: "practising", label: t("bandPractising") },
    { band: "known", label: t("bandKnown") },
  ];

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.band} className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-3.5 rounded border border-border",
              BAND_CLASS[item.band],
            )}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function OperationGrid({
  op,
  label,
  rows,
  cols,
  stats,
  now,
  lang,
  t,
}: {
  op: Op;
  label: string;
  rows: number[];
  cols: number[];
  stats: Map<string, FactStat>;
  now: number;
  lang: string;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const root = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  // Skip an operation the child has never been given.
  const touched = rows.some((a) =>
    cols.some((b) => (stats.get(`${op}:${a}:${b}`)?.attempts ?? 0) > 0),
  );
  if (!touched) return null;

  const show = (target: HTMLElement, lines: string[]) => {
    const frame = root.current?.getBoundingClientRect();
    if (!frame) return;
    const box = target.getBoundingClientRect();
    setTip({
      x: box.left - frame.left + box.width / 2,
      y: box.top - frame.top,
      lines,
    });
  };

  return (
    <section ref={root} className="relative space-y-2">
      <h4 className="font-display text-sm font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </h4>

      {tip && (
        <div
          role="tooltip"
          style={{ left: tip.x, top: tip.y }}
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+6px)] rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-bold text-background shadow-lg"
        >
          {tip.lines.map((line) => (
            <div key={line} className="whitespace-nowrap">
              {line}
            </div>
          ))}
        </div>
      )}

      {/* The grid scrolls on its own rather than pushing the page sideways. */}
      <div className="overflow-x-auto pb-1">
        <table className="border-separate border-spacing-0.5 text-[10px] tabular-nums">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card px-1 text-muted-foreground">
                {SYMBOL[op]}
              </th>
              {cols.map((b) => (
                <th key={b} className="min-w-9 px-1 font-bold text-muted-foreground">
                  {b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a}>
                <th className="sticky left-0 z-10 bg-card px-1 font-bold text-muted-foreground">
                  {a}
                </th>
                {cols.map((b) => {
                  const stat = stats.get(`${op}:${a}:${b}`);
                  const band = masteryBand(stat, now);
                  const strength = stat ? strengthNow(stat, now) : 0;
                  const average =
                    stat && stat.attempts > 0 ? stat.totalMs / stat.attempts : 0;

                  const lines =
                    !stat || stat.attempts === 0
                      ? [`${a} ${SYMBOL[op]} ${b}`, t("bandUnseen")]
                      : [
                          `${a} ${SYMBOL[op]} ${b}`,
                          t("masteryPercent", { percent: Math.round(strength * 100) }),
                          t("rightOf", { correct: stat.correct, total: stat.attempts }),
                          t("averageSeconds", { seconds: (average / 1000).toFixed(1) }),
                          t("lastSeen", { when: formatWhen(stat.lastSeenAt, lang) }),
                        ];

                  return (
                    <td key={b} className="p-0">
                      <button
                        type="button"
                        aria-label={lines.join(", ")}
                        onMouseMove={(event) => show(event.currentTarget, lines)}
                        onFocus={(event) => show(event.currentTarget, lines)}
                        onBlur={() => setTip(null)}
                        onMouseLeave={() => setTip(null)}
                        className={cn(
                          "flex size-9 cursor-default items-center justify-center rounded border border-border/60 font-bold",
                          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                          BAND_CLASS[band],
                        )}
                      >
                        {/* Average seconds, so speed is legible without hovering
                            every cell. One decimal below ten seconds: rounding a
                            0.4s answer to "0" reads as missing data rather than
                            as fast. */}
                        {stat && stat.attempts > 0 ? formatSeconds(average) : "·"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatSeconds(ms: number): string {
  const seconds = ms / 1000;
  return seconds < 10 ? seconds.toFixed(1) : String(Math.round(seconds));
}

function formatWhen(at: number, lang: string): string {
  if (!at) return "—";
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days <= 0) return new Date(at).toLocaleTimeString(lang, { timeStyle: "short" });
  return new Date(at).toLocaleDateString(lang, { day: "numeric", month: "short" });
}
