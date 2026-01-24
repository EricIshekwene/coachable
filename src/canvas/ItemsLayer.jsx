import React from "react";
import DraggableItem from "./DraggableItem";
import ItemVisual from "./ItemVisual";

// ItemsLayer: Maps items to DraggableItem wrappers and renders visuals.
export default function ItemsLayer({ items, tool, camera, onItemChange, allPlayersDisplay, playerBaseSizePx }) {
  return (
    <div className="absolute inset-0">
      {items.map((item) => (
        <DraggableItem
          key={item.id}
          item={item}
          tool={tool}
          camera={camera}
          draggable={item.draggable !== false}
          onChange={(id, next) => onItemChange?.(id, next)}
        >
          <ItemVisual item={item} allPlayersDisplay={allPlayersDisplay} playerBaseSizePx={playerBaseSizePx} />
        </DraggableItem>
      ))}
    </div>
  );
}

