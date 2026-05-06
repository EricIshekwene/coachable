/**
 * Tests for the Playbook Sections feature.
 * Covers admin CRUD endpoints and the coach-facing read/copy endpoints.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

const API_URL = "http://localhost:3001";
const SESSION = "test-admin-session";
const AUTH_TOKEN = "test-coach-token";

// Mock helpers

/**
 * Replace global fetch with a mock returning the given response.
 * @param {any} responseData - JSON body to return
 * @param {boolean} ok - Whether the response is ok
 * @param {number} status - HTTP status code
 */
function mockFetch(responseData, ok = true, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(responseData),
  });
}

// Inline admin API helpers (mirrors AdminPlaysPage)

async function fetchPlaybookSections(session) {
  const res = await fetch(`${API_URL}/admin/playbook-sections`, {
    headers: { "x-admin-session": session },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  return (await res.json()).sections || [];
}

async function createPlaybookSection(session, data) {
  const res = await fetch(`${API_URL}/admin/playbook-sections`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Failed to create section");
  }
  return (await res.json()).section;
}

async function updatePlaybookSection(session, id, data) {
  const res = await fetch(`${API_URL}/admin/playbook-sections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update section");
  return (await res.json()).section;
}

async function deletePlaybookSection(session, id) {
  const res = await fetch(`${API_URL}/admin/playbook-sections/${id}`, {
    method: "DELETE",
    headers: { "x-admin-session": session },
  });
  if (!res.ok) throw new Error("Failed to delete section");
}

async function addPlayToSection(session, sectionId, playId) {
  const res = await fetch(`${API_URL}/admin/playbook-sections/${sectionId}/plays`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify({ playId }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Failed to add play");
  }
}

async function removePlayFromSection(session, sectionId, playId) {
  const res = await fetch(`${API_URL}/admin/playbook-sections/${sectionId}/plays/${playId}`, {
    method: "DELETE",
    headers: { "x-admin-session": session },
  });
  if (!res.ok) throw new Error("Failed to remove play");
}

// Inline coach-facing API helpers (mirrors Playbooks.jsx)

async function fetchPublishedSections(token) {
  const res = await fetch(`${API_URL}/playbook-sections`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.sections || [];
}

async function fetchSectionDetail(token, id) {
  const res = await fetch(`${API_URL}/playbook-sections/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Section not found");
  return await res.json();
}

async function copySectionToTeam(token, sectionId) {
  const res = await fetch(`${API_URL}/playbook-sections/${sectionId}/copy`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Failed to copy section");
  }
  return await res.json();
}

// Tests

describe("fetchPlaybookSections (admin)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns an array of sections", async () => {
    mockFetch({
      sections: [
        { id: "s1", name: "Defensive Schemes", sport: "rugby", playCount: 3, isPublished: true },
        { id: "s2", name: "Set Plays", sport: null, playCount: 1, isPublished: false },
      ],
    });
    const sections = await fetchPlaybookSections(SESSION);
    expect(sections).toHaveLength(2);
    expect(sections[0].name).toBe("Defensive Schemes");
    expect(sections[1].isPublished).toBe(false);
  });

  it("throws UNAUTHORIZED when session is invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Unauthorized" }),
    });
    await expect(fetchPlaybookSections("bad-session")).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("createPlaybookSection (admin)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates a section and returns it", async () => {
    const created = {
      id: "s-new",
      name: "Kickoff Plays",
      description: "",
      sport: "football",
      sortOrder: 0,
      isPublished: false,
      playCount: 0,
    };
    mockFetch({ section: created });
    const section = await createPlaybookSection(SESSION, {
      name: "Kickoff Plays",
      sport: "football",
    });
    expect(section.id).toBe("s-new");
    expect(section.name).toBe("Kickoff Plays");
    expect(section.isPublished).toBe(false);
  });

  it("throws when name is missing", async () => {
    mockFetch({ error: "name is required" }, false, 400);
    await expect(createPlaybookSection(SESSION, { sport: "rugby" })).rejects.toThrow(
      "name is required"
    );
  });

  it("sends name, description, and sport in the request body", async () => {
    const spy = mockFetch({ section: { id: "x", name: "Test" } });
    await createPlaybookSection(SESSION, { name: "Test", sport: "soccer", description: "desc" });
    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body.name).toBe("Test");
    expect(body.sport).toBe("soccer");
    expect(body.description).toBe("desc");
  });
});

describe("updatePlaybookSection (admin)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("updates and returns the section", async () => {
    const updated = { id: "s1", name: "New Name", isPublished: true };
    mockFetch({ section: updated });
    const section = await updatePlaybookSection(SESSION, "s1", { name: "New Name", isPublished: true });
    expect(section.name).toBe("New Name");
    expect(section.isPublished).toBe(true);
  });

  it("sends a PATCH request to the correct URL", async () => {
    const spy = mockFetch({ section: { id: "s1" } });
    await updatePlaybookSection(SESSION, "s1", { isPublished: true });
    expect(spy.mock.calls[0][0]).toBe(`${API_URL}/admin/playbook-sections/s1`);
    expect(spy.mock.calls[0][1].method).toBe("PATCH");
  });
});

