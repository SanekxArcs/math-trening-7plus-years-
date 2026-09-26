import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  CircleUserRound,
  Clock,
  Flame,
  Gamepad2,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  SlidersHorizontal,
  Star,
  Table2,
} from "lucide-react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { api } from "@convex/_generated/api";
import { DEFAULT_SETTINGS, type GameSettings } from "@/engine";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/i18n/translations";
import { useI18n } from "@/i18n/useI18n";
import { CoinIcon } from "@/pets/CoinCount";
import { Backdrop, GameDialog, ghostActionClass } from "@/game/GameDialog";
import { Backdrop as WelcomeBackdrop } from "@/game/WelcomeShell";
import type { DeviceIdentity } from "@/sync/db";
import { AccountPanel, SignOutChoices } from "./AccountPanel";
import { HistoryTable } from "./HistoryTable";
import { Overview, type OverviewData } from "./Overview";
import { SettingsForm } from "./SettingsForm";
import { TablesGrid } from "./TablesGrid";
import { Panel, PanelTitle, timeAgo } from "./ui";
import type { ParentSession } from "./useParentSession";

interface DashboardProps {
  session: ParentSession;
  /** This device's own credentials, when they belong to the signed-in child. */
  device: DeviceIdentity | null;
  onLogout: () => void;
}

type Tab = "overview" | "tables" | "history" | "settings" | "account";

const TABS: { value: Tab; label: TranslationKey; icon: typeof Star }[] = [
  { value: "overview", label: "tabOverview", icon: LayoutDashboard },
  { value: "tables", label: "tabTables", icon: Table2 },
  { value: "history", label: "tabHistory", icon: History },
  { value: "settings", label: "tabSettings", icon: SlidersHorizontal },
  { value: "account", label: "tabAccount", icon: CircleUserRound },
];

function toSettings(stored: OverviewData["settings"]): GameSettings {
  if (!stored) return DEFAULT_SETTINGS;
  return {
    ops: stored.ops,
    limit1: stored.limit1,
    limit2: stored.limit2,
    includeZeroOne: stored.includeZeroOne,
    difficulty: stored.difficulty,
    timerEnabled: stored.timerEnabled,
    timerSec: stored.timerSec,
    goalEnabled: stored.goalEnabled,
    goalTarget: stored.goalTarget,
    halfHalfEnabled: stored.halfHalfEnabled,
    halfHalfCooldownSec: stored.halfHalfCooldownSec,
    visualHintEnabled: stored.visualHintEnabled,
    soundEnabled: stored.soundEnabled,
    adaptive: stored.adaptive ?? DEFAULT_SETTINGS.adaptive,
  };
}

/**
 * The parent's side of the app. It shares the game's look — the same frosted
 * panels, the same colours — so it reads as part of the same thing, but it is
 * laid out for reading: the child at a glance up top, then a tab per question
 * a parent comes here with.
 */
