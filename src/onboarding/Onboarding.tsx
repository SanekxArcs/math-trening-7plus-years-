import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Eye, KeyRound, Play, Scissors, Settings2, X } from "lucide-react";
import type { GameSettings } from "@/engine";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/i18n/translations";
import { useI18n } from "@/i18n/useI18n";
import { primaryActionClass } from "@/game/GameDialog";
import {
  AnswerScene,
  BedtimeScene,
  ComboScene,
  GrownUpsScene,
  HelpersScene,
  LevelsScene,
  MistakesScene,
  PetsScene,
  PointsScene,
  ReadyScene,
  TimerScene,
  WelcomeScene,
} from "./scenes";

const KEY = "math_master_onboarded";
/** Bumped when the walkthrough gains something every child should see again. */
const VERSION = "1";

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === VERSION;
  } catch {
    return true; // storage refused: better no tour than one on every load
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(KEY, VERSION);
  } catch {
    /* private mode — it will just show again next time */
  }
}

interface Step {
  id: string;
  title: TranslationKey;
  body: TranslationKey;
  scene: React.ReactNode;
  /** Icon-and-sentence rows under the text, for slides that name several things. */
  points?: { icon: typeof Eye; text: TranslationKey }[];
}

/**
 * The walkthrough for the game as this child's parent has set it up: no
 * timer slide when there is no timer, no talk of losing a level when there is
 * no goal, and only the helpers that are switched on.
 */
export function buildSteps(settings: GameSettings): Step[] {
  const steps: Step[] = [
    { id: "welcome", title: "onbWelcomeTitle", body: "onbWelcomeBody", scene: <WelcomeScene /> },
    {
      id: "answer",
      title: "onbAnswerTitle",
      body: settings.difficulty === "expert" ? "onbAnswerBodyTyped" : "onbAnswerBody",
      scene: <AnswerScene />,
    },
  ];
  if (settings.goalEnabled) {
    steps.push({ id: "points", title: "onbPointsTitle", body: "onbPointsBody", scene: <PointsScene /> });
  }
  steps.push({ id: "combo", title: "onbComboTitle", body: "onbComboBody", scene: <ComboScene /> });
  steps.push({
    id: "mistakes",
    title: "onbMistakesTitle",
    body: settings.goalEnabled ? "onbMistakesBody" : "onbMistakesBodyNoGoal",
    scene: <MistakesScene />,
  });
  if (settings.timerEnabled) {
    steps.push({ id: "timer", title: "onbTimerTitle", body: "onbTimerBody", scene: <TimerScene /> });
  }
  const halfHalf = settings.halfHalfEnabled && settings.difficulty !== "expert";
  if (halfHalf || settings.visualHintEnabled) {
    steps.push({
      id: "helpers",
      title: "onbHelpersTitle",
      body: "onbHelpersBody",
      scene: <HelpersScene halfHalf={halfHalf} hint={settings.visualHintEnabled} />,
      points: [
        ...(halfHalf ? [{ icon: Scissors, text: "onbHelperHalf" as const }] : []),
        ...(settings.visualHintEnabled ? [{ icon: Eye, text: "onbHelperHint" as const }] : []),
      ],
    });
  }
  steps.push({
    id: "levels",
    title: settings.goalEnabled ? "onbLevelsTitle" : "onbCoinsTitle",
    body: settings.goalEnabled ? "onbLevelsBody" : "onbCoinsBody",
    scene: <LevelsScene />,
  });
  steps.push({ id: "pets", title: "onbPetsTitle", body: "onbPetsBody", scene: <PetsScene /> });
  steps.push({ id: "bedtime", title: "onbBedtimeTitle", body: "onbBedtimeBody", scene: <BedtimeScene /> });
  steps.push({
    id: "grownups",
    title: "onbGrownUpsTitle",
    body: "onbGrownUpsBody",
    scene: <GrownUpsScene />,
    points: [
      { icon: Settings2, text: "onbGrownUpsSettings" },
      { icon: KeyRound, text: "onbGrownUpsKey" },
    ],
  });
  steps.push({ id: "ready", title: "onbReadyTitle", body: "onbReadyBody", scene: <ReadyScene /> });
  return steps;
}

/**
 * How to play, one idea per slide, each with a moving picture of the real
 * thing. Swipe, the arrows, or the keyboard move through it; it can be
 * skipped at any point and replayed from the "?" in the dock.
 */
export function Onboarding({ settings, onDone }: { settings: GameSettings; onDone: () => void }) {
  const { t } = useI18n();
  const steps = buildSteps(settings);
  const [[index, direction], setPage] = useState<[number, number]>([0, 0]);
  const step = steps[index] as Step;
  const last = index === steps.length - 1;

  const go = useCallback(
    (by: number) => {
      setPage(([current]) => {
        const next = Math.max(0, Math.min(steps.length - 1, current + by));
        return [next, by];
      });
    },
    [steps.length],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onDone]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-foreground/50 p-4 backdrop-blur-sm"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t("howToPlay")}
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="relative my-auto w-full max-w-md overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xl"
      >
        <button
          type="button"
          onClick={onDone}
          className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-card/80 px-3 py-1.5 text-xs font-bold text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
        >
          {t("onbSkip")}
          <X className="size-3.5" aria-hidden />
        </button>

        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={step.id}
            custom={direction}
            variants={{
              enter: (dir: number) => ({ x: dir >= 0 ? 80 : -80, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (dir: number) => ({ x: dir >= 0 ? -80 : 80, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            // Swipe to move on, as with any picture book on a tablet.
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(1);
              else if (info.offset.x > 60) go(-1);
            }}
          >
            <div className="flex h-52 items-center justify-center bg-linear-to-b from-secondary via-secondary/60 to-card px-6 pt-6">
              {step.scene}
            </div>
            <div className="px-6 pb-2 pt-4 text-center">
              <h2 className="font-display text-2xl font-black leading-tight">{t(step.title)}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t(step.body)}</p>
              {step.points && (
                <ul className="mt-3 space-y-2 text-left">
                  {step.points.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-2.5 rounded-lg bg-muted/50 p-2.5 text-sm">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span>{t(text)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="space-y-4 px-6 pb-6 pt-3">
          {/* Progress: which slide this is, and how many are left. */}
          <div className="flex justify-center gap-1.5" role="group" aria-label={t("onbStepOf", { step: index + 1, total: steps.length })}>
            {steps.map((each, i) => (
              <button
                key={each.id}
                type="button"
                onClick={() => setPage([i, i - index])}
                aria-label={t("onbStepOf", { step: i + 1, total: steps.length })}
                aria-current={i === index ? "step" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-primary" : i < index ? "w-2 bg-primary/40" : "w-2 bg-muted",
                )}
              />
            ))}
          </div>

          <div className="flex gap-2.5">
            {index > 0 && (
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={t("onbBack")}
                className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border/70 border-b-4 border-b-black/10 bg-secondary text-secondary-foreground transition-[translate] active:translate-y-0.5"
              >
                <ArrowLeft className="size-5" aria-hidden />
              </button>
            )}
            <button type="button" onClick={last ? onDone : () => go(1)} className={cn(primaryActionClass, "py-3.5")}>
              {last ? (
                <>
                  <Play className="size-5" fill="currentColor" aria-hidden />
                  {t("onbStart")}
                </>
              ) : (
                <>
                  {t("onbNext")}
                  <ArrowRight className="size-5" aria-hidden />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
