import React, { useMemo, useRef, useState } from "react";
import BoardViewport from "./BoardViewport";
import PanHandler from "./PanHandler";
import WorldLayer from "./WorldLayer";
import FieldLayer from "./FieldLayer";
import ItemsLayer from "./ItemsLayer";

// CanvasRoot: Composes the layered canvas system and centralizes state
export default function CanvasRoot({ tool = "hand" }) {
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });

  const initialItems = useMemo(
    () => [
      { id: "player-1", type: "player", x: 300, y: 300 },
      { id: "ball-1", type: "ball", x: 300, y: 300 },
    ],
    []
  );
  const [items, setItems] = useState(initialItems);

  const viewportRef = useRef(null); // reserved for future export usage

  const handleItemChange = (id, next) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...next } : it)));
  };

  return (
    <BoardViewport ref={viewportRef} className="bg-BrandGreen">
      <PanHandler tool={tool} camera={camera} setCamera={setCamera}>
        <WorldLayer camera={camera}>
          <FieldLayer />
          <ItemsLayer items={items} tool={tool} camera={camera} onItemChange={handleItemChange} />
        </WorldLayer>
      </PanHandler>
    </BoardViewport>
  );
}

