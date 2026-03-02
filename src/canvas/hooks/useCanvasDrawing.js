import { useRef, useState, useCallback } from "react";
import { log as logDrawDebug } from "../drawDebugLogger";

const MIN_STROKE_POINTS = 4; // at least 2 points (4 values in flat array)
const MIN_ARROW_LENGTH = 5; // px in world coords
const MOVE_LOG_INTERVAL_MS = 120;

const round2 = (value) => (Number.isFinite(value) ? Number(value).toFixed(2) : "nan");

/**
 * Distance from point (px, py) to line segment (ax, ay)-(bx, by).
 */
function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Hit-test drawings array at a world-space point. Returns the id of the
 * topmost drawing under the point, or null.
 * Optionally skips IDs in the `skipIds` set.
 */
function hitTestDrawings(drawings, worldPoint, tolerance, skipIds) {
  for (let i = drawings.length - 1; i >= 0; i--) {
    const d = drawings[i];
    if (skipIds && skipIds.has(d.id)) continue;
    if (d.type === "stroke") {
      for (let j = 0; j < d.points.length - 2; j += 2) {
        const dist = pointToSegmentDist(
          worldPoint.x,
          worldPoint.y,
          d.points[j],
          d.points[j + 1],
          d.points[j + 2],
          d.points[j + 3]
        );
        if (dist < tolerance + (d.strokeWidth || 3) / 2) return d.id;
      }
    } else if (d.type === "arrow") {
      const dist = pointToSegmentDist(
        worldPoint.x,
        worldPoint.y,
        d.points[0],
        d.points[1],
        d.points[2],
        d.points[3]
      );
      if (dist < tolerance + (d.strokeWidth || 3) / 2) return d.id;
    } else if (d.type === "text") {
      const approxWidth = (d.text?.length || 1) * (d.fontSize || 18) * 0.6;
      const approxHeight = (d.fontSize || 18) * 1.3;
      if (
        worldPoint.x >= d.x &&
        worldPoint.x <= d.x + approxWidth &&
        worldPoint.y >= d.y - approxHeight &&
        worldPoint.y <= d.y
      ) {
        return d.id;
      }
    }
  }
  return null;
}

/**
 * Compute axis-aligned bounding box for a drawing.
 */
