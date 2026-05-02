import React from "react";
import { ImCheckboxChecked, ImCheckboxUnchecked } from "react-icons/im";
import { Slider } from "@mui/material";
import { BRAND_SLIDER_SX } from "../subcomponents/sliderStyles";

export default function AllPlayersSection({ value, onChange }) {
  const playerSize = value?.sizePercent ?? 100;
  // Default to showing player numbers unless explicitly turned off.
  const showNumber = value?.showNumber ?? true;
  const showName = value?.showName ?? false;

  const update = (patch) => onChange?.({ ...value, ...patch });


  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-1.5 sm:pb-2 items-start justify-center gap-0.5 ">
      <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">All Players</div>

      <div className="flex flex-row w-full items-center justify-between">
        <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Size: {playerSize}%</p>
      </div>

      <div className="w-full min-w-0 overflow-visible flex items-center justify-start px-2">
        <Slider
          min={5}
          max={200}
          step={5}
          value={playerSize}
          onChange={(_, newValue) => update({ sizePercent: Array.isArray(newValue) ? newValue[0] : newValue })}
          sx={BRAND_SLIDER_SX}
          aria-label="Player size percent"
        />
      </div>

      <div className="flex flex-row w-full items-center justify-between">
        <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Show Label:</p>
        <button type="button" onClick={() => update({ showNumber: !showNumber })} className="focus:outline-none cursor-pointer">
          {showNumber ? (
            <ImCheckboxChecked className="text-BrandOrange w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          ) : (
            <ImCheckboxUnchecked className="text-BrandGray2 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          )}
        </button>
      </div>

      <div className="flex flex-row w-full items-center justify-between">
        <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Show Name:</p>
        <button type="button" onClick={() => update({ showName: !showName })} className="focus:outline-none cursor-pointer">
          {showName ? (
            <ImCheckboxChecked className="text-BrandOrange w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          ) : (
            <ImCheckboxUnchecked className="text-BrandGray2 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
