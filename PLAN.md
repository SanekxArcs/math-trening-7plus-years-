# Math Master — PWA rewrite plan

Rewrite of the vanilla game as an offline-capable PWA with a Convex backend and a
remote parent dashboard. Replaces `index.html` + `js/` in place; the old version
stays recoverable at commit `86f8665`.

## 1. Stack

| Concern | Choice | Version |
| --- | --- | --- |
| Build | Vite + React + TypeScript | 8.3 / 19.3 / 7.0 |
| Styling | Tailwind CSS (`@tailwindcss/vite`) | 4.3 |
| Components | shadcn/ui, restyled for kids | CLI 4.21 |
| Animation | `motion` (motion.dev) | 13.2 |
| Celebration | `canvas-confetti` | 1.9 |
| Backend | Convex | 1.45 |
| Offline | `vite-plugin-pwa` + Dexie (IndexedDB outbox) | 1.3 / 4.4 |
| Routing | `react-router-dom` | 7.18 |
| Local state | `zustand` | 5.x |
| Tests | Vitest | latest |

Package manager: **pnpm** (matches `../cusemit`, which is the Convex + React 19 +
Tailwind 4 wiring reference).

## 2. Guiding principle

**The math engine is pure TypeScript with zero React and zero Convex imports.**

Every bug in the review of the old version was a bug of entanglement: scoring
lived inside a UI updater, hint mode cycled inside a render function, distractor
generation was inlined into the DOM code. Putting the rules in `src/engine/`
behind a unit-tested boundary is what stops that recurring — and it is the only
part of this app where a bug means a child learns the wrong thing.

## 3. Layout

```
src/
  engine/            # pure, tested, no imports from react/convex
    types.ts
    problem.ts       # operand + problem generation
    distractors.ts   # plausible wrong options
    shuffle.ts       # Fisher-Yates
    scoring.ts       # combo / penalty / multiplier state machine
    index.ts
  game/              # play screen
    GameScreen.tsx
    OptionGrid.tsx
    Numpad.tsx       # expert mode, touch-first
    ComboMeter.tsx
    TimerBar.tsx
    VisualHint.tsx
    HalfHalfButton.tsx
  parent/            # dashboard
    PairScreen.tsx
    Dashboard.tsx
    HistoryTable.tsx
    SettingsForm.tsx
    StatsCharts.tsx
  sync/
    db.ts            # Dexie schema (outbox + settings cache)
    outbox.ts        # enqueue + flush + idempotency
    useSync.ts
  i18n/              # pl / en / uk, typed keys
  components/ui/     # shadcn output
  lib/
convex/
  schema.ts
  profiles.ts  settings.ts  attempts.ts  sessions.ts  parent.ts
```

## 4. Game design

### 4.1 Difficulty

| Mode | Answer input | Base points |
| --- | --- | --- |
| Easy | 2 options | 5 |
| Medium | 4 options | 10 |
| Hard | 6 options | 15 |
| Expert | type the answer on a virtual numpad | 25 |

The numpad is the only input in Expert mode — no hardware keyboard, so it works
on a phone or tablet without the OS keyboard covering the question. Big targets
(min 64px), digits 0-9, backspace, confirm.

### 4.2 Good combo

Consecutive correct answers raise a multiplier:

| Streak | Multiplier |
| --- | --- |
| 0-4 | x1 |
| 5-14 | x2 |
| 15-29 | x3 |
| 30+ | x4 (cap) |

Awarded points = `round(base * multiplier * modifiers)`.

Modifiers: answered in under half the timer `x1.25`; visual hint used `x0.75`.

**50:50 scores nothing at all** — not half, nothing — but the answer still counts
as correct and the streak survives. That makes the lifeline a real decision
rather than a small tax: keep the run alive, or score. A child who needs the help
is never knocked back to the start of their combo for taking it.

### 4.3 Bad combo

Consecutive wrong answers (or timeouts) escalate **faster than the good combo
builds**, as requested — a table rather than a formula, so the numbers stay
obvious to whoever tunes them:

