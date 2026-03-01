import { createEmptyAnimation, deserializeAnimation } from "../animation";
import { log as logAnimDebug } from "../animation/debugLogger";

export const IMPORT_SCHEMA_VERSION = "play-export-v2";
export const IMPORT_FILE_SIZE_LIMIT_BYTES = 5 * 1024 * 1024;

const asObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
};

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
          entities: { playersById: {}, representedPlayerIds: [], ball: null },
          animation,
          playback: {},
          meta: {},
        },
      };
    } catch {
      return fail("Invalid animation JSON.");
    }
  }

  if (input.schemaVersion !== IMPORT_SCHEMA_VERSION) {
    return fail(`Unsupported schemaVersion. Expected "${IMPORT_SCHEMA_VERSION}" or animation version 1.`);
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
  const representedPlayerIds = Array.isArray(entities.representedPlayerIds)
    ? [...entities.representedPlayerIds]
    : Object.keys(playersById);

  return {
    ok: true,
    play: {
      name: typeof play.name === "string" ? play.name : "Imported Play",
      settings: asObject(play.settings) || {},
      canvas: asObject(play.canvas) || {},
      entities: {
        playersById,
        representedPlayerIds,
        ball: entities.ball ?? null,
      },
      animation,
      playback: asObject(play.playback) || {},
      meta: asObject(play.meta) || {},
    },
  };
};
