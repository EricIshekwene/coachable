import React from "react";
import { FiLock, FiUnlock, FiEye, FiEdit } from "react-icons/fi";

const POPUP_GAP_PX = 10;

const popupStyle = `
@keyframes player-popup-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(calc(-100% + 6px)) scale(0.85);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(-100%) scale(1);
  }
}
.player-action-popup {
  animation: player-popup-in 0.13s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
`;

/**
 * Floating action popup rendered above a selected canvas item.
 * Shows lock + edit + eye for players; lock + eye for balls/cones.
 * Positioned in absolute screen-space coordinates within BoardViewport.
 *
 * @param {Object} props
 * @param {Object} props.item - The selected item (player or ball).
 * @param {{ x: number, y: number, scale: number }} props.worldOrigin - Camera transform.
 * @param {number} props.itemRadius - Radius of the item circle in world units.
 * @param {Function} [props.onEdit] - Called with item.id to open player editor.
 * @param {Function} [props.onLock] - Called with item.id to toggle lock.
 * @param {Function} [props.onToggleVisibility] - Called with item.id to toggle hidden.
 */
function PlayerActionPopup({ item, worldOrigin, itemRadius, onEdit, onLock, onToggleVisibility }) {
  if (!item || !worldOrigin) return null;

  const isPlayer = item.type === "player";
  const showLock = item.type === "player" || item.type === "ball";
  const isLocked = item.locked || false;

  const screenX = worldOrigin.x + item.x * worldOrigin.scale;
  const screenY = worldOrigin.y + item.y * worldOrigin.scale - itemRadius * worldOrigin.scale - POPUP_GAP_PX;

  return (
    <>
      <style>{popupStyle}</style>
      <div
        className="player-action-popup pointer-events-auto absolute z-50 flex items-center rounded-full bg-neutral-900/95 px-1.5 py-1.5 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm"
        style={{ left: screenX, top: screenY }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {showLock && (
          <button
            onClick={(e) => { e.stopPropagation(); onLock?.(item.id); }}
            title={isLocked ? "Unlock" : "Lock"}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-100 ${
              isLocked
                ? "bg-BrandOrange text-red-900 hover:bg-orange-400"
                : "text-BrandOrange hover:bg-white/10"
            }`}
          >
            {isLocked ? <FiLock size={13} /> : <FiUnlock size={13} />}
          </button>
        )}
        {isPlayer && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(item.id); }}
            title="Edit player"
            className="flex h-7 w-7 items-center justify-center rounded-full text-BrandOrange transition-colors duration-100 hover:bg-white/10"
          >
            <FiEdit size={13} />
          </button>
        )}
        {(showLock || isPlayer) && (
          <div className="mx-1 h-3.5 w-px shrink-0 bg-white/15" />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(item.id); }}
          title="Hide"
          className="flex h-7 w-7 items-center justify-center rounded-full text-BrandOrange transition-colors duration-100 hover:bg-white/10"
        >
          <FiEye size={13} />
        </button>
      </div>
    </>
  );
}

export default PlayerActionPopup;
