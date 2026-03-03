import { useRef, useState, useCallback } from "react";
import { log as logDrawDebug } from "../drawDebugLogger";
import { hitTestDrawings } from "../drawingGeometry";

// Re-export for backward compatibility
export { getDrawingBounds, getDrawingWorldBounds, hitTestDrawings } from "../drawingGeometry";

const MIN_STROKE_POINTS = 4; // at least 2 points (4 values in flat array)
const MIN_ARROW_LENGTH = 5; // px in world coords
const MIN_SHAPE_SIZE = 5; // px in world coords
const MOVE_LOG_INTERVAL_MS = 120;

const round2 = (value) => (Number.isFinite(value) ? Number(value).toFixed(2) : "nan");

/**
 * useCanvasDrawing
 *
 * Handles pointer events for the drawing sub-tools (draw, arrow, text, shape, erase).
 * Select sub-tool is now handled by useDrawingSelection.
 */
export function useCanvasDrawing({
  tool,
  subTool,
  stageRef,
  toWorldCoords,
  drawings,
  drawColor,
  drawOpacity = 1,
  drawStrokeWidth,
  drawTension,
  drawFontSize,
  drawTextAlign,
  drawArrowHeadType,
  eraserSize = 10,
  drawShapeType = "rect",
  drawShapeStrokeColor = drawColor,
  drawShapeFill = "transparent",
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
  const customShapeRef = useRef(null); // for custom polygon click-to-place
  const lastMoveLogAtRef = useRef(0);
  const [activeDrawing, setActiveDrawing] = useState(null);
  const [erasingIds, setErasingIds] = useState(null);
  const [customPreviewLine, setCustomPreviewLine] = useState(null);

  const setTextEditing = onTextEditingChange;

  const maybeLogMove = (line) => {
    const now = performance.now();
    if (now - lastMoveLogAtRef.current >= MOVE_LOG_INTERVAL_MS) {
      lastMoveLogAtRef.current = now;
      logDrawDebug(line);
    }
  };

  const commitCustomShape = useCallback(() => {
    const shape = customShapeRef.current;
    if (!shape || !shape.points || shape.points.length < 6) {
      logDrawDebug(`customShape commit skipped reason=tooFewPoints points=${(shape?.points?.length || 0) / 2}`);
      customShapeRef.current = null;
      setActiveDrawing(null);
      setCustomPreviewLine(null);
      return;
    }
    customShapeRef.current = null;
    setActiveDrawing(null);
    setCustomPreviewLine(null);
    const newId = onAddDrawing?.(shape);
    if (newId) {
      onDrawSubToolChange?.("select", { selectIds: [newId] });
    }
    logDrawDebug(`customShape commit points=${shape.points.length / 2}`);
  }, [onAddDrawing, onDrawSubToolChange]);

  const cancelCustomShape = useCallback(() => {
    if (customShapeRef.current) {
      logDrawDebug("customShape cancel");
    }
    customShapeRef.current = null;
    setActiveDrawing(null);
    setCustomPreviewLine(null);
  }, []);

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
          opacity: drawOpacity,
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
          opacity: drawOpacity,
          strokeWidth: drawStrokeWidth,
          arrowHeadType: drawArrowHeadType,
        };
        setActiveDrawing({ ...drawingRef.current });
        logDrawDebug(
          `arrow start x=${round2(world.x)} y=${round2(world.y)} color=${drawColor} width=${drawStrokeWidth} head=${drawArrowHeadType}`
        );
        return true;
      }

      if (subTool === "shape") {
        if (drawShapeType === "custom") {
          // Custom polygon: click to add points
          const isDoubleClick = evt?.detail >= 2;
          if (customShapeRef.current) {
            // Add point to existing polygon
            customShapeRef.current.points.push(world.x, world.y);
            setActiveDrawing({ ...customShapeRef.current, points: [...customShapeRef.current.points] });
            logDrawDebug(`customShape addPoint points=${customShapeRef.current.points.length / 2}`);
            if (isDoubleClick) {
              commitCustomShape();
            }
            return true;
          }
          // Start new custom polygon
          customShapeRef.current = {
            type: "shape",
            shapeType: "custom",
            x: world.x,
            y: world.y,
            width: 0,
            height: 0,
            points: [world.x, world.y],
            color: drawShapeStrokeColor,
            opacity: drawOpacity,
            fill: drawShapeFill,
            strokeWidth: drawStrokeWidth,
          };
          setActiveDrawing({ ...customShapeRef.current });
          logDrawDebug(`customShape start x=${round2(world.x)} y=${round2(world.y)}`);
          return true;
        }

        // Rect / Triangle / Ellipse: click-drag
        drawingRef.current = {
          type: "shape",
          shapeType: drawShapeType,
          x: world.x,
          y: world.y,
          width: 0,
          height: 0,
          color: drawShapeStrokeColor,
          opacity: drawOpacity,
          fill: drawShapeFill,
          strokeWidth: drawStrokeWidth,
          _startX: world.x,
          _startY: world.y,
        };
        setActiveDrawing({ ...drawingRef.current });
        logDrawDebug(
          `shape start type=${drawShapeType} x=${round2(world.x)} y=${round2(world.y)} color=${drawShapeStrokeColor} fill=${drawShapeFill}`
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
          opacity: drawOpacity,
          fontSize: drawFontSize,
          align: drawTextAlign,
        };
        const newId = onAddDrawing?.(textDrawing);
        logDrawDebug(
          `text create id=${newId} worldX=${round2(world.x)} worldY=${round2(world.y)} color=${drawColor} fontSize=${drawFontSize} align=${drawTextAlign}`
        );
        // Switch to select sub-tool and auto-select the new text drawing
        if (newId) {
          onDrawSubToolChange?.("select", { selectIds: [newId] });
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
      drawOpacity,
      drawStrokeWidth,
      drawTension,
      drawArrowHeadType,
      drawShapeType,
      drawShapeStrokeColor,
      drawShapeFill,
      eraserSize,
      drawings,
      drawFontSize,
      drawTextAlign,
      onAddDrawing,
      onSelectedDrawingIdsChange,
      onDrawSubToolChange,
      commitCustomShape,
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

      // Custom shape preview line
      if (customShapeRef.current) {
        const stage = stageRef.current;
        const pointer = stage?.getPointerPosition?.();
        if (!pointer) return false;
        const world = toWorldCoords(pointer);
        const pts = customShapeRef.current.points;
        const lastX = pts[pts.length - 2];
        const lastY = pts[pts.length - 1];
        setCustomPreviewLine({ x1: lastX, y1: lastY, x2: world.x, y2: world.y });
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

      if (drawingRef.current.type === "shape") {
        const startX = drawingRef.current._startX;
        const startY = drawingRef.current._startY;
        drawingRef.current.x = Math.min(startX, world.x);
        drawingRef.current.y = Math.min(startY, world.y);
        drawingRef.current.width = Math.abs(world.x - startX);
        drawingRef.current.height = Math.abs(world.y - startY);
        setActiveDrawing({ ...drawingRef.current });
        maybeLogMove(
          `shape move w=${round2(drawingRef.current.width)} h=${round2(drawingRef.current.height)}`
        );
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
    } else if (drawing.type === "shape") {
      if ((drawing.width || 0) < MIN_SHAPE_SIZE && (drawing.height || 0) < MIN_SHAPE_SIZE) {
        logDrawDebug(`shape commit skipped reason=tooSmall w=${round2(drawing.width)} h=${round2(drawing.height)}`);
        return true;
      }
      // Remove internal start coordinates before saving
      const { _startX, _startY, ...cleanDrawing } = drawing;
      logDrawDebug(`shape commit type=${cleanDrawing.shapeType} w=${round2(cleanDrawing.width)} h=${round2(cleanDrawing.height)}`);
      const newId = onAddDrawing?.(cleanDrawing);
      if (newId) {
        onDrawSubToolChange?.("select", { selectIds: [newId] });
      }
      return true;
    } else {
      logDrawDebug(`draw commit points=${drawing.points.length / 2} tension=${drawing.tension ?? 0.3}`);
    }

    const newId = onAddDrawing?.(drawing);
    if (newId) {
      onDrawSubToolChange?.("select", { selectIds: [newId] });
    }
    return true;
  }, [onAddDrawing, onRemoveDrawing, onRemoveMultipleDrawings, onDrawSubToolChange]);

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
        opacity: drawOpacity,
        fontSize: drawFontSize,
        align: drawTextAlign,
      });
      logDrawDebug(
        `text commit chars=${trimmed.length} x=${round2(textEditing.worldX)} y=${round2(textEditing.worldY)} fontSize=${drawFontSize} align=${drawTextAlign}`
      );
      setTextEditing(null);
    },
    [textEditing, drawColor, drawOpacity, drawFontSize, drawTextAlign, onAddDrawing]
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
    customPreviewLine,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    commitText,
    cancelText,
    commitCustomShape,
    cancelCustomShape,
  };
}

export default useCanvasDrawing;
