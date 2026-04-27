import React from "react";
import { TbFlipVertical, TbFlipHorizontal } from "react-icons/tb";

/**
 * Admin-only right-panel section with two buttons to reflect all player/ball
 * positions across the X-axis (flip vertical) or Y-axis (flip horizontal).
 * @param {{ onReflectX: () => void, onReflectY: () => void }} props
 */
export default function ReflectPlaySection({ onReflectX, onReflectY }) {
  const iconClass = "text-BrandOrange text-xs sm:text-sm md:text-base";
  const btnClass =
    "w-14 sm:w-16 md:w-18 h-6 sm:h-7 rounded-lg bg-BrandBlack2 hover:bg-BrandBlack2/90 flex items-center justify-center transition-all duration-200 cursor-pointer";

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center">
      <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">Reflect Play</div>
      <div className="flex flex-row justify-between w-full mt-1 sm:mt-1.5 md:mt-2">
        <div className="flex flex-col items-center gap-0.5">
          <button type="button" className={btnClass} onClick={() => onReflectX?.()}>
            <TbFlipHorizontal className={iconClass} />
          </button>
          <span className="text-[9px] sm:text-[10px] text-BrandGray font-DmSans leading-none">
            X Axis
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <button type="button" className={btnClass} onClick={() => onReflectY?.()}>
            <TbFlipVertical className={iconClass} />
          </button>
          <span className="text-[9px] sm:text-[10px] text-BrandGray font-DmSans leading-none">
            Y Axis
          </span>
        </div>
      </div>
    </div>
  );
}
