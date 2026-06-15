/**
 * Tests for the foundation of the annotation/motion drawing split.
 *
 * Covers:
 * - kind detection on the new `kind` field plus legacy shapes
 * - normalization that strips cross-scope fields
 * - migration from a legacy combined `drawings` array
 * - scope capability matrix
 */
import { describe, it, expect } from "vitest";
import {
  getDrawingKind,
  normalizeAnnotationDrawing,
  normalizeMotionDrawing,
  splitLegacyDrawingsArray,
  buildSeparatedDrawingsPayload,
} from "../../src/features/slate/utils/drawingSchema.js";
import {
  ANNOTATION_DRAW_SCOPE,
  MOTION_DRAW_SCOPE,
  scopeAllowsSnap,
  scopeAllowsContinuation,
  scopeAllowsText,
  scopeAllowsShape,
  scopeAllowsSubTool,
} from "../../src/canvas/drawingScopeConfig.js";

describe("getDrawingKind", () => {
  it("recognizes explicit kind field", () => {
    expect(getDrawingKind({ kind: "annotation", type: "stroke" })).toBe("annotation");
    expect(getDrawingKind({ kind: "motion", type: "stroke" })).toBe("motion");
  });

  it("treats legacy coaching-draw source as motion", () => {
    expect(
      getDrawingKind({
        type: "stroke",
        source: "coaching-draw",
        attachedPlayerId: "p1",
      })
    ).toBe("motion");
  });

  it("treats legacy attached drawings without source as motion", () => {
    expect(
      getDrawingKind({ type: "stroke", attachedPlayerId: "p1", stepStartMs: 0, stepEndMs: 1000 })
    ).toBe("motion");
  });

  it("treats untagged drawings as annotation", () => {
    expect(getDrawingKind({ type: "text", text: "hi" })).toBe("annotation");
    expect(getDrawingKind({ type: "stroke", points: [0, 0, 1, 1] })).toBe("annotation");
  });
});

describe("normalizeAnnotationDrawing", () => {
  it("strips motion-only fields", () => {
    const raw = {
      type: "stroke",
      points: [0, 0, 1, 1],
      source: "coaching-draw",
      attachedPlayerId: "p1",
      stepStartMs: 0,
      stepEndMs: 1000,
      stepIndex: 2,
      continuedFromDrawingId: "x",
    };
    const out = normalizeAnnotationDrawing(raw, 30000);
    expect(out.kind).toBe("annotation");
    expect(out).not.toHaveProperty("source");
    expect(out).not.toHaveProperty("attachedPlayerId");
    expect(out).not.toHaveProperty("stepStartMs");
    expect(out).not.toHaveProperty("stepEndMs");
    expect(out).not.toHaveProperty("stepIndex");
    expect(out).not.toHaveProperty("continuedFromDrawingId");
  });

  it("defaults visibility window to full duration when missing", () => {
    const out = normalizeAnnotationDrawing({ type: "text", text: "x" }, 12000);
    expect(out.visibleStartMs).toBe(0);
    expect(out.visibleEndMs).toBe(12000);
  });

  it("preserves explicit visibility window", () => {
    const out = normalizeAnnotationDrawing(
      { type: "stroke", visibleStartMs: 1000, visibleEndMs: 5000 },
      30000
    );
    expect(out.visibleStartMs).toBe(1000);
    expect(out.visibleEndMs).toBe(5000);
  });

  it("returns null for non-drawing values", () => {
    expect(normalizeAnnotationDrawing(null, 30000)).toBeNull();
    expect(normalizeAnnotationDrawing({}, 30000)).toBeNull();
  });
});

describe("normalizeMotionDrawing", () => {
  it("strips annotation-only fields", () => {
    const raw = {
      type: "stroke",
      attachedPlayerId: "p1",
      stepStartMs: 0,
      stepEndMs: 1000,
      visibleStartMs: 500,
      visibleEndMs: 800,
    };
    const out = normalizeMotionDrawing(raw, { playersById: { p1: {} } });
    expect(out.kind).toBe("motion");
    expect(out).not.toHaveProperty("visibleStartMs");
    expect(out).not.toHaveProperty("visibleEndMs");
  });

  it("upgrades attachedPlayerId to attachedEntityId + type", () => {
    const out = normalizeMotionDrawing(
      { type: "arrow", attachedPlayerId: "p1", points: [0, 0, 1, 1] },
      { playersById: { p1: {} }, ballsById: {} }
    );
    expect(out.attachedEntityId).toBe("p1");
    expect(out.attachedEntityType).toBe("player");
    expect(out).not.toHaveProperty("attachedPlayerId");
  });

  it("infers attachedEntityType=ball when entity is a ball", () => {
    const out = normalizeMotionDrawing(
      { type: "arrow", attachedPlayerId: "ball-1", points: [0, 0, 1, 1] },
      { playersById: {}, ballsById: { "ball-1": {} } }
    );
    expect(out.attachedEntityType).toBe("ball");
  });

  it("defaults attachedEntityType to player when entities are unknown", () => {
    const out = normalizeMotionDrawing(
      { type: "arrow", attachedPlayerId: "x", points: [0, 0, 1, 1] },
      undefined
    );
    expect(out.attachedEntityType).toBe("player");
  });

  it("returns null when no attached entity is present", () => {
    const out = normalizeMotionDrawing({ type: "stroke", points: [0, 0, 1, 1] }, {});
    expect(out).toBeNull();
  });

  it("renames continuedFromDrawingId to continuedFromMotionDrawingId", () => {
    const out = normalizeMotionDrawing(
      {
        type: "arrow",
        attachedPlayerId: "p1",
        continuedFromDrawingId: "drawing-3",
        points: [0, 0, 1, 1],
      },
      undefined
    );
    expect(out.continuedFromMotionDrawingId).toBe("drawing-3");
    expect(out).not.toHaveProperty("continuedFromDrawingId");
  });

  it("drops the legacy source field", () => {
    const out = normalizeMotionDrawing(
      { type: "stroke", source: "coaching-draw", attachedPlayerId: "p1", points: [0, 0, 1, 1] },
      undefined
    );
    expect(out).not.toHaveProperty("source");
  });
});