describe("deletePlaybookSection (admin)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends a DELETE request to the correct URL", async () => {
    const spy = mockFetch({ ok: true });
    await deletePlaybookSection(SESSION, "s1");
    expect(spy.mock.calls[0][0]).toBe(`${API_URL}/admin/playbook-sections/s1`);
    expect(spy.mock.calls[0][1].method).toBe("DELETE");
  });
});

describe("addPlayToSection (admin)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("posts playId to the section's plays endpoint", async () => {
    const spy = mockFetch({ ok: true });
    await addPlayToSection(SESSION, "s1", "p1");
    expect(spy.mock.calls[0][0]).toBe(`${API_URL}/admin/playbook-sections/s1/plays`);
    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body.playId).toBe("p1");
  });

  it("throws when the server returns an error", async () => {
    mockFetch({ error: "Play not found" }, false, 404);
    await expect(addPlayToSection(SESSION, "s1", "bad-id")).rejects.toThrow("Play not found");
  });
});

describe("removePlayFromSection (admin)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends a DELETE request with the correct play ID in the URL", async () => {
    const spy = mockFetch({ ok: true });
    await removePlayFromSection(SESSION, "s1", "p1");
    expect(spy.mock.calls[0][0]).toBe(`${API_URL}/admin/playbook-sections/s1/plays/p1`);
    expect(spy.mock.calls[0][1].method).toBe("DELETE");
  });
});

describe("fetchPublishedSections (coach)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns only published sections from the public endpoint", async () => {
    mockFetch({
      sections: [
        { id: "s1", name: "Defensive Schemes", sport: "rugby", playCount: 4 },
      ],
    });
    const sections = await fetchPublishedSections(AUTH_TOKEN);
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe("Defensive Schemes");
  });
});

describe("fetchSectionDetail (coach)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns section and its plays", async () => {
    mockFetch({
      section: { id: "s1", name: "Defensive Schemes", playCount: 2 },
      plays: [
        { id: "p1", title: "Blitz Package", sport: "football" },
        { id: "p2", title: "Zone Coverage", sport: "football" },
      ],
    });
    const { section, plays } = await fetchSectionDetail(AUTH_TOKEN, "s1");
    expect(section.name).toBe("Defensive Schemes");
    expect(plays).toHaveLength(2);
    expect(plays[0].title).toBe("Blitz Package");
  });

  it("throws when section is not found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Section not found" }),
    });
    await expect(fetchSectionDetail(AUTH_TOKEN, "missing-id")).rejects.toThrow("Section not found");
  });
});

describe("copySectionToTeam (coach)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns the list of copied plays", async () => {
    mockFetch({
      plays: [
        { id: "new-p1", title: "Blitz Package" },
        { id: "new-p2", title: "Zone Coverage" },
      ],
    });
    const result = await copySectionToTeam(AUTH_TOKEN, "s1");
    expect(result.plays).toHaveLength(2);
    expect(result.plays[0].title).toBe("Blitz Package");
  });

  it("sends a POST request to the correct URL", async () => {
    const spy = mockFetch({ plays: [] });
    await copySectionToTeam(AUTH_TOKEN, "s1");
    expect(spy.mock.calls[0][0]).toBe(`${API_URL}/playbook-sections/s1/copy`);
    expect(spy.mock.calls[0][1].method).toBe("POST");
  });

  it("throws when user is not a coach", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "Only coaches can add plays to the playbook" }),
    });
    await expect(copySectionToTeam(AUTH_TOKEN, "s1")).rejects.toThrow(
      "Only coaches can add plays to the playbook"
    );
  });
});

// ── Default playbook section behaviour ────────────────────────────────────────

