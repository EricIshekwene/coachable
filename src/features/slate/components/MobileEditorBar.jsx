import { useState, useMemo, useRef, useEffect } from "react";
import {
  FiPlay, FiPause, FiPlus, FiMinus, FiX,
  FiRotateCcw, FiRotateCw,
  FiTrash2, FiUsers, FiTool, FiUserPlus, FiCircle,
  FiChevronUp, FiMousePointer, FiMove, FiChevronRight, FiChevronLeft,
  FiLayers, FiEye, FiEyeOff, FiSettings, FiUpload, FiDownload,
  FiShare2, FiCamera, FiVideo, FiImage, FiCrosshair,
} from "react-icons/fi";
import {
  PiPencilSimpleLine, PiPenNib, PiEraserFill, PiTextTBold, PiShapesFill, PiArrowUpRight,
} from "react-icons/pi";
import { TbFlipHorizontal, TbFlipVertical } from "react-icons/tb";
import { MdAlignHorizontalLeft, MdAlignHorizontalCenter, MdAlignHorizontalRight } from "react-icons/md";
import coneIcon from "../../../assets/objects/cone.png";
import { SPORT_DEFAULTS } from "../../hooks/useAdvancedSettings";
import { Slider } from "@mui/material";
import { BRAND_SLIDER_SX } from "./subcomponents/sliderStyles";
import PitchSettingsSection from "./advancedSettings/PitchSettingsSection";
import PlayerSettingsSection from "./advancedSettings/PlayerSettingsSection";
import BallSettingsSection from "./advancedSettings/BallSettingsSection";
import AnimationSettingsSection from "./advancedSettings/AnimationSettingsSection";
import SpeedSlider from "./controlPill/SpeedSlider";