| Consecutive wrong | Penalty |
| --- | --- |
| 1st | -10 |
| 2nd | -25 |
| 3rd | -45 |
| 4th+ | -70 (cap) |

Rules:

- A wrong answer resets the good streak to 0 immediately.
- A correct answer resets the bad streak to 0 — so digging out requires a right
  answer, exactly as described.
- A timeout is a wrong answer and advances the bad combo (the old version charged
  a flat -1 for timeouts, which made stalling cheaper than guessing).

### 4.4 Target

Session ends when the score reaches the parent-set target. The old tug-of-war bar
is kept as the visual, now driven by points instead of raw counts.

### 4.5 Hints

- **50:50** — removes half the wrong options (1 of 2 in Easy, 2 of 4, 3 of 6;
  disabled in Expert). Usable once per cooldown, cooldown length set by the
  parent, default 30s, with a visible countdown ring on the button. Scores no
  points, keeps the streak.
- **Visual hint** — the box/line grouping from the old version, rebuilt so that
  *rendering* and *changing view mode* are separate functions. Mode changes only
  when the child asks for it, never on question change.
- **Counting together** steps through the picture one group per beat with a
  running total, so the child sees the skip count (4, 8, 12) rather than just
  the finished arrangement. Offered for multiplication only: a division draws
  the same picture the other way round, so counting the dots would reach the
  dividend while the answer is the size of one group.
- Groups render as five-frames — 9 shows as 5+4 — which is how a child is
  taught to count them.

## 4.6 Adaptive practice

Every answer updates a per-fact record — one cell of one table, at one
difficulty: `mul:7:8:medium`. A fact carries a **strength** from 0 to 1 that
rises with correct answers (faster answers earn more, a lifeline earns less),
collapses to 40% of itself on a mistake, and decays with a 21-day half-life so
nothing stays "learned" untouched.

Question selection weighs every cell of the table and draws proportionally, so
practice bends towards what is weak without ever locking onto one square. The
ordering it produces, strongest claim on the child's time first:

1. a fact they got **wrong**
2. a fact they half-know
3. a fact **never asked**
4. one they are getting
5. one they know — floored, never zero, so it still comes back

Point 1 above point 3 is the whole design and was the easy thing to get wrong:
weighed naively the two came out identical, and a known mistake vanished back
into a table of sixty unseen cells.

Measured end to end on an 8-cell table: a fact answered wrong every time was
asked 28 of 70 questions (40%, against a uniform 12.5%) and its share *rose*
over the run, while every other cell reached 80–89% strength.

## 5. Data model (Convex)

```ts
profiles   { name, avatarEmoji, pairCode, pinHash, pinSalt, locale, createdAt }
settings   { profileId, ops[], limit1, limit2, includeZeroOne, difficulty,
             timerEnabled, timerSec, goalEnabled, goalTarget,
             halfHalfEnabled, halfHalfCooldownSec, visualHintEnabled,
             soundEnabled, updatedAt, updatedBy }
sessions   { profileId, deviceId, startedAt, endedAt, points, correct, wrong,
             bestCombo, difficulty }
attempts   { profileId, sessionId, clientId, op, a, b, prompt, answer, given,
             isCorrect, mode, optionsShown[], ms, usedHalfHalf, usedVisualHint,
             comboAt, pointsDelta, createdAt }
```

Indexes: `attempts.by_profile_created`, `attempts.by_client` (idempotency),
`sessions.by_profile`, `profiles.by_pairCode`.

`optionsShown` is stored so the dashboard can answer the question that actually
matters: *which wrong answer did they pick, and is it the same wrong answer every
time?* That is the difference between "42% on multiplication" and "they always
answer 7x8 as 54".

## 6. Offline-first sync

Play never touches the network on the critical path.

