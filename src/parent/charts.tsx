import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Two single-series charts.
 *
 * Single series throughout is deliberate: each chart answers one question, so
 * nothing needs a legend and colour never has to carry identity. Both series
 * steps were validated against their own surface. Every value is also
 * direct-labelled or in the tooltip, so nothing here depends on colour alone.
 *
 * Each hover target is a real <button>, which makes the tooltip keyboard
 * reachable as well as hoverable — a chart whose numbers only exist on mouse
 * hover is a chart half the readers cannot use.
 */

export const OP_LABELS: Record<string, string> = {
  add: "Adding",
  sub: "Subtracting",
  mul: "Times tables",
  div: "Dividing",
};

interface Tip {
  x: number;
  y: number;
  lines: string[];
}

function useTooltip() {
  const root = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const show = useCallback((target: HTMLElement, lines: string[]) => {
    const container = root.current;
    if (!container) return;
    const box = target.getBoundingClientRect();
    const frame = container.getBoundingClientRect();
    setTip({
      x: box.left - frame.left + box.width / 2,
      y: box.top - frame.top,
      lines,
    });
  }, []);

  const hide = useCallback(() => setTip(null), []);

  return { root, tip, show, hide };
}

function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
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
  );
}

export function AccuracyByOperation({
  byOperation,
}: {
  byOperation: Record<string, { correct: number; total: number }>;
}) {
  const { root, tip, show, hide } = useTooltip();

  const rows = Object.entries(byOperation)
    .map(([op, stats]) => ({
      op,
      label: OP_LABELS[op] ?? op,
      accuracy: stats.total === 0 ? 0 : stats.correct / stats.total,
      ...stats,
    }))
    // Weakest first: the parent is looking for what needs work, not a ranking.
    .sort((a, b) => a.accuracy - b.accuracy);

  if (rows.length === 0) return <EmptyNote>No practice recorded yet.</EmptyNote>;

  return (
    <div ref={root} className="relative space-y-3">
      <Tooltip tip={tip} />
      {rows.map((row) => {
        const percent = Math.round(row.accuracy * 100);
        return (
          <div key={row.op} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-bold">{row.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {percent}%
                <span className="ml-1.5 text-xs">
                  ({row.correct}/{row.total})
                </span>
              </span>
            </div>
            <button
              type="button"
              aria-label={`${row.label}: ${percent}% correct, ${row.correct} of ${row.total}`}
              onMouseMove={(event) =>
                show(event.currentTarget, [
                  `${row.label} — ${percent}%`,
                  `${row.correct} right of ${row.total}`,
                ])
              }
              onFocus={(event) =>
                show(event.currentTarget, [
                  `${row.label} — ${percent}%`,
                  `${row.correct} right of ${row.total}`,
                ])
              }
              onBlur={hide}
              onMouseLeave={hide}
              className="block h-3 w-full cursor-default overflow-hidden rounded-full bg-chart-empty focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span
                className="block h-full rounded-full bg-chart-series transition-[width] duration-500"
                style={{ width: `${Math.max(percent, row.total > 0 ? 2 : 0)}%` }}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function PracticeTrend({
  daily,
}: {
  daily: { day: string; total: number; correct: number }[];
}) {
  const { root, tip, show, hide } = useTooltip();
  const peak = Math.max(1, ...daily.map((day) => day.total));
  const practised = daily.filter((day) => day.total > 0).length;

  return (
    <div ref={root} className="relative">
      <Tooltip tip={tip} />

      <div className="flex h-28 items-end gap-1">
        {daily.map((day) => {
          const accuracy = day.total === 0 ? 0 : Math.round((day.correct / day.total) * 100);
          const lines =
            day.total === 0
              ? [formatDay(day.day), "No practice"]
              : [formatDay(day.day), `${day.total} questions · ${accuracy}% right`];

          return (
            <button
              key={day.day}
              type="button"
              aria-label={lines.join(", ")}
              onMouseMove={(event) => show(event.currentTarget, lines)}
              onFocus={(event) => show(event.currentTarget, lines)}
              onBlur={hide}
              onMouseLeave={hide}
              className="flex h-full flex-1 cursor-default flex-col justify-end rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {day.total === 0 ? (
                // A rest day is a thin gap rather than an invisible zero bar:
                // "nothing happened on Tuesday" is what this chart is for.
                <span className="block h-1 w-full rounded-full bg-chart-empty" />
              ) : (
                <span
                  className="block w-full rounded-t bg-chart-series transition-[height] duration-500"
                  style={{ height: `${Math.max(6, (day.total / peak) * 100)}%` }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>{formatDay(daily[0]?.day ?? "")}</span>
        <span>
          practised {practised} of {daily.length} days
        </span>
        <span>Today</span>
      </div>
    </div>
  );
}

function formatDay(iso: string): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function EmptyNote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("py-6 text-center text-sm text-muted-foreground", className)}>{children}</p>
  );
}