/** Preset swatches offered in mobile colour pickers (players + drawings). */
const MOBILE_COLOR_SWATCHES = [
  "#ef4444", "#3b82f6", "#22c55e", "#eab308",
  "#a855f7", "#f97316", "#ec4899", "#ffffff", "#111111",
];

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
  currentTimeMsRef,
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
  onDeselectKeyframe,
}) {
  const duration = Math.max(1, durationMs);
  const progress = clamp(currentTimeMs / duration, 0, 1);
  const trackRef = useRef(null);
  const filledBarRef = useRef(null);
  const thumbRef = useRef(null);

  // RAF loop: directly update filled bar and thumb for smooth 60fps scrubbing
  useEffect(() => {
    const dur = Math.max(1, durationMs);
    let rafId;
    const tick = () => {
      const ms = currentTimeMsRef?.current ?? 0;
      const pct = clamp(ms / dur, 0, 1) * 100;
      if (filledBarRef.current) filledBarRef.current.style.width = `${pct}%`;
      if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [durationMs, currentTimeMsRef]);
  // { fromMs, previewMs } while dragging a keyframe diamond
  const [kfDrag, setKfDrag] = useState(null);
  const kfHasDraggedRef = useRef(false);

  // Show delete when a keyframe is selected OR playhead is within 300 ms of one
  const nearKfMs = useMemo(() => {
    const TOLERANCE_MS = 300;
    return keyframesMs.find((kf) => Math.abs(kf - currentTimeMs) <= TOLERANCE_MS) ?? null;
  }, [keyframesMs, currentTimeMs]);
  const deleteTargetMs = selectedKeyframeMs ?? nearKfMs;
  const showDelete = deleteTargetMs !== null && deleteTargetMs !== undefined;

  const clientXToMs = (clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return clamp((clientX - rect.left) / rect.width, 0, 1) * duration;
  };

  // ── Track scrubbing ──────────────────────────────────────────────────────

  const handleTrackPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    onPause?.();
    onDeselectKeyframe?.();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    onSeek?.(ratio * duration, { source: "scrub" });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleTrackPointerMove = (e) => {
    if (!e.buttons) return;
    onDeselectKeyframe?.();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    onSeek?.(ratio * duration, { source: "scrub" });
  };

  const handleTouchScrub = (e) => {
    onDeselectKeyframe?.();
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches[0]?.clientX ?? 0;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    onSeek?.(ratio * duration, { source: "scrub" });
  };

  // ── Keyframe diamond drag ────────────────────────────────────────────────

  const handleKfPointerDown = (e, kf) => {
    e.stopPropagation();
    if (e.button !== undefined && e.button !== 0) return;
    onPause?.();
    onSeek?.(kf, { source: "keyframe" });
    onSelectKeyframe?.(kf);
    const firstKf = Math.min(...keyframesMs);
    if (kf === firstKf) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    kfHasDraggedRef.current = false;
    setKfDrag({ fromMs: kf, previewMs: kf });
  };

  const handleKfPointerMove = (e, kf) => {
    if (!e.buttons || kfDrag?.fromMs !== kf) return;
    e.stopPropagation();
    kfHasDraggedRef.current = true;
    const newMs = clientXToMs(e.clientX);
    setKfDrag((prev) => prev ? { ...prev, previewMs: newMs } : null);
  };

  const handleKfPointerUp = (e, kf) => {
    if (kfDrag?.fromMs !== kf) return;
    e.stopPropagation();
    if (kfHasDraggedRef.current) {
      const toMs = clientXToMs(e.clientX);
      onMoveKeyframe?.(kf, toMs);
      onSelectKeyframe?.(Math.round(toMs));
    }
    kfHasDraggedRef.current = false;
    setKfDrag(null);
  };

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-BrandBlack border-t border-white/10">
      {/* Play / pause */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onPlayToggle}
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-BrandOrange text-white active:brightness-90"
      >
        {isPlaying ? <FiPause className="text-base" /> : <FiPlay className="text-base ml-0.5" />}
      </button>

      {/* Track */}
      <div className="flex-1 flex flex-col">
        {/* Time label row — sits above the scrubber */}
        <div className="flex justify-between text-[10px] text-BrandGray2 font-DmSans select-none mb-2">
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
            ref={filledBarRef}
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-BrandOrange pointer-events-none"
            style={{ width: `${progress * 100}%` }}
          />
          {/* Keyframe diamonds — draggable */}
          {keyframesMs.map((kf) => {
            const isSelected = kf === selectedKeyframeMs;
            const isDragging = kfDrag?.fromMs === kf;
            const displayMs = isDragging ? kfDrag.previewMs : kf;
            const isFirst = kf === Math.min(...keyframesMs);
            return (
              <div
                key={kf}
                onPointerDown={(e) => handleKfPointerDown(e, kf)}
                onPointerMove={(e) => handleKfPointerMove(e, kf)}
                onPointerUp={(e) => handleKfPointerUp(e, kf)}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-full flex items-center justify-center touch-none z-10 ${isFirst ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
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
            ref={thumbRef}
            className="absolute top-1/2 -translate-y-1/2 w-px h-4 bg-white/70 pointer-events-none z-0"
            style={{ left: `${progress * 100}%` }}
          />
        </div>
        {/* Spacer matching label height so scrubber sits centered */}
        <div className="h-4" />
      </div>

      {/* Add / Delete keyframe — swaps based on whether playhead is on a keyframe */}
      {showDelete ? (
        <button
          onClick={() => onDeleteKeyframe?.(deleteTargetMs)}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-red-500/40 text-red-400 active:bg-red-500/10"
          title="Delete keyframe"
        >
          <FiX className="text-base" />
        </button>
      ) : (
        <button
          onClick={onAddKeyframe}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-white/20 text-BrandGray active:bg-white/10"
          title="Add keyframe"
        >
          <FiPlus className="text-base" />
        </button>
      )}
    </div>
  );
}

// ── Top sheet wrapper (drops down from nav bar) ──────────────────────────────

/**
 * TopSheet — drop-down sheet that slides out below the top nav bar.
 */
function TopSheet({ open, onClose, title, children }) {
  return (
    <div
      className={`overflow-hidden transition-[max-height] duration-300 ease-out bg-BrandBlack/90 ${
        open ? "border-b border-white/15 shadow-xl" : ""
      }`}
      style={{
        maxHeight: open
          ? "calc(var(--app-viewport-height) - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 9rem)"
          : "0px",
      }}
    >
      <div className="flex items-center justify-between px-5 py-2 border-b border-white/10">
        <span className="text-sm font-semibold text-white font-DmSans">{title}</span>
        <button onClick={onClose} className="text-BrandGray2 active:text-white p-1">
          <FiChevronUp className="text-lg" />
        </button>
      </div>
      <div
        className="overflow-y-auto px-5 py-4"
        style={{
          maxHeight: "calc(var(--app-viewport-height) - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 12rem)",
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Sheet contents ───────────────────────────────────────────────────────────

/**
 * ToolsSheet — tool picker, history actions, and zoom controls.
 * Add Player lives in PlayersSheet now.
 */
function AddSheet({ onToolChange, onClose }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <button
        onClick={() => { onToolChange?.("addPlayer"); onClose?.(); }}
        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-BrandBlack2 active:bg-white/10 text-white"
      >
        <FiUserPlus className="text-xl text-BrandOrange shrink-0" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-DmSans font-semibold">Add Player</span>
          <span className="text-xs text-BrandGray2 font-DmSans">Tap field to place a player</span>
        </div>
      </button>
      <button
        onClick={() => { onToolChange?.("addBall"); onClose?.(); }}
        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-BrandBlack2 active:bg-white/10 text-white"
      >
        <FiCircle className="text-xl text-BrandOrange shrink-0" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-DmSans font-semibold">Add Ball</span>
          <span className="text-xs text-BrandGray2 font-DmSans">Tap field to place the ball</span>
        </div>
      </button>
      <button
        onClick={() => { onToolChange?.("addCone"); onClose?.(); }}
        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-BrandBlack2 active:bg-white/10 text-white"
      >
        <img src={coneIcon} alt="Cone" className="w-5 h-5 object-contain shrink-0" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-DmSans font-semibold">Add Cone</span>
          <span className="text-xs text-BrandGray2 font-DmSans">Tap field to place a cone</span>
        </div>
      </button>
    </div>
  );
}

function ToolsSheet({
  activeTool, onToolChange, onUndo, onRedo, onReset, zoomPercent, onZoomIn, onZoomOut,
  onRotateLeft, onRotateCenter, onRotateRight, onReflectX, onReflectY,
}) {
  const tools = [
    { id: "select", label: "Select", icon: <FiMousePointer className="text-lg" /> },
    { id: "hand",   label: "Pan",    icon: <FiMove className="text-lg" /> },
    { id: "pen",    label: "Draw",   icon: <PiPencilSimpleLine className="text-lg" /> },
  ];
  const hasField = onRotateLeft || onReflectX;

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

      {/* Field — rotation + reflect */}
      {hasField && (
        <div>
          <p className="text-[11px] text-BrandGray2 uppercase tracking-wider mb-2">Field</p>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { label: "Rotate L", icon: <FiRotateCcw />, action: onRotateLeft },
              { label: "Straighten", icon: <FiCrosshair />, action: onRotateCenter },
              { label: "Rotate R", icon: <FiRotateCw />, action: onRotateRight },
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
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Flip X", icon: <TbFlipHorizontal />, action: onReflectX },
              { label: "Flip Y", icon: <TbFlipVertical />, action: onReflectY },
            ].map(({ label, icon, action }) => (
              <button
                key={label}
                onClick={action}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-BrandGray text-lg active:bg-white/5"
              >
                {icon}
                <span className="text-[12px] font-DmSans">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * MobileTransformSection — touch-friendly position (X/Y) editor and horizontal
 * alignment for a single selected item (player, ball, or cone). Mirrors the
 * desktop PlayerTransformSection's live-pose sync so the values track the
 * animated position during scrub.
 *
 * @param {{
 *   item: { id: string, x?: number, y?: number },
 *   fieldBounds: { left?: number, right?: number }|null,
 *   onPositionChange: (id: string, pos: { x: number, y: number }) => boolean|void,
 *   timelineDisplayTimeMs: number,
 *   resolveItemPose: (id: string) => { x: number, y: number }|null,
 * }} props
 */
function MobileTransformSection({ item, fieldBounds, onPositionChange, timelineDisplayTimeMs, resolveItemPose }) {
  const [draftX, setDraftX] = useState("");
  const [draftY, setDraftY] = useState("");
  const isFocusedRef = useRef(false);

  const getCurrentPose = () => {
    if (!item) return null;
    if (resolveItemPose) {
      const pose = resolveItemPose(item.id);
      if (pose && Number.isFinite(pose.x) && Number.isFinite(pose.y)) return pose;
    }
    return { x: item.x ?? 0, y: item.y ?? 0 };
  };

  const syncFromPose = () => {
    const pose = getCurrentPose();
    if (!pose) return;
    setDraftX(String(Math.round(pose.x)));
    setDraftY(String(Math.round(pose.y)));
  };

  // Sync on item change, external position change, and live during scrub
  // (skipping while the user is typing). Matches PlayerTransformSection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (item) syncFromPose(); }, [item?.id]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (item && !isFocusedRef.current) syncFromPose(); }, [timelineDisplayTimeMs, item?.x, item?.y]);

  if (!item) return null;

  const commitPosition = () => {
    const x = parseFloat(draftX);
    const y = parseFloat(draftY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) { syncFromPose(); return; }
    const ok = onPositionChange?.(item.id, { x, y });
    if (ok === false) syncFromPose();
  };

  const alignX = (targetX) => {
    const pose = getCurrentPose();
    const y = pose?.y ?? item.y ?? 0;
    const ok = onPositionChange?.(item.id, { x: targetX, y });
    if (ok === false) { syncFromPose(); return; }
    setDraftX(String(Math.round(targetX)));
    setDraftY(String(Math.round(y)));
  };

  const inputClass =
    "w-full bg-BrandBlack border border-white/15 rounded-lg px-3 py-2 text-white text-sm font-DmSans text-center focus:outline-none focus:border-BrandOrange";
  const alignBtn =
    "flex-1 flex items-center justify-center py-2.5 rounded-lg bg-BrandBlack2 text-BrandGray active:bg-white/10 active:text-BrandOrange transition";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-BrandOrange uppercase tracking-wider">Position</p>
      <div className="flex gap-2">
        <label className="flex-1 flex flex-col gap-1">
          <span className="text-[10px] text-BrandGray2 text-center">X</span>
          <input
            type="number" inputMode="numeric" className={inputClass} value={draftX}
            onChange={(e) => setDraftX(e.target.value)}
            onFocus={() => { isFocusedRef.current = true; }}
            onBlur={() => { isFocusedRef.current = false; commitPosition(); }}
          />
        </label>
        <label className="flex-1 flex flex-col gap-1">
          <span className="text-[10px] text-BrandGray2 text-center">Y</span>
          <input
            type="number" inputMode="numeric" className={inputClass} value={draftY}
            onChange={(e) => setDraftY(e.target.value)}
            onFocus={() => { isFocusedRef.current = true; }}
            onBlur={() => { isFocusedRef.current = false; commitPosition(); }}
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button type="button" title="Align left" onClick={() => alignX(fieldBounds?.left ?? 0)} className={alignBtn}>
          <MdAlignHorizontalLeft className="text-base" />
        </button>
        <button type="button" title="Align center" onClick={() => alignX(0)} className={alignBtn}>
          <MdAlignHorizontalCenter className="text-base" />
        </button>
        <button type="button" title="Align right" onClick={() => alignX(fieldBounds?.right ?? 0)} className={alignBtn}>
          <MdAlignHorizontalRight className="text-base" />
        </button>
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
  onSelectPlayer,
  onDeletePlayer,
  onEditPlayer,
  onEditDraftChange,
  onCloseEditPlayer,
  onTogglePlayerHidden,
  onPlayerColorChange,
  allPlayersDisplay,
  onAllPlayersDisplayChange,
  transformItem,
  fieldBounds,
  onPlayerPositionChange,
  timelineDisplayTimeMs,
  resolveItemPose,
}) {
  const players = useMemo(() => Object.values(playersById || {}), [playersById]);
  const sportCfg = SPORT_DEFAULTS[fieldType] || {};
  const useLabels = Boolean(sportCfg.usePositionLabels);
  const labelText = useLabels ? "Label" : "Number";
  const sizePercent = clamp(Number(allPlayersDisplay?.sizePercent ?? 100), 10, 400);

  return (
    <div className="flex flex-col gap-3">
      {/* Position editor — shown when exactly one item is selected */}
      {transformItem && (
        <div className="rounded-xl border border-BrandOrange/40 bg-BrandOrange/5 px-3 py-2">
          <MobileTransformSection
            item={transformItem}
            fieldBounds={fieldBounds}
            onPositionChange={onPlayerPositionChange}
            timelineDisplayTimeMs={timelineDisplayTimeMs}
            resolveItemPose={resolveItemPose}
          />
        </div>
      )}

      {/* Size slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] text-BrandGray2 uppercase tracking-wider">Player Size</p>
          <span className="text-[11px] text-BrandOrange font-DmSans font-semibold">{sizePercent}%</span>
        </div>
        <div className="px-2">
          <Slider
            min={5}
            max={200}
            step={5}
            value={sizePercent}
            onChange={(_, v) => onAllPlayersDisplayChange?.({ ...(allPlayersDisplay || {}), sizePercent: Array.isArray(v) ? v[0] : v })}
            sx={BRAND_SLIDER_SX}
            aria-label="Player size percent"
          />
        </div>
      </div>

      {/* Player list */}
      {players.length === 0 && (
        <p className="text-sm text-BrandGray2 text-center py-6">No players yet. Tap Add Player above.</p>
      )}
      {players.map((p) => {
        const isSelected = selectedPlayerIds?.includes(p.id);
        const hasPos = representedPlayerIds?.includes(p.id);
        const isEditing = playerEditor?.open && playerEditor?.id === p.id;
        const isHidden = Boolean(p.hidden);

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
                  // Select on canvas (so the position editor + context pill
                  // target this player) and open the inline name/number editor.
                  onSelectPlayer?.(p.id, { mode: "set" });
                  onEditPlayer?.(p.id);
                }
              }}
            >
              {/* Colour swatch + number */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 transition-opacity ${isHidden ? "opacity-30" : ""}`}
                style={{ backgroundColor: p.color || "#ef4444" }}
              >
                {p.number ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-DmSans truncate ${isHidden ? "text-BrandGray2 line-through" : "text-white"}`}>{p.name || `Player ${p.number}`}</p>
                <p className="text-[11px] text-BrandGray2">{hasPos ? "Has position" : "No position set"}</p>
              </div>
              <FiChevronRight
                className={`text-sm text-BrandGray2 transition-transform ${isEditing ? "rotate-90 text-BrandOrange" : ""}`}
              />
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePlayerHidden?.(p.id); }}
                className={`p-2 transition ${isHidden ? "text-BrandOrange" : "text-BrandGray2 active:text-white"}`}
                title={isHidden ? "Show player" : "Hide player"}
              >
                {isHidden ? <FiEyeOff className="text-sm" /> : <FiEye className="text-sm" />}
              </button>
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
                {onPlayerColorChange && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-BrandOrange font-DmSans uppercase tracking-wider">Colour</span>
                    <div className="flex flex-wrap gap-2.5">
                      {MOBILE_COLOR_SWATCHES.map((hex) => {
                        const isActive = (p.color || "").toLowerCase() === hex.toLowerCase();
                        return (
                          <button
                            key={hex}
                            onClick={() => onPlayerColorChange(hex, p.id)}
                            className="w-8 h-8 rounded-full border-2 transition-transform active:scale-90"
                            style={{
                              backgroundColor: hex,
                              borderColor: isActive ? "var(--color-BrandOrange)" : "transparent",
                              boxShadow: isActive ? "0 0 0 2px var(--color-BrandOrange)" : "0 0 0 1px rgba(255,255,255,0.2)",
                            }}
                            aria-label={`Set colour ${hex}`}
                          />
                        );
                      })}
                      <label className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center overflow-hidden relative active:scale-90 transition-transform">
                        <span className="text-BrandGray2 text-base">+</span>
                        <input
                          type="color"
                          value={p.color || "#ef4444"}
                          onChange={(e) => onPlayerColorChange(e.target.value, p.id)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          aria-label="Custom player colour"
                        />
                      </label>
                    </div>
                  </div>
                )}
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

// ── Prefabs sheet ────────────────────────────────────────────────────────────

/**
 * PrefabsSheet — shows saved prefab groups, split into Published Presets
 * (admin-curated, read-only) and Your Prefabs (user-saved, deletable).
 * Tapping any prefab arms placement mode and closes the sheet.
 */
function PrefabsSheet({ customPrefabs = [], publishedPrefabs = [], onPrefabSelect, onDeleteCustomPrefab, onClose }) {
  const hasAny = customPrefabs.length > 0 || publishedPrefabs.length > 0;
  return (
    <div className="flex flex-col gap-4">
      {!hasAny && (
        <p className="text-sm text-BrandGray2 text-center py-6">
          No prefabs yet. Select multiple players and tap Save Group.
        </p>
      )}

      {publishedPrefabs.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-BrandGray2 text-[10px] uppercase tracking-wider font-DmSans px-1">
            Published Presets
          </p>
          {publishedPrefabs.map((prefab) => (
            <button
              key={prefab.id}
              onClick={() => { onPrefabSelect?.(prefab); onClose?.(); }}
              className="w-full text-left px-4 py-3.5 rounded-xl border border-white/10 text-sm text-white font-DmSans active:bg-white/5 flex items-center gap-3"
            >
              <FiLayers className="text-BrandOrange shrink-0" />
              <span className="truncate flex-1">{prefab.label || "Unnamed Preset"}</span>
              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-BrandOrange/20 text-BrandOrange">
                Shared
              </span>
              <span className="text-xs text-BrandGray2 shrink-0">
                {prefab.players?.length ?? 0} players
              </span>
            </button>
          ))}
        </div>
      )}

      {customPrefabs.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-BrandGray2 text-[10px] uppercase tracking-wider font-DmSans px-1">
            Your Prefabs
          </p>
          {customPrefabs.map((prefab) => (
            <div key={prefab.id} className="flex items-center gap-2">
              <button
                onClick={() => { onPrefabSelect?.(prefab); onClose?.(); }}
                className="flex-1 min-w-0 text-left px-4 py-3.5 rounded-xl border border-white/10 text-sm text-white font-DmSans active:bg-white/5 flex items-center gap-3"
              >
                <FiLayers className="text-BrandOrange shrink-0" />
                <span className="truncate">{prefab.label || "Unnamed Group"}</span>
                <span className="ml-auto text-xs text-BrandGray2 shrink-0">
                  {prefab.players?.length ?? 0} players
                </span>
              </button>
              <button
                onClick={() => onDeleteCustomPrefab?.(prefab.id)}
                className="shrink-0 p-3 rounded-xl border border-white/10 text-BrandGray2 active:bg-red-500/10 active:text-red-400"
              >
                <FiTrash2 className="text-base" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Draw sheet ────────────────────────────────────────────────────────────────

/**
 * DrawSheet — annotation drawing sub-tool picker and style controls for mobile.
 * Picking a sub-tool arms the pen tool and closes the sheet so the user can draw;
 * the style controls (colour, stroke width, opacity) adjust live. Replaces the
 * floating DrawToolsPill + the desktop right-panel DrawingStyleSection, neither
 * of which is finger-friendly or visible in the mobile layout.
 */
function DrawSheet({
  drawSubTool,
  onSubToolChange,
  drawColor,
  onDrawColorChange,
  drawStrokeWidth,
  onDrawStrokeWidthChange,
  drawOpacity,
  onDrawOpacityChange,
  onClose,
}) {
  const subTools = [
    { id: "draw",  label: "Pen",   icon: <PiPenNib className="text-lg" style={{ transform: "rotate(90deg)" }} /> },
    { id: "arrow", label: "Arrow", icon: <PiArrowUpRight className="text-lg" /> },
    { id: "text",  label: "Text",  icon: <PiTextTBold className="text-lg" /> },
    { id: "shape", label: "Shape", icon: <PiShapesFill className="text-lg" /> },
    { id: "erase", label: "Erase", icon: <PiEraserFill className="text-lg" /> },
    { id: "select", label: "Select", icon: <FiMousePointer className="text-lg" /> },
  ];
  const opacityPct = Math.round(clamp(Number(drawOpacity ?? 1), 0, 1) * 100);

  return (
    <div className="flex flex-col gap-5">
      {/* Sub-tool picker */}
      <div>
        <p className="text-[11px] text-BrandGray2 uppercase tracking-wider mb-2">Tool</p>
        <div className="grid grid-cols-3 gap-2">
          {subTools.map((t) => (
            <button
              key={t.id}
              onClick={() => { onSubToolChange?.(t.id); onClose?.(); }}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-DmSans transition ${
                drawSubTool === t.id
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

      {/* Colour */}
      <div>
        <p className="text-[11px] text-BrandGray2 uppercase tracking-wider mb-2">Colour</p>
        <div className="flex flex-wrap gap-2.5">
          {MOBILE_COLOR_SWATCHES.map((hex) => {
            const isActive = (drawColor || "").toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={hex}
                onClick={() => onDrawColorChange?.(hex)}
                className="w-9 h-9 rounded-full border-2 transition-transform active:scale-90"
                style={{
                  backgroundColor: hex,
                  borderColor: isActive ? "#FF7A18" : "transparent",
                  boxShadow: isActive ? "0 0 0 2px #FF7A18" : "0 0 0 1px rgba(255,255,255,0.2)",
                }}
                aria-label={`Colour ${hex}`}
              />
            );
          })}
          <label className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center overflow-hidden relative active:scale-90 transition-transform">
            <span className="text-BrandGray2 text-base">+</span>
            <input
              type="color"
              value={drawColor || "#ffffff"}
              onChange={(e) => onDrawColorChange?.(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="Custom colour"
            />
          </label>
        </div>
      </div>

      {/* Stroke width */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] text-BrandGray2 uppercase tracking-wider">Stroke Width</p>
          <span className="text-[11px] text-BrandOrange font-DmSans font-semibold">{Math.round(drawStrokeWidth ?? 4)}px</span>
        </div>
        <div className="px-2">
          <Slider
            min={1} max={40} step={1}
            value={Number(drawStrokeWidth ?? 4)}
            onChange={(_, v) => onDrawStrokeWidthChange?.(Array.isArray(v) ? v[0] : v)}
            sx={BRAND_SLIDER_SX}
            aria-label="Stroke width"
          />
        </div>
      </div>

      {/* Opacity */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] text-BrandGray2 uppercase tracking-wider">Opacity</p>
          <span className="text-[11px] text-BrandOrange font-DmSans font-semibold">{opacityPct}%</span>
        </div>
        <div className="px-2">
          <Slider
            min={10} max={100} step={5}
            value={opacityPct}
            onChange={(_, v) => onDrawOpacityChange?.((Array.isArray(v) ? v[0] : v) / 100)}
            sx={BRAND_SLIDER_SX}
            aria-label="Opacity"
          />
        </div>
      </div>
    </div>
  );
}

// ── Export / file sheet ─────────────────────────────────────────────────────

/**
 * ExportSheet — save and export actions: Save to Playbook, screenshot (PNG),
 * video, GIF, plus import/download of the play JSON. Each button calls the same
 * Slate handler used by the desktop right panel; the export modals themselves
 * are already rendered by Slate regardless of layout.
 */
function ExportSheet({
  playName,
  onPlayNameChange,
  onSaveToPlaybook,
  onScreenshot,
  onVideoExport,
  onGifExport,
  onImport,
  onDownload,
  onClose,
}) {
  // [icon, label, sub, handler, accent, dividerBefore]
  const rows = [
    [<FiShare2 key="i" />, "Save to Playbook", "Save this play to a playbook", onSaveToPlaybook, true, false],
    [<FiCamera key="i" />, "Export Image", "Capture a PNG of the field", onScreenshot, false, false],
    [<FiVideo key="i" />, "Export Video", "Render the animation to MP4", onVideoExport, false, false],
    [<FiImage key="i" />, "Export GIF", "Render the animation to GIF", onGifExport, false, false],
    [<FiDownload key="i" />, "Download JSON", "Save the play file to your device", onDownload, false, true],
    [<FiUpload key="i" />, "Import Play", "Load a play from a JSON file", onImport, false, false],
  ].filter(([, , , handler]) => typeof handler === "function");

  return (
    <div className="flex flex-col gap-2">
      {typeof onPlayNameChange === "function" && (
        <label className="flex flex-col gap-1 mb-1">
          <span className="text-[11px] text-BrandOrange font-DmSans uppercase tracking-wider">Play Name</span>
          <input
            type="text"
            value={playName ?? ""}
            onChange={(e) => onPlayNameChange(e.target.value)}
            placeholder="Untitled play"
            className="w-full bg-BrandBlack border border-BrandGray2/40 rounded-lg px-3 py-2.5 text-white text-sm font-DmSans focus:outline-none focus:border-BrandOrange"
          />
        </label>
      )}
      {rows.map(([icon, label, sub, handler, accent, dividerBefore]) => (
        <div key={label} className="flex flex-col gap-2">
          {dividerBefore && <div className="h-px bg-white/10 my-1" />}
          <button
            onClick={() => { handler?.(); onClose?.(); }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-BrandBlack2 active:bg-white/10 text-white"
          >
            <span className={`text-xl shrink-0 ${accent ? "text-BrandOrange" : "text-BrandGray"}`}>{icon}</span>
            <div className="flex flex-col items-start">
              <span className="text-sm font-DmSans font-semibold">{label}</span>
              {sub && <span className="text-xs text-BrandGray2 font-DmSans">{sub}</span>}
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * SelectionBanner — floating pill shown when 2+ objects are selected.
 * Provides a "Save Group" button to open the save-prefab modal.
 */
function SelectionBanner({ selectedCount, onSavePrefab }) {
  // Hide the banner entirely when the host doesn't provide a save handler —
  // e.g. in the prefab-preset editor where autosave already covers persistence.
  if (selectedCount < 2 || !onSavePrefab) return null;
  return (
    <div
      className="fixed inset-x-0 z-70 flex justify-center pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 72px)" }}
    >
      <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full bg-BrandBlack/90 border border-white/15 shadow-xl backdrop-blur-sm">
        <span className="text-xs text-BrandGray2 font-DmSans">{selectedCount} selected</span>
        <button
          onClick={onSavePrefab}
          className="px-3 py-1 rounded-full bg-BrandOrange text-white text-xs font-DmSans font-semibold active:brightness-90"
        >
          Save Prefab
        </button>
      </div>
    </div>
  );
}

// ── Nav tab bar ──────────────────────────────────────────────────────────────

// ── Advanced Settings sheet ──────────────────────────────────────────────────

/**
 * AdvancedSettingsSheet — mirrors the desktop AdvancedSettings panel for mobile.
 */
function AdvancedSettingsSheet({
  advancedSettings,
  onAdvancedSettingsChange,
  onAdvancedSettingsReset,
  onFieldTypeChange,
  autoplayEnabled,
  onAutoplayChange,
  speedMultiplier,
  onSpeedChange,
  durationMs,
}) {
  const settings = advancedSettings ?? {};
  const pitch = settings.pitch ?? {};
  const players = settings.players ?? {};
  const ball = settings.ball ?? {};
  const animation = settings.animation ?? {};

  const update = (patch) => onAdvancedSettingsChange?.({ ...settings, ...patch });
  const updatePitch = (patch) => {
    const newPitch = { ...pitch, ...patch };
    if (patch.fieldType && patch.fieldType !== pitch.fieldType) {
      const sd = SPORT_DEFAULTS[patch.fieldType] || {};
      newPitch.pitchColor = sd.pitchColor ?? "#4FA85D";
      update({
        pitch: newPitch,
        players: { ...players, baseSizePx: sd.baseSizePx ?? 30 },
        ball: { ...ball, sizePercent: sd.sizePercent ?? 100, coneSizePercent: sd.coneSizePercent ?? 70 },
      });
      onFieldTypeChange?.(patch.fieldType);
    } else {
      update({ pitch: newPitch });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <PitchSettingsSection value={pitch} onChange={updatePitch} />
      <PlayerSettingsSection value={players} onChange={(patch) => update({ players: { ...players, ...patch } })} />
      <BallSettingsSection value={ball} onChange={(patch) => update({ ball: { ...ball, ...patch } })} />
      <AnimationSettingsSection value={animation} onChange={(patch) => update({ animation: { ...animation, ...patch } })} />

      {/* Playback */}
      <div className="flex flex-col border-b border-BrandGray2 pb-3 items-start justify-center gap-2">
        <p className="text-white text-xs font-DmSans">Playback</p>
        <div className="flex items-center justify-between w-full">
          <span className="text-BrandGray text-xs font-DmSans">Autoplay</span>
          <button
            onClick={() => onAutoplayChange?.(!autoplayEnabled)}
            className={`relative w-9 h-4.5 rounded-full transition-colors duration-200 ${autoplayEnabled ? "bg-BrandOrange" : "bg-BrandGray2"}`}
            aria-label="Toggle autoplay"
          >
            <span className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-BrandBlack rounded-full shadow-sm transition-transform duration-200 ${autoplayEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        {typeof onSpeedChange === "function" && (
          <div className="flex flex-col gap-1 w-full">
            <span className="text-BrandGray text-xs font-DmSans">Playback Speed</span>
            <SpeedSlider
              speedMultiplier={speedMultiplier ?? 0}
              onSpeedChange={onSpeedChange}
              durationMs={durationMs}
            />
          </div>
        )}
      </div>

      {/* Reset to Default */}
      <button
        onClick={onAdvancedSettingsReset}
        className="w-full h-7 mt-1 bg-BrandOrange text-white text-xs font-DmSans font-semibold rounded-md active:brightness-90"
      >
        Reset to Default
      </button>
    </div>
  );
}

const TABS = [
  { id: "tools",    label: "Tools",   icon: <FiTool className="text-xl" /> },
  { id: "add",      label: "Add",     icon: <FiUserPlus className="text-xl" /> },
  { id: "players",  label: "Players", icon: <FiUsers className="text-xl" /> },
  { id: "draw",     label: "Draw",    icon: <PiPencilSimpleLine className="text-xl" /> },
  { id: "prefabs",  label: "Prefabs", icon: <FiLayers className="text-xl" /> },
  { id: "export",   label: "Export",  icon: <FiShare2 className="text-xl" /> },
  { id: "settings", label: "More",    icon: <FiSettings className="text-xl" /> },
];

/** Tool ids that count as "add placement" mode for the Add tab's active state. */
const ADD_TOOLS = ["addPlayer", "addBall", "addCone"];

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
  currentTimeMsRef,
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
  // Field
  onRotateLeft,
  onRotateCenter,
  onRotateRight,
  onReflectX,
  onReflectY,
  // Selection
  selectedItemIds = [],
  onSavePrefab,
  // Players
  playersById,
  ballsById,
  representedPlayerIds,
  selectedPlayerIds,
  playerEditor,
  fieldType,
  onSelectPlayer,
  onDeletePlayer,
  onEditPlayer,
  onEditDraftChange,
  onCloseEditPlayer,
  onTogglePlayerHidden,
  onPlayerColorChange,
  // Transform (single selected item)
  fieldBounds,
  onPlayerPositionChange,
  timelineDisplayTimeMs,
  resolveItemPose,
  customPrefabs = [],
  publishedPrefabs = [],
  onPrefabSelect,
  onDeleteCustomPrefab,
  allPlayersDisplay,
  onAllPlayersDisplayChange,
  // Draw style
  drawSubTool,
  onDrawSubToolChange,
  drawColor,
  onDrawColorChange,
  drawStrokeWidth,
  onDrawStrokeWidthChange,
  drawOpacity,
  onDrawOpacityChange,
  // Export / file
  playName,
  onPlayNameChange,
  onSaveToPlaybook,
  onScreenshot,
  onVideoExport,
  onGifExport,
  onDownload,
  onImport,
  // Advanced settings
  advancedSettings,
  onAdvancedSettingsChange,
  onAdvancedSettingsReset,
  onFieldTypeChange,
  autoplayEnabled,
  onAutoplayChange,
  speedMultiplier,
  onSpeedChange,
  onNavigateHome,
  previewMode = false,
  initialActiveSheet = null,
}) {
  // The single selected item (player, ball, or cone) — drives the inline
  // position editor in the Players sheet.
  const transformItem = useMemo(() => {
    if (!Array.isArray(selectedItemIds) || selectedItemIds.length !== 1) return null;
    const id = selectedItemIds[0];
    return playersById?.[id] || ballsById?.[id] || null;
  }, [selectedItemIds, playersById, ballsById]);
  const [activeSheet, setActiveSheet] = useState(initialActiveSheet);
  const chromePositionClass = previewMode ? "absolute" : "fixed";
  const overlayPositionClass = previewMode ? "absolute" : "fixed";

  const openSheet = (id) => setActiveSheet((prev) => (prev === id ? null : id));
  const closeSheet = () => setActiveSheet(null);


  return (
    <>
      {/* ── Selection banner — floats above timeline when 2+ objects selected ── */}
      <SelectionBanner
        selectedCount={selectedItemIds.length}
        onSavePrefab={onSavePrefab}
      />

      {/* ── Top nav bar + drop-down sheets (fixed to top of screen) ── */}
      <div
        className={`${chromePositionClass} top-0 inset-x-0 z-60`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* Tab row */}
        <div className="relative z-10 flex overflow-x-auto bg-[#111] border-b border-white/10 hide-scroll">
          {/* Back / exit — flushes + navigates away (only when a host handler is
              provided, e.g. the admin play editor; the blank sandbox omits it). */}
          {onNavigateHome && (
            <button
              onClick={() => { closeSheet(); onNavigateHome(); }}
              className="shrink-0 flex flex-col items-center gap-1 py-3 px-3 text-BrandGray2 active:text-white border-r border-white/10"
              aria-label="Back to plays"
            >
              <FiChevronLeft className="text-xl" />
              <span className="text-[10px] font-DmSans">Back</span>
            </button>
          )}
          {TABS.map((tab) => {
            const isActive =
              activeSheet === tab.id ||
              (tab.id === "add" && ADD_TOOLS.includes(activeTool)) ||
              (tab.id === "draw" && activeTool === "pen");
            return (
              <button
                key={tab.id}
                onClick={() => {
                  // The Draw tab arms the pen tool (if not already) and opens
                  // its sheet so the sub-tool + style controls are reachable.
                  if (tab.id === "draw" && activeTool !== "pen") {
                    onToolChange?.("pen");
                  }
                  openSheet(tab.id);
                }}
                className={`shrink-0 flex-1 min-w-16 flex flex-col items-center gap-1 py-3 transition ${
                  isActive ? "text-BrandOrange" : "text-BrandGray2 active:text-white"
                }`}
              >
                {tab.icon}
                <span className="text-[10px] font-DmSans">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Drop-down sheets — render below the tab row */}
        <TopSheet open={activeSheet === "add"} onClose={closeSheet} title="Add">
          <AddSheet onToolChange={onToolChange} onClose={closeSheet} />
        </TopSheet>

        <TopSheet open={activeSheet === "tools"} onClose={closeSheet} title="Tools">
          <ToolsSheet
            activeTool={activeTool}
            onToolChange={(t) => { onToolChange(t); closeSheet(); }}
            onUndo={onUndo}
            onRedo={onRedo}
            onReset={onReset}
            zoomPercent={zoomPercent}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onRotateLeft={onRotateLeft}
            onRotateCenter={onRotateCenter}
            onRotateRight={onRotateRight}
            onReflectX={onReflectX}
            onReflectY={onReflectY}
          />
        </TopSheet>

        <TopSheet open={activeSheet === "players"} onClose={closeSheet} title="Players">
          <PlayersSheet
            playersById={playersById}
            representedPlayerIds={representedPlayerIds}
            selectedPlayerIds={selectedPlayerIds}
            playerEditor={playerEditor}
            fieldType={fieldType}
            onSelectPlayer={onSelectPlayer}
            onDeletePlayer={onDeletePlayer}
            onEditPlayer={onEditPlayer}
            onEditDraftChange={onEditDraftChange}
            onCloseEditPlayer={onCloseEditPlayer}
            onTogglePlayerHidden={onTogglePlayerHidden}
            onPlayerColorChange={onPlayerColorChange}
            allPlayersDisplay={allPlayersDisplay}
            onAllPlayersDisplayChange={onAllPlayersDisplayChange}
            transformItem={transformItem}
            fieldBounds={fieldBounds}
            onPlayerPositionChange={onPlayerPositionChange}
            timelineDisplayTimeMs={timelineDisplayTimeMs}
            resolveItemPose={resolveItemPose}
          />
        </TopSheet>

        <TopSheet open={activeSheet === "draw"} onClose={closeSheet} title="Draw">
          <DrawSheet
            drawSubTool={drawSubTool}
            onSubToolChange={onDrawSubToolChange}
            drawColor={drawColor}
            onDrawColorChange={onDrawColorChange}
            drawStrokeWidth={drawStrokeWidth}
            onDrawStrokeWidthChange={onDrawStrokeWidthChange}
            drawOpacity={drawOpacity}
            onDrawOpacityChange={onDrawOpacityChange}
            onClose={closeSheet}
          />
        </TopSheet>

        <TopSheet open={activeSheet === "prefabs"} onClose={closeSheet} title="Prefabs">
          <PrefabsSheet
            customPrefabs={customPrefabs}
            publishedPrefabs={publishedPrefabs}
            onPrefabSelect={onPrefabSelect}
            onDeleteCustomPrefab={onDeleteCustomPrefab}
            onClose={closeSheet}
          />
        </TopSheet>

        <TopSheet open={activeSheet === "export"} onClose={closeSheet} title="Save & Export">
          <ExportSheet
            playName={playName}
            onPlayNameChange={onPlayNameChange}
            onSaveToPlaybook={onSaveToPlaybook}
            onScreenshot={onScreenshot}
            onVideoExport={onVideoExport}
            onGifExport={onGifExport}
            onImport={onImport}
            onDownload={onDownload}
            onClose={closeSheet}
          />
        </TopSheet>

        <TopSheet open={activeSheet === "settings"} onClose={closeSheet} title="Advanced Settings">
          <AdvancedSettingsSheet
            advancedSettings={advancedSettings}
            onAdvancedSettingsChange={onAdvancedSettingsChange}
            onAdvancedSettingsReset={onAdvancedSettingsReset}
            onFieldTypeChange={onFieldTypeChange}
            autoplayEnabled={autoplayEnabled}
            onAutoplayChange={onAutoplayChange}
            speedMultiplier={speedMultiplier}
            onSpeedChange={onSpeedChange}
            durationMs={durationMs}
          />
        </TopSheet>
      </div>

      {/* Backdrop — closes sheet when tapping canvas */}
      {activeSheet && (
        <div
          className={`${overlayPositionClass} inset-0 z-55 bg-black/50`}
          onClick={closeSheet}
        />
      )}

      {/* ── Bottom timeline bar (fixed to bottom of screen) ── */}
      <div
        className={`${chromePositionClass} bottom-0 inset-x-0 z-60`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <MobileTimeline
          durationMs={durationMs}
          currentTimeMs={currentTimeMs}
          currentTimeMsRef={currentTimeMsRef}
          isPlaying={isPlaying}
          keyframesMs={keyframesMs}
          selectedKeyframeMs={selectedKeyframeMs}
          onSeek={onSeek}
          onPause={onPause}
          onPlayToggle={onPlayToggle}
          onAddKeyframe={onAddKeyframe}
          onSelectKeyframe={onSelectKeyframe}
          onDeselectKeyframe={() => onSelectKeyframe?.(null)}
          onDeleteKeyframe={onDeleteKeyframe}
          onMoveKeyframe={onMoveKeyframe}
        />
      </div>
    </>
  );
}
