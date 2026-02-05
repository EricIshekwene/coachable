import React from 'react';
import { Slider } from '@mui/material';

export default function BallSettingsSection({ value = {}, onChange }) {
    const sizePercent = value.sizePercent ?? 100;

    const update = (patch) => onChange?.({ ...value, ...patch });

    return (
        <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1 sm:gap-2">
            <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">
                Ball Settings
            </div>

            <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5">
                <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Ball Size (%)</p>
                <div className="w-full px-1 flex flex-row gap-1 px-1 justify-between">
                    <Slider
                        min={10}
                        max={400}
                        step={5}
                        value={sizePercent}
                        onChange={(_, newValue) => update({ sizePercent: Array.isArray(newValue) ? newValue[0] : newValue })}
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
                    <div className="flex flex-row bg-BrandBlack2 h-5 sm:h-6 w-14 items-center justify-center px-2 rounded-md">
                        <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">{sizePercent}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
