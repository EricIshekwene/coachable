import React, { useRef, useState } from "react";

export default function DraggableBackground({
    id,
    draggable = true,
    position,              // { x, y }
    onPositionChange,      // (id, nextPos) => void
    boundsRef,             // ref to the board div
    children,
    className = "",
}) {
    const draggingRef = useRef(false);
    const pointerIdRef = useRef(null);
    const grabOffsetRef = useRef({ x: 0, y: 0 });

    const [isDragging, setIsDragging] = useState(false);

    const onPointerDown = (e) => {
        if (!draggable) return;

        const boundsEl = boundsRef?.current;
        if (!boundsEl) return;

        const el = e.currentTarget;

        draggingRef.current = true;
        pointerIdRef.current = e.pointerId;
        setIsDragging(true);

        el.setPointerCapture(e.pointerId);

        const boundsRect = boundsEl.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        const pointerX = e.clientX - boundsRect.left;
        const pointerY = e.clientY - boundsRect.top;

        const elLeft = elRect.left - boundsRect.left;
        const elTop = elRect.top - boundsRect.top;

        grabOffsetRef.current = {
            x: pointerX - elLeft,
            y: pointerY - elTop,
        };
    };

    const onPointerMove = (e) => {
        if (!draggingRef.current) return;
        if (pointerIdRef.current !== e.pointerId) return;

        const boundsEl = boundsRef?.current;
        if (!boundsEl) return;

        const boundsRect = boundsEl.getBoundingClientRect();

        const pointerX = e.clientX - boundsRect.left;
        const pointerY = e.clientY - boundsRect.top;

        const nextX = pointerX - grabOffsetRef.current.x;
        const nextY = pointerY - grabOffsetRef.current.y;

        // Allow free movement in both X and Y (no clamping)
        onPositionChange?.(id, { x: nextX, y: nextY });
    };

    const endDrag = (e) => {
        if (!draggingRef.current) return;
        if (pointerIdRef.current !== e.pointerId) return;

        draggingRef.current = false;
        pointerIdRef.current = null;
        setIsDragging(false);

        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch { }
    };

    return (
        <div
            className={className}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{
                position: "absolute",
                left: position.x,
                top: position.y,
                touchAction: "none",
                cursor: draggable ? (isDragging ? "grabbing" : "grab") : "default",
            }}
        >
            {children}
        </div>
    );
}
