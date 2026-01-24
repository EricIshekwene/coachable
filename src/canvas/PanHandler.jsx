import React, { useRef, useState } from "react";

// PanHandler: Handles camera panning based on tool mode.
// - Only pans on empty space (DraggableItem stops propagation).
// - Updates camera {x,y,zoom}. No item logic.
export default function PanHandler({ tool, camera, setCamera, children }) {
  const draggingRef = useRef(false);
  const pointerIdRef = useRef(null);
  const lastPtRef = useRef({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const onPointerDown = (e) => {
    if (tool !== "hand") return;
    draggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    lastPtRef.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    if (pointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - lastPtRef.current.x;
    const dy = e.clientY - lastPtRef.current.y;
    lastPtRef.current = { x: e.clientX, y: e.clientY };

    setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  };

  const endPan = (e) => {
    if (!draggingRef.current) return;
    if (pointerIdRef.current !== e.pointerId) return;
    draggingRef.current = false;
    pointerIdRef.current = null;
    setIsPanning(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      className="absolute inset-0"
      style={{ cursor: tool === "hand" && isPanning ? "grabbing" : tool === "hand" ? "grab" : "default" }}
    >
      {children}
    </div>
  );
}