export function Dashboard({ session, device, onLogout }: DashboardProps) {
  const { t } = useI18n();
  // Fixed for the visit: a new offset each render would be a new subscription.
  const [tzOffsetMinutes] = useState(() => new Date().getTimezoneOffset());
  const data = useQuery(api.parent.overview, { token: session.token, tzOffsetMinutes });
  const [tab, setTab] = useState<Tab>("overview");
  const [signingOut, setSigningOut] = useState(false);

  if (data === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-label={t("loading")} />
      </main>
    );
  }

  const { profile, stats, progress } = data;
  const settings = toSettings(data.settings);
  const mine = device && device.profileId === profile.id ? device : null;

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      {/* overflow-x-clip, not -hidden: "hidden" makes this div a scroll box and
          the sticky header would stick to it instead of to the page. */}
      <div className="fixed inset-0 -z-10">
        <WelcomeBackdrop />
      </div>

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2">
            <span
              className="flex size-8 -rotate-6 items-center justify-center rounded-lg border-b-2 border-black/20 bg-linear-to-b from-primary to-primary/75 font-display text-lg font-black text-primary-foreground"
              aria-hidden
            >
              ×
            </span>
            <span className="font-display font-black leading-none">
              Math <span className="text-primary">Master</span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("forParents")}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-bold transition-colors hover:border-primary/40"
            >
              <Gamepad2 className="size-4 text-primary" aria-hidden />
              <span className="sr-only sm:not-sr-only">{t("game")}</span>
            </Link>
            <button
              type="button"
              onClick={() => setSigningOut(true)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <LogOut className="size-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">{t("signOut")}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5 sm:px-6">
        <ChildCard
          profile={profile}
          level={progress?.level ?? 1}
          coins={progress?.coins ?? null}
          // `??` for a server not yet redeployed with these fields: nothing, not NaN.
          streakDays={stats.streakDays ?? 0}
          lastPlayedAt={stats.lastPlayedAt ?? null}
        />

        <TabsPrimitive.Root value={tab} onValueChange={(value) => setTab(value as Tab)}>
          <TabsPrimitive.List
            aria-label={t("parentDashboard")}
            className="sticky top-[53px] z-20 flex gap-1 rounded-full border border-border/70 bg-card/90 p-1 shadow-sm backdrop-blur-md"
          >
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsPrimitive.Trigger
                key={value}
                value={value}
                className="relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none data-[state=active]:text-primary-foreground"
              >
                {tab === value && (
                  <motion.span
                    layoutId="parent-tab"
                    className="absolute inset-0 rounded-full bg-linear-to-b from-primary to-primary/80 shadow-[0_3px_10px_-3px_var(--primary)]"
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  />
                )}
                <Icon className="relative size-4 shrink-0" aria-hidden />
                <span className={cn("relative truncate", tab !== value && "sr-only sm:not-sr-only")}>{t(label)}</span>
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>

          <div className="pt-4">
            <TabsPrimitive.Content value="overview">
              <Overview data={data} settings={settings} token={session.token} />
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="tables">
              <Panel>
                <PanelTitle icon={Table2} title={t("tabTables")} hint={t("gridNumbersAre")} />
                <TablesGrid
                  token={session.token}
                  limit1={settings.limit1}
                  limit2={settings.limit2}
                  includeZeroOne={settings.includeZeroOne}
                  initialDifficulty={settings.difficulty}
                />
              </Panel>
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="history">
              <Panel>
                <PanelTitle icon={History} title={t("tabHistory")} hint={t("historyHint")} />
                <HistoryTable token={session.token} />
              </Panel>
            </TabsPrimitive.Content>

            {/* Kept mounted: leaving the tab to check a number must not throw
                away a half-made settings change. */}
            <TabsPrimitive.Content value="settings" forceMount className={tab !== "settings" ? "hidden" : undefined}>
              <SettingsForm token={session.token} settings={settings} locale={profile.locale} name={profile.name} />
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="account">
              <AccountPanel token={session.token} profile={profile} device={mine} onLeave={onLogout} />
            </TabsPrimitive.Content>
          </div>
        </TabsPrimitive.Root>
      </main>

      {createPortal(
        <AnimatePresence>
          {signingOut && (
            <Backdrop>
              <GameDialog hero={<LogOut className="size-10" aria-hidden />}>
                <div className="text-left">
                  <SignOutChoices
                    token={session.token}
                    name={profile.name}
                    device={mine}
                    onLeave={() => {
                      setSigningOut(false);
                      onLogout();
                    }}
                  />
                </div>
                <button type="button" onClick={() => setSigningOut(false)} className={cn(ghostActionClass, "mt-2")}>
                  {t("cancel")}
                </button>
              </GameDialog>
            </Backdrop>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

/** The child at a glance: who, how far they have got, and whether they have been playing. */
function ChildCard({
  profile,
  level,
  coins,
  streakDays,
  lastPlayedAt,
}: {
  profile: OverviewData["profile"];
  level: number;
  coins: number | null;
  streakDays: number;
  lastPlayedAt: number | null;
}) {
  const { t } = useI18n();
  return (
    <Panel className="overflow-hidden bg-linear-to-br from-primary/15 via-card/90 to-card/90 p-0">
      <div className="flex items-center gap-4 p-5">
        <motion.span
          initial={{ scale: 0.5, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 14 }}
          className="flex size-18 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-secondary to-accent text-4xl shadow-[0_8px_20px_-8px_var(--primary)] ring-4 ring-card"
          aria-hidden
        >
          {profile.avatarEmoji}
        </motion.span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-3xl font-black leading-tight">{profile.name}</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            {lastPlayedAt === null ? t("neverPlayed") : t("lastPlayed", { when: timeAgo(t, lastPlayedAt) })}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border/60 border-t border-border/60 bg-card/60">
        <Fact icon={<Star className="size-4 text-primary" fill="currentColor" aria-hidden />} value={t("levelN", { level })} />
        <Fact icon={<CoinIcon className="size-5" />} value={coins === null ? "—" : String(coins)} label={t("coins", { coins: coins ?? 0 })} />
        <Fact
          icon={<Flame className={cn("size-4", streakDays > 0 ? "text-combo" : "text-muted-foreground")} aria-hidden />}
          value={streakDays > 0 ? t("streakDays", { days: streakDays }) : "—"}
        />
      </div>
    </Panel>
  );
}

function Fact({ icon, value, label }: { icon: React.ReactNode; value: string; label?: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 px-2 py-3 text-sm font-bold">
      {icon}
      <span className="font-display text-base font-black tabular-nums">{value}</span>
      {label && <span className="hidden text-muted-foreground sm:inline">{label}</span>}
    </div>
  );
}
