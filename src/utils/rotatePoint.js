/**
 * Rotate a point (x, y) around the origin by angleDeg degrees.
 */
export function rotatePoint(x, y, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}
