// DragCanvas.jsx
// No drag/drop libraries. Pure React + pointer events.
// Drop this into src/components/DragCanvas.jsx and use it in App.jsx.

import React, { useEffect, useMemo, useRef, useState } from "react";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getPointFromEvent(e) {
  // Works for mouse, touch, pen (Pointer Events)
  return { x: e.clientX, y: e.clientY };
}

function getRect(el) {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/**
 * DragCanvas
 * - A "stage" (div) that behaves like a canvas area.
 * - Contains draggable items (circles by default).
 * - You can add more items or replace the render for items later.
 */
export default function DragCanvas({
  height = "100vh",
  width = 700,
  initialItems,
  snapToGrid = false,
  gridSize = 20,
}) {
  const stageRef = useRef(null);

  const defaultItems = useMemo(
    () => [
      { id: "p1", x: 120, y: 120, r: 50, fill: "red", stroke: "black" },
    ],
    []
  );

  const [items, setItems] = useState(initialItems ?? defaultItems);

  const [dragState, setDragState] = useState({
    draggingId: null,
    pointerId: null,
    offsetX: 0,
    offsetY: 0,
  });

  // Optional: cursor feedback
  useEffect(() => {
    if (!dragState.draggingId) return;
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.cursor = "default";
    };
  }, [dragState.draggingId]);

  function startDrag(e, id) {
    if (!stageRef.current) return;

    // Capture pointer so dragging continues even if pointer leaves the circle
    e.currentTarget.setPointerCapture?.(e.pointerId);

    const stage = getRect(stageRef.current);
    const pt = getPointFromEvent(e);

    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (!item) return prev;

      const xInStage = pt.x - stage.left;
      const yInStage = pt.y - stage.top;

      setDragState({
        draggingId: id,
        pointerId: e.pointerId,
        offsetX: xInStage - item.x,
        offsetY: yInStage - item.y,
      });

      return prev;
    });
  }

  function onPointerMove(e) {
    if (!dragState.draggingId || !stageRef.current) return;
    if (dragState.pointerId !== e.pointerId) return;

    const stage = getRect(stageRef.current);
    const pt = getPointFromEvent(e);

    const rawX = pt.x - stage.left - dragState.offsetX;
    const rawY = pt.y - stage.top - dragState.offsetY;

    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === dragState.draggingId);
      if (idx === -1) return prev;

      const it = prev[idx];

      let nextX = rawX;
      let nextY = rawY;

      if (snapToGrid) {
        nextX = Math.round(nextX / gridSize) * gridSize;
        nextY = Math.round(nextY / gridSize) * gridSize;
      }

      // Keep inside stage bounds (respect radius)
      nextX = clamp(nextX, it.r, stage.width - it.r);
      nextY = clamp(nextY, it.r, stage.height - it.r);

      const next = [...prev];
      next[idx] = { ...it, x: nextX, y: nextY };
      return next;
    });
  }

  function endDrag(e) {
    if (!dragState.draggingId) return;
    if (dragState.pointerId !== e.pointerId) return;

    setDragState({
      draggingId: null,
      pointerId: null,
      offsetX: 0,
      offsetY: 0,
    });
  }

  function addCircle() {
    setItems((prev) => [
      ...prev,
      {
        id: `p${prev.length + 1}`,
        x: 120,
        y: 120,
        r: 40,
        fill: "dodgerblue",
        stroke: "black",
      },
    ]);
  }

  return (
    <div style={{ display: "flex", gap: 16, padding: 16 }}>
      <div style={{ width: 260 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Toolbox</div>

        <button
          onClick={addCircle}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
          }}
        >
          + Add Circle
        </button>

        <div style={{ marginTop: 12, fontSize: 13, color: "#555" }}>
          Drag circles around the stage. This is pure React (no Konva, no DnD
          libs).
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: "#777" }}>
          Tip: set <code>snapToGrid</code> to true for play-alignment.
        </div>
      </div>

      <div
        ref={stageRef}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          width,
          height,
          borderRadius: 16,
          border: "2px solid #111",
          background: "#f7f7f7",
          position: "relative",
          overflow: "hidden",
          touchAction: "none", // important for mobile dragging
          userSelect: "none",
        }}
      >
        {items.map((it) => {
          const isDragging = dragState.draggingId === it.id;

          return (
            <div
              key={it.id}
              onPointerDown={(e) => startDrag(e, it.id)}
              onPointerEnter={() => {
                if (!dragState.draggingId) document.body.style.cursor = "grab";
              }}
              onPointerLeave={() => {
                if (!dragState.draggingId) document.body.style.cursor = "default";
              }}
              style={{
                position: "absolute",
                left: it.x - it.r,
                top: it.y - it.r,
                width: it.r * 2,
                height: it.r * 2,
                borderRadius: "50%",
                background: it.fill,
                border: `4px solid ${it.stroke}`,
                boxSizing: "border-box",
                cursor: isDragging ? "grabbing" : "grab",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "white",
              }}
            >
              {it.id.toUpperCase()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
