/**
 * Pure helpers for the canvas two-finger pan + pinch-zoom gesture used in the
 * mobile editor. Extracted from KonvaCanvasRoot so the gesture math can be
 * unit-tested without a DOM / touch-event harness.
 *
 * Touch model: one finger drags an object (or marquee-selects on empty canvas),
 * two fingers pan and pinch-zoom the field simultaneously.
 */

/**
 * Euclidean distance, in client pixels, between the first two touch points.
 * @param {Array<{clientX:number, clientY:number}>} touches
 * @returns {number} distance, or 0 when fewer than two touches are present.
 */
export function getTouchDistance(touches) {
  if (!touches || touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Midpoint (client coords) between the first two touch points.
 * @param {Array<{clientX:number, clientY:number}>} touches
 * @returns {{x:number, y:number}} midpoint, or {0,0} when fewer than two touches.
 */
export function getTouchMidpoint(touches) {
  if (!touches || touches.length < 2) return { x: 0, y: 0 };
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

/** Clamp a value to the inclusive [min, max] range. */
export function clampZoom(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Zoom level for the current pinch, relative to the zoom captured when the
 * gesture began, clamped to [min, max]. Returns the (clamped) start zoom for a
 * degenerate start distance so a momentary 0-distance never divides by zero.
 *
 * @param {number} startZoom   zoom when the two-finger gesture started
 * @param {number} startDist   finger distance when the gesture started
 * @param {number} currentDist current finger distance
 * @param {number} min         minimum allowed zoom
 * @param {number} max         maximum allowed zoom
 * @returns {number} the next clamped zoom level
 */
export function computePinchZoom(startZoom, startDist, currentDist, min, max) {
  if (!(startDist > 0)) return clampZoom(startZoom, min, max);
  const scale = currentDist / startDist;
  return clampZoom(startZoom * scale, min, max);
}

/**
 * Pan delta (in client pixels) between two two-finger midpoints. Used to
 * translate the camera as the fingers move together.
 *
 * @param {{x:number, y:number}|null} prevMid    previous midpoint
 * @param {{x:number, y:number}|null} currentMid current midpoint
 * @returns {{dx:number, dy:number}} translation delta (0,0 if either is missing)
 */
export function computeMidpointPan(prevMid, currentMid) {
  if (!prevMid || !currentMid) return { dx: 0, dy: 0 };
  return { dx: currentMid.x - prevMid.x, dy: currentMid.y - prevMid.y };
}
