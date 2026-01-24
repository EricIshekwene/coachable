import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from "react-icons/fa";
import { FaCrown } from "react-icons/fa6";

const VIDEO_QUALITY_OPTIONS = ["360p", "480p", "720p", "1080p", "1440p", "2160p (4K)"];

export default function ExportVideoSettingsSection({ value = {}, onChange }) {
    const videoQuality = value.videoQuality ?? "1080p";
    const watermark = value.watermark ?? true;
    const includeMetadata = value.includeMetadata ?? true;

    const [openVideoQualityDropdown, setOpenVideoQualityDropdown] = useState(false);
    const videoQualityRef = useRef(null);

    const update = (patch) => onChange?.({ ...value, ...patch });

    // Close video quality dropdown when clicking outside
    useEffect(() => {
        if (!openVideoQualityDropdown) return;

        const handleClickOutside = (e) => {
            if (videoQualityRef.current && !videoQualityRef.current.contains(e.target)) {
                setOpenVideoQualityDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openVideoQualityDropdown]);

    return (
        <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1 sm:gap-2">
            <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">
                Export Video Settings
            </div>

            {/* Video Quality Dropdown */}
            <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5 relative">
                <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Video Quality</p>
                <div
                    ref={videoQualityRef}
                    className="relative w-full"
                >
                    <div
                        onClick={() => setOpenVideoQualityDropdown(!openVideoQualityDropdown)}
                        className="bg-BrandBlack2 h-5 sm:h-6 w-full flex flex-row items-center justify-between px-2 rounded-md cursor-pointer"
                    >
                        <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">{videoQuality}</p>
                        <FaChevronDown className={`text-BrandOrange text-xs transition-transform ${openVideoQualityDropdown ? 'rotate-180' : ''}`} />
                    </div>
                    {openVideoQualityDropdown && (
                        <div className="absolute left-0 top-full w-full bg-BrandBlack2 border border-BrandGray rounded-md mt-1 max-h-40 overflow-y-auto z-10 shadow-lg">
                            {VIDEO_QUALITY_OPTIONS.map((quality, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        update({ videoQuality: quality });
                                        setOpenVideoQualityDropdown(false);
                                    }}
                                    className={`px-2 py-1 text-xs sm:text-sm font-DmSans cursor-pointer transition-colors ${videoQuality === quality
                                        ? 'bg-BrandOrange text-BrandBlack'
                                        : 'text-BrandWhite hover:bg-BrandBlack'
                                        }`}
                                >
                                    {quality}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Watermark Switch */}
            <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5">
                <div className="flex items-center justify-between w-full gap-2">
                    <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Watermark</p>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            update({ watermark: !watermark });
                        }}
                        className={`relative w-[32px] h-[16px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${watermark ? 'bg-BrandOrange' : 'bg-BrandGray'
                            }`}
                        aria-label="Toggle watermark"
                    >
                        <FaCrown
                            className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 text-BrandBlack ${watermark ? 'translate-x-[18px]' : 'translate-x-[3px]'
                                } text-[10px] sm:text-[12px]`}
                        />
                    </button>
                </div>
            </div>

            {/* Include Metadata Switch */}
            <div className="flex flex-col w-full items-start justify-start gap-1 sm:gap-1.5">
                <div className="flex items-center justify-between w-full gap-2">
                    <p className="text-BrandWhite text-xs sm:text-sm font-DmSans">Include Metadata</p>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            update({ includeMetadata: !includeMetadata });
                        }}
                        className={`relative w-[32px] h-[16px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${includeMetadata ? 'bg-BrandOrange' : 'bg-BrandGray'
                            }`}
                        aria-label="Toggle include metadata"
                    >
                        <span
                            className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 w-[12px] h-[12px] bg-BrandBlack rounded-full shadow-sm ${includeMetadata ? 'translate-x-[18px]' : 'translate-x-[3px]'
                                }`}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
}
