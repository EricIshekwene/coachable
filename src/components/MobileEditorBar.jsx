import { useState, useMemo } from "react";
import {
  FiPlay, FiPause, FiPlus, FiMinus,
  FiRotateCcw, FiRotateCw,
  FiTrash2, FiUsers, FiSettings, FiTool,
  FiChevronDown, FiMousePointer, FiMove,
} from "react-icons/fi";
import { PiPencilSimpleLine } from "react-icons/pi";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

// ── Compact timeline scrubber ────────────────────────────────────────────────

/**
 * MobileTimeline — touch-draggable scrubber bar for the mobile editor.
 * Sits above the nav bar. Shows keyframe tick marks and current time.
 */
function MobileTimeline({
  durationMs,
  currentTimeMs,
  isPlaying,
  keyframesMs = [],
  onSeek,
  onPause,
  onPlayToggle,
  onAddKeyframe,
}) {
  const duration = Math.max(1, durationMs);
  const progress = clamp(currentTimeMs / duration, 0, 1);

  const handleTrackPointer = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    onPause?.();
    onSeek?.(ratio * duration, { source: "scrub" });
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-BrandBlack border-t border-white/10">
      {/* Play / pause */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onPlayToggle}
        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-BrandOrange text-white active:brightness-90"
      >
        {isPlaying ? <FiPause className="text-base" /> : <FiPlay className="text-base ml-0.5" />}
      </button>

      {/* Track */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Time label row */}
        <div className="flex justify-between text-[10px] text-BrandGray2 font-DmSans select-none">
          <span>{fmt(currentTimeMs)}</span>
          <span>{fmt(duration)}</span>
        </div>

        {/* Scrubber track */}
        <div
          className="relative h-5 flex items-center cursor-pointer touch-none"
          onPointerDown={handleTrackPointer}
          onTouchStart={handleTrackPointer}
          onTouchMove={handleTrackPointer}
        >
          {/* Track bg */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/10" />
          {/* Filled portion */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-BrandOrange pointer-events-none"
            style={{ width: `${progress * 100}%` }}
          />
          {/* Keyframe ticks */}
          {keyframesMs.map((kf) => (
            <div
              key={kf}
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full bg-white/60 pointer-events-none"
              style={{ left: `${(kf / duration) * 100}%` }}
            />
          ))}
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow pointer-events-none"
            style={{ left: `calc(${progress * 100}% - 8px)` }}
          />
        </div>
      </div>

      {/* Add keyframe */}
      <button
        onClick={onAddKeyframe}
        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-white/20 text-BrandGray active:bg-white/10"
        title="Add keyframe"
      >
        <FiPlus className="text-base" />
      </button>
    </div>
  );
}

// ── Bottom sheet wrapper ─────────────────────────────────────────────────────

function BottomSheet({ open, onClose, title, children }) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
        />
      )}
      {/* Sheet */}
      <div
        className={`fixed bottom-0 inset-x-0 z-50 bg-[#1a1a1a] rounded-t-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "70dvh" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-white/10">
          <span className="text-sm font-semibold text-white font-DmSans">{title}</span>
          <button onClick={onClose} className="text-BrandGray2 active:text-white p-1">
            <FiChevronDown className="text-lg" />
          </button>
        </div>
        {/* Content */}
        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: "calc(70dvh - 80px)" }}>
          {children}
        </div>
      </div>
    </>
  );
}

// ── Sheet contents ───────────────────────────────────────────────────────────

function ToolsSheet({ activeTool, onToolChange, onUndo, onRedo, onReset, onDeleteSelected, onAddPlayer, zoomPercent, onZoomIn, onZoomOut }) {
  const tools = [
    { id: "select", label: "Select", icon: <FiMousePointer className="text-lg" /> },
    { id: "hand",   label: "Pan",    icon: <FiMove className="text-lg" /> },
    { id: "pen",    label: "Draw",   icon: <PiPencilSimpleLine className="text-lg" /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Tool picker */}
      <div>
        <p className="text-[11px] text-BrandGray2 uppercase tracking-wider mb-2">Tool</p>
        <div className="grid grid-cols-3 gap-2">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => onToolChange(t.id)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-DmSans transition ${
                activeTool === t.id
                  ? "border-BrandOrange bg-BrandOrange/10 text-BrandOrange"
                  : "border-white/10 text-BrandGray active:bg-white/5"
              }`}
            >
              {t.icon}
              <span className="text-[11px]">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* History */}
      <div>
        <p className="text-[11px] text-BrandGray2 uppercase tracking-wider mb-2">History</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Undo", icon: <FiRotateCcw />, action: onUndo },
            { label: "Redo", icon: <FiRotateCw />,  action: onRedo },
            { label: "Reset", icon: <FiTrash2 />,  action: onReset },
          ].map(({ label, icon, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-white/10 text-BrandGray text-lg active:bg-white/5"
            >
              {icon}
              <span className="text-[11px]">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Zoom */}
      <div>
        <p className="text-[11px] text-BrandGray2 uppercase tracking-wider mb-2">Zoom — {zoomPercent}%</p>
        <div className="flex gap-3">
          <button
            onClick={onZoomOut}
            className="flex-1 py-3 rounded-xl border border-white/10 text-BrandGray text-xl flex items-center justify-center active:bg-white/5"
          >
            <FiMinus />
          </button>
          <button
            onClick={onZoomIn}
            className="flex-1 py-3 rounded-xl border border-white/10 text-BrandGray text-xl flex items-center justify-center active:bg-white/5"
          >
            <FiPlus />
          </button>
        </div>
      </div>

      {/* Add / delete */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onAddPlayer}
          className="w-full py-3 rounded-xl bg-BrandOrange text-white font-semibold text-sm font-DmSans active:brightness-90"
        >
          + Add Player
        </button>
        <button
          onClick={onDeleteSelected}
          className="w-full py-3 rounded-xl border border-red-500/40 text-red-400 text-sm font-DmSans active:bg-red-500/10"
        >
          Delete Selected
        </button>
      </div>
    </div>
  );
}

