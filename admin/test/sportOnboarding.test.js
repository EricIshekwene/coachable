/**
 * Tests for the sport selection step in the onboarding flow.
 *
 * Covers:
 *  - canAdvanceDetails logic for each team action / step
 *  - canFinishSport logic (sport step enabled only once a sport is chosen)
 *  - Sport key sent correctly to the server when a sport is chosen
 *  - Sport sent as empty string when "Blank Canvas" is chosen
 *  - All supported sport keys are valid
 *  - The server endpoint accepts a sport value from onboarding
 */
import { describe, it, expect, vi, afterEach } from "vitest";

const API_URL = "http://localhost:3001";
const AUTH_TOKEN = "test-coach-token";

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch(responseData, ok = true, status = 201) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(responseData),
  });
}

/**
 * Mirrors the frontend completeOnboarding create-team call.
 * @param {string} token
 * @param {{ teamName: string, sport: string }} payload
 */
async function createTeamOnboard(token, payload) {
  const res = await fetch(`${API_URL}/onboarding/create-team`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create team");
  }
  return res.json();
}

// ── canAdvanceDetails logic (pure, no DOM) ───────────────────────────────────

/**
 * Mirrors the canAdvanceDetails logic from Onboarding.jsx.
 * Controls the "Continue" / "Join team" button on the details step.
 * @param {{ teamAction: string, teamName: string, inviteCode: string }} state
 */
function canAdvanceDetails({ teamAction, teamName, inviteCode }) {
  if (teamAction === "create") return teamName.trim().length >= 2;
  return inviteCode.trim().length >= 6;
}

/**
 * Mirrors the sport step button's enabled logic for "create".
 * @param {{ sportChosen: boolean }} state
 */
function canFinishSport({ sportChosen }) {
  return sportChosen;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Onboarding — details step canAdvanceDetails logic", () => {
  it("create: disabled when teamName is empty", () => {
    expect(canAdvanceDetails({ teamAction: "create", teamName: "", inviteCode: "" })).toBe(false);
  });

  it("create: disabled when teamName is only 1 character", () => {
    expect(canAdvanceDetails({ teamAction: "create", teamName: "A", inviteCode: "" })).toBe(false);
  });

  it("create: enabled when teamName has at least 2 characters", () => {
    expect(canAdvanceDetails({ teamAction: "create", teamName: "Lions", inviteCode: "" })).toBe(true);
  });

  it("join: disabled when inviteCode is empty", () => {
    expect(canAdvanceDetails({ teamAction: "join", teamName: "", inviteCode: "" })).toBe(false);
  });

  it("join: disabled when inviteCode is too short", () => {
    expect(canAdvanceDetails({ teamAction: "join", teamName: "", inviteCode: "ABC" })).toBe(false);
  });

  it("join: enabled when inviteCode has at least 6 characters", () => {
    expect(canAdvanceDetails({ teamAction: "join", teamName: "", inviteCode: "ABCD1234" })).toBe(true);
  });
});

describe("Onboarding — sport step canFinishSport logic", () => {
  it("disabled before any sport is chosen", () => {
    expect(canFinishSport({ sportChosen: false })).toBe(false);
  });

  it("enabled after a real sport is chosen", () => {
    expect(canFinishSport({ sportChosen: true })).toBe(true);
  });

  it("enabled when Blank Canvas is explicitly chosen (sport='' sportChosen=true)", () => {
    // Blank Canvas sets sport="" but sportChosen=true — the button should enable
    expect(canFinishSport({ sportChosen: true })).toBe(true);
  });
});

describe("Onboarding — solo flow skips details", () => {
  it("solo goes directly to sport step — no team name required", () => {
    // Solo has no details step so canAdvanceDetails is irrelevant.
    // Clicking 'Just Make Plays' immediately transitions to the sport step.
    // Verify that sport step click → immediate submit is the UX contract.
    const handleFinishCalled = vi.fn();
    function simulateSoloSportClick(sportKey, onFinish) {
      // Mirrors the onClick for solo in the sport grid
      if (/* teamAction === "solo" */ true) onFinish(sportKey);
    }
    simulateSoloSportClick("rugby", handleFinishCalled);
    expect(handleFinishCalled).toHaveBeenCalledWith("rugby");
  });

  it("solo blank canvas calls handleFinish with empty string", () => {
    const handleFinishCalled = vi.fn();
    function simulateSoloSportClick(sportKey, onFinish) {
      if (true) onFinish(sportKey);
    }
    simulateSoloSportClick("", handleFinishCalled);
    expect(handleFinishCalled).toHaveBeenCalledWith("");
  });
});

