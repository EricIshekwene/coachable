/**
 * Admin-only tutorial preview mode — a fully mocked, in-memory backend.
 *
 * When active (sessionStorage flag, set by the admin "Preview Onboarding
 * Tutorial" button), apiFetch (src/utils/api.js) routes EVERY request here
 * instead of the network. The real /app pages render against a fake coach,
 * fake team, and in-memory plays — nothing is written to the database and no
 * real account is created or touched. Closing the tab or exiting the tour
 * discards all of it.
 *
 * The store lives in module state and resets on every full page load, which
 * is exactly the lifetime of one preview run (the admin button navigates with
 * window.location.href, and exiting navigates back to /admin the same way).
 */

import { resolveFieldTypeFromSport } from "../features/slate/hooks/useAdvancedSettings";

const PREVIEW_FLAG_KEY = "coachable_tutorial_preview";
const PREVIEW_SPORT_KEY = "coachable_tutorial_preview_sport";
const DEFAULT_PREVIEW_SPORT = "football";

const TEAM_ID = "preview-team";
const USER_ID = "preview-user";

/** True when the current tab is in tutorial preview mode. */
export function isTutorialPreviewActive() {
  try {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem(PREVIEW_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * The sport the current preview run was launched under (chosen in the admin
 * sport picker). Defaults to football when unset or unreadable.
 */
export function getTutorialPreviewSport() {
  try {
    return sessionStorage.getItem(PREVIEW_SPORT_KEY) || DEFAULT_PREVIEW_SPORT;
  } catch {
    return DEFAULT_PREVIEW_SPORT;
  }
}

/**
 * Arm preview mode for this tab under the given sport. The caller then
 * navigates into /app with a full page load, so the module-level store below
 * is rebuilt from these sessionStorage values.
 * @param {string} [sport] - onboarding sport key ("football", "womens lacrosse", "blank", ...)
 * @param {"dark"|"light"|undefined} [theme] - When provided, syncs the app's
 *   localStorage theme key so the preview renders in the same colour scheme as
 *   the admin panel. Ignored if not "dark" or "light".
 */
export function activateTutorialPreview(sport = DEFAULT_PREVIEW_SPORT, theme) {
  sessionStorage.setItem(PREVIEW_FLAG_KEY, "1");
  sessionStorage.setItem(PREVIEW_SPORT_KEY, sport || DEFAULT_PREVIEW_SPORT);
  if (theme === "dark" || theme === "light") {
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }
}

/**
 * Tear down preview mode: clear the flag, drop any editor crash-recovery
 * cache the preview run left in localStorage, and return to the admin
 * dashboard with a full reload (so all React state from the fake session is
 * discarded).
 */
export function endTutorialPreviewAndReturn() {
  try {
    sessionStorage.removeItem(PREVIEW_FLAG_KEY);
    sessionStorage.removeItem(PREVIEW_SPORT_KEY);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith("coachable_play_preview-play-")) localStorage.removeItem(key);
    }
  } catch { /* ignore */ }
  window.location.href = "/admin";
}

/** Builds a fresh in-memory dataset for one preview run. */
export function createPreviewStore(sport = getTutorialPreviewSport()) {
  const year = String(new Date().getFullYear());
  return {
    user: {
      id: USER_ID,
      name: "Tutorial Preview Coach",
      email: "tutorial-preview@coachable.demo",
      emailVerified: true,
      role: "owner",
      teamId: TEAM_ID,
      teamName: "Tutorial Preview Team",
      sport,
      seasonYear: year,
      ownerId: USER_ID,
      isPersonalTeam: false,
      isBetaTester: false,
      onboarded: true,
      notifications: {},
      assistantPermissions: {},
    },
    allTeams: [
      {
        teamId: TEAM_ID,
        teamName: "Tutorial Preview Team",
        sport,
        seasonYear: year,
        ownerId: USER_ID,
        isPersonal: false,
        role: "owner",
      },
    ],
    members: [
      { id: USER_ID, name: "Tutorial Preview Coach", role: "owner", email: "tutorial-preview@coachable.demo" },
    ],
    plays: [],
    folders: [],
    prefabs: [],
    inviteCodes: { player: "PLYR-DEMO", coach: "COCH-DEMO" },
    nextId: 1,
  };
}

const store = createPreviewStore();

function nowIso() {
  return new Date().toISOString();
}

/**
 * Sample published prefab presets served by the mock for every real sport
 * (the Blank canvas has none — mirroring production, where prefab presets are
 * admin-authored per sport). Powers the tour's "Place a prefab" step without
 * touching the real sport_prefab_presets table.
 * @param {string} sportOrFieldType - onboarding sport key OR a Slate field type ("Football")
 * @returns {Array<{ id: string, name: string, prefabData: Object }>}
 */
export function buildPreviewPrefabPresets(sportOrFieldType) {
  if (resolveFieldTypeFromSport(sportOrFieldType) === "Blank") return [];
  return [
    {
      id: "preview-prefab-preset-1",
      name: "3-Player Line",
      prefabData: {
        players: [
          { dx: -60, dy: 0, number: "1", color: "#3b82f6" },
          { dx: 0, dy: 0, number: "2", color: "#3b82f6" },
          { dx: 60, dy: 0, number: "3", color: "#3b82f6" },
        ],
        objects: [],
      },
    },
    {
      id: "preview-prefab-preset-2",
      name: "Triangle",
      prefabData: {
        players: [
          { dx: -50, dy: 30, number: "4", color: "#22c55e" },
          { dx: 50, dy: 30, number: "5", color: "#22c55e" },
          { dx: 0, dy: -40, number: "6", color: "#22c55e" },
        ],
        objects: [{ dx: 0, dy: 0, objectType: "ball" }],
      },
    },
  ];
}

const NOW_PRESET = "2026-04-28T00:00:00.000Z";

/**
 * Builds 3 named sport-preset mock objects for the tutorial's pick-preset step.
 * Returns an empty array when the fieldType resolves to "Blank" (no presets exist
 * for blank canvases, mirroring production behaviour).
 *
 * Each returned preset is shaped like the real `/sport-presets/:fieldType` API:
 *   `{ id: string, name: string, playData: Object }`
 * where `playData` is a minimal valid play-export-v2 document that `PlayPreviewCard`
 * can render without crashing.
 *
 * @param {string} fieldType - Slate field type string, e.g. "Football", "Soccer".
 *   Comes directly from the URL segment in `/sport-presets/:fieldType`.
 * @returns {Array<{ id: string, name: string, playData: Object }>}
 */
export function buildPreviewSportPresets(fieldType) {
  if (!fieldType || fieldType === "Blank" || resolveFieldTypeFromSport(fieldType) === "Blank") {
    return [];
  }

  /**
   * Builds a minimal play-export-v2 playData object for a given set of player
   * positions. Mirrors the structure used by `buildBlankPreviewData` in PlayNew.jsx.
   *
   * @param {string} name - Display name baked into the play's `play.name` field.
   * @param {Array<{ x: number, y: number, number: number, color: string }>} players
   * @returns {Object} play-export-v2 document
   */
  function makePlayData(name, players) {
    const playersById = {};
    const representedPlayerIds = [];
    players.forEach((p) => {
      const id = `player-${p.number}`;
      playersById[id] = { id, x: p.x, y: p.y, number: p.number, name: "", color: p.color };
      representedPlayerIds.push(id);
    });

    return {
      schemaVersion: "play-export-v2",
      exportedAt: NOW_PRESET,
      play: {
        name,
        id: null,
        settings: {
          advancedSettings: {},
          allPlayersDisplay: { sizePercent: 100, color: "#ef4444", showNumber: true },
          currentPlayerColor: "#ef4444",
        },
        canvas: { camera: { x: 0, y: 0, zoom: 1 }, fieldRotation: 0 },
        entities: {
          playersById,
          representedPlayerIds,
          ball: { id: "ball-1", x: 40, y: 0 },
          ballsById: { "ball-1": { id: "ball-1", x: 40, y: 0 } },
        },
        animation: {
          version: 1,
          durationMs: 30000,
          tracks: {},
          meta: { createdAt: NOW_PRESET, updatedAt: NOW_PRESET },
        },
        drawings: [],
        playback: { speedMultiplier: 50 },
        meta: { appVersion: "1.0.0" },
      },
    };
  }

  return [
    {
      id: "preview-sport-preset-1",
      name: "Base Formation",
      playData: makePlayData("Base Formation", [
        { x: -60, y: 0, number: 1, color: "#3b82f6" },
        { x: 0,   y: 0, number: 2, color: "#3b82f6" },
        { x: 60,  y: 0, number: 3, color: "#3b82f6" },
      ]),
    },
    {
      id: "preview-sport-preset-2",
      name: "Attack Formation",
      playData: makePlayData("Attack Formation", [
        { x: -80,  y: -40, number: 4, color: "#22c55e" },
        { x: 0,    y: -60, number: 5, color: "#22c55e" },
        { x: 80,   y: -40, number: 6, color: "#22c55e" },
        { x: -40,  y:  20, number: 7, color: "#22c55e" },
        { x: 40,   y:  20, number: 8, color: "#22c55e" },
      ]),
    },
    {
      id: "preview-sport-preset-3",
      name: "Defense Stack",
      playData: makePlayData("Defense Stack", [
        { x: 0,   y: -50, number: 9,  color: "#ef4444" },
        { x: -50, y:  20, number: 10, color: "#ef4444" },
        { x: 50,  y:  20, number: 11, color: "#ef4444" },
      ]),
    },
  ];
}

/**
 * In-memory stand-in for the real API, matched on "METHOD /path". Handlers
 * cover every endpoint the onboarding tour and the pages it visits can hit;
 * anything unmatched resolves to {} so obscure UI corners fail soft instead
 * of crashing the preview.
 *
 * @param {string} path
 * @param {{ method?: string, body?: Object }} [options]
 * @param {ReturnType<typeof createPreviewStore>} [db] - injectable for tests
 * @returns {Promise<Object|null>}
 */
export async function mockApiFetch(path, options = {}, db = store) {
  const method = String(options.method || "GET").toUpperCase();
  const body = options.body || {};
  const cleanPath = path.split("?")[0];
  const key = `${method} ${cleanPath}`;
  let m;

  // ── Auth / session ──
  if (key === "GET /auth/me") return { user: db.user, allTeams: db.allTeams };
  if (key === "POST /auth/logout") return {};

  // ── Team members / invites ──
  if (key === `GET /teams/${TEAM_ID}/members`) return { members: db.members };
  if (key === `GET /teams/${TEAM_ID}/invite-codes`) return { codes: db.inviteCodes };
  if (key === `POST /teams/${TEAM_ID}/invite-codes/rotate`) {
    const code = `${String(body.role || "player").slice(0, 4).toUpperCase()}-DEMO2`;
    db.inviteCodes = { ...db.inviteCodes, [body.role || "player"]: code };
    return { code };
  }
  if (key === `POST /teams/${TEAM_ID}/invites`) return {}; // "sent" — nowhere, by design

  // ── Flags / suite features / sections (fail-closed shapes → hidden UI) ──
  if (key === "GET /flags/me") return { flags: {} };
  if (key === `GET /teams/${TEAM_ID}/suite/features`) return { features: {} };
  if (key === "GET /playbook-sections") return { sections: [] };

  // ── Notifications ──
  if (key === "GET /notifications") return { notifications: [] };
  if (key === "GET /notifications/unread-count") return { count: 0 };

  // ── Folders ──
  if (key === `GET /teams/${TEAM_ID}/folders`) return { folders: db.folders };
  if (key === `POST /teams/${TEAM_ID}/folders`) {
    const folder = {
      id: `preview-folder-${db.nextId++}`,
      name: body.name || "Untitled Folder",
      parentId: body.parentId || null,
      sortOrder: body.sortOrder || 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.folders.push(folder);
    return { folder };
  }

  // ── Plays ──
  if (key === `GET /teams/${TEAM_ID}/plays`) return { plays: db.plays };
  if (key === `POST /teams/${TEAM_ID}/plays`) {
    const play = {
      id: `preview-play-${db.nextId++}`,
      teamId: TEAM_ID,
      folderId: null,
      title: body.title || "Untitled",
      tags: body.tags || [],
      playData: body.playData || null,
      thumbnail: body.thumbnail || null,
      notes: body.notes || "",
      notesAuthorName: body.notesAuthorName || "",
      favorited: false,
      hiddenFromPlayers: false,
      createdByUserId: USER_ID,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.plays.push(play);
    return { play };
  }
  m = cleanPath.match(new RegExp(`^/teams/${TEAM_ID}/plays/([^/]+)(/(favorite|tags|notes|folder|share|duplicate|restore|permanent|post-to-community))?$`));
  if (m) {
    const play = db.plays.find((p) => p.id === m[1]);
    const sub = m[3] || null;
    if (!sub) {
      if (method === "GET") return play ? { play } : Promise.reject(Object.assign(new Error("Play not found"), { status: 404 }));
      if (method === "PATCH" && play) {
        Object.assign(play, body, { updatedAt: nowIso() });
        return { play };
      }
      if (method === "DELETE" && play) {
        db.plays = db.plays.filter((p) => p.id !== play.id);
        return {};
      }
      return {};
    }
    if (play) {
      if (sub === "favorite") play.favorited = Boolean(body.favorited);
      if (sub === "tags") play.tags = body.tags || [];
      if (sub === "notes") { play.notes = body.notes || ""; play.notesAuthorName = body.notesAuthorName || ""; }
      if (sub === "folder") play.folderId = body.folderId || null;
      play.updatedAt = nowIso();
    }
    if (sub === "share") return { token: "preview-share-token" };
    if (sub === "duplicate" && play) {
      const copy = { ...play, id: `preview-play-${db.nextId++}`, title: `${play.title} (copy)`, createdAt: nowIso(), updatedAt: nowIso() };
      db.plays.push(copy);
      return { play: copy };
    }
    return {};
  }
  if (key === `GET /teams/${TEAM_ID}/plays-trash`) return { plays: [] };
  if (method === "POST" && cleanPath.startsWith(`/teams/${TEAM_ID}/plays/bulk/`)) return {};

  // ── Tags / presets / prefabs ──
  if (key === `GET /teams/${TEAM_ID}/tags`) return { tags: [] };
  if (method === "GET" && cleanPath.startsWith("/sport-presets/")) {
    const ftSegment = decodeURIComponent(cleanPath.split("/")[2] || "");
    return { presets: buildPreviewSportPresets(ftSegment) };
  }
  if (method === "GET" && cleanPath.startsWith("/sport-prefab-presets/")) {
    const sportSegment = decodeURIComponent(cleanPath.split("/")[2] || "");
    return { presets: buildPreviewPrefabPresets(sportSegment) };
  }
  if (key === "GET /prefabs") return { prefabs: db.prefabs };
  if (key === "POST /prefabs") {
    const prefab = { id: `preview-prefab-${db.nextId++}`, label: body.label || "Prefab", ...(body.prefab_data || {}) };
    db.prefabs.push(prefab);
    return { prefab };
  }
  m = cleanPath.match(/^\/prefabs\/([^/]+)$/);
  if (m && method === "DELETE") {
    db.prefabs = db.prefabs.filter((p) => p.id !== m[1]);
    return {};
  }

  // Anything else: succeed empty so unrelated UI fails soft. Writes are
  // intentionally swallowed — preview mode must never persist anything.
  if (typeof console !== "undefined") {
    console.warn(`[tutorial-preview] unhandled mock endpoint: ${key} — returned {}`);
  }
  return {};
}
