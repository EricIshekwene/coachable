const MAX_LOG_LINES = 2000;

const ringBuffer = [];

const toErrorString = (value) => {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (value instanceof Error) return value.message || value.name || "error";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const formatLine = (message) => {
  const timestamp = new Date().toISOString();
  return `[PERSIST] ${timestamp} ${message}`;
};

const toObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const toArray = (value) => (Array.isArray(value) ? value : []);

const countKeyframeTimes = (tracks) => {
  const times = new Set();
  Object.values(tracks || {}).forEach((track) => {
    toArray(track?.keyframes).forEach((keyframe) => {
      const t = Number(keyframe?.t);
      if (Number.isFinite(t)) {
        times.add(Math.round(t));
      }
    });
  });
  return times.size;
};

const getTrackKeyframeCounts = (tracks) =>
  Object.entries(tracks || {}).map(([id, track]) => ({
    id,
    keyframes: toArray(track?.keyframes).length,
  }));

export const summarizePlayData = (playData) => {
  const play = toObject(playData?.play);
  const entities = toObject(play.entities);
  const playersById = toObject(entities.playersById);
  const playerIds = Object.keys(playersById);
  const representedPlayerIds = toArray(entities.representedPlayerIds).filter(
    (id) => typeof id === "string" && id
  );
  const ballsById = toObject(entities.ballsById);
  const animation = toObject(play.animation);
  const tracks = toObject(animation.tracks);
  const trackCounts = getTrackKeyframeCounts(tracks);
  const movingTrackIds = trackCounts
    .filter((entry) => entry.keyframes >= 2)
    .map((entry) => entry.id);
  const missingRepresentedPlayers = playerIds.filter(
    (playerId) => !representedPlayerIds.includes(playerId)
  );
  const orphanRepresentedPlayers = representedPlayerIds.filter(
    (playerId) => !playersById[playerId]
  );

  return {
    playName: typeof play.name === "string" ? play.name : null,
    playerCount: playerIds.length,
    representedPlayerCount: representedPlayerIds.length,
    missingRepresentedPlayers,
    orphanRepresentedPlayers,
    ballCount: Object.keys(ballsById).length,
    trackCount: Object.keys(tracks).length,
    movingTrackCount: movingTrackIds.length,
    movingTrackIds: movingTrackIds.slice(0, 24),
    keyframeTimeCount: countKeyframeTimes(tracks),
    durationMs: Number.isFinite(Number(animation.durationMs))
      ? Math.round(Number(animation.durationMs))
      : null,
  };
};

export const summarizePlaysCollection = (plays) => ({
  playCount: Array.isArray(plays) ? plays.length : 0,
  withPlayDataCount: Array.isArray(plays)
    ? plays.filter((entry) => Boolean(entry?.playData)).length
    : 0,
});

export const log = (message, meta) => {
  const suffix = meta === undefined ? "" : ` ${toErrorString(meta)}`;
  const line = formatLine(`${message}${suffix}`);
  ringBuffer.push(line);
  if (ringBuffer.length > MAX_LOG_LINES) {
    ringBuffer.splice(0, ringBuffer.length - MAX_LOG_LINES);
  }
  console.log(line);
  return line;
};

export const getLogs = (limit = 800) => {
  const numericLimit = Number(limit);
  if (!Number.isFinite(numericLimit) || numericLimit <= 0) return [];
  return ringBuffer.slice(-Math.floor(numericLimit));
};

export const clearLogs = () => {
  ringBuffer.length = 0;
};

export default {
  log,
  getLogs,
  clearLogs,
  summarizePlayData,
  summarizePlaysCollection,
};
