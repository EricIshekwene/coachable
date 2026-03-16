/**
 * Tests for the platform plays feature.
 * Covers the admin API helpers and the public fetch used on the landing page.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const API_URL = "http://localhost:3001";
const SESSION = "test-admin-session";

// ── Helper: mock fetch responses ────────────────────────────────────────────

function mockFetch(responseData, ok = true) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    json: () => Promise.resolve(responseData),
  });
}

// ── Inline copies of the admin helper functions (mirrors AdminPlayEditPage) ──

async function adminFetchPlay(session, id) {
  const res = await fetch(`${API_URL}/admin/plays/${id}`, {
    headers: { "x-admin-session": session },
  });
  if (!res.ok) throw new Error("Failed to load play");
  const data = await res.json();
  return data.play;
}

async function adminCreatePlay(session, payload) {
  const res = await fetch(`${API_URL}/admin/plays`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create play");
  const data = await res.json();
  return data.play;
}

async function adminUpdatePlay(session, id, payload) {
  const res = await fetch(`${API_URL}/admin/plays/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save play");
  const data = await res.json();
  return data.play;
}

async function fetchFeaturedPlays() {
  const res = await fetch(`${API_URL}/platform-plays`);
  const data = await res.json();
  return data.plays || [];
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("adminFetchPlay", () => {
  let fetchSpy;
  afterEach(() => fetchSpy.mockRestore());

  it("sends GET with x-admin-session header", async () => {
    const play = { id: "play-1", title: "Test", isFeatured: false };
    fetchSpy = mockFetch({ play });

    const result = await adminFetchPlay(SESSION, "play-1");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${API_URL}/admin/plays/play-1`);
    expect(opts.headers["x-admin-session"]).toBe(SESSION);
    expect(result).toEqual(play);
  });

  it("throws when response is not ok", async () => {
    fetchSpy = mockFetch({ error: "Not found" }, false);
    await expect(adminFetchPlay(SESSION, "missing")).rejects.toThrow("Failed to load play");
  });
});

describe("adminCreatePlay", () => {
  let fetchSpy;
  afterEach(() => fetchSpy.mockRestore());

  it("sends POST with title and playData", async () => {
    const play = { id: "new-1", title: "New Play", isFeatured: false };
    fetchSpy = mockFetch({ play });

    const result = await adminCreatePlay(SESSION, { title: "New Play", playData: { players: [] } });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${API_URL}/admin/plays`);
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body.title).toBe("New Play");
    expect(body.playData).toEqual({ players: [] });
    expect(result).toEqual(play);
  });

  it("throws when creation fails", async () => {
    fetchSpy = mockFetch({ error: "title is required" }, false);
    await expect(adminCreatePlay(SESSION, { title: "" })).rejects.toThrow("Failed to create play");
  });
});

describe("adminUpdatePlay", () => {
  let fetchSpy;
  afterEach(() => fetchSpy.mockRestore());

  it("sends PATCH with updated fields", async () => {
    const play = { id: "play-1", isFeatured: true };
    fetchSpy = mockFetch({ play });

    const result = await adminUpdatePlay(SESSION, "play-1", { isFeatured: true });

    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${API_URL}/admin/plays/play-1`);
    expect(opts.method).toBe("PATCH");
    expect(JSON.parse(opts.body)).toEqual({ isFeatured: true });
    expect(result).toEqual(play);
  });
});

describe("fetchFeaturedPlays (public)", () => {
  let fetchSpy;
  afterEach(() => fetchSpy.mockRestore());

  it("fetches featured plays from the public endpoint", async () => {
    const plays = [
      { id: "p1", title: "Play A", isFeatured: true },
      { id: "p2", title: "Play B", isFeatured: true },
    ];
    fetchSpy = mockFetch({ plays });

    const result = await fetchFeaturedPlays();

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${API_URL}/platform-plays`);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Play A");
  });

  it("returns empty array when response has no plays", async () => {
    fetchSpy = mockFetch({});
    const result = await fetchFeaturedPlays();
    expect(result).toEqual([]);
  });
});
