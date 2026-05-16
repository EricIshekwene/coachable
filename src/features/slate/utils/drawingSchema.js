/**
 * Drawing-schema helpers. Single source of truth for annotation vs motion
 * drawing shape, runtime normalization, and legacy-to-separated migration.
 *
 * Annotation drawings (`kind: "annotation"`) are pure visual overlays. They may
 * carry a visibility window via `visibleStartMs` / `visibleEndMs`, default full
 * duration when missing. They MUST NOT carry attached-entity or step fields.
 *
 * Motion drawings (`kind: "motion"`) are entity-attached animation inputs. They
 * carry `attachedEntityId`, `attachedEntityType`, `stepStartMs`, `stepEndMs`,
 * `stepIndex`, optional `continuedFromMotionDrawingId`. They MUST NOT carry
 * `visibleStartMs` / `visibleEndMs`.
 *
 * Legacy data shapes seen in the wild:
 * - `source: "coaching-draw"` + `attachedPlayerId` + `stepStartMs/stepEndMs/stepIndex` → motion
 * - everything else with a `type` of "stroke"/"arrow"/"text"/"shape" → annotation
 *
 * @module features/slate/utils/drawingSchema
 */

import {
  getAnnotationVisibilityWindow,
  isAnnotationDrawing,
  isMotionDrawing,
} from "./drawingTiming.js";

/** Returns "annotation" | "motion" | "unknown" for a raw drawing-shaped value. */
export function getDrawingKind(raw) {
  if (!raw || typeof raw !== "object") return "unknown";
  if (raw.kind === "annotation") return "annotation";
  if (raw.kind === "motion") return "motion";
  if (isMotionDrawing(raw)) return "motion";
  if (isAnnotationDrawing(raw)) return "annotation";
  return "unknown";
}

/**
 * Strip every motion-only field from a drawing so it cannot accidentally drive
 * animation. Useful when migrating a legacy combined-array entry into the
 * annotation bucket.
 * @param {object} drawing
 * @returns {object} a new object without motion-only keys
 */
function stripMotionFields(drawing) {
  const {
    source,
    attachedPlayerId,
    attachedEntityId,
    attachedEntityType,
    stepStartMs,
    stepEndMs,
    stepIndex,
    continuedFromDrawingId,
    continuedFromMotionDrawingId,
    ...rest
  } = drawing || {};
  return rest;
}

/**
 * Strip every annotation-only field from a drawing. Used when migrating a
 * legacy entry into the motion bucket.
 * @param {object} drawing
 * @returns {object} a new object without annotation-only keys
 */
function stripAnnotationFields(drawing) {
  const { visibleStartMs, visibleEndMs, ...rest } = drawing || {};
  return rest;
}

/**
 * Resolve the legacy `attachedPlayerId` into `attachedEntityId` +
 * `attachedEntityType` when entity lookup data is available. Falls back to
 * "player" when nothing is known.
 * @param {object} drawing
 * @param {object} [entities] - { playersById, ballsById }
 * @returns {{ attachedEntityId: string|undefined, attachedEntityType: string|undefined }}
 */
function resolveAttachedEntity(drawing, entities) {
  const legacyId = drawing?.attachedEntityId || drawing?.attachedPlayerId;
  if (!legacyId) return { attachedEntityId: undefined, attachedEntityType: undefined };
  let type = drawing?.attachedEntityType;
  if (!type && entities) {
    if (entities.ballsById && entities.ballsById[legacyId]) type = "ball";
    else if (entities.playersById && entities.playersById[legacyId]) type = "player";
  }
  return { attachedEntityId: legacyId, attachedEntityType: type || "player" };
}

/**
 * Normalize a raw value into a canonical annotation-drawing shape. Missing
 * visibility fields default to full duration. Motion-only fields are stripped.
 * Returns null if the input cannot be coerced into a drawing.
 * @param {object} raw
 * @param {number} durationMs
 * @returns {object|null}
 */
