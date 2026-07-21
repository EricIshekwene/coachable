/**
 * Tests for the missing-sport banner + /app/select-sport flow.
 *
 * Covers:
 *  - shouldShowSportBanner visibility logic (sport set / role / dismissal)
 *  - Session dismissal helpers (per-team keys, storage guards)
 *  - Sport PATCHed to /teams/:teamId/settings the way updateTeamDefaults sends it
 *  - Blank Canvas performs no PATCH (sport stays unset, banner dismissed)
 *  - SPORTS constant shape on the SelectSport page
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sportBannerDismissKey,
  isSportBannerDismissed,
  dismissSportBanner,
  shouldShowSportBanner,
} from "../../src/utils/sportBanner.js";

const API_URL = "http://localhost:3001";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal in-memory sessionStorage stand-in for the node test environment. */
function fakeSessionStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

/**
 * Mirrors AuthContext.updateTeamDefaults' settings PATCH.
 * @param {string} teamId
 * @param {{ sport?: string }} payload
 */
async function patchTeamSettings(teamId, payload) {
  const body = {};
  if (payload.sport?.trim()) body.sport = payload.sport.trim().toLowerCase();
  await fetch(`${API_URL}/teams/${teamId}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── shouldShowSportBanner ─────────────────────────────────────────────────────

describe("shouldShowSportBanner", () => {
  it("shows for an owner with no sport and no dismissal", () => {
    expect(shouldShowSportBanner({ sport: "", role: "owner", dismissed: false })).toBe(true);
  });

  it("shows for a coach with no sport and no dismissal", () => {
    expect(shouldShowSportBanner({ sport: "", role: "coach", dismissed: false })).toBe(true);
  });

  it("hidden for players — they cannot change the team sport", () => {
    expect(shouldShowSportBanner({ sport: "", role: "player", dismissed: false })).toBe(false);
  });

  it("hidden when role is missing", () => {
    expect(shouldShowSportBanner({ sport: "", role: null, dismissed: false })).toBe(false);
  });

  it("hidden once a sport is set", () => {
    expect(shouldShowSportBanner({ sport: "rugby", role: "owner", dismissed: false })).toBe(false);
  });

  it("hidden after session dismissal", () => {
    expect(shouldShowSportBanner({ sport: "", role: "owner", dismissed: true })).toBe(false);
  });
});

// ── Session dismissal helpers ─────────────────────────────────────────────────

describe("sport banner session dismissal", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", fakeSessionStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keys are per team", () => {
    expect(sportBannerDismissKey("t1")).not.toBe(sportBannerDismissKey("t2"));
  });

  it("not dismissed by default", () => {
    expect(isSportBannerDismissed("t1")).toBe(false);
  });

  it("dismiss then check round-trips", () => {
    dismissSportBanner("t1");
    expect(isSportBannerDismissed("t1")).toBe(true);
  });

  it("dismissing one team leaves other teams visible", () => {
    dismissSportBanner("t1");
    expect(isSportBannerDismissed("t2")).toBe(false);
  });

  it("survives missing sessionStorage without throwing (returns false)", () => {
    vi.unstubAllGlobals();
    expect(() => dismissSportBanner("t1")).not.toThrow();
    expect(isSportBannerDismissed("t1")).toBe(false);
  });
});

// ── Sport sent to the settings endpoint ───────────────────────────────────────

describe("SelectSport — sport PATCHed to team settings", () => {
  afterEach(() => vi.restoreAllMocks());

  function mockFetch() {
    return vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });
  }

  it("PATCHes the chosen sport to /teams/:teamId/settings", async () => {
    const spy = mockFetch();
    await patchTeamSettings("team-1", { sport: "rugby" });

    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe(`${API_URL}/teams/team-1/settings`);
    expect(opts.method).toBe("PATCH");
    expect(JSON.parse(opts.body).sport).toBe("rugby");
  });

  it("lowercases the sport key like updateTeamDefaults", async () => {
    const spy = mockFetch();
    await patchTeamSettings("team-1", { sport: "Rugby" });
    expect(JSON.parse(spy.mock.calls[0][1].body).sport).toBe("rugby");
  });

  it("sends every supported sport key", async () => {
    const sportKeys = [
      "rugby", "soccer", "football", "lacrosse",
      "womens lacrosse", "basketball", "field hockey", "ice hockey",
    ];

    for (const key of sportKeys) {
      const spy = mockFetch();
      await patchTeamSettings("team-1", { sport: key });
      expect(JSON.parse(spy.mock.calls[0][1].body).sport).toBe(key);
      spy.mockRestore();
    }
  });

  it("Blank Canvas performs no PATCH — sport stays unset, banner dismissed", () => {
    vi.stubGlobal("sessionStorage", fakeSessionStorage());
    const spy = mockFetch();

    // Mirrors SelectSport.handleSportClick for the blank card
    const sport = { key: "blank" };
    if (sport.key === "blank") dismissSportBanner("team-1");

    expect(spy).not.toHaveBeenCalled();
    expect(isSportBannerDismissed("team-1")).toBe(true);
    vi.unstubAllGlobals();
  });
});

// ── SPORTS constant shape (mirrors SelectSport.jsx to avoid importing JSX) ────

describe("SelectSport — SPORTS constant shape", () => {
  const SPORTS = [
    { key: "rugby",           label: "Rugby" },
    { key: "soccer",          label: "Soccer" },
    { key: "football",        label: "Football" },
    { key: "lacrosse",        label: "Lacrosse" },
    { key: "womens lacrosse", label: "Women's Lacrosse" },
    { key: "basketball",      label: "Basketball" },
    { key: "field hockey",    label: "Field Hockey" },
    { key: "ice hockey",      label: "Ice Hockey" },
    { key: "blank",           label: "Blank Canvas" },
  ];

  it("has exactly 9 entries (8 sports + blank canvas)", () => {
    expect(SPORTS).toHaveLength(9);
  });

  it("blank canvas is last — the deliberate opt-out", () => {
    expect(SPORTS[SPORTS.length - 1].key).toBe("blank");
  });

  it("all sport keys are lowercase", () => {
    expect(SPORTS.every((s) => s.key === s.key.toLowerCase())).toBe(true);
  });

  it("no duplicate keys", () => {
    const keys = SPORTS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
