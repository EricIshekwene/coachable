import React, { useEffect, useRef, useState } from "react";
import { MdAlignHorizontalLeft, MdAlignHorizontalCenter, MdAlignHorizontalRight } from "react-icons/md";

/**
 * Shows X/Y coordinate inputs and horizontal alignment buttons for a single selected item
 * (player, ball, or cone). Coordinates are in world-space units and update live during scrub.
 *
 * @param {Object} props
 * @param {Object} props.item - The selected item with { id, x, y }.
 * @param {Object|null} props.fieldBounds - Field world bounds: { left, right, top, bottom }.
 * @param {Function} props.onPositionChange - Called with (id, { x, y }). Returns true if applied, false if blocked.
 * @param {number} props.timelineDisplayTimeMs - Current timeline time; triggers input sync during scrub.
 * @param {Function} props.resolveItemPose - Returns current rendered pose { x, y } for a given item id.
 */
export default function PlayerTransformSection({
  item,
  fieldBounds,
  onPositionChange,
  timelineDisplayTimeMs,
  resolveItemPose,
}) {
  const [draftX, setDraftX] = useState("");
  const [draftY, setDraftY] = useState("");
  const isFocusedRef = useRef(false);

  /** Returns the best current position for this item: live renderer pose, then React state. */
  const getCurrentPose = () => {
    if (!item) return null;
    if (resolveItemPose) {
      const pose = resolveItemPose(item.id);
      if (pose && Number.isFinite(pose.x) && Number.isFinite(pose.y)) return pose;
    }
    return { x: item.x ?? 0, y: item.y ?? 0 };
  };

  // Sync when selected item changes (different player/ball selected).
  useEffect(() => {
    if (!item) return;
    const pose = getCurrentPose();
    if (!pose) return;
    setDraftX(String(Math.round(pose.x)));
    setDraftY(String(Math.round(pose.y)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  // Sync live during timeline scrub — skip if the user is typing in an input.
  useEffect(() => {
    if (!item || isFocusedRef.current) return;
    const pose = getCurrentPose();
    if (!pose) return;
    setDraftX(String(Math.round(pose.x)));
    setDraftY(String(Math.round(pose.y)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineDisplayTimeMs]);

  // Sync when item position changes externally (drag, undo, alignment buttons applied).
  useEffect(() => {
    if (!item || isFocusedRef.current) return;
    setDraftX(String(Math.round(item.x ?? 0)));
    setDraftY(String(Math.round(item.y ?? 0)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.x, item?.y]);

  if (!item) return null;

  /** Revert inputs to the current rendered/scrubbed position. */
  const revertToCurrentPose = () => {
    const pose = getCurrentPose();
    if (!pose) return;
    setDraftX(String(Math.round(pose.x)));
    setDraftY(String(Math.round(pose.y)));
  };

  /** Commit the current draft values; revert if the change is blocked. */
  const commitPosition = () => {
    const x = parseFloat(draftX);
    const y = parseFloat(draftY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      revertToCurrentPose();
      return;
    }
    const success = onPositionChange?.(item.id, { x, y });
    if (success === false) {
      revertToCurrentPose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
      commitPosition();
    } else if (e.key === "Escape") {
      revertToCurrentPose();
      e.target.blur();
    }
  };

  /** Align item horizontally to targetX; keep current y. Reverts if blocked. */
  const alignX = (targetX) => {
    const currentPose = getCurrentPose();
    const y = currentPose?.y ?? item.y ?? 0;
    const success = onPositionChange?.(item.id, { x: targetX, y });
    if (success === false) {
      revertToCurrentPose();
    } else {
      setDraftX(String(Math.round(targetX)));
      setDraftY(String(Math.round(y)));
    }
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
            onFocus={() => { isFocusedRef.current = true; }}
            onBlur={() => { isFocusedRef.current = false; commitPosition(); }}
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
            onFocus={() => { isFocusedRef.current = true; }}
            onBlur={() => { isFocusedRef.current = false; commitPosition(); }}
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
            className="flex-1 flex items-center justify-center py-1 rounded bg-BrandBlack2 hover:text-BrandOrange text-BrandGray transition-colors cursor-pointer"
          >
            <MdAlignHorizontalLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            type="button"
            title="Align to center of field"
            onClick={() => alignX(centerX)}
            className="flex-1 flex items-center justify-center py-1 rounded bg-BrandBlack2 hover:text-BrandOrange text-BrandGray transition-colors cursor-pointer"
          >
            <MdAlignHorizontalCenter className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            type="button"
            title="Align to right of field"
            onClick={() => alignX(rightX)}
            className="flex-1 flex items-center justify-center py-1 rounded bg-BrandBlack2 hover:text-BrandOrange text-BrandGray transition-colors cursor-pointer"
          >
            <MdAlignHorizontalRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
