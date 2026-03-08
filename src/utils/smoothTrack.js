/**
 * Smooths a recorded track's keyframes using a Gaussian-weighted moving average.
 *
 * @param {Array<{t: number, x: number, y: number}>} keyframes - Raw recorded keyframes
 * @param {number} strength - Smoothing strength from 0 (none) to 1 (maximum)
 * @returns {Array<{t: number, x: number, y: number}>} Smoothed keyframes (same length, same timestamps)
 */
export function smoothTrack(keyframes, strength) {
  if (!keyframes?.length || strength <= 0) return keyframes;

  // Map strength 0-1 to window radius 0-12.
  // At strength=1, each point averages ~25 neighbors (12 on each side at 100ms = 2.5s window).
  const maxRadius = 12;
  const radius = Math.round(strength * maxRadius);
  if (radius === 0) return keyframes;

  // Pre-compute Gaussian weights for the window.
  const sigma = radius / 2.5; // ~2.5 sigma covers the window
  const weights = [];
  for (let i = -radius; i <= radius; i++) {
    weights.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
  }

  const n = keyframes.length;
  const smoothed = new Array(n);

  for (let i = 0; i < n; i++) {
    // Always preserve t (timestamp).
    // Pin the first and last points to keep start/end positions exact.
    if (i === 0 || i === n - 1) {
      smoothed[i] = { ...keyframes[i] };
      continue;
    }

    let sumX = 0;
    let sumY = 0;
    let sumW = 0;

    for (let j = -radius; j <= radius; j++) {
      const idx = Math.min(n - 1, Math.max(0, i + j));
      const w = weights[j + radius];
      sumX += keyframes[idx].x * w;
      sumY += keyframes[idx].y * w;
      sumW += w;
    }

    smoothed[i] = {
      t: keyframes[i].t,
      x: Math.round((sumX / sumW) * 100) / 100,
      y: Math.round((sumY / sumW) * 100) / 100,
    };
  }

  return smoothed;
}
