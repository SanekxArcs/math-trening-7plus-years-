import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { convex } from "@/lib/convex";

const KEY = "math_master_parent_session";

export interface ParentSession {
  token: string;
  profileId: string;
  name: string;
  expiresAt: number;
}

function read(): ParentSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ParentSession;
    // Drop an obviously expired session client-side too, so the dashboard shows
    // the login form rather than a flash of errors. The server checks anyway.
    if (typeof parsed?.token !== "string" || parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useParentSession() {
  const [session, setSession] = useState<ParentSession | null>(read);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const logoutMutation = useMutation(api.parent.logout);

  useEffect(() => {
    try {
      if (session) localStorage.setItem(KEY, JSON.stringify(session));
      else localStorage.removeItem(KEY);
    } catch {
      /* private mode — the session just will not survive a reload */
    }
  }, [session]);

  // Expire in place, so a dashboard left open overnight returns to the PIN
  // prompt instead of sitting there looking authorised.
  useEffect(() => {
    if (!session) return;
    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) {
      setSession(null);
      return;
    }
    const id = window.setTimeout(() => setSession(null), remaining);
    return () => window.clearTimeout(id);
  }, [session]);

  const login = useCallback(async (pairCode: string, pin: string) => {
    if (!convex) {
      setError("No backend configured");
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await convex.action(api.secure.parentLogin, { pairCode, pin });
      setSession(result);
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      // Convex wraps thrown ConvexError data; surface the useful half only.
      setError(
        message.includes("do not match")
          ? "That pairing code and PIN do not match."
          : "Could not sign in. Check your connection and try again.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const current = session;
    setSession(null);
    if (current) {
      try {
        await logoutMutation({ token: current.token });
      } catch {
        // The local session is already gone; a failed server revoke will time
        // out on its own.
      }
    }
  }, [session, logoutMutation]);

  return { session, login, logout, error, busy };
}
