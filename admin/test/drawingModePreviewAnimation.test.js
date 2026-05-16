/**
 * Regression test for the play preview not animating drawing-mode plays.
 *
 * Background:
 *   - Drawing-mode plays attach coaching-draw strokes to players/balls. Each
 *     stroke has stepStartMs/stepEndMs and a points[] path; the animation comes
 *     from sampling along the path between those times.
 *   - PlayPreviewCard previously only used animation.tracks (which is empty for
 *     drawing-mode plays), so previews were frozen.
 *   - Fix: replicate Slate's renderPoseAtTime override — pick the latest active
 *     coaching-draw step per player and sample its path.
 *
 * The pure helpers below mirror the inline logic added in PlayPreviewCard.jsx
 * so we can unit-test the behavior without rendering React/SVG.
 */
import { describe, it, expect } from "vitest";
import { samplePathAtT } from "../../src/canvas/drawingGeometry.js";

const DEFAULT_DURATION_MS = 30000;

/** Mirrors the drawingPathPoses useMemo in PlayPreviewCard. */
function computeDrawingPathPoses(drawings, displayTimeMs, durationMs) {
  if (!drawings.length) return null;
  const fullDurationMs = durationMs || DEFAULT_DURATION_MS;
  const activeStepByItemId = new Map();

  for (const d of drawings) {
    if (d.source !== "coaching-draw" || !d.attachedPlayerId || !d.points?.length) continue;
    const stepStartMs = d.stepStartMs ?? 0;
    if (displayTimeMs < stepStartMs) continue;
    const existing = activeStepByItemId.get(d.attachedPlayerId);
    if (!existing || stepStartMs >= existing.stepStartMs) {
      activeStepByItemId.set(d.attachedPlayerId, { drawing: d, stepStartMs });
    }
  }

  if (activeStepByItemId.size === 0) return null;

  const overrides = {};
  for (const [itemId, activeStep] of activeStepByItemId) {
    const d = activeStep.drawing;
    const stepEndMs = d.stepEndMs ?? fullDurationMs;
    const spanMs = stepEndMs - activeStep.stepStartMs;
    const t = spanMs > 0
      ? Math.min(1, Math.max(0, (displayTimeMs - activeStep.stepStartMs) / spanMs))
      : 0;
    const pos = samplePathAtT(d.points, t);
    if (pos) overrides[itemId] = { x: pos.x, y: pos.y, r: 0 };
  }
  return overrides;
}

describe("PlayPreviewCard drawing-mode path animation", () => {
  it("returns null when there are no drawings", () => {
    expect(computeDrawingPathPoses([], 0, 30000)).toBe(null);
  });

  it("returns null when drawings exist but none are coaching-draw", () => {
    const drawings = [{ type: "stroke", source: "freehand", points: [0, 0, 10, 10] }];
    expect(computeDrawingPathPoses(drawings, 0, 30000)).toBe(null);
  });

  it("places the player at the start of its path at t=stepStart", () => {
    const drawings = [{
      source: "coaching-draw",
      attachedPlayerId: "p1",
      stepStartMs: 0,
      stepEndMs: 1000,
      points: [10, 20, 110, 220],
    }];
    const poses = computeDrawingPathPoses(drawings, 0, 30000);
    expect(poses).toEqual({ p1: { x: 10, y: 20, r: 0 } });
  });

  it("places the player at the end of its path at t=stepEnd", () => {
    const drawings = [{
      source: "coaching-draw",
      attachedPlayerId: "p1",
      stepStartMs: 0,
      stepEndMs: 1000,
      points: [10, 20, 110, 220],
    }];
    const poses = computeDrawingPathPoses(drawings, 1000, 30000);
    expect(poses.p1.x).toBeCloseTo(110);
    expect(poses.p1.y).toBeCloseTo(220);
  });

  it("interpolates linearly along a straight 2-point path", () => {
    const drawings = [{
      source: "coaching-draw",
      attachedPlayerId: "p1",
      stepStartMs: 0,
      stepEndMs: 1000,
      points: [0, 0, 100, 0],
    }];
    const mid = computeDrawingPathPoses(drawings, 500, 30000);
    expect(mid.p1.x).toBeCloseTo(50);
    expect(mid.p1.y).toBeCloseTo(0);
  });

  it("does not move the player before its step starts", () => {
    const drawings = [{
      source: "coaching-draw",
      attachedPlayerId: "p1",
      stepStartMs: 5000,
      stepEndMs: 10000,
      points: [0, 0, 100, 0],
    }];
    expect(computeDrawingPathPoses(drawings, 0, 30000)).toBe(null);
    expect(computeDrawingPathPoses(drawings, 4999, 30000)).toBe(null);
  });

  it("activates the latest started step when multiple steps exist for one player", () => {
    const drawings = [
      {
        source: "coaching-draw",
        attachedPlayerId: "p1",
        stepStartMs: 0,
        stepEndMs: 5000,
        points: [0, 0, 100, 0],
      },
      {
        source: "coaching-draw",
        attachedPlayerId: "p1",
        stepStartMs: 5000,
        stepEndMs: 10000,
        points: [100, 0, 100, 100],
      },
    ];
    // Inside step 1
    const at2k = computeDrawingPathPoses(drawings, 2000, 30000);
    expect(at2k.p1.x).toBeCloseTo(40);
    expect(at2k.p1.y).toBeCloseTo(0);
    // Right at step 2 start: should be at the start of the second segment
    const at5k = computeDrawingPathPoses(drawings, 5000, 30000);
    expect(at5k.p1.x).toBeCloseTo(100);
    expect(at5k.p1.y).toBeCloseTo(0);
    // Mid-step 2: half-way along the vertical segment
    const at7k5 = computeDrawingPathPoses(drawings, 7500, 30000);
    expect(at7k5.p1.x).toBeCloseTo(100);
    expect(at7k5.p1.y).toBeCloseTo(50);
  });

  it("holds the end position past stepEndMs (clamps t to 1)", () => {
    const drawings = [{
      source: "coaching-draw",
      attachedPlayerId: "p1",
      stepStartMs: 0,
      stepEndMs: 1000,
      points: [0, 0, 100, 0],
    }];
    const past = computeDrawingPathPoses(drawings, 5000, 30000);
    expect(past.p1.x).toBeCloseTo(100);
  });

  it("ignores coaching-draws with no points", () => {
    const drawings = [{
      source: "coaching-draw",
      attachedPlayerId: "p1",
      stepStartMs: 0,
      stepEndMs: 1000,
      points: [],
    }];
    expect(computeDrawingPathPoses(drawings, 500, 30000)).toBe(null);
  });

  it("animates multiple players independently", () => {
    const drawings = [
      {
        source: "coaching-draw",
        attachedPlayerId: "p1",
        stepStartMs: 0,
        stepEndMs: 1000,
        points: [0, 0, 100, 0],
      },
      {
        source: "coaching-draw",
        attachedPlayerId: "p2",
        stepStartMs: 0,
        stepEndMs: 1000,
        points: [0, 0, 0, 100],
      },
    ];
    const poses = computeDrawingPathPoses(drawings, 500, 30000);
    expect(poses.p1.x).toBeCloseTo(50);
    expect(poses.p1.y).toBeCloseTo(0);
    expect(poses.p2.x).toBeCloseTo(0);
    expect(poses.p2.y).toBeCloseTo(50);
  });
});
