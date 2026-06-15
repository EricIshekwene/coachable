import { useRef, useCallback } from "react";
import { getStepColor } from "../../../../utils/stepColor";
import {
  TRACK_SNAP_THRESHOLD_PX,
  pxToMs,
  snapTimeMs,
  snapBodyStartMs,
} from "./trackSnap";

// Mirrors the coordinate system used by TimeBar
const TRACK_VISUAL_START_PERCENT = 3;
const TRACK_VISUAL_SPAN_PERCENT = 94;

const MIN_STEP_MS = 500;
const BODY_DRAG_THRESHOLD_PX = 5;

/**
 * StepTrack — horizontal lane showing one resizable/draggable block per coaching-draw path.
 *
 * Each block spans from `drawing.stepStartMs` (default 0) to `drawing.stepEndMs` (default durationMs).
 * - Left edge: drag to trim the start time
 * - Right edge: drag to trim the end time
 * - Body: drag to reposition the block across the timeline
 * - Empty space: click/drag to scrub (seek) the animation timeline
 *
 * @param {{
 *   drawings: object[],
 *   durationMs: number,
 *   currentTimeMs: number,
 *   onUpdateDrawing: (id: string, patch: object) => void,
 *   onUpdateDrawingNoHistory?: (id: string, patch: object) => void,
 *   onBeginHistoryGroup?: () => void,
 *   onEndHistoryGroup?: () => void,
 *   onSeek: (timeMs: number) => void,
 *   playersById: object,
 *   snapTargetsMs?: number[],
 * }} props
 */
