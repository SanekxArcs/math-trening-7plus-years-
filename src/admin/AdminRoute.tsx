import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  BarChart3,
  Check,
  Loader2,
  Lock,
  LogOut,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { convex } from "@/lib/convex";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { Backdrop, GameDialog, ghostActionClass, primaryActionClass } from "@/game/GameDialog";
import { Backdrop as WelcomeBackdrop, WelcomeCard, WelcomeShell, fieldClass, labelClass } from "@/game/WelcomeShell";
import { CoinIcon } from "@/pets/CoinCount";
import { PracticeTrend } from "@/parent/charts";
import { Panel, PanelTitle, timeAgo } from "@/parent/ui";

const KEY = "math_master_admin_session";

interface AdminSession {
  token: string;
  expiresAt: number;
}

function readSession(): AdminSession | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null") as AdminSession | null;
    return parsed && typeof parsed.token === "string" && parsed.expiresAt > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * The owner's page: how the app is being used, and the way to remove a user.
 * Loaded on demand like the parent dashboard — no child's tablet downloads it.
 */
export function AdminRoute() {
  const [session, setSession] = useState<AdminSession | null>(readSession);

  useEffect(() => {
    try {
      if (session) localStorage.setItem(KEY, JSON.stringify(session));
      else localStorage.removeItem(KEY);
    } catch {
      /* private mode */
    }
    if (!session) return;
    const id = window.setTimeout(() => setSession(null), Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(id);
  }, [session]);

  if (!convex) return null;
  if (!session) return <AdminLogin onSession={setSession} />;
  return <AdminDashboard session={session} onSignOut={() => setSession(null)} />;
}

function AdminLogin({ onSession }: { onSession: (session: AdminSession) => void }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"adminWrong" | "adminNotSetUp" | "pairFailed" | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!convex || password.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      onSession(await convex.action(api.secure.adminLogin, { password }));
    } catch (cause) {
      const message = String(cause);
      setError(message.includes("ADMIN_NOT_SET_UP") ? "adminNotSetUp" : message.includes("ADMIN_WRONG") ? "adminWrong" : "pairFailed");
      setBusy(false);
    }
  };

  return (
    <WelcomeShell>
      <WelcomeCard as="form" onSubmit={submit} hero={<ShieldCheck className="size-10 text-primary" aria-hidden />} className="space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-black">{t("adminSignInTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("adminSignInBlurb")}</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="admin-password" className={labelClass}>
            {t("adminPassword")}
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClass}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-wrong/10 px-3 py-2 text-sm font-bold text-wrong">
            {t(error)}
          </p>
        )}
        <button type="submit" disabled={busy || password.length === 0} className={cn(primaryActionClass, "disabled:opacity-40")}>
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Lock className="size-5" aria-hidden />}
          {t("signIn")}
        </button>
      </WelcomeCard>
    </WelcomeShell>
  );
}

type Overview = NonNullable<FunctionReturnType<typeof api.admin.overview>>;
type UserRow = Overview["users"][number];