function PlayersSheet({ playersById, representedPlayerIds, selectedPlayerIds, onSelectPlayer, onDeletePlayer }) {
  const players = useMemo(() => Object.values(playersById || {}), [playersById]);

  return (
    <div className="flex flex-col gap-2">
      {players.length === 0 && (
        <p className="text-sm text-BrandGray2 text-center py-6">No players yet. Add one from the Tools tab.</p>
      )}
      {players.map((p) => {
        const isSelected = selectedPlayerIds?.includes(p.id);
        const hasPos = representedPlayerIds?.includes(p.id);
        return (
          <div
            key={p.id}
            onClick={() => onSelectPlayer(p.id, { multi: false })}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${
              isSelected ? "border-BrandOrange bg-BrandOrange/10" : "border-white/10 active:bg-white/5"
            }`}
          >
            {/* Colour swatch + number */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: p.color || "#ef4444" }}
            >
              {p.number ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-DmSans truncate">{p.name || `Player ${p.number}`}</p>
              <p className="text-[11px] text-BrandGray2">{hasPos ? "Has position" : "No position set"}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDeletePlayer(p.id); }}
              className="p-2 text-BrandGray2 active:text-red-400"
            >
              <FiTrash2 className="text-sm" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function SettingsSheet({ advancedSettings, onOpenAdvancedSettings, onSaveToPlaybook, onImport }) {
  const rows = [
    onSaveToPlaybook && { label: "Save to Playbook", action: onSaveToPlaybook },
    onImport         && { label: "Import Play",       action: onImport },
    onOpenAdvancedSettings && { label: "Advanced Settings", action: onOpenAdvancedSettings },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ label, action }) => (
        <button
          key={label}
          onClick={action}
          className="w-full text-left px-4 py-3.5 rounded-xl border border-white/10 text-sm text-white font-DmSans active:bg-white/5"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Nav tab bar ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "tools",   label: "Tools",   icon: <FiTool className="text-xl" /> },
  { id: "players", label: "Players", icon: <FiUsers className="text-xl" /> },
  { id: "settings",label: "More",   icon: <FiSettings className="text-xl" /> },
];

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * MobileEditorBar — replaces the left sidebar, right panel, and ControlPill
 * when the editor is rendered in mobileLayout mode.
 *
 * Renders:
 *  1. A compact touch-friendly timeline scrubber (with play/pause + add-KF)
 *  2. A bottom nav bar with three tabs (Tools, Players, More)
 *  3. A slide-up bottom sheet for each tab's controls
 */
export default function MobileEditorBar({
  // Playback
  durationMs,
  currentTimeMs,
  isPlaying,
  keyframesMs,
  onSeek,
  onPause,
  onPlayToggle,
  onAddKeyframe,
  // Tools
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  onReset,
  onDeleteSelected,
  onAddPlayer,
  // Zoom
  zoomPercent,
  onZoomIn,
  onZoomOut,
  // Players
  playersById,
  representedPlayerIds,
  selectedPlayerIds,
  onSelectPlayer,
  onDeletePlayer,
  // Settings
  onOpenAdvancedSettings,
  onSaveToPlaybook,
  onImport,
}) {
  const [activeSheet, setActiveSheet] = useState(null);

  const openSheet = (id) => setActiveSheet((prev) => (prev === id ? null : id));
  const closeSheet = () => setActiveSheet(null);

  return (
    <>
      {/* Timeline */}
      <MobileTimeline
        durationMs={durationMs}
        currentTimeMs={currentTimeMs}
        isPlaying={isPlaying}
        keyframesMs={keyframesMs}
        onSeek={onSeek}
        onPause={onPause}
        onPlayToggle={onPlayToggle}
        onAddKeyframe={onAddKeyframe}
      />

      {/* Nav bar */}
      <div className="flex bg-[#111] border-t border-white/10" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => openSheet(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition ${
              activeSheet === tab.id ? "text-BrandOrange" : "text-BrandGray2 active:text-white"
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-DmSans">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom sheets */}
      <BottomSheet open={activeSheet === "tools"} onClose={closeSheet} title="Tools">
        <ToolsSheet
          activeTool={activeTool}
          onToolChange={(t) => { onToolChange(t); closeSheet(); }}
          onUndo={onUndo}
          onRedo={onRedo}
          onReset={onReset}
          onDeleteSelected={onDeleteSelected}
          onAddPlayer={() => { onAddPlayer?.(); closeSheet(); }}
          zoomPercent={zoomPercent}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
        />
      </BottomSheet>

      <BottomSheet open={activeSheet === "players"} onClose={closeSheet} title="Players">
        <PlayersSheet
          playersById={playersById}
          representedPlayerIds={representedPlayerIds}
          selectedPlayerIds={selectedPlayerIds}
          onSelectPlayer={onSelectPlayer}
          onDeletePlayer={(id) => { onDeletePlayer(id); }}
        />
      </BottomSheet>

      <BottomSheet open={activeSheet === "settings"} onClose={closeSheet} title="More">
        <SettingsSheet
          onOpenAdvancedSettings={onOpenAdvancedSettings ? () => { onOpenAdvancedSettings(); closeSheet(); } : null}
          onSaveToPlaybook={onSaveToPlaybook ? () => { onSaveToPlaybook(); closeSheet(); } : null}
          onImport={onImport ? () => { onImport(); closeSheet(); } : null}
        />
      </BottomSheet>
    </>
  );
}
