export const IMPORT_SCHEMA_VERSION = "play-export-v1";
export const IMPORT_SCHEMA_VERSION_1_0_0 = "1.0.0";
export const IMPORT_FILE_SIZE_LIMIT_BYTES = 5 * 1024 * 1024;

const EPSILON = 1e-9;
const DEFAULT_DURATION_MS = 30000;

const normalizeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const roundTo3 = (value) => Math.round(normalizeNumber(value, 0) * 1000) / 1000;

export const sanitizePercentKey = (n) => {
  const rounded = roundTo3(n);
  const key = rounded.toFixed(3).replace(/\.?0+$/g, "");
  return key || "0";
};

export const unionTrackTimesMs = (tracks) => {
  const times = new Set([0]);
  if (!tracks || typeof tracks !== "object" || Array.isArray(tracks)) {
    return [0];
  }
  Object.values(tracks).forEach((track) => {
    const keyframes = Array.isArray(track?.keyframes) ? track.keyframes : [];
    keyframes.forEach((kf) => {
      const t = Math.round(Number(kf?.t));
      if (Number.isFinite(t) && t >= 0) {
        times.add(t);
      }
    });
  });
  return Array.from(times).sort((a, b) => a - b);
};

const normalizeTrackKeyframes = (track) => {
  const frames = (Array.isArray(track?.keyframes) ? track.keyframes : [])
    .map((kf) => ({
      t: Math.round(Number(kf?.t)),
      x: normalizeNumber(kf?.x, 0),
      y: normalizeNumber(kf?.y, 0),
    }))
    .filter((kf) => Number.isFinite(kf.t) && kf.t >= 0)
    .sort((a, b) => a.t - b.t);

  const deduped = [];
  frames.forEach((frame) => {
    const last = deduped[deduped.length - 1];
    if (last && last.t === frame.t) {
      deduped[deduped.length - 1] = frame;
      return;
    }
    deduped.push(frame);
  });
  return deduped;
};

export const evalTrackAtTime = (track, t) => {
  const frames = normalizeTrackKeyframes(track);
  const timeMs = Math.round(Number(t));
  if (!Number.isFinite(timeMs) || frames.length === 0) return null;

  const first = frames[0];
  const last = frames[frames.length - 1];
  if (timeMs <= first.t) return { x: first.x, y: first.y };
  if (timeMs >= last.t) return { x: last.x, y: last.y };

  for (let i = 0; i < frames.length; i += 1) {
    if (Math.abs(frames[i].t - timeMs) <= EPSILON) {
      return { x: frames[i].x, y: frames[i].y };
    }
  }

  for (let i = 0; i < frames.length - 1; i += 1) {
    const prev = frames[i];
    const next = frames[i + 1];
    if (timeMs < prev.t || timeMs > next.t) continue;
    if (next.t === prev.t) return { x: prev.x, y: prev.y };
    const alpha = (timeMs - prev.t) / (next.t - prev.t);
    return {
      x: prev.x + (next.x - prev.x) * alpha,
      y: prev.y + (next.y - prev.y) * alpha,
    };
  }

  return { x: last.x, y: last.y };
};

export const buildSnapshotsFromTracks = (items, tracks, timesMs, durationMs) => {
  const safeDurationMs =
    Number.isFinite(Number(durationMs)) && Number(durationMs) > 0
      ? Number(durationMs)
      : DEFAULT_DURATION_MS;
  const sortedTimes = Array.from(
    new Set((timesMs || []).map((t) => Math.round(Number(t))).filter((t) => Number.isFinite(t) && t >= 0))
  ).sort((a, b) => a - b);

  if (sortedTimes[0] !== 0) {
    sortedTimes.unshift(0);
  }

  const playerItems = (items || [])
    .filter((item) => item?.type === "player" && item?.id)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const ballItems = (items || [])
    .filter((item) => item?.type === "ball" && item?.id)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const ballBase = ballItems[0] || null;

  const representedPlayerIds = playerItems.map((player) => player.id);
  const keyframesPercents = [];
  const keyframeSnapshots = {};

  sortedTimes.forEach((timeMs) => {
    const playersById = {};
    playerItems.forEach((playerItem) => {
      const { type, ...basePlayer } = playerItem;
      const fallbackPos = {
        x: normalizeNumber(basePlayer.x, 0),
        y: normalizeNumber(basePlayer.y, 0),
      };
      const evaluated = evalTrackAtTime(tracks?.[playerItem.id], timeMs) || fallbackPos;
      playersById[playerItem.id] = {
        ...basePlayer,
        x: evaluated.x,
        y: evaluated.y,
      };
    });

    let ballSnapshot = null;
    if (ballBase?.id) {
      const { type, ...baseBall } = ballBase;
      const fallbackPos = {
        x: normalizeNumber(baseBall.x, 0),
        y: normalizeNumber(baseBall.y, 0),
      };
      const evaluated = evalTrackAtTime(tracks?.[ballBase.id], timeMs) || fallbackPos;
      ballSnapshot = {
        ...baseBall,
        x: evaluated.x,
        y: evaluated.y,
      };
    }

    const percent = (timeMs / safeDurationMs) * 100;
    const key = sanitizePercentKey(percent);
    const numericPercent = Number(key);
    if (!Number.isFinite(numericPercent)) return;
    if (!keyframeSnapshots[key]) {
      keyframesPercents.push(numericPercent);
    }
    keyframeSnapshots[key] = {
      playersById,
      representedPlayerIds: [...representedPlayerIds],
      ball: ballSnapshot,
    };
  });

  keyframesPercents.sort((a, b) => a - b);
  return { keyframesPercents, keyframeSnapshots };
};

