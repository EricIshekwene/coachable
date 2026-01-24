import React from 'react';
import { Slider } from '@mui/material';

export default function AnimationSettingsSection({ value = {}, onChange }) {
    const playOnLoad = value.playOnLoad ?? true;
    const speedPercent = value.speedPercent ?? 50;

    const update = (patch) => onChange?.({ ...value, ...patch });

    return (
        <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1 sm:gap-2">
            <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">
                Animation Settings
            </div>
            {/* Animation Speed (just stored for now) */}
            <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5">
                <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Animation Speed</p>
                <div className="w-full px-1 flex flex-row gap-1">
                    <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={speedPercent}
                        onChange={(_, newValue) => update({ speedPercent: Array.isArray(newValue) ? newValue[0] : newValue })}
                        className="flex-1"
                        sx={{
                            color: '#FF7A18',
                            height: '4px',
                            '& .MuiSlider-thumb': {
                                width: '10px',
                                height: '10px',
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
                                height: '4px',
                                border: 'none',
                            },
                            '& .MuiSlider-rail': {
                                backgroundColor: '#75492a',
                                height: '4px',
                                opacity: 1,
                            },
                        }}
                    />
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={speedPercent}
                        onChange={(e) => update({ speedPercent: Number(e.target.value) || 0 })}
                        className="bg-BrandBlack2 h-5 sm:h-6 w-14 px-2 text-BrandWhite text-xs sm:text-sm font-DmSans rounded-md border-[0.5px] border-BrandGray focus:outline-none focus:border-BrandOrange"
                    />
                </div>
            </div>

            {/*Start on Load Switch*/}
            <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5">
                <div className="flex items-center justify-between w-full gap-2">
                    <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Start on Load</p>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            update({ playOnLoad: !playOnLoad });
                        }}
                        className={`relative w-[32px] h-[16px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${playOnLoad ? 'bg-BrandOrange' : 'bg-BrandGray'
                            }`}
                        aria-label="Toggle play on load"
                    >
                        <span
                            className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 w-[12px] h-[12px] bg-BrandBlack rounded-full shadow-sm ${playOnLoad ? 'translate-x-[18px]' : 'translate-x-[3px]'
                                }`}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
}
