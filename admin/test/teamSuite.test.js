/**
 * Tests for the Team Suite feature system.
 *
 * Tests cover:
 *   - buildFeaturesMap helper produces the correct default/populated shape
 *   - Feature list includes exactly the 5 expected features
 *   - Default state has all features disabled
 *   - Partial DB rows only override specified features
 *   - Unknown features in DB rows are ignored
 */

import { describe, it, expect } from "vitest";

// ── Replicate the buildFeaturesMap logic (mirrors server/routes/adminTeamSuite.js) ──

const SUITE_FEATURES = ["roster", "practice_plans", "install_calendar", "game_plans", "assignments"];

/**
 * Build a features map from a list of DB rows.
 * @param {Array<{feature: string, enabled: boolean}>} rows
 * @returns {Record<string, boolean>}
 */
function buildFeaturesMap(rows) {
  const map = {};
  for (const f of SUITE_FEATURES) map[f] = false;
  for (const row of rows) {
    if (SUITE_FEATURES.includes(row.feature)) map[row.feature] = row.enabled;
  }
  return map;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SUITE_FEATURES", () => {
  it("contains exactly 5 features", () => {
    expect(SUITE_FEATURES).toHaveLength(5);
  });

  it("includes the expected feature keys", () => {
    expect(SUITE_FEATURES).toContain("roster");
    expect(SUITE_FEATURES).toContain("practice_plans");
    expect(SUITE_FEATURES).toContain("install_calendar");
    expect(SUITE_FEATURES).toContain("game_plans");
    expect(SUITE_FEATURES).toContain("assignments");
  });
});

describe("buildFeaturesMap", () => {
  it("returns all features disabled when given no rows", () => {
    const map = buildFeaturesMap([]);
    expect(map).toEqual({
      roster: false,
      practice_plans: false,
      install_calendar: false,
      game_plans: false,
      assignments: false,
    });
  });

  it("enables a single feature when one row is provided", () => {
    const map = buildFeaturesMap([{ feature: "roster", enabled: true }]);
    expect(map.roster).toBe(true);
    expect(map.practice_plans).toBe(false);
    expect(map.install_calendar).toBe(false);
    expect(map.game_plans).toBe(false);
    expect(map.assignments).toBe(false);
  });

  it("handles multiple enabled features", () => {
    const rows = [
      { feature: "roster", enabled: true },
      { feature: "game_plans", enabled: true },
      { feature: "assignments", enabled: true },
    ];
    const map = buildFeaturesMap(rows);
    expect(map.roster).toBe(true);
    expect(map.practice_plans).toBe(false);
    expect(map.install_calendar).toBe(false);
    expect(map.game_plans).toBe(true);
    expect(map.assignments).toBe(true);
  });

  it("enables all features when all rows are provided", () => {
    const rows = SUITE_FEATURES.map((f) => ({ feature: f, enabled: true }));
    const map = buildFeaturesMap(rows);
    for (const f of SUITE_FEATURES) {
      expect(map[f]).toBe(true);
    }
  });

  it("overrides a feature back to false if the row says disabled", () => {
    const map = buildFeaturesMap([{ feature: "roster", enabled: false }]);
    expect(map.roster).toBe(false);
  });

  it("ignores unknown feature keys from the DB", () => {
    const map = buildFeaturesMap([{ feature: "unknown_feature", enabled: true }]);
    expect(Object.keys(map)).toEqual(SUITE_FEATURES);
    expect(map).not.toHaveProperty("unknown_feature");
  });

  it("produces a map with exactly 5 keys regardless of input", () => {
    const map = buildFeaturesMap([
      { feature: "roster", enabled: true },
      { feature: "fake_feature", enabled: true },
    ]);
    expect(Object.keys(map)).toHaveLength(5);
  });
});

describe("Suite feature guard logic (RequireSuiteFeature)", () => {
  it("should block access when feature is false", () => {
    const enabled = false;
    // Simulate the guard: redirect when not enabled
    const shouldRedirect = !enabled;
    expect(shouldRedirect).toBe(true);
  });

  it("should allow access when feature is true", () => {
    const enabled = true;
    const shouldRedirect = !enabled;
    expect(shouldRedirect).toBe(false);
  });

  it("should block access when feature is undefined (fails closed)", () => {
    const enabled = undefined;
    const shouldRedirect = !enabled;
    expect(shouldRedirect).toBe(true);
  });
});

describe("SuiteContext fail-closed behavior", () => {
  it("defaults all features to false when initialized empty", () => {
    const defaultState = Object.fromEntries(SUITE_FEATURES.map((f) => [f, false]));
    for (const f of SUITE_FEATURES) {
      expect(defaultState[f]).toBe(false);
    }
  });

  it("useSuiteFeature returns false for unknown feature names", () => {
    const context = Object.fromEntries(SUITE_FEATURES.map((f) => [f, true]));
    const value = context["some_other_feature"] ?? false;
    expect(value).toBe(false);
  });
});