function AdminDashboard({ session, onSignOut }: { session: AdminSession; onSignOut: () => void }) {
  const { t } = useI18n();
  const data = useQuery(api.admin.overview, { token: session.token });
  const logout = useMutation(api.admin.logout);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signOut = () => {
    void logout({ token: session.token }).catch(() => undefined);
    onSignOut();
  };

  // The session ran out or was revoked on the server: back to the sign-in.
  useEffect(() => {
    if (data === null) onSignOut();
  }, [data, onSignOut]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(id);
  }, [notice]);

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div className="fixed inset-0 -z-10">
        <WelcomeBackdrop />
      </div>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-linear-to-b from-foreground to-foreground/80 text-background">
              <ShieldCheck className="size-4.5" aria-hidden />
            </span>
            <span className="font-display font-black leading-none">
              Math <span className="text-primary">Master</span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("adminTitle")}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden />
            {t("signOut")}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-4 px-4 py-5 sm:px-6">
        {!data ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" aria-label={t("loading")} />
          </div>
        ) : (
          <>
            <Totals totals={data.totals} />
            <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
              <Panel>
                <PanelTitle icon={BarChart3} title={t("adminActivity")} hint={t("adminActivityHint")} />
                <PracticeTrend daily={data.daily} />
              </Panel>
              <Feed feed={data.feed} />
            </div>
            <UserList users={data.users} onDelete={setDeleting} />
          </>
        )}
      </main>

      {createPortal(
        <AnimatePresence>
          {deleting && (
            <DeleteDialog
              key={deleting.id}
              token={session.token}
              user={deleting}
              onClose={() => setDeleting(null)}
              onDeleted={(name) => {
                setDeleting(null);
                setNotice(t("adminDeleted", { name }));
              }}
            />
          )}
          {notice && (
            <motion.p
              key="notice"
              role="status"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-bold text-background shadow-xl"
            >
              <Check className="size-4" strokeWidth={3} aria-hidden />
              {notice}
            </motion.p>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

function Totals({ totals }: { totals: Overview["totals"] }) {
  const { t } = useI18n();
  const tiles = [
    { icon: Users, hue: "var(--primary)", label: t("adminUsers"), value: totals.users },
    { icon: UserPlus, hue: "var(--option-4)", label: t("adminNewUsers"), value: totals.newThisWeek },
    { icon: Activity, hue: "var(--correct)", label: t("adminActiveToday"), value: totals.activeToday },
    { icon: Activity, hue: "var(--option-0)", label: t("adminActiveWeek"), value: totals.activeWeek },
    { icon: Activity, hue: "var(--option-2)", label: t("adminActiveMonth"), value: totals.activeMonth },
    { icon: Sparkles, hue: "var(--combo)", label: t("adminAnswersWeek"), value: totals.answersWeek },
    {
      icon: Target,
      hue: "var(--option-3)",
      label: t("adminAccuracyWeek"),
      value: totals.accuracyWeek === null ? "—" : `${Math.round(totals.accuracyWeek * 100)}%`,
    },
    { icon: Smartphone, hue: "var(--option-5)", label: t("adminDevices"), value: totals.devices },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {tiles.map(({ icon: Icon, hue, label, value }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="rounded-xl border border-border/70 bg-card/90 p-3.5 shadow-sm backdrop-blur-md"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <span className="flex size-6 items-center justify-center rounded-md text-white" style={{ background: hue }}>
              <Icon className="size-3.5" aria-hidden />
            </span>
            <span className="truncate">{label}</span>
          </div>
          <p className="mt-1.5 font-display text-3xl font-black tabular-nums">{value}</p>
        </motion.div>
      ))}
      {totals.capped && (
        <p className="col-span-full text-xs text-muted-foreground">{t("adminCapped", { count: totals.sampled })}</p>
      )}
    </div>
  );
}

/** The latest answers from everyone, newest first — the app, live. */
function Feed({ feed }: { feed: Overview["feed"] }) {
  const { t } = useI18n();
  return (
    <Panel delay={0.05}>
      <PanelTitle icon={Activity} title={t("adminFeed")} hue="var(--correct)" />
      {feed.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("adminFeedEmpty")}</p>
      ) : (
        <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {feed.map((row) => (
              <motion.li
                key={row.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2.5 rounded-lg bg-background/60 px-2.5 py-1.5 text-sm"
              >
                <span className="text-xl" aria-hidden>
                  {row.avatarEmoji}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-bold">{row.name}</span>{" "}
                  <span className="font-display font-bold tabular-nums">
                    {row.prompt} = {row.given ?? "…"}
                  </span>
                </span>
                {row.isCorrect ? (
                  <Check className="size-4 shrink-0 text-correct" strokeWidth={3} aria-label="✓" />
                ) : (
                  <X className="size-4 shrink-0 text-wrong" strokeWidth={3} aria-label="✗" />
                )}
                <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(t, row.createdAt)}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Panel>
  );
}

function UserList({ users, onDelete }: { users: UserRow[]; onDelete: (user: UserRow) => void }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => user.name.toLowerCase().includes(needle) || user.pairCode.toLowerCase().includes(needle));
  }, [users, search]);

  return (
    <Panel delay={0.1}>
      <PanelTitle
        icon={Users}
        title={t("adminUserList")}
        hint={t("adminUserCount", { count: users.length })}
        action={
          <label className="relative hidden w-56 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("adminSearch")}
              aria-label={t("adminSearch")}
              className="w-full rounded-full border border-border bg-background/80 py-1.5 pl-9 pr-3 text-sm outline-none focus-visible:border-primary"
            />
          </label>
        }
      />
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("adminSearch")}
        aria-label={t("adminSearch")}
        className="mb-3 w-full rounded-full border border-border bg-background/80 px-4 py-2 text-sm outline-none focus-visible:border-primary sm:hidden"
      />
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("adminNoUsers")}</p>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-2 py-2">{t("adminColUser")}</th>
                <th className="px-2 py-2">{t("adminColLastActive")}</th>
                <th className="px-2 py-2 text-right">{t("adminColAnswers")}</th>
                <th className="px-2 py-2 text-right">{t("adminColAccuracy")}</th>
                <th className="px-2 py-2 text-right">{t("adminColProgress")}</th>
                <th className="px-2 py-2">{t("adminColJoined")}</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {shown.map((user) => {
                const activeToday = user.lastActiveAt !== null && Date.now() - user.lastActiveAt < 86_400_000;
                return (
                  <tr key={user.id} className="border-t border-border/60 transition-colors hover:bg-secondary/40">
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="relative flex size-9 items-center justify-center rounded-full bg-secondary text-xl">
                          {user.avatarEmoji}
                          {activeToday && (
                            <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-card bg-correct" aria-hidden />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold">{user.name}</p>
                          <p className="font-mono text-xs tracking-widest text-muted-foreground">{user.pairCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-muted-foreground">
                      {user.lastActiveAt === null ? t("adminNever") : timeAgo(t, user.lastActiveAt)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      <span className="font-bold">{user.answersMonth}</span>
                      <span className="block text-xs text-muted-foreground">{t("adminThisWeek", { count: user.answersWeek })}</span>
                    </td>
                    <td className="px-2 py-2.5 text-right font-bold tabular-nums">
                      {user.accuracy === null ? "—" : `${Math.round(user.accuracy * 100)}%`}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className="inline-flex items-center gap-2 text-xs font-bold">
                        <span>{t("levelShort", { level: user.level })}</span>
                        <span className="inline-flex items-center gap-0.5">
                          <CoinIcon className="size-3.5" />
                          {user.coins ?? "—"}
                        </span>
                        <span title={t("petsTitle")}>🐾 {user.pets}</span>
                        <span title={t("adminDevices")}>📱 {user.devices}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onDelete(user)}
                        aria-label={t("adminDeleteUser", { name: user.name })}
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-wrong/10 hover:text-wrong"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/**
 * The only destructive thing on the page, so it asks for the name typed back:
 * a stray click on the wrong row cannot delete a child's history.
 */
function DeleteDialog({
  token,
  user,
  onClose,
  onDeleted,
}: {
  token: string;
  user: UserRow;
  onClose: () => void;
  onDeleted: (name: string) => void;
}) {
  const { t } = useI18n();
  const remove = useMutation(api.admin.deleteProfile);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const matches = typed.trim() === user.name.trim();

  const confirm = async () => {
    if (!matches) return;
    setBusy(true);
    setFailed(false);
    try {
      await remove({ token, profileId: user.id as Id<"profiles">, confirmName: typed });
      onDeleted(user.name);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <Backdrop>
      <GameDialog tone="lost" hero={<Trash2 className="size-10" aria-hidden />}>
        <h2 className="font-display text-2xl font-black">{t("adminDeleteTitle", { name: user.name })}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("adminDeleteBlurb")}</p>
        <div className="mt-3 flex justify-center gap-3 text-xs font-bold text-muted-foreground">
          <span>{t("adminColAnswers")}: {user.answersMonth}</span>
          <span>🐾 {user.pets}</span>
          <span>📱 {user.devices}</span>
        </div>
        <label className="mt-5 block space-y-1.5 text-left">
          <span className={labelClass}>{t("adminDeleteType", { name: user.name })}</span>
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            autoFocus
            className={cn(fieldClass, matches && "border-wrong")}
          />
        </label>
        {failed && (
          <p role="alert" className="mt-2 text-sm font-bold text-wrong">
            {t("couldNotSave")}
          </p>
        )}
        <button
          type="button"
          onClick={confirm}
          disabled={!matches || busy}
          className={cn(primaryActionClass, "mt-5 from-wrong to-wrong/80 shadow-[0_10px_24px_-10px_var(--wrong)] disabled:opacity-40")}
        >
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Trash2 className="size-5" aria-hidden />}
          {t("adminDeleteConfirm")}
        </button>
        <button type="button" onClick={onClose} disabled={busy} className={cn(ghostActionClass, "mt-1")}>
          {t("cancel")}
        </button>
      </GameDialog>
    </Backdrop>
  );
}
