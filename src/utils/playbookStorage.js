import {
  log as logPersistence,
  summarizePlayData,
} from "./playPersistenceDebugLogger";

const PLAYBOOK_KEY = "coachable-playbook";
const TEAMS_KEY = "coachable-teams";
const ACTIVE_TEAM_KEY = "coachable-active-team";

const DEFAULT_TEAM = { id: "team-default", name: "My Team" };
const DEFAULT_FOLDERS = [
  { id: "folder-offense", name: "Offense" },
  { id: "folder-defense", name: "Defense" },
  { id: "folder-setpieces", name: "Set Pieces" },
  { id: "folder-other", name: "Other" },
];

/** Load teams from localStorage. Returns at least the default team. */
export function loadTeams() {
  try {
    const raw = localStorage.getItem(TEAMS_KEY);
    if (!raw) {
      logPersistence("playbook loadTeams default");
      return [DEFAULT_TEAM];
    }
    const parsed = JSON.parse(raw);
    const teams = Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_TEAM];
    logPersistence("playbook loadTeams ok", { teamCount: teams.length });
    return teams;
  } catch {
    logPersistence("playbook loadTeams failed parseError=true");
    return [DEFAULT_TEAM];
  }
}

/** Save teams array to localStorage. */
export function saveTeams(teams) {
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  logPersistence("playbook saveTeams", {
    teamCount: Array.isArray(teams) ? teams.length : 0,
  });
}

/** Add a new team. Returns updated array. */
export function addTeam(name) {
  const teams = loadTeams();
  const team = { id: `team-${Date.now()}`, name: name.trim() };
  teams.push(team);
  saveTeams(teams);
  logPersistence("playbook addTeam", { teamId: team.id, name: team.name });
  return { teams, team };
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

/** Load the full playbook (all teams). Returns { teams, folders, plays }. */
export function loadPlaybook() {
  try {
    const raw = localStorage.getItem(PLAYBOOK_KEY);
    if (!raw) {
      logPersistence("playbook loadPlaybook default");
      return { folders: {}, plays: [] };
    }
    const parsed = JSON.parse(raw);
    const playbook = {
      folders: parsed.folders || {},
      plays: Array.isArray(parsed.plays) ? parsed.plays : [],
    };
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
  localStorage.setItem(PLAYBOOK_KEY, JSON.stringify(playbook));
  logPersistence("playbook savePlaybook", {
    teamFolderCount: Object.keys(playbook?.folders || {}).length,
    playCount: Array.isArray(playbook?.plays) ? playbook.plays.length : 0,
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
  const folder = { id: `folder-${Date.now()}`, name: folderName.trim() };
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
  const entry = {
    id: `play-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    teamId,
    folderId,
    playName: playName.trim(),
    thumbnail: thumbnail || null,
    playData,
    notes: notes?.trim() || "",
    savedAt: new Date().toISOString(),
  };
  playbook.plays.push(entry);
  savePlaybook(playbook);
  logPersistence("playbook savePlayToPlaybook", {
    teamId,
    folderId,
    playId: entry.id,
    playName: entry.playName,
    hasThumbnail: Boolean(thumbnail),
    notesLength: entry.notes.length,
    summary: summarizePlayData(playData),
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
