/**
 * Timing helpers for annotation-drawing visibility windows.
 *
 * Annotation drawings (kind: "annotation") may be shown for only part of a play's
 * duration. Each annotation owns `visibleStartMs` and `visibleEndMs`; if either
 * field is missing the annotation is treated as visible for the whole duration.
 *
 * Motion drawings (kind: "motion") use `stepStartMs` / `stepEndMs` instead and
 * are NOT touched by these helpers.
 *
 * @module features/slate/utils/drawingTiming
 */

/** Minimum gap (ms) between `visibleStartMs` and `visibleEndMs` for an annotation. */
export const MIN_DRAWING_WINDOW_MS = 100;

/**
 * Returns true when a drawing-shaped object is an annotation drawing.
 * Annotations are identified by `kind === "annotation"` first; otherwise we fall
 * back to "lacks any motion-only field" so legacy untagged drawings work.
 * @param {object|null|undefined} drawing
 * @returns {boolean}
 */
export function isAnnotationDrawing(drawing) {
  if (!drawing) return false;
  if (drawing.kind === "annotation") return true;
  if (drawing.kind === "motion") return false;
  if (drawing.source === "coaching-draw") return false;
  if (drawing.attachedPlayerId || drawing.attachedEntityId) return false;
  if (drawing.stepStartMs != null || drawing.stepEndMs != null) return false;
  return true;
}

/**
 * Returns true when a drawing-shaped object is a motion drawing.
 * Motion drawings are identified by `kind === "motion"` first; legacy data is
 * identified by `source === "coaching-draw"` or by the presence of an attached
 * entity / step window.
 * @param {object|null|undefined} drawing
 * @returns {boolean}
 */
export function isMotionDrawing(drawing) {
  if (!drawing) return false;
  if (drawing.kind === "motion") return true;
  if (drawing.kind === "annotation") return false;
  if (drawing.source === "coaching-draw") return true;
  if (drawing.attachedPlayerId || drawing.attachedEntityId) return true;
  if (drawing.stepStartMs != null || drawing.stepEndMs != null) return true;
  return false;
}

/**
 * Returns the effective `[startMs, endMs]` visibility window for an annotation
 * drawing. Missing or invalid fields default to the full duration so legacy
 * annotation drawings stay fully visible.
 * @param {object} drawing
 * @param {number} durationMs - total play duration in ms
 * @returns {{ startMs: number, endMs: number }}
 */
export function getAnnotationVisibilityWindow(drawing, durationMs) {
  const total = Math.max(0, Number(durationMs) || 0);
  if (!drawing) return { startMs: 0, endMs: total };
  const rawStart = Number(drawing.visibleStartMs);
  const rawEnd = Number(drawing.visibleEndMs);
  const start = Number.isFinite(rawStart) ? rawStart : 0;
  const end = Number.isFinite(rawEnd) ? rawEnd : total;
  return normalizeAnnotationVisibilityWindow(start, end, total);
}

/**
 * Clamps a `[startMs, endMs]` window to `[0, durationMs]` and enforces the
 * minimum-window invariant `endMs - startMs >= MIN_DRAWING_WINDOW_MS`.
 * If the requested window is too small the end is pushed out (or, if that would
 * exceed the duration, the start is pulled back).
 * @param {number} startMs
 * @param {number} endMs
 * @param {number} durationMs
 * @returns {{ startMs: number, endMs: number }}
 */
export function normalizeAnnotationVisibilityWindow(startMs, endMs, durationMs) {
  const total = Math.max(0, Number(durationMs) || 0);
  let start = Math.max(0, Math.min(total, Number(startMs) || 0));
  let end = Math.max(0, Math.min(total, Number(endMs) || 0));
  if (end < start) {
    const swap = start;
    start = end;
    end = swap;
  }
  if (end - start < MIN_DRAWING_WINDOW_MS) {
    end = Math.min(total, start + MIN_DRAWING_WINDOW_MS);
    if (end - start < MIN_DRAWING_WINDOW_MS) {
      start = Math.max(0, end - MIN_DRAWING_WINDOW_MS);
    }
  }
  return { startMs: start, endMs: end };
}

/**
 * Returns true when an annotation drawing should be visible at the given time.
 * Non-annotation drawings always return true — callers must check `isAnnotationDrawing`
 * separately if they only want to filter annotations.
 * @param {object} drawing
 * @param {number} timeMs - current play time in ms
 * @param {number} durationMs - total play duration in ms
 * @returns {boolean}
 */
export function isAnnotationDrawingVisibleAtTime(drawing, timeMs, durationMs) {
  if (!isAnnotationDrawing(drawing)) return true;
  const { startMs, endMs } = getAnnotationVisibilityWindow(drawing, durationMs);
  const t = Number(timeMs) || 0;
  return t >= startMs && t <= endMs;
}
