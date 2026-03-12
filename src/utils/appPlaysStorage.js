import {
  log as logPersistence,
  summarizePlayData,
  summarizePlaysCollection,
} from "./playPersistenceDebugLogger";

const STORAGE_KEY = "coachable_app_plays";
const FOLDERS_KEY = "coachable_app_folders";

const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
const toTrimmedString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeNotesPayload = ({
  notes,
  notesAuthorName,
  notesUpdatedAt,
  fallbackTimestamp = null,
  defaultToNow = false,
}) => {
  const normalizedNotes = toTrimmedString(notes);
  if (!normalizedNotes) {
    return {
      notes: "",
      notesAuthorName: "",
      notesUpdatedAt: null,
    };
  }
  const normalizedTimestamp =
    (typeof notesUpdatedAt === "string" && notesUpdatedAt) ||
    fallbackTimestamp ||
    (defaultToNow ? new Date().toISOString() : null);

  return {
    notes: normalizedNotes,
    notesAuthorName: toTrimmedString(notesAuthorName),
    notesUpdatedAt: normalizedTimestamp,
  };
};

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
        const normalizedNotes = normalizeNotesPayload({
          notes: play.notes,
          notesAuthorName: play.notesAuthorName,
          notesUpdatedAt: play.notesUpdatedAt,
          fallbackTimestamp:
            (typeof play.updatedAt === "string" && play.updatedAt) ||
            (typeof play.createdAt === "string" && play.createdAt) ||
            null,
        });
        const nextPlay = { ...play, ...normalizedNotes };
        if (
          play.notes !== nextPlay.notes ||
          play.notesAuthorName !== nextPlay.notesAuthorName ||
          play.notesUpdatedAt !== nextPlay.notesUpdatedAt
        ) {
          normalized = true;
        }
        return nextPlay;
      });

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
  const id = requestedId || "p-" + Date.now();
  const normalizedNotes = normalizeNotesPayload({
    notes,
    notesAuthorName,
    notesUpdatedAt,
    defaultToNow: true,
  });
  const entry = {
    id,
    title: playName || "Untitled",
    tags,
    playData,
    ...normalizedNotes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    favorited: false,
  };
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
  const normalizedNotes = hasAnyNotesUpdate
    ? normalizeNotesPayload({
      notes: hasNotes ? updates.notes : existingPlay.notes,
      notesAuthorName: hasNotesAuthorName
        ? updates.notesAuthorName
        : existingPlay.notesAuthorName,
      notesUpdatedAt: hasNotesUpdatedAt ? updates.notesUpdatedAt : existingPlay.notesUpdatedAt,
      fallbackTimestamp:
          (typeof existingPlay.notesUpdatedAt === "string" && existingPlay.notesUpdatedAt) ||
          (typeof existingPlay.updatedAt === "string" && existingPlay.updatedAt) ||
          (typeof existingPlay.createdAt === "string" && existingPlay.createdAt) ||
          null,
      defaultToNow: true,
    })
    : {};

  plays[idx] = {
    ...existingPlay,
    ...updates,
    ...normalizedNotes,
    updatedAt: new Date().toISOString(),
  };
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plays));
  logPersistence("saveAllAppPlays replaced", summarizePlaysCollection(plays));
}

const normalizeFolderPlayIds = (playIds, validPlayIds) => {
  const uniqueIds = Array.from(
    new Set((Array.isArray(playIds) ? playIds : []).filter(isNonEmptyString))
  );
  if (!validPlayIds) return uniqueIds;
  return uniqueIds.filter((id) => validPlayIds.has(id));
};

const sameStringArray = (a, b) =>
  Array.isArray(a) &&
  Array.isArray(b) &&
  a.length === b.length &&
  a.every((value, index) => value === b[index]);

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
