/**
 * Tests for the feature flag evaluation engine.
 *
 * Tests cover:
 *   - Sticky hash bucketing (same user always in/out for a given flag)
 *   - Each rule type (sport, team_role, user_type, rollout_percentage, geolocation)
 *   - AND logic (all rules must pass)
 *   - Global kill-switch (enabled = false)
 *   - Unauthenticated user (all flags off)
 *   - Empty rules (on for everyone)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ── Reproduce stickySample locally (same algorithm as featureFlags.js) ────────

/**
 * @param {string} userId
 * @param {string} flagName
 * @returns {number} 0–99
 */
function stickySample(userId, flagName) {
  const hash = crypto
    .createHash("sha256")
    .update(`${userId}:${flagName}`)
    .digest("hex");
  return parseInt(hash.slice(0, 8), 16) % 100;
}

describe("stickySample", () => {
  it("returns an integer in [0, 99]", () => {
    const v = stickySample("user-abc", "my_flag");
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(99);
    expect(Number.isInteger(v)).toBe(true);
  });

  it("is deterministic — same inputs always yield the same bucket", () => {
    const a = stickySample("user-123", "in_app_notifications");
    const b = stickySample("user-123", "in_app_notifications");
    expect(a).toBe(b);
  });

  it("produces different buckets for different users", () => {
    const a = stickySample("user-aaa", "flag");
    const b = stickySample("user-bbb", "flag");
    // They could theoretically collide but for these inputs they won't
    expect(a).not.toBe(b);
  });

  it("produces different buckets for the same user on different flags", () => {
    const a = stickySample("user-xyz", "flag_a");
    const b = stickySample("user-xyz", "flag_b");
    expect(a).not.toBe(b);
  });

  it("distributes users across the full 0–99 range across many users", () => {
    const buckets = new Set();
    for (let i = 0; i < 500; i++) {
      buckets.add(stickySample(`user-${i}`, "rollout_flag"));
    }
    // With 500 users we expect good coverage across the 0-99 range
    expect(buckets.size).toBeGreaterThan(70);
  });
});

// ── Mock resolveFlags via mocked pool ─────────────────────────────────────────
// We mock pool.query so the flag resolver doesn't need a real database.

vi.mock("../../server/db/pool.js", () => ({
  default: { query: vi.fn() },
}));

vi.mock("geoip-lite", () => ({
  default: { lookup: vi.fn(() => null) },
}));

import pool from "../../server/db/pool.js";
import geoip from "geoip-lite";
import { resolveFlags } from "../../server/lib/featureFlags.js";

// Convenience: set pool.query to return membership rows then user rows
function mockDb({ memberships = [], user = { onboarded_at: new Date() } } = {}) {
  pool.query
    .mockResolvedValueOnce({ rows: memberships })   // team_memberships + teams join
    .mockResolvedValueOnce({ rows: user ? [user] : [] }); // users
}

// Convenience: set pool.query to return the flags list
function mockFlags(flags) {
  pool.query.mockResolvedValueOnce({ rows: flags });
}

beforeEach(() => {
  vi.clearAllMocks();
  // After clearAllMocks the mock implementation is reset; restore null default
  // so non-geo tests get an empty geo object rather than undefined.
  geoip.lookup.mockImplementation(() => null);
});

// ── Global kill-switch ────────────────────────────────────────────────────────

describe("global kill-switch (enabled = false)", () => {
  it("returns false regardless of rules when enabled is false", async () => {
    mockFlags([{ id: "1", name: "my_feature", enabled: false, rules: [] }]);
    mockDb();
    const flags = await resolveFlags("user-1", null);
    expect(flags.my_feature).toBe(false);
  });
});

// ── Unauthenticated user ──────────────────────────────────────────────────────

describe("unauthenticated user (userId = null)", () => {
  it("returns false for all flags without hitting the DB for user context", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: "1", name: "notifications", enabled: true, rules: [] }],
    });
    const flags = await resolveFlags(null, null);
    expect(flags.notifications).toBe(false);
    // Only one query (flag list), not two (user context would add two more)
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

// ── Empty rules (everyone) ────────────────────────────────────────────────────

