/**
 * In-browser test suite for drawingGeometry.js pure utility functions.
 */
import { buildSuite } from "../testRunner";
import {
  pointToSegmentDist,
  getDrawingWorldBounds,
  getSelectionBounds,
  rectsIntersect,
  hitTestDrawings,
  getResizeHandles,
  hitTestHandle,
  computeResizedBounds,
  applyTranslation,
  applyResize,
  applyRotation,
  getRotateHandlePosition,
  hitTestRotateHandle,
  getArrowEndpointHandles,
  hitTestEndpointHandle,
  getTrianglePoints,
  pointInPolygon,
} from "../../canvas/drawingGeometry";

export default buildSuite(({ describe, it, expect }) => {
  // ─── pointToSegmentDist ───────────────────────────────────────────────
  describe("pointToSegmentDist", () => {
    it("returns 0 when point is on segment", () => {
      expect(pointToSegmentDist(5, 0, 0, 0, 10, 0)).toBeCloseTo(0);
    }, "Checks that a point lying directly on a horizontal line segment returns distance 0. If this fails, the projection math or clamping logic in pointToSegmentDist is broken, which will cause all stroke/arrow hit-testing to mis-detect clicks.");

    it("returns distance to nearest endpoint outside segment", () => {
      expect(pointToSegmentDist(15, 0, 0, 0, 10, 0)).toBeCloseTo(5);
    }, "When a point is past the end of a segment, the distance should be to the nearest endpoint (not an infinite line projection). Failure means clicks near the tips of strokes/arrows won't register correctly.");

    it("returns perpendicular distance", () => {
      expect(pointToSegmentDist(5, 3, 0, 0, 10, 0)).toBeCloseTo(3);
    }, "A point 3 units above the midpoint of a horizontal segment should return exactly 3. This validates the perpendicular projection formula. Failure breaks tolerance-based hit-testing for all drawing types.");

    it("handles zero-length segment", () => {
      expect(pointToSegmentDist(3, 4, 0, 0, 0, 0)).toBeCloseTo(5);
    }, "When both segment endpoints are the same point (degenerate segment), distance should be the simple Euclidean distance. Failure could cause division-by-zero or NaN in hit-testing single-point strokes.");
  });

  // ─── getDrawingWorldBounds ────────────────────────────────────────────
  describe("getDrawingWorldBounds", () => {
    it("computes stroke bounds with padding", () => {
      const d = { type: "stroke", points: [0, 0, 100, 50], strokeWidth: 4 };
      const b = getDrawingWorldBounds(d);
      expect(b.x).toBe(-2);
      expect(b.y).toBe(-2);
      expect(b.width).toBe(104);
      expect(b.height).toBe(54);
    }, "Verifies that stroke bounding boxes expand by half the strokeWidth in each direction. If this fails, selection rectangles and marquee selection will be too tight around strokes, causing missed selections.");

    it("computes arrow bounds with padding", () => {
      const d = { type: "arrow", points: [10, 20, 50, 80], strokeWidth: 6 };
      const b = getDrawingWorldBounds(d);
      expect(b.x).toBe(7);
      expect(b.y).toBe(17);
      expect(b.width).toBe(46);
      expect(b.height).toBe(66);
    }, "Same as stroke bounds but for arrow drawings. Arrows use the same padding logic. Failure means arrow selections and resize handles will be positioned incorrectly.");

    it("computes shape rect bounds", () => {
      const d = { type: "shape", shapeType: "rect", x: 10, y: 20, width: 60, height: 40, strokeWidth: 4 };
      const b = getDrawingWorldBounds(d);
      expect(b.x).toBe(8);
      expect(b.y).toBe(18);
      expect(b.width).toBe(64);
      expect(b.height).toBe(44);
    }, "Rectangles use x/y/width/height plus strokeWidth padding. If this fails, shape selection and resize handles won't align with the visible shape on canvas.");

    it("returns zero bounds for stroke with no points", () => {
      const d = { type: "stroke", points: [] };
      const b = getDrawingWorldBounds(d);
      expect(b.width).toBe(0);
      expect(b.height).toBe(0);
    }, "Edge case: an empty stroke (no points drawn yet) should return zero-size bounds without crashing. Failure could cause errors when selecting or deleting partially-created drawings.");
  });

  // ─── getSelectionBounds ───────────────────────────────────────────────
  describe("getSelectionBounds", () => {
    const drawings = [
      { id: "a", type: "stroke", points: [0, 0, 100, 100], strokeWidth: 2 },
      { id: "b", type: "stroke", points: [200, 200, 300, 300], strokeWidth: 2 },
    ];
    it("returns null for empty selection", () => {
      expect(getSelectionBounds(drawings, [])).toBeNull();
    }, "When nothing is selected, getSelectionBounds should return null (not an empty rect). The UI uses this to decide whether to show resize handles. Failure would render phantom handles on screen.");

    it("returns single drawing bounds", () => {
      const b = getSelectionBounds(drawings, ["a"]);
      expect(b).not.toBeNull();
      expect(b.x).toBe(-1);
    }, "Selecting one drawing should return that drawing's bounds exactly. This is the base case for the selection overlay rectangle. If wrong, the blue selection outline will be offset from the actual drawing.");

    it("returns union bounds for multiple", () => {
      const b = getSelectionBounds(drawings, ["a", "b"]);
      expect(b.x).toBe(-1);
      expect(b.y).toBe(-1);
    }, "Multi-select should return the union (enclosing) rectangle of all selected drawings. Failure means the group resize handles won't encompass all selected items, causing broken group resize/rotate.");
  });

  // ─── rectsIntersect ───────────────────────────────────────────────────
  describe("rectsIntersect", () => {
    it("true for overlapping", () => {
      expect(rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: 5, width: 10, height: 10 }
      )).toBe(true);
    }, "Two rectangles that overlap partially should return true. This is the core of marquee selection — determining which drawings fall inside the drag rectangle. Failure breaks marquee select entirely.");

    it("false for disjoint", () => {
      expect(rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 }
      )).toBe(false);
    }, "Non-touching rectangles must return false. If this returns true incorrectly, marquee selection will pick up drawings that aren't inside the selection area.");

    it("true for contained rect", () => {
      expect(rectsIntersect(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 10, y: 10, width: 5, height: 5 }
      )).toBe(true);
    }, "A small rectangle fully inside a larger one should count as intersecting. Failure means small drawings inside a large marquee drag won't get selected.");

    it("true for touching edges", () => {
      expect(rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 10, y: 0, width: 10, height: 10 }
      )).toBe(true);
    }, "Edge-touching rectangles should intersect (inclusive boundary). This ensures drawings at the exact edge of a marquee selection get included rather than missed by 1px.");
  });

  // ─── hitTestDrawings ──────────────────────────────────────────────────
  describe("hitTestDrawings", () => {
    const drawings = [
      { id: "s1", type: "stroke", points: [0, 0, 100, 0], strokeWidth: 4 },
      { id: "s2", type: "stroke", points: [0, 0, 0, 100], strokeWidth: 4 },
    ];
    it("returns topmost drawing", () => {
      expect(hitTestDrawings(drawings, { x: 0, y: 0 }, 5)).toBe("s2");
    }, "When two drawings overlap, clicking should select the one on top (last in array = highest z-order). Failure means you'd always select the bottom drawing, making it impossible to click on overlapping drawings.");

    it("returns null when nothing hit", () => {
      expect(hitTestDrawings(drawings, { x: 500, y: 500 }, 5)).toBeNull();
    }, "Clicking empty canvas space should return null (no drawing hit). If this fails, random clicks would select drawings they shouldn't, causing confusing selection behavior.");

    it("respects skipIds", () => {
      expect(hitTestDrawings(drawings, { x: 0, y: 0 }, 5, new Set(["s2"]))).toBe("s1");
    }, "skipIds allows ignoring certain drawings during hit-test (used when dragging one drawing over another). Failure would make it impossible to 'click through' the currently dragged drawing.");
  });

  // ─── getResizeHandles / hitTestHandle ─────────────────────────────────
  describe("getResizeHandles", () => {
    it("returns 8 handles", () => {
      const handles = getResizeHandles({ x: 0, y: 0, width: 100, height: 100 }, 10);
      expect(handles).toHaveLength(8);
    }, "Every selection box needs exactly 8 resize handles (4 corners + 4 edges: nw, n, ne, e, se, s, sw, w). If this returns fewer, some resize directions won't work.");

    it("NW handle centered on corner", () => {
      const handles = getResizeHandles({ x: 0, y: 0, width: 100, height: 100 }, 10);
      const nw = handles.find((h) => h.position === "nw");
      expect(nw.x).toBe(-5);
      expect(nw.y).toBe(-5);
    }, "Handles should be centered on their anchor point (offset by half the handle size). If the positioning is off, the visual handle squares won't line up with the selection corners, causing a misaligned resize experience.");
  });

  describe("hitTestHandle", () => {
    it("detects hit on NW handle", () => {
      const handles = getResizeHandles({ x: 0, y: 0, width: 100, height: 100 }, 10);
      expect(hitTestHandle(handles, { x: 0, y: 0 })).toBe("nw");
    }, "Clicking the top-left corner of a selection should detect the NW resize handle. This is how the cursor changes to the resize icon and resize begins. Failure means resize from that corner won't work.");

    it("returns null for center miss", () => {
      const handles = getResizeHandles({ x: 0, y: 0, width: 100, height: 100 }, 10);
      expect(hitTestHandle(handles, { x: 50, y: 50 })).toBeNull();
    }, "Clicking the center of a selection (away from handles) should not trigger resize. If this returns a handle, clicking to drag/move a selection would accidentally trigger resize instead.");
  });

  // ─── computeResizedBounds ─────────────────────────────────────────────
  describe("computeResizedBounds", () => {
    const start = { x: 0, y: 0, width: 100, height: 100 };
    it("SE corner resize", () => {
      const r = computeResizedBounds("se", start, { dx: 20, dy: 30 });
      expect(r.width).toBe(120);
      expect(r.height).toBe(130);
    }, "Dragging the SE (bottom-right) handle right and down should increase width and height. This is the most common resize gesture. Failure means basic resize is broken.");

    it("NW corner resize", () => {
      const r = computeResizedBounds("nw", start, { dx: 10, dy: 10 });
      expect(r.x).toBe(10);
      expect(r.y).toBe(10);
      expect(r.width).toBe(90);
      expect(r.height).toBe(90);
    }, "Dragging the NW (top-left) handle inward should move the origin AND shrink the size. This is tricky because both position and dimensions change. Failure causes the shape to jump or resize in the wrong direction.");

    it("enforces minimum size", () => {
      const r = computeResizedBounds("se", start, { dx: -200, dy: -200 });
      expect(r.width).toBe(4);
      expect(r.height).toBe(4);
    }, "Drawings can't be resized smaller than 4x4 pixels. Without this minimum, drawings could become invisible (0 width/height) or flip inside-out (negative dimensions), causing rendering glitches.");

    it("center resize with alt", () => {
      const r = computeResizedBounds("se", start, { dx: 20, dy: 20 }, { altKey: true });
      expect(r.x + r.width / 2).toBeCloseTo(50);
      expect(r.y + r.height / 2).toBeCloseTo(50);
    }, "Holding Alt during resize should resize symmetrically around the center (the center point stays fixed). Failure means the Alt+resize shortcut won't work, and the shape will drift during alt-resize.");
  });

  // ─── applyTranslation ────────────────────────────────────────────────
  describe("applyTranslation", () => {
    it("offsets stroke points", () => {
      const drawings = [{ id: "s1", type: "stroke", points: [10, 20, 30, 40] }];
      const changes = applyTranslation(drawings, ["s1"], 5, -5);
      expect(changes.get("s1").points).toEqual([15, 15, 35, 35]);
    }, "Moving a stroke adds the delta to every point in the points array. If this math is wrong, dragging strokes will move them to the wrong position or distort their shape.");

    it("offsets text position", () => {
      const drawings = [{ id: "t1", type: "text", x: 100, y: 200 }];
      const changes = applyTranslation(drawings, ["t1"], -10, 20);
      expect(changes.get("t1")).toEqual({ x: 90, y: 220 });
    }, "Text drawings use x/y position (not points array). Translation should add delta to x and y. Failure means text labels won't move when dragged.");

    it("ignores unselected", () => {
      const drawings = [
        { id: "s1", type: "stroke", points: [0, 0, 10, 10] },
        { id: "s2", type: "stroke", points: [0, 0, 10, 10] },
      ];
      const changes = applyTranslation(drawings, ["s1"], 5, 5);
      expect(changes.has("s1")).toBe(true);
      expect(changes.has("s2")).toBe(false);
    }, "Only selected drawings should be moved. If unselected drawings are also moved, dragging one drawing would move everything on the canvas.");
  });

  // ─── applyResize ─────────────────────────────────────────────────────
  describe("applyResize", () => {
    it("scales stroke points 2x", () => {
      const drawings = [{ id: "s1", type: "stroke", points: [0, 0, 100, 100], strokeWidth: 2 }];
      const changes = applyResize(drawings, ["s1"],
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 0, y: 0, width: 200, height: 200 }
      );
      expect(changes.get("s1").points).toEqual([0, 0, 200, 200]);
    }, "Doubling the selection bounds should double all stroke point coordinates. This is proportional scaling — every point moves relative to the selection origin. Failure causes distorted or incorrectly positioned strokes after resize.");

    it("scales text fontSize", () => {
      const drawings = [{ id: "t1", type: "text", x: 50, y: 50, fontSize: 18 }];
      const changes = applyResize(drawings, ["t1"],
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 0, y: 0, width: 200, height: 200 }
      );
      expect(changes.get("t1").fontSize).toBe(36);
    }, "When resizing a group containing text, the font size should scale proportionally. Without this, text would stay the same size while everything else grows, breaking the visual layout.");

    it("enforces min fontSize 8", () => {
      const drawings = [{ id: "t1", type: "text", x: 50, y: 50, fontSize: 18 }];
      const changes = applyResize(drawings, ["t1"],
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 0, y: 0, width: 10, height: 10 }
      );
      expect(changes.get("t1").fontSize).toBe(8);
    }, "Font size can't go below 8px to keep text readable. Without this floor, shrinking a group too much would make text invisible or cause rendering issues with tiny font sizes.");
  });

  // ─── applyRotation ───────────────────────────────────────────────────
  describe("applyRotation", () => {
    it("rotates stroke 90 degrees", () => {
      const drawings = [{ id: "s1", type: "stroke", points: [100, 0, 100, 100] }];
      const changes = applyRotation(drawings, ["s1"], { x: 0, y: 0 }, Math.PI / 2);
      const pts = changes.get("s1").points;
      expect(pts[0]).toBeCloseTo(0);
      expect(pts[1]).toBeCloseTo(100);
    }, "A 90-degree rotation around the origin should transform (100,0) to (0,100). This validates the core rotation matrix math (cos/sin). If this is wrong, all group rotations will produce incorrect positions.");

    it("sets rotation on text", () => {
      const drawings = [{ id: "t1", type: "text", x: 10, y: 0, rotation: 0 }];
      const changes = applyRotation(drawings, ["t1"], { x: 0, y: 0 }, Math.PI / 4);
      expect(changes.get("t1").rotation).toBeCloseTo(45);
    }, "Text rotation is stored as a 'rotation' property in degrees (not radians). The function must convert radians to degrees and add to existing rotation. Failure means text won't visually rotate when part of a group rotation.");
  });

  // ─── Triangle / Polygon ──────────────────────────────────────────────
  describe("getTrianglePoints", () => {
    it("returns 6 values for top-center, bottom-left, bottom-right", () => {
      const pts = getTrianglePoints({ x: 0, y: 0, width: 100, height: 80 });
      expect(pts).toHaveLength(6);
      expect(pts[0]).toBe(50);
      expect(pts[1]).toBe(0);
    }, "Triangle shapes are defined by 3 vertices derived from a bounding box: top-center, bottom-left, bottom-right. If vertices are wrong, the triangle will render incorrectly and hit-testing will fail for triangle shapes.");
  });

  describe("pointInPolygon", () => {
    it("detects point inside triangle", () => {
      const tri = [50, 0, 0, 100, 100, 100];
      expect(pointInPolygon(50, 50, tri, 0)).toBe(true);
    }, "Uses ray-casting algorithm to test if a point is inside a polygon. The center of this triangle should be 'inside'. Failure means clicking on filled triangle/custom shapes won't select them.");

    it("detects point outside triangle", () => {
      const tri = [50, 0, 0, 100, 100, 100];
      expect(pointInPolygon(200, 200, tri, 0)).toBe(false);
    }, "A point far outside the triangle must return false. If this returns true incorrectly, clicking empty space near triangle shapes would falsely select them.");
  });

  // ─── Rotate handle ───────────────────────────────────────────────────
  describe("getRotateHandlePosition", () => {
    it("positions above top-center", () => {
      const pos = getRotateHandlePosition({ x: 0, y: 0, width: 100, height: 100 }, 1);
      expect(pos.x).toBe(50);
      expect(pos.y).toBeLessThan(0);
    }, "The rotate handle appears as a small circle above the selection box. It should be horizontally centered and vertically above the top edge. If positioned wrong, the rotate handle won't appear where expected.");

    it("returns null for null bounds", () => {
      expect(getRotateHandlePosition(null, 1)).toBeNull();
    }, "When nothing is selected (null bounds), no rotate handle should be shown. Failure would cause a crash trying to read properties of null.");
  });

  describe("hitTestRotateHandle", () => {
    it("hit within radius", () => {
      expect(hitTestRotateHandle({ x: 50, y: -24 }, { x: 50, y: -24 }, 1)).toBe(true);
    }, "Clicking exactly on the rotate handle should register as a hit. This is how the cursor changes to the rotate icon. Failure means the rotate gesture can never be initiated.");

    it("miss outside radius", () => {
      expect(hitTestRotateHandle({ x: 50, y: -24 }, { x: 50, y: 0 }, 1)).toBe(false);
    }, "Clicking 24px away from the rotate handle should miss. If this returns true, clicking near (but not on) the handle would trigger rotation instead of the intended action.");
  });

  // ─── Arrow endpoints ─────────────────────────────────────────────────
  describe("getArrowEndpointHandles", () => {
    it("returns 2 handles for arrow", () => {
      const handles = getArrowEndpointHandles({ type: "arrow", points: [10, 20, 100, 80] }, 10);
      expect(handles).toHaveLength(2);
      expect(handles[0].position).toBe("start");
      expect(handles[1].position).toBe("end");
    }, "Arrow drawings have draggable start and end points. This function creates handle descriptors for both endpoints. Missing handles means you can't adjust arrow endpoints after placing them.");

    it("returns empty for non-arrow", () => {
      expect(getArrowEndpointHandles({ type: "stroke", points: [0, 0, 10, 10] }, 10)).toEqual([]);
    }, "Only arrows have endpoint handles — strokes don't. If this returns handles for strokes, non-arrow drawings would show phantom drag handles.");
  });

  describe("hitTestEndpointHandle", () => {
    const handles = getArrowEndpointHandles({ type: "arrow", points: [10, 20, 100, 80] }, 10);
    it("hit start handle", () => {
      expect(hitTestEndpointHandle(handles, { x: 10, y: 20 })).toBe("start");
    }, "Clicking the arrow's start point should return 'start'. This tells the drag handler which end to move. Failure means you can't reposition the tail of an arrow.");

    it("hit end handle", () => {
      expect(hitTestEndpointHandle(handles, { x: 100, y: 80 })).toBe("end");
    }, "Clicking the arrow's end point should return 'end'. Failure means you can't reposition the head of an arrow.");

    it("miss returns null", () => {
      expect(hitTestEndpointHandle(handles, { x: 50, y: 50 })).toBeNull();
    }, "Clicking the middle of the arrow shaft (between endpoints) should not trigger endpoint editing. If this falsely returns a handle, clicking to select the arrow would accidentally start an endpoint drag.");
  });
});
