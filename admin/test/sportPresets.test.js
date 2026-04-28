/**
 * Tests for the sport presets feature (multi-preset per sport).
 * Covers admin API helpers (list, create, update, delete) and the app-facing fetchSportPresets util.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

const API_URL = "http://localhost:3001";
const SESSION = "test-admin-session";

// ── Helper ────────────────────────────────────────────────────────────────────

function mockFetch(responseData, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseData),
  });
}

// ── Inline copies of admin API helpers (mirrors AdminPresetEditPage) ──────────

async function adminListPresetsForSport(session, sport) {
  const res = await fetch(
    `${API_URL}/admin/sport-presets/${encodeURIComponent(sport)}`,
    { headers: { "x-admin-session": session } }
  );
  if (!res.ok) throw new Error("Failed to load presets");
  return (await res.json()).presets || [];
}

async function adminCreatePreset(session, sport, name, playData) {
  const res = await fetch(
    `${API_URL}/admin/sport-presets/${encodeURIComponent(sport)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-session": session },
      body: JSON.stringify({ name, playData }),
    }
  );
  if (!res.ok) throw new Error("Failed to create preset");
  return (await res.json()).preset;
}

async function adminUpdatePreset(session, sport, id, name, playData) {
  const res = await fetch(
    `${API_URL}/admin/sport-presets/${encodeURIComponent(sport)}/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-session": session },
      body: JSON.stringify({ name, playData }),
    }
  );
  if (!res.ok) throw new Error("Failed to save preset");
  return (await res.json()).preset;
}

async function adminDeletePreset(session, sport, id) {
  const res = await fetch(
    `${API_URL}/admin/sport-presets/${encodeURIComponent(sport)}/${id}`,
    { method: "DELETE", headers: { "x-admin-session": session } }
  );
  if (!res.ok) throw new Error("Failed to delete preset");
  return (await res.json());
}

// ── Inline copy of fetchSportPresets from apiPlays.js ─────────────────────────

async function fetchSportPresets(sport) {
  try {
    const res = await fetch(
      `${API_URL}/sport-presets/${encodeURIComponent(sport)}`,
      { credentials: "include" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.presets || [];
  } catch {
    return [];
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Sport Presets — Admin list", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns array of presets for a sport", async () => {
    const presets = [
      { id: "uuid-1", sport: "Football", name: "4-3 Defense", playData: {}, sortOrder: 0 },
      { id: "uuid-2", sport: "Football", name: "Shotgun Formation", playData: {}, sortOrder: 1 },
    ];
    mockFetch({ presets });

    const result = await adminListPresetsForSport(SESSION, "Football");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("4-3 Defense");
    expect(result[1].name).toBe("Shotgun Formation");
  });

  it("returns empty array when no presets configured", async () => {
    mockFetch({ presets: [] });
    const result = await adminListPresetsForSport(SESSION, "Rugby");
    expect(result).toEqual([]);
  });

  it("URL-encodes sport names with spaces", async () => {
    const spy = mockFetch({ presets: [] });
    await adminListPresetsForSport(SESSION, "Womens Lacrosse");
    expect(spy.mock.calls[0][0]).toBe(
      `${API_URL}/admin/sport-presets/Womens%20Lacrosse`
    );
  });

  it("throws on server error", async () => {
    mockFetch({ error: "Internal Server Error" }, 500);
    await expect(adminListPresetsForSport(SESSION, "Soccer")).rejects.toThrow(
      "Failed to load presets"
    );
  });
});

describe("Sport Presets — Admin create", () => {
  afterEach(() => vi.restoreAllMocks());

  it("POSTs with name and playData, returns created preset", async () => {
    const playData = { schemaVersion: "play-export-v2", play: { name: "4-3 Defense" } };
    const created = { id: "uuid-1", sport: "Football", name: "4-3 Defense", playData, sortOrder: 0 };
    const spy = mockFetch({ preset: created }, 201);

    const result = await adminCreatePreset(SESSION, "Football", "4-3 Defense", playData);
    expect(result).toEqual(created);

    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe(`${API_URL}/admin/sport-presets/Football`);
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ name: "4-3 Defense", playData });
    expect(opts.headers["x-admin-session"]).toBe(SESSION);
  });

  it("throws when creation fails", async () => {
    mockFetch({ error: "playData is required" }, 400);
    await expect(adminCreatePreset(SESSION, "Basketball", "Fast Break", null)).rejects.toThrow(
      "Failed to create preset"
    );
  });
});

describe("Sport Presets — Admin update", () => {
  afterEach(() => vi.restoreAllMocks());

  it("PATCHes name and playData for an existing preset", async () => {
    const playData = { schemaVersion: "play-export-v2", play: { name: "Updated" } };
    const updated = { id: "uuid-1", sport: "Rugby", name: "Updated", playData };
    const spy = mockFetch({ preset: updated });

    const result = await adminUpdatePreset(SESSION, "Rugby", "uuid-1", "Updated", playData);
    expect(result).toEqual(updated);

    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe(`${API_URL}/admin/sport-presets/Rugby/uuid-1`);
    expect(opts.method).toBe("PATCH");
  });

  it("throws when preset not found", async () => {
    mockFetch({ error: "Preset not found" }, 404);
    await expect(adminUpdatePreset(SESSION, "Soccer", "bad-id", "Name", {})).rejects.toThrow(
      "Failed to save preset"
    );
  });
});

describe("Sport Presets — Admin delete", () => {
  afterEach(() => vi.restoreAllMocks());

  it("DELETEs a preset and returns ok", async () => {
    const spy = mockFetch({ ok: true });

    const result = await adminDeletePreset(SESSION, "Football", "uuid-1");
    expect(result.ok).toBe(true);

    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe(`${API_URL}/admin/sport-presets/Football/uuid-1`);
    expect(opts.method).toBe("DELETE");
  });

  it("throws when preset not found", async () => {
    mockFetch({ error: "Preset not found" }, 404);
    await expect(adminDeletePreset(SESSION, "Soccer", "bad-id")).rejects.toThrow(
      "Failed to delete preset"
    );
  });
});

describe("Sport Presets — App fetchSportPresets", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns array of presets with id, name, playData", async () => {
    const presets = [
      { id: "uuid-1", name: "Zone Defense", playData: { play: {} } },
      { id: "uuid-2", name: "Man Coverage", playData: { play: {} } },
    ];
    mockFetch({ presets });

    const result = await fetchSportPresets("Football");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Zone Defense");
    expect(result[1].id).toBe("uuid-2");
  });

  it("returns empty array when no presets", async () => {
    mockFetch({ presets: [] });
    const result = await fetchSportPresets("Ice Hockey");
    expect(result).toEqual([]);
  });

  it("returns empty array on network error without throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    const result = await fetchSportPresets("Basketball");
    expect(result).toEqual([]);
  });

  it("returns empty array on non-ok response", async () => {
    mockFetch({ error: "Unauthorized" }, 401);
    const result = await fetchSportPresets("Soccer");
    expect(result).toEqual([]);
  });

  it("URL-encodes sport names with spaces", async () => {
    const spy = mockFetch({ presets: [] });
    await fetchSportPresets("Field Hockey");
    expect(spy.mock.calls[0][0]).toBe(`${API_URL}/sport-presets/Field%20Hockey`);
  });
});