export const resolveSnapshotForKeyframe = (keyframeNumber, snapshots) => {
  const exactKey = sanitizePercentKey(keyframeNumber);
  if (snapshots && snapshots[exactKey]) {
    return { key: exactKey, snapshot: snapshots[exactKey] };
  }
  const rawKey = String(keyframeNumber);
  if (snapshots && snapshots[rawKey]) {
    return { key: rawKey, snapshot: snapshots[rawKey] };
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

export const validatePlayExportV1_0_0 = (exportObj) => {
  if (!exportObj || typeof exportObj !== "object") {
    return { ok: false, error: "Invalid JSON: expected an object at the root." };
  }
  if (exportObj.schemaVersion !== IMPORT_SCHEMA_VERSION_1_0_0) {
    return {
      ok: false,
      error: `Unsupported schemaVersion. Expected "${IMPORT_SCHEMA_VERSION_1_0_0}".`,
    };
  }
  if (!exportObj.play || typeof exportObj.play !== "object") {
    return { ok: false, error: "Invalid export: missing play object." };
  }
  if (typeof exportObj.play.name !== "string") {
    return { ok: false, error: "Invalid export: play.name must be a string." };
  }
  if (!Array.isArray(exportObj.items)) {
    return { ok: false, error: "Invalid export: items must be an array." };
  }
  if (!exportObj.tracks || typeof exportObj.tracks !== "object" || Array.isArray(exportObj.tracks)) {
    return { ok: false, error: "Invalid export: tracks must be an object." };
  }
  return { ok: true, play: exportObj };
};

export const importPlayV1_0_0 = (
  exportObj,
  { defaultDurationMs = DEFAULT_DURATION_MS, defaultBall = { id: "ball-1", x: 40, y: 0 } } = {}
) => {
  const { ok, error } = validatePlayExportV1_0_0(exportObj);
  if (!ok) return { ok: false, error };

  const items = Array.isArray(exportObj.items) ? exportObj.items : [];
  const playersById = {};
  const representedPlayerIds = [];
  let ball = null;

  const sortedItems = [...items].sort((a, b) => String(a?.id ?? "").localeCompare(String(b?.id ?? "")));
  sortedItems.forEach((item) => {
    if (!item?.id || typeof item !== "object") return;
    if (item.type === "player") {
      const { type, ...base } = item;
      playersById[item.id] = {
        ...base,
        id: item.id,
        x: normalizeNumber(base.x, 0),
        y: normalizeNumber(base.y, 0),
      };
      representedPlayerIds.push(item.id);
      return;
    }
    if (item.type === "ball" && !ball) {
      const { type, ...base } = item;
      ball = {
        ...base,
        id: item.id,
        x: normalizeNumber(base.x, 0),
        y: normalizeNumber(base.y, 0),
      };
    }
  });

  const durationMs =
    Number.isFinite(Number(exportObj.timeline?.durationMs)) &&
      Number(exportObj.timeline?.durationMs) > 0
      ? Number(exportObj.timeline.durationMs)
      : defaultDurationMs;
  const tracks = exportObj.tracks ?? {};
  const timesMs = unionTrackTimesMs(tracks);
  const { keyframesPercents, keyframeSnapshots } = buildSnapshotsFromTracks(
    sortedItems,
    tracks,
    timesMs,
    durationMs
  );

  const controlPill = exportObj.timeline?.controlPill ?? {};
  const loopSeconds = durationMs / 1000;

  return {
    ok: true,
    play: {
      name: exportObj.play?.name ?? "Coachable_Play",
      advancedSettings: exportObj.advancedSettings ?? null,
      allPlayersDisplay: exportObj.display?.allPlayers ?? null,
      currentPlayerColor: exportObj.display?.currentPlayerColor ?? null,
      camera: exportObj.camera ?? { x: 0, y: 0, zoom: 1 },
      fieldRotation: normalizeNumber(exportObj.fieldRotation, 0),
      playersById,
      representedPlayerIds,
      ball: ball ?? { ...defaultBall },
      keyframes: keyframesPercents,
      keyframeSnapshots,
      playback: {
        loopSeconds,
        speedMultiplier: normalizeNumber(controlPill.speedMultiplier, 50),
        autoplayEnabled: Boolean(controlPill.autoplayEnabled),
        keyframeTolerance: normalizeNumber(controlPill.keyframeTolerance, 4),
      },
    },
  };
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
  nextSnapshots[sanitizePercentKey(timeValue)] = snapshot;
  return { keyframes: nextKeyframes, keyframeSnapshots: nextSnapshots };
};
