import { CloudOff, RefreshCw } from "lucide-react";
import type { SyncStatus } from "@/sync/useSync";
import { useI18n } from "@/i18n/useI18n";

/**
 * Deliberately quiet. Losing the network is not the child's problem to solve,
 * and a red error banner mid-question is worse than useless — the game keeps
 * working either way, so this is a small reassurance, not an alarm.
 */
export function SyncBadge({ status }: { status: SyncStatus }) {
  const { t } = useI18n();
  if (status.online && status.pending === 0) return null;

  return (
    <span
      className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
      title={
        status.online ? t("pendingTitle", { count: status.pending }) : t("offlineTitle")
      }
    >
      {status.online ? (
        <RefreshCw className={status.syncing ? "size-3 animate-spin" : "size-3"} aria-hidden />
      ) : (
        <CloudOff className="size-3" aria-hidden />
      )}
      {status.pending > 0 ? status.pending : t("offline")}
    </span>
  );
}
