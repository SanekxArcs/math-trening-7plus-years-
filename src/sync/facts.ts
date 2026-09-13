import { EMPTY_FACT, factId, updateFact, type FactOutcome, type FactStat } from "@/engine";
import { db } from "./db";

/**
 * The child's per-fact record, held locally.
 *
 * This has to work offline and it has to be readable *synchronously* when the
 * next question is chosen, so it lives in memory and is mirrored to IndexedDB
 * rather than being read from it per question.
 */
export interface StoredFact extends FactStat {
  id: string;
}

export async function loadFacts(): Promise<Map<string, FactStat>> {
  try {
    const rows = await db.facts.toArray();
    return new Map(rows.map(({ id, ...stat }) => [id, stat]));
  } catch {
    // A blocked IndexedDB means adaptive practice quietly degrades to a random
    // draw, which is a worse lesson plan but a perfectly playable game.
    return new Map();
  }
}

export async function persistFact(id: string, stat: FactStat): Promise<void> {
  try {
    await db.facts.put({ id, ...stat });
  } catch {
    /* see above */
  }
}

/** Folds one answer into the map in place and returns the row to persist. */
export function applyOutcome(
  stats: Map<string, FactStat>,
  key: { op: string; a: number; b: number; difficulty: string },
  outcome: FactOutcome,
  now: number,
): { id: string; stat: FactStat } {
  const id = factId(
    key.op as Parameters<typeof factId>[0],
    key.a,
    key.b,
    key.difficulty as Parameters<typeof factId>[3],
  );
  const stat = updateFact(stats.get(id) ?? EMPTY_FACT, outcome, now);
  stats.set(id, stat);
  return { id, stat };
}
