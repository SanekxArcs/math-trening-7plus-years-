import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { NEW_STABLE, SPECIES, isSpecies, tickAll, type Pet, type Species, type Stable } from "@/engine";

const KEY = "math_master_stable";

function isNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Reads one pet back. The species falls back to a horse because the first
 * version stored a lone `horse` with no species at all.
 */
function toPet(raw: unknown): Pet | null {
  if (typeof raw !== "object" || raw === null) return null;
  const source = raw as Record<string, unknown>;
  const stats = [source.food, source.clean, source.happy, source.health, source.updatedAt];
  if (!stats.every(isNum)) return null;
  const species: Species = isSpecies(source.species) ? source.species : "horse";
  return {
    id: species,
    species,
    name: typeof source.name === "string" && source.name.trim() ? source.name : SPECIES[species].emoji,
    food: source.food as number,
    clean: source.clean as number,
    happy: source.happy as number,
    health: source.health as number,
    alive: source.alive !== false,
    updatedAt: source.updatedAt as number,
    diedAt: isNum(source.diedAt) ? source.diedAt : null,
    vacation: source.vacation === true,
    lastPettedAt: isNum(source.lastPettedAt) ? source.lastPettedAt : 0,
  };
}

/** One of each kind, whatever a damaged save says. */
function toPets(raw: unknown): Pet[] {
  const list = Array.isArray(raw) ? raw : [];
  const pets: Pet[] = [];
  for (const entry of list) {
    const pet = toPet(entry);
    if (pet && !pets.some((each) => each.id === pet.id)) pets.push(pet);
  }
  return pets;
}

/**
 * Coins are what the child worked for, so a damaged save keeps them even when
 * the pets inside it cannot be read back.
 */
export function parseStable(raw: string | null): Stable {
  if (!raw) return NEW_STABLE;
  try {
    const source = JSON.parse(raw) as Record<string, unknown>;
    const pets = toPets(source.pets ?? (source.horse ? [source.horse] : []));
    const activeId = isSpecies(source.activeId) && pets.some((pet) => pet.id === source.activeId)
      ? source.activeId
      : (pets[0]?.id ?? null);
    return {
      coins: isNum(source.coins) ? Math.max(0, Math.floor(source.coins)) : NEW_STABLE.coins,
      lastBonusDay: typeof source.lastBonusDay === "string" ? source.lastBonusDay : null,
      pets,
      activeId,
      savedAt: isNum(source.savedAt) ? source.savedAt : 0,
      asleepSince: isNum(source.asleepSince) ? source.asleepSince : null,
    };
  } catch {
    return NEW_STABLE;
  }
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * The raw string is the cache key. Reading storage on every snapshot keeps
 * this honest when something else writes to it — another tab, or a test
 * clearing it — and parsing only when the string changed keeps the snapshot
 * identity-stable, which useSyncExternalStore requires.
 */
let cachedRaw: string | null | undefined;
let cached: Stable = NEW_STABLE;
/** Held in memory too, for the tablet in private mode where writes throw. */
let fallback: Stable | null = null;

function getSnapshot(): Stable {
  const raw = readRaw();
  if (fallback) return fallback;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseStable(raw);
  }
  return cached;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: Stable): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    fallback = null;
  } catch {
    fallback = next;
  }
  for (const listener of listeners) listener();
}

/**
 * The one way the child changes the stable: a pure step from the engine,
 * stamped with the moment it happened and written through.
 */
export function updateStable(step: (stable: Stable) => Stable): void {
  const current = getSnapshot();
  const next = step(current);
  if (next === current) return;
  // Strictly after the last stamp, so a change is always newer than what it
  // changed even on a clock that has not ticked, or was wound back.
  write({ ...next, savedAt: Math.max(Date.now(), current.savedAt + 1) });
}

/**
 * Stamps the device's copy as changed now, for a change kept outside the
 * stable — the level — so the backup takes this device's copy as the newest.
 *
 * Never on a device that has not changed anything yet: stamping an empty,
 * freshly linked stable would make it look newer than the real backup and
 * send it over the top of the child's pets.
 */
export function touchStable(): void {
  const current = getSnapshot();
  if (current.savedAt === 0) return;
  write({ ...current, savedAt: Math.max(Date.now(), current.savedAt + 1) });
}

/** Swaps in a copy from the backup, keeping its stamp so it is not sent back. */
export function restoreStable(stable: Stable): void {
  write(stable);
}

export function readStable(): Stable {
  return getSnapshot();
}

export function useStable(): Stable {
  return useSyncExternalStore(subscribe, getSnapshot, () => NEW_STABLE);
}

/**
 * The pets as they are right now, not as they were saved.
 *
 * Decay is worked out from timestamps rather than stored, so this re-reads
 * the clock every half minute to keep the bars moving on an open screen.
 * Nothing is written back — the next action settles up for real.
 */
export function useLiveStable(stable: Stable): Stable {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  // A fresh action writes an `updatedAt` past the last clock read; take
  // whichever is later so the bars never jump back half a minute.
  const latest = Math.max(now, ...stable.pets.map((pet) => pet.updatedAt));
  return useMemo(() => tickAll(stable, latest), [stable, latest]);
}
