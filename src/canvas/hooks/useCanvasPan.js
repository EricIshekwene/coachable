import { useRef, useState } from "react";

/**
 * useCanvasPan
 *
 * Handles pointer-based canvas panning (left-mouse drag in hand tool, or middle-mouse
 * drag in any tool). Returns event handlers to attach to the Konva Stage and the
 * current isPanning state for cursor management.
 *
 * Invariant: only one pointer can pan at a time (tracked by pointerId).
 */
export function useCanvasPan({ tool, stageRef, onPanStart, setCamera }) {
  const panRef = useRef({
    active: false,
    pointerId: null,
    last: { x: 0, y: 0 },
  });
  const [isPanning, setIsPanning] = useState(false);

  // Returns true if this pointer-down should start a pan
  const shouldStartPan = (evt, target) => {
    const isMiddleMouse = evt?.button === 1;
    const isPrimaryButton = evt?.button === 0 || evt?.button === undefined;
    const stage = stageRef.current;
    if (target !== stage) return false;
    if (isMiddleMouse) return true;
    if (tool === "hand" && isPrimaryButton) return true;
    return false;
  };

  const handlePointerDown = (e, { isMarqueeActive } = {}) => {
    if (isMarqueeActive) return false;
    const evt = e.evt;
    const isMiddleMouse = evt?.button === 1;
    if (!shouldStartPan(evt, e.target)) return false;

    panRef.current.active = true;
    panRef.current.pointerId = evt?.pointerId ?? "mouse";
    panRef.current.last = { x: evt?.clientX ?? 0, y: evt?.clientY ?? 0 };
    setIsPanning(true);
    onPanStart?.();
    if (isMiddleMouse) evt?.preventDefault?.();
    return true;
  };

  const handlePointerMove = (e) => {
    if (!panRef.current.active) return;
    const evt = e.evt;
    if (panRef.current.pointerId !== (evt?.pointerId ?? "mouse")) return;
    const dx = (evt?.clientX ?? 0) - panRef.current.last.x;
    const dy = (evt?.clientY ?? 0) - panRef.current.last.y;
    panRef.current.last = { x: evt?.clientX ?? 0, y: evt?.clientY ?? 0 };
    setCamera((prev) => ({ ...prev, x: (prev?.x || 0) + dx, y: (prev?.y || 0) + dy }));
  };

  const handlePointerUp = (e) => {
    if (!panRef.current.active) return false;
    const evt = e.evt;
    if (panRef.current.pointerId !== (evt?.pointerId ?? "mouse")) return false;
    panRef.current.active = false;
    panRef.current.pointerId = null;
    setIsPanning(false);
    return true;
  };

  const isPanActive = () => panRef.current.active;

  return {
    panRef,
    isPanning,
    isPanActive,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}

export default useCanvasPan;