export function getDrawingBounds(d) {
  if (d.type === "text") {
    const w = (d.text?.length || 1) * (d.fontSize || 18) * 0.6;
    const h = (d.fontSize || 18) * 1.3;
    return { x: d.x, y: d.y - h, width: w, height: h };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < d.points.length; i += 2) {
    minX = Math.min(minX, d.points[i]);
    maxX = Math.max(maxX, d.points[i]);
    minY = Math.min(minY, d.points[i + 1]);
    maxY = Math.max(maxY, d.points[i + 1]);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * useCanvasDrawing
 *
 * Handles pointer events for the drawing sub-tools (select, draw, arrow, text, erase).
 * Follows the same handler pattern as useCanvasMarquee and returns handler functions
 * that the parent component calls from its pointer-down/move/up handlers.
 */
export function useCanvasDrawing({
  tool,
  subTool,
  stageRef,
  toWorldCoords,
  drawings,
  drawColor,
  drawStrokeWidth,
  drawTension,
  drawFontSize,
  drawTextAlign,
  drawArrowHeadType,
  onAddDrawing,
  onRemoveDrawing,
  onRemoveMultipleDrawings,
  onSelectDrawing,
  onUpdateDrawing,
  selectedDrawingId,
  textEditing,
  onTextEditingChange,
}) {
  const drawingRef = useRef(null);
  const eraseRef = useRef({ active: false, removedIds: new Set() });
  const selectDragRef = useRef(null);
  const lastMoveLogAtRef = useRef(0);
  const [activeDrawing, setActiveDrawing] = useState(null);
  const [erasingIds, setErasingIds] = useState(null);
  const [selectDragOffset, setSelectDragOffset] = useState(null);

  const setTextEditing = onTextEditingChange;

  const maybeLogMove = (line) => {
    const now = performance.now();
    if (now - lastMoveLogAtRef.current >= MOVE_LOG_INTERVAL_MS) {
      lastMoveLogAtRef.current = now;
      logDrawDebug(line);
    }
  };

  const handlePointerDown = useCallback(
    (e) => {
      if (tool !== "pen") return false;
      const evt = e.evt;
      const isPrimaryButton = evt?.button === 0 || evt?.button === undefined;
      if (!isPrimaryButton) return false;

      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition?.();
      if (!pointer) {
        logDrawDebug(`pointerDown ignored reason=noPointer subTool=${subTool}`);
        return false;
      }
      const world = toWorldCoords(pointer);

      if (subTool === "select") {
        const hitId = hitTestDrawings(drawings, world, 10);
        onSelectDrawing?.(hitId);
        logDrawDebug(
          `select pointerDown x=${round2(world.x)} y=${round2(world.y)} hitId=${hitId || "none"} selected=${selectedDrawingId || "none"}`
        );
        if (hitId) {
          selectDragRef.current = {
            drawingId: hitId,
            startWorld: { x: world.x, y: world.y },
            drawing: drawings.find((d) => d.id === hitId),
          };
          logDrawDebug(`select dragStart drawingId=${hitId}`);
        }
        return true;
      }

      if (subTool === "draw") {
        drawingRef.current = {
          type: "stroke",
          points: [world.x, world.y],
          color: drawColor,
          strokeWidth: drawStrokeWidth,
          tension: drawTension,
        };
        setActiveDrawing({ ...drawingRef.current });
        logDrawDebug(
          `draw start x=${round2(world.x)} y=${round2(world.y)} color=${drawColor} width=${drawStrokeWidth} tension=${drawTension}`
        );
        return true;
      }

      if (subTool === "arrow") {
        drawingRef.current = {
          type: "arrow",
          points: [world.x, world.y, world.x, world.y],
          color: drawColor,
          strokeWidth: drawStrokeWidth,
          arrowHeadType: drawArrowHeadType,
        };
        setActiveDrawing({ ...drawingRef.current });
        logDrawDebug(
          `arrow start x=${round2(world.x)} y=${round2(world.y)} color=${drawColor} width=${drawStrokeWidth} head=${drawArrowHeadType}`
        );
        return true;
      }

      if (subTool === "text") {
        setTextEditing({
          screenX: pointer.x,
          screenY: pointer.y,
          worldX: world.x,
          worldY: world.y,
        });
        logDrawDebug(
          `text start screenX=${round2(pointer.x)} screenY=${round2(pointer.y)} worldX=${round2(world.x)} worldY=${round2(world.y)} color=${drawColor} fontSize=${drawFontSize} align=${drawTextAlign}`
        );
        return true;
      }

      if (subTool === "erase") {
        const newSet = new Set();
        const hitId = hitTestDrawings(drawings, world, 10);
        if (hitId) newSet.add(hitId);
        eraseRef.current = { active: true, removedIds: newSet };
        setErasingIds(newSet.size > 0 ? new Set(newSet) : null);
        logDrawDebug(
          `erase start x=${round2(world.x)} y=${round2(world.y)} initialHits=${newSet.size}`
        );
        return true;
      }

      logDrawDebug(`pointerDown ignored reason=unknownSubTool subTool=${subTool}`);
      return false;
    },
    [
      tool,
      subTool,
      stageRef,
      toWorldCoords,
      drawColor,
      drawStrokeWidth,
      drawTension,
      drawArrowHeadType,
      drawings,
      onSelectDrawing,
      selectedDrawingId,
      drawFontSize,
      drawTextAlign,
    ]
  );

  const handlePointerMove = useCallback(
    () => {
      // Erase drag: continuously hit-test.
      if (eraseRef.current.active) {
        const stage = stageRef.current;
        const pointer = stage?.getPointerPosition?.();
        if (!pointer) return false;
        const world = toWorldCoords(pointer);
        const hitId = hitTestDrawings(drawings, world, 10, eraseRef.current.removedIds);
        if (hitId) {
          eraseRef.current.removedIds.add(hitId);
          setErasingIds(new Set(eraseRef.current.removedIds));
          logDrawDebug(
            `erase hit drawingId=${hitId} total=${eraseRef.current.removedIds.size} x=${round2(world.x)} y=${round2(world.y)}`
          );
        }
        return true;
      }

      // Select drag: move selected drawing.
      if (selectDragRef.current) {
        const stage = stageRef.current;
        const pointer = stage?.getPointerPosition?.();
        if (!pointer) return false;
        const world = toWorldCoords(pointer);
        const dx = world.x - selectDragRef.current.startWorld.x;
        const dy = world.y - selectDragRef.current.startWorld.y;
        setSelectDragOffset({ dx, dy });
        maybeLogMove(
          `select dragMove drawingId=${selectDragRef.current.drawingId} dx=${round2(dx)} dy=${round2(dy)}`
        );
        return true;
      }

      if (!drawingRef.current) return false;
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition?.();
      if (!pointer) return false;
      const world = toWorldCoords(pointer);

      if (drawingRef.current.type === "stroke") {
        drawingRef.current.points.push(world.x, world.y);
        setActiveDrawing({
          ...drawingRef.current,
          points: [...drawingRef.current.points],
        });
        maybeLogMove(
          `draw move points=${drawingRef.current.points.length / 2} x=${round2(world.x)} y=${round2(world.y)}`
        );
        return true;
      }

      if (drawingRef.current.type === "arrow") {
        drawingRef.current.points[2] = world.x;
        drawingRef.current.points[3] = world.y;
        setActiveDrawing({
          ...drawingRef.current,
          points: [...drawingRef.current.points],
        });
        const [x1, y1, x2, y2] = drawingRef.current.points;
        const length = Math.hypot(x2 - x1, y2 - y1);
        maybeLogMove(`arrow move length=${round2(length)} x2=${round2(x2)} y2=${round2(y2)}`);
        return true;
      }

      return false;
    },
    [stageRef, toWorldCoords, drawings]
  );

  const handlePointerUp = useCallback(() => {
    // Erase drag commit.
    if (eraseRef.current.active) {
      const ids = Array.from(eraseRef.current.removedIds);
      eraseRef.current = { active: false, removedIds: new Set() };
      setErasingIds(null);
      if (ids.length === 1) {
        onRemoveDrawing?.(ids[0]);
      } else if (ids.length > 1) {
        onRemoveMultipleDrawings?.(ids);
      }
      logDrawDebug(`erase commit removed=${ids.length}`);
      return true;
    }

    // Select drag commit: apply move offset.
    if (selectDragRef.current) {
      const { drawingId, drawing } = selectDragRef.current;
      const offset = selectDragOffset;
      selectDragRef.current = null;
      setSelectDragOffset(null);

      if (offset && (Math.abs(offset.dx) > 2 || Math.abs(offset.dy) > 2) && drawing) {
        if (drawing.type === "text") {
          onUpdateDrawing?.(drawingId, { x: drawing.x + offset.dx, y: drawing.y + offset.dy });
        } else {
          const newPoints = [];
          for (let i = 0; i < drawing.points.length; i += 2) {
            newPoints.push(drawing.points[i] + offset.dx, drawing.points[i + 1] + offset.dy);
          }
          onUpdateDrawing?.(drawingId, { points: newPoints });
        }
        logDrawDebug(
          `select dragCommit drawingId=${drawingId} type=${drawing.type} dx=${round2(offset.dx)} dy=${round2(offset.dy)}`
        );
      } else {
        logDrawDebug(`select dragCommit skipped drawingId=${drawingId || "none"}`);
      }
      return true;
    }

    if (!drawingRef.current) return false;
    const drawing = drawingRef.current;
    drawingRef.current = null;
    setActiveDrawing(null);

    if (drawing.type === "stroke" && drawing.points.length < MIN_STROKE_POINTS) {
      logDrawDebug(`draw commit skipped reason=tooShort points=${drawing.points.length / 2}`);
      return true;
    }
    if (drawing.type === "arrow") {
      const dx = drawing.points[2] - drawing.points[0];
      const dy = drawing.points[3] - drawing.points[1];
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < MIN_ARROW_LENGTH) {
        logDrawDebug(`arrow commit skipped reason=tooShort length=${round2(length)}`);
        return true;
      }
      logDrawDebug(`arrow commit length=${round2(length)} head=${drawing.arrowHeadType || "standard"}`);
    } else {
      logDrawDebug(`draw commit points=${drawing.points.length / 2} tension=${drawing.tension ?? 0.3}`);
    }

    onAddDrawing?.(drawing);
    return true;
  }, [onAddDrawing, onRemoveDrawing, onRemoveMultipleDrawings, onUpdateDrawing, selectDragOffset]);

  const commitText = useCallback(
    (text) => {
      if (!textEditing || !text?.trim()) {
        if (textEditing) {
          logDrawDebug("text commit skipped reason=empty");
        }
        setTextEditing(null);
        return;
      }
      const trimmed = text.trim();
      onAddDrawing?.({
        type: "text",
        x: textEditing.worldX,
        y: textEditing.worldY,
        text: trimmed,
        color: drawColor,
        fontSize: drawFontSize,
        align: drawTextAlign,
      });
      logDrawDebug(
        `text commit chars=${trimmed.length} x=${round2(textEditing.worldX)} y=${round2(textEditing.worldY)} fontSize=${drawFontSize} align=${drawTextAlign}`
      );
      setTextEditing(null);
    },
    [textEditing, drawColor, drawFontSize, drawTextAlign, onAddDrawing]
  );

  const cancelText = useCallback(() => {
    if (textEditing) {
      logDrawDebug(`text cancel x=${round2(textEditing.worldX)} y=${round2(textEditing.worldY)}`);
    }
    setTextEditing(null);
  }, [textEditing]);

  return {
    activeDrawing,
    erasingIds,
    selectDragOffset,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    commitText,
    cancelText,
  };
}

export default useCanvasDrawing;