describe("empty rules array", () => {
  it("returns true for every authenticated user when rules = []", async () => {
    mockFlags([{ id: "1", name: "feature_x", enabled: true, rules: [] }]);
    mockDb();
    const flags = await resolveFlags("user-abc", null);
    expect(flags.feature_x).toBe(true);
  });
});

// ── sport rule ────────────────────────────────────────────────────────────────

describe("sport rule", () => {
  it("returns true when user is on a team with a matching sport", async () => {
    mockFlags([{
      id: "1", name: "rugby_feature", enabled: true,
      rules: [{ type: "sport", values: ["rugby"] }],
    }]);
    mockDb({ memberships: [{ role: "coach", sport: "rugby" }] });
    const flags = await resolveFlags("user-1", null);
    expect(flags.rugby_feature).toBe(true);
  });

  it("returns false when none of the user's teams match", async () => {
    mockFlags([{
      id: "1", name: "rugby_feature", enabled: true,
      rules: [{ type: "sport", values: ["rugby"] }],
    }]);
    mockDb({ memberships: [{ role: "coach", sport: "football" }] });
    const flags = await resolveFlags("user-1", null);
    expect(flags.rugby_feature).toBe(false);
  });

  it("returns false when user has no team memberships", async () => {
    mockFlags([{
      id: "1", name: "rugby_feature", enabled: true,
      rules: [{ type: "sport", values: ["rugby"] }],
    }]);
    mockDb({ memberships: [] });
    const flags = await resolveFlags("user-1", null);
    expect(flags.rugby_feature).toBe(false);
  });
});

// ── team_role rule ────────────────────────────────────────────────────────────

describe("team_role rule", () => {
  it("returns true when user holds a matching role", async () => {
    mockFlags([{
      id: "1", name: "coach_feature", enabled: true,
      rules: [{ type: "team_role", roles: ["coach", "owner"] }],
    }]);
    mockDb({ memberships: [{ role: "coach", sport: "rugby" }] });
    const flags = await resolveFlags("user-1", null);
    expect(flags.coach_feature).toBe(true);
  });

  it("returns false when user's role is not in the list", async () => {
    mockFlags([{
      id: "1", name: "coach_feature", enabled: true,
      rules: [{ type: "team_role", roles: ["owner"] }],
    }]);
    mockDb({ memberships: [{ role: "player", sport: "rugby" }] });
    const flags = await resolveFlags("user-1", null);
    expect(flags.coach_feature).toBe(false);
  });
});

// ── user_type rule ────────────────────────────────────────────────────────────

describe("user_type rule", () => {
  it("returns true for onboarded users when rule is 'onboarded'", async () => {
    mockFlags([{
      id: "1", name: "onboarded_feature", enabled: true,
      rules: [{ type: "user_type", values: ["onboarded"] }],
    }]);
    mockDb({ user: { onboarded_at: new Date() } });
    const flags = await resolveFlags("user-1", null);
    expect(flags.onboarded_feature).toBe(true);
  });

  it("returns false for registered (not onboarded) users when rule is 'onboarded'", async () => {
    mockFlags([{
      id: "1", name: "onboarded_feature", enabled: true,
      rules: [{ type: "user_type", values: ["onboarded"] }],
    }]);
    mockDb({ user: { onboarded_at: null } });
    const flags = await resolveFlags("user-1", null);
    expect(flags.onboarded_feature).toBe(false);
  });

  it("returns true for registered users when rule includes 'registered'", async () => {
    mockFlags([{
      id: "1", name: "registered_feature", enabled: true,
      rules: [{ type: "user_type", values: ["registered"] }],
    }]);
    mockDb({ user: { onboarded_at: null } });
    const flags = await resolveFlags("user-1", null);
    expect(flags.registered_feature).toBe(true);
  });
});

// ── rollout_percentage rule ───────────────────────────────────────────────────

