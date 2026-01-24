import React from "react";

// WorldLayer: Applies camera transform to all children.
// - No pointer logic.
export default function WorldLayer({ camera, children }) {
  const { x, y, zoom } = camera;
  const transform = `translate(${x}px, ${y}px) scale(${zoom})`;
  return (
    <div
      className="absolute inset-0"
      style={{
        transform,
        transformOrigin: "0 0",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

