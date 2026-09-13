import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { convex } from "@/lib/convex";
import { isLang } from "@/i18n/translations";
import { useI18n } from "@/i18n/useI18n";
import { useDeviceIdentity, useOutboxSync, useSyncedSettings } from "@/sync/useSync";
import { useFactStats } from "@/sync/useFactStats";
import { GameScreen } from "./GameScreen";
import { PairCodeCard } from "./PairCodeCard";
import { SetupScreen } from "./SetupScreen";
import { useLocalSettings } from "./useLocalSettings";

/**
 * Chooses where the game's data comes from.
 *
 * The two branches are separate components rather than one component with a
 * conditional: the synced branch calls Convex hooks, which cannot be called at
 * all when no client is configured.
 */
export function PlayRoute() {
  return convex ? <SyncedGame /> : <LocalGame />;
}

/** No backend configured — the game still plays, it just records nothing. */
function LocalGame() {
  const [settings] = useLocalSettings();
  const { getStats, recordFacts } = useFactStats();
  return <GameScreen settings={settings} onRecord={recordFacts} getStats={getStats} />;
}

function SyncedGame() {
  const { identity, claim, unlink } = useDeviceIdentity();
  const { settings, locale, unlinked } = useSyncedSettings(identity);
  const { status, record } = useOutboxSync(identity);
  const { getStats, recordFacts } = useFactStats();
  const { setLang } = useI18n();

  // Mastery is updated locally first and synchronously, so the very next
  // question already reflects the answer just given — the outbox catches up
  // with the server in its own time.
  const onRecord = useCallback(
    (records: Parameters<typeof record>[0]) => {
      recordFacts(records);
      void record(records);
    },
    [record, recordFacts],
  );

  // The pairing code is generated on this device and shown nowhere else until
  // the parent is already signed in — which needs the code. So it gets its own
  // step, once, at the only moment the parent is certainly present.
  const [codeToConfirm, setCodeToConfirm] = useState<string | null>(null);

  /**
   * The profile these credentials belong to is gone — deleted from the
   * dashboard, or a deployment reset. Drop them and start over rather than
   * sitting in an error the user cannot clear without wiping site data.
   */
  useEffect(() => {
    if (unlinked || status.unlinked) void unlink();
  }, [unlinked, status.unlinked, unlink]);

  // The profile's locale is parent-set, so on the child's own device it wins
  // over whatever this browser happened to guess.
  useEffect(() => {
    if (isLang(locale)) setLang(locale);
  }, [locale, setLang]);

  if (identity === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="Loading" />
      </main>
    );
  }

  if (identity === null) {
    return (
      <SetupScreen
        onCreate={async (name, pin, chosenLocale, avatarEmoji) => {
          const created = await claim(name, pin, chosenLocale, avatarEmoji);
          setCodeToConfirm(created.pairCode);
        }}
      />
    );
  }

  if (codeToConfirm) {
    return (
      <PairCodeCard
        pairCode={codeToConfirm}
        name={identity.name}
        onDone={() => setCodeToConfirm(null)}
      />
    );
  }

  return (
    <GameScreen
      settings={settings}
      onRecord={onRecord}
      syncStatus={status}
      getStats={getStats}
      pairCode={identity.pairCode}
    />
  );
}
