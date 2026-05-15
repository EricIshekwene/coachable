import { useRef, useState, useCallback } from "react";
import { log as logDrawDebug } from "../drawDebugLogger";
import { hitTestDrawings } from "../drawingGeometry";

// Re-export for backward compatibility
export { getDrawingBounds, getDrawingWorldBounds, hitTestDrawings } from "../drawingGeometry";

const MIN_STROKE_POINTS = 4; // at least 2 points (4 values in flat array)
const MIN_ARROW_LENGTH = 5; // px in world coords
const MIN_SHAPE_SIZE = 5; // px in world coords
const MOVE_LOG_INTERVAL_MS = 120;

// Stroke stabilization: pull-string algorithm
// stabilization 0 = off, 100 = maximum smoothing
// Maps to a "string length" (dead zone radius) and moving average window
const STAB_MAX_STRING_LEN = 30; // max dead zone radius in world px
const STAB_MAX_WINDOW = 8; // max moving average window size

// Auto stabilization level used when drawingModeSnap is active (animation drawing)
const ANIM_DRAW_STAB_LEVEL = 80;

// Snap radius for continuing from the tip of an existing coaching-draw path
const PATH_TIP_SNAP_RADIUS = 70;

/**
 * Chaikin corner-cutting smoothing for a flat [x,y,...] points array.
 * Preserves the first and last points (for player-snap attachment).
 * @param {number[]} points - flat array of world coordinates
 * @param {number} iterations - number of smoothing passes (2–3 recommended)
 * @returns {number[]} smoothed flat array
 */
