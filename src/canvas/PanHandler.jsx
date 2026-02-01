import React, { useRef, useState } from "react";

// PanHandler: Handles camera panning based on tool mode.
// - Only pans on empty space (DraggableItem stops propagation).
// - Updates camera {x,y,zoom}. No item logic.
export default function PanHandler({
  tool,
  camera,
  setCamera,
  onCanvasAddPlayer,
  items = [],
  onMarqueeSelect,
  children,
}) {
  const draggingRef = useRef(false);
  const pointerIdRef = useRef(null);
  const lastPtRef = useRef({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const selectingRef = useRef(false);
  const marqueeActiveRef = useRef(false);
  const marqueeStartRef = useRef({ x: 0, y: 0 });
  const marqueeEndRef = useRef({ x: 0, y: 0 });
  const [marquee, setMarquee] = useState(null);
  const DRAG_THRESHOLD_PX = 4;

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
    if (tool === "select") {
      if (e.button !== 0) return;
      selectingRef.current = true;
      marqueeActiveRef.current = false;
      pointerIdRef.current = e.pointerId;
      const rect = e.currentTarget.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      marqueeStartRef.current = { x: sx, y: sy };
      marqueeEndRef.current = { x: sx, y: sy };
      e.currentTarget.setPointerCapture?.(e.pointerId);
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
    if (selectingRef.current) {
      if (pointerIdRef.current !== e.pointerId) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      marqueeEndRef.current = { x: sx, y: sy };
      const totalDx = sx - marqueeStartRef.current.x;
      const totalDy = sy - marqueeStartRef.current.y;
      if (!marqueeActiveRef.current) {
        if (Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD_PX) return;
        marqueeActiveRef.current = true;
      }
      const x1 = Math.min(marqueeStartRef.current.x, sx);
      const y1 = Math.min(marqueeStartRef.current.y, sy);
      const x2 = Math.max(marqueeStartRef.current.x, sx);
      const y2 = Math.max(marqueeStartRef.current.y, sy);
      setMarquee({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
      return;
    }
    if (!draggingRef.current) return;
    if (pointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - lastPtRef.current.x;
    const dy = e.clientY - lastPtRef.current.y;
    lastPtRef.current = { x: e.clientX, y: e.clientY };

    setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  };

  const endPan = (e) => {
    if (selectingRef.current) {
      if (pointerIdRef.current !== e.pointerId) return;
      const start = marqueeStartRef.current;
      const end = marqueeEndRef.current;
      selectingRef.current = false;
      const wasMarquee = marqueeActiveRef.current;
      marqueeActiveRef.current = false;
      pointerIdRef.current = null;
      setMarquee(null);
      if (wasMarquee) {
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const scale = camera.zoom || 1;
        const x1 = Math.min(start.x, end.x);
        const y1 = Math.min(start.y, end.y);
        const x2 = Math.max(start.x, end.x);
        const y2 = Math.max(start.y, end.y);
        const selectedIds = [];
        items.forEach((item) => {
          if (!item) return;
          const sx = cx + camera.x + item.x * scale;
          const sy = cy + camera.y + item.y * scale;
          if (sx >= x1 && sx <= x2 && sy >= y1 && sy <= y2) {
            selectedIds.push(item.id);
          }
        });
        onMarqueeSelect?.(selectedIds);
      } else {
        onMarqueeSelect?.([]);
      }
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {}
      return;
    }
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
      {marquee && (
        <div
          className="absolute border border-BrandOrange bg-BrandOrange/10 pointer-events-none"
          style={{
            left: marquee.x,
            top: marquee.y,
            width: marquee.w,
            height: marquee.h,
          }}
        />
      )}
    </div>
  );
}
