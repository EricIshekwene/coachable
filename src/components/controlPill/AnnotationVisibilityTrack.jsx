import { useRef, useCallback } from "react";
import { MIN_DRAWING_WINDOW_MS } from "../../features/slate/utils/drawingTiming";

// Mirrors the coordinate system used by TimeBar / StepTrack.
const TRACK_VISUAL_START_PERCENT = 3;
const TRACK_VISUAL_SPAN_PERCENT = 94;
const BODY_DRAG_THRESHOLD_PX = 5;

/**
 * AnnotationVisibilityTrack — horizontal lane showing a resizable/draggable
 * block per *selected* annotation drawing. Each block represents the
 * `visibleStartMs` / `visibleEndMs` window during which the annotation is
 * rendered.
 *
 * Behaves like {@link StepTrack} but:
 * - reads/writes `visibleStartMs` / `visibleEndMs` (not `stepStartMs`/`stepEndMs`)
 * - imposes no entity-attachment / step-ordering constraints — annotations
 *   may overlap each other freely on the same play timeline
 * - draws a small "Note" label per block; styling tries to be visually
 *   distinct from the motion step blocks so the two systems don't get
 *   confused at a glance
 *
 * Drag / resize emits no-history updates during the gesture, wrapped in one
 * onBeginHistoryGroup/onEndHistoryGroup pair so the whole drag collapses
 * into a single undo entry.
 *
 * @param {{
 *   drawings: object[],               // selected annotation drawings
 *   durationMs: number,
 *   currentTimeMs?: number,
 *   onUpdateDrawing: (id: string, patch: object) => void,
 *   onUpdateDrawingNoHistory?: (id: string, patch: object) => void,
 *   onBeginHistoryGroup?: () => void,
 *   onEndHistoryGroup?: () => void,
 *   onSeek?: (timeMs: number) => void,
 * }} props
 */
