import { describe, it, expect } from "vitest";
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
} from "../drawingGeometry";

// ─── pointToSegmentDist ─────────────────────────────────────────────────────

describe("pointToSegmentDist", () => {
  it("returns 0 when point is on segment", () => {
    expect(pointToSegmentDist(5, 0, 0, 0, 10, 0)).toBeCloseTo(0);
  });

  it("returns distance to nearest endpoint when projection is outside segment", () => {
    expect(pointToSegmentDist(15, 0, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it("returns perpendicular distance to segment", () => {
    expect(pointToSegmentDist(5, 3, 0, 0, 10, 0)).toBeCloseTo(3);
  });

  it("handles zero-length segment", () => {
    expect(pointToSegmentDist(3, 4, 0, 0, 0, 0)).toBeCloseTo(5);
  });
});

// ─── getDrawingWorldBounds ──────────────────────────────────────────────────

describe("getDrawingWorldBounds", () => {
  it("computes stroke bounds with padding", () => {
    const d = { type: "stroke", points: [0, 0, 100, 50], strokeWidth: 4 };
    const b = getDrawingWorldBounds(d);
    expect(b.x).toBe(-2); // 0 - 4/2
    expect(b.y).toBe(-2);
    expect(b.width).toBe(104); // 100 + 4
    expect(b.height).toBe(54);
  });

  it("computes arrow bounds with padding", () => {
    const d = { type: "arrow", points: [10, 20, 50, 80], strokeWidth: 6 };
    const b = getDrawingWorldBounds(d);
    expect(b.x).toBe(7); // 10 - 3
    expect(b.y).toBe(17);
    expect(b.width).toBe(46); // 40 + 6
    expect(b.height).toBe(66);
  });

  it("computes text bounds", () => {
    const d = { type: "text", x: 10, y: 30, text: "Hello", fontSize: 20 };
    const b = getDrawingWorldBounds(d);
    expect(b.x).toBe(10);
    expect(b.y).toBeCloseTo(30 - 20 * 1.3);
    expect(b.width).toBeCloseTo(5 * 20 * 0.6);
    expect(b.height).toBeCloseTo(20 * 1.3);
  });

  it("handles text with no text content", () => {
    const d = { type: "text", x: 0, y: 0, text: "", fontSize: 18 };
    const b = getDrawingWorldBounds(d);
    expect(b.width).toBeCloseTo(1 * 18 * 0.6);
  });
});

// ─── getSelectionBounds ─────────────────────────────────────────────────────

describe("getSelectionBounds", () => {
  const drawings = [
    { id: "a", type: "stroke", points: [0, 0, 100, 100], strokeWidth: 2 },
    { id: "b", type: "stroke", points: [200, 200, 300, 300], strokeWidth: 2 },
  ];

  it("returns null for empty selection", () => {
    expect(getSelectionBounds(drawings, [])).toBeNull();
  });

  it("returns single drawing bounds for one selection", () => {
    const b = getSelectionBounds(drawings, ["a"]);
    expect(b).not.toBeNull();
    expect(b.x).toBe(-1);
    expect(b.y).toBe(-1);
  });

  it("returns union bounds for multiple selections", () => {
    const b = getSelectionBounds(drawings, ["a", "b"]);
    expect(b.x).toBe(-1);
    expect(b.y).toBe(-1);
    expect(b.x + b.width).toBe(301);
    expect(b.y + b.height).toBe(301);
  });
});

// ─── rectsIntersect ─────────────────────────────────────────────────────────

describe("rectsIntersect", () => {
  it("returns true for overlapping rects", () => {
    expect(rectsIntersect(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 5, y: 5, width: 10, height: 10 }
    )).toBe(true);
  });

  it("returns false for disjoint rects", () => {
    expect(rectsIntersect(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 20, width: 10, height: 10 }
    )).toBe(false);
  });

  it("returns true for contained rect", () => {
    expect(rectsIntersect(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 10, y: 10, width: 5, height: 5 }
    )).toBe(true);
  });

  it("returns true for touching edges", () => {
    expect(rectsIntersect(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 10, y: 0, width: 10, height: 10 }
    )).toBe(true);
  });
});

// ─── hitTestDrawings ────────────────────────────────────────────────────────

