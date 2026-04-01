import React, { useEffect, useState } from "react";
import { MdAlignHorizontalLeft, MdAlignHorizontalCenter, MdAlignHorizontalRight } from "react-icons/md";

/**
 * Shows X/Y coordinate inputs and horizontal alignment buttons for a single selected item
 * (player, ball, or cone). Coordinates are in world-space units.
 *
 * @param {Object} props
 * @param {Object} props.item - The selected item with { id, x, y }.
 * @param {Object|null} props.fieldBounds - Field world bounds: { left, right, top, bottom }.
 * @param {Function} props.onPositionChange - Called with (id, { x, y }) when position is committed.
 */
export default function PlayerTransformSection({ item, fieldBounds, onPositionChange }) {
  const [draftX, setDraftX] = useState("");
  const [draftY, setDraftY] = useState("");

  // Sync draft whenever the item changes externally (drag, undo, etc.)
  useEffect(() => {
    if (!item) return;
    setDraftX(String(Math.round(item.x ?? 0)));
    setDraftY(String(Math.round(item.y ?? 0)));
  }, [item?.id, item?.x, item?.y]);

  if (!item) return null;

  /** Commit the current draft values if they are valid numbers. */
  const commitPosition = () => {
    const x = parseFloat(draftX);
    const y = parseFloat(draftY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      // Revert to current item position if invalid
      setDraftX(String(Math.round(item.x ?? 0)));
      setDraftY(String(Math.round(item.y ?? 0)));
      return;
    }
    onPositionChange?.(item.id, { x, y });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
      commitPosition();
    } else if (e.key === "Escape") {
      setDraftX(String(Math.round(item.x ?? 0)));
      setDraftY(String(Math.round(item.y ?? 0)));
      e.target.blur();
    }
  };

  /** Align item horizontally; keep current y. */
  const alignX = (targetX) => {
    const y = item.y ?? 0;
    setDraftX(String(Math.round(targetX)));
    setDraftY(String(Math.round(y)));
    onPositionChange?.(item.id, { x: targetX, y });
  };

  const leftX = fieldBounds?.left ?? 0;
  const centerX = 0;
  const rightX = fieldBounds?.right ?? 0;

  const inputClass =
    "w-full bg-BrandBlack2 border border-transparent rounded text-BrandWhite text-[10px] sm:text-xs font-DmSans px-1 py-0.5 focus:outline-none focus:border-BrandOrange text-center";

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-1.5 sm:pb-2 gap-1">
      <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">Position</div>

      {/* X / Y inputs */}
      <div className="flex flex-row gap-1.5 w-full">
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-BrandGray text-[9px] sm:text-[10px] font-DmSans text-center">X</span>
          <input
            type="number"
            className={inputClass}
            value={draftX}
            onChange={(e) => setDraftX(e.target.value)}
            onBlur={commitPosition}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-BrandGray text-[9px] sm:text-[10px] font-DmSans text-center">Y</span>
          <input
            type="number"
            className={inputClass}
            value={draftY}
            onChange={(e) => setDraftY(e.target.value)}
            onBlur={commitPosition}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      {/* Alignment buttons */}
      <div className="flex flex-col gap-0.5">
        <span className="text-BrandGray text-[9px] sm:text-[10px] font-DmSans">Align</span>
        <div className="flex flex-row gap-1 w-full">
          <button
            type="button"
            title="Align to left of field"
            onClick={() => alignX(leftX)}
            className="flex-1 flex items-center justify-center py-1 rounded border border-transparent bg-BrandBlack2 hover:border-BrandOrange hover:text-BrandOrange text-BrandGray transition-colors cursor-pointer"
          >
            <MdAlignHorizontalLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            type="button"
            title="Align to center of field"
            onClick={() => alignX(centerX)}
            className="flex-1 flex items-center justify-center py-1 rounded border border-transparent bg-BrandBlack2 hover:border-BrandOrange hover:text-BrandOrange text-BrandGray transition-colors cursor-pointer"
          >
            <MdAlignHorizontalCenter className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            type="button"
            title="Align to right of field"
            onClick={() => alignX(rightX)}
            className="flex-1 flex items-center justify-center py-1 rounded border border-transparent bg-BrandBlack2 hover:border-BrandOrange hover:text-BrandOrange text-BrandGray transition-colors cursor-pointer"
          >
            <MdAlignHorizontalRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
