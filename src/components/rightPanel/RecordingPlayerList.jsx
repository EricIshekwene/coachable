import React from "react";
import { FaCircle, FaCheck, FaPlay, FaTrash } from "react-icons/fa";

/**
 * Right panel section shown in recording mode.
 * Lists all players with their recording status (idle/recording/recorded).
 * Allows selecting a player to record, re-recording, and clearing recordings.
 */
export default function RecordingPlayerList({
  playersById,
  representedPlayerIds,
  playerStates,
  recordingPlayerId,
  globalState,
  onStartRecording,
  onClearPlayerRecording,
  onClearAllRecordings,
}) {
  const ids = representedPlayerIds || [];
  const isRecording = globalState === "recording";
  const isPreviewing = globalState === "previewing";
  const isBusy = isRecording || isPreviewing;

  const recordedCount = Object.values(playerStates).filter((s) => s === "recorded").length;

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-BrandOrange text-xs sm:text-sm font-DmSans font-medium">
          Record Players
        </span>
        {recordedCount > 0 && !isBusy && (
          <button
            onClick={onClearAllRecordings}
            className="text-BrandGray hover:text-red-400 text-[10px] font-DmSans transition-colors"
            title="Clear all recordings"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto hide-scroll">
        {ids.map((id) => {
          const player = playersById?.[id];
          if (!player) return null;

          const state = playerStates[id] || "idle";
          const isCurrentlyRecording = recordingPlayerId === id;
          const isRecorded = state === "recorded";
          const isIdle = state === "idle";

          return (
            <div
              key={id}
              className={`
                flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors
                ${isCurrentlyRecording ? "bg-red-500/15 border border-red-500/30" : ""}
                ${isRecorded ? "bg-green-500/10 border border-green-500/20" : ""}
                ${isIdle && !isCurrentlyRecording ? "bg-BrandGray2/20 border border-transparent" : ""}
              `}
            >
              {/* Status icon */}
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {isCurrentlyRecording && (
                  <FaCircle className="text-red-500 text-[8px] animate-pulse" />
                )}
                {isRecorded && !isCurrentlyRecording && (
                  <FaCheck className="text-green-500 text-[10px]" />
                )}
                {isIdle && !isCurrentlyRecording && (
                  <div className="w-2 h-2 rounded-full bg-BrandGray2" />
                )}
              </div>

              {/* Player color dot + name */}
              <div
                className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                style={{ backgroundColor: player.color || "#ef4444" }}
              />
              <span className="text-white text-xs font-DmSans truncate flex-1">
                {player.number != null ? `#${player.number} ` : ""}
                {player.name || `Player`}
              </span>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Record / Re-record button */}
                {!isBusy && (
                  <button
                    onClick={() => onStartRecording(id)}
                    className={`
                      w-6 h-6 flex items-center justify-center rounded-md transition-colors
                      ${isRecorded
                        ? "bg-BrandOrange/20 hover:bg-BrandOrange/40 text-BrandOrange"
                        : "bg-red-500/20 hover:bg-red-500/40 text-red-400"
                      }
                    `}
                    title={isRecorded ? "Re-record" : "Record"}
                  >
                    {isRecorded ? (
                      <FaPlay className="text-[8px]" />
                    ) : (
                      <FaCircle className="text-[8px]" />
                    )}
                  </button>
                )}

                {/* Clear recording */}
                {isRecorded && !isBusy && (
                  <button
                    onClick={() => onClearPlayerRecording(id)}
                    className="w-6 h-6 flex items-center justify-center rounded-md bg-BrandGray2/30 hover:bg-red-500/30 text-BrandGray hover:text-red-400 transition-colors"
                    title="Clear recording"
                  >
                    <FaTrash className="text-[8px]" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ids.length === 0 && (
        <p className="text-BrandGray text-[10px] font-DmSans mt-1">
          Add players to the canvas first, then record their movements one at a time.
        </p>
      )}
    </div>
  );
}
