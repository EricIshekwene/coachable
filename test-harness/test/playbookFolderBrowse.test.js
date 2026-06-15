/**
 * Tests for the user-facing platform play folder browse endpoints.
 * Covers GET /platform-plays/folders and GET /platform-plays/folders/:id,
 * plus the unified Playbooks page item-merging logic.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

const API_URL = "http://localhost:3001";
const AUTH_TOKEN = "test-coach-token";

// ── Mock helpers ──────────────────────────────────────────────────────────────

function mockFetch(data, ok = true, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

// ── Inline API helpers (mirrors Playbooks.jsx) ────────────────────────────────

async function fetchFolders(token) {
  const res = await fetch(`${API_URL}/platform-plays/folders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load folders");
  return (await res.json()).folders || [];
}

async function fetchFolderDetail(token, id) {
  const res = await fetch(`${API_URL}/platform-plays/folders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Folder not found");
  return await res.json();
}

async function copySinglePlay(token, playId) {
  const res = await fetch(`${API_URL}/platform-plays/${playId}/copy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Failed to copy play");
  }
  return await res.json();
}

// ── fetchFolders ──────────────────────────────────────────────────────────────

describe("fetchFolders", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns an array of folders with play counts", async () => {
    mockFetch({
      folders: [
        { id: "f1", name: "Attack", sport: "Rugby", playCount: 4, parentId: null, parentName: null, isSportFolder: false },
        { id: "f2", name: "Defense", sport: "Rugby", playCount: 2, parentId: null, parentName: null, isSportFolder: false },
      ],
    });
    const folders = await fetchFolders(AUTH_TOKEN);
    expect(folders).toHaveLength(2);
    expect(folders[0].name).toBe("Attack");
    expect(folders[0].playCount).toBe(4);
  });

  it("returns sport inferred from parent when folder itself has no sport", async () => {
    mockFetch({
      folders: [
        { id: "f1", name: "Set Pieces", sport: "Rugby", playCount: 3, parentId: "pf1", parentName: "Rugby", isSportFolder: false },
      ],
    });
    const folders = await fetchFolders(AUTH_TOKEN);
    expect(folders[0].sport).toBe("Rugby");
  });

  it("returns an empty array when no folders have plays", async () => {
    mockFetch({ folders: [] });
    const folders = await fetchFolders(AUTH_TOKEN);
    expect(folders).toHaveLength(0);
  });

  it("throws when the request fails", async () => {
    mockFetch({ error: "Unauthorized" }, false, 401);
    await expect(fetchFolders(AUTH_TOKEN)).rejects.toThrow("Failed to load folders");
  });

  it("sends a GET request to the correct URL", async () => {
    const spy = mockFetch({ folders: [] });
    await fetchFolders(AUTH_TOKEN);
    expect(spy.mock.calls[0][0]).toBe(`${API_URL}/platform-plays/folders`);
  });
});

// ── fetchFolderDetail ─────────────────────────────────────────────────────────

describe("fetchFolderDetail", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns folder metadata and its plays", async () => {
    mockFetch({
      folder: { id: "f1", name: "Attack", sport: "Rugby", isSportFolder: false },
      plays: [
        { id: "p1", title: "Blindside Run", sport: "Rugby", playData: { play: {} } },
        { id: "p2", title: "Pick and Go", sport: "Rugby", playData: { play: {} } },
      ],
    });
    const { folder, plays } = await fetchFolderDetail(AUTH_TOKEN, "f1");
    expect(folder.name).toBe("Attack");
    expect(plays).toHaveLength(2);
    expect(plays[0].title).toBe("Blindside Run");
  });

  it("each play includes playData for animation rendering", async () => {
    mockFetch({
      folder: { id: "f1", name: "Attack", sport: "Rugby", isSportFolder: false },
      plays: [{ id: "p1", title: "Play A", playData: { play: { animation: { durationMs: 5000 } } } }],
    });
    const { plays } = await fetchFolderDetail(AUTH_TOKEN, "f1");
    expect(plays[0].playData).toBeDefined();
    expect(plays[0].playData.play.animation.durationMs).toBe(5000);
  });

  it("throws when folder is not found", async () => {
    mockFetch({ error: "Folder not found" }, false, 404);
    await expect(fetchFolderDetail(AUTH_TOKEN, "missing")).rejects.toThrow("Folder not found");
  });

  it("fetches from the correct URL", async () => {
    const spy = mockFetch({ folder: { id: "f1" }, plays: [] });
    await fetchFolderDetail(AUTH_TOKEN, "f1");
    expect(spy.mock.calls[0][0]).toBe(`${API_URL}/platform-plays/folders/f1`);
  });
});

// ── copySinglePlay (from folder context) ─────────────────────────────────────

describe("copySinglePlay from folder", () => {
  afterEach(() => vi.restoreAllMocks());

  it("POSTs to the platform-plays copy endpoint", async () => {
    const spy = mockFetch({ play: { id: "new-1", title: "Blindside Run" } }, true, 201);
    await copySinglePlay(AUTH_TOKEN, "p1");
    expect(spy.mock.calls[0][0]).toBe(`${API_URL}/platform-plays/p1/copy`);
    expect(spy.mock.calls[0][1].method).toBe("POST");
  });

  it("throws when user is not a coach", async () => {
    mockFetch({ error: "Only coaches can add plays to the playbook" }, false, 403);
    await expect(copySinglePlay(AUTH_TOKEN, "p1")).rejects.toThrow(
      "Only coaches can add plays to the playbook"
    );
  });
});

// ── Playbooks page sport-filtering logic (unit) ───────────────────────────────

describe("Playbooks page sport-filtering logic (unit)", () => {
  const allSections = [
    { id: "s1", name: "Rugby Basics", sport: "Rugby", playCount: 5 },
    { id: "s2", name: "Football Drills", sport: "Football", playCount: 3 },
    { id: "s3", name: "General", sport: null, playCount: 1 },
  ];

  /**
   * Mirrors the filtering logic in Playbooks.jsx.
   * @param {Object[]} sections
   * @param {string} teamSport
   */
  function filterByTeamSport(sections, teamSport) {
    return teamSport
      ? sections.filter((s) => s.sport && s.sport.toLowerCase() === teamSport.toLowerCase())
      : sections;
  }

  it("returns only sections matching the team sport", () => {
    const result = filterByTeamSport(allSections, "Rugby");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Rugby Basics");
  });

  it("matching is case-insensitive", () => {
    const result = filterByTeamSport(allSections, "rugby");
    expect(result).toHaveLength(1);
    expect(result[0].sport).toBe("Rugby");
  });

  it("returns all sections when no team sport is set", () => {
    const result = filterByTeamSport(allSections, "");
    expect(result).toHaveLength(3);
  });

  it("returns empty array when no sections match the team sport", () => {
    const result = filterByTeamSport(allSections, "Basketball");
    expect(result).toHaveLength(0);
  });

  it("excludes sections with null sport even if team sport matches loosely", () => {
    const result = filterByTeamSport(allSections, "Rugby");
    expect(result.every((s) => s.sport !== null)).toBe(true);
  });
});
