import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const ops = v.array(
  v.union(v.literal("add"), v.literal("sub"), v.literal("mul"), v.literal("div")),
);
const difficulty = v.union(
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard"),
  v.literal("expert"),
);

export const settingsFields = {
  ops,
  limit1: v.number(),
  limit2: v.number(),
  includeZeroOne: v.boolean(),
  difficulty,
  timerEnabled: v.boolean(),
  timerSec: v.number(),
  goalEnabled: v.boolean(),
  goalTarget: v.number(),
  halfHalfEnabled: v.boolean(),
  halfHalfCooldownSec: v.number(),
  visualHintEnabled: v.boolean(),
  soundEnabled: v.boolean(),
  /**
   * Optional so settings rows written before adaptive practice existed stay
   * valid. Readers treat a missing value as "on"; `testing:backfill` fills it
   * in. Every new row carries it explicitly.
   */
  adaptive: v.optional(v.boolean()),
};

/**
 * The same shape with every field optional, for partial updates from the
 * dashboard. Spelled out rather than derived: a mapped-type helper over Convex
 * validators loses the per-field types that make `patch` checkable at all.
 */
export const settingsPatchFields = {
  ops: v.optional(ops),
  limit1: v.optional(v.number()),
  limit2: v.optional(v.number()),
  includeZeroOne: v.optional(v.boolean()),
  difficulty: v.optional(difficulty),
  timerEnabled: v.optional(v.boolean()),
  timerSec: v.optional(v.number()),
  goalEnabled: v.optional(v.boolean()),
  goalTarget: v.optional(v.number()),
  halfHalfEnabled: v.optional(v.boolean()),
  halfHalfCooldownSec: v.optional(v.number()),
  visualHintEnabled: v.optional(v.boolean()),
  soundEnabled: v.optional(v.boolean()),
  adaptive: v.optional(v.boolean()),
};

const species = v.union(
  v.literal("horse"),
  v.literal("cat"),
  v.literal("dog"),
  v.literal("bunny"),
  v.literal("unicorn"),
);

/** A pet exactly as the device's engine holds it; see src/engine/pet.ts. */
export const petFields = v.object({
  id: species,
  species,
  name: v.string(),
  food: v.number(),
  clean: v.number(),
  happy: v.number(),
  health: v.number(),
  alive: v.boolean(),
  updatedAt: v.number(),
  diedAt: v.union(v.number(), v.null()),
  vacation: v.boolean(),
  lastPettedAt: v.number(),
});

export const progressFields = {
  coins: v.number(),
  lastBonusDay: v.union(v.string(), v.null()),
  pets: v.array(petFields),
  activeId: v.union(species, v.null()),
  /** Device clock of the change this snapshot came from. Newest wins. */
  savedAt: v.number(),
  level: v.number(),
};

export default defineSchema({
  profiles: defineTable({
    name: v.string(),
    avatarEmoji: v.string(),
    /** Six characters, unambiguous alphabet. What the parent types on another PC. */
    pairCode: v.string(),
    /** PBKDF2. The PIN itself is never stored or transmitted after login. */
    pinHash: v.string(),
    pinSalt: v.string(),
    /** Hash of the secret held by the kid's device, so it can post attempts. */
    deviceTokenHash: v.string(),
    locale: v.string(),
    createdAt: v.number(),
  })
    .index("by_pairCode", ["pairCode"])
    .index("by_deviceTokenHash", ["deviceTokenHash"]),

  /**
   * Extra devices linked to a profile after it was made — the tablet whose
   * site data got cleared, or a second one. The device that created the
   * profile keeps using `profiles.deviceTokenHash`, so linking a new one never
   * signs the old one out.
   */
  devices: defineTable({
    profileId: v.id("profiles"),
    tokenHash: v.string(),
    createdAt: v.number(),
  }).index("by_profile_token", ["profileId", "tokenHash"]),

  /**
   * What the child has earned and keeps: coins, the pets, the level. One row
   * per profile, backed up from the device so a cleared browser or a new
   * tablet does not cost them their pets.
   */
  progress: defineTable({
    profileId: v.id("profiles"),
    ...progressFields,
    updatedAt: v.number(),
  }).index("by_profile", ["profileId"]),

  settings: defineTable({
    profileId: v.id("profiles"),
    ...settingsFields,
    updatedAt: v.number(),
    updatedBy: v.union(v.literal("parent"), v.literal("device")),
  }).index("by_profile", ["profileId"]),

  /**
   * One row: how many admin sign-in attempts have been made in the current
   * window, and until when sign-in is locked. Counted before the password is
   * checked, so many guesses sent at once are all counted.
   */
  adminGuard: defineTable({
    attempts: v.number(),
    windowStart: v.number(),
    lockedUntil: v.number(),
  }),

  /** Admin page sessions, opened with the ADMIN_PASSWORD environment variable. */
  adminSessions: defineTable({
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_tokenHash", ["tokenHash"]),

  /** Parent dashboard sessions. Short-lived, revocable, one row per login. */
  parentSessions: defineTable({
    profileId: v.id("profiles"),
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_profile", ["profileId"]),

  attempts: defineTable({
    profileId: v.id("profiles"),
    /** Generated on the device before the write. The idempotency key. */
    clientId: v.string(),
    op: v.string(),
    a: v.number(),
    b: v.number(),
    /**
     * Canonical table cell. Optional only for rows written before per-fact
     * tracking existed; every new attempt carries them.
     */
    factA: v.optional(v.number()),
    factB: v.optional(v.number()),
    prompt: v.string(),
    answer: v.number(),
    given: v.union(v.number(), v.null()),
    isCorrect: v.boolean(),
    mode: v.string(),
    /** Every tile the child saw, so the dashboard can show which wrong answer
     *  they reached for — the difference between "42% on times tables" and
     *  "they always answer 7x8 as 54". */
    optionsShown: v.array(v.number()),
    ms: v.number(),
    usedHalfHalf: v.boolean(),
    usedVisualHint: v.boolean(),
    comboAt: v.number(),
    pointsDelta: v.number(),
    difficulty: v.string(),
    createdAt: v.number(),
  })
    .index("by_client", ["profileId", "clientId"])
    .index("by_profile_created", ["profileId", "createdAt"])
    // Everyone's answers in time order, for the admin page's activity.
    .index("by_created", ["createdAt"]),

  /**
   * One row per table cell per difficulty — `mul:7:8:medium`.
   *
   * Derived from `attempts`, but kept as its own table so the dashboard grid is
   * a single indexed read instead of a replay of every answer ever given.
   */
  factStats: defineTable({
    profileId: v.id("profiles"),
    factKey: v.string(),
    op: v.string(),
    a: v.number(),
    b: v.number(),
    difficulty: v.string(),
    attempts: v.number(),
    correct: v.number(),
    totalMs: v.number(),
    bestMs: v.number(),
    strength: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_profile_fact", ["profileId", "factKey"])
    .index("by_profile_difficulty", ["profileId", "difficulty"]),
});
