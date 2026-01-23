import React, { useEffect, useMemo, useRef, useState } from "react";

const sizeScaleMap = {
  "Full Field": 1,
  "Half Pitch": 0.75,
  "Goal": 0.55,
  "Quarter Field": 0.6,
};

const getFieldRect = (containerRect, scale) => {
  const width = containerRect.width * scale;
  const height = containerRect.height * scale;
  const left = containerRect.left + (containerRect.width - width) / 2;
  const top = containerRect.top + (containerRect.height - height) / 2;
  return { width, height, left, top };
};

const screenToField = (point, fieldRect, rotation, zoom) => {
  const centerX = fieldRect.left + fieldRect.width / 2;
  const centerY = fieldRect.top + fieldRect.height / 2;
  const dx = (point.x - centerX) / zoom;
  const dy = (point.y - centerY) / zoom;
  const angle = (-rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotatedX = dx * cos - dy * sin;
  const rotatedY = dx * sin + dy * cos;
  const localX = rotatedX + fieldRect.width / 2;
  const localY = rotatedY + fieldRect.height / 2;
  return {
    x: Math.max(0, Math.min(fieldRect.width, localX)),
    y: Math.max(0, Math.min(fieldRect.height, localY)),
  };
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function SlateCanvas({
  objects,
  selectedId,
  onSelect,
  onMove,
  onMoveEnd,
  field,
  display,
  isPlaying,
  pitchMarkings,
}) {
  const containerRef = useRef(null);
  const [containerRect, setContainerRect] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const [dragState, setDragState] = useState({
    draggingId: null,
    offsetX: 0,
    offsetY: 0,
    pointerId: null,
  });

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const observer = new ResizeObserver(() => {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerRect({
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const fieldScale = sizeScaleMap[field.pitchSize] ?? 1;
  const fieldRect = getFieldRect(containerRect, fieldScale);
  const baseDiameter = Math.min(fieldRect.width, fieldRect.height) * 0.08;

  const handlePointerDown = (event, obj) => {
    if (isPlaying) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    const fieldPoint = screenToField(point, fieldRect, field.rotation, field.zoom);
    const currentX = obj.x * fieldRect.width;
    const currentY = obj.y * fieldRect.height;
    setDragState({
      draggingId: obj.id,
      offsetX: fieldPoint.x - currentX,
      offsetY: fieldPoint.y - currentY,
      pointerId: event.pointerId,
    });
    onSelect?.(obj.id);
  };

  const handlePointerMove = (event) => {
    if (!dragState.draggingId || dragState.pointerId !== event.pointerId) return;
    const obj = objects.find((item) => item.id === dragState.draggingId);
    if (!obj) return;
    const point = { x: event.clientX, y: event.clientY };
    const fieldPoint = screenToField(point, fieldRect, field.rotation, field.zoom);
    const diameter = obj.type === "ball" ? baseDiameter * 0.25 : (baseDiameter * obj.size) / 100;
    const radius = diameter / 2;
    const clampedX = clamp(fieldPoint.x - dragState.offsetX, radius, fieldRect.width - radius);
    const clampedY = clamp(fieldPoint.y - dragState.offsetY, radius, fieldRect.height - radius);
    onMove?.(obj.id, clampedX / fieldRect.width, clampedY / fieldRect.height);
  };

  const handlePointerUp = (event) => {
    if (!dragState.draggingId || dragState.pointerId !== event.pointerId) return;
    if (onMoveEnd) {
      const obj = objects.find((item) => item.id === dragState.draggingId);
      if (obj) {
        onMoveEnd(obj.id, obj.x, obj.y);
      }
    }
    setDragState({ draggingId: null, offsetX: 0, offsetY: 0, pointerId: null });
  };

  const renderedObjects = useMemo(() => objects.filter((obj) => obj.visible), [objects]);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerDown={() => onSelect?.(null)}
    >
      <div
        className="absolute rounded-[24px] border border-BrandBlack/20 overflow-hidden"
        style={{
          left: `${(1 - fieldScale) * 50}%`,
          top: `${(1 - fieldScale) * 50}%`,
          width: `${fieldScale * 100}%`,
          height: `${fieldScale * 100}%`,
          backgroundColor: field.pitchColor,
          transform: `rotate(${field.rotation}deg) scale(${field.zoom})`,
          transformOrigin: "center",
        }}
      >
        {field.showMarkings && pitchMarkings && (
          <img
            src={pitchMarkings}
            alt="Pitch markings"
            className="absolute inset-0 w-full h-full object-contain opacity-70 pointer-events-none"
          />
        )}
        {renderedObjects.map((obj, index) => {
          const diameter = obj.type === "ball" ? baseDiameter * 0.25 : (baseDiameter * obj.size) / 100;
          const left = obj.x * fieldRect.width - diameter / 2;
          const top = obj.y * fieldRect.height - diameter / 2;
          const isSelected = selectedId === obj.id;
          const displayNumber = display.showNumber ? (obj.number || `${index + 1}`) : "";
          return (
            <div
              key={obj.id}
              onPointerDown={(event) => handlePointerDown(event, obj)}
              className={`absolute flex flex-col items-center justify-center ${isPlaying ? "cursor-default" : "cursor-grab"}`}
              style={{
                width: diameter,
                height: diameter,
                left,
                top,
              }}
            >
              <div
                className={`w-full h-full rounded-full flex items-center justify-center text-[10px] sm:text-xs font-DmSans font-bold text-BrandBlack ${isSelected ? "ring-2 ring-BrandOrange" : ""}`}
                style={{
                  backgroundColor: obj.type === "ball" ? "#F8FAFC" : obj.color,
                  boxShadow: obj.type === "ball" ? "0 0 0 2px rgba(0,0,0,0.15)" : undefined,
                }}
              >
                {displayNumber}
              </div>
              {display.showName && obj.label && obj.type === "player" && (
                <div className="mt-1 px-1 py-0.5 rounded bg-BrandBlack/70 text-BrandWhite text-[9px] sm:text-[10px] font-DmSans whitespace-nowrap">
                  {obj.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