describe("rollout_percentage rule", () => {
  it("returns true when user bucket < rollout value", async () => {
    // Find a userId whose bucket is definitely < 100 (i.e. always in at 100%)
    const userId = "user-rollout-test";
    mockFlags([{
      id: "1", name: "rollout_flag", enabled: true,
      rules: [{ type: "rollout_percentage", value: 100 }],
    }]);
    mockDb();
    const flags = await resolveFlags(userId, null);
    expect(flags.rollout_flag).toBe(true);
  });

  it("returns false when rollout is 0%", async () => {
    mockFlags([{
      id: "1", name: "rollout_flag", enabled: true,
      rules: [{ type: "rollout_percentage", value: 0 }],
    }]);
    mockDb();
    const flags = await resolveFlags("user-1", null);
    expect(flags.rollout_flag).toBe(false);
  });

  it("is stable — same user always gets same result", async () => {
    const userId = "stable-user-abc";
    const flagName = "stable_rollout";
    const bucket = stickySample(userId, flagName);
    const threshold = bucket + 1; // flag at threshold+1% always includes this user

    for (let i = 0; i < 3; i++) {
      mockFlags([{
        id: "1", name: flagName, enabled: true,
        rules: [{ type: "rollout_percentage", value: threshold }],
      }]);
      mockDb();
      const flags = await resolveFlags(userId, null);
      expect(flags[flagName]).toBe(true);
    }
  });
});

// ── geolocation rule ──────────────────────────────────────────────────────────

// Note: geoip-lite is a CJS module. Vitest's ESM-CJS boundary means the
// lookup mock instance in this file may differ from the one featureFlags.js
// holds, making direct geo mocking unreliable in unit tests.
// Full geolocation behaviour is covered by integration tests against the API.
// Here we test the two logic paths that DON'T require a real geo lookup:

describe("geolocation rule", () => {
  it("returns true when countries is empty (match all) — no IP needed", async () => {
    // countries:[] + states:[] means any IP passes
    mockFlags([{
      id: "1", name: "global_feature", enabled: true,
      rules: [{ type: "geolocation", countries: [], states: [] }],
    }]);
    mockDb();
    const flags = await resolveFlags("user-1", null);
    expect(flags.global_feature).toBe(true);
  });

  it("returns false when countries filter is set and IP resolves to null geo", async () => {
    // geoip returns null for unknown IPs → ctx.country = null → not in ["US"]
    mockFlags([{
      id: "1", name: "us_feature", enabled: true,
      rules: [{ type: "geolocation", countries: ["US"], states: [] }],
    }]);
    mockDb();
    // Pass null IP — geoip.lookup will return null → country = null → no match
    const flags = await resolveFlags("user-1", null);
    expect(flags.us_feature).toBe(false);
  });

  it("returns false when state filter set and IP has no geo info", async () => {
    mockFlags([{
      id: "1", name: "ohio_feature", enabled: true,
      rules: [{ type: "geolocation", countries: ["US"], states: ["OH"] }],
    }]);
    mockDb();
    const flags = await resolveFlags("user-1", null);
    expect(flags.ohio_feature).toBe(false);
  });
});

// ── AND logic (multiple rules) ────────────────────────────────────────────────

describe("AND rule evaluation", () => {
  it("returns true only when all rules match (sport + role)", async () => {
    mockFlags([{
      id: "1", name: "combined_feature", enabled: true,
      rules: [
        { type: "sport",     values: ["rugby"] },
        { type: "team_role", roles: ["coach"] },
      ],
    }]);
    mockDb({ memberships: [{ role: "coach", sport: "rugby" }] });
    const flags = await resolveFlags("user-1", null);
    expect(flags.combined_feature).toBe(true);
  });

  it("returns false when first rule matches but second does not", async () => {
    mockFlags([{
      id: "1", name: "combined_feature", enabled: true,
      rules: [
        { type: "sport",     values: ["rugby"] },
        { type: "team_role", roles: ["owner"] },  // user is coach, not owner
      ],
    }]);
    mockDb({ memberships: [{ role: "coach", sport: "rugby" }] });
    const flags = await resolveFlags("user-1", null);
    expect(flags.combined_feature).toBe(false);
  });

  it("returns false when second rule matches but first does not", async () => {
    mockFlags([{
      id: "1", name: "combined_feature", enabled: true,
      rules: [
        { type: "sport",     values: ["football"] }, // user is on rugby team
        { type: "team_role", roles: ["coach"] },
      ],
    }]);
    mockDb({ memberships: [{ role: "coach", sport: "rugby" }] });
    const flags = await resolveFlags("user-1", null);
    expect(flags.combined_feature).toBe(false);
  });
});
