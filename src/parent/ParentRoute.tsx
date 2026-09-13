import { Link } from "react-router-dom";

/** Phase 5 replaces this with pairing, PIN and the dashboard proper. */
export function ParentRoute() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl font-black">Parent dashboard</h1>
      <p className="text-muted-foreground">
        Pairing, stats and remote settings land in Phase 5.
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
