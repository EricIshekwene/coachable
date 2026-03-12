import { useRef, useState, useCallback, useMemo } from "react";
import {
  getDrawingWorldBounds,
  getSelectionBounds,
  rectsIntersect,
  hitTestDrawings,
  getResizeHandles,
  hitTestHandle,
  getRotateHandlePosition,
  hitTestRotateHandle,
  computeResizedBounds,
  applyTranslation,
  applyResize,
  applyRotation,
  getArrowEndpointHandles,
  hitTestEndpointHandle,
  HANDLE_CURSORS,
} from "../drawingGeometry";
import { log as logDrawDebug } from "../drawDebugLogger";

const MOVE_THRESHOLD = 2; // px in world coords
const MARQUEE_THRESHOLD = 3;
const RESIZE_HANDLE_HIT_PADDING_PX = 16;

/**
 * Manages multi-selection, marquee, move, resize, and rotate gestures for drawings.
 * Replaces the single-select logic that was previously in useCanvasDrawing.
 */
const DBLCLICK_MS = 400;

export function useDrawingSelection({
  drawings,
  toWorldCoords,
  stageRef,
  selectedDrawingIds,
  onSelectedDrawingIdsChange,
  onUpdateMultipleNoHistory,
  historyApiRef,
  zoom,
  onEditText,
  // Snap support
  fieldBounds,
  drawGuides,
  clearGuides,
  guidelineOffsetWorld,
}) {
  // --- Refs for gesture state (no re-renders per frame) ---
  const gestureRef = useRef(null);
  const marqueeRef = useRef(null);
  const lastClickRef = useRef({ id: null, time: 0 });

  // --- React state for rendering ---
  const [drawingMarquee, setDrawingMarquee] = useState(null);

  // --- Derived / memoized ---
  const selectionBounds = useMemo(
    () => getSelectionBounds(drawings, selectedDrawingIds),
    [drawings, selectedDrawingIds]
  );

  const handleSize = 8 / (zoom || 1);
  const selectionPadding = 4 / (zoom || 1);
  const handleHitPadding = RESIZE_HANDLE_HIT_PADDING_PX / (zoom || 1);

  const handles = useMemo(
    () => (selectionBounds ? getResizeHandles(selectionBounds, handleSize, selectionPadding) : []),
    [selectionBounds, handleSize, selectionPadding]
  );

  const rotateHandlePos = useMemo(
    () => getRotateHandlePosition(selectionBounds, zoom),
    [selectionBounds, zoom]
  );

  // Arrow endpoint handles (only when exactly 1 arrow is selected)
  const arrowEndpointHandles = useMemo(() => {
    if (selectedDrawingIds.length !== 1) return [];
    const selD = drawings.find((d) => d.id === selectedDrawingIds[0]);
    if (!selD || selD.type !== "arrow") return [];
    return getArrowEndpointHandles(selD, handleSize * 1.5);
  }, [drawings, selectedDrawingIds, handleSize]);

  // --- Snapshot helpers ---
  const snapshotSelected = useCallback(() => {
    const idSet = new Set(selectedDrawingIds);
    const map = new Map();
    for (const d of drawings) {
      if (idSet.has(d.id)) {
        map.set(d.id, { ...d, points: d.points ? [...d.points] : undefined });
      }
    }
    return map;
  }, [drawings, selectedDrawingIds]);

  // --- Snap helpers for drawing move ---
  const getDrawingSnapStops = useCallback(() => {
    const vertical = [0]; // world center
    const horizontal = [0];
    if (fieldBounds) {
      vertical.push(fieldBounds.left, fieldBounds.right, fieldBounds.centerX);
      horizontal.push(fieldBounds.top, fieldBounds.bottom, fieldBounds.centerY);
    }
    return {
      vertical: [...new Set(vertical)],
      horizontal: [...new Set(horizontal)],
    };
  }, [fieldBounds]);

  const getDrawingSnapEdges = useCallback((bounds) => {
    if (!bounds) return { vertical: [], horizontal: [] };
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    return {
      vertical: [
        { guide: bounds.x, offset: bounds.x - cx, snap: "left" },
        { guide: cx, offset: 0, snap: "center" },
        { guide: bounds.x + bounds.width, offset: bounds.x + bounds.width - cx, snap: "right" },
      ],
      horizontal: [
        { guide: bounds.y, offset: bounds.y - cy, snap: "top" },
        { guide: cy, offset: 0, snap: "center" },
        { guide: bounds.y + bounds.height, offset: bounds.y + bounds.height - cy, snap: "bottom" },
      ],
    };
  }, []);

  const findSnapGuides = useCallback((stops, edges, tolerance) => {
    const result = [];
    let closestV = null;
    stops.vertical.forEach((lineGuide) => {
      edges.vertical.forEach((edge) => {
        const diff = Math.abs(lineGuide - edge.guide);
        if (diff > tolerance) return;
        if (!closestV || diff < closestV.diff) {
          closestV = { lineGuide, diff, offset: edge.offset, snap: edge.snap };
        }
      });
    });
    let closestH = null;
    stops.horizontal.forEach((lineGuide) => {
      edges.horizontal.forEach((edge) => {
        const diff = Math.abs(lineGuide - edge.guide);
        if (diff > tolerance) return;
        if (!closestH || diff < closestH.diff) {
          closestH = { lineGuide, diff, offset: edge.offset, snap: edge.snap };
        }
      });
    });
    if (closestV) result.push({ orientation: "V", lineGuide: closestV.lineGuide, offset: closestV.offset, snap: closestV.snap });
    if (closestH) result.push({ orientation: "H", lineGuide: closestH.lineGuide, offset: closestH.offset, snap: closestH.snap });
    return result;
  }, []);

  // --- Pointer Handlers ---

  const handleSelectPointerDown = useCallback(
    (e) => {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition?.();
      if (!pointer) return false;
      const world = toWorldCoords(pointer);
      const evt = e.evt || e;
      const shiftKey = evt?.shiftKey || false;

      // 0. Hit-test arrow endpoint handles (before resize handles)
      if (arrowEndpointHandles.length > 0) {
        const hitEndpoint = hitTestEndpointHandle(arrowEndpointHandles, world);
        if (hitEndpoint) {
          historyApiRef.current?.pushHistory?.();
          gestureRef.current = {
            type: "endpoint",
            endpointPosition: hitEndpoint,
            startWorld: { ...world },
            startDrawingsSnapshot: snapshotSelected(),
            ids: [...selectedDrawingIds],
          };
          logDrawDebug(`selection endpoint start endpoint=${hitEndpoint}`);
          return true;
        }
      }

      // 1. Hit-test resize handles
      if (selectedDrawingIds.length > 0 && selectionBounds) {
        const hitHandle = hitTestHandle(handles, world, handleHitPadding);
        if (hitHandle) {
          historyApiRef.current?.pushHistory?.();
          gestureRef.current = {
            type: "resize",
            handlePosition: hitHandle,
            startWorld: { ...world },
            startBounds: { ...selectionBounds },
            startDrawingsSnapshot: snapshotSelected(),
            ids: [...selectedDrawingIds],
          };
          logDrawDebug(`selection resize start handle=${hitHandle}`);
          return true;
        }

        // 2. Hit-test rotate handle
        if (hitTestRotateHandle(rotateHandlePos, world, zoom)) {
          historyApiRef.current?.pushHistory?.();
          const center = {
            x: selectionBounds.x + selectionBounds.width / 2,
            y: selectionBounds.y + selectionBounds.height / 2,
          };
          const startAngle = Math.atan2(world.y - center.y, world.x - center.x);
          gestureRef.current = {
            type: "rotate",
            startWorld: { ...world },
            startBounds: { ...selectionBounds },
            startDrawingsSnapshot: snapshotSelected(),
            ids: [...selectedDrawingIds],
            center,
            startAngle,
          };
          logDrawDebug(`selection rotate start`);
          return true;
        }
      }

      // 3. Hit-test drawings
      const hitId = hitTestDrawings(drawings, world, 10);

      if (hitId) {
        // Double-click detection for inline text editing
        const now = Date.now();
        const last = lastClickRef.current;
        if (
          hitId === last.id &&
          now - last.time < DBLCLICK_MS
        ) {
          const hitDrawing = drawings.find((dd) => dd.id === hitId);
          if (hitDrawing?.type === "text" && onEditText) {
            onEditText(hitDrawing);
            lastClickRef.current = { id: null, time: 0 };
            return true;
          }
        }
        lastClickRef.current = { id: hitId, time: now };

        let nextIds;
        if (shiftKey) {
          nextIds = selectedDrawingIds.includes(hitId)
            ? selectedDrawingIds.filter((id) => id !== hitId)
            : [...selectedDrawingIds, hitId];
        } else if (!selectedDrawingIds.includes(hitId)) {
          nextIds = [hitId];
        } else {
          nextIds = selectedDrawingIds; // already selected, keep group
        }
        onSelectedDrawingIdsChange(nextIds);

        // Start move gesture (use nextIds for snapshotting)
        historyApiRef.current?.pushHistory?.();
        const moveIds = nextIds;
        const idSet = new Set(moveIds);
        const snap = new Map();
        for (const d of drawings) {
          if (idSet.has(d.id)) {
            snap.set(d.id, { ...d, points: d.points ? [...d.points] : undefined });
          }
        }
        // Compute initial bounds from snapshot for snap
        const moveBounds = getSelectionBounds(Array.from(snap.values()), moveIds);
        gestureRef.current = {
          type: "move",
          startWorld: { ...world },
          startDrawingsSnapshot: snap,
          ids: moveIds,
          startBoundsForSnap: moveBounds ? { ...moveBounds } : null,
        };
        logDrawDebug(`selection move start hitId=${hitId} count=${moveIds.length}`);
        return true;
      }

      // 4. Nothing hit — start marquee or clear
      if (!shiftKey) {
        onSelectedDrawingIdsChange([]);
      }
      marqueeRef.current = { start: { ...world }, shiftKey };
      logDrawDebug(`selection marquee start x=${world.x.toFixed(1)} y=${world.y.toFixed(1)}`);
      return true;
    },
    [
      stageRef, toWorldCoords, drawings, selectedDrawingIds, selectionBounds,
      handles, rotateHandlePos, arrowEndpointHandles, zoom, historyApiRef,
      onSelectedDrawingIdsChange, snapshotSelected, handleHitPadding,
    ]
  );

  const handleSelectPointerMove = useCallback(
    (e) => {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition?.();
      if (!pointer) return false;
      const world = toWorldCoords(pointer);
      const evt = e?.evt || e;

      // Marquee
      if (marqueeRef.current) {
        const start = marqueeRef.current.start;
        setDrawingMarquee({
          x: Math.min(start.x, world.x),
          y: Math.min(start.y, world.y),
          width: Math.abs(world.x - start.x),
          height: Math.abs(world.y - start.y),
        });
        return true;
      }

      // Endpoint drag (arrow)
      if (gestureRef.current?.type === "endpoint") {
        const id = gestureRef.current.ids[0];
        const snap = gestureRef.current.startDrawingsSnapshot.get(id);
        if (snap && snap.points) {
          const newPoints = [...snap.points];
          if (gestureRef.current.endpointPosition === "start") {
            newPoints[0] = world.x;
            newPoints[1] = world.y;
          } else {
            newPoints[2] = world.x;
            newPoints[3] = world.y;
          }
          const changes = new Map();
          changes.set(id, { points: newPoints });
          onUpdateMultipleNoHistory(changes);
        }
        return true;
      }

      // Move (with snap)
      if (gestureRef.current?.type === "move") {
        let dx = world.x - gestureRef.current.startWorld.x;
        let dy = world.y - gestureRef.current.startWorld.y;

        // Compute tentative bounds for snap detection
        if (drawGuides && clearGuides && guidelineOffsetWorld && selectionBounds) {
          const tentBounds = {
            x: selectionBounds.x + dx,
            y: selectionBounds.y + dy,
            width: selectionBounds.width,
            height: selectionBounds.height,
          };
          // Use start bounds shifted by current delta for snapping
          const startSnap = gestureRef.current.startBoundsForSnap;
          if (startSnap) {
            tentBounds.x = startSnap.x + dx;
            tentBounds.y = startSnap.y + dy;
            tentBounds.width = startSnap.width;
            tentBounds.height = startSnap.height;
          }
          const stops = getDrawingSnapStops();
          const edges = getDrawingSnapEdges(tentBounds);
          const guides = findSnapGuides(stops, edges, guidelineOffsetWorld);

          if (guides.length) {
            const cx = tentBounds.x + tentBounds.width / 2;
            const cy = tentBounds.y + tentBounds.height / 2;
            guides.forEach((g) => {
              if (g.orientation === "V") dx += (g.lineGuide - g.offset) - cx;
              if (g.orientation === "H") dy += (g.lineGuide - g.offset) - cy;
            });
            drawGuides(guides);
          } else {
            clearGuides();
          }
        }

        const changes = applyTranslation(
          Array.from(gestureRef.current.startDrawingsSnapshot.values()),
          gestureRef.current.ids,
          dx,
          dy
        );
        onUpdateMultipleNoHistory(changes);
        return true;
      }

      // Resize
      if (gestureRef.current?.type === "resize") {
        const dragDelta = {
          dx: world.x - gestureRef.current.startWorld.x,
          dy: world.y - gestureRef.current.startWorld.y,
        };
        const newBounds = computeResizedBounds(
          gestureRef.current.handlePosition,
          gestureRef.current.startBounds,
          dragDelta,
          { shiftKey: evt?.shiftKey, altKey: evt?.altKey }
        );
        const changes = applyResize(
          Array.from(gestureRef.current.startDrawingsSnapshot.values()),
          gestureRef.current.ids,
          gestureRef.current.startBounds,
          newBounds
        );
        onUpdateMultipleNoHistory(changes);
        return true;
      }

      // Rotate
      if (gestureRef.current?.type === "rotate") {
        const { center, startAngle } = gestureRef.current;
        let angle = Math.atan2(world.y - center.y, world.x - center.x) - startAngle;
        // Shift snaps to 15°
        if (evt?.shiftKey) {
          const snap = (Math.PI / 180) * 15;
          angle = Math.round(angle / snap) * snap;
        }
        const changes = applyRotation(
          Array.from(gestureRef.current.startDrawingsSnapshot.values()),
          gestureRef.current.ids,
          center,
          angle
        );
        onUpdateMultipleNoHistory(changes);
        return true;
      }

      return false;
    },
    [stageRef, toWorldCoords, onUpdateMultipleNoHistory]
  );

  const handleSelectPointerUp = useCallback(
    () => {
      // Marquee finish
      if (marqueeRef.current) {
        const rect = drawingMarquee;
        const shiftKey = marqueeRef.current.shiftKey;
        marqueeRef.current = null;
        setDrawingMarquee(null);

        if (rect && rect.width > MARQUEE_THRESHOLD && rect.height > MARQUEE_THRESHOLD) {
          const hitIds = drawings
            .filter((d) => rectsIntersect(getDrawingWorldBounds(d), rect))
            .map((d) => d.id);
          if (shiftKey) {
            onSelectedDrawingIdsChange([...new Set([...selectedDrawingIds, ...hitIds])]);
          } else {
            onSelectedDrawingIdsChange(hitIds);
          }
          logDrawDebug(`selection marquee end hits=${hitIds.length}`);
        } else {
          logDrawDebug(`selection marquee end below-threshold`);
        }
        return true;
      }

      // End gesture
      if (gestureRef.current) {
        const gesture = gestureRef.current;
        gestureRef.current = null;
        clearGuides?.();

        // For move: check if movement was below threshold
        if (gesture.type === "move") {
          const snap = gesture.startDrawingsSnapshot;
          // Compare first drawing's position to see if it actually moved
          let moved = false;
          for (const d of drawings) {
            const orig = snap.get(d.id);
            if (!orig) continue;
            if (d.type === "text" || d.type === "shape") {
              if (Math.abs((d.x || 0) - (orig.x || 0)) > MOVE_THRESHOLD || Math.abs((d.y || 0) - (orig.y || 0)) > MOVE_THRESHOLD) {
                moved = true;
                break;
              }
            } else if (d.points && orig.points) {
              if (
                Math.abs(d.points[0] - orig.points[0]) > MOVE_THRESHOLD ||
                Math.abs(d.points[1] - orig.points[1]) > MOVE_THRESHOLD
              ) {
                moved = true;
                break;
              }
            }
          }
          if (!moved) {
            // Restore original positions (effectively a no-op undo)
            onUpdateMultipleNoHistory(snap);
          }
        }

        logDrawDebug(`selection gesture end type=${gesture.type}`);
        return true;
      }

      return false;
    },
    [drawings, selectedDrawingIds, onSelectedDrawingIdsChange, onUpdateMultipleNoHistory, drawingMarquee]
  );

  // --- Cancel gesture (on Escape) ---
  const cancelGesture = useCallback(() => {
    if (gestureRef.current) {
      // Restore drawings to pre-gesture state
      onUpdateMultipleNoHistory(gestureRef.current.startDrawingsSnapshot);
      gestureRef.current = null;
      clearGuides?.();
      logDrawDebug("selection gesture cancelled");
    }
    if (marqueeRef.current) {
      marqueeRef.current = null;
      setDrawingMarquee(null);
      logDrawDebug("selection marquee cancelled");
    }
  }, [onUpdateMultipleNoHistory]);

  // --- Cursor ---
  const getSelectionCursor = useCallback(
    (worldPoint) => {
      if (!worldPoint) return null;
      if (gestureRef.current?.type === "move") return "grabbing";
      if (gestureRef.current?.type === "resize") {
        const pos = gestureRef.current.handlePosition;
        return HANDLE_CURSORS[pos] || "grabbing";
      }
      if (gestureRef.current?.type === "rotate") return "grabbing";
      if (gestureRef.current?.type === "endpoint") return "grabbing";
      if (marqueeRef.current) return "crosshair";

      // Arrow endpoint handles
      if (arrowEndpointHandles.length > 0) {
        const hitEndpoint = hitTestEndpointHandle(arrowEndpointHandles, worldPoint);
        if (hitEndpoint) return "crosshair";
      }

      if (selectedDrawingIds.length > 0 && selectionBounds) {
        if (hitTestRotateHandle(rotateHandlePos, worldPoint, zoom)) return "grab";
        const hitHandle = hitTestHandle(handles, worldPoint, handleHitPadding);
        if (hitHandle) return HANDLE_CURSORS[hitHandle];
      }
      const hitId = hitTestDrawings(drawings, worldPoint, 10);
      if (hitId) return "pointer";
      return null;
    },
    [drawings, selectedDrawingIds, selectionBounds, handles, rotateHandlePos, arrowEndpointHandles, zoom, handleHitPadding]
  );

  return {
    selectionBounds,
    handles,
    drawingMarquee,
    rotateHandlePos,
    handleSelectPointerDown,
    handleSelectPointerMove,
    handleSelectPointerUp,
    cancelGesture,
    getSelectionCursor,
    isGestureActive: gestureRef,
  };
}

export default useDrawingSelection;
