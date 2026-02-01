import React from 'react';
import { FaTimes } from "react-icons/fa";
import PitchSettingsSection from "./advancedSettings/PitchSettingsSection";
import PlayerSettingsSection from "./advancedSettings/PlayerSettingsSection";
import ExportVideoSettingsSection from "./advancedSettings/ExportVideoSettingsSection";
import AnimationSettingsSection from "./advancedSettings/AnimationSettingsSection";
import LoggerSettingsSection from "./advancedSettings/LoggerSettingsSection";
import SavePrefabButton from "./rightPanel/SavePrefabButton";

export default function AdvancedSettings({ value, onChange, onReset, onClose }) {
    const settings = value ?? {};
    const pitch = settings.pitch ?? {};
    const players = settings.players ?? {};
    const exportVideo = settings.exportVideo ?? {};
    const animation = settings.animation ?? {};
    const logging = settings.logging ?? {};

    const update = (patch) => onChange?.({ ...settings, ...patch });
    const updatePitch = (patch) => update({ pitch: { ...pitch, ...patch } });
    const updatePlayers = (patch) => update({ players: { ...players, ...patch } });
    const updateExportVideo = (patch) => update({ exportVideo: { ...exportVideo, ...patch } });
    const updateAnimation = (patch) => update({ animation: { ...animation, ...patch } });
    const updateLogging = (patch) => update({ logging: { ...logging, ...patch } });

    return (
        <div className="absolute right-0 top-0 h-screen z-50 flex flex-col">
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
                <PlayerSettingsSection value={players} onChange={updatePlayers} />
                <ExportVideoSettingsSection value={exportVideo} onChange={updateExportVideo} />
                <AnimationSettingsSection value={animation} onChange={updateAnimation} />
                <LoggerSettingsSection value={logging} onChange={updateLogging} />
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
                className="absolute left-[-45px] top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-BrandBlack border-[0.5px] border-BrandGray rounded-full z-50 shadow-lg flex items-center justify-center cursor-pointer hover:bg-BrandBlack2 transition-colors duration-200 hover:border-BrandOrange"
                aria-label="Close advanced settings"
            >
                <FaTimes className="text-BrandOrange text-sm sm:text-base md:text-lg hover:text-BrandOrange transition-colors" />
            </button>
        </div>
    )
}
