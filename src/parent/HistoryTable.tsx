import { useState } from "react";
import { useQuery } from "convex/react";
import { Check, X } from "lucide-react";
import { api } from "@convex/_generated/api";
import { secondaryActionClass } from "@/game/GameDialog";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyNote } from "./charts";
import { useI18n } from "@/i18n/useI18n";

/**
 * The full attempt log, including what they actually picked.
 *
 * Storing the shown options is what makes this useful: "they answered 7×8 as
 * 54" tells a parent what to practise, where "62% on multiplication" does not.
 */
export function HistoryTable({ token }: { token: string }) {
  const { t } = useI18n();
  const [limit, setLimit] = useState(25);
  const page = useQuery(api.parent.history, { token, limit });

  if (page === undefined) {
    return <EmptyNote>{t("loading")}</EmptyNote>;
  }
  if (page.rows.length === 0) {
    return <EmptyNote>{t("noHistory")}</EmptyNote>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[34%]">{t("colQuestion")}</TableHead>
              <TableHead>{t("colAnswered")}</TableHead>
              <TableHead className="text-right">{t("colTime")}</TableHead>
              <TableHead className="text-right">{t("colPoints")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.rows.map((row) => (
              <TableRow key={row._id}>
                <TableCell className="font-display text-base font-bold tabular-nums">
                  {row.prompt}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    = {row.answer}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="flex items-center gap-1.5 font-bold tabular-nums">
                    {/* Icon plus text: never the status colour on its own. */}
                    {row.isCorrect ? (
                      <Check className="size-4 text-correct" aria-hidden />
                    ) : (
                      <X className="size-4 text-wrong" aria-hidden />
                    )}
                    {row.given === null ? (
                      <span className="text-muted-foreground">{t("ranOutOfTime")}</span>
                    ) : (
                      row.given
                    )}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {row.usedHalfHalf && <span>{t("halfHalf")}</span>}
                    {row.usedVisualHint && <span>{t("usedHint")}</span>}
                    {row.mode === "type" && <span>{t("usedTyped")}</span>}
                  </span>
                </TableCell>

                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {(row.ms / 1000).toFixed(1)}s
                </TableCell>

                <TableCell
                  className={`text-right font-bold tabular-nums ${
                    row.pointsDelta >= 0 ? "text-correct" : "text-wrong"
                  }`}
                >
                  {row.pointsDelta > 0 ? `+${row.pointsDelta}` : row.pointsDelta}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {page.nextBefore !== null && (
        <button type="button" className={cn(secondaryActionClass, "py-2.5 text-base")} onClick={() => setLimit((n) => n + 25)}>
          {t("showMore")}
        </button>
      )}
    </div>
  );
}
