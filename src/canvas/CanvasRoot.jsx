import React, { useRef } from "react";
import BoardViewport from "./BoardViewport";
import PanHandler from "./PanHandler";
import WorldLayer from "./WorldLayer";
import FieldLayer from "./FieldLayer";
import ItemsLayer from "./ItemsLayer";

// CanvasRoot: Composes the layered canvas system and centralizes state
export default function CanvasRoot({
  tool = "hand",
  camera,
  setCamera,
  items,
  onItemChange,
  allPlayersDisplay,
}) {
  const viewportRef = useRef(null); // reserved for future export usage

  return (
    <BoardViewport ref={viewportRef} className="bg-BrandGreen">
      <PanHandler tool={tool} camera={camera} setCamera={setCamera}>
        <WorldLayer camera={camera}>
          <FieldLayer />
          <ItemsLayer
            items={items}
            tool={tool}
            camera={camera}
            onItemChange={onItemChange}
            allPlayersDisplay={allPlayersDisplay}
          />
        </WorldLayer>
      </PanHandler>
    </BoardViewport>
  );
}

