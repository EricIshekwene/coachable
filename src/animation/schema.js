export const ANIMATION_VERSION = 1;
export const DEFAULT_DURATION_MS = 30000;

const EPSILON_MS = 0.5;

const toFiniteNumber = (value, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
};

const normalizeTime = (value) => {
  const time = Math.round(toFiniteNumber(value, 0));
  return Math.max(0, time);
};

const normalizeRotation = (value) => {
  const numeric = toFiniteNumber(value, undefined);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const normalizeKeyframe = (keyframe) => {
  if (!keyframe || typeof keyframe !== "object") return null;
  const t = normalizeTime(keyframe.t);
  const x = toFiniteNumber(keyframe.x, 0);
  const y = toFiniteNumber(keyframe.y, 0);
  const r = normalizeRotation(keyframe.r);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return r === undefined ? { t, x, y } : { t, x, y, r };
};

export const sortAndDedupeKeyframes = (keyframes = []) => {
  const normalized = keyframes
    .map((entry) => normalizeKeyframe(entry))
    .filter(Boolean)
    .sort((a, b) => a.t - b.t);

  const deduped = [];
  normalized.forEach((keyframe) => {
    const last = deduped[deduped.length - 1];
    if (!last || Math.abs(last.t - keyframe.t) > EPSILON_MS) {
      deduped.push(keyframe);
      return;
    }
    deduped[deduped.length - 1] = keyframe;
  });
  return deduped;
};

export const normalizeTrack = (track) => ({
  keyframes: sortAndDedupeKeyframes(track?.keyframes || []),
});

export const normalizeAnimation = (animation) => {
  const source = animation && typeof animation === "object" ? animation : {};
  const durationMs = Math.max(1, normalizeTime(source.durationMs || DEFAULT_DURATION_MS));
  const inputTracks =
    source.tracks && typeof source.tracks === "object" && !Array.isArray(source.tracks)
      ? source.tracks
      : {};

  const tracks = {};
  Object.entries(inputTracks).forEach(([playerId, track]) => {
    if (!playerId) return;
    tracks[playerId] = normalizeTrack(track);
  });

  const meta =
    source.meta && typeof source.meta === "object" && !Array.isArray(source.meta)
      ? { ...source.meta }
      : undefined;

  const normalized = {
    version: ANIMATION_VERSION,
    durationMs,
    tracks,
  };
  if (meta && Object.keys(meta).length) {
    normalized.meta = meta;
  }
  return normalized;
};

export const createEmptyAnimation = ({ durationMs = DEFAULT_DURATION_MS } = {}) =>
  normalizeAnimation({
    version: ANIMATION_VERSION,
    durationMs,
    tracks: {},
    meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  });

export const ensureTrack = (animation, playerId) => {
  const normalized = normalizeAnimation(animation);
  const track = normalized.tracks[playerId];
  if (track) return track;
  return { keyframes: [] };
};

export const upsertKeyframe = (track, keyframe) => {
  const normalized = normalizeTrack(track);
  const nextKeyframe = normalizeKeyframe(keyframe);
  if (!nextKeyframe) return normalized;

  const nextKeyframes = [...normalized.keyframes];
  const index = nextKeyframes.findIndex((entry) => Math.abs(entry.t - nextKeyframe.t) <= EPSILON_MS);
  if (index >= 0) {
    nextKeyframes[index] = nextKeyframe;
  } else {
    nextKeyframes.push(nextKeyframe);
  }
  return {
    keyframes: sortAndDedupeKeyframes(nextKeyframes),
  };
};

export const deleteKeyframeAtTime = (track, timeMs, toleranceMs = EPSILON_MS) => {
  const normalized = normalizeTrack(track);
  const target = normalizeTime(timeMs);
  return {
    keyframes: normalized.keyframes.filter((entry) => Math.abs(entry.t - target) > toleranceMs),
  };
};

export const getTrackKeyframeTimes = (animation, playerIds) => {
  const normalized = normalizeAnimation(animation);
  const ids = Array.isArray(playerIds) && playerIds.length ? playerIds : Object.keys(normalized.tracks);
  const timeSet = new Set();
  ids.forEach((playerId) => {
    const track = normalized.tracks[playerId];
    if (!track) return;
    track.keyframes.forEach((keyframe) => timeSet.add(keyframe.t));
  });
  return Array.from(timeSet).sort((a, b) => a - b);
};

export const cloneAnimation = (animation) => normalizeAnimation(animation);
