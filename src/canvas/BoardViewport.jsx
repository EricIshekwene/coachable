import React, { forwardRef } from "react";

// BoardViewport: Defines the visible screen area.
// - Relative positioning, overflow-hidden, no drag logic.
// - Owns the export ref for future image export.
const BoardViewport = forwardRef(function BoardViewport({ className = "", style, children }, ref) {
  return (
    <div
      ref={ref}
      className={`relative overflow-hidden touch-none select-none ${className}`}
      style={{ width: "100%", height: "100%", ...style }}
    >
      {children}
    </div>
  );
});

export default BoardViewport;

