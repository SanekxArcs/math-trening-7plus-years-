import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleHelp, Eye, Flag, HeartCrack, Moon, Pause, Play, Settings2, Sun, Trophy } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  displayPoints,
  goalForLevel,
  hasNextLevel,
  activePet,
  isAsleep,
  petNeedingCare,
  payReward,
  putToSleep,
  sessionReward,
  coinsForLevel,
  settingsForLevel,
  shownMood,
  wakeUp,
  type Reward,
} from "@/engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { GameHud } from "./GameHud";
import { HalfHalfButton } from "./HalfHalfButton";
import { PowerButton } from "./PowerButton";
import { ProblemCard } from "./ProblemCard";
import { Numpad } from "./Numpad";
import { OptionGrid } from "./OptionGrid";
import { HintPanel, hasPictureHint } from "./HintPanel";
import { PairCodeBadge } from "./PairCodeBadge";
import { celebrateCombo, celebrateWin } from "./celebrate";
import { playSound } from "./sound";
import { useGame, type AttemptRecord, type StatsSource } from "./useGame";
import { useLocalSession } from "./useLocalSession";
import { useLocalLevel } from "./useLocalLevel";
import { BottomBar, dockIconClass } from "./BottomBar";
import { PetArt } from "@/pets/PetArt";
import { Onboarding, hasOnboarded, markOnboarded } from "@/onboarding/Onboarding";
import { CoinIcon } from "@/pets/CoinCount";
import {
  Backdrop,
  DialogTitle,
  GameDialog,
  SessionStats,
  ghostActionClass,
  primaryActionClass,
  secondaryActionClass,
} from "./GameDialog";
import { updateStable, useLiveStable, useStable } from "./useStable";
import type { GameSettings } from "@/engine";
import type { SyncStatus } from "@/sync/useSync";

const LOST_FROM = "math_master_lost_from";

function readLostFrom(): number | null {
  try {
    const value = Number(localStorage.getItem(LOST_FROM));
    return Number.isFinite(value) && value >= 1 ? value : null;
  } catch {
    return null;
  }
}

