import React, { useRef, useState } from "react";

// DraggableItem: Generic draggable for items in WORLD coordinates.
// - Only draggable when tool === "select" and draggable === true
// - Stops propagation on pointer down so PanHandler won't start
// - Uses pointer delta with camera.zoom to update world {x,y}
export default function DraggableItem({
  item,
  tool,
  camera,
  draggable = true,
  onChange,
  children,
}) {
  const draggingRef = useRef(false);
  const pointerIdRef = useRef(null);
  const lastScreenPtRef = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = (e) => {
    // Prevent PanHandler from engaging
    e.stopPropagation();
    if (tool !== "select" || !draggable) return;

    draggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    setIsDragging(true);
    lastScreenPtRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    if (pointerIdRef.current !== e.pointerId) return;
    const dxScreen = e.clientX - lastScreenPtRef.current.x;
    const dyScreen = e.clientY - lastScreenPtRef.current.y;
    lastScreenPtRef.current = { x: e.clientX, y: e.clientY };

    const scale = camera.zoom || 1;
    const dxWorld = dxScreen / scale;
    const dyWorld = dyScreen / scale;

    onChange?.(item.id, { x: item.x + dxWorld, y: item.y + dyWorld });
  };

  const endDrag = (e) => {
    if (!draggingRef.current) return;
    if (pointerIdRef.current !== e.pointerId) return;
    draggingRef.current = false;
    pointerIdRef.current = null;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="absolute"
      style={{
        left: item.x,
        top: item.y,
        cursor: tool === "select" && draggable ? (isDragging ? "grabbing" : "grab") : "default",
        touchAction: "none",
      }}
    >
      {children}
    </div>
  );
}

