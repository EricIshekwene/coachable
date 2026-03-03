import { useRef, useState, useCallback } from "react";
import { log as logDrawDebug } from "../drawDebugLogger";
import { hitTestDrawings } from "../drawingGeometry";

// Re-export for backward compatibility
export { getDrawingBounds, getDrawingWorldBounds, hitTestDrawings } from "../drawingGeometry";

const MIN_STROKE_POINTS = 4; // at least 2 points (4 values in flat array)
const MIN_ARROW_LENGTH = 5; // px in world coords
const MOVE_LOG_INTERVAL_MS = 120;

const round2 = (value) => (Number.isFinite(value) ? Number(value).toFixed(2) : "nan");

/**
 * useCanvasDrawing
 *
 * Handles pointer events for the drawing sub-tools (draw, arrow, text, erase).
 * Select sub-tool is now handled by useDrawingSelection.
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
  eraserSize = 10,
  onAddDrawing,
  onRemoveDrawing,
  onRemoveMultipleDrawings,
  textEditing,
  onTextEditingChange,
  onSelectedDrawingIdsChange,
  onDrawSubToolChange,
}) {
  const drawingRef = useRef(null);
  const eraseRef = useRef({ active: false, removedIds: new Set() });
  const lastMoveLogAtRef = useRef(0);
  const [activeDrawing, setActiveDrawing] = useState(null);
  const [erasingIds, setErasingIds] = useState(null);

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
      // Select sub-tool is handled by useDrawingSelection — skip here
      if (subTool === "select") return false;

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
        // Create text drawing immediately and auto-select it
        const textDrawing = {
          type: "text",
          x: world.x,
          y: world.y,
          text: "Text",
          color: drawColor,
          fontSize: drawFontSize,
          align: drawTextAlign,
        };
        const newId = onAddDrawing?.(textDrawing);
        logDrawDebug(
          `text create id=${newId} worldX=${round2(world.x)} worldY=${round2(world.y)} color=${drawColor} fontSize=${drawFontSize} align=${drawTextAlign}`
        );
        // Auto-select and switch to select sub-tool
        if (newId) {
          onSelectedDrawingIdsChange?.([newId]);
          onDrawSubToolChange?.("select");
        }
        return true;
      }

      if (subTool === "erase") {
        const newSet = new Set();
        const hitId = hitTestDrawings(drawings, world, eraserSize);
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
      eraserSize,
      drawings,
      drawFontSize,
      drawTextAlign,
      onAddDrawing,
      onSelectedDrawingIdsChange,
      onDrawSubToolChange,
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
        const hitId = hitTestDrawings(drawings, world, eraserSize, eraseRef.current.removedIds);
        if (hitId) {
          eraseRef.current.removedIds.add(hitId);
          setErasingIds(new Set(eraseRef.current.removedIds));
          logDrawDebug(
            `erase hit drawingId=${hitId} total=${eraseRef.current.removedIds.size} x=${round2(world.x)} y=${round2(world.y)}`
          );
        }
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
    [stageRef, toWorldCoords, drawings, eraserSize]
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
  }, [onAddDrawing, onRemoveDrawing, onRemoveMultipleDrawings]);

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
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    commitText,
    cancelText,
  };
}

export default useCanvasDrawing;
