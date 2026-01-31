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
  onItemDragStart,
  onItemDragEnd,
  onCanvasAddPlayer,
  allPlayersDisplay,
  advancedSettings,
}) {
  const viewportRef = useRef(null); // reserved for future export usage

  const pitch = advancedSettings?.pitch ?? {};
  const players = advancedSettings?.players ?? {};

  const pitchColor = pitch.pitchColor ?? undefined;
  const showMarkings = pitch.showMarkings ?? true;
  const playerBaseSizePx = players.baseSizePx ?? 30;

  return (
    <BoardViewport ref={viewportRef} className="bg-BrandGreen" style={pitchColor ? { backgroundColor: pitchColor } : undefined}>
      <PanHandler tool={tool} camera={camera} setCamera={setCamera} onCanvasAddPlayer={onCanvasAddPlayer}>
        <WorldLayer camera={camera}>
          <FieldLayer showMarkings={showMarkings} />
          <ItemsLayer
            items={items}
            tool={tool}
            camera={camera}
            onItemChange={onItemChange}
            onItemDragStart={onItemDragStart}
            onItemDragEnd={onItemDragEnd}
            allPlayersDisplay={allPlayersDisplay}
            playerBaseSizePx={playerBaseSizePx}
          />
        </WorldLayer>
      </PanHandler>
    </BoardViewport>
  );
}
