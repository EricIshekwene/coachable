/**
 * Tests for the Reflect Play feature in drawing mode.
 *
 * Background:
 *   Reflect Play flips every spatial element across the X-axis (y → -y) or
 *   Y-axis (x → -x). It used to flip only players, balls, and animation
 *   keyframes — strokes/arrows/text/shapes drawn in drawing mode stayed put,
 *   so the play came out half-mirrored. `flipDrawing` in drawingGeometry
 *   handles the geometry per drawing type.
 */
import { describe, it, expect } from "vitest";
import { flipDrawing, getDrawingWorldBounds } from "../../src/canvas/drawingGeometry.js";

describe("flipDrawing", () => {
  it("returns the input unchanged for invalid axis values", () => {
    const d = { id: "1", type: "stroke", points: [1, 2, 3, 4] };
    expect(flipDrawing(d, "z")).toEqual(d);
    expect(flipDrawing(null, "x")).toBeNull();
  });

  describe("stroke / arrow points", () => {
    it("negates y for x-axis flip, keeps x", () => {
      const d = { id: "1", type: "stroke", points: [10, 20, 30, 40, 50, 60] };
      const flipped = flipDrawing(d, "x");
      expect(flipped.points).toEqual([10, -20, 30, -40, 50, -60]);
    });

    it("negates x for y-axis flip, keeps y", () => {
      const d = { id: "1", type: "arrow", points: [10, 20, 30, 40] };
      const flipped = flipDrawing(d, "y");
      expect(flipped.points).toEqual([-10, 20, -30, 40]);
    });

    it("preserves stroke metadata (color, strokeWidth, source, step info)", () => {
      const d = {
        id: "1",
        type: "stroke",
        points: [0, 0, 5, 5],
        color: "#FF7A18",
        strokeWidth: 4,
        source: "coaching-draw",
        attachedPlayerId: "player-2",
        stepStartMs: 1000,
        stepEndMs: 2000,
        stepIndex: 0,
      };
      const flipped = flipDrawing(d, "y");
      expect(flipped.color).toBe("#FF7A18");
      expect(flipped.strokeWidth).toBe(4);
      expect(flipped.source).toBe("coaching-draw");
      expect(flipped.attachedPlayerId).toBe("player-2");
      expect(flipped.stepStartMs).toBe(1000);
      expect(flipped.stepEndMs).toBe(2000);
      expect(flipped.stepIndex).toBe(0);
    });
  });

  describe("text", () => {
    it("y-axis flip negates x and swaps left↔right alignment", () => {
      const d = { id: "1", type: "text", x: 50, y: 30, text: "hi", align: "left", fontSize: 18 };
      const flipped = flipDrawing(d, "y");
      expect(flipped.x).toBe(-50);
      expect(flipped.align).toBe("right");
      expect(flipped.y).toBe(30);
    });

    it("y-axis flip keeps center alignment as center", () => {
      const d = { id: "1", type: "text", x: 10, y: 0, text: "hi", align: "center", fontSize: 18 };
      const flipped = flipDrawing(d, "y");
      expect(flipped.align).toBe("center");
    });

    it("x-axis flip mirrors the visual bounding box vertically", () => {
      // For x-axis flip, text extending down from y is anchored so its bounding
      // box ends up at the mirrored location: new y = -y - height.
      const d = { id: "1", type: "text", x: 0, y: 50, text: "abc", fontSize: 20 };
      const originalBounds = getDrawingWorldBounds(d);
      const flipped = flipDrawing(d, "x");
      const flippedBounds = getDrawingWorldBounds(flipped);
      // The flipped top edge should equal the mirror of the original bottom edge.
      expect(flippedBounds.y).toBeCloseTo(-(originalBounds.y + originalBounds.height));
      // Height stays the same.
      expect(flippedBounds.height).toBeCloseTo(originalBounds.height);
    });

    it("negates rotation if present", () => {
      const d = { id: "1", type: "text", x: 0, y: 0, text: "x", rotation: 30 };
      expect(flipDrawing(d, "x").rotation).toBe(-30);
      expect(flipDrawing(d, "y").rotation).toBe(-30);
    });
  });

  describe("shape", () => {
    it("y-axis flip on rect mirrors anchor by width", () => {
      const d = { id: "1", type: "shape", shapeType: "rect", x: 10, y: 5, width: 20, height: 8 };
      const flipped = flipDrawing(d, "y");
      // Old bounds: x ∈ [10, 30]. Mirror: x ∈ [-30, -10]. New anchor = -30.
      expect(flipped.x).toBe(-30);
      expect(flipped.y).toBe(5);
      expect(flipped.width).toBe(20);
      expect(flipped.height).toBe(8);
    });

    it("x-axis flip on ellipse mirrors anchor by height", () => {
      const d = { id: "1", type: "shape", shapeType: "ellipse", x: 10, y: 5, width: 20, height: 8 };
      const flipped = flipDrawing(d, "x");
      // Old bounds: y ∈ [5, 13]. Mirror: y ∈ [-13, -5]. New anchor = -13.
      expect(flipped.y).toBe(-13);
      expect(flipped.x).toBe(10);
    });

    it("custom shape flips its points, not x/y", () => {
      const d = {
        id: "1",
        type: "shape",
        shapeType: "custom",
        x: 0,
        y: 0,
        points: [1, 2, 3, 4, 5, 6],
      };
      const flipped = flipDrawing(d, "y");
      expect(flipped.points).toEqual([-1, 2, -3, 4, -5, 6]);
    });

    it("negates rotation if present", () => {
      const d = { id: "1", type: "shape", shapeType: "rect", x: 0, y: 0, width: 1, height: 1, rotation: 45 };
      expect(flipDrawing(d, "x").rotation).toBe(-45);
      expect(flipDrawing(d, "y").rotation).toBe(-45);
    });
  });

  it("is its own inverse for stroke/arrow", () => {
    const d = { id: "1", type: "stroke", points: [3, 7, 11, -2, 5, 9] };
    const twice = flipDrawing(flipDrawing(d, "x"), "x");
    expect(twice.points).toEqual(d.points);
  });
});