function writeLostFrom(level: number | null): void {
  try {
    if (level === null) localStorage.removeItem(LOST_FROM);
    else localStorage.setItem(LOST_FROM, String(level));
  } catch {
    /* private mode: the wording just falls back after a reload */
  }
}

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
  const [level, advanceLevel, resetLevel] = useLocalLevel();
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

  // The fanfare is for the moment of winning. A won board restored on a
  // reload, or on coming back from the pets, is already celebrated.
  const celebrated = useRef(state.won);
  useEffect(() => {
    if (!state.won) {
      celebrated.current = false;
      return;
    }
    if (celebrated.current) return;
    celebrated.current = true;
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
  /**
   * The level a lost game was played at, for the "back to level 1" message.
   * Kept in storage too: by the time a lost board is reloaded the level has
   * already been reset, so it could not be worked out again.
   */
  const [lostFrom, setLostFrom] = useState<number | null>(() => (state.lost ? readLostFrom() : null));
  /** Set when "finish for today" is what ended the session: the payout then puts the pets to bed too. */
  const bedtime = useRef(false);
  const wasFinished = useRef(state.phase === "finished");
  useEffect(() => {
    const finished = state.phase === "finished";
    if (finished === wasFinished.current) return;
    wasFinished.current = finished;
    if (!finished) {
      setReward(null);
      setLostFrom(null);
      writeLostFrom(null);
      return;
    }
    // Lost: the level goes with it, at once — waiting for a button would let
    // a reload, or just walking away, keep a level the rules took back. The
    // goal changing does not disturb the finished board: only a change to
    // the questions themselves starts a new round.
    if (state.lost) {
      setLostFrom(level);
      writeLostFrom(level);
      resetLevel();
    }
    const now = Date.now();
    const sleep = bedtime.current;
    bedtime.current = false;
    let paid: Reward | null = null;
    updateStable((current) => {
      paid = sessionReward(
        current,
        {
          won: state.won,
          goalEnabled: settings.goalEnabled,
          goal: settings.goalTarget,
          points: displayPoints(state.score),
          level,
        },
        now,
      );
      const next = paid ? payReward(current, paid, now) : current;
      return sleep ? putToSleep(next, now) : next;
    });
    setReward(paid);
  }, [state.phase, state.won, state.lost, state.score, settings.goalEnabled, settings.goalTarget, level, resetLevel]);

  /**
   * The end of the day: the session is closed (and paid, if it earned
   * anything) and the pets go to bed. After a level already won there is
   * nothing left to close, so it is straight to bed.
   */
  const finishToday = () => {
    if (state.phase === "finished") {
      updateStable((current) => putToSleep(current, Date.now()));
      return;
    }
    bedtime.current = true;
    game.stop();
  };

  // "Finish for today" pressed on the pets screen, which is where pause leads.
  // It is carried here so the one place that pays out and puts to bed stays
  // the only one. Cleared at once so a reload or a back-swipe cannot repeat it.
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if ((location.state as { finishToday?: boolean } | null)?.finishToday !== true) return;
    navigate(location.pathname, { replace: true, state: null });
    finishToday();
    // Once, on arrival: the request is consumed by the navigate above.
  }, []);

  /**
   * Morning: the first answer of a new day wakes the pets, with a little
   * "awake!" note so the child sees their maths did it.
   */
  const asleep = isAsleep(stable);
  const [wokeUp, setWokeUp] = useState<string | null>(null);
  // Keyed on each new answer rather than on the board: the answer that ended
  // the day is already "seen" when bedtime comes, so it never wakes the pets
  // it just put to bed — while a first answer that wins or loses the game
  // straight away still wakes them, and still gets its own dialog.
  const seenOutcome = useRef(outcome);
  useEffect(() => {
    if (!outcome || outcome === seenOutcome.current) return;
    seenOutcome.current = outcome;
    if (!asleep) return;
    updateStable(wakeUp);
    setWokeUp(shown?.name ?? null);
  }, [outcome, asleep, shown?.name]);
  useEffect(() => {
    if (wokeUp === null) return;
    const id = window.setTimeout(() => setWokeUp(null), 2800);
    return () => window.clearTimeout(id);
  }, [wokeUp]);

  /**
   * A pause for the tab going away outlives the tab coming back: the child
   * returns to the pause card and taps "keep playing" when they are ready,
   * instead of being dropped into a countdown they have not looked at yet.
   */
  useEffect(() => {
    if (state.pausedBy.includes("away")) game.pause();
  }, [state.pausedBy, game.pause]);

  /**
   * How to play: shown by itself the first time, and from the "?" in the dock
   * whenever the child wants it again. The clock stops while it is open — a
   * countdown running behind a picture book would be a trap.
   */
  const [touring, setTouring] = useState(() => !hasOnboarded());
  useEffect(() => {
    if (touring) game.pause();
  }, [touring, game.pause]);
  const endTour = useCallback(() => {
    markOnboarded();
    setTouring(false);
    game.resume();
  }, [game.resume]);

  const canShowHint = settings.visualHintEnabled && hasPictureHint(problem);
  const hintOpen = canShowHint && hintFor === state.questionId;
  const halfHalfOn = settings.halfHalfEnabled && state.question.mode === "choice";

  /**
   * Moving up a level. The level is banked first, then the board is cleared:
   * the restart is what resets the score, and the new settings arriving right
   * behind it only change the target being played to.
   */
  const startNextLevel = () => {
    advanceLevel();
    game.restart();
  };

  /**
   * Where the right answer was tapped, for its jump into the sum. Tied to the
   * question like the hint, so it can never replay on the next one.
   */
  const [flight, setFlight] = useState<{ questionId: number; from: DOMRect } | null>(null);
  const pick = (value: number, from: DOMRect) => {
    if (value === problem.answer) setFlight({ questionId: state.questionId, from });
    game.answer(value);
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
      <ProblemCard
        questionId={state.questionId}
        prompt={problem.prompt}
        answer={problem.answer}
        typed={state.question.mode === "type" ? state.typed : null}
        outcome={outcome}
        flyFrom={flight?.questionId === state.questionId ? flight.from : null}
      />

      <section>
        {state.question.mode === "type" ? (
          <Numpad
            value={state.typed}
            revealed={revealed}
            onDigit={game.typeDigit}
            onBackspace={game.backspace}
            onSubmit={game.submitTyped}
          />
        ) : (
          <OptionGrid
            questionId={state.questionId}
            options={state.question.options}
            answer={problem.answer}
            hidden={state.hidden}
            revealed={revealed}
            chosen={outcome?.given ?? null}
            onPick={pick}
          />
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

      {/* The morning note: the pets woke up because a sum was solved. */}
      <AnimatePresence>
        {wokeUp && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 20 }}
            className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center"
            role="status"
          >
            <span className="flex items-center gap-2 rounded-full border border-combo/40 bg-card/95 py-1.5 pl-1.5 pr-4 font-display font-black shadow-lg backdrop-blur">
              <span className="flex size-8 items-center justify-center rounded-full bg-linear-to-b from-combo to-[oklch(0.7_0.19_50)] text-combo-foreground">
                <Sun className="size-4" aria-hidden />
              </span>
              {t("petAwake", { name: wokeUp })}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paused by the tab going away — the deliberate pause is the pets
          screen. A child who comes back to the tablet is never dropped
          straight into a running countdown they have not looked at yet. */}
      <AnimatePresence>
        {state.paused && state.phase !== "finished" && !touring && (
          <Backdrop>
            <GameDialog hero={<Pause className="size-10" fill="currentColor" strokeWidth={0} aria-hidden />}>
              <DialogTitle>{t("paused")}</DialogTitle>
              <p className="mt-1.5 text-sm text-muted-foreground">{t("pausedBlurb")}</p>
              <SessionStats score={state.score} className="mt-5" />

              <button type="button" onClick={game.resume} className={cn(primaryActionClass, "mt-6")}>
                <Play className="size-5" fill="currentColor" aria-hidden />
                {t("keepPlaying")}
              </button>
              <Link to="/pets" className={cn(secondaryActionClass, "mt-3")}>
                <PetArt species={shown?.species ?? "horse"} className="size-7" />
                {t("visitHorse")}
              </Link>
              <button type="button" onClick={finishToday} className={cn(ghostActionClass, "mt-1")}>
                <Moon className="size-4" aria-hidden />
                {t("finishToday")}
              </button>
            </GameDialog>
          </Backdrop>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.phase === "finished" && (
          <Backdrop>
            {asleep ? (
              // Bedtime. The pet itself is the badge, fast asleep.
              <GameDialog
                tone="night"
                hero={
                  <PetArt
                    species={shown?.species ?? "horse"}
                    mood="asleep"
                    animated
                    className="size-20"
                  />
                }
              >
                <DialogTitle>
                  {shown ? t("goodNight", { name: shown.name }) : t("goodNightPlain")}
                </DialogTitle>
                {shown && (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {t("goodNightBlurb", { name: shown.name })}
                  </p>
                )}
                <SessionStats score={state.score} className="mt-5" />
                {reward && <RewardCard reward={reward} />}
                <button type="button" onClick={game.restart} className={cn(secondaryActionClass, "mt-6")}>
                  <Play className="size-5" aria-hidden />
                  {t("playMore")}
                </button>
              </GameDialog>
            ) : state.lost ? (
              // Lost. Said plainly, with the way back up right under it.
              <GameDialog tone="lost" hero={<HeartCrack className="size-11" aria-hidden />}>
                <DialogTitle>{t("lostTitle")}</DialogTitle>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {lostFrom !== null && lostFrom > 1
                    ? t("lostBlurb", { points: state.score.rawPoints })
                    : t("lostBlurbFirst", { points: state.score.rawPoints })}
                </p>
                <SessionStats score={state.score} className="mt-5" />
                <button type="button" onClick={game.restart} className={cn(primaryActionClass, "mt-6")}>
                  <Play className="size-5" fill="currentColor" aria-hidden />
                  {lostFrom !== null && lostFrom > 1 ? t("startOver") : t("playAgain")}
                </button>
                <Link to="/pets" className={cn(ghostActionClass, "mt-1")}>
                  <PetArt species={shown?.species ?? "horse"} className="size-7" />
                  {t("visitHorse")}
                </Link>
                {stable.pets.length > 0 && (
                  <button type="button" onClick={finishToday} className={ghostActionClass}>
                    <Moon className="size-4" aria-hidden />
                    {t("finishToday")}
                  </button>
                )}
              </GameDialog>
            ) : (
              <GameDialog
                tone={state.won ? "win" : "primary"}
                hero={
                  state.won ? (
                    <Trophy className="size-11" aria-hidden />
                  ) : (
                    <Flag className="size-10" aria-hidden />
                  )
                }
              >
                <DialogTitle className={cn(state.won && "text-correct")}>
                  {state.won
                    ? level > 1
                      ? t("levelCleared", { level })
                      : t("goalReached")
                    : t("sessionOver")}
                </DialogTitle>
                <SessionStats score={state.score} className="mt-5" />
                {reward && <RewardCard reward={reward} />}

                {/* The next level is offered only for a goal actually reached.
                    A child who stopped for lunch is not moved up, and neither is
                    one whose goal is already at the ceiling — a "next level" that
                    plays to the same target is a promise the game cannot keep. */}
                {state.won && canLevelUp ? (
                  <>
                    <button type="button" onClick={startNextLevel} className={cn(primaryActionClass, "mt-6 flex-col gap-0")}>
                      {t("nextLevel", { level: level + 1 })}
                      <span className="flex items-center gap-2 text-sm font-bold text-primary-foreground/80">
                        <span>{t("nextLevelGoal", { points: nextGoal })}</span>
                        {/* What the next level pays, so moving up has a visible prize. */}
                        <span
                          className="flex items-center gap-1 rounded-full bg-black/15 py-0.5 pl-0.5 pr-2 text-primary-foreground"
                          aria-label={`${coinsForLevel(nextGoal, level + 1)} ${t("coins", { coins: coinsForLevel(nextGoal, level + 1) })}`}
                        >
                          <CoinIcon className="size-4" />
                          <span aria-hidden>{coinsForLevel(nextGoal, level + 1)}</span>
                        </span>
                      </span>
                    </button>
                    <button type="button" onClick={game.restart} className={cn(secondaryActionClass, "mt-3")}>
                      {t("sameLevel", { level })}
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={game.restart} className={cn(primaryActionClass, "mt-6")}>
                    {t("playAgain")}
                  </button>
                )}

                <Link
                  to="/pets"
                  className={cn(ghostActionClass, "mt-1", needy && "animate-pulse text-foreground")}
                >
                  <PetArt species={needy?.species ?? shown?.species ?? "horse"} className="size-7" />
                  {needy ? t("horseNeedsYou", { name: needy.name }) : t("visitHorse")}
                </Link>
                {stable.pets.length > 0 && (
                  <button type="button" onClick={finishToday} className={ghostActionClass}>
                    <Moon className="size-4" aria-hidden />
                    {t("finishToday")}
                  </button>
                )}
              </GameDialog>
            )}
          </Backdrop>
        )}
      </AnimatePresence>

      <AnimatePresence>{touring && <Onboarding settings={settings} onDone={endTour} />}</AnimatePresence>

      <BottomBar className="grid-cols-[1fr_auto_auto_auto_1fr] gap-2 sm:gap-3">
        {/* The grown-up corners: small and quiet, one at each end, well away
            from the buttons a child is meant to use. */}
        <div className="flex items-center gap-0.5 justify-self-start rounded-full bg-muted/70 p-0.5">
          <button
            type="button"
            onClick={() => setTouring(true)}
            aria-label={t("howToPlay")}
            title={t("howToPlay")}
            className={dockIconClass}
          >
            <CircleHelp className="size-5" aria-hidden />
          </button>
          <Link to="/parent" aria-label={t("parentDashboard")} className={dockIconClass}>
            <Settings2 className="size-5" aria-hidden />
          </Link>
        </div>

        {/* The lifelines flank the centre button. A slot is kept even when one
            is switched off, so the centre stays dead centre; one that is on but
            not usable right now — no picture for this sum, 50:50 recharging —
            shows greyed. */}
        {halfHalfOn ? (
          <HalfHalfButton
            readyAt={state.halfHalfReadyAt}
            cooldownSec={settings.halfHalfCooldownSec}
            usedThisRound={state.usedHalfHalf}
            disabled={revealed}
            onUse={game.useHalfHalf}
          />
        ) : (
          <span className="size-12" aria-hidden />
        )}

        {/* Pause and the pets are one button: stepping away from the sums is
            going to see the pets. The pets screen holds the paused game — keep
            playing, or finish for today and put everyone to bed. The session
            is saved as it goes, so leaving the screen loses nothing.

            Raised out of the dock like a console's centre button, with the pet
            living in it and a pause badge to say what a tap does. One that
            needs care wiggles, and gets a dot — a nudge that needs no reading. */}
        <Link
          to="/pets"
          aria-label={t("pauseAndPets")}
          className="relative -my-5 flex size-18 items-center justify-center justify-self-center rounded-full border-b-4 border-black/15 bg-linear-to-b from-secondary to-accent shadow-[0_8px_18px_-6px_var(--primary)] ring-4 ring-card transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95 active:border-b-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <motion.span
            className="flex"
            animate={
              needy && !asleep
                ? { rotate: [0, -12, 12, -8, 0], y: 0 }
                : asleep || shown?.alive === false
                  ? { rotate: 0, y: 0 }
                  : { rotate: 0, y: [0, -3, 0] }
            }
            transition={
              needy && !asleep
                ? { duration: 0.7, repeat: Infinity, repeatDelay: 1.6 }
                : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
            }
          >
            {/* Keyed on the mood so waking up is a pop, not a quiet swap. */}
            <motion.span
              key={shown ? shownMood(stable, shown) : "none"}
              className="flex"
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 12 }}
            >
              <PetArt
                species={shown?.species ?? "horse"}
                mood={shown ? shownMood(stable, shown) : "ok"}
                className={cn("size-12", shown && !shown.alive && "grayscale")}
              />
            </motion.span>
          </motion.span>
          <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-[3px] border-card bg-primary text-primary-foreground shadow">
            <Pause className="size-3" fill="currentColor" strokeWidth={0} aria-hidden />
          </span>
          {needy && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-wrong opacity-75" />
              <span className="relative inline-flex size-4 rounded-full border-2 border-card bg-wrong" />
            </span>
          )}
        </Link>

        {settings.visualHintEnabled ? (
          <PowerButton
            icon={<Eye className="size-5" aria-hidden />}
            onClick={toggleHint}
            disabled={!canShowHint || revealed}
            active={hintOpen}
            aria-expanded={hintOpen}
            aria-label={hintOpen ? t("hideHint") : `${t("showHint")} (${t("hintCost")})`}
          />
        ) : (
          <span className="size-12" aria-hidden />
        )}

        <div className="justify-self-end">
          {pairCode && <PairCodeBadge pairCode={pairCode} />}
        </div>
      </BottomBar>
    </main>
  );
}

/** Coins earned, as a gold card that pops in after the numbers have counted up. */
function RewardCard({ reward }: { reward: Reward }) {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.7 }}
      className="mt-3 flex items-center gap-3 rounded-lg border border-combo/40 bg-linear-to-b from-combo/25 to-combo/10 px-4 py-3 text-left font-display font-black text-combo-foreground dark:text-combo"
    >
      <motion.span
        className="flex"
        initial={{ rotateY: 0 }}
        animate={{ rotateY: 720 }}
        transition={{ duration: 1.1, ease: "easeOut", delay: 0.7 }}
        style={{ transformPerspective: 200 }}
      >
        <CoinIcon className="size-10" />
      </motion.span>
      <div>
        <p className="text-2xl leading-tight">{t("coinsEarned", { coins: reward.coins })}</p>
        {reward.bonus > 0 && <p className="text-sm">{t("dailyBonus", { coins: reward.bonus })}</p>}
      </div>
    </motion.div>
  );
}
