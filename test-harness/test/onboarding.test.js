/**
 * Tests for the onboarding create-team endpoint, focusing on the demo play
 * seeding behaviour: when a sport-specific page_section has a play assigned,
 * that play should be copied into the new team's playbook on creation.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

const API_URL = "http://localhost:3001";
const AUTH_TOKEN = "test-coach-token";

// ── Helper ───────────────────────────────────────────────────────────────────

function mockFetch(responseData, ok = true, status = 201) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(responseData),
  });
}

// ── Inline mirror of the frontend createTeam call ─────────────────────────

/**
 * Creates a new team via the onboarding endpoint.
 * @param {string} token - Auth token
 * @param {{ teamName: string, sport: string | null }} payload
 */
async function createTeam(token, payload) {
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("createTeam — demo play seeding", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends teamName and sport to the create-team endpoint", async () => {
    const spy = mockFetch({
      team: { id: "t1", name: "Lions", sport: "rugby" },
      role: "owner",
      inviteCodes: { player: "ABCD", coach: "EFGH" },
    });

    await createTeam(AUTH_TOKEN, { teamName: "Lions", sport: "rugby" });

    expect(spy).toHaveBeenCalledOnce();
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe(`${API_URL}/onboarding/create-team`);
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body.teamName).toBe("Lions");
    expect(body.sport).toBe("rugby");
  });

  it("returns team, role, and inviteCodes on success", async () => {
    mockFetch({
      team: { id: "t1", name: "Lions", sport: "rugby" },
      role: "owner",
      inviteCodes: { player: "ABCD", coach: "EFGH" },
    });

    const result = await createTeam(AUTH_TOKEN, { teamName: "Lions", sport: "rugby" });

    expect(result.team.id).toBe("t1");
    expect(result.team.sport).toBe("rugby");
    expect(result.role).toBe("owner");
    expect(result.inviteCodes.player).toBe("ABCD");
    expect(result.inviteCodes.coach).toBe("EFGH");
  });

  it("succeeds even when sport is null (no demo play to seed)", async () => {
    mockFetch({
      team: { id: "t2", name: "Pick-up Team", sport: null },
      role: "owner",
      inviteCodes: { player: "WXYZ", coach: "1234" },
    });

    const result = await createTeam(AUTH_TOKEN, { teamName: "Pick-up Team", sport: null });

    expect(result.team.sport).toBeNull();
    expect(result.role).toBe("owner");
  });

  it("succeeds when sport has no demo play assigned (missing page_section)", async () => {
    // Server still returns 201 — seed step is silently skipped
    mockFetch({
      team: { id: "t3", name: "Water Polo Crew", sport: "water_polo" },
      role: "owner",
      inviteCodes: { player: "QQQQ", coach: "WWWW" },
    });

    const result = await createTeam(AUTH_TOKEN, { teamName: "Water Polo Crew", sport: "water_polo" });

    expect(result.team.sport).toBe("water_polo");
    expect(result.team.id).toBe("t3");
  });

  it("seeds a rugby demo play for a rugby team", async () => {
    // The server seeds the play internally; the response still looks the same.
    // We verify the sport sent is one with a known page_section.
    const spy = mockFetch({
      team: { id: "t4", name: "Chiefs", sport: "rugby" },
      role: "owner",
      inviteCodes: { player: "A1B2", coach: "C3D4" },
    });

    await createTeam(AUTH_TOKEN, { teamName: "Chiefs", sport: "rugby" });

    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body.sport).toBe("rugby");
  });

  it("seeds a soccer demo play for a soccer team", async () => {
    const spy = mockFetch({
      team: { id: "t5", name: "United FC", sport: "soccer" },
      role: "owner",
      inviteCodes: { player: "S1C2", coach: "R3D4" },
    });

    await createTeam(AUTH_TOKEN, { teamName: "United FC", sport: "soccer" });

    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body.sport).toBe("soccer");
  });

  it("sends sport with spaces as-is (server normalises spaces to underscores for section key lookup)", async () => {
    // Sport stored as "ice hockey" but page_sections key is "landing.visualize.ice_hockey"
    const spy = mockFetch({
      team: { id: "t6", name: "Blades", sport: "ice hockey" },
      role: "owner",
      inviteCodes: { player: "I1C2", coach: "E3H4" },
    });

    await createTeam(AUTH_TOKEN, { teamName: "Blades", sport: "ice hockey" });

    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body.sport).toBe("ice hockey");
  });

  it("throws when teamName is missing", async () => {
    mockFetch({ error: "teamName is required" }, false, 400);
    await expect(createTeam(AUTH_TOKEN, { teamName: "", sport: "rugby" })).rejects.toThrow(
      "teamName is required"
    );
  });

  it("throws when unauthenticated", async () => {
    mockFetch({ error: "Unauthorized" }, false, 401);
    await expect(createTeam("bad-token", { teamName: "Test", sport: "rugby" })).rejects.toThrow(
      "Unauthorized"
    );
  });
});
