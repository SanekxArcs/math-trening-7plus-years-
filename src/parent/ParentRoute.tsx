import { Link } from "react-router-dom";
import { convex } from "@/lib/convex";
import { useI18n } from "@/i18n/useI18n";
import { useDeviceIdentity } from "@/sync/useSync";
import { Dashboard } from "./Dashboard";
import { PairScreen } from "./PairScreen";
import { useParentSession } from "./useParentSession";

export function ParentRoute() {
  // The Convex hooks below cannot be called without a client, so bail before
  // reaching them rather than conditionally calling hooks.
  if (!convex) return <NoBackend />;
  return <ParentApp />;
}

function ParentApp() {
  const { session, login, logout, error, busy } = useParentSession();
  const { identity } = useDeviceIdentity();

  if (!session) {
    return (
      <PairScreen
        onSubmit={login}
        error={error}
        busy={busy}
        // On the child's own tablet the code is already known, so the parent
        // only has to prove they are the parent.
        knownCode={identity?.pairCode ?? null}
      />
    );
  }
  return <Dashboard session={session} onLogout={() => void logout()} />;
}

function NoBackend() {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-black">{t("noBackendTitle")}</h1>
      <p className="text-sm text-muted-foreground">
        {t("noBackendBlurb")} <code className="font-mono">VITE_CONVEX_URL</code>
      </p>
      <Link
        to="/"
        className="rounded-full bg-primary px-6 py-3 font-display font-bold text-primary-foreground shadow-md"
      >
        {t("backToGame")}
      </Link>
    </main>
  );
}
