import React from "react";
import DraggableItem from "./DraggableItem";
import ItemVisual from "./ItemVisual";

// ItemsLayer: Maps items to DraggableItem wrappers and renders visuals.
export default function ItemsLayer({
  items,
  tool,
  camera,
  onItemChange,
  onItemDragStart,
  onItemDragEnd,
  selectedPlayerIds,
  selectedItemIds,
  onSelectItem,
  allPlayersDisplay,
  playerBaseSizePx,
}) {
  return (
    <div className="absolute inset-0">
      {/* Center-origin container so world coords (0,0) are screen center */}
      <div
        className="absolute"
        style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
      >
        {items.map((item) => (
          <DraggableItem
            key={item.id}
            item={item}
            tool={tool}
            camera={camera}
            draggable={item.draggable !== false}
            onChange={(id, next, meta) => onItemChange?.(id, next, meta)}
            onDragStart={onItemDragStart}
            onDragEnd={onItemDragEnd}
            onSelect={(id, meta) => onSelectItem?.(id, item.type, meta)}
          >
            <ItemVisual
              item={item}
              allPlayersDisplay={allPlayersDisplay}
              playerBaseSizePx={playerBaseSizePx}
              isSelected={
                item.type === "player"
                  ? selectedPlayerIds?.includes(item.id)
                  : selectedItemIds?.includes(item.id)
              }
            />
          </DraggableItem>
        ))}
      </div>
    </div>
  );
}
