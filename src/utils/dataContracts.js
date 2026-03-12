const DEFAULT_PLAY_TITLE = "Untitled";
const DEFAULT_TEAM_NAME = "My Team";

const isObject = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value));
const toTrimmedString = (value) => (typeof value === "string" ? value.trim() : "");

const toOptionalString = (value) => {
  const normalized = toTrimmedString(value);
  return normalized || null;
};

const toIsoTimestamp = (value, fallbackIso) => {
  const raw = toTrimmedString(value);
  if (raw) {
    const asDate = new Date(raw);
    if (!Number.isNaN(asDate.getTime())) return asDate.toISOString();
  }
  return fallbackIso;
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  const unique = new Set();
  value.forEach((entry) => {
    const normalized = toTrimmedString(entry);
    if (normalized) unique.add(normalized);
  });
  return Array.from(unique);
};

const isLikelyDataUrl = (value) => /^data:/i.test(String(value || ""));

const normalizeThumbnail = (value) => {
  const normalized = toTrimmedString(value);
  if (!normalized) return null;
  return isLikelyDataUrl(normalized) ? normalized : null;
};

/**
 * Canonical play record shape used across local storage modules and backend payloads.
 *
 * @typedef {Object} PlayRecord
 * @property {string} id
 * @property {string|null} teamId
 * @property {string|null} folderId
 * @property {string} title
 * @property {string[]} tags
 * @property {Object|null} playData
 * @property {string|null} thumbnail
 * @property {string} notes
 * @property {string} notesAuthorName
 * @property {string|null} notesUpdatedAt
 * @property {boolean} favorited
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} playName - legacy alias for title
 * @property {string} savedAt - legacy alias for updatedAt
 */

/**
 * Normalize arbitrary play input into a canonical PlayRecord.
 * Returns null when no id can be resolved.
 */
export function normalizePlayRecord(input, options = {}) {
  const nowIso = toIsoTimestamp(options.nowIso, null) || new Date().toISOString();
  const raw = isObject(input) ? input : {};

  const id = toTrimmedString(raw.id) || toTrimmedString(options.fallbackId);
  if (!id) return null;

  const title =
    toTrimmedString(raw.title) ||
    toTrimmedString(raw.playName) ||
    toTrimmedString(options.title) ||
    toTrimmedString(options.playName) ||
    DEFAULT_PLAY_TITLE;

  const createdAt = toIsoTimestamp(
    raw.createdAt || raw.savedAt || raw.updatedAt || options.createdAt,
    nowIso
  );
  const updatedAt = toIsoTimestamp(raw.updatedAt || raw.savedAt || options.updatedAt, createdAt);

  const notes = toTrimmedString(raw.notes ?? options.notes);
  const notesAuthorName = notes
    ? toTrimmedString(raw.notesAuthorName ?? options.notesAuthorName)
    : "";

  const notesUpdatedAt = notes
    ? toIsoTimestamp(
      raw.notesUpdatedAt ||
        options.notesUpdatedAt ||
        raw.updatedAt ||
        raw.savedAt ||
        raw.createdAt ||
        (options.defaultToNowForNotes ? nowIso : null),
      null
    )
    : null;

  return {
    id,
    teamId: toOptionalString(raw.teamId ?? options.teamId),
    folderId: toOptionalString(raw.folderId ?? options.folderId),
    title,
    tags: normalizeStringArray(raw.tags ?? options.tags),
    playData: raw.playData ?? options.playData ?? null,
    thumbnail: normalizeThumbnail(raw.thumbnail ?? options.thumbnail),
    notes,
    notesAuthorName,
    notesUpdatedAt,
    favorited: Boolean(raw.favorited ?? options.favorited),
    createdAt,
    updatedAt,
    // Legacy compatibility aliases to avoid breaking existing callsites during migration.
    playName: title,
    savedAt: updatedAt,
  };
}

/**
 * Canonical team record shape used by playbook/team endpoints.
 *
 * @typedef {Object} TeamRecord
 * @property {string} id
 * @property {string} name
 * @property {string|null} sport
 * @property {string|null} seasonYear
 * @property {string|null} ownerId
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} teamName - legacy alias for name
 */

/**
 * Normalize arbitrary team input into a canonical TeamRecord.
 * Returns null when no id can be resolved.
 */
export function normalizeTeamRecord(input, options = {}) {
  const nowIso = toIsoTimestamp(options.nowIso, null) || new Date().toISOString();
  const raw = isObject(input) ? input : {};

  const id =
    toTrimmedString(raw.id) ||
    toTrimmedString(raw.teamId) ||
    toTrimmedString(options.fallbackId);
  if (!id) return null;

  const name =
    toTrimmedString(raw.name) ||
    toTrimmedString(raw.teamName) ||
    toTrimmedString(options.name) ||
    DEFAULT_TEAM_NAME;

  const createdAt = toIsoTimestamp(raw.createdAt || options.createdAt, nowIso);
  const updatedAt = toIsoTimestamp(raw.updatedAt || options.updatedAt, createdAt);

  return {
    id,
    name,
    sport: toOptionalString(raw.sport ?? options.sport),
    seasonYear: toOptionalString(raw.seasonYear ?? options.seasonYear),
    ownerId: toOptionalString(raw.ownerId ?? options.ownerId),
    createdAt,
    updatedAt,
    // Legacy compatibility alias to ease migration from existing profile/team state.
    teamName: name,
  };
}

/**
 * Play payload for backend endpoints (canonical contract only, no legacy aliases).
 */
export function toPlayEndpointPayload(record) {
  const normalized = normalizePlayRecord(record);
  if (!normalized) return null;
  const { playName: _playName, savedAt: _savedAt, ...payload } = normalized;
  return payload;
}

/**
 * Team payload for backend endpoints (canonical contract only, no legacy aliases).
 */
export function toTeamEndpointPayload(record) {
  const normalized = normalizeTeamRecord(record);
  if (!normalized) return null;
  const { teamName: _teamName, ...payload } = normalized;
  return payload;
}
