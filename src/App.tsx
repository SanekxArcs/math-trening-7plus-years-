import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { PlayRoute } from "@/game/PlayRoute";

/**
 * The dashboard is loaded on demand, and deliberately so.
 *
 * It is the parent's tool: charts, tables, a settings form, a login. A child's
 * tablet opens the game a hundred times and the dashboard never — so none of
 * that belongs in the bundle every one of those visits pays for, nor in the
 * service worker's precache, which downloads it to the device whether it is
 * ever used or not.
 */
const ParentRoute = lazy(() =>
  import("@/parent/ParentRoute").then((module) => ({ default: module.ParentRoute })),
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlayRoute />} />
      {/* Eager, unlike the dashboard: the child opens it every day. */}
      <Route path="/pets" element={<PlayRoute view="pets" />} />
      <Route path="/horse" element={<Navigate to="/pets" replace />} />
      <Route
        path="/parent/*"
        element={
          <Suspense fallback={<Loading />}>
            <ParentRoute />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" aria-label="Loading" />
    </main>
  );
}
