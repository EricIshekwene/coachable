import { createDefaultAdvancedSettings } from "../features/slate/hooks/useAdvancedSettings";
import { IMPORT_SCHEMA_VERSION } from "./importPlay";

/**
 * Transforms and helpers for the published-prefab-preset feature. Distinct
 * from `customPrefabs.js` (user-local prefabs) and `sportPresets.js` (full
 * starting-canvas presets). See src/pages/SPORT_PREFAB_PRESETS.md.
 */

/**
 * Slate's canvas uses CENTERED world coordinates — (0, 0) is the middle of
 * the field, +x is right, +y is down. INITIAL_BALL lives at (40, 0). The
 * dx/dy values stored in `prefab_data` are already in this centered space
 * (computed by `buildCustomPrefab` as `p.x - centroidX`), so we anchor the
 * centroid at the origin when rehydrating — anything else shoves the group
 * away from center (e.g. a top-left-origin offset would push players to the
 * bottom-right of the canvas).
 */
const DEFAULT_BALL_ID = "ball-1";

/**
 * Build the `ballsById` map (which holds balls AND cones — `objectType` on
 * each entry distinguishes them) from a saved prefab payload. Reads the new
 * `objects` array; falls back to the legacy single-ball field for prefab
 * presets persisted before the array shape existed.
 *
 * @param {Object} prefabData
 * @returns {Object} ballsById map keyed by synthesized ids
 */
function buildObjectsById(prefabData) {
  const out = {};
  if (Array.isArray(prefabData?.objects) && prefabData.objects.length > 0) {
    prefabData.objects.forEach((obj, idx) => {
      const id = `${obj?.objectType === "cone" ? "cone" : "ball"}-${idx + 1}`;
      out[id] = {
        id,
        x: Number(obj?.dx) || 0,
        y: Number(obj?.dy) || 0,
        objectType: obj?.objectType === "cone" ? "cone" : "ball",
        ...(obj?.hidden ? { hidden: true } : {}),
      };
    });
    return out;
  }
  if (prefabData?.ball) {
    out[DEFAULT_BALL_ID] = {
      id: DEFAULT_BALL_ID,
      x: Number(prefabData.ball.dx) || 0,
      y: Number(prefabData.ball.dy) || 0,
      objectType: "ball",
    };
  }
  return out;
}

/**
 * Build the `settings` block for a play, applying any player-size overrides
 * captured at prefab save time. Always returns a fully-populated
 * `advancedSettings` (via the sport's defaults) so Slate doesn't fall back to
 * an empty object — the loader replaces `advancedSettings` wholesale rather
 * than deep-merging, so partial objects would drop pitch/ball/animation keys.
 *
 * @param {Object} prefabData - Saved prefab payload (may contain optional `settings`)
 * @param {string} sport - Sport name used to seed defaults
 * @returns {{ advancedSettings: Object, allPlayersDisplay: Object }}
 */
function buildSettings(prefabData, sport) {
  const advancedSettings = createDefaultAdvancedSettings(sport || "Rugby");
  const savedBaseSizePx = prefabData?.settings?.baseSizePx;
  if (typeof savedBaseSizePx === "number" && savedBaseSizePx > 0) {
    advancedSettings.players = {
      ...advancedSettings.players,
      baseSizePx: savedBaseSizePx,
    };
  }
  const savedSizePercent = prefabData?.settings?.sizePercent;
  const allPlayersDisplay = {
    sizePercent:
      typeof savedSizePercent === "number" && savedSizePercent > 0
        ? savedSizePercent
        : 100,
  };
  return { advancedSettings, allPlayersDisplay };
}

/**
 * Convert an admin-fetched sport_prefab_presets record into the sidebar
 * placement shape Slate already understands. Keeps the existing dx/dy/players
 * payload intact (so click placement code in Slate.jsx works unchanged) and
 * adds the metadata the new PrefabsPopover uses to sort and label items.
 *
 * @param {{ id: string, name: string, prefabData: Object }} record
 * @returns {Object|null} Sidebar prefab object, or null if record is malformed
 */
export function mapSportPrefabPresetToSidebarPrefab(record) {
  if (!record || !record.prefabData) return null;
  const { id, name, prefabData } = record;
  const players = Array.isArray(prefabData.players) ? prefabData.players : [];
  // Normalize objects: prefer the new `objects` array; fall back to the
  // legacy single `ball` field so prefab presets persisted before the
  // array shape existed still place correctly.
  const objects = Array.isArray(prefabData.objects)
    ? prefabData.objects
    : prefabData.ball
      ? [{ ...prefabData.ball, objectType: "ball" }]
      : [];
  const result = {
    ...prefabData,
    id,
    label: String(name ?? "").trim() || "Prefab",
    players,
    objects,
    isPublished: true,
    isCustom: false,
    readOnly: true,
    source: "sport-preset",
  };
  return result;
}

