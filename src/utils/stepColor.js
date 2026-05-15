/**
 * Returns a progressively lighter shade of baseColor for each step index.
 * Step 0 = full player color, step 1 = 28% toward white, step 2 = 56%, capped at 70%.
 *
 * @param {string} baseColor - hex color string (e.g. "#ef4444")
 * @param {number} stepIndex - 0-based step index
 * @returns {string} hex color string
 */
export function getStepColor(baseColor, stepIndex) {
  if (!stepIndex || stepIndex <= 0) return baseColor;
  if (!baseColor || !baseColor.startsWith("#") || baseColor.length < 7) return baseColor;
  const factor = Math.min(stepIndex * 0.28, 0.7);
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  const nr = Math.round(r + (255 - r) * factor);
  const ng = Math.round(g + (255 - g) * factor);
  const nb = Math.round(b + (255 - b) * factor);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}
