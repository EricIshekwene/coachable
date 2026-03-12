import React, { useState } from 'react';

/**
 * DebugPanel - Comprehensive debugging tool showing animation state, keyframes, selections, and positions.
 * Helps diagnose issues with multi-select drag, keyframe management, and play data.
 */
export default function DebugPanel({
  selectedItemIds = [],
  playersById = {},
  ballsById = {},
  animationData = {},
  currentTimeMs = 0,
}) {
  const [expandedSections, setExpandedSections] = useState({
    selection: true,
    keyframes: true,
    positions: true,
    animation: false,
  });
  const [copyFeedback, setCopyFeedback] = useState(false);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  /**
   * Generates a formatted text representation of all debug data.
   * Can be copied to clipboard for sharing/analysis.
   */
  const generateDebugLog = () => {
    const lines = [];
    lines.push('=== DEBUG LOG ===');
    lines.push(`Time: ${new Date().toISOString()}`);
    lines.push(`Current Time: ${Math.round(currentTimeMs)}ms`);
    lines.push('');

    // Selection
    lines.push('--- SELECTION ---');
    lines.push(`Selected Items: ${selectedItemIds?.length || 0}`);
    selectedItemIds?.forEach((id) => {
      const player = playersById?.[id];
      const ball = ballsById?.[id];
      const label = player ? `P${player.number}` : ball ? 'Ball' : '?';
      lines.push(`  ${id}: ${label}`);
    });
    lines.push('');

    // Keyframes
    const allKeyframeTimes = new Set();
    Object.values(animationData.tracks || {}).forEach((track) => {
      if (track?.keyframes?.length) {
        track.keyframes.forEach((kf) => {
          allKeyframeTimes.add(kf.t);
        });
      }
    });
    const sortedKeyframeTimes = Array.from(allKeyframeTimes).sort((a, b) => a - b);

    lines.push('--- KEYFRAMES ---');
    lines.push(`Total Keyframe Times: ${sortedKeyframeTimes.length}`);
    sortedKeyframeTimes.forEach((timeMs) => {
      const count = Object.values(animationData.tracks || {}).filter(
        (track) => track?.keyframes?.some((k) => Math.abs(k.t - timeMs) < 0.5)
      ).length;
      const isCurrent = Math.abs(timeMs - currentTimeMs) < 1;
      lines.push(`  t=${Math.round(timeMs)}ms (${count} tracks)${isCurrent ? ' [CURRENT]' : ''}`);
    });
    lines.push('');

    // Positions
    const currentPositions = {};
    Object.entries(playersById || {}).forEach(([id, player]) => {
      currentPositions[id] = { x: player.x, y: player.y, type: 'player', number: player.number };
    });
    Object.entries(ballsById || {}).forEach(([id, ball]) => {
      currentPositions[id] = { x: ball.x, y: ball.y, type: 'ball' };
    });

    lines.push('--- POSITIONS ---');
    Object.entries(currentPositions).forEach(([id, pos]) => {
      const isSelected = selectedItemIds?.includes(id);
      const label = pos.type === 'player' ? `P${pos.number}` : 'Ball';
      lines.push(
        `  ${label} (${id}): x=${Math.round(pos.x)} y=${Math.round(pos.y)}${isSelected ? ' [SELECTED]' : ''}`
      );
    });
    lines.push('');

    // Animation Data
    lines.push('--- ANIMATION DATA ---');
    lines.push(`Duration: ${Math.round(animationData.durationMs || 0)}ms`);
    lines.push(`Tracks: ${Object.keys(animationData.tracks || {}).length}`);
    Object.entries(animationData.tracks || {}).forEach(([id, track]) => {
      lines.push(`  ${id}: ${track?.keyframes?.length || 0} keyframes`);
    });
    lines.push('');
    lines.push('=== END LOG ===');

    return lines.join('\n');
  };

  const handleCopyLogs = () => {
    const log = generateDebugLog();
    navigator.clipboard.writeText(log).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  // Extract all keyframe times across all tracks
  const allKeyframeTimes = new Set();
  Object.values(animationData.tracks || {}).forEach((track) => {
    if (track?.keyframes?.length) {
      track.keyframes.forEach((kf) => {
        allKeyframeTimes.add(kf.t);
      });
    }
  });
  const sortedKeyframeTimes = Array.from(allKeyframeTimes).sort((a, b) => a - b);

  // Get keyframes at current time
  const keyframesAtCurrentTime = {};
  Object.entries(animationData.tracks || {}).forEach(([itemId, track]) => {
    if (track?.keyframes?.length) {
      const kf = track.keyframes.find((k) => Math.abs(k.t - currentTimeMs) < 1);
      if (kf) {
        keyframesAtCurrentTime[itemId] = kf;
      }
    }
  });

  // Get current positions from playersById and ballsById
  const currentPositions = {};
  Object.entries(playersById || {}).forEach(([id, player]) => {
    currentPositions[id] = { x: player.x, y: player.y, type: 'player', number: player.number };
  });
  Object.entries(ballsById || {}).forEach(([id, ball]) => {
    currentPositions[id] = { x: ball.x, y: ball.y, type: 'ball' };
  });

  const sectionClass = "bg-BrandBlack2 rounded px-2 py-1.5 text-[10px] font-mono border border-BrandOrange/30";
  const titleClass = "text-BrandOrange font-bold cursor-pointer hover:bg-BrandOrange/10 px-1 py-0.5 rounded";

  return (
    <div className="flex flex-col gap-2 bg-BrandBlack border border-BrandOrange/50 rounded p-2 text-[9px] font-mono">
      {/* Selection Debug */}
      <div className={sectionClass}>
        <div className={titleClass} onClick={() => toggleSection('selection')}>
          ▶ SELECTION ({selectedItemIds?.length || 0} items)
        </div>
        {expandedSections.selection && (
          <div className="pl-2 mt-1 space-y-1 max-h-24 overflow-y-auto">
            {selectedItemIds?.length > 0 ? (
              selectedItemIds.map((id) => {
                const player = playersById?.[id];
                const ball = ballsById?.[id];
                const label = player ? `${player.number || '?'}` : ball ? 'ball' : '?';
                return (
                  <div key={id} className="text-BrandOrange/80">
                    {id}: {label}
                  </div>
                );
              })
            ) : (
              <div className="text-BrandGray">none selected</div>
            )}
          </div>
        )}
      </div>

      {/* Keyframes Debug */}
      <div className={sectionClass}>
        <div className={titleClass} onClick={() => toggleSection('keyframes')}>
          ▶ KEYFRAMES ({sortedKeyframeTimes.length} total)
        </div>
        {expandedSections.keyframes && (
          <div className="pl-2 mt-1 space-y-1 max-h-32 overflow-y-auto">
            {sortedKeyframeTimes.length > 0 ? (
              sortedKeyframeTimes.map((timeMs) => {
                const isCurrentTime = Math.abs(timeMs - currentTimeMs) < 1;
                const count = Object.values(animationData.tracks || {}).filter(
                  (track) => track?.keyframes?.some((k) => Math.abs(k.t - timeMs) < 0.5)
                ).length;
                return (
                  <div
                    key={`kf-${timeMs}`}
                    className={`${isCurrentTime ? 'bg-BrandOrange/20 text-BrandOrange font-bold' : 'text-BrandGray/80'}`}
                  >
                    t={Math.round(timeMs)}ms ({count} tracks)
                  </div>
                );
              })
            ) : (
              <div className="text-BrandGray">no keyframes</div>
            )}
            {Object.keys(keyframesAtCurrentTime).length > 0 && (
              <div className="border-t border-BrandOrange/20 pt-1 mt-1">
                <div className="text-BrandOrange">@ current time:</div>
                {Object.entries(keyframesAtCurrentTime).map(([id, kf]) => (
                  <div key={`cur-${id}`} className="text-BrandOrange/70">
                    {id}: x={Math.round(kf.x)}, y={Math.round(kf.y)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Positions Debug */}
      <div className={sectionClass}>
        <div className={titleClass} onClick={() => toggleSection('positions')}>
          ▶ POSITIONS ({Object.keys(currentPositions).length} items)
        </div>
        {expandedSections.positions && (
          <div className="pl-2 mt-1 space-y-1 max-h-32 overflow-y-auto">
            {Object.entries(currentPositions).map(([id, pos]) => {
              const isSelected = selectedItemIds?.includes(id);
              return (
                <div
                  key={`pos-${id}`}
                  className={`${isSelected ? 'text-BrandOrange font-bold' : 'text-BrandGray/70'}`}
                >
                  {pos.type === 'player' ? `P${pos.number}` : 'B'}: ({Math.round(pos.x)}, {Math.round(pos.y)})
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Animation Data Debug */}
      <div className={sectionClass}>
        <div className={titleClass} onClick={() => toggleSection('animation')}>
          ▶ ANIMATION DATA
        </div>
        {expandedSections.animation && (
          <div className="pl-2 mt-1 space-y-0.5 max-h-40 overflow-y-auto">
            <div>
              Duration: {Math.round(animationData.durationMs || 0)}ms ({Math.round((animationData.durationMs || 0) / 1000)}s)
            </div>
            <div>
              Tracks: {Object.keys(animationData.tracks || {}).length}
            </div>
            <div>
              Current Time: {Math.round(currentTimeMs)}ms
            </div>
            <div className="border-t border-BrandOrange/20 pt-1 mt-1">
              {Object.entries(animationData.tracks || {}).map(([id, track]) => (
                <div key={`track-${id}`} className="text-BrandGray/60">
                  {id}: {track?.keyframes?.length || 0} kf
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Copy Button */}
      <button
        onClick={handleCopyLogs}
        className={`text-[9px] font-bold px-2 py-1 rounded border transition-all ${
          copyFeedback
            ? 'bg-BrandOrange/40 border-BrandOrange text-BrandOrange'
            : 'bg-BrandOrange/10 border-BrandOrange/30 text-BrandOrange hover:bg-BrandOrange/20'
        }`}
      >
        {copyFeedback ? '✓ Copied!' : 'Copy Logs'}
      </button>

      <div className="text-[8px] text-BrandGray/50 border-t border-BrandOrange/20 pt-1">
        Debug Panel v1 — Click headers to expand/collapse
      </div>
    </div>
  );
}