describe("splitLegacyDrawingsArray", () => {
  it("splits a legacy combined array by kind", () => {
    const legacy = [
      { type: "stroke", points: [0, 0, 1, 1] },
      {
        type: "stroke",
        source: "coaching-draw",
        attachedPlayerId: "p1",
        stepStartMs: 0,
        stepEndMs: 1000,
        points: [0, 0, 2, 2],
      },
      { type: "text", text: "hi" },
    ];
    const { annotationDrawings, motionDrawings } = splitLegacyDrawingsArray(
      legacy,
      { playersById: { p1: {} } },
      30000
    );
    expect(annotationDrawings).toHaveLength(2);
    expect(motionDrawings).toHaveLength(1);
    expect(motionDrawings[0].attachedEntityId).toBe("p1");
    expect(annotationDrawings.every((d) => d.kind === "annotation")).toBe(true);
    expect(motionDrawings.every((d) => d.kind === "motion")).toBe(true);
  });

  it("returns empty buckets for non-array input", () => {
    const result = splitLegacyDrawingsArray(undefined, undefined, 0);
    expect(result.annotationDrawings).toEqual([]);
    expect(result.motionDrawings).toEqual([]);
  });
});

describe("buildSeparatedDrawingsPayload", () => {
  it("normalizes both buckets defensively", () => {
    const out = buildSeparatedDrawingsPayload({
      annotationDrawings: [
        // Carrying motion-only fields by accident — must be scrubbed.
        { type: "stroke", points: [0, 0, 1, 1], attachedPlayerId: "p1", stepStartMs: 0 },
      ],
      motionDrawings: [
        // Carrying annotation-only fields by accident — must be scrubbed.
        { type: "arrow", attachedPlayerId: "p1", visibleStartMs: 1000, points: [0, 0, 1, 1] },
      ],
      entities: { playersById: { p1: {} } },
      durationMs: 30000,
    });
    expect(out.annotationDrawings[0]).not.toHaveProperty("attachedPlayerId");
    expect(out.annotationDrawings[0]).not.toHaveProperty("stepStartMs");
    expect(out.annotationDrawings[0].kind).toBe("annotation");
    expect(out.motionDrawings[0]).not.toHaveProperty("visibleStartMs");
    expect(out.motionDrawings[0].kind).toBe("motion");
  });
});

describe("scope capability matrix", () => {
  it("annotation scope forbids snap, continuation, chain-erase, and entity attachment", () => {
    expect(scopeAllowsSnap(ANNOTATION_DRAW_SCOPE)).toBe(false);
    expect(scopeAllowsContinuation(ANNOTATION_DRAW_SCOPE)).toBe(false);
    expect(ANNOTATION_DRAW_SCOPE.allowsChainErase).toBe(false);
    expect(ANNOTATION_DRAW_SCOPE.requiresEntityAttachment).toBe(false);
  });

  it("annotation scope allows text and shape sub-tools", () => {
    expect(scopeAllowsText(ANNOTATION_DRAW_SCOPE)).toBe(true);
    expect(scopeAllowsShape(ANNOTATION_DRAW_SCOPE)).toBe(true);
    expect(scopeAllowsSubTool(ANNOTATION_DRAW_SCOPE, "text")).toBe(true);
    expect(scopeAllowsSubTool(ANNOTATION_DRAW_SCOPE, "shape")).toBe(true);
  });

  it("motion scope requires entity attachment and forbids text/shape", () => {
    expect(scopeAllowsSnap(MOTION_DRAW_SCOPE)).toBe(true);
    expect(scopeAllowsContinuation(MOTION_DRAW_SCOPE)).toBe(true);
    expect(MOTION_DRAW_SCOPE.requiresEntityAttachment).toBe(true);
    expect(scopeAllowsText(MOTION_DRAW_SCOPE)).toBe(false);
    expect(scopeAllowsShape(MOTION_DRAW_SCOPE)).toBe(false);
    expect(scopeAllowsSubTool(MOTION_DRAW_SCOPE, "text")).toBe(false);
    expect(scopeAllowsSubTool(MOTION_DRAW_SCOPE, "shape")).toBe(false);
  });
});
