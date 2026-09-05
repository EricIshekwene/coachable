/**
 * Tests for the onboarding-tour click-trap geometry
 * (blockerPanels in src/components/tutorial/tutorialOverlayLogic.js):
 * the four transparent panels must tile the full viewport minus exactly the
 * padded spotlight hole (driver.js-style screen blocker), clamp to the
 * viewport when the target touches an edge (never negative dimensions), and
 * collapse to a single full-screen panel when there is no target rect.
 */
import { describe, it, expect } from "vitest";
import { blockerPanels } from "../../src/components/tutorial/tutorialOverlayLogic.js";

const VW = 1000;
const VH = 800;
const PAD = 8;

/** Sum of panel areas. */
function totalArea(panels) {
  return panels.reduce((sum, p) => sum + p.width * p.height, 0);
}

/** True when the point (x, y) is covered by at least one panel. */
function covered(panels, x, y) {
  return panels.some(
    (p) => x >= p.left && x < p.left + p.width && y >= p.top && y < p.top + p.height
  );
}

describe("blockerPanels â€” interior target (four panels around the padded hole)", () => {
  const rect = { top: 100, left: 200, width: 50, height: 40 };
  const panels = blockerPanels(rect, PAD, VW, VH);
  const holeTop = rect.top - PAD; // 92
  const holeLeft = rect.left - PAD; // 192
  const holeBottom = rect.top + rect.height + PAD; // 148
  const holeRight = rect.left + rect.width + PAD; // 258

  it("returns exactly 4 panels", () => {
    expect(panels).toHaveLength(4);
  });

  it("top panel spans the full width and ends exactly at rect.top - pad", () => {
    expect(panels[0]).toEqual({ top: 0, left: 0, width: VW, height: holeTop });
  });

  it("bottom panel starts exactly at rect.bottom + pad and reaches the viewport bottom", () => {
    expect(panels[1]).toEqual({ top: holeBottom, left: 0, width: VW, height: VH - holeBottom });
  });

  it("left panel fills the hole-height band and ends exactly at rect.left - pad", () => {
    expect(panels[2]).toEqual({ top: holeTop, left: 0, width: holeLeft, height: holeBottom - holeTop });
  });

  it("right panel starts exactly at rect.right + pad and reaches the viewport right edge", () => {
    expect(panels[3]).toEqual({ top: holeTop, left: holeRight, width: VW - holeRight, height: holeBottom - holeTop });
  });

  it("panel areas sum to viewport area minus the padded hole area (tiling, no overlap, no gaps)", () => {
    const holeArea = (holeRight - holeLeft) * (holeBottom - holeTop);
    expect(totalArea(panels)).toBe(VW * VH - holeArea);
  });

  it("covers points just outside every hole edge but no point inside the hole", () => {
    // Just outside each edge of the padded hole â†’ blocked.
    expect(covered(panels, holeLeft - 1, rect.top)).toBe(true);
    expect(covered(panels, holeRight, rect.top)).toBe(true);
    expect(covered(panels, rect.left, holeTop - 1)).toBe(true);
    expect(covered(panels, rect.left, holeBottom)).toBe(true);
    // Corners of the viewport â†’ blocked.
    expect(covered(panels, 0, 0)).toBe(true);
    expect(covered(panels, VW - 1, VH - 1)).toBe(true);
    // Inside the hole (center and just inside each padded edge) â†’ clickable.
    expect(covered(panels, rect.left + rect.width / 2, rect.top + rect.height / 2)).toBe(false);
    expect(covered(panels, holeLeft, holeTop)).toBe(false);
    expect(covered(panels, holeRight - 1, holeBottom - 1)).toBe(false);
  });
});

describe("blockerPanels â€” clamping at viewport edges (never negative dimensions)", () => {
  it("target flush against the top-left corner: top/left panels collapse to zero, nothing negative", () => {
    const panels = blockerPanels({ top: 0, left: 0, width: 100, height: 50 }, PAD, VW, VH);
    expect(panels).toHaveLength(4);
    for (const p of panels) {
      expect(p.width).toBeGreaterThanOrEqual(0);
      expect(p.height).toBeGreaterThanOrEqual(0);
      expect(p.top).toBeGreaterThanOrEqual(0);
      expect(p.left).toBeGreaterThanOrEqual(0);
    }
    // Pad pushes the hole past the top/left viewport edges â†’ those panels are empty.
    expect(panels[0].height).toBe(0); // above
    expect(panels[2].width).toBe(0); // left
    // Below/right still block, starting at the clamped hole edges.
    expect(panels[1]).toEqual({ top: 58, left: 0, width: VW, height: VH - 58 });
    expect(panels[3]).toEqual({ top: 0, left: 108, width: VW - 108, height: 58 });
  });

  it("target flush against the bottom-right corner: bottom/right panels collapse to zero, nothing negative", () => {
    const rect = { top: VH - 50, left: VW - 100, width: 100, height: 50 };
    const panels = blockerPanels(rect, PAD, VW, VH);
    for (const p of panels) {
      expect(p.width).toBeGreaterThanOrEqual(0);
      expect(p.height).toBeGreaterThanOrEqual(0);
    }
    expect(panels[1].height).toBe(0); // below (hole bottom clamped to VH)
    expect(panels[3].width).toBe(0); // right (hole right clamped to VW)
    // Above/left still block up to the padded hole edges.
    expect(panels[0].height).toBe(VH - 50 - PAD);
    expect(panels[2].width).toBe(VW - 100 - PAD);
  });

  it("target larger than the viewport: every panel is empty (nothing negative), hole spans the whole screen", () => {
    const panels = blockerPanels({ top: -20, left: -20, width: VW + 40, height: VH + 40 }, PAD, VW, VH);
    for (const p of panels) {
      expect(p.width).toBeGreaterThanOrEqual(0);
      expect(p.height).toBeGreaterThanOrEqual(0);
    }
    expect(totalArea(panels)).toBe(0);
  });

  it("target entirely off-screen past the bottom-right: panels still have non-negative dimensions and cover the full viewport", () => {
    const panels = blockerPanels({ top: VH + 100, left: VW + 100, width: 50, height: 50 }, PAD, VW, VH);
    for (const p of panels) {
      expect(p.width).toBeGreaterThanOrEqual(0);
      expect(p.height).toBeGreaterThanOrEqual(0);
    }
    // Hole is clamped to a zero-area sliver at the viewport edge â†’ everything blocked.
    expect(totalArea(panels)).toBe(VW * VH);
  });
});

describe("blockerPanels â€” no target rect", () => {
  it("returns a single full-screen panel for null rect", () => {
    expect(blockerPanels(null, PAD, VW, VH)).toEqual([
      { top: 0, left: 0, width: VW, height: VH },
    ]);
  });

  it("returns a single full-screen panel for undefined rect", () => {
    expect(blockerPanels(undefined, PAD, VW, VH)).toEqual([
      { top: 0, left: 0, width: VW, height: VH },
    ]);
  });
});
