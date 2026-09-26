/**
 * End-to-end check against the live dev deployment.
 *
 * Exercises the properties the design depends on and that unit tests cannot
 * reach: idempotent attempt writes, PIN gating, and device-token enforcement.
 *
 * Run with: node scripts/verify-backend.mjs
 */
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);

const client = new ConvexHttpClient(env.VITE_CONVEX_URL);

let passed = 0;
let failed = 0;

function check(label, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ok    ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function expectRejection(label, promise) {
  try {
    await promise;
    check(label, false, "expected a rejection, got success");
  } catch {
    check(label, true);
  }
}

const attempt = (clientId, over = {}) => ({
  clientId,
  op: "mul",
  a: 7,
  b: 8,
  // Canonical table cell; for multiplication it matches the displayed operands.
  factA: over.a ?? 7,
  factB: over.b ?? 8,
  prompt: "7 × 8",
  answer: 56,
  given: 56,
  isCorrect: true,
  mode: "choice",
  optionsShown: [48, 56, 63, 54],
  ms: 2400,
  usedHalfHalf: false,
  usedVisualHint: false,
  comboAt: 0,
  pointsDelta: 10,
  difficulty: "medium",
  createdAt: Date.now(),
  ...over,
});

console.log("\nProfile creation");
const pin = "2468";
const created = await client.action(anyApi.secure.createProfile, {
  name: "Verify Run",
  pin,
  locale: "en",
});
check("returns a profile id", Boolean(created.profileId));
check("returns a 6-character pairing code", created.pairCode?.length === 6, created.pairCode);
check("returns a device token", (created.deviceToken?.length ?? 0) > 20);
check(
  "pairing code avoids ambiguous glyphs",
  !/[O0I1S5]/.test(created.pairCode),
  created.pairCode,
);

const { profileId, pairCode, deviceToken } = created;

console.log("\nAttempt recording");
const batch = [
  attempt("a-1"),
  attempt("a-2", { isCorrect: false, given: 54, pointsDelta: -10 }),
  attempt("a-3", { a: 6, b: 9, prompt: "6 × 9", answer: 54, given: 54 }),
];
const first = await client.mutation(anyApi.attempts.record, { profileId, deviceToken, records: batch });
check("inserts a fresh batch", first.inserted === 3, JSON.stringify(first));

const replay = await client.mutation(anyApi.attempts.record, { profileId, deviceToken, records: batch });
check("replaying the same batch inserts nothing", replay.inserted === 0, JSON.stringify(replay));

const mixed = await client.mutation(anyApi.attempts.record, {
  profileId,
  deviceToken,
  records: [...batch, attempt("a-4")],
});
check("a partially-seen batch inserts only the new row", mixed.inserted === 1, JSON.stringify(mixed));

const badToken = await client.mutation(anyApi.attempts.record, {
  profileId,
  deviceToken: "not-the-token",
  records: [attempt("a-5")],
});
check(
  "a bad device token stores nothing and reports unlinked",
  badToken.unlinked === true && badToken.inserted === 0,
  JSON.stringify(badToken),
);

const badRead = await client.query(anyApi.attempts.settingsForDevice, {
  profileId,
  deviceToken: "not-the-token",
});
// Reported rather than thrown: this query is subscribed for the life of the
// app, so throwing would take down a game a child is in the middle of.
check("a bad device token reads as unlinked", badRead.status === "unlinked", JSON.stringify(badRead));

console.log("\nParent login");
await expectRejection(
  "rejects a wrong PIN",
  client.action(anyApi.secure.parentLogin, { pairCode, pin: "9999" }),
);
await expectRejection(
  "rejects an unknown pairing code",
  client.action(anyApi.secure.parentLogin, { pairCode: "ZZZZZZ", pin }),
);

const session = await client.action(anyApi.secure.parentLogin, { pairCode, pin });
check("accepts the right code and PIN", Boolean(session.token));
check("reports the profile name", session.name === "Verify Run", session.name);
check("session expires in the future", session.expiresAt > Date.now());

const lowercase = await client.action(anyApi.secure.parentLogin, {
  pairCode: pairCode.toLowerCase(),
  pin,
});
check("pairing code is case-insensitive", Boolean(lowercase.token));

console.log("\nDashboard");
await expectRejection(
  "rejects a forged session token",
  client.query(anyApi.parent.overview, { token: "forged" }),
);

const overview = await client.query(anyApi.parent.overview, { token: session.token });
check("counts the recorded attempts", overview.stats.sampled === 4, String(overview.stats.sampled));
check("computes accuracy", Math.abs(overview.stats.accuracy - 0.75) < 1e-9, String(overview.stats.accuracy));
check("returns settings", Boolean(overview.settings));
check(
  "surfaces the missed fact with the wrong answer given",
  overview.stats.weakest.some((w) => w.fact === "mul:7:8" && w.wrongAnswers.includes(54)),
  JSON.stringify(overview.stats.weakest),
);

// The batch is right, wrong, right, right — three correct but only two in a
// row, so the longest streak is 2. (A count of correct answers would say 3;
// that difference is the point of the assertion.)
check(
  "reports the longest run, not the total correct",
  overview.stats.bestStreak === 2,
  String(overview.stats.bestStreak),
);
check("returns a dense 14-day window", overview.stats.daily.length === 14);
check(
  "the window ends today and counts today's attempts",
  overview.stats.daily.at(-1)?.day === new Date().toISOString().slice(0, 10) &&
    overview.stats.daily.at(-1)?.total === 4,
  JSON.stringify(overview.stats.daily.at(-1)),
);
check(
  "days with no practice are present as zeroes, not missing",
  overview.stats.daily.slice(0, 13).every((d) => d.total === 0),
);

const history = await client.query(anyApi.parent.history, { token: session.token, limit: 2 });
check("history paginates", history.rows.length === 2 && history.nextBefore !== null);

console.log("\nResponse time cap");
// A tablet left face-up on the table for two and a half hours. The device caps
// this before sending; the server caps it again, because the average response
// time in the dashboard is only worth reading if nothing can skew it that far.
await client.mutation(anyApi.attempts.record, {
  profileId,
  deviceToken,
  records: [attempt("a-slow", { ms: 9_000_000 })],
});
const latest = await client.query(anyApi.parent.history, { token: session.token, limit: 1 });
check(
  "an abandoned question is stored as two minutes",
  latest.rows[0]?.ms === 120_000,
  String(latest.rows[0]?.ms),
);

console.log("\nRemote settings");
await client.mutation(anyApi.parent.updateSettings, {
  token: session.token,
  patch: { difficulty: "hard", limit1: 999, timerSec: 1 },
});
const view = await client.query(anyApi.attempts.settingsForDevice, { profileId, deviceToken });
check("a linked device reads as ok", view.status === "ok", JSON.stringify(view.status));
const deviceView = view.settings;
check("parent change reaches the device", deviceView.difficulty === "hard", deviceView.difficulty);
check("out-of-range limit is clamped server-side", deviceView.limit1 === 100, String(deviceView.limit1));
check("out-of-range timer is clamped server-side", deviceView.timerSec === 3, String(deviceView.timerSec));
check("marks who changed it", deviceView.updatedBy === "parent");

await expectRejection(
  "rejects an empty operation list",
  client.mutation(anyApi.parent.updateSettings, { token: session.token, patch: { ops: [] } }),
);

console.log("\nLogout");
await client.mutation(anyApi.parent.logout, { token: session.token });
await expectRejection(
  "token stops working after logout",
  client.query(anyApi.parent.overview, { token: session.token }),
);

// Clean up after ourselves. Repeated runs would otherwise fill the deployment
// with throwaway profiles that are indistinguishable, from the dashboard, from
// a real child.
console.log("\nProgress backup");
const pet = (over = {}) => ({
  id: "horse",
  species: "horse",
  name: "Bella",
  food: 80,
  clean: 80,
  happy: 80,
  health: 100,
  alive: true,
  updatedAt: Date.now(),
  diedAt: null,
  vacation: false,
  lastPettedAt: 0,
  ...over,
});
const backup = (over = {}) => ({
  coins: 42,
  lastBonusDay: null,
  pets: [pet()],
  activeId: "horse",
  savedAt: 2000,
  level: 3,
  ...over,
});

const empty = await client.query(anyApi.progress.forDevice, { profileId, deviceToken });
check("a new profile has no backup yet", empty.status === "ok" && empty.progress === null);

await client.mutation(anyApi.progress.save, { profileId, deviceToken, progress: backup() });
const stored = await client.query(anyApi.progress.forDevice, { profileId, deviceToken });
check("stores coins, pets and level", stored.progress?.coins === 42 && stored.progress?.pets?.[0]?.name === "Bella" && stored.progress?.level === 3);

await client.mutation(anyApi.progress.save, {
  profileId,
  deviceToken,
  progress: backup({ coins: 1, savedAt: 1000, level: 5 }),
});
const afterOld = await client.query(anyApi.progress.forDevice, { profileId, deviceToken });
check("an older copy does not overwrite a newer one", afterOld.progress?.coins === 42);
check("and neither does its level", afterOld.progress?.level === 3);

await client.mutation(anyApi.progress.save, {
  profileId,
  deviceToken,
  progress: backup({ savedAt: 3000, level: 1 }),
});
const afterLoss = await client.query(anyApi.progress.forDevice, { profileId, deviceToken });
check("a newer copy can lower the level, after a lost game", afterLoss.progress?.level === 1);

const refused = await client.mutation(anyApi.progress.save, {
  profileId,
  deviceToken: "not-a-real-token",
  progress: backup({ coins: 9999, savedAt: 9e12 }),
});
check("a wrong device token cannot write", refused.status === "unlinked");

console.log("\nLinking another device");
await expectRejection(
  "a wrong PIN does not link a device",
  client.action(anyApi.secure.linkDevice, { pairCode, pin: "9999" }),
);
const linked = await client.action(anyApi.secure.linkDevice, { pairCode, pin });
check("the right code and PIN link a device", linked.profileId === profileId && linked.deviceToken !== deviceToken);
const onPhone = await client.query(anyApi.progress.forDevice, {
  profileId,
  deviceToken: linked.deviceToken,
});
check("the linked device sees the same pets and coins", onPhone.progress?.coins === 42 && onPhone.progress?.pets?.[0]?.name === "Bella");
const onTablet = await client.query(anyApi.progress.forDevice, { profileId, deviceToken });
check("the first device stays signed in", onTablet.status === "ok");

console.log("\nCleanup");
try {
  const { execFileSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const root = fileURLToPath(new URL("..", import.meta.url));
  // Invoke the CLI's entry point with node rather than going through `npx`:
  // spawning a .cmd shim on Windows needs a shell, and a shell needs quoting
  // rules that differ per platform.
  const cli = fileURLToPath(new URL("../node_modules/convex/bin/main.js", import.meta.url));
  execFileSync(
    process.execPath,
    [cli, "run", "testing:purgeProfile", JSON.stringify({ pairCode, expectName: "Verify Run" })],
    { stdio: "pipe", cwd: root },
  );
  check("cleanup leaves nothing behind", true);
} catch (error) {
  check(
    "cleanup leaves nothing behind",
    false,
    `run manually: npx convex run testing:purgeProfile '{"pairCode":"${pairCode}","expectName":"Verify Run"}' — ${error}`,
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