describe("hitTestDrawings", () => {
  const drawings = [
    { id: "s1", type: "stroke", points: [0, 0, 100, 0], strokeWidth: 4 },
    { id: "s2", type: "stroke", points: [0, 0, 0, 100], strokeWidth: 4 },
    { id: "t1", type: "text", x: 200, y: 220, text: "Test", fontSize: 18 },
  ];

  it("returns topmost drawing (last in array)", () => {
    // s2 is on top of s1 at origin
    const hit = hitTestDrawings(drawings, { x: 0, y: 0 }, 5);
    expect(hit).toBe("s2");
  });

  it("returns null when nothing hit", () => {
    const hit = hitTestDrawings(drawings, { x: 500, y: 500 }, 5);
    expect(hit).toBeNull();
  });

  it("hits text by AABB", () => {
    const hit = hitTestDrawings(drawings, { x: 205, y: 215 }, 5);
    expect(hit).toBe("t1");
  });

  it("respects skipIds", () => {
    const hit = hitTestDrawings(drawings, { x: 0, y: 0 }, 5, new Set(["s2"]));
    expect(hit).toBe("s1");
  });
});

// ─── getResizeHandles / hitTestHandle ───────────────────────────────────────

describe("getResizeHandles", () => {
  it("returns 8 handles", () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    const handles = getResizeHandles(bounds, 10);
    expect(handles.length).toBe(8);
    expect(handles.map((h) => h.position)).toEqual(["nw", "n", "ne", "e", "se", "s", "sw", "w"]);
  });

  it("handles are centered on their anchor points", () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    const handles = getResizeHandles(bounds, 10);
    // NW handle should be at (-5, -5) with size 10x10
    const nw = handles.find((h) => h.position === "nw");
    expect(nw.x).toBe(-5);
    expect(nw.y).toBe(-5);
    expect(nw.width).toBe(10);
    expect(nw.height).toBe(10);
  });
});

describe("hitTestHandle", () => {
  it("detects hit on handle", () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    const handles = getResizeHandles(bounds, 10);
    expect(hitTestHandle(handles, { x: 0, y: 0 })).toBe("nw");
  });

  it("returns null when missing", () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    const handles = getResizeHandles(bounds, 10);
    expect(hitTestHandle(handles, { x: 50, y: 50 })).toBeNull();
  });
});

// ─── computeResizedBounds ───────────────────────────────────────────────────

