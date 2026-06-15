/**
 * Tests for the pure two-finger pan + pinch-zoom helpers used by the mobile
 * editor canvas (src/canvas/touchGestures.js). The DOM-coupled touch listeners
 * in KonvaCanvasRoot are not tested here — only the math that turns raw touch
 * points into a zoom level and a camera-translation delta.
 *
 * Touch model under test: one finger drags / marquee-selects, two fingers pan
 * and pinch-zoom simultaneously.
 */
import { describe, it, expect } from "vitest";
import {
  getTouchDistance,
  getTouchMidpoint,
  clampZoom,
  computePinchZoom,
  computeMidpointPan,
} from "../../src/canvas/touchGestures.js";

const touch = (x, y) => ({ clientX: x, clientY: y });

describe("getTouchDistance", () => {
  it("returns the euclidean distance between two touch points", () => {
    expect(getTouchDistance([touch(0, 0), touch(3, 4)])).toBe(5);
  });

  it("is order-independent", () => {
    expect(getTouchDistance([touch(3, 4), touch(0, 0)])).toBe(5);
  });

  it("returns 0 for fewer than two touches or missing input", () => {
    expect(getTouchDistance([touch(1, 1)])).toBe(0);
    expect(getTouchDistance([])).toBe(0);
    expect(getTouchDistance(null)).toBe(0);
    expect(getTouchDistance(undefined)).toBe(0);
  });
});

describe("getTouchMidpoint", () => {
  it("returns the midpoint of the two touch points", () => {
    expect(getTouchMidpoint([touch(0, 0), touch(10, 20)])).toEqual({ x: 5, y: 10 });
  });

  it("handles negative coordinates", () => {
    expect(getTouchMidpoint([touch(-10, -4), touch(10, 4)])).toEqual({ x: 0, y: 0 });
  });

  it("returns {0,0} for fewer than two touches", () => {
    expect(getTouchMidpoint([touch(5, 5)])).toEqual({ x: 0, y: 0 });
    expect(getTouchMidpoint(null)).toEqual({ x: 0, y: 0 });
  });
});

describe("clampZoom", () => {
  it("passes values within range through unchanged", () => {
    expect(clampZoom(1.5, 0.2, 4)).toBe(1.5);
  });

  it("clamps below the minimum and above the maximum", () => {
    expect(clampZoom(0.05, 0.2, 4)).toBe(0.2);
    expect(clampZoom(99, 0.2, 4)).toBe(4);
  });
});

describe("computePinchZoom", () => {
  it("doubles the zoom when the fingers move twice as far apart", () => {
    // start zoom 1, fingers go 100px -> 200px apart -> 2x zoom
    expect(computePinchZoom(1, 100, 200, 0.2, 4)).toBeCloseTo(2, 6);
  });

  it("halves the zoom when the fingers move half as far apart", () => {
    expect(computePinchZoom(2, 200, 100, 0.2, 4)).toBeCloseTo(1, 6);
  });

  it("clamps the result to the allowed zoom range", () => {
    expect(computePinchZoom(2, 100, 1000, 0.2, 4)).toBe(4); // would be 20x
    expect(computePinchZoom(1, 100, 1, 0.2, 4)).toBe(0.2); // would be 0.01x
  });

  it("returns the clamped start zoom for a degenerate (zero) start distance", () => {
    expect(computePinchZoom(1.5, 0, 200, 0.2, 4)).toBe(1.5);
    expect(computePinchZoom(99, 0, 200, 0.2, 4)).toBe(4);
  });
});

describe("computeMidpointPan", () => {
  it("returns the delta between two midpoints", () => {
    expect(computeMidpointPan({ x: 10, y: 10 }, { x: 30, y: 5 })).toEqual({ dx: 20, dy: -5 });
  });

  it("returns no movement for identical midpoints", () => {
    expect(computeMidpointPan({ x: 7, y: 7 }, { x: 7, y: 7 })).toEqual({ dx: 0, dy: 0 });
  });

  it("returns {0,0} when either midpoint is missing", () => {
    expect(computeMidpointPan(null, { x: 1, y: 1 })).toEqual({ dx: 0, dy: 0 });
    expect(computeMidpointPan({ x: 1, y: 1 }, null)).toEqual({ dx: 0, dy: 0 });
  });
});
