import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { Gamepad2, KeyRound, LogOut } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_SETTINGS, type GameSettings } from "@/engine";
import { useI18n } from "@/i18n/useI18n";
import { AccuracyByOperation, EmptyNote, PracticeTrend } from "./charts";
import { HistoryTable } from "./HistoryTable";
import { TablesGrid } from "./TablesGrid";
import { SettingsForm } from "./SettingsForm";
import type { ParentSession } from "./useParentSession";

interface DashboardProps {
  session: ParentSession;
  onLogout: () => void;
}

export function Dashboard({ session, onLogout }: DashboardProps) {
  const { t } = useI18n();
  const data = useQuery(api.parent.overview, { token: session.token });

  if (data === undefined) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-8">
        <EmptyNote>{t("loading")}</EmptyNote>
      </main>
    );
  }

  const { profile, stats } = data;
  const settings: GameSettings = data.settings
    ? {
        ops: data.settings.ops,
        limit1: data.settings.limit1,
        limit2: data.settings.limit2,
        includeZeroOne: data.settings.includeZeroOne,
        difficulty: data.settings.difficulty,
        timerEnabled: data.settings.timerEnabled,
        timerSec: data.settings.timerSec,
        goalEnabled: data.settings.goalEnabled,
        goalTarget: data.settings.goalTarget,
        halfHalfEnabled: data.settings.halfHalfEnabled,
        halfHalfCooldownSec: data.settings.halfHalfCooldownSec,
        visualHintEnabled: data.settings.visualHintEnabled,
        soundEnabled: data.settings.soundEnabled,
        adaptive: data.settings.adaptive ?? DEFAULT_SETTINGS.adaptive,
      }
    : DEFAULT_SETTINGS;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden>
            {profile.avatarEmoji}
          </span>
          <div>
            <h1 className="font-display text-2xl font-black leading-tight">{profile.name}</h1>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <KeyRound className="size-3" aria-hidden />
              {profile.pairCode}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <Gamepad2 className="size-4" aria-hidden />
              {t("game")}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="size-4" aria-hidden />
            {t("signOut")}
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("accuracy")} value={`${Math.round(stats.accuracy * 100)}%`} />
        <StatTile label={t("questions")} value={String(stats.sampled)} />
        <StatTile label={t("bestStreak")} value={String(stats.bestStreak)} />
        <StatTile
          label={t("averageTime")}
          value={stats.averageMs === 0 ? "—" : `${(stats.averageMs / 1000).toFixed(1)}s`}
        />
      </section>

      <Tabs defaultValue="progress">
        <TabsList className="w-full">
          <TabsTrigger value="progress" className="flex-1">
            {t("tabProgress")}
          </TabsTrigger>
          <TabsTrigger value="tables" className="flex-1">
            {t("tabTables")}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            {t("tabHistory")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">
            {t("tabSettings")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("practiceLast14")}</CardTitle>
            </CardHeader>
            <CardContent>
              <PracticeTrend daily={stats.daily} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("accuracyByOperation")}</CardTitle>
            </CardHeader>
            <CardContent>
              <AccuracyByOperation byOperation={stats.byOperation} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("worthPractising")}</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.weakest.length === 0 ? (
                <EmptyNote>{t("noRepeatedMistakes")}</EmptyNote>
              ) : (
                <ul className="space-y-2">
                  {stats.weakest.map((entry) => {
                    const [op, a, b] = entry.fact.split(":");
                    const missed = entry.total - entry.correct;
                    return (
                      <li
                        key={entry.fact}
                        className="flex flex-wrap items-baseline justify-between gap-2 rounded-[--radius-sm] bg-muted/40 px-3 py-2"
                      >
                        <span className="font-display text-lg font-bold tabular-nums">
                          {a} {symbolFor(op)} {b}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t("missedOf", { missed, total: entry.total })}
                          {entry.wrongAnswers.length > 0 && (
                            <>
                              {` · ${t("answeredWith")} `}
                              <span className="font-bold text-foreground tabular-nums">
                                {[...new Set(entry.wrongAnswers)].slice(0, 3).join(", ")}
                              </span>
                            </>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tables" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("tabTables")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("gridNumbersAre")}</p>
            </CardHeader>
            <CardContent>
              <TablesGrid
                token={session.token}
                limit1={settings.limit1}
                limit2={settings.limit2}
                includeZeroOne={settings.includeZeroOne}
                initialDifficulty={settings.difficulty}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <HistoryTable token={session.token} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <SettingsForm token={session.token} settings={settings} locale={profile.locale} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[--radius-md] bg-card p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function symbolFor(op: string | undefined): string {
  switch (op) {
    case "add":
      return "+";
    case "sub":
      return "−";
    case "mul":
      return "×";
    case "div":
      return "÷";
    default:
      return op ?? "";
  }
}

