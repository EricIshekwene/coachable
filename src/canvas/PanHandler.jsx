import React, { useRef, useState } from "react";

// PanHandler: Handles camera panning based on tool mode.
// - Only pans on empty space (DraggableItem stops propagation).
// - Updates camera {x,y,zoom}. No item logic.
export default function PanHandler({ tool, camera, setCamera, onCanvasAddPlayer, children }) {
  const draggingRef = useRef(false);
  const pointerIdRef = useRef(null);
  const lastPtRef = useRef({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const onPointerDown = (e) => {
    const isAddTool = tool === "addPlayer" || tool === "color";
    if (isAddTool) {
      if (e.button !== 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const scale = camera.zoom || 1;
      const worldX = (sx - cx - camera.x) / scale;
      const worldY = (sy - cy - camera.y) / scale;
      onCanvasAddPlayer?.({ x: worldX, y: worldY, source: tool });
      return;
    }
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
      style={{
        cursor:
          tool === "hand"
            ? isPanning
              ? "grabbing"
              : "grab"
            : tool === "addPlayer" || tool === "color"
              ? "copy"
              : "default",
      }}
    >
      {children}
    </div>
  );
}
