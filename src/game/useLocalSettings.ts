import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, type GameSettings } from "@/engine";

const KEY = "math_master_settings";

/**
 * Local settings, kept deliberately simple for now.
 *
 * Phase 3 replaces the storage behind this hook with the Dexie mirror that
 * Convex writes through to; the signature stays the same so GameScreen does not
 * change when the parent dashboard starts driving these values.
 */
function read(): GameSettings {
  if (typeof localStorage === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as unknown;
    // Never trust storage: a corrupt or half-migrated value must not be able to
    // brick the app, which is exactly what the old getFromLocalStorage did when
    // it handed back a raw string on a parse failure.
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_SETTINGS;
    const merged = { ...DEFAULT_SETTINGS, ...(parsed as Partial<GameSettings>) };
    return Array.isArray(merged.ops) && merged.ops.length > 0
      ? merged
      : { ...merged, ops: DEFAULT_SETTINGS.ops };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useLocalSettings() {
  const [settings, setSettings] = useState<GameSettings>(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Private mode or a full quota. Playing on is better than crashing.
    }
  }, [settings]);

  const update = useCallback((patch: Partial<GameSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  return [settings, update] as const;
}
