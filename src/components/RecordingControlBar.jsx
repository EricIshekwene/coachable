import React from "react";
import { FaCircle, FaStop, FaPlay, FaPause, FaUndo } from "react-icons/fa";

const formatTime = (ms) => {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
};

/**
 * Bottom control bar shown in recording mode. Shows record/stop/preview controls
 * and the current recording time.
 */
export default function RecordingControlBar({
  globalState,
  recordingPlayerId,
  recordingTimeMs,
  previewTimeMs,
  durationMs,
  recordedCount,
  totalCount,
  playerName,
  onStartPreview,
  onStopPreview,
  onStopRecording,
  onCancelRecording,
}) {
  const isRecording = globalState === "recording";
  const isPreviewing = globalState === "previewing";
  const isIdle = globalState === "idle";
  const displayTime = isRecording ? recordingTimeMs : isPreviewing ? previewTimeMs : 0;
  const progress = durationMs > 0 ? (displayTime / durationMs) * 100 : 0;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-BrandBlack/95 border border-BrandGray2 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-lg backdrop-blur-sm min-w-[340px]">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${isRecording ? "bg-red-500" : "bg-BrandOrange"}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 min-w-[100px]">
          {isRecording && (
            <>
              <FaCircle className="text-red-500 text-[10px] animate-pulse" />
              <span className="text-red-400 text-xs font-DmSans font-medium">
                REC
              </span>
            </>
          )}
          {isPreviewing && (
            <>
              <FaPlay className="text-BrandOrange text-[10px]" />
              <span className="text-BrandOrange text-xs font-DmSans font-medium">
                PREVIEW
              </span>
            </>
          )}
          {isIdle && (
            <span className="text-BrandGray text-xs font-DmSans">
              {recordedCount}/{totalCount} recorded
            </span>
          )}
        </div>

        {/* Player name during recording */}
        {isRecording && playerName && (
          <span className="text-white text-xs font-DmSans truncate max-w-[80px]">
            {playerName}
          </span>
        )}

        {/* Time display */}
        <span className="text-white text-xs font-DmSans font-mono tabular-nums">
          {formatTime(displayTime)} / {formatTime(durationMs)}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {isRecording && (
            <>
              <button
                onClick={onStopRecording}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors"
                title="Stop recording"
              >
                <FaStop className="text-[10px]" />
              </button>
              <button
                onClick={onCancelRecording}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-BrandGray2/40 hover:bg-BrandGray2/60 text-BrandGray transition-colors"
                title="Cancel recording"
              >
                <FaUndo className="text-[10px]" />
              </button>
            </>
          )}
          {isPreviewing && (
            <button
              onClick={onStopPreview}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-BrandOrange/20 hover:bg-BrandOrange/40 text-BrandOrange transition-colors"
              title="Stop preview"
            >
              <FaPause className="text-[10px]" />
            </button>
          )}
          {isIdle && recordedCount > 0 && (
            <button
              onClick={onStartPreview}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-BrandOrange/20 hover:bg-BrandOrange/40 text-BrandOrange transition-colors"
              title="Preview all recordings"
            >
              <FaPlay className="text-[10px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
