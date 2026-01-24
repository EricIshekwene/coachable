import React from "react";
import RugbyField from "../assets/objects/Field Vectors/Rugby_Field.png";

// FieldLayer: Renders the rugby field image.
// - Pointer events disabled.
// - Centered via CSS percentages, not pixels.
// - max-w-none so it can exceed viewport and be clipped.
export default function FieldLayer() {
  return (
    <img
      src={RugbyField}
      alt="rugby field"
      className="pointer-events-none select-none max-w-none"
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      style={{
        position: "absolute",
        left: "55%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      }}
    />
  );
}
