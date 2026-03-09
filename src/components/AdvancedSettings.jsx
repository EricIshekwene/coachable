import React from 'react';
import { FaTimes } from "react-icons/fa";
import { FaRegTrashCan } from "react-icons/fa6";
import { IoMdDownload } from "react-icons/io";
import PitchSettingsSection from "./advancedSettings/PitchSettingsSection";
import PlayerSettingsSection from "./advancedSettings/PlayerSettingsSection";
import BallSettingsSection from "./advancedSettings/BallSettingsSection";
import ExportVideoSettingsSection from "./advancedSettings/ExportVideoSettingsSection";
import AnimationSettingsSection from "./advancedSettings/AnimationSettingsSection";
import LoggerSettingsSection from "./advancedSettings/LoggerSettingsSection";
import SavePrefabButton from "./rightPanel/SavePrefabButton";
import PlayPreviewCard from "./PlayPreviewCard";

export default function AdvancedSettings({
    value,
    onChange,
    onReset,
    onClose,
    onCopyDebug,
    onCopyDrawDebug,
    onCopyKeyToolDebug,
    onCopyPlaceBallDebug,
    onCopyVideoExportDebug,
    onCopyRecordingDebug,
    onCopyKfMoveDebug,
    onDebugRotate,
    onDownload,
    autoplayEnabled,
    onAutoplayChange,
    onDeleteAllKeyframes,
    debugPlayData,
}) {
    const [showPreviewDebug, setShowPreviewDebug] = React.useState(false);
    const settings = value ?? {};
    const pitch = settings.pitch ?? {};
    const players = settings.players ?? {};
    const ball = settings.ball ?? {};
    const exportVideo = settings.exportVideo ?? {};
    const animation = settings.animation ?? {};

    const update = (patch) => onChange?.({ ...settings, ...patch });
    const updatePitch = (patch) => update({ pitch: { ...pitch, ...patch } });
    const updatePlayers = (patch) => update({ players: { ...players, ...patch } });
    const updateBall = (patch) => update({ ball: { ...ball, ...patch } });
    const updateExportVideo = (patch) => update({ exportVideo: { ...exportVideo, ...patch } });
    const updateAnimation = (patch) => update({ animation: { ...animation, ...patch } });
    return (
        <div className="absolute right-0 top-0 h-full z-50 flex flex-col">
            <aside
                className="
                     flex-1 shrink-0 bg-BrandBlack
                     w-36 sm:w-40 md:w-48 lg:w-52 xl:w-56
                     px-2 sm:px-2.5 md:px-3 py-2 sm:py-2.5 md:py-3
                     flex flex-col
                     gap-0.5 sm:gap-0.5 md:gap-1 lg:gap-1.5
                     select-none
                     overflow-y-auto hide-scroll
                     flex flex-col justify-start

                   "
            >
                <div className="flex flex-row border-b border-BrandGray2 pb-1.5 sm:pb-2 items-center justify-center gap-1.5 sm:gap-2 font-DmSans font-bold">
                    <p
                        className="text-BrandWhite text-lg sm:text-xl md:text-2xl bg-transparent border-none outline-none focus:outline-none text-center font-DmSans font-bold w-full max-w-[100px] sm:max-w-[110px] md:max-w-[120px]"
                    >
                        Advanced Settings
                    </p>
                </div>

                <PitchSettingsSection value={pitch} onChange={updatePitch} />

                {/* Playback settings (moved from control pill dropdown) */}
                <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1.5 sm:gap-2">
                    <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">
                        Playback
                    </div>
                    <div className="flex items-center justify-between w-full">
                        <span className="text-BrandGray text-[10px] sm:text-xs font-DmSans">Autoplay</span>
                        <button
                            onClick={() => onAutoplayChange?.(!autoplayEnabled)}
                            className={`relative w-[36px] h-[18px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${autoplayEnabled ? 'bg-BrandOrange' : 'bg-BrandGray2'}`}
                            aria-label="Toggle autoplay"
                        >
                            <span
                                className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-transform duration-200 w-[14px] h-[14px] bg-BrandBlack rounded-full shadow-sm ${autoplayEnabled ? 'translate-x-[20px]' : 'translate-x-[2px]'}`}
                            />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => onDeleteAllKeyframes?.()}
                        className="w-full h-6 sm:h-7 bg-BrandBlack2 border border-BrandGray rounded-md px-2 flex items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-BrandBlack"
                    >
                        <FaRegTrashCan className="text-BrandOrange text-xs shrink-0" aria-hidden />
                        <span className="text-BrandWhite text-[10px] sm:text-xs font-DmSans truncate">
                            Clear All Keyframes
                        </span>
                    </button>
                </div>

                <PlayerSettingsSection value={players} onChange={updatePlayers} />
                <BallSettingsSection value={ball} onChange={updateBall} />
                <ExportVideoSettingsSection value={exportVideo} onChange={updateExportVideo} />
                <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1 sm:gap-2">
                    <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">
                        Export
                    </div>
                    <button
                        type="button"
                        onClick={() => onDownload?.()}
                        className="group w-full h-6 sm:h-7 bg-BrandBlack2 border border-BrandGray rounded-md px-2 flex items-center gap-2 cursor-pointer transition-colors hover:bg-BrandBlack"
                    >
                        <IoMdDownload className="text-BrandOrange text-sm shrink-0" aria-hidden />
                        <span className="text-BrandWhite text-xs sm:text-sm font-DmSans truncate">
                            Download
                        </span>
                    </button>
                </div>
                <AnimationSettingsSection value={animation} onChange={updateAnimation} />
                <LoggerSettingsSection
                    onCopyDebug={onCopyDebug}
                    onCopyDrawDebug={onCopyDrawDebug}
                    onCopyKeyToolDebug={onCopyKeyToolDebug}
                    onCopyPlaceBallDebug={onCopyPlaceBallDebug}
                    onCopyVideoExportDebug={onCopyVideoExportDebug}
                    onCopyRecordingDebug={onCopyRecordingDebug}
                    onCopyKfMoveDebug={onCopyKfMoveDebug}
                    onDebugRotate={onDebugRotate}
                />
                {/* Debug Preview */}
                <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1 sm:gap-2">
                    <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">
                        Preview Debug
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowPreviewDebug((v) => !v)}
                        className="w-full h-6 sm:h-7 bg-BrandBlack2 border border-BrandGray rounded-md px-2 flex items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-BrandBlack"
                    >
                        <span className="text-BrandWhite text-[10px] sm:text-xs font-DmSans truncate">
                            {showPreviewDebug ? "Hide Preview" : "Show Preview"}
                        </span>
                    </button>
                    {showPreviewDebug && debugPlayData && (
                        <div className="w-full">
                            <PlayPreviewCard
                                playData={debugPlayData}
                                autoplay="always"
                                cameraMode="fit-distribution"
                                background="field"
                                paddingPx={26}
                                minSpanPx={150}
                                shape="landscape"
                            />
                        </div>
                    )}
                </div>
                <SavePrefabButton />
            </aside>
            {/* Reset to Default - Fixed at bottom */}
            <div className="w-36 sm:w-40 md:w-48 lg:w-52 xl:w-56 px-2 sm:px-2.5 md:px-3 py-2 sm:py-2.5 bg-BrandBlack border-t border-BrandGray2">
                <button
                    onClick={() => onReset?.()}
                    className="text-BrandBlack text-xs sm:text-sm md:text-base font-DmSans bg-BrandOrange h-5 sm:h-6 w-full flex flex-row items-center justify-center rounded-md cursor-pointer hover:bg-BrandOrange/90 transition-colors"
                >
                    Reset to Default
                </button>
            </div>
            {/* close menu */}
            <button
                onClick={() => {
                    onClose?.();
                }}
                className="absolute left-[-45px] top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-BrandBlack border border-BrandGray2/80 rounded-full z-50 shadow-[0_16px_30px_-20px_rgba(0,0,0,0.95)] flex items-center justify-center cursor-pointer hover:bg-BrandBlack2 transition-colors duration-200 hover:border-BrandOrange"
                aria-label="Close advanced settings"
            >
                <FaTimes className="text-BrandOrange text-sm sm:text-base md:text-lg hover:text-BrandOrange transition-colors" />
            </button>
        </div>
    )
}
