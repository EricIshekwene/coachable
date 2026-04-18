import { useState, useMemo, useRef } from "react";
import {
  FiPlay, FiPause, FiPlus, FiMinus, FiX,
  FiRotateCcw, FiRotateCw,
  FiTrash2, FiUsers, FiTool,
  FiChevronDown, FiMousePointer, FiMove, FiChevronRight,
} from "react-icons/fi";
import { PiPencilSimpleLine } from "react-icons/pi";
import { SPORT_DEFAULTS } from "../features/slate/hooks/useAdvancedSettings";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

// ── Compact timeline scrubber ────────────────────────────────────────────────

/**
 * MobileTimeline — touch-draggable scrubber bar for the mobile editor.
 * Keyframe ticks are tappable to select them; a delete button appears when one is selected.
 */
function MobileTimeline({
  durationMs,
  currentTimeMs,
  isPlaying,
  keyframesMs = [],
  selectedKeyframeMs,
  onSeek,
  onPause,
  onPlayToggle,
  onAddKeyframe,
  onSelectKeyframe,
  onDeleteKeyframe,
  onMoveKeyframe,
}) {
  const duration = Math.max(1, durationMs);
  const progress = clamp(currentTimeMs / duration, 0, 1);
  const trackRef = useRef(null);
  // { fromMs, previewMs } while dragging a keyframe diamond
  const [kfDrag, setKfDrag] = useState(null);

  const clientXToMs = (clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return clamp((clientX - rect.left) / rect.width, 0, 1) * duration;
  };

  // ── Track scrubbing ──────────────────────────────────────────────────────

  const handleTrackPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    onPause?.();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    onSeek?.(ratio * duration, { source: "scrub" });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleTrackPointerMove = (e) => {
    if (!e.buttons) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    onSeek?.(ratio * duration, { source: "scrub" });
  };

  const handleTouchScrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches[0]?.clientX ?? 0;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    onSeek?.(ratio * duration, { source: "scrub" });
  };

  // ── Keyframe diamond drag ────────────────────────────────────────────────

  const handleKfPointerDown = (e, kf) => {
    e.stopPropagation();
    if (e.button !== undefined && e.button !== 0) return;
    onSelectKeyframe?.(kf);
    e.currentTarget.setPointerCapture(e.pointerId);
    setKfDrag({ fromMs: kf, previewMs: kf });
  };

  const handleKfPointerMove = (e, kf) => {
    if (!e.buttons || kfDrag?.fromMs !== kf) return;
    e.stopPropagation();
    const newMs = clientXToMs(e.clientX);
    setKfDrag((prev) => prev ? { ...prev, previewMs: newMs } : null);
  };

  const handleKfPointerUp = (e, kf) => {
    if (kfDrag?.fromMs !== kf) return;
    e.stopPropagation();
    const toMs = clientXToMs(e.clientX);
    onMoveKeyframe?.(kf, toMs);
    onSelectKeyframe?.(Math.round(toMs));
    setKfDrag(null);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-BrandBlack border-t border-white/10">
      {/* Play / pause */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onPlayToggle}
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-BrandOrange text-white active:brightness-90"
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
          ref={trackRef}
          className="relative h-5 flex items-center cursor-pointer touch-none"
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onTouchStart={(e) => { onPause?.(); handleTouchScrub(e); }}
          onTouchMove={handleTouchScrub}
        >
          {/* Track bg */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/10" />
          {/* Filled portion */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-BrandOrange pointer-events-none"
            style={{ width: `${progress * 100}%` }}
          />
          {/* Keyframe diamonds — draggable */}
          {keyframesMs.map((kf) => {
            const isSelected = kf === selectedKeyframeMs;
            const isDragging = kfDrag?.fromMs === kf;
            const displayMs = isDragging ? kfDrag.previewMs : kf;
            return (
              <div
                key={kf}
                onPointerDown={(e) => handleKfPointerDown(e, kf)}
                onPointerMove={(e) => handleKfPointerMove(e, kf)}
                onPointerUp={(e) => handleKfPointerUp(e, kf)}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-full flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
                style={{ left: `${clamp(displayMs / duration, 0, 1) * 100}%` }}
              >
                <div
                  className={`w-2.5 h-2.5 rotate-45 transition-colors ${
                    isDragging
                      ? "bg-BrandOrange scale-125"
                      : isSelected
                      ? "bg-BrandOrange"
                      : "bg-white/70"
                  }`}
                />
              </div>
            );
          })}
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
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-white/20 text-BrandGray active:bg-white/10"
        title="Add keyframe"
      >
        <FiPlus className="text-base" />
      </button>

      {/* Delete selected keyframe — only visible when one is selected */}
      {selectedKeyframeMs !== null && selectedKeyframeMs !== undefined ? (
        <button
          onClick={() => onDeleteKeyframe?.(selectedKeyframeMs)}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-red-500/40 text-red-400 active:bg-red-500/10"
          title="Delete keyframe"
        >
          <FiX className="text-base" />
        </button>
      ) : (
        <div className="shrink-0 w-9 h-9" />
      )}
    </div>
  );
}

// ── Bottom sheet wrapper ─────────────────────────────────────────────────────

/**
 * BottomSheet — slide-up sheet with backdrop, handle, and header.
 */
function BottomSheet({ open, onClose, title, children }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed bottom-0 inset-x-0 z-50 bg-[#1a1a1a] rounded-t-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "70dvh" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between px-5 py-2 border-b border-white/10">
          <span className="text-sm font-semibold text-white font-DmSans">{title}</span>
          <button onClick={onClose} className="text-BrandGray2 active:text-white p-1">
            <FiChevronDown className="text-lg" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: "calc(70dvh - 80px)" }}>
          {children}
        </div>
      </div>
    </>
  );
}

