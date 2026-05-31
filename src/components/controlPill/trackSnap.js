/**
 * Pure helpers for CapCut/VN-style timeline snapping shared by
 * {@link StepTrack} (motion bars) and {@link AnnotationVisibilityTrack}
 * (annotation bars). Keeps snap math out of the DOM-coupled drag handlers
 * so it is unit-testable.
 */

// Pixel-based snap radius. Translated to ms by the caller using its own
// container width so the feel is consistent across timeline widths.
export const TRACK_SNAP_THRESHOLD_PX = 6;

// Track lanes draw their content over the same usable span as TimeBar
// (3% → 97% of the container). Kept here so both track files can pass the
// same value into pxToMs without re-declaring it.
export const TRACK_VISUAL_SPAN_PERCENT = 94;

/**
 * Convert a pixel distance into the equivalent millisecond distance for a
 * track lane of `containerWidthPx`. Returns 0 for non-positive widths so
 * snap is silently disabled while the layout is mid-mount.
 */
export function pxToMs(px, containerWidthPx, durationMs, spanPercent = TRACK_VISUAL_SPAN_PERCENT) {
  if (!(containerWidthPx > 0) || !(durationMs > 0)) return 0;
  const usableWidthPx = containerWidthPx * (spanPercent / 100);
  if (!(usableWidthPx > 0)) return 0;
  return (px / usableWidthPx) * durationMs;
}

/**
 * Return the value in `targets` nearest to `candidate` if it is within
 * `thresholdMs`; otherwise return `candidate` unchanged. Non-finite targets
 * are skipped.
 */
export function snapTimeMs(candidate, targets, thresholdMs) {
  if (!Array.isArray(targets) || targets.length === 0) return candidate;
  if (!(thresholdMs > 0)) return candidate;
  let best = candidate;
  let bestDist = thresholdMs;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (!Number.isFinite(t)) continue;
    const dist = Math.abs(t - candidate);
    if (dist < bestDist) {
      bestDist = dist;
      best = t;
    }
  }
  return best;
}

/**
 * Body-drag snap: a moving block has two edges (left = `candidateStart`,
 * right = `candidateStart + spanMs`); either may snap to a target. Returns
 * the chosen start position. Whichever edge moved further toward a target
 * wins; ties favour the left edge.
 */
export function snapBodyStartMs(candidateStart, spanMs, targets, thresholdMs) {
  const candidateEnd = candidateStart + spanMs;
  const leftSnapped = snapTimeMs(candidateStart, targets, thresholdMs);
  const rightSnapped = snapTimeMs(candidateEnd, targets, thresholdMs);
  const leftDelta = leftSnapped - candidateStart;
  const rightDelta = rightSnapped - candidateEnd;
  if (leftDelta === 0 && rightDelta === 0) return candidateStart;
  if (leftDelta !== 0 && (rightDelta === 0 || Math.abs(leftDelta) <= Math.abs(rightDelta))) {
    return leftSnapped;
  }
  return rightSnapped - spanMs;
}
