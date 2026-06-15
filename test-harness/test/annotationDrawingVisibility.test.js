/**
 * Tests for annotation-drawing timeline visibility windows.
 *
 * Covers:
 * - default full-duration visibility when fields are missing
 * - clamping and minimum-window enforcement
 * - isAnnotationDrawingVisibleAtTime gating
 * - motion drawings are not affected by these helpers
 */
import { describe, it, expect } from "vitest";
import {
  MIN_DRAWING_WINDOW_MS,
  getAnnotationVisibilityWindow,
  normalizeAnnotationVisibilityWindow,
  isAnnotationDrawingVisibleAtTime,
  isAnnotationDrawing,
  isMotionDrawing,
} from "../../src/features/slate/utils/drawingTiming.js";

describe("getAnnotationVisibilityWindow", () => {
  it("defaults to [0, durationMs] when fields are missing", () => {
    expect(getAnnotationVisibilityWindow({ type: "text" }, 12000)).toEqual({
      startMs: 0,
      endMs: 12000,
    });
  });

  it("returns explicit fields when valid", () => {
    expect(
      getAnnotationVisibilityWindow(
        { type: "text", visibleStartMs: 2000, visibleEndMs: 8000 },
        30000
      )
    ).toEqual({ startMs: 2000, endMs: 8000 });
  });

  it("clamps fields outside duration", () => {
    expect(
      getAnnotationVisibilityWindow(
        { type: "text", visibleStartMs: -500, visibleEndMs: 50000 },
        30000
      )
    ).toEqual({ startMs: 0, endMs: 30000 });
  });
});

describe("normalizeAnnotationVisibilityWindow", () => {
  it("swaps reversed inputs", () => {
    expect(normalizeAnnotationVisibilityWindow(5000, 1000, 30000)).toEqual({
      startMs: 1000,
      endMs: 5000,
    });
  });

  it("enforces minimum window by extending end", () => {
    const result = normalizeAnnotationVisibilityWindow(0, 10, 30000);
    expect(result.endMs - result.startMs).toBeGreaterThanOrEqual(MIN_DRAWING_WINDOW_MS);
  });

  it("enforces minimum window by pulling start back when at duration end", () => {
    const result = normalizeAnnotationVisibilityWindow(29990, 30000, 30000);
    expect(result.endMs).toBe(30000);
    expect(result.endMs - result.startMs).toBeGreaterThanOrEqual(MIN_DRAWING_WINDOW_MS);
  });
});

describe("isAnnotationDrawingVisibleAtTime", () => {
  const drawing = {
    kind: "annotation",
    type: "text",
    visibleStartMs: 1000,
    visibleEndMs: 5000,
  };

  it("returns true inside the window", () => {
    expect(isAnnotationDrawingVisibleAtTime(drawing, 1500, 30000)).toBe(true);
    expect(isAnnotationDrawingVisibleAtTime(drawing, 1000, 30000)).toBe(true);
    expect(isAnnotationDrawingVisibleAtTime(drawing, 5000, 30000)).toBe(true);
  });

  it("returns false outside the window", () => {
    expect(isAnnotationDrawingVisibleAtTime(drawing, 500, 30000)).toBe(false);
    expect(isAnnotationDrawingVisibleAtTime(drawing, 5500, 30000)).toBe(false);
  });

  it("returns true for motion drawings (they are not gated by this helper)", () => {
    const motion = {
      kind: "motion",
      type: "arrow",
      attachedEntityId: "p1",
      stepStartMs: 0,
      stepEndMs: 1000,
    };
    expect(isAnnotationDrawingVisibleAtTime(motion, 9999, 30000)).toBe(true);
  });

  it("treats annotations with no window fields as visible across the whole duration", () => {
    expect(
      isAnnotationDrawingVisibleAtTime({ kind: "annotation", type: "text" }, 0, 30000)
    ).toBe(true);
    expect(
      isAnnotationDrawingVisibleAtTime({ kind: "annotation", type: "text" }, 15000, 30000)
    ).toBe(true);
    expect(
      isAnnotationDrawingVisibleAtTime({ kind: "annotation", type: "text" }, 30000, 30000)
    ).toBe(true);
  });
});

describe("kind discriminators", () => {
  it("isAnnotationDrawing rejects motion drawings", () => {
    expect(isAnnotationDrawing({ kind: "motion" })).toBe(false);
    expect(isAnnotationDrawing({ source: "coaching-draw", attachedPlayerId: "p1" })).toBe(false);
  });

  it("isMotionDrawing rejects annotation drawings", () => {
    expect(isMotionDrawing({ kind: "annotation" })).toBe(false);
    expect(isMotionDrawing({ type: "text" })).toBe(false);
  });

  it("untagged drawings are annotation by default", () => {
    expect(isAnnotationDrawing({ type: "text", text: "x" })).toBe(true);
  });
});