describe("computeResizedBounds", () => {
  const startBounds = { x: 0, y: 0, width: 100, height: 100 };

  it("resizes SE corner correctly", () => {
    const result = computeResizedBounds("se", startBounds, { dx: 20, dy: 30 });
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.width).toBe(120);
    expect(result.height).toBe(130);
  });

  it("resizes NW corner correctly", () => {
    const result = computeResizedBounds("nw", startBounds, { dx: 10, dy: 10 });
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    expect(result.width).toBe(90);
    expect(result.height).toBe(90);
  });

  it("resizes E edge correctly", () => {
    const result = computeResizedBounds("e", startBounds, { dx: 50, dy: 999 });
    expect(result.width).toBe(150);
    expect(result.height).toBe(100);
  });

  it("enforces minimum size", () => {
    const result = computeResizedBounds("se", startBounds, { dx: -200, dy: -200 });
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it("locks aspect ratio with shift", () => {
    const result = computeResizedBounds("se", startBounds, { dx: 50, dy: 0 }, { shiftKey: true });
    // With aspect ratio 1:1, both dimensions should match
    expect(result.width).toBeCloseTo(result.height, 0);
  });

  it("resizes from center with alt", () => {
    const result = computeResizedBounds("se", startBounds, { dx: 20, dy: 20 }, { altKey: true });
    // Center should stay at (50, 50)
    expect(result.x + result.width / 2).toBeCloseTo(50);
    expect(result.y + result.height / 2).toBeCloseTo(50);
  });
});

// ─── applyTranslation ───────────────────────────────────────────────────────

describe("applyTranslation", () => {
  it("offsets stroke points", () => {
    const drawings = [{ id: "s1", type: "stroke", points: [10, 20, 30, 40] }];
    const changes = applyTranslation(drawings, ["s1"], 5, -5);
    expect(changes.get("s1").points).toEqual([15, 15, 35, 35]);
  });

  it("offsets text position", () => {
    const drawings = [{ id: "t1", type: "text", x: 100, y: 200 }];
    const changes = applyTranslation(drawings, ["t1"], -10, 20);
    expect(changes.get("t1")).toEqual({ x: 90, y: 220 });
  });

  it("ignores unselected drawings", () => {
    const drawings = [
      { id: "s1", type: "stroke", points: [0, 0, 10, 10] },
      { id: "s2", type: "stroke", points: [0, 0, 10, 10] },
    ];
    const changes = applyTranslation(drawings, ["s1"], 5, 5);
    expect(changes.has("s1")).toBe(true);
    expect(changes.has("s2")).toBe(false);
  });
});

// ─── applyResize ────────────────────────────────────────────────────────────

describe("applyResize", () => {
  it("scales stroke points proportionally", () => {
    const drawings = [{ id: "s1", type: "stroke", points: [0, 0, 100, 100], strokeWidth: 2 }];
    const oldBounds = { x: 0, y: 0, width: 100, height: 100 };
    const newBounds = { x: 0, y: 0, width: 200, height: 200 };
    const changes = applyResize(drawings, ["s1"], oldBounds, newBounds);
    expect(changes.get("s1").points).toEqual([0, 0, 200, 200]);
  });

  it("scales text position and fontSize", () => {
    const drawings = [{ id: "t1", type: "text", x: 50, y: 50, fontSize: 18 }];
    const oldBounds = { x: 0, y: 0, width: 100, height: 100 };
    const newBounds = { x: 0, y: 0, width: 200, height: 200 };
    const changes = applyResize(drawings, ["t1"], oldBounds, newBounds);
    expect(changes.get("t1").x).toBe(100);
    expect(changes.get("t1").y).toBe(100);
    expect(changes.get("t1").fontSize).toBe(36);
  });

  it("enforces minimum fontSize of 8", () => {
    const drawings = [{ id: "t1", type: "text", x: 50, y: 50, fontSize: 18 }];
    const oldBounds = { x: 0, y: 0, width: 100, height: 100 };
    const newBounds = { x: 0, y: 0, width: 10, height: 10 };
    const changes = applyResize(drawings, ["t1"], oldBounds, newBounds);
    expect(changes.get("t1").fontSize).toBe(8);
  });
});

// ─── applyRotation ──────────────────────────────────────────────────────────

describe("applyRotation", () => {
  it("rotates stroke points 90 degrees", () => {
    const drawings = [{ id: "s1", type: "stroke", points: [100, 0, 100, 100] }];
    const center = { x: 0, y: 0 };
    const angle = Math.PI / 2; // 90 degrees
    const changes = applyRotation(drawings, ["s1"], center, angle);
    const pts = changes.get("s1").points;
    expect(pts[0]).toBeCloseTo(0);
    expect(pts[1]).toBeCloseTo(100);
    expect(pts[2]).toBeCloseTo(-100);
    expect(pts[3]).toBeCloseTo(100);
  });

  it("adds rotation field to text drawings", () => {
    const drawings = [{ id: "t1", type: "text", x: 10, y: 0, rotation: 0 }];
    const center = { x: 0, y: 0 };
    const angle = Math.PI / 4; // 45 degrees
    const changes = applyRotation(drawings, ["t1"], center, angle);
    expect(changes.get("t1").rotation).toBeCloseTo(45);
  });
});

// ─── Rotate handle ──────────────────────────────────────────────────────────

describe("getRotateHandlePosition", () => {
  it("positions above top-center", () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    const pos = getRotateHandlePosition(bounds, 1);
    expect(pos.x).toBe(50);
    expect(pos.y).toBeLessThan(0);
  });

  it("returns null for null bounds", () => {
    expect(getRotateHandlePosition(null, 1)).toBeNull();
  });
});

describe("hitTestRotateHandle", () => {
  it("detects hit within radius", () => {
    const pos = { x: 50, y: -24 };
    expect(hitTestRotateHandle(pos, { x: 50, y: -24 }, 1)).toBe(true);
    expect(hitTestRotateHandle(pos, { x: 50, y: -20 }, 1)).toBe(true);
  });

  it("misses outside radius", () => {
    const pos = { x: 50, y: -24 };
    expect(hitTestRotateHandle(pos, { x: 50, y: 0 }, 1)).toBe(false);
  });
});
