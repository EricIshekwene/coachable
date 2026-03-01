import React, { useMemo, useState } from "react";
import TimeBar from "./TimeBar";
import SpeedSlider from "./SpeedSlider";
import PlaybackControls from "./PlaybackControls";
import KeyframeManager from "./KeyframeManager";
import DropdownMenu from "./DropdownMenu";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * ControlPill - Timeline view/controller driven by external animation state.
 */
export default function ControlPill({
  durationMs = 30000,
  currentTimeMs = 0,
  isPlaying = false,
  speedMultiplier = 50,
  autoplayEnabled = true,
  keyframesMs = [],
  selectedKeyframeMs = null,
  onSeek,
  onPause,
  onPlayToggle,
  onSpeedChange,
  onAddKeyframe,
  onDeleteKeyframe,
  onDeleteAllKeyframes,
  onSelectKeyframe,
  onAutoplayChange,
  getAuthoritativeTimeMs,
  onDragStateChange,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const timelineDurationMs = Math.max(1, Math.round(Number(durationMs) || 30000));
  const clampedTimeMs = clamp(Math.round(Number(currentTimeMs) || 0), 0, timelineDurationMs);

  const keyframeMarkers = useMemo(
    () =>
      [...(keyframesMs || [])]
        .sort((a, b) => a - b)
        .map((timeMs) => ({
          timeMs,
          timePercent: (timeMs / timelineDurationMs) * 100,
        })),
    [keyframesMs, timelineDurationMs]
  );

  const sortedKeyframes = useMemo(() => [...(keyframesMs || [])].sort((a, b) => a - b), [keyframesMs]);

  const handleSeek = (timeMs, meta) => {
    onSelectKeyframe?.(null);
    onSeek?.(timeMs, meta);
  };

  const handlePlayToggle = () => {
    if (!isPlaying && clampedTimeMs >= timelineDurationMs) {
      onSeek?.(0, { source: "engine" });
      onSelectKeyframe?.(null);
    }
    onPlayToggle?.();
  };

  const jumpToTime = (nextTimeMs) => {
    const clamped = clamp(Math.round(nextTimeMs), 0, timelineDurationMs);
    onSeek?.(clamped, { source: "engine" });
  };

  const handleSkipBack = () => {
    if (!sortedKeyframes.length) {
      jumpToTime(0);
      return;
    }
    const previous = [...sortedKeyframes].reverse().find((keyframeTime) => keyframeTime < clampedTimeMs);
    if (previous === undefined) {
      jumpToTime(0);
      return;
    }
    onSelectKeyframe?.(previous);
    jumpToTime(previous);
  };

  const handleSkipForward = () => {
    if (!sortedKeyframes.length) {
      jumpToTime(timelineDurationMs);
      return;
    }
    const next = sortedKeyframes.find((keyframeTime) => keyframeTime > clampedTimeMs);
    if (next === undefined) {
      jumpToTime(timelineDurationMs);
      return;
    }
    onSelectKeyframe?.(next);
    jumpToTime(next);
  };

  const handleKeyframeClick = (event, marker) => {
    event.stopPropagation();
    if (!marker) return;
    if (selectedKeyframeMs === marker.timeMs) {
      onSelectKeyframe?.(null);
      return;
    }
    onSelectKeyframe?.(marker.timeMs);
    jumpToTime(marker.timeMs);
  };

  const handleAddKeyframe = (event) => {
    event.stopPropagation();
    onAddKeyframe?.();
  };

  const handleDeleteKeyframe = (event) => {
    event.stopPropagation();
    if (selectedKeyframeMs === null || selectedKeyframeMs === undefined) return;
    onDeleteKeyframe?.(selectedKeyframeMs);
    onSelectKeyframe?.(null);
  };

  const handleTrash = (event) => {
    event.stopPropagation();
    onDeleteAllKeyframes?.();
    onSelectKeyframe?.(null);
  };

  const handleAutoplayToggle = () => {
    const next = !autoplayEnabled;
    onAutoplayChange?.(next);
    if (!next) {
      onPause?.();
      onSeek?.(0, { source: "engine" });
      onSelectKeyframe?.(null);
    }
  };

  return (
    <>
      <div
        className={`aspect-[641/124] h-[62.5px] sm:h-[75px] md:h-[100px] lg:h-[125px]
                        flex flex-col items-center justify-between gap-[3.125px] sm:gap-[6.25px]
                        bg-BrandBlack
                         py-[3.125px] sm:py-[6.25px] px-[12.5px] sm:px-[15.625px] md:px-[18.75px]
                        rounded-[25px] sm:rounded-[28.125px] md:rounded-[31.25px]
                        select-none z-50
                        absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${isDropdownOpen ? "top-[84%]" : "top-[87%]   "
          }`}
      >
        <TimeBar
          durationMs={timelineDurationMs}
          currentTimeMs={clampedTimeMs}
          isPlaying={isPlaying}
          keyframes={keyframeMarkers}
          selectedKeyframeMs={selectedKeyframeMs}
          onSeek={handleSeek}
          onKeyframeClick={handleKeyframeClick}
          getAuthoritativeTimeMs={getAuthoritativeTimeMs}
          onDragStateChange={onDragStateChange}
        />

        <div className="flex flex-1 w-full items-center justify-between gap-[3.125px] sm:gap-[6.25px]">
          <SpeedSlider
            speedMultiplier={speedMultiplier}
            onSpeedChange={onSpeedChange}
            durationMs={timelineDurationMs}
          />

          <PlaybackControls
            isPlaying={isPlaying}
            onPlayToggle={handlePlayToggle}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
          />

          <KeyframeManager
            selectedKeyframe={selectedKeyframeMs}
            onAddKeyframe={handleAddKeyframe}
            onDeleteKeyframe={handleDeleteKeyframe}
          />
        </div>
      </div>

      <DropdownMenu
        isOpen={isDropdownOpen}
        onToggle={() => setIsDropdownOpen((prev) => !prev)}
        onTrash={handleTrash}
        onUndo={() => {}}
        onRedo={() => {}}
        autoplayEnabled={autoplayEnabled}
        onAutoplayToggle={handleAutoplayToggle}
        canUndo={false}
        canRedo={false}
      />
    </>
  );
}
