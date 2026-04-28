/**
 * Tests for testVariant keyframe styling logic.
 * Covers ControlPill proximity auto-selection, KeyframeDisplay drag clamping,
 * and KeyframeManager label derivation — all mirroring the component source.
 */
import { describe, it, expect } from "vitest";

const PROXIMITY_TOLERANCE_MS = 300; // ControlPill.jsx
const KEYFRAME_MIN_GAP_MS = 500;    // KeyframeDisplay.jsx

// ── ControlPill effectiveSelectedKeyframeMs ───────────────────────────────────

/**
 * Mirrors the effectiveSelectedKeyframeMs useMemo in ControlPill.jsx.
 * In test variant, auto-selects the nearest keyframe within PROXIMITY_TOLERANCE_MS
 * when no keyframe is explicitly selected.
 */
const resolveEffectiveSelected = (selectedKeyframeMs, keyframesMs, currentTimeMs, variant) => {
  if (selectedKeyframeMs !== null && selectedKeyframeMs !== undefined) return selectedKeyframeMs;
  if (variant !== "test") return selectedKeyframeMs;
  return (keyframesMs || []).find((kf) => Math.abs(kf - currentTimeMs) <= PROXIMITY_TOLERANCE_MS) ?? null;
};

describe("ControlPill effectiveSelectedKeyframeMs — test variant auto-selection", () => {
  it("returns explicit selectedKeyframeMs regardless of variant", () => {
    expect(resolveEffectiveSelected(5000, [5000, 10000], 5050, "test")).toBe(5000);
    expect(resolveEffectiveSelected(5000, [5000, 10000], 5050, "default")).toBe(5000);
  });

  it("returns null in default variant when nothing is selected", () => {
    expect(resolveEffectiveSelected(null, [5000, 10000], 4900, "default")).toBeNull();
  });

  it("auto-selects the nearest keyframe within 300ms in test variant", () => {
    expect(resolveEffectiveSelected(null, [5000, 15000], 4800, "test")).toBe(5000);
    expect(resolveEffectiveSelected(null, [5000, 15000], 5250, "test")).toBe(5000);
  });

  it("auto-selects at the exact 300ms boundary", () => {
    expect(resolveEffectiveSelected(null, [5000], 4700, "test")).toBe(5000);
    expect(resolveEffectiveSelected(null, [5000], 5300, "test")).toBe(5000);
  });

  it("returns null when just outside the 300ms tolerance", () => {
    expect(resolveEffectiveSelected(null, [5000], 4699, "test")).toBeNull();
    expect(resolveEffectiveSelected(null, [5000], 5301, "test")).toBeNull();
  });

  it("returns null when keyframesMs is empty in test variant", () => {
    expect(resolveEffectiveSelected(null, [], 5000, "test")).toBeNull();
  });

  it("returns null when no keyframe is near the playhead in test variant", () => {
    expect(resolveEffectiveSelected(null, [5000, 15000], 0, "test")).toBeNull();
  });

  it("picks the first matching keyframe (Array.find order) when multiple are in range", () => {
    // 5000 and 5200 are both within 300ms of 5100; Array.find returns first
    expect(resolveEffectiveSelected(null, [5000, 5200], 5100, "test")).toBe(5000);
  });
});

// ── KeyframeDisplay clampDragTargetTime ───────────────────────────────────────

/**
 * Mirrors clampDragTargetTime in KeyframeDisplay.jsx.
 * Prevents dragged keyframe from overlapping or getting within KEYFRAME_MIN_GAP_MS
 * of any other keyframe, and keeps the value within [0, durationMs].
 */
const clampDragTargetTime = (originalTimeMs, targetTimeMs, keyframesMs, durationMs) => {
  let clamped = targetTimeMs;
  const otherTimes = (keyframesMs || []).filter((t) => Math.abs(t - originalTimeMs) > 0.5);

  for (const neighborMs of otherTimes) {
    const gap = clamped - neighborMs;
    if (Math.abs(gap) < KEYFRAME_MIN_GAP_MS) {
      clamped = gap >= 0 ? neighborMs + KEYFRAME_MIN_GAP_MS : neighborMs - KEYFRAME_MIN_GAP_MS;
    }
  }

  return Math.max(0, Math.min(durationMs, clamped));
};

describe("KeyframeDisplay clampDragTargetTime", () => {
  const DURATION = 30000;

  it("passes through target unchanged when far from all neighbors", () => {
    expect(clampDragTargetTime(5000, 8000, [5000, 15000], DURATION)).toBe(8000);
  });

  it("bumps target forward when it lands too close to a left neighbor", () => {
    // target 10200 is only 200ms from neighbor at 10000 — must become 10500
    expect(clampDragTargetTime(5000, 10200, [5000, 10000], DURATION)).toBe(10500);
  });

  it("bumps target backward when it lands too close to a right neighbor", () => {
    // target 9600 is 400ms from neighbor at 10000 — must become 9500
    expect(clampDragTargetTime(5000, 9600, [5000, 10000], DURATION)).toBe(9500);
  });

  it("allows placement at exactly the minimum gap distance", () => {
    expect(clampDragTargetTime(5000, 10500, [5000, 10000], DURATION)).toBe(10500);
    expect(clampDragTargetTime(5000, 9500, [5000, 10000], DURATION)).toBe(9500);
  });

  it("excludes the original keyframe from neighbor checks", () => {
    // originalTimeMs=5000 is in the list but must not block its own drag
    expect(clampDragTargetTime(5000, 5200, [5000, 20000], DURATION)).toBe(5200);
  });

  it("clamps to 0 when target goes below zero", () => {
    expect(clampDragTargetTime(5000, -200, [5000], DURATION)).toBe(0);
  });

  it("clamps to durationMs when target exceeds duration", () => {
    expect(clampDragTargetTime(5000, 31000, [5000], DURATION)).toBe(DURATION);
  });

  it("handles an empty keyframe list without throwing", () => {
    expect(clampDragTargetTime(5000, 8000, [], DURATION)).toBe(8000);
  });
});

// ── KeyframeManager button label ──────────────────────────────────────────────

/**
 * Mirrors the label expression in KeyframeManager.jsx:
 *   selectedKeyframe !== null ? "Delete Keyframe" : "Add Keyframe"
 */
const resolveKeyframeLabel = (selectedKeyframe) =>
  selectedKeyframe !== null ? "Delete Keyframe" : "Add Keyframe";

describe("KeyframeManager button label", () => {
  it('shows "Add Keyframe" when selectedKeyframe is null', () => {
    expect(resolveKeyframeLabel(null)).toBe("Add Keyframe");
  });

  it('shows "Delete Keyframe" when a keyframe time is selected', () => {
    expect(resolveKeyframeLabel(5000)).toBe("Delete Keyframe");
  });

  it('shows "Delete Keyframe" for the start keyframe (time 0)', () => {
    expect(resolveKeyframeLabel(0)).toBe("Delete Keyframe");
  });
});
