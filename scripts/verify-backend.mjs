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

const attempt = (clientId, over) => ({
  clientId,
  op: "mul",
  a: 7,
  b: 8,
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

await expectRejection(
  "rejects a bad device token",
  client.mutation(anyApi.attempts.record, {
    profileId,
    deviceToken: "not-the-token",
    records: [attempt("a-5")],
  }),
);

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

const history = await client.query(anyApi.parent.history, { token: session.token, limit: 2 });
check("history paginates", history.rows.length === 2 && history.nextBefore !== null);

console.log("\nRemote settings");
await client.mutation(anyApi.parent.updateSettings, {
  token: session.token,
  patch: { difficulty: "hard", limit1: 999, timerSec: 1 },
});
const deviceView = await client.query(anyApi.attempts.settingsForDevice, { profileId, deviceToken });
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

console.log(`\n${passed} passed, ${failed} failed`);
console.log(`(test profile left behind, pairing code ${pairCode})`);
process.exit(failed === 0 ? 0 : 1);
