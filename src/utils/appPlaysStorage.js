import {
  log as logPersistence,
  summarizePlayData,
  summarizePlaysCollection,
} from "./playPersistenceDebugLogger";
import { normalizePlayRecord } from "./dataContracts";

const STORAGE_KEY = "coachable_app_plays";
const FOLDERS_KEY = "coachable_app_folders";

const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;

const sameStringArray = (a, b) =>
  Array.isArray(a) &&
  Array.isArray(b) &&
  a.length === b.length &&
  a.every((value, index) => value === b[index]);

const hasSamePlayContract = (raw, normalized) =>
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

/** Load all saved plays from localStorage. */
export function loadAppPlays() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const parsedPlays = Array.isArray(parsed) ? parsed : [];
    let normalized = !Array.isArray(parsed);

    const safeParsed = parsedPlays
      .filter((play) => {
        const keep = Boolean(play && typeof play === "object" && isNonEmptyString(play.id));
        if (!keep) normalized = true;
        return keep;
      })
      .map((play) => {
        const nextPlay = normalizePlayRecord(play, { defaultToNowForNotes: false });
        if (!nextPlay) {
          normalized = true;
          return null;
        }
        if (!hasSamePlayContract(play, nextPlay)) {
          normalized = true;
        }
        return nextPlay;
      })
      .filter(Boolean);

    if (normalized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeParsed));
      logPersistence("loadAppPlays normalized", summarizePlaysCollection(safeParsed));
    }
    logPersistence("loadAppPlays ok", summarizePlaysCollection(safeParsed));
    return safeParsed;
  } catch {
    logPersistence("loadAppPlays failed parseError=true");
    return [];
  }
}

/** Save a play from the slate editor. Returns the saved entry. */
export function saveAppPlay({
  playName,
  playData,
  tags = [],
  id: requestedId,
  notes = "",
  notesAuthorName = "",
  notesUpdatedAt = null,
}) {
  const plays = loadAppPlays();
  const nowIso = new Date().toISOString();
  const id = requestedId || "p-" + Date.now();

  const entry = normalizePlayRecord(
    {
      id,
      title: playName || "Untitled",
      tags,
      playData,
      notes,
      notesAuthorName,
      notesUpdatedAt,
      favorited: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { fallbackId: id, defaultToNowForNotes: true, nowIso }
  );

  if (!entry) {
    throw new Error("Failed to create play record");
  }

  plays.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plays));
  logPersistence("saveAppPlay inserted", {
    id,
    title: entry.title,
    tagsCount: Array.isArray(tags) ? tags.length : 0,
    summary: summarizePlayData(playData),
    collection: summarizePlaysCollection(plays),
  });
  return entry;
}

/** Update an existing play by id. */
export function updateAppPlay(playId, updates = {}) {
  const plays = loadAppPlays();
  const idx = plays.findIndex((p) => p.id === playId);
  if (idx === -1) {
    logPersistence("updateAppPlay skipped missingPlay", { playId });
    return null;
  }

  const existingPlay = plays[idx];
  const hasNotes = Object.prototype.hasOwnProperty.call(updates, "notes");
  const hasNotesAuthorName = Object.prototype.hasOwnProperty.call(updates, "notesAuthorName");
  const hasNotesUpdatedAt = Object.prototype.hasOwnProperty.call(updates, "notesUpdatedAt");
  const hasAnyNotesUpdate = hasNotes || hasNotesAuthorName || hasNotesUpdatedAt;
  const nowIso = new Date().toISOString();

  const nextPlay = normalizePlayRecord(
    {
      ...existingPlay,
      ...updates,
      id: existingPlay.id,
      createdAt: existingPlay.createdAt,
      updatedAt: nowIso,
    },
    {
      fallbackId: existingPlay.id,
      defaultToNowForNotes: hasAnyNotesUpdate,
      nowIso,
    }
  );

  if (!nextPlay) {
    logPersistence("updateAppPlay failed normalize", { playId });
    return null;
  }

  if (!hasAnyNotesUpdate) {
    nextPlay.notes = existingPlay.notes || "";
    nextPlay.notesAuthorName = existingPlay.notesAuthorName || "";
    nextPlay.notesUpdatedAt = existingPlay.notesUpdatedAt || null;
  }

  plays[idx] = nextPlay;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plays));
  logPersistence("updateAppPlay updated", {
    playId,
    title: plays[idx]?.title || null,
    summary: summarizePlayData(plays[idx]?.playData),
    collection: summarizePlaysCollection(plays),
  });
  return plays[idx];
}

/** Delete a play by id. */
export function deleteAppPlay(playId) {
  const plays = loadAppPlays().filter((p) => p.id !== playId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plays));
  logPersistence("deleteAppPlay deleted", {
    playId,
    collection: summarizePlaysCollection(plays),
  });
}

/** Save all plays (bulk update). */
export function saveAllAppPlays(plays) {
  const normalizedPlays = (Array.isArray(plays) ? plays : [])
    .map((play) => normalizePlayRecord(play, { defaultToNowForNotes: false }))
    .filter(Boolean);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedPlays));
  logPersistence("saveAllAppPlays replaced", summarizePlaysCollection(normalizedPlays));
}

const normalizeFolderPlayIds = (playIds, validPlayIds) => {
  const uniqueIds = Array.from(new Set((Array.isArray(playIds) ? playIds : []).filter(isNonEmptyString)));
  if (!validPlayIds) return uniqueIds;
  return uniqueIds.filter((id) => validPlayIds.has(id));
};

/** Load all folder hierarchy. */
export function loadFolders() {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const parsedFolders = Array.isArray(parsed) ? parsed : [];
    const validPlayIds = new Set(loadAppPlays().map((play) => play?.id).filter(isNonEmptyString));
    let normalized = false;

    const safeParsed = parsedFolders
      .filter((folder) => {
        const keep = Boolean(folder && typeof folder === "object" && isNonEmptyString(folder.id));
        if (!keep) normalized = true;
        return keep;
      })
      .map((folder) => {
        const nextPlayIds = normalizeFolderPlayIds(folder.playIds, validPlayIds);
        const nextTags = Array.isArray(folder.tags) ? folder.tags : [];
        const nextParentId = isNonEmptyString(folder.parentId) ? folder.parentId : null;
        const needsUpdate =
          !sameStringArray(folder.playIds, nextPlayIds) ||
          !Array.isArray(folder.tags) ||
          folder.parentId !== nextParentId;
        if (needsUpdate) {
          normalized = true;
          return {
            ...folder,
            playIds: nextPlayIds,
            tags: nextTags,
            parentId: nextParentId,
          };
        }
        return folder;
      });

    if (normalized) {
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(safeParsed));
      logPersistence("loadFolders normalized", { folderCount: safeParsed.length });
    }
    logPersistence("loadFolders ok", { folderCount: safeParsed.length });
    return safeParsed;
  } catch {
    logPersistence("loadFolders failed parseError=true");
    return [];
  }
}

/** Save folder hierarchy. */
export function saveFolders(folders) {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  logPersistence("saveFolders replaced", {
    folderCount: Array.isArray(folders) ? folders.length : 0,
  });
}
