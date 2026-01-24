import React from 'react';

export default function AnimationSettingsSection({ value = {}, onChange }) {
    const playOnLoad = value.playOnLoad ?? true;

    const update = (patch) => onChange?.({ ...value, ...patch });

    return (
        <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1 sm:gap-2">
            <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">
                Animation Settings
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
