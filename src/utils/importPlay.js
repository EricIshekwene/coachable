export const IMPORT_SCHEMA_VERSION = "play-export-v1";
export const IMPORT_FILE_SIZE_LIMIT_BYTES = 5 * 1024 * 1024;

const EPSILON = 1e-9;

export const resolveSnapshotForKeyframe = (keyframeNumber, snapshots) => {
  const exactKey = String(keyframeNumber);
  if (snapshots && snapshots[exactKey]) {
    return { key: exactKey, snapshot: snapshots[exactKey] };
  }
  const keys = Object.keys(snapshots || {});
  for (const key of keys) {
    const numericKey = Number(key);
    if (Number.isNaN(numericKey)) continue;
    if (Math.abs(numericKey - keyframeNumber) <= EPSILON) {
      return { key, snapshot: snapshots[key] };
    }
  }
  return null;
};

export const validatePlayExportV1 = (exportObj) => {
  if (!exportObj || typeof exportObj !== "object") {
    return { ok: false, error: "Invalid JSON: expected an object at the root." };
  }
  if (exportObj.schemaVersion !== IMPORT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported schemaVersion. Expected "${IMPORT_SCHEMA_VERSION}".`,
    };
  }
  const play = exportObj.play;
  if (!play || typeof play !== "object") {
    return { ok: false, error: "Invalid export: missing play object." };
  }
  if (typeof play.name !== "string") {
    return { ok: false, error: "Invalid export: play.name must be a string." };
  }
  const playersById = play.entities?.playersById;
  if (!playersById || typeof playersById !== "object" || Array.isArray(playersById)) {
    return { ok: false, error: "Invalid export: play.entities.playersById must be an object." };
  }
  const keyframes = play.timeline?.keyframes;
  if (!Array.isArray(keyframes) || keyframes.some((kf) => typeof kf !== "number")) {
    return { ok: false, error: "Invalid export: play.timeline.keyframes must be an array of numbers." };
  }
  const keyframeSnapshots = play.timeline?.keyframeSnapshots;
  if (!keyframeSnapshots || typeof keyframeSnapshots !== "object" || Array.isArray(keyframeSnapshots)) {
    return {
      ok: false,
      error: "Invalid export: play.timeline.keyframeSnapshots must be an object.",
    };
  }
  for (const kf of keyframes) {
    const resolved = resolveSnapshotForKeyframe(kf, keyframeSnapshots);
    if (!resolved?.snapshot) {
      return {
        ok: false,
        error: `Invalid export: missing snapshot for keyframe ${kf}.`,
      };
    }
  }
  return { ok: true, play };
};

export const addPlayerFromData = (
  playersById,
  representedPlayerIds,
  player,
  { preserveId = true } = {}
) => {
  const nextPlayers = { ...(playersById || {}) };
  const nextRepresented = [...(representedPlayerIds || [])];
  if (!player || typeof player !== "object") {
    return { playersById: nextPlayers, representedPlayerIds: nextRepresented };
  }
  const id = preserveId ? player.id : player.id;
  if (!id) {
    return { playersById: nextPlayers, representedPlayerIds: nextRepresented };
  }
  nextPlayers[id] = { ...player, id };
  if (!nextRepresented.includes(id)) {
    nextRepresented.push(id);
  }
  return { playersById: nextPlayers, representedPlayerIds: nextRepresented };
};

export const addKeyframeFromData = (keyframes, keyframeSnapshots, timeValue, snapshot) => {
  const nextKeyframes = Array.isArray(keyframes) ? [...keyframes] : [];
  if (!nextKeyframes.includes(timeValue)) {
    nextKeyframes.push(timeValue);
  }
  nextKeyframes.sort((a, b) => a - b);
  const nextSnapshots = { ...(keyframeSnapshots || {}) };
  nextSnapshots[String(timeValue)] = snapshot;
  return { keyframes: nextKeyframes, keyframeSnapshots: nextSnapshots };
};
