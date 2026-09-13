import { Link } from "react-router-dom";
import { convex } from "@/lib/convex";
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

  if (!session) return <PairScreen onSubmit={login} error={error} busy={busy} />;
  return <Dashboard session={session} onLogout={() => void logout()} />;
}

function NoBackend() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-black">Dashboard unavailable</h1>
      <p className="text-sm text-muted-foreground">
        This build has no backend configured, so there is nothing to sign in to.
        Set <code className="font-mono">VITE_CONVEX_URL</code> and reload.
      </p>
      <Link
        to="/"
        className="rounded-full bg-primary px-6 py-3 font-display font-bold text-primary-foreground shadow-md"
      >
        Back to the game
      </Link>
    </main>
  );
}
