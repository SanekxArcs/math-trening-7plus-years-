import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, Flag, Pause, Play, Settings2, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import {
  displayPoints,
  goalForLevel,
  hasNextLevel,
  activePet,
  petNeedingCare,
  payReward,
  sessionReward,
  settingsForLevel,
  type Reward,
} from "@/engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { GameHud } from "./GameHud";
import { HalfHalfButton } from "./HalfHalfButton";
import { Numpad } from "./Numpad";
import { OptionGrid } from "./OptionGrid";
import { HintPanel, hasPictureHint } from "./HintPanel";
import { PairCodeBadge } from "./PairCodeBadge";
import { celebrateCombo, celebrateWin } from "./celebrate";
import { playSound } from "./sound";
import { useGame, type AttemptRecord, type StatsSource } from "./useGame";
import { useLocalSession } from "./useLocalSession";
import { useLocalLevel } from "./useLocalLevel";
import { BottomBar } from "./BottomBar";
import { PetArt } from "@/pets/PetArt";
import { updateStable, useLiveStable, useStable } from "./useStable";
import type { GameSettings } from "@/engine";
import type { SyncStatus } from "@/sync/useSync";

export interface GameScreenProps {
  settings: GameSettings;
  /** Where finished attempts go. The outbox in the real app, a spy in tests. */
  onRecord?: (records: AttemptRecord[]) => void;
  syncStatus?: SyncStatus | null;
  /** What the child already knows, for adaptive question selection. */
  getStats?: StatsSource;
  /** Shown in a floating badge so a parent can read it without signing in. */
  pairCode?: string | undefined;
}

/**
 * Pure play surface: it is handed its settings and a sink for attempts, and
 * knows nothing about Dexie, Convex or whether a backend exists at all. That is
 * what lets the same component run local-only, synced, and under test.
 */