/**
 * Build a minimal `playData` object suitable for `PlayPreviewCard` from a
 * raw prefab payload. Re-anchors the prefab around the canvas center and
 * synthesizes the entity buckets the card reads. Honors any saved player-
 * size overrides so a prefab authored with smaller players renders smaller
 * in the admin list too — this fixes the "small in editor, big in preview"
 * regression where size info was being dropped.
 *
 * @param {Object} prefabData - `{ players: [{dx, dy, number, name, color}], ball?: {dx, dy}, settings?: {baseSizePx, sizePercent} }`
 * @param {string} sport - Sport name; flows into pitch.fieldType for the field image
 * @returns {Object} `{ play: {...} }` shape expected by PlayPreviewCard
 */
export function prefabToPreviewPlayData(prefabData, sport) {
  const players = Array.isArray(prefabData?.players) ? prefabData.players : [];
  const playersById = {};
  const representedPlayerIds = [];
  players.forEach((p, idx) => {
    const id = `prefab-preview-${idx}`;
    playersById[id] = {
      id,
      x: Number(p?.dx) || 0,
      y: Number(p?.dy) || 0,
      number: p?.number ?? "",
      name: p?.name ?? "",
      color: p?.color ?? "#ef4444",
    };
    representedPlayerIds.push(id);
  });

  const ballsById = buildObjectsById(prefabData);

  const fieldType = String(sport ?? "Rugby").trim() || "Rugby";
  const { advancedSettings, allPlayersDisplay } = buildSettings(prefabData, fieldType);
  return {
    play: {
      entities: {
        playersById,
        representedPlayerIds,
        ballsById,
      },
      settings: {
        advancedSettings,
        allPlayersDisplay,
      },
      animation: { durationMs: 30000, tracks: {} },
    },
  };
}

/**
 * Convert a stored prefab payload into `initialPlayData` for opening the
 * full Slate editor. Wraps it in the v3 export envelope so Slate's
 * `validatePlayImport` accepts it — without `schemaVersion`, reopening an
 * existing prefab for edit fails with "Unsupported schemaVersion". Player-
 * size overrides round-trip too so the admin sees the same scale on reopen.
 *
 * @param {Object} prefabData - The saved prefab payload
 * @param {string} sport - Sport name for the field type
 * @returns {Object} `{ schemaVersion, play: {...} }` accepted by `validatePlayImport`
 */
export function prefabToInitialPlayData(prefabData, sport) {
  const players = Array.isArray(prefabData?.players) ? prefabData.players : [];
  const playersById = {};
  const representedPlayerIds = [];
  // Pre-build animation tracks with a t=0 keyframe for every entity. Without
  // this, Slate's keyframe-stamping effect runs AFTER load and reads positions
  // from `ballsByIdRef.current` — a ref that's synced by a sibling effect.
  // On the second mount (after the admin leaves and comes back), the keyframe
  // stamping can win the race and read the still-default ball ref (40, 0),
  // permanently overwriting the loaded ball position with default. By
  // shipping populated tracks in the import payload, Slate's stamping effect
  // sees existing keyframes and skips the brand-new-track ref-read path.
  const tracks = {};
  players.forEach((p, idx) => {
    const id = `player-${Date.now()}-${idx}`;
    const x = Number(p?.dx) || 0;
    const y = Number(p?.dy) || 0;
    playersById[id] = {
      id,
      x,
      y,
      number: p?.number ?? "",
      name: p?.name ?? "",
      color: p?.color ?? "#ef4444",
    };
    representedPlayerIds.push(id);
    tracks[id] = { keyframes: [{ t: 0, x, y }] };
  });

  const ballsById = buildObjectsById(prefabData);
  Object.values(ballsById).forEach((obj) => {
    tracks[obj.id] = {
      keyframes: [{ t: 0, x: obj.x ?? 0, y: obj.y ?? 0 }],
    };
  });

  const fieldType = String(sport ?? "Rugby").trim() || "Rugby";
  const { advancedSettings, allPlayersDisplay } = buildSettings(prefabData, fieldType);
  return {
    schemaVersion: IMPORT_SCHEMA_VERSION,
    play: {
      entities: {
        playersById,
        representedPlayerIds,
        ballsById,
      },
      settings: {
        advancedSettings,
        allPlayersDisplay,
      },
      animation: { durationMs: 30000, tracks },
    },
  };
}