function chaikinSmooth(points, iterations = 3) {
  if (points.length < 6) return points; // need at least 3 points to smooth
  let pts = points;
  for (let i = 0; i < iterations; i++) {
    const result = [pts[0], pts[1]];
    for (let j = 0; j < pts.length / 2 - 1; j++) {
      const x0 = pts[j * 2];
      const y0 = pts[j * 2 + 1];
      const x1 = pts[j * 2 + 2];
      const y1 = pts[j * 2 + 3];
      result.push(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1);
      result.push(0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1);
    }
    result.push(pts[pts.length - 2], pts[pts.length - 1]);
    pts = result;
  }
  return pts;
}

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
  drawStabilization = 0,
  drawArrowTip = false,
  eraserSize = 10,
  drawShapeType = "rect",
  drawShapeStrokeColor = drawColor,
  drawShapeFill = "transparent",
  onAddDrawing,
  onRemoveDrawing,
  onRemoveMultipleDrawings,
  onEraseMiss,
  textEditing,
  onTextEditingChange,
  onSelectedDrawingIdsChange,
  onSubToolChange,
  onStartTextEdit,
  // Snap support
  fieldBounds,
  drawGuides,
  clearGuides,
  guidelineOffsetWorld,
  // Drawing-mode player snap
  playerSnapItems = null,
  drawingModeSnap = false,
}) {
  const drawingRef = useRef(null);
  const eraseRef = useRef({ active: false, removedIds: new Set() });
  const customShapeRef = useRef(null); // for custom polygon click-to-place
  const lastMoveLogAtRef = useRef(0);
  const stabRef = useRef(null); // stroke stabilization state
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

  const getDrawingSnapStops = useCallback(() => {
    if (!fieldBounds) return null;
    return {
      vertical: [0, fieldBounds.left, fieldBounds.right, fieldBounds.centerX],
      horizontal: [0, fieldBounds.top, fieldBounds.bottom, fieldBounds.centerY],
    };
  }, [fieldBounds]);

  const findClosestSnapGuide = useCallback((stops = [], guide, tolerance) => {
    let closest = null;
    stops.forEach((lineGuide) => {
      const diff = Math.abs(lineGuide - guide);
      if (diff <= tolerance && (!closest || diff < closest.diff)) {
        closest = { lineGuide, diff };
      }
    });
    return closest;
  }, []);

  const snapDrawingPoint = useCallback(
    (x, y, { showGuides = true } = {}) => {
      if (!drawGuides || !clearGuides || !guidelineOffsetWorld) {
        return { x, y, guides: [] };
      }
      const stops = getDrawingSnapStops();
      if (!stops) {
        if (showGuides) clearGuides();
        return { x, y, guides: [] };
      }

      const closestV = findClosestSnapGuide(stops.vertical, x, guidelineOffsetWorld);
      const closestH = findClosestSnapGuide(stops.horizontal, y, guidelineOffsetWorld);

      let snappedX = x;
      let snappedY = y;
      const guides = [];

      if (closestV) {
        snappedX = closestV.lineGuide;
        guides.push({ orientation: "V", lineGuide: closestV.lineGuide, offset: 0, snap: "center" });
      }
      if (closestH) {
        snappedY = closestH.lineGuide;
        guides.push({ orientation: "H", lineGuide: closestH.lineGuide, offset: 0, snap: "center" });
      }

      if (showGuides) {
        if (guides.length) {
          drawGuides(guides);
        } else {
          clearGuides();
        }
      }

      return { x: snappedX, y: snappedY, guides };
    },
    [drawGuides, clearGuides, guidelineOffsetWorld, getDrawingSnapStops, findClosestSnapGuide]
  );

  const snapDrawingBoundsFromStart = useCallback(
    (startX, startY, endX, endY, { showGuides = true } = {}) => {
      if (!drawGuides || !clearGuides || !guidelineOffsetWorld) {
        return { endX, endY, guides: [] };
      }
      const stops = getDrawingSnapStops();
      if (!stops) {
        if (showGuides) clearGuides();
        return { endX, endY, guides: [] };
      }

      const tentBounds = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY),
      };
      const cx = tentBounds.x + tentBounds.width / 2;
      const cy = tentBounds.y + tentBounds.height / 2;
      const vEdges = [
        { guide: tentBounds.x, offset: tentBounds.x - cx, snap: "left" },
        { guide: cx, offset: 0, snap: "center" },
        { guide: tentBounds.x + tentBounds.width, offset: tentBounds.x + tentBounds.width - cx, snap: "right" },
      ];
      const hEdges = [
        { guide: tentBounds.y, offset: tentBounds.y - cy, snap: "top" },
        { guide: cy, offset: 0, snap: "center" },
        { guide: tentBounds.y + tentBounds.height, offset: tentBounds.y + tentBounds.height - cy, snap: "bottom" },
      ];

      let snappedEndX = endX;
      let snappedEndY = endY;
      let closestV = null;
      stops.vertical.forEach((stop) => {
        vEdges.forEach((edge) => {
          const diff = Math.abs(stop - edge.guide);
          if (diff <= guidelineOffsetWorld && (!closestV || diff < closestV.diff)) {
            closestV = { lineGuide: stop, diff, offset: edge.offset, snap: edge.snap };
          }
        });
      });

      let closestH = null;
      stops.horizontal.forEach((stop) => {
        hEdges.forEach((edge) => {
          const diff = Math.abs(stop - edge.guide);
          if (diff <= guidelineOffsetWorld && (!closestH || diff < closestH.diff)) {
            closestH = { lineGuide: stop, diff, offset: edge.offset, snap: edge.snap };
          }
        });
      });

      const guides = [];
      if (closestV) {
        const snapTarget = closestV.lineGuide;
        const edgeSnap = closestV.snap;
        if (edgeSnap === "left" || edgeSnap === "right") {
          snappedEndX = endX + (snapTarget - (edgeSnap === "left" ? Math.min(startX, endX) : Math.max(startX, endX)));
        } else {
          const mid = (startX + snappedEndX) / 2;
          snappedEndX += (snapTarget - mid);
        }
        guides.push({ orientation: "V", lineGuide: snapTarget, offset: closestV.offset, snap: closestV.snap });
      }
      if (closestH) {
        const snapTarget = closestH.lineGuide;
        const edgeSnap = closestH.snap;
        if (edgeSnap === "top" || edgeSnap === "bottom") {
          snappedEndY = endY + (snapTarget - (edgeSnap === "top" ? Math.min(startY, endY) : Math.max(startY, endY)));
        } else {
          const mid = (startY + snappedEndY) / 2;
          snappedEndY += (snapTarget - mid);
        }
        guides.push({ orientation: "H", lineGuide: snapTarget, offset: closestH.offset, snap: closestH.snap });
      }

      if (showGuides) {
        if (guides.length) {
          drawGuides(guides);
        } else {
          clearGuides();
        }
      }

      return { endX: snappedEndX, endY: snappedEndY, guides };
    },
    [drawGuides, clearGuides, guidelineOffsetWorld, getDrawingSnapStops]
  );

  const commitCustomShape = useCallback(() => {
    const shape = customShapeRef.current;
    if (!shape || !shape.points || shape.points.length < 6) {
      logDrawDebug(`customShape commit skipped reason=tooFewPoints points=${(shape?.points?.length || 0) / 2}`);
      customShapeRef.current = null;
      setActiveDrawing(null);
      setCustomPreviewLine(null);
      clearGuides?.();
      return;
    }
    customShapeRef.current = null;
    setActiveDrawing(null);
    setCustomPreviewLine(null);
    clearGuides?.();
    onAddDrawing?.(shape);
    logDrawDebug(`customShape commit points=${shape.points.length / 2}`);
  }, [onAddDrawing, clearGuides]);

  const cancelCustomShape = useCallback(() => {
    if (customShapeRef.current) {
      logDrawDebug("customShape cancel");
    }
    customShapeRef.current = null;
    setActiveDrawing(null);
    setCustomPreviewLine(null);
    clearGuides?.();
  }, [clearGuides]);

  /**
   * In drawing mode, finds the nearest snap target — path tips take priority over player centers.
   * Returns { x, y, id, type: "pathTip"|"player", continuedFromDrawingId? } or null.
   */
  const PLAYER_SNAP_RADIUS = 50;
  const findSnapPlayer = useCallback((wx, wy) => {
    // Find the best path tip candidate (last step per player only).
    let bestTip = null;
    let bestTipDist = PATH_TIP_SNAP_RADIUS;
    if (drawingModeSnap) {
      const coachingDrawings = (drawings || []).filter(
        (d) => d.source === "coaching-draw" && d.attachedPlayerId && d.points?.length >= 2
      );
      // Keep only the highest-stepIndex drawing per player
      const lastStepByPlayer = new Map();
      for (const d of coachingDrawings) {
        const existing = lastStepByPlayer.get(d.attachedPlayerId);
        if (!existing || (d.stepIndex ?? 0) > (existing.stepIndex ?? 0)) {
          lastStepByPlayer.set(d.attachedPlayerId, d);
        }
      }
      for (const d of lastStepByPlayer.values()) {
        const tx = d.points[d.points.length - 2];
        const ty = d.points[d.points.length - 1];
        const dist = Math.sqrt((tx - wx) ** 2 + (ty - wy) ** 2);
        if (dist < bestTipDist) {
          bestTipDist = dist;
          bestTip = { x: tx, y: ty, id: d.attachedPlayerId, type: "pathTip", continuedFromDrawingId: d.id };
        }
      }
    }

    // Find the best player center candidate.
    let best = null;
    let bestDist = PLAYER_SNAP_RADIUS;
    if (playerSnapItems?.length) {
      for (const item of playerSnapItems) {
        const dx = item.x - wx;
        const dy = item.y - wy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          best = item;
        }
      }
    }

    // Prefer whichever snap target is actually closer. Player center wins ties
    // so that drawing on top of a player always starts a fresh step from their body.
    if (best && bestDist <= bestTipDist) {
      return { x: best.x, y: best.y, id: best.id, type: "player" };
    }
    if (bestTip) return bestTip;
    if (best) return { x: best.x, y: best.y, id: best.id, type: "player" };
    return null;
  }, [playerSnapItems, drawings, drawingModeSnap]);

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
        // Drawing mode: must start near a player or path tip — snap accordingly
        let startX = world.x;
        let startY = world.y;
        let attachedPlayerId;
        let continuedFromDrawingId;
        if (drawingModeSnap) {
          const snap = findSnapPlayer(world.x, world.y);
          if (!snap) {
            logDrawDebug(`draw rejected reason=noNearbyPlayer x=${round2(world.x)} y=${round2(world.y)}`);
            return false;
          }
          startX = snap.x;
          startY = snap.y;
          attachedPlayerId = snap.id;
          continuedFromDrawingId = snap.continuedFromDrawingId;
          logDrawDebug(`draw snapped type=${snap.type} id=${snap.id} x=${round2(startX)} y=${round2(startY)}`);
        } else {
          const snapped = snapDrawingPoint(world.x, world.y, { showGuides: false });
          startX = snapped.x;
          startY = snapped.y;
        }
        drawingRef.current = {
          type: "stroke",
          points: [startX, startY],
          color: drawColor,
          opacity: drawOpacity,
          strokeWidth: drawStrokeWidth,
          tension: drawTension,
          arrowTip: drawArrowTip || undefined,
          arrowHeadType: drawArrowTip ? drawArrowHeadType : undefined,
          ...(attachedPlayerId ? { attachedPlayerId } : {}),
          ...(continuedFromDrawingId ? { continuedFromDrawingId } : {}),
        };
        // Animation drawing mode always uses high stabilization; otherwise respect setting
        const effectiveStab = drawingModeSnap ? ANIM_DRAW_STAB_LEVEL : drawStabilization;
        const level = effectiveStab / 100;
        const stringLen = level * STAB_MAX_STRING_LEN;
        const windowSize = Math.max(1, Math.round(1 + level * (STAB_MAX_WINDOW - 1)));
        stabRef.current = {
          enabled: effectiveStab > 0,
          stringLen,
          windowSize,
          brushX: startX,
          brushY: startY,
          rawBuffer: [{ x: startX, y: startY }],
        };
        setActiveDrawing({ ...drawingRef.current });
        logDrawDebug(
          `draw start x=${round2(world.x)} y=${round2(world.y)} color=${drawColor} width=${drawStrokeWidth} tension=${drawTension} stab=${drawStabilization}`
        );
        return true;
      }

      if (subTool === "arrow") {
        let startX = world.x;
        let startY = world.y;
        let attachedPlayerId;
        let continuedFromDrawingId;
        if (drawingModeSnap) {
          const snap = findSnapPlayer(world.x, world.y);
          if (!snap) {
            logDrawDebug(`arrow rejected reason=noNearbyPlayer x=${round2(world.x)} y=${round2(world.y)}`);
            return false;
          }
          startX = snap.x;
          startY = snap.y;
          attachedPlayerId = snap.id;
          continuedFromDrawingId = snap.continuedFromDrawingId;
          logDrawDebug(`arrow snapped type=${snap.type} id=${snap.id} x=${round2(startX)} y=${round2(startY)}`);
        } else {
          const snapped = snapDrawingPoint(world.x, world.y, { showGuides: false });
          startX = snapped.x;
          startY = snapped.y;
        }
        drawingRef.current = {
          type: "arrow",
          points: [startX, startY, startX, startY],
          color: drawColor,
          opacity: drawOpacity,
          strokeWidth: drawStrokeWidth,
          arrowHeadType: drawArrowHeadType,
          ...(attachedPlayerId ? { attachedPlayerId } : {}),
          ...(continuedFromDrawingId ? { continuedFromDrawingId } : {}),
        };
        setActiveDrawing({ ...drawingRef.current });
        logDrawDebug(
          `arrow start x=${round2(startX)} y=${round2(startY)} color=${drawColor} width=${drawStrokeWidth} head=${drawArrowHeadType}`
        );
        return true;
      }

      if (subTool === "shape") {
        if (drawShapeType === "custom") {
          // Custom polygon: click to add points
          const isDoubleClick = evt?.detail >= 2;
          if (customShapeRef.current) {
            const snapped = snapDrawingPoint(world.x, world.y, { showGuides: false });
            // Add point to existing polygon
            customShapeRef.current.points.push(snapped.x, snapped.y);
            setActiveDrawing({ ...customShapeRef.current, points: [...customShapeRef.current.points] });
            logDrawDebug(`customShape addPoint points=${customShapeRef.current.points.length / 2}`);
            if (isDoubleClick) {
              commitCustomShape();
            }
            return true;
          }
          const snapped = snapDrawingPoint(world.x, world.y, { showGuides: false });
          // Start new custom polygon
          customShapeRef.current = {
            type: "shape",
            shapeType: "custom",
            x: snapped.x,
            y: snapped.y,
            width: 0,
            height: 0,
            points: [snapped.x, snapped.y],
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
        const snapped = snapDrawingPoint(world.x, world.y, { showGuides: false });
        drawingRef.current = {
          type: "shape",
          shapeType: drawShapeType,
          x: snapped.x,
          y: snapped.y,
          width: 0,
          height: 0,
          color: drawShapeStrokeColor,
          opacity: drawOpacity,
          fill: drawShapeFill,
          strokeWidth: drawStrokeWidth,
          _startX: snapped.x,
          _startY: snapped.y,
        };
        setActiveDrawing({ ...drawingRef.current });
        logDrawDebug(
          `shape start type=${drawShapeType} x=${round2(world.x)} y=${round2(world.y)} color=${drawShapeStrokeColor} fill=${drawShapeFill}`
        );
        return true;
      }

      if (subTool === "text") {
        const snapped = snapDrawingPoint(world.x, world.y, { showGuides: false });
        const textDrawing = {
          type: "text",
          x: snapped.x,
          y: snapped.y,
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
        onSubToolChange?.("select");
        if (newId) {
          onSelectedDrawingIdsChange?.([newId]);
          onStartTextEdit?.(newId, textDrawing.text);
        }
        return true;
      }

      if (subTool === "erase") {
        const newSet = new Set();
        const hitId = hitTestDrawings(drawings, world, eraserSize);
        if (hitId) {
          newSet.add(hitId);
        } else {
          // Only deselect if the click is genuinely in empty space — not near a player.
          // Clicking on a player with erase should leave their selection intact.
          const nearPlayer = playerSnapItems?.some((item) => {
            const dx = item.x - world.x;
            const dy = item.y - world.y;
            return Math.sqrt(dx * dx + dy * dy) < PLAYER_SNAP_RADIUS;
          });
          if (!nearPlayer) onEraseMiss?.();
        }
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
      drawStabilization,
      drawShapeType,
      drawShapeStrokeColor,
      drawShapeFill,
      eraserSize,
      drawings,
      drawFontSize,
      drawTextAlign,
      onAddDrawing,
      onEraseMiss,
      onSelectedDrawingIdsChange,
      onSubToolChange,
      onStartTextEdit,
      commitCustomShape,
      snapDrawingPoint,
      findSnapPlayer,
      drawingModeSnap,
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
        const snapped = snapDrawingPoint(world.x, world.y);
        const pts = customShapeRef.current.points;
        const lastX = pts[pts.length - 2];
        const lastY = pts[pts.length - 1];
        setCustomPreviewLine({ x1: lastX, y1: lastY, x2: snapped.x, y2: snapped.y });
        return true;
      }

      if (!drawingRef.current) return false;
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition?.();
      if (!pointer) return false;
      const world = toWorldCoords(pointer);

      if (drawingRef.current.type === "stroke") {
        const snapped = snapDrawingPoint(world.x, world.y);
        const stab = stabRef.current;

        if (stab?.enabled) {
          // Pull-string: only move brush when cursor exceeds string length from brush
          const dx = snapped.x - stab.brushX;
          const dy = snapped.y - stab.brushY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < stab.stringLen) {
            // Cursor within dead zone — don't add point
            return true;
          }

          // Move brush toward cursor, leaving stringLen gap
          const moveDist = dist - stab.stringLen;
          const ratio = moveDist / dist;
          stab.brushX += dx * ratio;
          stab.brushY += dy * ratio;

          // Moving average smoothing
          stab.rawBuffer.push({ x: stab.brushX, y: stab.brushY });
          if (stab.rawBuffer.length > stab.windowSize) {
            stab.rawBuffer.shift();
          }
          let avgX = 0, avgY = 0;
          for (const pt of stab.rawBuffer) {
            avgX += pt.x;
            avgY += pt.y;
          }
          avgX /= stab.rawBuffer.length;
          avgY /= stab.rawBuffer.length;

          drawingRef.current.points.push(avgX, avgY);
        } else {
          drawingRef.current.points.push(snapped.x, snapped.y);
        }

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
        const startX = drawingRef.current.points[0];
        const startY = drawingRef.current.points[1];
        const snapped = snapDrawingBoundsFromStart(startX, startY, world.x, world.y);
        drawingRef.current.points[2] = snapped.endX;
        drawingRef.current.points[3] = snapped.endY;
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
        const snapped = snapDrawingBoundsFromStart(startX, startY, world.x, world.y);
        const endX = snapped.endX;
        const endY = snapped.endY;

        drawingRef.current.x = Math.min(startX, endX);
        drawingRef.current.y = Math.min(startY, endY);
        drawingRef.current.width = Math.abs(endX - startX);
        drawingRef.current.height = Math.abs(endY - startY);
        setActiveDrawing({ ...drawingRef.current });
        maybeLogMove(
          `shape move w=${round2(drawingRef.current.width)} h=${round2(drawingRef.current.height)}`
        );
        return true;
      }

      return false;
    },
    [stageRef, toWorldCoords, drawings, eraserSize, snapDrawingPoint, snapDrawingBoundsFromStart]
  );

  const handlePointerUp = useCallback(() => {
    // Erase drag commit.
    if (eraseRef.current.active) {
      const directIds = Array.from(eraseRef.current.removedIds);

      // Chain erase: removing a coaching-draw step also removes all later steps for the same player.
      const chainIds = new Set(directIds);
      for (const id of directIds) {
        const erased = drawings.find((d) => d.id === id);
        if (erased?.source === "coaching-draw" && erased.attachedPlayerId != null) {
          const erasedStep = erased.stepIndex ?? 0;
          for (const d of drawings) {
            if (
              d.source === "coaching-draw" &&
              d.attachedPlayerId === erased.attachedPlayerId &&
              (d.stepIndex ?? 0) > erasedStep
            ) {
              chainIds.add(d.id);
            }
          }
        }
      }

      const ids = Array.from(chainIds);
      eraseRef.current = { active: false, removedIds: new Set() };
      setErasingIds(null);
      if (ids.length === 1) {
        onRemoveDrawing?.(ids[0]);
      } else if (ids.length > 1) {
        onRemoveMultipleDrawings?.(ids);
      }
      logDrawDebug(`erase commit removed=${ids.length} direct=${directIds.length}`);
      return true;
    }

    if (!drawingRef.current) return false;
    clearGuides?.();
    stabRef.current = null;
    const drawing = drawingRef.current;
    drawingRef.current = null;
    setActiveDrawing(null);

    if (drawing.type === "stroke" && drawing.points.length < MIN_STROKE_POINTS) {
      logDrawDebug(`draw commit skipped reason=tooShort points=${drawing.points.length / 2}`);
      return true;
    }
    // Apply Chaikin post-process smoothing for animation drawing strokes
    if (drawing.type === "stroke" && drawingModeSnap) {
      drawing.points = chaikinSmooth(drawing.points, 3);
      logDrawDebug(`draw chaikin smooth outputPoints=${drawing.points.length / 2}`);
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
      onSubToolChange?.("select");
      if (newId) onSelectedDrawingIdsChange?.([newId]);
      return true;
    } else {
      logDrawDebug(`draw commit points=${drawing.points.length / 2} tension=${drawing.tension ?? 0.3}`);
    }

    onAddDrawing?.(drawing);
    return true;
  }, [onAddDrawing, onRemoveDrawing, onRemoveMultipleDrawings, clearGuides, drawingModeSnap, drawings]);

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
