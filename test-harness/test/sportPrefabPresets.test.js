/**
 * Tests for the published sport prefab presets feature.
 *
 * Covers:
 *  - admin API helpers (list, create, update with isHidden toggle, delete, reorder)
 *  - the app-facing fetchSportPrefabPresets util
 *  - the sidebar-mapping transform (sport_prefab_presets row → sidebar prefab)
 *  - the preview-playData transform (used by PlayPreviewCard on admin cards)
 *  - the initial-playData transform (used to load existing presets back into Slate)
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  mapSportPrefabPresetToSidebarPrefab,
  prefabToPreviewPlayData,
  prefabToInitialPlayData,
} from "../../src/utils/sportPrefabPresets.js";
import { buildPrefabPresetPayload } from "../../src/utils/customPrefabs.js";

// Inline copy of fetchSportPrefabPresets — mirrors src/utils/prefabsApi.js. The
// real helper depends on apiFetch + import.meta.env which is awkward to wire up
// in vitest's node env; the existing sportPresets.test.js uses the same
// inline-copy pattern for consistency.
async function fetchSportPrefabPresets(sport) {
  const trimmed = String(sport ?? "").trim();
  if (!trimmed) return [];
  try {
    const res = await fetch(
      `${API_URL}/sport-prefab-presets/${encodeURIComponent(trimmed)}`,
      { credentials: "include" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.presets || [];
  } catch {
    return [];
  }
}

const API_URL = "http://localhost:3001";
const SESSION = "test-admin-session";

function mockFetch(responseData, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseData),
  });
}

// ── Inline copies of admin API helpers (mirror AdminSportPrefabPresetsPage) ───

async function adminListPrefabPresetsForSport(session, sport) {
  const res = await fetch(
    `${API_URL}/admin/sport-prefab-presets/${encodeURIComponent(sport)}`,
    { headers: { "x-admin-session": session } }
  );
  if (!res.ok) throw new Error("Failed to load prefab presets");
  return (await res.json()).presets || [];
}

async function adminCreatePrefabPreset(session, sport, name, prefabData) {
  const res = await fetch(
    `${API_URL}/admin/sport-prefab-presets/${encodeURIComponent(sport)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-session": session },
      body: JSON.stringify({ name, prefabData }),
    }
  );
  if (!res.ok) throw new Error("Failed to create prefab preset");
  return (await res.json()).preset;
}

async function adminUpdatePrefabPreset(session, sport, id, patch) {
  const res = await fetch(
    `${API_URL}/admin/sport-prefab-presets/${encodeURIComponent(sport)}/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-session": session },
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok) throw new Error("Failed to update prefab preset");
  return (await res.json()).preset;
}

async function adminDeletePrefabPreset(session, sport, id) {
  const res = await fetch(
    `${API_URL}/admin/sport-prefab-presets/${encodeURIComponent(sport)}/${id}`,
    { method: "DELETE", headers: { "x-admin-session": session } }
  );
  if (!res.ok) throw new Error("Failed to delete prefab preset");
}

async function adminReorderPrefabPresets(session, sport, ids) {
  const res = await fetch(
    `${API_URL}/admin/sport-prefab-presets/${encodeURIComponent(sport)}/reorder`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-session": session },
      body: JSON.stringify({ ids }),
    }
  );
  if (!res.ok) throw new Error("Failed to reorder prefab presets");
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Admin CRUD ────────────────────────────────────────────────────────────────

describe("admin prefab-preset CRUD", () => {
  it("list URL-encodes the sport segment and sends the admin session header", async () => {
    const fetchSpy = mockFetch({ presets: [] });
    await adminListPrefabPresetsForSport(SESSION, "Field Hockey");
    expect(fetchSpy).toHaveBeenCalledWith(
      `${API_URL}/admin/sport-prefab-presets/Field%20Hockey`,
      { headers: { "x-admin-session": SESSION } }
    );
  });

  it("create posts name + prefabData (NOT playData)", async () => {
    const fetchSpy = mockFetch({ preset: { id: "pp-1", name: "Stack", sport: "Rugby", prefabData: { players: [] } } });
    const prefabData = { players: [{ dx: -10, dy: 0, number: 1, color: "#ef4444" }] };
    const created = await adminCreatePrefabPreset(SESSION, "Rugby", "Stack", prefabData);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${API_URL}/admin/sport-prefab-presets/Rugby`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Stack", prefabData }),
      })
    );
    expect(created.id).toBe("pp-1");
  });

  it("update can rename a prefab preset (PATCH name only)", async () => {
    // Used by the inline rename on the list page and by Slate's name-edit
    // autosave when the admin retitles in the editor.
    const fetchSpy = mockFetch({ preset: { id: "pp-1", name: "New Name" } });
    await adminUpdatePrefabPreset(SESSION, "Rugby", "pp-1", { name: "New Name" });
    expect(fetchSpy).toHaveBeenCalledWith(
      `${API_URL}/admin/sport-prefab-presets/Rugby/pp-1`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "New Name" }),
      })
    );
  });

  it("update sends a JSON patch (e.g. flipping isHidden)", async () => {
    const fetchSpy = mockFetch({ preset: { id: "pp-1", isHidden: false } });
    const updated = await adminUpdatePrefabPreset(SESSION, "Rugby", "pp-1", { isHidden: false });
    expect(fetchSpy).toHaveBeenCalledWith(
      `${API_URL}/admin/sport-prefab-presets/Rugby/pp-1`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ isHidden: false }),
      })
    );
    expect(updated.isHidden).toBe(false);
  });

  it("delete hits the correct sport+id path", async () => {
    const fetchSpy = mockFetch({ ok: true });
    await adminDeletePrefabPreset(SESSION, "Rugby", "pp-1");
    expect(fetchSpy).toHaveBeenCalledWith(
      `${API_URL}/admin/sport-prefab-presets/Rugby/pp-1`,
      { method: "DELETE", headers: { "x-admin-session": SESSION } }
    );
  });

  it("reorder POSTs the full ordered ids array", async () => {
    const fetchSpy = mockFetch({ ok: true });
    await adminReorderPrefabPresets(SESSION, "Rugby", ["a", "b", "c"]);
    const call = fetchSpy.mock.calls[0];
    expect(call[0]).toBe(`${API_URL}/admin/sport-prefab-presets/Rugby/reorder`);
    expect(JSON.parse(call[1].body)).toEqual({ ids: ["a", "b", "c"] });
  });
});

// ── App-facing fetch ──────────────────────────────────────────────────────────

describe("fetchSportPrefabPresets (app-facing helper)", () => {
  it("returns the parsed presets array on success", async () => {
    mockFetch({ presets: [{ id: "pp-1", name: "Stack", prefabData: { players: [] } }] });
    const result = await fetchSportPrefabPresets("Rugby");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("pp-1");
  });

  it("returns [] when the fetch fails (no thrown error)", async () => {
    mockFetch({ error: "Boom" }, 500);
    const result = await fetchSportPrefabPresets("Rugby");
    expect(result).toEqual([]);
  });

  it("returns [] without calling fetch when sport is blank", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await fetchSportPrefabPresets("");
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ── Transforms ────────────────────────────────────────────────────────────────

describe("mapSportPrefabPresetToSidebarPrefab", () => {
  it("converts a server row (with objects array) into the sidebar prefab placement shape", () => {
    const record = {
      id: "pp-1",
      name: "Pod Stack",
      prefabData: {
        players: [
          { dx: -20, dy: 0, number: 10, color: "#ef4444" },
          { dx: 20, dy: 0, number: 12, color: "#ef4444" },
        ],
        objects: [
          { dx: 0, dy: 0, objectType: "ball" },
          { dx: 30, dy: 30, objectType: "cone" },
        ],
      },
    };
    const mapped = mapSportPrefabPresetToSidebarPrefab(record);
    expect(mapped.id).toBe("pp-1");
    expect(mapped.label).toBe("Pod Stack");
    expect(mapped.isPublished).toBe(true);
    expect(mapped.readOnly).toBe(true);
    expect(mapped.source).toBe("sport-preset");
    expect(mapped.players).toHaveLength(2);
    expect(mapped.objects).toHaveLength(2);
    expect(mapped.objects[0]).toEqual({ dx: 0, dy: 0, objectType: "ball" });
    expect(mapped.objects[1]).toEqual({ dx: 30, dy: 30, objectType: "cone" });
  });

  it("migrates legacy single-ball records into an objects array", () => {
    // Backward-compat: prefab presets saved before the `objects` shape existed
    // have a single `ball` field. The sidebar consumer reads `objects`, so we
    // normalize on read.
    const mapped = mapSportPrefabPresetToSidebarPrefab({
      id: "pp-old",
      name: "Old Stack",
      prefabData: { players: [], ball: { dx: 10, dy: 20 } },
    });
    expect(mapped.objects).toEqual([{ dx: 10, dy: 20, objectType: "ball" }]);
  });

  it("returns null when the record is missing prefabData", () => {
    expect(mapSportPrefabPresetToSidebarPrefab({ id: "x", name: "y" })).toBeNull();
    expect(mapSportPrefabPresetToSidebarPrefab(null)).toBeNull();
  });

  it("falls back to 'Prefab' label when name is blank", () => {
    const mapped = mapSportPrefabPresetToSidebarPrefab({
      id: "pp-2",
      name: "   ",
      prefabData: { players: [] },
    });
    expect(mapped.label).toBe("Prefab");
  });
});

describe("buildPrefabPresetPayload", () => {
  it("anchors player dx/dy on the PLAYER centroid (not the combined centroid)", () => {
    // Regression: previously the ball was included in the centroid, so a
    // ball placed far from the players pulled the centroid away — players
    // landed off-center when the prefab was placed. Now: 3 players at
    // (-10, 0), (0, 0), (10, 0) centroid (0, 0), ball at (40, 0) doesn't
    // influence player dx values.
    const payload = buildPrefabPresetPayload(
      "Stack",
      [
        { x: -10, y: 0, number: 1, color: "#ef4444" },
        { x: 0, y: 0, number: 2, color: "#ef4444" },
        { x: 10, y: 0, number: 3, color: "#ef4444" },
      ],
      [{ x: 40, y: 0, objectType: "ball" }]
    );
    expect(payload.players.map((p) => p.dx)).toEqual([-10, 0, 10]);
    expect(payload.objects).toHaveLength(1);
    expect(payload.objects[0].dx).toBe(40);
    expect(payload.objects[0].objectType).toBe("ball");
  });

  it("captures cones with objectType: 'cone'", () => {
    const payload = buildPrefabPresetPayload(
      "Drill",
      [{ x: 0, y: 0, number: 1, color: "#ef4444" }],
      [
        { x: 0, y: 50, objectType: "cone" },
        { x: 0, y: -50, objectType: "cone" },
      ]
    );
    expect(payload.objects).toHaveLength(2);
    expect(payload.objects.every((o) => o.objectType === "cone")).toBe(true);
  });

  it("anchors on object centroid when there are no players (so a cones-only prefab still places)", () => {
    const payload = buildPrefabPresetPayload(
      "Cones",
      [],
      [
        { x: 10, y: 0, objectType: "cone" },
        { x: -10, y: 0, objectType: "cone" },
      ]
    );
    expect(payload.players).toEqual([]);
    expect(payload.objects.map((o) => o.dx)).toEqual([10, -10]);
  });

  it("returns null when there is absolutely nothing to save", () => {
    expect(buildPrefabPresetPayload("Empty", [], [])).toBeNull();
  });
});

describe("prefabToPreviewPlayData", () => {
  it("keeps relative dx/dy as Slate's centered world coords (no offset)", () => {
    // Slate uses centered world coordinates — (0, 0) is the field middle.
    // Regression: previously offset by (+500, +300) which shoved players to
    // the bottom-right when reopened for edit.
    const playData = prefabToPreviewPlayData(
      { players: [{ dx: -100, dy: 50, number: 1, color: "#ef4444" }] },
      "Rugby"
    );
    const entities = playData.play.entities;
    const playerId = Object.keys(entities.playersById)[0];
    expect(entities.playersById[playerId].x).toBe(-100);
    expect(entities.playersById[playerId].y).toBe(50);
    expect(playData.play.settings.advancedSettings.pitch.fieldType).toBe("Rugby");
  });

  it("rehydrates every entry in the objects array (balls + cones)", () => {
    const playData = prefabToPreviewPlayData(
      {
        players: [],
        objects: [
          { dx: 0, dy: 0, objectType: "ball" },
          { dx: 30, dy: 0, objectType: "cone" },
        ],
      },
      "Football"
    );
    const objs = Object.values(playData.play.entities.ballsById);
    expect(objs).toHaveLength(2);
    expect(objs.map((o) => o.objectType).sort()).toEqual(["ball", "cone"]);
  });

  it("falls back to legacy `ball` field when no objects array is present", () => {
    const playData = prefabToPreviewPlayData(
      { players: [], ball: { dx: 5, dy: 5 } },
      "Football"
    );
    const objs = Object.values(playData.play.entities.ballsById);
    expect(objs).toHaveLength(1);
    expect(objs[0].objectType).toBe("ball");
  });

  it("omits objects when neither array nor legacy ball is present", () => {
    const playData = prefabToPreviewPlayData({ players: [] }, "Rugby");
    expect(playData.play.entities.ballsById).toEqual({});
  });

  it("honors a saved player baseSizePx so the preview matches the editor", () => {
    // Regression: previously dropped settings, so a prefab authored with
    // smaller players rendered at the default 30px in the admin list.
    const playData = prefabToPreviewPlayData(
      { players: [], settings: { baseSizePx: 12, sizePercent: 50 } },
      "Rugby"
    );
    expect(playData.play.settings.advancedSettings.players.baseSizePx).toBe(12);
    expect(playData.play.settings.allPlayersDisplay.sizePercent).toBe(50);
  });
});

describe("prefabToInitialPlayData", () => {
  it("rehydrates a prefab into a Slate-ready playData shape", () => {
    const playData = prefabToInitialPlayData(
      {
        players: [
          { dx: 0, dy: 0, number: 7, name: "Scrum-half", color: "#3b82f6" },
        ],
      },
      "Rugby"
    );
    const entities = playData.play.entities;
    expect(entities.representedPlayerIds).toHaveLength(1);
    const player = entities.playersById[entities.representedPlayerIds[0]];
    expect(player.number).toBe(7);
    expect(player.name).toBe("Scrum-half");
    expect(player.color).toBe("#3b82f6");
  });

  it("defaults sport/fieldType to Rugby when none supplied", () => {
    const playData = prefabToInitialPlayData({ players: [] }, undefined);
    expect(playData.play.settings.advancedSettings.pitch.fieldType).toBe("Rugby");
  });

  it("wraps the play in the v3 export envelope so Slate's import validator accepts it", () => {
    // Regression: without `schemaVersion`, reopening an existing prefab for
    // edit failed with "Unsupported schemaVersion. Expected play-export-v3...".
    const playData = prefabToInitialPlayData({ players: [] }, "Rugby");
    expect(playData.schemaVersion).toBe("play-export-v3");
  });

  it("round-trips player baseSizePx + sizePercent from the saved settings", () => {
    const playData = prefabToInitialPlayData(
      { players: [], settings: { baseSizePx: 18, sizePercent: 75 } },
      "Rugby"
    );
    expect(playData.play.settings.advancedSettings.players.baseSizePx).toBe(18);
    expect(playData.play.settings.allPlayersDisplay.sizePercent).toBe(75);
  });

  it("pre-builds animation tracks with a t=0 keyframe for every player and object", () => {
    // Regression: previously returned empty `tracks: {}`. Slate then ran its
    // keyframe-stamping effect AFTER load, which reads positions from
    // ballsByIdRef — a ref synced by a sibling effect. On a second mount
    // (admin reopens after navigating away), the stamping could read the
    // still-default ball ref and stamp the keyframe at (40, 0), permanently
    // overwriting the loaded ball position with the default ball spot.
    // Shipping pre-stamped tracks bypasses that effect entirely.
    const playData = prefabToInitialPlayData(
      {
        players: [
          { dx: -30, dy: 0, number: 1, color: "#ef4444" },
          { dx: 30, dy: 0, number: 2, color: "#ef4444" },
        ],
        objects: [{ dx: -66, dy: -10, objectType: "ball" }],
      },
      "Rugby"
    );
    const tracks = playData.play.animation.tracks;
    const trackIds = Object.keys(tracks);
    expect(trackIds).toHaveLength(3); // 2 players + 1 ball
    // Every track has exactly one keyframe at t=0 at the entity's spawn position.
    trackIds.forEach((id) => {
      expect(tracks[id].keyframes).toHaveLength(1);
      expect(tracks[id].keyframes[0].t).toBe(0);
    });
    // The ball-1 track specifically matches the saved offset, not the default.
    expect(tracks["ball-1"].keyframes[0].x).toBe(-66);
    expect(tracks["ball-1"].keyframes[0].y).toBe(-10);
  });
});
