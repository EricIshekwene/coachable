import { useRef, useCallback } from "react";

// Mirrors the coordinate system used by TimeBar
const TRACK_VISUAL_START_PERCENT = 3;
const TRACK_VISUAL_SPAN_PERCENT = 94;

const MIN_STEP_MS = 500;

/**
 * StepTrack — horizontal lane showing one resizable/draggable block per coaching-draw path.
 *
 * Each block spans from `drawing.stepStartMs` (default 0) to `drawing.stepEndMs` (default durationMs).
 * - Left edge: drag to trim the start time
 * - Right edge: drag to trim the end time
 * - Body: drag to reposition the block across the timeline
 *
 * @param {{
 *   drawings: object[],
 *   durationMs: number,
 *   onUpdateDrawing: (id: string, patch: object) => void,
 *   playersById: object,
 * }} props
 */
export default function StepTrack({ drawings, durationMs, onUpdateDrawing, playersById }) {
  const steps = (drawings || []).filter(
    (d) => d.source === "coaching-draw" && d.attachedPlayerId
  );

  const containerRef = useRef(null);
  // { id, pointerId, type: "left-edge"|"right-edge"|"body", offsetMs }
  const dragRef = useRef(null);

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

  const handlePointerDown = useCallback((e, step, type) => {
    e.preventDefault();
    e.stopPropagation();
    const startMs = step.stepStartMs ?? 0;
    const offsetMs = type === "body" ? timeFromClientX(e.clientX) - startMs : 0;
    dragRef.current = { id: step.id, pointerId: e.pointerId, type, offsetMs };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [timeFromClientX]);

  const handlePointerMove = useCallback((e, step) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== step.id) return;
    const timeMs = timeFromClientX(e.clientX);
    const startMs = step.stepStartMs ?? 0;
    const endMs = step.stepEndMs ?? durationMs;
    const spanMs = endMs - startMs;

    if (drag.type === "right-edge") {
      const newEnd = Math.round(Math.min(durationMs, Math.max(startMs + MIN_STEP_MS, timeMs)));
      onUpdateDrawing?.(step.id, { stepEndMs: newEnd });
    } else if (drag.type === "left-edge") {
      const newStart = Math.round(Math.max(0, Math.min(endMs - MIN_STEP_MS, timeMs)));
      onUpdateDrawing?.(step.id, { stepStartMs: newStart });
    } else if (drag.type === "body") {
      const newStart = Math.round(Math.max(0, Math.min(durationMs - spanMs, timeMs - drag.offsetMs)));
      onUpdateDrawing?.(step.id, { stepStartMs: newStart, stepEndMs: newStart + spanMs });
    }
  }, [durationMs, timeFromClientX, onUpdateDrawing]);

  const handlePointerUp = useCallback((e, step) => {
    if (!dragRef.current || dragRef.current.id !== step.id) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }, []);

  if (!steps.length) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ height: steps.length * 22 + 4 }}
    >
      {steps.map((step, i) => {
        const startMs = step.stepStartMs ?? 0;
        const endMs = step.stepEndMs ?? durationMs;
        const leftPct = TRACK_VISUAL_START_PERCENT + (startMs / durationMs) * TRACK_VISUAL_SPAN_PERCENT;
        const widthPct = ((endMs - startMs) / durationMs) * TRACK_VISUAL_SPAN_PERCENT;
        const player = playersById?.[step.attachedPlayerId];
        const color = player?.color ?? "#FF7A18";
        const label = player?.name
          ? player.name
          : player?.number != null
          ? `#${player.number}`
          : "Player";

        return (
          <div
            key={step.id}
            className="absolute touch-none"
            style={{
              left: `${leftPct}%`,
              width: `${Math.max(0, widthPct)}%`,
              top: i * 22 + 2,
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