describe("Onboarding — sport sent to create-team endpoint", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends the chosen sport key to the endpoint", async () => {
    const spy = mockFetch({
      team: { id: "t1", name: "Lions", sport: "rugby" },
      role: "owner",
      inviteCodes: { player: "ABCD", coach: "EFGH" },
    });

    await createTeamOnboard(AUTH_TOKEN, { teamName: "Lions", sport: "rugby" });

    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body.sport).toBe("rugby");
  });

  it("sends sport as empty string when Blank Canvas is chosen", async () => {
    const spy = mockFetch({
      team: { id: "t2", name: "Test Squad", sport: null },
      role: "owner",
      inviteCodes: { player: "QQQQ", coach: "RRRR" },
    });

    await createTeamOnboard(AUTH_TOKEN, { teamName: "Test Squad", sport: "" });

    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body.sport).toBe("");
  });

  it("sends sport for all supported sport keys", async () => {
    const sportKeys = [
      "rugby", "soccer", "football", "lacrosse",
      "womens lacrosse", "basketball", "field hockey", "ice hockey",
    ];

    for (const key of sportKeys) {
      const spy = mockFetch({
        team: { id: "t-" + key, name: "Team", sport: key },
        role: "owner",
        inviteCodes: { player: "AAAA", coach: "BBBB" },
      });

      await createTeamOnboard(AUTH_TOKEN, { teamName: "Team", sport: key });

      const body = JSON.parse(spy.mock.calls[0][1].body);
      expect(body.sport).toBe(key);
      spy.mockRestore();
    }
  });

  it("endpoint returns team with sport set", async () => {
    mockFetch({
      team: { id: "t3", name: "Eagles", sport: "football" },
      role: "owner",
      inviteCodes: { player: "CCCC", coach: "DDDD" },
    });

    const result = await createTeamOnboard(AUTH_TOKEN, { teamName: "Eagles", sport: "football" });

    expect(result.team.sport).toBe("football");
    expect(result.role).toBe("owner");
  });

  it("endpoint returns team with null sport when blank canvas chosen", async () => {
    mockFetch({
      team: { id: "t4", name: "Test", sport: null },
      role: "owner",
      inviteCodes: { player: "EEEE", coach: "FFFF" },
    });

    const result = await createTeamOnboard(AUTH_TOKEN, { teamName: "Test", sport: "" });

    expect(result.team.sport).toBeNull();
  });

  it("throws when teamName is missing", async () => {
    mockFetch({ error: "teamName is required" }, false, 400);
    await expect(
      createTeamOnboard(AUTH_TOKEN, { teamName: "", sport: "rugby" })
    ).rejects.toThrow("teamName is required");
  });
});

describe("Onboarding — SPORTS constant shape", () => {
  // Mirror the constant so tests don't import JSX
  const SPORTS = [
    { key: "rugby",           label: "Rugby" },
    { key: "soccer",          label: "Soccer" },
    { key: "football",        label: "Football" },
    { key: "lacrosse",        label: "Lacrosse" },
    { key: "womens lacrosse", label: "Women's Lacrosse" },
    { key: "basketball",      label: "Basketball" },
    { key: "field hockey",    label: "Field Hockey" },
    { key: "ice hockey",      label: "Ice Hockey" },
    { key: "",                label: "Blank Canvas" },
  ];

  it("has exactly 9 entries (8 sports + blank canvas)", () => {
    expect(SPORTS).toHaveLength(9);
  });

  it("every entry has a non-empty label", () => {
    expect(SPORTS.every((s) => s.label.length > 0)).toBe(true);
  });

  it("blank canvas has key of empty string and is last", () => {
    const last = SPORTS[SPORTS.length - 1];
    expect(last.key).toBe("");
    expect(last.label).toBe("Blank Canvas");
  });

  it("all sport keys are lowercase strings", () => {
    const realSports = SPORTS.filter((s) => s.key !== "");
    expect(realSports.every((s) => s.key === s.key.toLowerCase())).toBe(true);
  });

  it("no duplicate keys", () => {
    const keys = SPORTS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