export function GameScreen({
  settings: baseSettings,
  onRecord,
  syncStatus,
  getStats,
  pairCode,
}: GameScreenProps) {
  const { t } = useI18n();
  /**
   * The question the hint was opened on, not a plain open flag. A flag outlived
   * the question: answer with the picture showing and the next problem arrived
   * with its hint already open — free help the child never asked for. Tying it
   * to the question id closes it on every new question with no effect to run.
   */
  const [hintFor, setHintFor] = useState<number | null>(null);

  /**
   * The child's level, laid over the parent's settings.
   *
   * Memoised, not computed inline: the game reads a new settings object as a
   * settings change and starts a fresh round, so an object rebuilt on every
   * render would restart the question forever.
   */
  const [level, advanceLevel] = useLocalLevel();
  const settings = useMemo(
    () => settingsForLevel(baseSettings, level),
    [baseSettings, level],
  );

  const onAttempt = useCallback(
    (records: AttemptRecord[]) => onRecord?.(records),
    [onRecord],
  );

  // Points survive a reload. A refresh — a stray swipe, a sleeping tablet, the
  // browser reclaiming the tab — used to drop the child back to zero mid-run,
  // and there is no explaining that to a seven-year-old.
  const [resume, saveSession] = useLocalSession();

  const canLevelUp = hasNextLevel(baseSettings, level);
  const nextGoal = goalForLevel(baseSettings.goalTarget, level + 1);

  const game = useGame({
    settings,
    onAttempt,
    resume,
    onSessionChange: saveSession,
    ...(getStats ? { getStats } : {}),
  });
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

  /**
   * Paying out, once per finished session.
   *
   * Keyed on the moment the session *becomes* finished, not on it being
   * finished: a reload of the summary screen restores a finished session, and
   * paying it again there would make refreshing a coin machine.
   */
  const stable = useLiveStable(useStable());
  const shown = activePet(stable);
  /** The pet the nudges are about: whoever needs care, else whoever is on screen. */
  const needy = petNeedingCare(stable);
  const [reward, setReward] = useState<Reward | null>(null);
  const wasFinished = useRef(state.phase === "finished");
  useEffect(() => {
    const finished = state.phase === "finished";
    if (finished === wasFinished.current) return;
    wasFinished.current = finished;
    if (!finished) {
      setReward(null);
      return;
    }
    const now = Date.now();
    let paid: Reward | null = null;
    updateStable((current) => {
      paid = sessionReward(
        current,
        {
          won: state.won,
          goalEnabled: settings.goalEnabled,
          goal: settings.goalTarget,
          points: displayPoints(state.score),
        },
        now,
      );
      return paid ? payReward(current, paid, now) : current;
    });
    setReward(paid);
  }, [state.phase, state.won, state.score, settings.goalEnabled, settings.goalTarget]);

  const canShowHint = settings.visualHintEnabled && hasPictureHint(problem);
  const hintOpen = canShowHint && hintFor === state.questionId;

  /**
   * Moving up a level. The level is banked first, then the board is cleared:
   * the restart is what resets the score, and the new settings arriving right
   * behind it only change the target being played to.
   */
  const startNextLevel = () => {
    advanceLevel();
    game.restart();
  };

  const toggleHint = () => {
    if (hintOpen) {
      setHintFor(null);
      return;
    }
    setHintFor(state.questionId);
    game.useVisualHint();
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-4 pb-28 pt-5">
      <GameHud
        score={state.score}
        level={level}
        coins={stable.coins}
        syncStatus={syncStatus}
        goal={settings.goalEnabled ? settings.goalTarget : null}
        timer={
          settings.timerEnabled
            ? {
                askedAt: state.askedAt,
                seconds: settings.timerSec,
                running: state.phase === "asking" && !state.paused,
              }
            : null
        }
      />

      {/* The play area takes the leftover height and centres in it, so the
          question sits under the child's eyeline on a tall tablet instead of
          riding at the top with dead space below. */}
      <div className="flex flex-1 flex-col justify-center gap-6">
      <section className="flex flex-col items-center justify-center py-4">
        {/* Deliberately not wrapped in AnimatePresence.
            With `mode="wait"` the outgoing question stayed on screen until its
            exit animation finished, while the answer tiles — which are not in
            an AnimatePresence — had already swapped to the next question. For a
            few hundred milliseconds the child saw the previous question above
            the next question's answers. Keying the heading makes it remount in
            the same frame as the tiles, so the two can never disagree. */}
        <motion.h1
          key={state.questionId}
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="font-display text-6xl font-black tabular-nums tracking-tight sm:text-7xl"
        >
          {problem.prompt}
        </motion.h1>

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
            onClick={toggleHint}
            aria-expanded={hintOpen}
            className={cn(
              "flex items-center gap-2 rounded-full px-5 py-3 font-display font-bold shadow-md transition-colors focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none",
              hintOpen
                ? "bg-primary/10 text-primary"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Eye className="size-5" aria-hidden />
            {hintOpen ? t("hideHint") : t("showHint")}
            {!hintOpen && (
              <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-xs font-bold">
                {t("hintCost")}
              </span>
            )}
          </button>
        )}
      </section>

      <AnimatePresence>
        {hintOpen && (
          <motion.section
            key={state.questionId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {/* Keyed per question: a new problem gets a fresh panel rather than
                inheriting a half-finished count from the previous one. */}
            <HintPanel problem={problem} onClose={() => setHintFor(null)} />
          </motion.section>
        )}
      </AnimatePresence>

      </div>

      {/* Paused. Shown for a deliberate tap and for the tab going away alike,
          so a child who comes back to the tablet is never dropped straight
          into a running countdown they have not looked at yet. */}
      <AnimatePresence>
        {state.paused && state.phase !== "finished" && (
          <Backdrop>
            <Dialog>
              <Pause className="mx-auto size-14 text-primary" aria-hidden />
              <h2 className="mt-4 font-display text-3xl font-black">{t("paused")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("pausedBlurb")}</p>
              <p className="mt-4 font-display text-lg font-black tabular-nums">
                {t("finishSummary", {
                  points: displayPoints(state.score),
                  correct: state.score.correct,
                  streak: state.score.bestStreak,
                })}
              </p>

              <button
                type="button"
                onClick={game.resume}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-[--radius-lg] border-b-8 border-primary/60 bg-primary py-5 font-display text-xl font-black text-primary-foreground shadow-xl focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Play className="size-5" aria-hidden />
                {t("keepPlaying")}
              </button>
              <button
                type="button"
                onClick={game.stop}
                className="mt-3 w-full rounded-[--radius-lg] py-3 font-display font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
              >
                {t("finishSession")}
              </button>
            </Dialog>
          </Backdrop>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.phase === "finished" && (
          <Backdrop>
            <Dialog>
              {state.won ? (
                <Trophy className="mx-auto size-16 text-combo" aria-hidden />
              ) : (
                <Flag className="mx-auto size-16 text-primary" aria-hidden />
              )}
              <h2
                className={cn(
                  "mt-4 font-display text-3xl font-black",
                  state.won ? "text-correct" : "text-foreground",
                )}
              >
                {state.won
                  ? level > 1
                    ? t("levelCleared", { level })
                    : t("goalReached")
                  : t("sessionOver")}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {t("finishSummary", {
                  points: displayPoints(state.score),
                  correct: state.score.correct,
                  streak: state.score.bestStreak,
                })}
              </p>

              {reward && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.3 }}
                  className="mt-4 rounded-[--radius-lg] bg-combo/20 px-4 py-3 font-display font-black text-combo-foreground"
                >
                  <p className="text-2xl">🪙 {t("coinsEarned", { coins: reward.coins })}</p>
                  {reward.bonus > 0 && (
                    <p className="text-sm">{t("dailyBonus", { coins: reward.bonus })}</p>
                  )}
                </motion.div>
              )}

              <Link
                to="/pets"
                className={cn(
                  "mt-3 flex items-center justify-center gap-2 rounded-[--radius-lg] bg-secondary py-3 font-display font-bold text-secondary-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none",
                  needy && "animate-pulse",
                )}
              >
                <PetArt species={needy?.species ?? shown?.species ?? "horse"} className="size-7" />
                {needy ? t("horseNeedsYou", { name: needy.name }) : t("visitHorse")}
              </Link>

              {/* The next level is offered only for a goal actually reached.
                  A child who stopped for lunch is not moved up, and neither is
                  one whose goal is already at the ceiling — a "next level" that
                  plays to the same target is a promise the game cannot keep. */}
              {state.won && canLevelUp ? (
                <>
                  <button
                    type="button"
                    onClick={startNextLevel}
                    className="mt-8 w-full rounded-[--radius-lg] border-b-8 border-primary/60 bg-primary py-5 font-display text-xl font-black text-primary-foreground shadow-xl focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {t("nextLevel", { level: level + 1 })}
                    <span className="mt-1 block text-sm font-bold text-primary-foreground/80">
                      {t("nextLevelGoal", { points: nextGoal })}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={game.restart}
                    className="mt-3 w-full rounded-[--radius-lg] py-3 font-display font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {t("sameLevel", { level })}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={game.restart}
                  className="mt-8 w-full rounded-[--radius-lg] border-b-8 border-primary/60 bg-primary py-5 font-display text-xl font-black text-primary-foreground shadow-xl focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {t("playAgain")}
                </button>
              )}
            </Dialog>
          </Backdrop>
        )}
      </AnimatePresence>

      <BottomBar>
        <div className="flex items-center gap-2 justify-self-start">
          <Link
            to="/parent"
            aria-label={t("parentDashboard")}
            className="rounded-full p-2.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Settings2 className="size-5" aria-hidden />
          </Link>
          {pairCode && <PairCodeBadge pairCode={pairCode} />}
        </div>

        {/* Down here, but in its own bar below the lifelines rather than among
            the tiles, so it is easy to reach and hard to hit by accident. And
            a stray tap only pauses — nothing is lost. */}
        <button
          type="button"
          onClick={game.pause}
          aria-label={t("pauseGame")}
          className="flex size-14 items-center justify-center justify-self-center rounded-full bg-secondary text-secondary-foreground shadow-md transition-colors hover:bg-accent focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Pause className="size-6" aria-hidden />
        </button>

        <Link
          to="/pets"
          aria-label={t("openStable", { coins: stable.coins })}
          className="relative flex items-center gap-2 justify-self-end rounded-full bg-primary py-2 pl-3 pr-5 font-display text-lg font-black text-primary-foreground shadow-md focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
        >
          <PetArt
            species={shown?.species ?? "horse"}
            className={cn("-my-1 size-10", shown && !shown.alive && "grayscale")}
          />
          {t("pets")}
          {/* A dot rather than words: it has to read at a glance, mid-game,
              without pulling attention off the question. */}
          {needy && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-wrong opacity-75" />
              <span className="relative inline-flex size-4 rounded-full border-2 border-card bg-wrong" />
            </span>
          )}
        </Link>
      </BottomBar>
    </main>
  );
}

/** Shared chrome for the two full-screen dialogs, so they cannot drift apart. */
function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-6 backdrop-blur-sm"
    >
      {children}
    </motion.div>
  );
}

function Dialog({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ scale: 0.85, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="w-full max-w-sm rounded-[--radius-xl] bg-card p-8 text-center shadow-2xl"
      role="dialog"
      aria-modal="true"
    >
      {children}
    </motion.div>
  );
}
