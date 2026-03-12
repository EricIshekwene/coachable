import React, { forwardRef } from "react";

/**
 * Viewport wrapper that defines the visible canvas area.
 * Provides relative positioning, overflow clipping, and touch/select prevention.
 * @param {Object} props
 * @param {string} [props.className] - Additional CSS classes.
 * @param {Object} [props.style] - Inline styles (e.g., background color).
 * @param {React.ReactNode} props.children - Canvas content to render.
 * @param {React.Ref} ref - Forwarded ref to the outer div (used for image export).
 */
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

