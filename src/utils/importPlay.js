import { createEmptyAnimation, deserializeAnimation } from "../animation";
import { log as logAnimDebug } from "../animation/debugLogger";
import { splitLegacyDrawingsArray, buildSeparatedDrawingsPayload } from "../features/slate/utils/drawingSchema";

/**
 * Expected schema versions for import validation. v3 is the current canonical
 * shape; v2 is still accepted for backward compatibility and is migrated by
 * `splitLegacyDrawingsArray`.
 */
export const IMPORT_SCHEMA_VERSION = "play-export-v3";
export const LEGACY_IMPORT_SCHEMA_VERSION = "play-export-v2";
const ACCEPTED_SCHEMA_VERSIONS = new Set([
  IMPORT_SCHEMA_VERSION,
  LEGACY_IMPORT_SCHEMA_VERSION,
]);

/** Maximum allowed file size for imports (5 MB). */
export const IMPORT_FILE_SIZE_LIMIT_BYTES = 5 * 1024 * 1024;

const asObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
};

const normalizeRepresentedPlayerIds = (playersById, representedPlayerIds) => {
  const playerIds = Object.keys(playersById || {});
  const provided = Array.isArray(representedPlayerIds)
    ? representedPlayerIds.filter((id) => typeof id === "string" && Boolean(playersById?.[id]))
    : [];
  return Array.from(new Set([...provided, ...playerIds]));
};

/**
 * Validates and normalizes an imported JSON object. Supports full play exports
 * and raw animation JSON. Returns `{ ok, error?, play? }`.
 * @param {Object} input - Parsed JSON input.
 * @returns {{ ok: boolean, error?: string, play?: Object }}
 */
export const validatePlayImport = (input) => {
  const fail = (message) => {
    logAnimDebug(`import failed err=${message}`);
    return { ok: false, error: message };
  };

  if (!input || typeof input !== "object") {
    return fail("Invalid JSON: expected an object at the root.");
  }

  // Allow importing raw animation JSON directly.
  if (input.version === 1 && input.tracks && input.durationMs) {
    try {
      const animation = deserializeAnimation(input);
      return {
        ok: true,
        play: {
          name: "Imported Play",
          settings: {},
          canvas: {},
          entities: { playersById: {}, representedPlayerIds: [], ball: null, ballsById: null },
          animation,
          playback: {},
          meta: {},
        },
      };
    } catch {
      return fail("Invalid animation JSON.");
    }
  }

  if (!ACCEPTED_SCHEMA_VERSIONS.has(input.schemaVersion)) {
    return fail(
      `Unsupported schemaVersion. Expected "${IMPORT_SCHEMA_VERSION}", "${LEGACY_IMPORT_SCHEMA_VERSION}", or animation version 1.`
    );
  }

  const play = asObject(input.play);
  if (!play) {
    return fail("Invalid export: missing play object.");
  }

  let animation;
  try {
    animation = play.animation
      ? deserializeAnimation(play.animation)
      : createEmptyAnimation({ durationMs: 30000 });
  } catch {
    return fail("Invalid export: play.animation is not valid.");
  }

  const entities = asObject(play.entities) || {};
  const playersById = asObject(entities.playersById) || {};
  const representedPlayerIds = normalizeRepresentedPlayerIds(
    playersById,
    entities.representedPlayerIds
  );
  const importedBallsById = asObject(entities.ballsById);
  const normalizedBallsById = importedBallsById
    ? { ...importedBallsById }
    : entities.ball && typeof entities.ball === "object"
      ? {
          [typeof entities.ball.id === "string" ? entities.ball.id : "ball-1"]: {
            ...entities.ball,
            id: typeof entities.ball.id === "string" ? entities.ball.id : "ball-1",
          },
        }
      : null;
  const primaryBall = entities.ball ?? (normalizedBallsById ? Object.values(normalizedBallsById)[0] : null);

  // Resolve drawings: prefer v3 separated arrays, fall back to legacy v2
  // combined `drawings` array (which we split here so callers always get the
  // new shape).
  let annotationDrawings;
  let motionDrawings;
  if (Array.isArray(play.annotationDrawings) || Array.isArray(play.motionDrawings)) {
    const normalized = buildSeparatedDrawingsPayload({
      annotationDrawings: play.annotationDrawings || [],
      motionDrawings: play.motionDrawings || [],
      entities: { playersById, ballsById: normalizedBallsById },
      durationMs: animation?.durationMs,
    });
    annotationDrawings = normalized.annotationDrawings;
    motionDrawings = normalized.motionDrawings;
  } else if (Array.isArray(play.drawings)) {
    const split = splitLegacyDrawingsArray(
      play.drawings,
      { playersById, ballsById: normalizedBallsById },
      animation?.durationMs
    );
    annotationDrawings = split.annotationDrawings;
    motionDrawings = split.motionDrawings;
  } else {
    annotationDrawings = [];
    motionDrawings = [];
  }

  return {
    ok: true,
    play: {
      name: typeof play.name === "string" ? play.name : "Imported Play",
      settings: asObject(play.settings) || {},
      canvas: asObject(play.canvas) || {},
      entities: {
        playersById,
        representedPlayerIds,
        ball: primaryBall ?? null,
        ballsById: normalizedBallsById,
      },
      animation,
      annotationDrawings,
      motionDrawings,
      playback: asObject(play.playback) || {},
      meta: asObject(play.meta) || {},
    },
  };
};
