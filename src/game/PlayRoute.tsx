import { Loader2 } from "lucide-react";
import { convex } from "@/lib/convex";
import { useDeviceIdentity, useOutboxSync, useSyncedSettings } from "@/sync/useSync";
import { GameScreen } from "./GameScreen";
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
  return <GameScreen settings={settings} />;
}

function SyncedGame() {
  const { identity, claim } = useDeviceIdentity();
  const settings = useSyncedSettings(identity);
  const { status, record } = useOutboxSync(identity);

  if (identity === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="Loading" />
      </main>
    );
  }

  if (identity === null) return <SetupScreen onCreate={claim} />;

  return <GameScreen settings={settings} onRecord={record} syncStatus={status} />;
}
