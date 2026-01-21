import React from 'react';
import { IoTimeOutline } from "react-icons/io5";
import { Slider } from '@mui/material';

const LOOP_SECONDS = 30; // Duration for one full traversal from 0 -> 100

/**
 * SpeedSlider - Speed control slider with time display
 */
export default function SpeedSlider({
  speedMultiplier,
  onSpeedChange,
}) {
  // Calculate actual duration based on speed multiplier
  const calculateDuration = () => {
    const speed = (0.25 + (speedMultiplier / 100) * 3.75) * 3;
    const actualDuration = LOOP_SECONDS / speed;
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
        sx={{
          color: '#FF7A18',
          height: '6.25px',
          '& .MuiSlider-thumb': {
            width: '12.5px',
            height: '12.5px',
            backgroundColor: '#FF7A18',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            '&:hover': {
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            },
            '&:focus, &:active, &.Mui-focusVisible': {
              outline: 'none',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            },
          },
          '& .MuiSlider-track': {
            backgroundColor: '#FF7A18',
            height: '6.25px',
            border: 'none',
          },
          '& .MuiSlider-rail': {
            backgroundColor: '#75492a',
            height: '6.25px',
            opacity: 1,
          },
        }}
      />
      <div className="sm:py-[6.25px] font-DmSans rounded-md text-[10.9375px] sm:text-[12.5px] md:text-[14.0625px] text-BrandGray flex items-center justify-center">
        {calculateDuration()}
      </div>
    </div>
  );
}
