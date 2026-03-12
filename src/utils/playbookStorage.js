import {
  log as logPersistence,
  summarizePlayData,
} from "./playPersistenceDebugLogger";
import { normalizePlayRecord, normalizeTeamRecord } from "./dataContracts";

const PLAYBOOK_KEY = "coachable-playbook";
const TEAMS_KEY = "coachable-teams";
const ACTIVE_TEAM_KEY = "coachable-active-team";

const DEFAULT_TEAM = normalizeTeamRecord({
  id: "team-default",
  name: "My Team",
});
const DEFAULT_FOLDERS = [
  { id: "folder-offense", name: "Offense" },
  { id: "folder-defense", name: "Defense" },
  { id: "folder-setpieces", name: "Set Pieces" },
  { id: "folder-other", name: "Other" },
];

const isObject = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value));

const sameStringArray = (a, b) =>
  Array.isArray(a) &&
  Array.isArray(b) &&
  a.length === b.length &&
  a.every((value, index) => value === b[index]);

const samePlayContract = (raw, normalized) =>
  Boolean(raw) &&
  raw.id === normalized.id &&
  raw.title === normalized.title &&
  raw.playName === normalized.playName &&
  (raw.teamId ?? null) === (normalized.teamId ?? null) &&
  (raw.folderId ?? null) === (normalized.folderId ?? null) &&
  sameStringArray(raw.tags, normalized.tags) &&
  raw.playData === normalized.playData &&
  (raw.thumbnail ?? null) === (normalized.thumbnail ?? null) &&
  (raw.notes ?? "") === normalized.notes &&
  (raw.notesAuthorName ?? "") === normalized.notesAuthorName &&
  (raw.notesUpdatedAt ?? null) === normalized.notesUpdatedAt &&
  Boolean(raw.favorited) === normalized.favorited &&
  raw.createdAt === normalized.createdAt &&
  raw.updatedAt === normalized.updatedAt &&
  raw.savedAt === normalized.savedAt;

const sameTeamContract = (raw, normalized) =>
  Boolean(raw) &&
  raw.id === normalized.id &&
  raw.name === normalized.name &&
  raw.teamName === normalized.teamName &&
  (raw.sport ?? null) === (normalized.sport ?? null) &&
  (raw.seasonYear ?? null) === (normalized.seasonYear ?? null) &&
  (raw.ownerId ?? null) === (normalized.ownerId ?? null) &&
  raw.createdAt === normalized.createdAt &&
  raw.updatedAt === normalized.updatedAt;

const normalizeTeams = (teams) =>
  (Array.isArray(teams) ? teams : [])
    .map((team) => normalizeTeamRecord(team))
    .filter(Boolean);

const normalizePlaybook = (playbook) => {
  const raw = isObject(playbook) ? playbook : {};
  const folders = isObject(raw.folders) ? raw.folders : {};
  const plays = (Array.isArray(raw.plays) ? raw.plays : [])
    .map((play) => normalizePlayRecord(play, { defaultToNowForNotes: false }))
    .filter(Boolean);
  return { folders, plays };
};

/** Load teams from localStorage. Returns at least the default team. */
export function loadTeams() {
  try {
    const raw = localStorage.getItem(TEAMS_KEY);
    if (!raw) {
      logPersistence("playbook loadTeams default");
      return [DEFAULT_TEAM];
    }

    const parsed = JSON.parse(raw);
    const parsedTeams = Array.isArray(parsed) ? parsed : [];
    let normalized = !Array.isArray(parsed);

    const teams = parsedTeams
      .map((team) => {
        const nextTeam = normalizeTeamRecord(team);
        if (!nextTeam) {
          normalized = true;
          return null;
        }
        if (!sameTeamContract(team, nextTeam)) {
          normalized = true;
        }
        return nextTeam;
      })
      .filter(Boolean);

    const safeTeams = teams.length > 0 ? teams : [DEFAULT_TEAM];
    if (!teams.length) normalized = true;

    if (normalized) {
      localStorage.setItem(TEAMS_KEY, JSON.stringify(safeTeams));
    }
    logPersistence("playbook loadTeams ok", { teamCount: safeTeams.length });
    return safeTeams;
  } catch {
    logPersistence("playbook loadTeams failed parseError=true");
    return [DEFAULT_TEAM];
  }
}

/** Save teams array to localStorage. */
export function saveTeams(teams) {
  const normalizedTeams = normalizeTeams(teams);
  const safeTeams = normalizedTeams.length > 0 ? normalizedTeams : [DEFAULT_TEAM];
  localStorage.setItem(TEAMS_KEY, JSON.stringify(safeTeams));
  logPersistence("playbook saveTeams", {
    teamCount: safeTeams.length,
  });
}

/** Add a new team. Returns updated array. */
export function addTeam(name) {
  const teams = loadTeams();
  const fallbackId = `team-${Date.now()}`;
  const team = normalizeTeamRecord(
    { id: fallbackId, name: String(name || "").trim() },
    { fallbackId }
  );
  const nextTeam = team || DEFAULT_TEAM;
  const updatedTeams = [...teams, nextTeam];
  saveTeams(updatedTeams);
  logPersistence("playbook addTeam", { teamId: nextTeam.id, name: nextTeam.name });
  return { teams: updatedTeams, team: nextTeam };
}

/** Get the active team ID. */
export function loadActiveTeamId() {
  const teamId = localStorage.getItem(ACTIVE_TEAM_KEY) || null;
  logPersistence("playbook loadActiveTeamId", { teamId });
  return teamId;
}

