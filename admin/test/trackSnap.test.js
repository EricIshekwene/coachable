/**
 * Tests for the pure track-snapping helpers shared by StepTrack and
 * AnnotationVisibilityTrack. The DOM-coupled drag handlers are not tested
 * here — only the math that decides whether a candidate ms value snaps.
 */
import { describe, it, expect } from "vitest";
import {
  TRACK_SNAP_THRESHOLD_PX,
  pxToMs,
  snapTimeMs,
  snapBodyStartMs,
} from "../../src/features/slate/components/controlPill/trackSnap.js";

describe("pxToMs", () => {
  it("converts a pixel distance to ms across the usable 94% span", () => {
    // 100px-wide lane, 10s duration: usable width = 94px, so 9.4px = 1000ms.
    expect(pxToMs(9.4, 100, 10000)).toBeCloseTo(1000, 3);
  });

  it("returns 0 for non-positive widths or durations", () => {
    expect(pxToMs(6, 0, 10000)).toBe(0);
    expect(pxToMs(6, 100, 0)).toBe(0);
    expect(pxToMs(6, -10, 10000)).toBe(0);
  });

  it("scales with the SNAP_THRESHOLD constant for typical widths", () => {
    const ms = pxToMs(TRACK_SNAP_THRESHOLD_PX, 500, 20000);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThan(1000);
  });
});

describe("snapTimeMs", () => {
  it("returns candidate unchanged when no targets are within threshold", () => {
    expect(snapTimeMs(5000, [1000, 2000], 200)).toBe(5000);
  });

  it("snaps to the nearest target within threshold", () => {
    expect(snapTimeMs(5050, [3000, 5100, 7000], 200)).toBe(5100);
  });

  it("breaks ties by first match", () => {
    expect(snapTimeMs(5000, [4900, 5100], 200)).toBe(4900);
  });

  it("ignores non-finite targets", () => {
    expect(snapTimeMs(5050, [NaN, undefined, null, 5100], 200)).toBe(5100);
  });

  it("returns candidate when targets array is empty or threshold is non-positive", () => {
    expect(snapTimeMs(5000, [], 200)).toBe(5000);
    expect(snapTimeMs(5000, [5000], 0)).toBe(5000);
    expect(snapTimeMs(5000, [5000], -1)).toBe(5000);
  });
});

describe("snapBodyStartMs", () => {
  it("snaps the leading edge when it is closer", () => {
    // candidateStart=4950, spanMs=2000 ⇒ candidateEnd=6950.
    // Target 5000 is 50ms from start; target 6000 is 950ms from end.
    expect(snapBodyStartMs(4950, 2000, [5000, 6000], 200)).toBe(5000);
  });

  it("snaps the trailing edge when it is closer", () => {
    // candidateStart=4000, spanMs=2000 ⇒ candidateEnd=6000.
    // Target 6050 is 50ms from end (closer than any start target).
    // Result is start = 6050 - 2000 = 4050.
    expect(snapBodyStartMs(4000, 2000, [3000, 6050], 200)).toBe(4050);
  });

  it("returns candidate unchanged when neither edge is in range", () => {
    expect(snapBodyStartMs(4000, 2000, [10000, 12000], 200)).toBe(4000);
  });

  it("favours the leading edge on a tie", () => {
    // start=5000 dist 100; end=7100 dist 100. Tie → left wins.
    expect(snapBodyStartMs(5100, 2000, [5000, 7100], 200)).toBe(5000);
  });
});

describe("deadband at current edge (no own-edge exclusion)", () => {
  // Regression: previously we filtered the dragged bar's own edges out of
  // the target list to avoid "stickiness". That filtering caused jitter
  // whenever a neighbour bar shared the dragged value (the snap engaged,
  // updated the bar, then the next frame's exclusion dropped BOTH the
  // self-value and the neighbour's identical value, disengaging the snap).
  // Keeping own edges in the target list produces a stable deadband: small
  // mouse motion at the snapped position writes the same value back.
  it("a candidate within threshold of any target snaps to that target", () => {
    const targets = [5000, 6000];
    // Mouse drifts 5ms past the current edge at 5000 — should clamp back.
    expect(snapTimeMs(5005, targets, 200)).toBe(5000);
    // Mouse drifts 5ms before the edge — same.
    expect(snapTimeMs(4995, targets, 200)).toBe(5000);
  });

  it("body drag stays put when both edges are inside the deadband", () => {
    // Block at [5000, 6000]; targets include both endpoints. Tiny raw shift
    // should resolve back to start = 5000.
    expect(snapBodyStartMs(5005, 1000, [5000, 6000], 200)).toBe(5000);
  });
});