describe("section detail play filtering logic (unit)", () => {
  function normalizeFilterValue(value) {
    return String(value || "").trim().toLowerCase();
  }

  function filterSectionPlays(plays, searchValue, activeTags) {
    const searchTerm = normalizeFilterValue(searchValue);
    const normalizedActiveTags = activeTags.map(normalizeFilterValue).filter(Boolean);

    return plays.filter((play) => {
      const title = normalizeFilterValue(play.title);
      const playTags = (play.tags || []).map(normalizeFilterValue).filter(Boolean);
      const matchesSearch = !searchTerm
        || title.includes(searchTerm)
        || playTags.some((tag) => tag.includes(searchTerm));
      const matchesTags = normalizedActiveTags.every((tag) => playTags.includes(tag));
      return matchesSearch && matchesTags;
    });
  }

  const plays = [
    { id: "p1", title: "Blitz Package", tags: ["Defense", "Pressure"] },
    { id: "p2", title: "Red Zone Counter", tags: ["Offense", "Goal Line"] },
    { id: "p3", title: "Pressure Release", tags: ["Offense", "Pressure"] },
  ];

  it("returns all plays when search and tag filters are empty", () => {
    expect(filterSectionPlays(plays, "", [])).toHaveLength(3);
  });

  it("matches title search in a case-insensitive way", () => {
    const result = filterSectionPlays(plays, "blitz", []);
    expect(result.map((play) => play.id)).toEqual(["p1"]);
  });

  it("matches tag search in a case-insensitive way", () => {
    const result = filterSectionPlays(plays, "goal", []);
    expect(result.map((play) => play.id)).toEqual(["p2"]);
  });

  it("combines search and selected tags with AND logic", () => {
    const result = filterSectionPlays(plays, "pressure", ["Offense"]);
    expect(result.map((play) => play.id)).toEqual(["p3"]);
  });

  it("requires a play to match all selected tags", () => {
    const result = filterSectionPlays(plays, "", ["Offense", "Pressure"]);
    expect(result.map((play) => play.id)).toEqual(["p3"]);
  });

  it("returns an empty array when no plays satisfy the combined filters", () => {
    expect(filterSectionPlays(plays, "blitz", ["Offense"])).toEqual([]);
  });
});

describe("isDefault field in fetchPlaybookSections (admin)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("exposes isDefault on sections returned by the list endpoint", async () => {
    mockFetch({
      sections: [
        { id: "s1", name: "Rugby — Default", sport: "Rugby", isDefault: true, isPublished: false, playCount: 0 },
        { id: "s2", name: "Attacking Moves", sport: "Rugby", isDefault: false, isPublished: true, playCount: 3 },
      ],
    });
    const sections = await fetchPlaybookSections(SESSION);
    expect(sections[0].isDefault).toBe(true);
    expect(sections[1].isDefault).toBe(false);
  });

  it("default sections can be fetched even when unpublished", async () => {
    mockFetch({
      sections: [
        { id: "s1", name: "Football — Default", sport: "Football", isDefault: true, isPublished: false, playCount: 0 },
      ],
    });
    const sections = await fetchPlaybookSections(SESSION);
    expect(sections[0].isPublished).toBe(false);
    expect(sections[0].isDefault).toBe(true);
  });
});

describe("deletePlaybookSection — default sections are protected", () => {
  afterEach(() => vi.restoreAllMocks());

  it("throws when the server rejects deletion of a default section", async () => {
    mockFetch({ error: "Default playbook sections cannot be deleted." }, false, 403);
    await expect(deletePlaybookSection(SESSION, "s-default")).rejects.toThrow(
      "Failed to delete section"
    );
  });

  it("succeeds for non-default sections", async () => {
    mockFetch({ ok: true });
    await expect(deletePlaybookSection(SESSION, "s-custom")).resolves.not.toThrow();
  });
});

describe("sport grouping logic (unit)", () => {
  /**
   * Replicates the sportGroups memoisation from PlaybookSectionPanel.
   * Tests that default sections sort first within a group.
   */
  function buildSportGroups(sections, supportedSports) {
    const map = new Map();
    for (const s of sections) {
      const key = s.sport || "__other__";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    for (const [, group] of map) {
      group.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.name.localeCompare(b.name);
      });
    }
    const ordered = [];
    for (const sport of supportedSports) {
      if (map.has(sport)) ordered.push({ sport, sections: map.get(sport) });
    }
    if (map.has("__other__")) ordered.push({ sport: "__other__", sections: map.get("__other__") });
    return ordered;
  }

  const SPORTS = ["Rugby", "Football", "Soccer"];

  it("groups sections by sport in the order of SUPPORTED_FIELD_TYPES", () => {
    const sections = [
      { id: "1", sport: "Soccer", name: "A", isDefault: false },
      { id: "2", sport: "Rugby", name: "B", isDefault: false },
    ];
    const groups = buildSportGroups(sections, SPORTS);
    expect(groups[0].sport).toBe("Rugby");
    expect(groups[1].sport).toBe("Soccer");
  });

  it("sorts default section first within its group", () => {
    const sections = [
      { id: "1", sport: "Rugby", name: "Zzz Custom", isDefault: false },
      { id: "2", sport: "Rugby", name: "Rugby — Default", isDefault: true },
    ];
    const [group] = buildSportGroups(sections, SPORTS);
    expect(group.sections[0].isDefault).toBe(true);
    expect(group.sections[1].isDefault).toBe(false);
  });

  it("puts sections with no sport into the __other__ group", () => {
    const sections = [
      { id: "1", sport: null, name: "Generic", isDefault: false },
    ];
    const groups = buildSportGroups(sections, SPORTS);
    expect(groups[0].sport).toBe("__other__");
    expect(groups[0].sections[0].name).toBe("Generic");
  });

  it("omits sport groups that have no sections", () => {
    const sections = [
      { id: "1", sport: "Rugby", name: "X", isDefault: false },
    ];
    const groups = buildSportGroups(sections, SPORTS);
    expect(groups).toHaveLength(1);
    expect(groups[0].sport).toBe("Rugby");
  });
});

