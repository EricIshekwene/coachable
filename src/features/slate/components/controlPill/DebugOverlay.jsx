import React from "react";

export default function DebugOverlay({
  playing = false,
  engineTimeMs = 0,
  uiTimeMs = 0,
  dragging = false,
  lastTickDeltaMs = 0,
  playersUpdated = 0,
  durationMs = 0,
  selectedKeyframeCount = 0,
}) {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed top-2 left-2 z-[120] bg-BrandBlack/85 border border-BrandGray rounded-md px-2 py-1 text-[10px] leading-tight text-BrandOrange pointer-events-none font-mono">
      <div>playing: {String(Boolean(playing))}</div>
      <div>engineTimeMs: {Math.round(Number(engineTimeMs) || 0)}</div>
      <div>uiTimeMs: {Math.round(Number(uiTimeMs) || 0)}</div>
      <div>dragging: {String(Boolean(dragging))}</div>
      <div>lastTickDeltaMs: {Math.round(Number(lastTickDeltaMs) || 0)}</div>
      <div>playersUpdated: {Math.round(Number(playersUpdated) || 0)}</div>
      <div>durationMs: {Math.round(Number(durationMs) || 0)}</div>
      <div>selectedKeyframes: {Math.round(Number(selectedKeyframeCount) || 0)}</div>
    </div>
  );
}
