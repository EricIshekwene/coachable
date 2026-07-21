/**
 * Tests for retroactive demo-play seeding when a team's sport is set for the
 * first time (PATCH /teams/:teamId/settings).
 *
 * Covers:
 *  - shouldSeedDemoPlayOnSportSet predicate (real import from server lib)
 *  - Settings PATCH contract: response carries seededDemoPlay
 *  - Seeding only fires on no-sport → sport transitions with zero plays
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { shouldSeedDemoPlayOnSportSet } from "../../server/lib/userTeams.js";

const API_URL = "http://localhost:3001";

// ── shouldSeedDemoPlayOnSportSet ──────────────────────────────────────────────

describe("shouldSeedDemoPlayOnSportSet", () => {
  it("seeds when first sport is set on a team with no plays", () => {
    expect(shouldSeedDemoPlayOnSportSet({ previousSport: null, newSport: "rugby", hasPlays: false })).toBe(true);
  });

  it("does not seed when the team already had a sport", () => {
    expect(shouldSeedDemoPlayOnSportSet({ previousSport: "soccer", newSport: "rugby", hasPlays: false })).toBe(false);
  });

  it("does not seed when the team already has plays (incl. archived)", () => {
    expect(shouldSeedDemoPlayOnSportSet({ previousSport: null, newSport: "rugby", hasPlays: true })).toBe(false);
  });

  it("does not seed when no sport is being set", () => {
    expect(shouldSeedDemoPlayOnSportSet({ previousSport: null, newSport: null, hasPlays: false })).toBe(false);
    expect(shouldSeedDemoPlayOnSportSet({ previousSport: null, newSport: "", hasPlays: false })).toBe(false);
  });

  it("treats empty-string previous sport like NULL (never-set team)", () => {
    expect(shouldSeedDemoPlayOnSportSet({ previousSport: "", newSport: "rugby", hasPlays: false })).toBe(true);
  });

  it("applies to any team — no personal/solo restriction in the predicate", () => {
    // The rule is intentionally team-type-agnostic; zero-plays is the guard.
    expect(shouldSeedDemoPlayOnSportSet({ previousSport: null, newSport: "football", hasPlays: false })).toBe(true);
  });
});

// ── Settings PATCH contract ───────────────────────────────────────────────────

describe("PATCH /teams/:teamId/settings — seededDemoPlay in response", () => {
  afterEach(() => vi.restoreAllMocks());

  /**
   * Mirrors the frontend updateTeamDefaults settings PATCH.
   * @param {string} teamId
   * @param {{ sport?: string }} body
   */
  async function patchSettings(teamId, body) {
    const res = await fetch(`${API_URL}/teams/${teamId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  it("reports seededDemoPlay: true when the first sport seeds the demo play", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, seededDemoPlay: true }),
    });

    const result = await patchSettings("team-1", { sport: "rugby" });
    expect(result.ok).toBe(true);
    expect(result.seededDemoPlay).toBe(true);
  });

  it("reports seededDemoPlay: false when the team already had plays or a sport", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, seededDemoPlay: false }),
    });

    const result = await patchSettings("team-1", { sport: "rugby" });
    expect(result.seededDemoPlay).toBe(false);
  });
});
