import { serializeAnimation } from "../animation";

/** Current export schema version identifier. */
export const EXPORT_SCHEMA_VERSION = "play-export-v2";

/** Converts a play name into a safe, lowercase, hyphenated filename. */
const sanitizeFilename = (name) => {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return "play";
  const lower = trimmed.toLowerCase();
  const hyphenated = lower.replace(/\s+/g, "-");
  const cleaned = hyphenated.replace(/[^a-z0-9-_]+/g, "");
  const collapsed = cleaned.replace(/-+/g, "-").replace(/^[-_]+|[-_]+$/g, "");
  return collapsed || "play";
};

const normalizeRepresentedPlayerIds = (playersById, representedPlayerIds) => {
  const playerIds = Object.keys(playersById || {});
  const provided = Array.isArray(representedPlayerIds)
    ? representedPlayerIds.filter((id) => typeof id === "string" && Boolean(playersById?.[id]))
    : [];
  return Array.from(new Set([...provided, ...playerIds]));
};

/**
 * Builds a structured play export object from all application state.
 * @param {Object} params - All play state slices (entities, animation, settings, canvas).
 * @returns {Object} Versioned export object ready for JSON serialization.
 */
export const buildPlayExport = ({
  playName,
  playId = null,
  appVersion = null,
  advancedSettings,
  allPlayersDisplay,
  currentPlayerColor,
  camera,
  fieldRotation,
  playersById,
  representedPlayerIds,
  ball,
  ballsById,
  animationData,
  playback,
  coordinateSystem,
  drawings,
} = {}) => {
  const animationJson = serializeAnimation(animationData, { pretty: false });
  const animation = JSON.parse(animationJson);
  const normalizedPlayersById = playersById ?? {};
  const normalizedRepresentedPlayerIds = normalizeRepresentedPlayerIds(
    normalizedPlayersById,
    representedPlayerIds
  );

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    play: {
      name: playName ?? "",
      id: playId ?? null,
      settings: {
        advancedSettings: advancedSettings ?? null,
        allPlayersDisplay: allPlayersDisplay ?? null,
        currentPlayerColor: currentPlayerColor ?? null,
      },
      canvas: {
        camera: camera ?? { x: 0, y: 0, zoom: 1 },
        fieldRotation: fieldRotation ?? 0,
        coordinateSystem: coordinateSystem ?? {
          origin: "center",
          units: "px",
          notes: "World coordinates are centered; +x right, +y down.",
        },
      },
      entities: {
        playersById: normalizedPlayersById,
        representedPlayerIds: normalizedRepresentedPlayerIds,
        ball: ball ?? null,
        ballsById: ballsById ?? null,
      },
      animation,
      drawings: Array.isArray(drawings) ? drawings : [],
      playback: playback ?? null,
      meta: {
        appVersion: appVersion ?? null,
      },
    },
  };
};

/**
 * Triggers a browser file download of a play export as JSON.
 * @param {Object} playExport - The export object from buildPlayExport.
 * @param {string} playName - Play name used to derive the filename.
 */
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

/**
 * Downloads a data URL as a PNG file.
 * @param {string} dataUrl - The data URL from canvas capture.
 */
export const downloadScreenshot = async (dataUrl, playName) => {
  if (!dataUrl) return;
  const filename = `${sanitizeFilename(playName)}_screenshot.png`;
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/**
 * Downloads a video blob. Extension is derived from the blob's MIME type.
 * @param {Blob} blob - The recorded video blob (MP4 or WebM).
 * @param {string} playName - Play name used to derive the filename.
 */
export const downloadVideo = (blob, playName) => {
  if (!blob) return;
  const ext = blob.type?.includes("mp4") ? "mp4" : "webm";
  const filename = `${sanitizeFilename(playName)}_export.${ext}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