export default function AnnotationVisibilityTrack({
  drawings,
  durationMs,
  onUpdateDrawing,
  onUpdateDrawingNoHistory,
  onBeginHistoryGroup,
  onEndHistoryGroup,
  onSeek,
}) {
  const lanes = (drawings || [])
    .filter((d) => d?.kind === "annotation" || (!d?.kind && !d?.attachedEntityId && !d?.attachedPlayerId))
    .map((d, i) => ({
      drawing: d,
      laneIndex: i,
      startMs: Number.isFinite(d.visibleStartMs) ? d.visibleStartMs : 0,
      endMs: Number.isFinite(d.visibleEndMs) ? d.visibleEndMs : durationMs,
    }));

  const containerRef = useRef(null);
  // { id, pointerId, type: "left-edge"|"right-edge"|"body", offsetMs, groupOpen }
  const dragRef = useRef(null);
  // { id, pointerId, startClientX, offsetMs } while disambiguating click vs drag
  const bodyPressRef = useRef(null);
  const scrubRef = useRef(null);

  const ensureHistoryGroupOpen = useCallback(() => {
    const drag = dragRef.current;
    if (!drag || drag.groupOpen) return;
    onBeginHistoryGroup?.();
    drag.groupOpen = true;
  }, [onBeginHistoryGroup]);

  const closeHistoryGroupIfOpen = useCallback(() => {
    const drag = dragRef.current;
    if (drag?.groupOpen) {
      onEndHistoryGroup?.();
      drag.groupOpen = false;
    }
  }, [onEndHistoryGroup]);

  const applyVisibilityPatch = useCallback((id, patch) => {
    const update = onUpdateDrawingNoHistory || onUpdateDrawing;
    update?.(id, patch);
  }, [onUpdateDrawing, onUpdateDrawingNoHistory]);

  const timeFromClientX = useCallback(
    (clientX) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return 0;
      const relX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const pct = (relX / rect.width) * 100;
      const t = Math.max(0, Math.min(1, (pct - TRACK_VISUAL_START_PERCENT) / TRACK_VISUAL_SPAN_PERCENT));
      return t * durationMs;
    },
    [durationMs]
  );

  const startBodyDrag = useCallback((lane, pointerId, clientX) => {
    const offsetMs = timeFromClientX(clientX) - lane.startMs;
    dragRef.current = { id: lane.drawing.id, pointerId, type: "body", offsetMs, groupOpen: false };
    bodyPressRef.current = null;
  }, [timeFromClientX]);

  const handlePointerDown = useCallback((e, lane, type) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (type === "body") {
      bodyPressRef.current = {
        id: lane.drawing.id,
        pointerId: e.pointerId,
        startClientX: e.clientX,
      };
      dragRef.current = null;
      return;
    }
    dragRef.current = { id: lane.drawing.id, pointerId: e.pointerId, type, offsetMs: 0, groupOpen: false };
    bodyPressRef.current = null;
  }, []);

  const handlePointerMove = useCallback((e, lane) => {
    const bodyPress = bodyPressRef.current;
    if (bodyPress && bodyPress.id === lane.drawing.id && bodyPress.pointerId === e.pointerId) {
      const deltaPx = Math.abs(e.clientX - bodyPress.startClientX);
      if (deltaPx >= BODY_DRAG_THRESHOLD_PX) {
        startBodyDrag(lane, e.pointerId, e.clientX);
      } else {
        return;
      }
    }

    const drag = dragRef.current;
    if (!drag || drag.id !== lane.drawing.id || drag.pointerId !== e.pointerId) return;
    const timeMs = timeFromClientX(e.clientX);
    const startMs = lane.startMs;
    const endMs = lane.endMs;
    const spanMs = endMs - startMs;

    ensureHistoryGroupOpen();

    if (drag.type === "right-edge") {
      const newEnd = Math.round(Math.min(durationMs, Math.max(startMs + MIN_DRAWING_WINDOW_MS, timeMs)));
      applyVisibilityPatch(lane.drawing.id, { visibleEndMs: newEnd });
    } else if (drag.type === "left-edge") {
      const newStart = Math.round(Math.max(0, Math.min(endMs - MIN_DRAWING_WINDOW_MS, timeMs)));
      applyVisibilityPatch(lane.drawing.id, { visibleStartMs: newStart });
    } else if (drag.type === "body") {
      const targetStart = Math.round(Math.max(0, Math.min(durationMs - spanMs, timeMs - drag.offsetMs)));
      applyVisibilityPatch(lane.drawing.id, {
        visibleStartMs: targetStart,
        visibleEndMs: targetStart + spanMs,
      });
    }
  }, [durationMs, timeFromClientX, applyVisibilityPatch, ensureHistoryGroupOpen, startBodyDrag]);

  const handlePointerUp = useCallback((e, lane) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    const bodyPress = bodyPressRef.current;
    if (bodyPress && bodyPress.id === lane.drawing.id && bodyPress.pointerId === e.pointerId) {
      bodyPressRef.current = null;
      closeHistoryGroupIfOpen();
      dragRef.current = null;
      onSeek?.(Math.round(timeFromClientX(e.clientX)));
      return;
    }
    if (!dragRef.current || dragRef.current.id !== lane.drawing.id || dragRef.current.pointerId !== e.pointerId) return;
    closeHistoryGroupIfOpen();
    dragRef.current = null;
    bodyPressRef.current = null;
  }, [timeFromClientX, onSeek, closeHistoryGroupIfOpen]);

  const handleContainerPointerDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    scrubRef.current = { pointerId: e.pointerId };
    containerRef.current?.setPointerCapture(e.pointerId);
    onSeek?.(Math.round(timeFromClientX(e.clientX)));
  }, [timeFromClientX, onSeek]);

  const handleContainerPointerMove = useCallback((e) => {
    if (!scrubRef.current || scrubRef.current.pointerId !== e.pointerId) return;
    onSeek?.(Math.round(timeFromClientX(e.clientX)));
  }, [timeFromClientX, onSeek]);

  const handleContainerPointerUp = useCallback((e) => {
    if (!scrubRef.current || scrubRef.current.pointerId !== e.pointerId) return;
    containerRef.current?.releasePointerCapture(e.pointerId);
    scrubRef.current = null;
  }, []);

  if (!lanes.length) return null;

  // Stack lanes vertically so multi-select doesn't overlap. Each lane is
  // LANE_HEIGHT tall with LANE_GAP between rows; the container grows to fit.
  const LANE_HEIGHT = 18;
  const LANE_GAP = 2;
  const TOP_PADDING = 2;
  const containerHeight = TOP_PADDING * 2 + lanes.length * LANE_HEIGHT + Math.max(0, lanes.length - 1) * LANE_GAP;

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none touch-none"
      style={{ height: containerHeight, cursor: "pointer" }}
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
      onPointerCancel={handleContainerPointerUp}
    >
      {lanes.map((lane, rowIndex) => {
        const leftPct = TRACK_VISUAL_START_PERCENT + (lane.startMs / durationMs) * TRACK_VISUAL_SPAN_PERCENT;
        const widthPct = ((lane.endMs - lane.startMs) / durationMs) * TRACK_VISUAL_SPAN_PERCENT;
        const top = TOP_PADDING + rowIndex * (LANE_HEIGHT + LANE_GAP);
        // Visually distinct from motion step blocks: cool/cyan vs warm/orange.
        const color = "#7AD3FF";
        const labelText = lane.drawing.type === "text"
          ? (lane.drawing.text ? `"${String(lane.drawing.text).slice(0, 16)}"` : "Text")
          : lane.drawing.type === "shape"
            ? "Shape"
            : lane.drawing.type === "arrow"
              ? "Arrow"
              : "Note";

        return (
          <div
            key={lane.drawing.id}
            className="absolute touch-none"
            style={{
              left: `${leftPct}%`,
              width: `${Math.max(0, widthPct)}%`,
              top,
              height: LANE_HEIGHT,
              backgroundColor: color + "28",
              border: `1px dashed ${color}90`,
              borderRadius: 4,
              cursor: "grab",
              overflow: "hidden",
            }}
            onPointerDown={(e) => handlePointerDown(e, lane, "body")}
            onPointerMove={(e) => handlePointerMove(e, lane)}
            onPointerUp={(e) => handlePointerUp(e, lane)}
            onPointerCancel={(e) => handlePointerUp(e, lane)}
          >
            <span
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-DmSans font-medium pointer-events-none truncate"
              style={{ color, maxWidth: "calc(100% - 20px)" }}
            >
              {labelText}
            </span>

            <div
              className="absolute left-0 top-0 bottom-0 touch-none"
              style={{
                width: 8,
                cursor: "ew-resize",
                backgroundColor: color + "90",
                borderRadius: "3px 0 0 3px",
              }}
              onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, lane, "left-edge"); }}
              onPointerMove={(e) => handlePointerMove(e, lane)}
              onPointerUp={(e) => handlePointerUp(e, lane)}
              onPointerCancel={(e) => handlePointerUp(e, lane)}
            />

            <div
              className="absolute right-0 top-0 bottom-0 touch-none"
              style={{
                width: 8,
                cursor: "ew-resize",
                backgroundColor: color + "90",
                borderRadius: "0 3px 3px 0",
              }}
              onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, lane, "right-edge"); }}
              onPointerMove={(e) => handlePointerMove(e, lane)}
              onPointerUp={(e) => handlePointerUp(e, lane)}
              onPointerCancel={(e) => handlePointerUp(e, lane)}
            />
          </div>
        );
      })}
    </div>
  );
}