/** Set the active team ID. */
export function saveActiveTeamId(teamId) {
  localStorage.setItem(ACTIVE_TEAM_KEY, teamId);
  logPersistence("playbook saveActiveTeamId", { teamId });
}

/** Load the full playbook (all teams). Returns { folders, plays }. */
export function loadPlaybook() {
  try {
    const raw = localStorage.getItem(PLAYBOOK_KEY);
    if (!raw) {
      logPersistence("playbook loadPlaybook default");
      return { folders: {}, plays: [] };
    }

    const parsed = JSON.parse(raw);
    const parsedPlays = Array.isArray(parsed?.plays) ? parsed.plays : [];
    let normalized = !isObject(parsed) || !Array.isArray(parsed?.plays);

    const plays = parsedPlays
      .map((play) => {
        const nextPlay = normalizePlayRecord(play, { defaultToNowForNotes: false });
        if (!nextPlay) {
          normalized = true;
          return null;
        }
        if (!samePlayContract(play, nextPlay)) {
          normalized = true;
        }
        return nextPlay;
      })
      .filter(Boolean);

    const playbook = {
      folders: isObject(parsed?.folders) ? parsed.folders : {},
      plays,
    };
    if (!isObject(parsed?.folders)) normalized = true;

    if (normalized) {
      localStorage.setItem(PLAYBOOK_KEY, JSON.stringify(playbook));
    }
    logPersistence("playbook loadPlaybook ok", {
      teamFolderCount: Object.keys(playbook.folders).length,
      playCount: playbook.plays.length,
    });
    return playbook;
  } catch {
    logPersistence("playbook loadPlaybook failed parseError=true");
    return { folders: {}, plays: [] };
  }
}

/** Save full playbook to localStorage. */
function savePlaybook(playbook) {
  const normalized = normalizePlaybook(playbook);
  localStorage.setItem(PLAYBOOK_KEY, JSON.stringify(normalized));
  logPersistence("playbook savePlaybook", {
    teamFolderCount: Object.keys(normalized.folders).length,
    playCount: normalized.plays.length,
  });
}

/** Get folders for a specific team. Returns array of { id, name }. */
export function getFoldersForTeam(teamId) {
  const playbook = loadPlaybook();
  const teamFolders = playbook.folders[teamId];
  if (Array.isArray(teamFolders) && teamFolders.length > 0) return teamFolders;
  return DEFAULT_FOLDERS;
}

/** Save folders for a specific team. */
export function saveFoldersForTeam(teamId, folders) {
  const playbook = loadPlaybook();
  playbook.folders[teamId] = folders;
  savePlaybook(playbook);
  logPersistence("playbook saveFoldersForTeam", {
    teamId,
    folderCount: Array.isArray(folders) ? folders.length : 0,
  });
}

/** Add a new folder for a team. Returns updated folders array. */
export function addFolderForTeam(teamId, folderName) {
  const folders = getFoldersForTeam(teamId);
  const folder = { id: `folder-${Date.now()}`, name: String(folderName || "").trim() };
  const updated = [...folders, folder];
  saveFoldersForTeam(teamId, updated);
  logPersistence("playbook addFolderForTeam", {
    teamId,
    folderId: folder.id,
    folderName: folder.name,
  });
  return { folders: updated, folder };
}

/**
 * Save a play to the playbook.
 * @param {Object} params
 * @param {string} params.teamId
 * @param {string} params.folderId
 * @param {string} params.playName
 * @param {string|null} params.thumbnail - base64 data URL
 * @param {Object} params.playData - full export object
 * @param {string|null} params.notes
 * @returns {Object} the saved play entry
 */
export function savePlayToPlaybook({ teamId, folderId, playName, thumbnail, playData, notes }) {
  const playbook = loadPlaybook();
  const generatedId = `play-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();
  const entry = normalizePlayRecord(
    {
      id: generatedId,
      teamId,
      folderId,
      title: String(playName || "").trim(),
      thumbnail: thumbnail || null,
      playData,
      notes: notes?.trim() || "",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      fallbackId: generatedId,
      defaultToNowForNotes: true,
      nowIso,
    }
  );

  if (!entry) {
    throw new Error("Failed to normalize playbook play");
  }

  playbook.plays.push(entry);
  savePlaybook(playbook);
  logPersistence("playbook savePlayToPlaybook", {
    teamId: entry.teamId,
    folderId: entry.folderId,
    playId: entry.id,
    playName: entry.title,
    hasThumbnail: Boolean(entry.thumbnail),
    notesLength: entry.notes.length,
    summary: summarizePlayData(entry.playData),
  });
  return entry;
}

/** Get plays for a specific team and folder. */
export function getPlaysForFolder(teamId, folderId) {
  const playbook = loadPlaybook();
  const plays = playbook.plays.filter((p) => p.teamId === teamId && p.folderId === folderId);
  logPersistence("playbook getPlaysForFolder", {
    teamId,
    folderId,
    playCount: plays.length,
  });
  return plays;
}

/** Count plays per folder for a team. Returns { [folderId]: count }. */
export function getPlayCountsByFolder(teamId) {
  const playbook = loadPlaybook();
  const counts = {};
  playbook.plays.forEach((p) => {
    if (p.teamId === teamId) {
      counts[p.folderId] = (counts[p.folderId] || 0) + 1;
    }
  });
  logPersistence("playbook getPlayCountsByFolder", {
    teamId,
    folderCount: Object.keys(counts).length,
  });
  return counts;
}
