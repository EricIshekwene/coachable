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

const PREVIEW_FLAG_KEY = "coachable_tutorial_preview";

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

/** Arm preview mode for this tab. The caller then navigates into /app. */
export function activateTutorialPreview() {
  sessionStorage.setItem(PREVIEW_FLAG_KEY, "1");
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
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith("coachable_play_preview-play-")) localStorage.removeItem(key);
    }
  } catch { /* ignore */ }
  window.location.href = "/admin";
}

/** Builds a fresh in-memory dataset for one preview run. */
export function createPreviewStore() {
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
      sport: "football",
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
        sport: "football",
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
  if (method === "GET" && cleanPath.startsWith("/sport-presets/")) return { presets: [] };
  if (method === "GET" && cleanPath.startsWith("/sport-prefab-presets/")) return { presets: [] };
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