export function normalizeAnnotationDrawing(raw, durationMs) {
  if (!raw || typeof raw !== "object" || !raw.type) return null;
  const stripped = stripMotionFields(raw);
  const { startMs, endMs } = getAnnotationVisibilityWindow(stripped, durationMs);
  return {
    ...stripped,
    kind: "annotation",
    visibleStartMs: startMs,
    visibleEndMs: endMs,
  };
}

/**
 * Normalize a raw value into a canonical motion-drawing shape. Annotation-only
 * fields are stripped. Legacy `attachedPlayerId` is upgraded to
 * `attachedEntityId` + `attachedEntityType`. Returns null if the input lacks an
 * attached entity (motion drawings cannot exist without one).
 * @param {object} raw
 * @param {object} [entities] - { playersById, ballsById }
 * @returns {object|null}
 */
export function normalizeMotionDrawing(raw, entities) {
  if (!raw || typeof raw !== "object" || !raw.type) return null;
  const stripped = stripAnnotationFields(raw);
  const { attachedEntityId, attachedEntityType } = resolveAttachedEntity(stripped, entities);
  if (!attachedEntityId) return null;
  const continuedFromMotionDrawingId =
    stripped.continuedFromMotionDrawingId ?? stripped.continuedFromDrawingId ?? undefined;
  const out = {
    ...stripped,
    kind: "motion",
    attachedEntityId,
    attachedEntityType,
  };
  // Strip the legacy aliases we just consumed.
  delete out.attachedPlayerId;
  delete out.continuedFromDrawingId;
  delete out.source;
  if (continuedFromMotionDrawingId) {
    out.continuedFromMotionDrawingId = continuedFromMotionDrawingId;
  }
  return out;
}

/**
 * Split a legacy combined `drawings` array into separated annotation/motion
 * buckets. Used by import (v2 → v3) and any internal load path that still sees
 * a single array.
 * @param {Array} drawings - legacy combined array (may be undefined)
 * @param {object} [entities] - { playersById, ballsById } for attachment resolution
 * @param {number} [durationMs] - play duration (used for annotation defaults)
 * @returns {{ annotationDrawings: Array, motionDrawings: Array }}
 */
export function splitLegacyDrawingsArray(drawings, entities, durationMs) {
  const annotationDrawings = [];
  const motionDrawings = [];
  if (!Array.isArray(drawings)) return { annotationDrawings, motionDrawings };

  for (const raw of drawings) {
    const kind = getDrawingKind(raw);
    if (kind === "motion") {
      const normalized = normalizeMotionDrawing(raw, entities);
      if (normalized) motionDrawings.push(normalized);
    } else if (kind === "annotation") {
      const normalized = normalizeAnnotationDrawing(raw, durationMs);
      if (normalized) annotationDrawings.push(normalized);
    } else {
      // Unknown shape — treat as annotation (safer default; cannot drive motion).
      const normalized = normalizeAnnotationDrawing(raw, durationMs);
      if (normalized) annotationDrawings.push(normalized);
    }
  }

  return { annotationDrawings, motionDrawings };
}

/**
 * Build the v3 separated-drawings payload from already-split arrays. Both
 * arrays are normalized so callers cannot accidentally write a motion-only
 * field on an annotation (or vice versa).
 * @param {object} args
 * @param {Array} args.annotationDrawings
 * @param {Array} args.motionDrawings
 * @param {object} [args.entities]
 * @param {number} [args.durationMs]
 * @returns {{ annotationDrawings: Array, motionDrawings: Array }}
 */
export function buildSeparatedDrawingsPayload({
  annotationDrawings,
  motionDrawings,
  entities,
  durationMs,
}) {
  const ann = Array.isArray(annotationDrawings) ? annotationDrawings : [];
  const mot = Array.isArray(motionDrawings) ? motionDrawings : [];
  return {
    annotationDrawings: ann
      .map((d) => normalizeAnnotationDrawing(d, durationMs))
      .filter(Boolean),
    motionDrawings: mot.map((d) => normalizeMotionDrawing(d, entities)).filter(Boolean),
  };
}