// ── Sheet contents ───────────────────────────────────────────────────────────

/**
 * ToolsSheet — tool picker, history actions, and zoom controls.
 * Add Player lives in PlayersSheet now.
 */
function ToolsSheet({ activeTool, onToolChange, onUndo, onRedo, onReset, zoomPercent, onZoomIn, onZoomOut }) {
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
            { label: "Reset", icon: <FiTrash2 />,   action: onReset },
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
    </div>
  );
}

/**
 * PlayersSheet — add player mode button, player list with inline editing.
 */
function PlayersSheet({
  playersById,
  representedPlayerIds,
  selectedPlayerIds,
  playerEditor,
  fieldType,
  onToolChange,
  onClose,
  onSelectPlayer,
  onDeletePlayer,
  onEditPlayer,
  onEditDraftChange,
  onCloseEditPlayer,
}) {
  const players = useMemo(() => Object.values(playersById || {}), [playersById]);
  const sportCfg = SPORT_DEFAULTS[fieldType] || {};
  const useLabels = Boolean(sportCfg.usePositionLabels);
  const labelText = useLabels ? "Label" : "Number";

  return (
    <div className="flex flex-col gap-3">
      {/* Add Player mode button */}
      <button
        onClick={() => {
          onToolChange?.("addPlayer");
          onClose?.();
        }}
        className="w-full py-3 rounded-xl bg-BrandOrange text-white font-semibold text-sm font-DmSans active:brightness-90"
      >
        + Add Player
      </button>

      {/* Player list */}
      {players.length === 0 && (
        <p className="text-sm text-BrandGray2 text-center py-6">No players yet. Tap Add Player above.</p>
      )}
      {players.map((p) => {
        const isSelected = selectedPlayerIds?.includes(p.id);
        const hasPos = representedPlayerIds?.includes(p.id);
        const isEditing = playerEditor?.open && playerEditor?.id === p.id;

        return (
          <div
            key={p.id}
            className={`rounded-xl border transition ${
              isEditing
                ? "border-BrandOrange bg-BrandOrange/5"
                : isSelected
                ? "border-BrandOrange/50 bg-BrandOrange/5"
                : "border-white/10"
            }`}
          >
            {/* Row */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              onClick={() => {
                if (isEditing) {
                  onCloseEditPlayer?.();
                } else {
                  onEditPlayer?.(p.id);
                }
              }}
            >
              {/* Colour swatch + number */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: p.color || "#ef4444" }}
              >
                {p.number ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-DmSans truncate">{p.name || `Player ${p.number}`}</p>
                <p className="text-[11px] text-BrandGray2">{hasPos ? "Has position" : "No position set"}</p>
              </div>
              <FiChevronRight
                className={`text-sm text-BrandGray2 transition-transform ${isEditing ? "rotate-90 text-BrandOrange" : ""}`}
              />
              <button
                onClick={(e) => { e.stopPropagation(); onDeletePlayer?.(p.id); }}
                className="p-2 text-BrandGray2 active:text-red-400"
              >
                <FiTrash2 className="text-sm" />
              </button>
            </div>

            {/* Inline edit form */}
            {isEditing && (
              <div className="px-4 pb-4 flex flex-col gap-2 border-t border-white/10 pt-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-BrandOrange font-DmSans uppercase tracking-wider">{labelText}</span>
                  <input
                    type="text"
                    value={playerEditor.draft?.number ?? ""}
                    onChange={(e) => onEditDraftChange?.({ number: e.target.value })}
                    placeholder={useLabels ? "e.g. QB" : "e.g. 7"}
                    className="w-full bg-BrandBlack border border-BrandGray2/40 rounded-lg px-3 py-2 text-white text-sm font-DmSans focus:outline-none focus:border-BrandOrange"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-BrandOrange font-DmSans uppercase tracking-wider">Name</span>
                  <input
                    type="text"
                    value={playerEditor.draft?.name ?? ""}
                    onChange={(e) => onEditDraftChange?.({ name: e.target.value })}
                    placeholder="Player name"
                    className="w-full bg-BrandBlack border border-BrandGray2/40 rounded-lg px-3 py-2 text-white text-sm font-DmSans focus:outline-none focus:border-BrandOrange"
                  />
                </label>
                <button
                  onClick={onCloseEditPlayer}
                  className="w-full py-2 rounded-lg border border-white/20 text-BrandGray text-sm font-DmSans active:bg-white/5 mt-1"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Nav tab bar ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "tools",   label: "Tools",   icon: <FiTool className="text-xl" /> },
  { id: "players", label: "Players", icon: <FiUsers className="text-xl" /> },
];

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * MobileEditorBar — replaces the left sidebar, right panel, and ControlPill
 * when the editor is rendered in mobileLayout mode.
 *
 * Renders:
 *  1. A compact touch-friendly timeline scrubber (play/pause, keyframe select/delete, add KF)
 *  2. A bottom nav bar with two tabs (Tools, Players)
 *  3. A slide-up bottom sheet for each tab's controls
 */
export default function MobileEditorBar({
  // Playback
  durationMs,
  currentTimeMs,
  isPlaying,
  keyframesMs,
  selectedKeyframeMs,
  onSeek,
  onPause,
  onPlayToggle,
  onAddKeyframe,
  onSelectKeyframe,
  onDeleteKeyframe,
  onMoveKeyframe,
  // Tools
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  onReset,
  // Zoom
  zoomPercent,
  onZoomIn,
  onZoomOut,
  // Players
  playersById,
  representedPlayerIds,
  selectedPlayerIds,
  playerEditor,
  fieldType,
  onSelectPlayer,
  onDeletePlayer,
  onEditPlayer,
  onEditDraftChange,
  onCloseEditPlayer,
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
        selectedKeyframeMs={selectedKeyframeMs}
        onSeek={onSeek}
        onPause={onPause}
        onPlayToggle={onPlayToggle}
        onAddKeyframe={onAddKeyframe}
        onSelectKeyframe={onSelectKeyframe}
        onDeleteKeyframe={onDeleteKeyframe}
        onMoveKeyframe={onMoveKeyframe}
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

      {/* Tools sheet */}
      <BottomSheet open={activeSheet === "tools"} onClose={closeSheet} title="Tools">
        <ToolsSheet
          activeTool={activeTool}
          onToolChange={(t) => { onToolChange(t); closeSheet(); }}
          onUndo={onUndo}
          onRedo={onRedo}
          onReset={onReset}
          zoomPercent={zoomPercent}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
        />
      </BottomSheet>

      {/* Players sheet */}
      <BottomSheet open={activeSheet === "players"} onClose={closeSheet} title="Players">
        <PlayersSheet
          playersById={playersById}
          representedPlayerIds={representedPlayerIds}
          selectedPlayerIds={selectedPlayerIds}
          playerEditor={playerEditor}
          fieldType={fieldType}
          onToolChange={onToolChange}
          onClose={closeSheet}
          onSelectPlayer={onSelectPlayer}
          onDeletePlayer={onDeletePlayer}
          onEditPlayer={onEditPlayer}
          onEditDraftChange={onEditDraftChange}
          onCloseEditPlayer={onCloseEditPlayer}
        />
      </BottomSheet>
    </>
  );
}