1. Every attempt is written to a Dexie outbox with a client-generated `clientId`.
2. The UI reads from local state; Convex is never awaited mid-question.
3. A background flush drains the outbox whenever the connection is up.
4. The Convex mutation upserts on `clientId`, so replaying a queue after a flaky
   reconnect can never double-count an answer. This is the detail that makes
   offline sync trustworthy rather than merely present.
5. Settings: Convex is the source of truth, mirrored into Dexie. Offline, the app
   runs on the mirror. Online, Convex reactivity pushes parent changes to the
   kid's device live — no refresh needed on either side.

The service worker precaches the app shell; fonts are self-hosted so a cold
offline start still renders correctly.

## 7. Parent access

1. Each profile gets a 6-character pairing code and a parent-set PIN.
2. Dashboard flow: enter code, enter PIN, receive a session token (stored in
   `localStorage`), and every parent query/mutation takes that token.
3. The PIN is hashed (PBKDF2 via Web Crypto) — never stored or compared in
   plaintext.
4. Gating happens **server-side in the Convex functions**, not in the React
   router. A hidden route is not access control, and the kid is the most likely
   person to go looking.

Dashboard contents: score and accuracy over time, per-operation and per-fact
breakdown (which table is weak), the full attempt log including the chosen wrong
answers, streak history, and a settings form that writes through to the kid's
device live.

## 8. Phases

**Phase 0 — Scaffold. Done.** Vite 8 / React 19 / TS 7 in place of the old
files, Tailwind 4 with a kid-facing token palette, PWA plugin + manifest +
generated icons (`pnpm icons`), router shell, Convex provider that tolerates
having no backend at all.

**Phase 1 — Engine + tests. Done.** `problem`, `distractors`, `shuffle`,
`scoring` as pure modules with no React or Convex imports. 29 tests, including
the two the old version would have failed: answer position uniform across 40k
draws, and decoys that stay in the answer's magnitude whatever the limits are.

**Phase 2 — Game UI. Done.** All four difficulties, numpad, combo meter, timer,
motion transitions, confetti. 6 component tests drive a real round end to end.

**Phase 3 — Persistence. Done.** Dexie outbox with client-generated ids, a
single-flight drain on `online` plus a 30s backstop, settings mirror for cold
offline starts, quiet sync badge.

**Phase 4 — Convex. Done.** Schema, indexes, idempotent attempt upsert, PBKDF2
PIN hashing in a `"use node"` action, server-side clamps. Verified against the
live deployment by `node scripts/verify-backend.mjs` — 26 checks.

**Phase 5 — Dashboard. Done.** Pairing-code + PIN sign-in, stat tiles, a 14-day
practice chart, accuracy by operation, the most-missed facts with the wrong
answers actually given, the full attempt log, and a settings form that writes
through to the child's device live. Built on shadcn primitives; both chart
series steps were run through the dataviz validator against their own surface.

**Phase 6 — Hints. Done.** 50:50 with a cooldown ring, the rebuilt visual hint
in three layouts, five-frame grouping, and the animated count-together for
multiplication.

**Phase 7 — Polish. In progress.** i18n (pl/en/uk) with typed keys is done, as
is reduced-motion. Outstanding: a keyboard and screen-reader pass, and a
Lighthouse PWA check.

**Phase 8 — Adaptive practice. Done.** Per-fact mastery (§4.6), local-first so
selection works offline, mirrored to Convex by the same idempotent mutation that
records attempts. A **Tables** tab in the dashboard shows every cell of every
operation, coloured by mastery and labelled with the average response time, per
difficulty. Parents can switch it off.

## 9. Decisions still open

1. **Score floor.** Should a session score be allowed to go negative, or floor at
   0? Negative numbers are demoralizing for a 7-year-old; flooring the displayed
   score while recording the true delta in history is the middle path.
2. **Multiple kids per parent.** The schema supports it (dashboard lists
   profiles); building the UI for it is extra work. Worth it now, or later?
3. **Lose condition.** Keep the tug-of-war "bad reaches target = you lose", or
   make sessions target-only, so a session can only be won or abandoned?
