import React from "react";
import { TbFlipVertical, TbFlipHorizontal } from "react-icons/tb";
import { PanelButton } from "../subcomponents/Buttons.jsx";

/**
 * Admin-only right-panel section with two buttons to reflect all player/ball
 * positions across the X-axis (flip vertical) or Y-axis (flip horizontal).
 * @param {{ onReflectX: () => void, onReflectY: () => void }} props
 */
export default function ReflectPlaySection({ onReflectX, onReflectY }) {
  const iconClass = "text-BrandOrange text-sm sm:text-base md:text-lg lg:text-xl";

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center">
      <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">Reflect Play</div>
      <div className="w-full grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-3 mt-1 sm:mt-1.5 md:mt-2">
        <div className="flex flex-col items-center gap-0.5">
          <PanelButton
            Icon={<TbFlipVertical className={iconClass} />}
            onClick={() => onReflectX?.()}
            isSelected={false}
          />
          <span className="text-[9px] sm:text-[10px] text-BrandGray font-DmSans leading-none">
            X Axis
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <PanelButton
            Icon={<TbFlipHorizontal className={iconClass} />}
            onClick={() => onReflectY?.()}
            isSelected={false}
          />
          <span className="text-[9px] sm:text-[10px] text-BrandGray font-DmSans leading-none">
            Y Axis
          </span>
        </div>
      </div>
    </div>
  );
}
