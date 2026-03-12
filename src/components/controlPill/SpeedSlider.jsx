import React from 'react';
import { IoTimeOutline } from "react-icons/io5";
import { Slider } from '@mui/material';
import { BRAND_SLIDER_SX } from "../subcomponents/sliderStyles";

/**
 * SpeedSlider - Speed control slider with time display
 */
export default function SpeedSlider({
  speedMultiplier,
  onSpeedChange,
  durationMs = 30000,
}) {
  // Calculate actual duration based on speed multiplier
  const calculateDuration = () => {
    const speed = (0.25 + (speedMultiplier / 100) * 3.75) * 3;
    const baseDurationSeconds = Math.max(1, Number(durationMs) || 30000) / 1000;
    const actualDuration = baseDurationSeconds / speed;
    return `${Math.round(actualDuration)}s`;
  };

  return (
    <div className="h-[16px] sm:h-[22px] md:h-[24px] lg:h-[32px] w-200/641 bg-BrandBlack2 flex flex-row rounded-xl items-center justify-center px-[6.25px] sm:px-[9.375px] gap-[6.25px] sm:gap-[9.375px]">
      <IoTimeOutline className="text-BrandOrange text-[14px] sm:text-[16px] md:text-[18px] lg:text-[20px] flex-shrink-0" />
      <Slider
        min={0}
        max={100}
        step={1}
        value={speedMultiplier}
        onChange={(e, newValue) => onSpeedChange(newValue)}
        className="flex-1"
        sx={BRAND_SLIDER_SX}
      />
      <div className="sm:py-[6.25px] font-DmSans rounded-md text-[10.9375px] sm:text-[12.5px] md:text-[14.0625px] text-BrandGray flex items-center justify-center">
        {calculateDuration()}
      </div>
    </div>
  );
}
