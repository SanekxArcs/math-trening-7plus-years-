import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, Settings2, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { displayPoints } from "@/engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { ComboMeter } from "./ComboMeter";
import { HalfHalfButton } from "./HalfHalfButton";
import { Numpad } from "./Numpad";
import { OptionGrid } from "./OptionGrid";
import { TimerBar } from "./TimerBar";
import { HintPanel } from "./HintPanel";
import { celebrateCombo, celebrateWin } from "./celebrate";
import { playSound } from "./sound";
import { useGame, type AttemptRecord } from "./useGame";
import { SyncBadge } from "./SyncBadge";
import type { GameSettings } from "@/engine";
import type { SyncStatus } from "@/sync/useSync";

export interface GameScreenProps {
  settings: GameSettings;
  /** Where finished attempts go. The outbox in the real app, a spy in tests. */
  onRecord?: (records: AttemptRecord[]) => void;
  syncStatus?: SyncStatus | null;
}

/**
 * Pure play surface: it is handed its settings and a sink for attempts, and
 * knows nothing about Dexie, Convex or whether a backend exists at all. That is
 * what lets the same component run local-only, synced, and under test.
 */
export function GameScreen({ settings, onRecord, syncStatus }: GameScreenProps) {
  const { t } = useI18n();
  const [hintOpen, setHintOpen] = useState(false);

  const onAttempt = useCallback(
    (records: AttemptRecord[]) => onRecord?.(records),
    [onRecord],
  );

  const game = useGame({ settings, onAttempt });
  const { state } = game;
  const { problem } = state.question;
  const revealed = state.phase !== "asking";
  const outcome = state.outcome;

  // Feedback effects live here, fired once per settled question. Keying on
  // questionId means a re-render can never replay a sound or a confetti burst.
  useEffect(() => {
    if (!outcome) return;
    if (outcome.isCorrect) {
      playSound(outcome.tierUp ? "comboUp" : "correct", settings.soundEnabled);
      if (outcome.tierUp) celebrateCombo();
    } else {
      playSound("wrong", settings.soundEnabled);
    }
  }, [state.questionId, outcome, settings.soundEnabled]);

  useEffect(() => {
    if (!state.won) return;
    playSound("win", settings.soundEnabled);
    celebrateWin();
  }, [state.won, settings.soundEnabled]);

  // Any open dialog freezes the countdown.
  const { setPaused } = game;
  useEffect(() => {
    setPaused(state.won);
  }, [state.won, setPaused]);

  const goalFraction = useMemo(() => {
    if (!settings.goalEnabled) return 0;
    return Math.min(1, displayPoints(state.score) / settings.goalTarget);
  }, [state.score, settings.goalEnabled, settings.goalTarget]);

  const canShowHint = settings.visualHintEnabled && problem.hint !== null;

  const openHint = () => {
    setHintOpen((open) => !open);
    if (!hintOpen) game.useVisualHint();
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-4 py-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <motion.span
            key={displayPoints(state.score)}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            className="font-display text-4xl font-black tabular-nums text-primary"
          >
            {displayPoints(state.score)}
          </motion.span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("points")}
          </span>
        </div>

        <ComboMeter score={state.score} />

        {syncStatus && <SyncBadge status={syncStatus} />}

        <Link
          to="/parent"
          aria-label={t("parentDashboard")}
          className="rounded-full bg-card p-2.5 text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Settings2 className="size-5" aria-hidden />
        </Link>
      </header>

      {settings.goalEnabled && (
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-correct"
            animate={{ width: `${goalFraction * 100}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 24 }}
          />
        </div>
      )}

      {settings.timerEnabled && (
        <TimerBar
          askedAt={state.askedAt}
          seconds={settings.timerSec}
          running={state.phase === "asking" && !state.paused}
        />
      )}

      {/* The play area takes the leftover height and centres in it, so the
          question sits under the child's eyeline on a tall tablet instead of
          riding at the top with dead space below. */}
      <div className="flex flex-1 flex-col justify-center gap-6">
      <section className="flex flex-col items-center justify-center py-4">
        <AnimatePresence mode="wait">
          <motion.h1
            key={state.questionId}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="font-display text-6xl font-black tabular-nums tracking-tight sm:text-7xl"
          >
            {problem.prompt}
          </motion.h1>
        </AnimatePresence>

        <div className="h-9 pt-2">
          <AnimatePresence>
            {outcome && (
              <motion.p
                key={`${state.questionId}-fb`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "font-display text-xl font-black tabular-nums",
                  outcome.isCorrect ? "text-correct" : "text-wrong",
                )}
              >
                {outcome.timedOut
                  ? t("timeUp")
                  : outcome.isCorrect
                    ? `+${outcome.delta}${outcome.multiplier > 1 ? ` ×${outcome.multiplier}!` : ""}`
                    : `${outcome.delta}`}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section>
        {state.question.mode === "type" ? (
          <Numpad
            value={state.typed}
            revealed={revealed}
            correct={outcome?.isCorrect ?? false}
            onDigit={game.typeDigit}
            onBackspace={game.backspace}
            onSubmit={game.submitTyped}
          />
        ) : (
          <OptionGrid
            options={state.question.options}
            answer={problem.answer}
            hidden={state.hidden}
            revealed={revealed}
            chosen={outcome?.given ?? null}
            onPick={game.answer}
          />
        )}
      </section>

      <section className="flex flex-wrap items-center justify-center gap-3">
        {settings.halfHalfEnabled && state.question.mode === "choice" && (
          <HalfHalfButton
            readyAt={state.halfHalfReadyAt}
            cooldownSec={settings.halfHalfCooldownSec}
            usedThisRound={state.usedHalfHalf}
            disabled={revealed}
            onUse={game.useHalfHalf}
          />
        )}

        {canShowHint && (
          <button
            type="button"
            onClick={openHint}
            className="flex items-center gap-2 rounded-full bg-card px-5 py-3 font-display font-bold text-muted-foreground shadow-md transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Eye className="size-5" aria-hidden />
            {hintOpen ? t("hideHint") : t("showHint")}
          </button>
        )}
      </section>

      <AnimatePresence>
        {hintOpen && problem.hint && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-[--radius-lg] bg-muted/40 p-4"
          >
            {/* Keyed per question: a new problem gets a fresh panel rather than
                inheriting a half-finished count from the previous one. */}
            <HintPanel key={state.questionId} hint={problem.hint} answer={problem.answer} />
          </motion.section>
        )}
      </AnimatePresence>

      </div>

      <AnimatePresence>
        {state.won && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-full max-w-sm rounded-[--radius-xl] bg-card p-8 text-center shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <Trophy className="mx-auto size-16 text-combo" aria-hidden />
              <h2 className="mt-4 font-display text-3xl font-black text-correct">
                {t("goalReached")}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {t("finishSummary", {
                  points: displayPoints(state.score),
                  correct: state.score.correct,
                  streak: state.score.bestStreak,
                })}
              </p>
              <button
                type="button"
                onClick={game.restart}
                className="mt-8 w-full rounded-[--radius-lg] border-b-8 border-primary/60 bg-primary py-5 font-display text-xl font-black text-primary-foreground shadow-xl focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
              >
                {t("playAgain")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