export default function StepTrack({
  drawings,
  durationMs,
  currentTimeMs = 0,
  onUpdateDrawing,
  onUpdateDrawingNoHistory,
  onBeginHistoryGroup,
  onEndHistoryGroup,
  onSeek,
  playersById,
  snapTargetsMs,
}) {
  // Motion-only. Accepts both v3 (`kind === "motion"`) and legacy v2
  // (`source === "coaching-draw"`) drawings. Annotations are rejected.
  const steps = (drawings || [])
    .filter((d) => {
      if (d?.kind === "annotation") return false;
      const isMotion = d?.kind === "motion" || d?.source === "coaching-draw";
      const entityId = d?.attachedEntityId || d?.attachedPlayerId;
      return isMotion && Boolean(entityId);
    })
    .sort((a, b) => (a.stepStartMs ?? 0) - (b.stepStartMs ?? 0));

  const containerRef = useRef(null);
  // { id, pointerId, type: "left-edge"|"right-edge"|"body", offsetMs, groupOpen }
  const dragRef = useRef(null);
  // { id, pointerId, startClientX, offsetMs } while deciding whether a body press is a click or a drag
  const bodyPressRef = useRef(null);
  // { pointerId } when scrubbing empty space
  const scrubRef = useRef(null);

  /** Open a history group for the current drag if one is not already open. */
  const ensureHistoryGroupOpen = useCallback(() => {
    const drag = dragRef.current;
    if (!drag || drag.groupOpen) return;
    onBeginHistoryGroup?.();
    drag.groupOpen = true;
  }, [onBeginHistoryGroup]);

  /** Close the history group if open. Called on pointer up / cancel. */
  const closeHistoryGroupIfOpen = useCallback(() => {
    const drag = dragRef.current;
    if (drag?.groupOpen) {
      onEndHistoryGroup?.();
      drag.groupOpen = false;
    }
  }, [onEndHistoryGroup]);

  /** Apply a step patch — uses no-history during drag, falls back to history-pushing update otherwise. */
  const applyStepPatch = useCallback((id, patch) => {
    const update = onUpdateDrawingNoHistory || onUpdateDrawing;
    update?.(id, patch);
  }, [onUpdateDrawing, onUpdateDrawingNoHistory]);

  /** Convert a clientX position into a timeline millisecond value. */
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

  // --- Block drag handlers ---

  const startBodyDrag = useCallback((step, pointerId, clientX) => {
    const startMs = step.stepStartMs ?? 0;
    const offsetMs = timeFromClientX(clientX) - startMs;
    dragRef.current = { id: step.id, pointerId, type: "body", offsetMs, groupOpen: false };
    bodyPressRef.current = null;
  }, [timeFromClientX]);

  const handlePointerDown = useCallback((e, step, type) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (type === "body") {
      bodyPressRef.current = {
        id: step.id,
        pointerId: e.pointerId,
        startClientX: e.clientX,
      };
      dragRef.current = null;
      return;
    }
    // Edge-handle drags begin immediately — no click-vs-drag disambiguation.
    dragRef.current = { id: step.id, pointerId: e.pointerId, type, offsetMs: 0, groupOpen: false };
    bodyPressRef.current = null;
  }, []);

  const handlePointerMove = useCallback((e, step) => {
    const bodyPress = bodyPressRef.current;
    if (bodyPress && bodyPress.id === step.id && bodyPress.pointerId === e.pointerId) {
      const deltaPx = Math.abs(e.clientX - bodyPress.startClientX);
      if (deltaPx >= BODY_DRAG_THRESHOLD_PX) {
        startBodyDrag(step, e.pointerId, e.clientX);
      } else {
        return;
      }
    }

    const drag = dragRef.current;
    if (!drag || drag.id !== step.id || drag.pointerId !== e.pointerId) return;
    const timeMs = timeFromClientX(e.clientX);
    const startMs = step.stepStartMs ?? 0;
    const endMs = step.stepEndMs ?? durationMs;
    const spanMs = endMs - startMs;

    // Collision bounds from neighbouring steps (steps is sorted by stepStartMs).
    const idx = steps.findIndex((s) => s.id === step.id);
    const prevEnd = idx > 0 ? (steps[idx - 1].stepEndMs ?? durationMs) : 0;
    const nextStart = idx < steps.length - 1 ? (steps[idx + 1].stepStartMs ?? durationMs) : durationMs;

    // Open the history group on the first actual update of this drag, so
    // dozens of pointer-move emissions collapse into one undo entry.
    ensureHistoryGroupOpen();

    // Snap targets — pixel radius converted to ms using this lane's width.
    // We deliberately do NOT remove this bar's own edges from the target list.
    // Keeping them in produces a stable "deadband" at the current position
    // (small mouse movement → no change); removing them caused frame-to-frame
    // ping-pong whenever a neighbour bar shared an edge value with ours.
    const containerWidthPx = containerRef.current?.getBoundingClientRect().width ?? 0;
    const thresholdMs = pxToMs(TRACK_SNAP_THRESHOLD_PX, containerWidthPx, durationMs);
    const targets = snapTargetsMs;

    if (drag.type === "right-edge") {
      const snapped = snapTimeMs(timeMs, targets, thresholdMs);
      const newEnd = Math.round(Math.min(nextStart, Math.max(startMs + MIN_STEP_MS, snapped)));
      applyStepPatch(step.id, { stepEndMs: newEnd });
    } else if (drag.type === "left-edge") {
      const snapped = snapTimeMs(timeMs, targets, thresholdMs);
      const newStart = Math.round(Math.max(prevEnd, Math.min(endMs - MIN_STEP_MS, snapped)));
      applyStepPatch(step.id, { stepStartMs: newStart });
    } else if (drag.type === "body") {
      const rawStart = timeMs - drag.offsetMs;
      const snappedStart = snapBodyStartMs(rawStart, spanMs, targets, thresholdMs);
      const newStart = Math.round(Math.max(prevEnd, Math.min(nextStart - spanMs, snappedStart)));
      applyStepPatch(step.id, { stepStartMs: newStart, stepEndMs: newStart + spanMs });
    }
  }, [durationMs, timeFromClientX, applyStepPatch, ensureHistoryGroupOpen, startBodyDrag, steps, snapTargetsMs]);

  const handlePointerUp = useCallback((e, step) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    const bodyPress = bodyPressRef.current;
    if (bodyPress && bodyPress.id === step.id && bodyPress.pointerId === e.pointerId) {
      bodyPressRef.current = null;
      closeHistoryGroupIfOpen();
      dragRef.current = null;
      onSeek?.(Math.round(timeFromClientX(e.clientX)));
      return;
    }
    if (!dragRef.current || dragRef.current.id !== step.id || dragRef.current.pointerId !== e.pointerId) return;
    closeHistoryGroupIfOpen();
    dragRef.current = null;
    bodyPressRef.current = null;
  }, [timeFromClientX, onSeek, closeHistoryGroupIfOpen]);

  // --- Empty-space scrub handlers ---

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

  if (!steps.length) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none touch-none"
      style={{ height: 26, cursor: "pointer" }}
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
      onPointerCancel={handleContainerPointerUp}
    >

      {steps.map((step, i) => {
        const startMs = step.stepStartMs ?? 0;
        const endMs = step.stepEndMs ?? durationMs;
        const leftPct = TRACK_VISUAL_START_PERCENT + (startMs / durationMs) * TRACK_VISUAL_SPAN_PERCENT;
        const widthPct = ((endMs - startMs) / durationMs) * TRACK_VISUAL_SPAN_PERCENT;
        const entityId = step.attachedEntityId || step.attachedPlayerId;
        const player = playersById?.[entityId];
        const baseColor = player?.color ?? "#FF7A18";
        const color = step.color ?? getStepColor(baseColor, step.stepIndex ?? i);
        // Player identity prefix: prefer the explicit name, then the
        // number/position label, then a generic "Player" fallback. Empty /
        // whitespace-only number strings (football default) are skipped.
        const rawNumber = player?.number;
        const numberText = rawNumber != null ? String(rawNumber).trim() : "";
        const playerLabel = player?.name
          ? player.name
          : numberText
          ? numberText
          : "Player";
        // Step number is 1-based and shown after the player label, e.g.
        // "RB #1", "Smith #2". This makes each lane visually self-describing
        // when a single player has multiple chained steps.
        const stepNum = (step.stepIndex ?? i) + 1;
        const label = `${playerLabel} #${stepNum}`;

        return (
          <div
            key={step.id}
            className="absolute touch-none"
            style={{
              left: `${leftPct}%`,
              width: `${Math.max(0, widthPct)}%`,
              top: 2,
              height: 18,
              backgroundColor: color + "28",
              border: `1px solid ${color}60`,
              borderRadius: 4,
              cursor: "grab",
              overflow: "hidden",
            }}
            onPointerDown={(e) => handlePointerDown(e, step, "body")}
            onPointerMove={(e) => handlePointerMove(e, step)}
            onPointerUp={(e) => handlePointerUp(e, step)}
            onPointerCancel={(e) => handlePointerUp(e, step)}
          >
            {/* Player label */}
            <span
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-DmSans font-medium pointer-events-none truncate"
              style={{ color, maxWidth: "calc(100% - 20px)" }}
            >
              {label}
            </span>

            {/* Left-edge drag handle */}
            <div
              className="absolute left-0 top-0 bottom-0 touch-none"
              style={{
                width: 8,
                cursor: "ew-resize",
                backgroundColor: color + "90",
                borderRadius: "3px 0 0 3px",
              }}
              onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, step, "left-edge"); }}
              onPointerMove={(e) => handlePointerMove(e, step)}
              onPointerUp={(e) => handlePointerUp(e, step)}
              onPointerCancel={(e) => handlePointerUp(e, step)}
            />

            {/* Right-edge drag handle */}
            <div
              className="absolute right-0 top-0 bottom-0 touch-none"
              style={{
                width: 8,
                cursor: "ew-resize",
                backgroundColor: color + "90",
                borderRadius: "0 3px 3px 0",
              }}
              onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, step, "right-edge"); }}
              onPointerMove={(e) => handlePointerMove(e, step)}
              onPointerUp={(e) => handlePointerUp(e, step)}
              onPointerCancel={(e) => handlePointerUp(e, step)}
            />
          </div>
        );
      })}
    </div>
  );
}
