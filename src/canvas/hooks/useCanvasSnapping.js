import Konva from "konva";

/**
 * useCanvasSnapping
 *
 * Pure snapping math + imperative guide-line drawing helpers for the Konva
 * guidesLayer.
 *
 * Snap sources: world origin (0,0), viewport center, field image center,
 * and the center of every other item on the canvas.
 *
 * Returns a bag of functions — no React state involved.
 */
export function useCanvasSnapping({ guidesLayerRef, size, worldOrigin, fieldBounds }) {
  /** Remove all guide lines from the guides layer. */
  const clearGuides = () => {
    const layer = guidesLayerRef.current;
    if (!layer) return;
    layer.destroyChildren();
    layer.batchDraw();
  };

  /** Draw snap guideline(s) onto the guides layer. */
  const drawGuides = (guides) => {
    const layer = guidesLayerRef.current;
    if (!layer) return;
    layer.destroyChildren();
    if (!guides?.length) {
      layer.batchDraw();
      return;
    }

    guides.forEach((guide) => {
      const isVertical = guide.orientation === "V";
      const screenCoord =
        guide.lineGuide * worldOrigin.scale + (isVertical ? worldOrigin.x : worldOrigin.y);
      const points = isVertical
        ? [screenCoord, 0, screenCoord, size.height]
        : [0, screenCoord, size.width, screenCoord];

      layer.add(
        new Konva.Line({
          points,
          stroke: "#FF7A18",
          strokeWidth: 1,
          dash: [4, 4],
          listening: false,
        })
      );
    });

    layer.batchDraw();
  };

  /**
   * Collect all world-space X and Y positions that a dragging item can snap to.
   * skipId — the id of the item currently being dragged (exclude it from snap targets).
   */
  const getLineGuideStops = (skipId, items, toWorldCoords) => {
    const centerWorld = toWorldCoords({ x: size.width / 2, y: size.height / 2 });

    const vertical = [0, centerWorld.x];
    const horizontal = [0, centerWorld.y];

    if (fieldBounds) {
      vertical.push(fieldBounds.centerX);
      horizontal.push(fieldBounds.centerY);
    }

    items.forEach((item) => {
      if (!item || item.id === skipId) return;
      if (item.type !== "player" && item.type !== "ball") return;
      vertical.push(item.x);
      horizontal.push(item.y);
    });

    return {
      vertical: [...new Set(vertical)],
      horizontal: [...new Set(horizontal)],
    };
  };

  /**
   * Get the snapping edges of the item being dragged (center-only for circles).
   */
  const getObjectSnappingEdges = (node) => ({
    vertical: [{ guide: node.x(), offset: 0, snap: "center" }],
    horizontal: [{ guide: node.y(), offset: 0, snap: "center" }],
  });

  /**
   * Find the closest guide line(s) within offsetWorld distance.
   * Returns at most one vertical and one horizontal guide.
   */
  const getGuides = (lineGuideStops, itemBounds, offsetWorld) => {
    const result = [];

    let closestV = null;
    lineGuideStops.vertical.forEach((lineGuide) => {
      itemBounds.vertical.forEach((itemBound) => {
        const diff = Math.abs(lineGuide - itemBound.guide);
        if (diff > offsetWorld) return;
        if (!closestV || diff < closestV.diff) {
          closestV = { lineGuide, diff, offset: itemBound.offset, snap: itemBound.snap };
        }
      });
    });

    let closestH = null;
    lineGuideStops.horizontal.forEach((lineGuide) => {
      itemBounds.horizontal.forEach((itemBound) => {
        const diff = Math.abs(lineGuide - itemBound.guide);
        if (diff > offsetWorld) return;
        if (!closestH || diff < closestH.diff) {
          closestH = { lineGuide, diff, offset: itemBound.offset, snap: itemBound.snap };
        }
      });
    });

    if (closestV) result.push({ orientation: "V", lineGuide: closestV.lineGuide, offset: closestV.offset, snap: closestV.snap });
    if (closestH) result.push({ orientation: "H", lineGuide: closestH.lineGuide, offset: closestH.offset, snap: closestH.snap });

    return result;
  };

  return { clearGuides, drawGuides, getLineGuideStops, getObjectSnappingEdges, getGuides };
}

export default useCanvasSnapping;