// ── Add folder to section — duplicate detection logic ─────────────────────────

describe("handleSelectFolder duplicate detection (unit)", () => {
  /**
   * Mirrors the duplicate-detection logic from handleSelectFolder in PlaybookSectionPanel.
   * Returns { hasDuplicates, duplicates, newPlays } so callers can decide how to proceed.
   */
  function detectFolderDuplicates(folderPlays, sectionPlayIds) {
    const duplicates = folderPlays.filter((p) => sectionPlayIds.has(p.id));
    const newPlays = folderPlays.filter((p) => !sectionPlayIds.has(p.id));
    return { hasDuplicates: duplicates.length > 0, duplicates, newPlays };
  }

  const folderPlays = [
    { id: "p1", title: "Play One" },
    { id: "p2", title: "Play Two" },
    { id: "p3", title: "Play Three" },
  ];

  it("reports no duplicates when the section is empty", () => {
    const { hasDuplicates } = detectFolderDuplicates(folderPlays, new Set());
    expect(hasDuplicates).toBe(false);
  });

  it("detects duplicates when some plays are already in the section", () => {
    const { hasDuplicates, duplicates, newPlays } = detectFolderDuplicates(
      folderPlays,
      new Set(["p1", "p3"])
    );
    expect(hasDuplicates).toBe(true);
    expect(duplicates.map((p) => p.id)).toEqual(["p1", "p3"]);
    expect(newPlays.map((p) => p.id)).toEqual(["p2"]);
  });

  it("reports all plays as duplicates when they are all already in the section", () => {
    const { hasDuplicates, duplicates, newPlays } = detectFolderDuplicates(
      folderPlays,
      new Set(["p1", "p2", "p3"])
    );
    expect(hasDuplicates).toBe(true);
    expect(duplicates).toHaveLength(3);
    expect(newPlays).toHaveLength(0);
  });
});

describe("handleConfirmAddFolder — skip vs add-all (unit)", () => {
  function resolveFolderPlays(folderPlays, sectionPlayIds, skipDuplicates) {
    return skipDuplicates
      ? folderPlays.filter((p) => !sectionPlayIds.has(p.id))
      : folderPlays;
  }

  const folderPlays = [
    { id: "p1", title: "Play One" },
    { id: "p2", title: "Play Two" },
    { id: "p3", title: "Play Three" },
  ];
  const existing = new Set(["p1"]);

  it("skip duplicates: only returns plays not already in the section", () => {
    const toAdd = resolveFolderPlays(folderPlays, existing, true);
    expect(toAdd.map((p) => p.id)).toEqual(["p2", "p3"]);
  });

  it("add all: returns every play including duplicates", () => {
    const toAdd = resolveFolderPlays(folderPlays, existing, false);
    expect(toAdd).toHaveLength(3);
    expect(toAdd.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("skip duplicates with no duplicates returns the full list", () => {
    const toAdd = resolveFolderPlays(folderPlays, new Set(), true);
    expect(toAdd).toHaveLength(3);
  });

  it("returns an empty array when skipping and all plays are duplicates", () => {
    const toAdd = resolveFolderPlays(folderPlays, new Set(["p1", "p2", "p3"]), true);
    expect(toAdd).toHaveLength(0);
  });
});

describe("add folder to section — API calls (integration)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calls addPlayToSection for each non-duplicate play when skipping duplicates", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url, opts) => {
      calls.push({ url, method: opts?.method });
      return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ ok: true }) });
    });

    const toAdd = [{ id: "p2" }, { id: "p3" }];
    await Promise.all(
      toAdd.map((p) => addPlayToSection(SESSION, "section-1", p.id))
    );

    expect(calls).toHaveLength(2);
    expect(calls.every((c) => c.url.includes("section-1/plays"))).toBe(true);
    expect(calls.every((c) => c.method === "POST")).toBe(true);
  });

  it("calls addPlayToSection for all plays including duplicates when adding all", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url, opts) => {
      calls.push({ url, method: opts?.method });
      return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ ok: true }) });
    });

    const folderPlays = [{ id: "p1" }, { id: "p2" }, { id: "p3" }];
    await Promise.all(
      folderPlays.map((p) => addPlayToSection(SESSION, "section-1", p.id))
    );

    expect(calls).toHaveLength(3);
  });
});
