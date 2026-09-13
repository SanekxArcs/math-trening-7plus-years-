import { useCallback, useEffect, useRef } from "react";
import type { FactStat, Op, Difficulty } from "@/engine";
import type { AttemptRecord } from "@/game/useGame";
import { applyOutcome, loadFacts, persistFact } from "./facts";

/**
 * Owns the child's per-fact record for this device.
 *
 * The map is held in a ref and mutated in place rather than kept in state: the
 * question picker reads it synchronously at the moment it builds a question,
 * and a re-render between answering and the next question would be pure
 * overhead for something nothing renders.
 */
export function useFactStats() {
  const stats = useRef<Map<string, FactStat>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void loadFacts().then((loaded) => {
      if (cancelled) return;
      // Merge rather than replace: answers given while IndexedDB was still
      // being read must not be thrown away.
      for (const [id, stat] of loaded) {
        if (!stats.current.has(id)) stats.current.set(id, stat);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const getStats = useCallback(() => stats.current as ReadonlyMap<string, FactStat>, []);

  const recordFacts = useCallback((records: AttemptRecord[]) => {
    for (const record of records) {
      const { id, stat } = applyOutcome(
        stats.current,
        {
          op: record.op as Op,
          a: record.factA,
          b: record.factB,
          difficulty: record.difficulty as Difficulty,
        },
        {
          isCorrect: record.isCorrect,
          ms: record.ms,
          difficulty: record.difficulty as Difficulty,
          // A lifeline means they did not recall it unaided, which is what the
          // strength is meant to measure.
          aided: record.usedHalfHalf || record.usedVisualHint,
        },
        record.createdAt,
      );
      void persistFact(id, stat);
    }
  }, []);

  return { getStats, recordFacts };
}
