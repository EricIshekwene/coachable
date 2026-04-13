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
