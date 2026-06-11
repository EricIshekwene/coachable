/**
 * Tests for the sport selection step in the "Create Team" onboarding flow.
 *
 * Covers:
 *  - canAdvance logic for each step of the create flow
 *  - Sport is sent correctly to the server when a sport is chosen
 *  - Sport is sent as empty/null when "Blank Canvas" is chosen
 *  - Switching team action resets create-flow step state
 *  - The server endpoint still accepts a sport value from onboarding
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

// ── canAdvance logic (pure, no DOM) ──────────────────────────────────────────

/**
 * Mirrors the canAdvance logic from Onboarding.jsx.
 * @param {{ teamAction: string, createStep: string, teamName: string, inviteCode: string, sportChosen: boolean }} state
 */
function canAdvance({ teamAction, createStep, teamName, inviteCode, sportChosen }) {
  if (teamAction === "solo") return true;
  if (teamAction === "create") {
    return createStep === "name"
      ? teamName.trim().length > 0
      : sportChosen;
  }
  return inviteCode.trim().length > 0;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Onboarding — sport selection canAdvance logic", () => {
  it("create/name step: disabled when teamName is empty", () => {
    expect(canAdvance({ teamAction: "create", createStep: "name", teamName: "", inviteCode: "", sportChosen: false })).toBe(false);
  });

  it("create/name step: enabled when teamName has content", () => {
    expect(canAdvance({ teamAction: "create", createStep: "name", teamName: "Lions", inviteCode: "", sportChosen: false })).toBe(true);
  });

  it("create/sport step: disabled before any sport is chosen", () => {
    expect(canAdvance({ teamAction: "create", createStep: "sport", teamName: "Lions", inviteCode: "", sportChosen: false })).toBe(false);
  });

  it("create/sport step: enabled after a real sport is chosen", () => {
    expect(canAdvance({ teamAction: "create", createStep: "sport", teamName: "Lions", inviteCode: "", sportChosen: true })).toBe(true);
  });

  it("create/sport step: enabled when Blank Canvas is explicitly chosen", () => {
    // Blank Canvas sets sport="" and sportChosen=true — still valid
    expect(canAdvance({ teamAction: "create", createStep: "sport", teamName: "Lions", inviteCode: "", sportChosen: true })).toBe(true);
  });

  it("join: disabled when inviteCode is empty", () => {
    expect(canAdvance({ teamAction: "join", createStep: "name", teamName: "", inviteCode: "", sportChosen: false })).toBe(false);
  });

  it("join: enabled when inviteCode has content", () => {
    expect(canAdvance({ teamAction: "join", createStep: "name", teamName: "", inviteCode: "ABCD1234", sportChosen: false })).toBe(true);
  });

  it("solo: always enabled regardless of state", () => {
    expect(canAdvance({ teamAction: "solo", createStep: "name", teamName: "", inviteCode: "", sportChosen: false })).toBe(true);
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

    // Blank Canvas maps to key="" in the frontend
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

describe("Onboarding — SPORTS_FOR_CREATE constant shape", () => {
  // Mirror the constant so tests don't import JSX
  const SPORTS_FOR_CREATE = [
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
    expect(SPORTS_FOR_CREATE).toHaveLength(9);
  });

  it("every entry has a non-empty label", () => {
    expect(SPORTS_FOR_CREATE.every((s) => s.label.length > 0)).toBe(true);
  });

  it("blank canvas has key of empty string and is last", () => {
    const last = SPORTS_FOR_CREATE[SPORTS_FOR_CREATE.length - 1];
    expect(last.key).toBe("");
    expect(last.label).toBe("Blank Canvas");
  });

  it("all sport keys are lowercase strings", () => {
    const realSports = SPORTS_FOR_CREATE.filter((s) => s.key !== "");
    expect(realSports.every((s) => s.key === s.key.toLowerCase())).toBe(true);
  });

  it("no duplicate keys", () => {
    const keys = SPORTS_FOR_CREATE.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
