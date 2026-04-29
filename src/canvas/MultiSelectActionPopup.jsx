import React from "react";
import { FiLock, FiUnlock, FiEye, FiEyeOff } from "react-icons/fi";

const POPUP_GAP_PX = 10;

const popupStyle = `
@keyframes multi-popup-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(calc(-100% + 6px)) scale(0.85);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(-100%) scale(1);
  }
}
.multi-action-popup {
  animation: multi-popup-in 0.13s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
`;

/**
 * Floating action popup shown when multiple canvas items are selected.
 * Positioned at the top-center of the bounding box of all selected items.
 * Shows lock-all and hide-all buttons.
 *
 * @param {Object} props
 * @param {Array<{id: string, x: number, y: number, type: string, locked?: boolean, hidden?: boolean}>} props.items - Selected items with rendered positions.
 * @param {{ x: number, y: number, scale: number }} props.worldOrigin - Camera transform.
 * @param {number} props.playerRadius - World-unit radius used to offset popup above topmost item.
 * @param {Function} [props.onLockAll] - Called to toggle lock on all selected items.
 * @param {Function} [props.onHideAll] - Called to toggle visibility on all selected items.
 */
function MultiSelectActionPopup({ items, worldOrigin, playerRadius, onLockAll, onHideAll }) {
  if (!items?.length || !worldOrigin) return null;

  let minX = Infinity, maxX = -Infinity, minY = Infinity;
  items.forEach((item) => {
    if (item.x < minX) minX = item.x;
    if (item.x > maxX) maxX = item.x;
    if (item.y < minY) minY = item.y;
  });

  const allLocked = items.every((item) => item.locked);
  const allHidden = items.every((item) => item.hidden);

  const centerWorldX = (minX + maxX) / 2;
  const screenX = worldOrigin.x + centerWorldX * worldOrigin.scale;
  const screenY = worldOrigin.y + minY * worldOrigin.scale - playerRadius * worldOrigin.scale - POPUP_GAP_PX;

  return (
    <>
      <style>{popupStyle}</style>
      <div
        className="multi-action-popup pointer-events-auto absolute z-50 flex items-center rounded-full bg-neutral-900/95 px-1.5 py-1.5 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm"
        style={{ left: screenX, top: screenY }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onLockAll?.(); }}
          title={allLocked ? "Unlock all" : "Lock all"}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-100 ${
            allLocked
              ? "bg-BrandOrange text-red-900 hover:bg-orange-400"
              : "text-BrandOrange hover:bg-white/10"
          }`}
        >
          {allLocked ? <FiLock size={13} /> : <FiUnlock size={13} />}
        </button>
        <div className="mx-1 h-3.5 w-px shrink-0 bg-white/15" />
        <button
          onClick={(e) => { e.stopPropagation(); onHideAll?.(); }}
          title={allHidden ? "Show all" : "Hide all"}
          className="flex h-7 w-7 items-center justify-center rounded-full text-BrandOrange transition-colors duration-100 hover:bg-white/10"
        >
          {allHidden ? <FiEyeOff size={13} /> : <FiEye size={13} />}
        </button>
      </div>
    </>
  );
}

export default MultiSelectActionPopup;
