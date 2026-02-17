export const EXPORT_SCHEMA_VERSION = "1.0.0";
const DEFAULT_FILENAME = "Coachable_Play";
const EPSILON = 1e-9;

const normalizeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const sanitizeFilename = (name) => {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return DEFAULT_FILENAME;

  // Windows-invalid filename chars + control chars are normalized to '-'.
  const cleaned = trimmed
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .replace(/[. ]+$/g, "")
    .trim();

  return cleaned || DEFAULT_FILENAME;
};

const resolveSnapshotForKeyframe = (keyframeNumber, snapshots) => {
  const exactKey = String(keyframeNumber);
  if (snapshots?.[exactKey]) return snapshots[exactKey];

  for (const key of Object.keys(snapshots || {})) {
    const numericKey = Number(key);
    if (!Number.isFinite(numericKey)) continue;
    if (Math.abs(numericKey - keyframeNumber) <= EPSILON) {
      return snapshots[key];
    }
  }
  return null;
};

const deepClone = (value) => JSON.parse(JSON.stringify(value ?? {}));

const buildItems = ({ playersById, ball }) => {
  const playerItems = Object.values(playersById || {})
    .filter((player) => player?.id)
    .map((player) => {
      const {
        id,
        x,
        y,
        number,
        name,
        color,
        size,
        sizePercent,
        role,
        assignment,
        draggable,
        locked,
        hidden,
        zIndex,
      } = player;
      return {
        id,
        type: "player",
        number,
        name,
        color,
        ...(size !== undefined ? { size } : {}),
        ...(sizePercent !== undefined ? { sizePercent } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(assignment !== undefined ? { assignment } : {}),
        x: normalizeNumber(x, 0),
        y: normalizeNumber(y, 0),
        draggable: draggable ?? true,
        locked: locked ?? false,
        hidden: hidden ?? false,
        ...(zIndex !== undefined ? { zIndex } : {}),
      };
    });

  const ballItem = ball?.id
    ? {
      id: ball.id,
      type: "ball",
      ...(ball.radius !== undefined ? { radius: ball.radius } : {}),
      ...(ball.size !== undefined ? { size: ball.size } : {}),
      ...(ball.sizePercent !== undefined ? { sizePercent: ball.sizePercent } : {}),
      x: normalizeNumber(ball.x, 0),
      y: normalizeNumber(ball.y, 0),
      draggable: ball.draggable ?? true,
      locked: ball.locked ?? false,
      hidden: ball.hidden ?? false,
      ...(ball.zIndex !== undefined ? { zIndex: ball.zIndex } : {}),
    }
    : null;

  const items = [...playerItems, ...(ballItem ? [ballItem] : [])];
  return items.sort((a, b) => String(a.id).localeCompare(String(b.id)));
};

const toDurationMs = (loopSeconds) => {
  const n = Number(loopSeconds);
  if (!Number.isFinite(n) || n <= 0) return 30000;
  return Math.max(1, Math.round(n * 1000));
};

const percentToMs = (percent, durationMs) => {
  const boundedPercent = Math.max(0, Math.min(100, normalizeNumber(percent, 0)));
  return Math.round((boundedPercent / 100) * durationMs);
};

const buildTracks = ({ items, keyframes, keyframeSnapshots, durationMs }) => {
  const sortedTimelinePoints = Array.from(
    new Set((keyframes || []).map((t) => normalizeNumber(t, 0)))
  ).sort((a, b) => a - b);

  const tracks = {};
  for (const item of items) {
    const keyframeMapByMs = new Map();
    for (const keyframePercent of sortedTimelinePoints) {
      const snapshot = resolveSnapshotForKeyframe(keyframePercent, keyframeSnapshots || {});
      if (!snapshot) continue;

      const snapshotItem =
        item.type === "ball"
          ? snapshot.ball
          : snapshot.playersById?.[item.id];
      if (!snapshotItem) continue;

      const ms = percentToMs(keyframePercent, durationMs);
      keyframeMapByMs.set(ms, {
        t: ms,
        x: normalizeNumber(snapshotItem.x, item.x ?? 0),
        y: normalizeNumber(snapshotItem.y, item.y ?? 0),
        easing: "linear",
      });
    }

    if (!keyframeMapByMs.has(0)) {
      keyframeMapByMs.set(0, {
        t: 0,
        x: normalizeNumber(item.x, 0),
        y: normalizeNumber(item.y, 0),
        easing: "linear",
      });
    }

    const sortedKeys = Array.from(keyframeMapByMs.keys()).sort((a, b) => a - b);
    tracks[item.id] = {
      type: "position2d",
      keyframes: sortedKeys.map((t) => keyframeMapByMs.get(t)),
    };
  }

  return tracks;
};

export const buildPlayExportV1 = ({
  playId,
  playName,
  sport,
  createdAt,
  updatedAt,
  appVersion = null,
  advancedSettings,
  allPlayersDisplay,
  currentPlayerColor,
  camera,
  fieldRotation,
  playersById,
  ball,
  keyframes,
  keyframeSnapshots,
  playback,
  fieldId,
} = {}) => {
  const safePlayName = String(playName ?? "").trim() || DEFAULT_FILENAME;
  const durationMs = toDurationMs(playback?.loopSeconds);
  const items = buildItems({ playersById, ball });
  const tracks = buildTracks({ items, keyframes, keyframeSnapshots, durationMs });

  // Replay export schema v1.0.0: complete slate + timeline tracks required for deterministic playback.
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: {
      name: "Coachable",
      ...(appVersion ? { build: appVersion } : {}),
    },
    play: {
      ...(playId ? { id: playId } : {}),
      name: safePlayName,
      ...(sport ? { sport } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(updatedAt ? { updatedAt } : {}),
    },
    fieldRotation: normalizeNumber(fieldRotation, 0),
    camera: {
      x: normalizeNumber(camera?.x, 0),
      y: normalizeNumber(camera?.y, 0),
      zoom: normalizeNumber(camera?.zoom, 1),
    },
    field: {
      id: fieldId ?? advancedSettings?.pitch?.pitchSize ?? "default",
      pitchSize: advancedSettings?.pitch?.pitchSize ?? null,
      showMarkings: advancedSettings?.pitch?.showMarkings ?? true,
      pitchColor: advancedSettings?.pitch?.pitchColor ?? null,
    },
    advancedSettings: deepClone(advancedSettings),
    display: {
      allPlayers: deepClone(allPlayersDisplay),
      currentPlayerColor: currentPlayerColor ?? null,
    },
    items,
    timeline: {
      durationMs,
      easingDefault: "linear",
      snap: {
        enabled: false,
      },
      controlPill: {
        speedMultiplier: normalizeNumber(playback?.speedMultiplier, 50),
        autoplayEnabled: Boolean(playback?.autoplayEnabled),
        keyframeTolerance: normalizeNumber(playback?.keyframeTolerance, 4),
      },
    },
    tracks,
  };
};

export const downloadPlayExport = (playExport, playName) => {
  if (!playExport) return;
  const filename = `${sanitizeFilename(playName)}.json`;
  const json = JSON.stringify(playExport, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
