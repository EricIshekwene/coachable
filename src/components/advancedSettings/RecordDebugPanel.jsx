import React, { useState, useEffect, useRef } from "react";

const STATE_COLORS = {
  idle: "text-BrandGray/70",
  countdown: "text-yellow-400",
  recording: "text-red-400",
  paused: "text-BrandOrange",
  previewing: "text-green-400",
};

const PLAYER_STATE_COLORS = {
  idle: "text-BrandGray/60",
  recording: "text-red-400",
  recorded: "text-green-400",
  paused: "text-BrandOrange",
};

const sectionClass =
  "bg-BrandBlack2 rounded px-2 py-1.5 text-[10px] font-mono border border-red-500/30";
const titleClass =
  "text-red-400 font-bold cursor-pointer hover:bg-red-500/10 px-1 py-0.5 rounded";

/**
 * RecordDebugPanel - Live debugging panel for recording mode.
 *
 * Sections:
 * - STATE: global state machine, countdown, enabled flag
 * - ACTIVE RECORDING: player, elapsed, buffer, feeds, RAF, latest position
 * - PREVIEW: preview time, RAF, frame count
 * - PLAYERS: per-player status + recorded/total counts
 * - TRACKS: keyframes saved per track
 */
export default function RecordDebugPanel({
  globalState,
  countdownValue,
  recordingModeEnabled,
  recordingPlayerId,
  recordingTimeMs,
  previewTimeMs,
  recordingDurationMs,
  stabilization,
  recordedCount,
  totalCount,
  playerStates,
  playersById,
  getDebugSnapshot,
  animationData,
}) {
  const [expanded, setExpanded] = useState({
    state: true,
    active: true,
    preview: false,
    players: true,
    tracks: true,
  });
  const [snapshot, setSnapshot] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const intervalRef = useRef(null);

  // Poll getDebugSnapshot every 250ms to get ref-based values (buffer, feeds, RAF, etc.)
  useEffect(() => {
    if (!getDebugSnapshot) return;
    const tick = () => setSnapshot(getDebugSnapshot());
    tick();
    intervalRef.current = setInterval(tick, 250);
    return () => clearInterval(intervalRef.current);
  }, [getDebugSnapshot]);

  const toggle = (section) =>
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));

  /** Builds a text snapshot for clipboard. */
  const generateLog = () => {
    const snap = snapshot || {};
    const lines = [];
    lines.push("=== RECORD DEBUG LOG ===");
    lines.push(`Time: ${new Date().toISOString()}`);
    lines.push("");

    lines.push("--- STATE ---");
    lines.push(`  enabled: ${recordingModeEnabled}`);
    lines.push(`  globalState: ${globalState}`);
    lines.push(`  countdownValue: ${countdownValue ?? "n/a"}`);
    lines.push("");

    lines.push("--- ACTIVE RECORDING ---");
    lines.push(`  recordingPlayerId: ${recordingPlayerId ?? "none"}`);
    lines.push(`  recordingTimeMs: ${Math.round(recordingTimeMs || 0)}`);
    lines.push(`  durationMs: ${Math.round(recordingDurationMs || 0)}`);
    lines.push(`  bufferedFrames: ${snap.bufferedFrames ?? "?"}`);
    lines.push(`  feedCount: ${snap.feedCount ?? "?"}`);
    lines.push(`  sampleCount: ${snap.sampleCount ?? "?"}`);
    lines.push(`  msSinceLastFeed: ${snap.msSinceLastFeed ?? "?"}`);
    lines.push(`  latestPos: x=${snap.latestPos?.x ?? "?"} y=${snap.latestPos?.y ?? "?"}`);
    lines.push(`  recordingRafActive: ${snap.recordingRafActive ?? "?"}`);
    lines.push(`  currentTrackKeyframes: ${snap.currentTrackKeyframes ?? "?"}`);
    lines.push("");

    lines.push("--- PREVIEW ---");
    lines.push(`  previewTimeMs: ${Math.round(previewTimeMs || 0)}`);
    lines.push(`  previewRafActive: ${snap.previewRafActive ?? "?"}`);
    lines.push(`  previewFrameCount: ${snap.previewFrameCount ?? "?"}`);
    lines.push("");

    lines.push("--- PLAYERS ---");
    lines.push(`  recorded: ${recordedCount}/${totalCount}`);
    lines.push(`  stabilization: ${Math.round((stabilization || 0) * 100)}%`);
    Object.entries(playerStates || {}).forEach(([id, state]) => {
      const p = playersById?.[id];
      const label = p ? `P${p.number}` : id;
      lines.push(`  ${label}: ${state}`);
    });
    lines.push("");

    lines.push("--- TRACKS ---");
    (snap.trackFrameCounts || []).forEach(({ id, keyframes }) => {
      const p = playersById?.[id];
      const label = p ? `P${p.number}` : id;
      lines.push(`  ${label}: ${keyframes} kf`);
    });
    lines.push("");

    lines.push("=== END LOG ===");
    return lines.join("\n");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateLog()).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  const snap = snapshot || {};
  const stateColor = STATE_COLORS[globalState] || "text-BrandGray/70";

  return (
    <div className="flex flex-col gap-2 bg-BrandBlack border border-red-500/50 rounded p-2 text-[9px] font-mono">

      {/* STATE */}
      <div className={sectionClass}>
        <div className={titleClass} onClick={() => toggle("state")}>
          {expanded.state ? "▼" : "▶"} STATE
        </div>
        {expanded.state && (
          <div className="pl-2 mt-1 space-y-0.5">
            <div>
              enabled:{" "}
              <span className={recordingModeEnabled ? "text-green-400" : "text-BrandGray/50"}>
                {String(recordingModeEnabled)}
              </span>
            </div>
            <div>
              globalState: <span className={stateColor}>{globalState}</span>
            </div>
            {countdownValue != null && (
              <div className="text-yellow-400 font-bold">
                countdown: {countdownValue}
              </div>
            )}
            <div className="text-BrandGray/50">
              duration: {Math.round(recordingDurationMs || 0)}ms
            </div>
            <div className="text-BrandGray/50">
              stabilization: {Math.round((stabilization || 0) * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* ACTIVE RECORDING */}
      <div className={sectionClass}>
        <div className={titleClass} onClick={() => toggle("active")}>
          {expanded.active ? "▼" : "▶"} ACTIVE RECORDING
        </div>
        {expanded.active && (
          <div className="pl-2 mt-1 space-y-0.5">
            <div>
              player:{" "}
              <span className={recordingPlayerId ? "text-red-400" : "text-BrandGray/40"}>
                {recordingPlayerId
                  ? playersById?.[recordingPlayerId]
                    ? `P${playersById[recordingPlayerId].number} (${recordingPlayerId})`
                    : recordingPlayerId
                  : "none"}
              </span>
            </div>
            <div>
              elapsed:{" "}
              <span className="text-BrandOrange">
                {Math.round(recordingTimeMs || 0)}ms
              </span>
              {" / "}
              <span className="text-BrandGray/60">
                {Math.round(recordingDurationMs || 0)}ms
              </span>
            </div>
            <div>
              buffer frames:{" "}
              <span className={snap.bufferedFrames > 0 ? "text-red-400" : "text-BrandGray/50"}>
                {snap.bufferedFrames ?? "?"}
              </span>
            </div>
            <div className="text-BrandGray/60">
              feeds: {snap.feedCount ?? "?"} | samples: {snap.sampleCount ?? "?"}
            </div>
            <div>
              ms since feed:{" "}
              <span className={
                snap.msSinceLastFeed == null
                  ? "text-BrandGray/40"
                  : snap.msSinceLastFeed > 500
                  ? "text-red-400"
                  : "text-green-400"
              }>
                {snap.msSinceLastFeed ?? "n/a"}
              </span>
            </div>
            <div>
              latest pos:{" "}
              <span className="text-BrandOrange/70">
                ({snap.latestPos?.x ?? "?"}, {snap.latestPos?.y ?? "?"})
              </span>
            </div>
            <div>
              RAF:{" "}
              <span className={snap.recordingRafActive ? "text-green-400" : "text-BrandGray/40"}>
                {snap.recordingRafActive ? "active" : "idle"}
              </span>
            </div>
            <div className="text-BrandGray/60">
              track kf saved: {snap.currentTrackKeyframes ?? "?"}
            </div>
          </div>
        )}
      </div>

      {/* PREVIEW */}
      <div className={sectionClass}>
        <div className={titleClass} onClick={() => toggle("preview")}>
          {expanded.preview ? "▼" : "▶"} PREVIEW
        </div>
        {expanded.preview && (
          <div className="pl-2 mt-1 space-y-0.5">
            <div>
              previewTime:{" "}
              <span className="text-green-400">
                {Math.round(previewTimeMs || 0)}ms
              </span>
            </div>
            <div>
              RAF:{" "}
              <span className={snap.previewRafActive ? "text-green-400" : "text-BrandGray/40"}>
                {snap.previewRafActive ? "active" : "idle"}
              </span>
            </div>
            <div className="text-BrandGray/60">
              frames rendered: {snap.previewFrameCount ?? "?"}
            </div>
          </div>
        )}
      </div>

      {/* PLAYERS */}
      <div className={sectionClass}>
        <div className={titleClass} onClick={() => toggle("players")}>
          {expanded.players ? "▼" : "▶"} PLAYERS ({recordedCount}/{totalCount} recorded)
        </div>
        {expanded.players && (
          <div className="pl-2 mt-1 space-y-0.5 max-h-32 overflow-y-auto">
            {Object.keys(playerStates || {}).length === 0 ? (
              <div className="text-BrandGray/40">no players</div>
            ) : (
              Object.entries(playerStates || {}).map(([id, state]) => {
                const p = playersById?.[id];
                const label = p ? `P${p.number}` : id;
                const isActive = id === recordingPlayerId;
                return (
                  <div key={id} className={`flex gap-1.5 ${isActive ? "font-bold" : ""}`}>
                    <span className="text-BrandGray/50 shrink-0">{label}</span>
                    <span className={PLAYER_STATE_COLORS[state] || "text-BrandGray/50"}>
                      {state}
                    </span>
                    {isActive && <span className="text-red-400">← active</span>}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* TRACKS */}
      <div className={sectionClass}>
        <div className={titleClass} onClick={() => toggle("tracks")}>
          {expanded.tracks ? "▼" : "▶"} TRACKS ({(snap.trackFrameCounts || []).length} with data)
        </div>
        {expanded.tracks && (
          <div className="pl-2 mt-1 space-y-0.5 max-h-32 overflow-y-auto">
            {(snap.trackFrameCounts || []).length === 0 ? (
              <div className="text-BrandGray/40">no recorded tracks</div>
            ) : (
              (snap.trackFrameCounts || []).map(({ id, keyframes }) => {
                const p = playersById?.[id];
                const label = p ? `P${p.number}` : id;
                const isActive = id === recordingPlayerId;
                return (
                  <div
                    key={id}
                    className={`flex justify-between ${isActive ? "text-red-400 font-bold" : "text-BrandGray/70"}`}
                  >
                    <span>{label}</span>
                    <span>{keyframes} kf</span>
                  </div>
                );
              })
            )}
            {/* Show all tracks from animationData even if no frames yet */}
            {Object.entries(animationData?.tracks || {})
              .filter(([id]) => !(snap.trackFrameCounts || []).some((t) => t.id === id))
              .map(([id]) => {
                const p = playersById?.[id];
                const label = p ? `P${p.number}` : id;
                return (
                  <div key={id} className="flex justify-between text-BrandGray/30">
                    <span>{label}</span>
                    <span>0 kf</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className={`text-[9px] font-bold px-2 py-1 rounded border transition-all ${
          copyFeedback
            ? "bg-red-500/40 border-red-400 text-red-300"
            : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
        }`}
      >
        {copyFeedback ? "✓ Copied!" : "Copy Record Logs"}
      </button>

      <div className="text-[8px] text-BrandGray/40 border-t border-red-500/20 pt-1">
        Record Debug — polls every 250ms · click headers to collapse
      </div>
    </div>
  );
}
