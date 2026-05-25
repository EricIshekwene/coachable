import React, { useMemo } from "react";
import { IoPlayOutline, IoRefreshOutline } from "react-icons/io5";

/**
 * Proximity (ms) within which the playhead is considered "on" a keyframe — drives the
 * visual highlight on the timeline. MUST match KEYFRAME_HIGHLIGHT_PROXIMITY_MS in
 * Slate.jsx: the highlighted keyframe is also where edits land while paused.
 */
const PROXIMITY_TOLERANCE_MS = 300;
import TimeBar from "./TimeBar";
import SpeedSlider from "./SpeedSlider";
import PlaybackControls from "./PlaybackControls";
import KeyframeManager from "./KeyframeManager";
import StepTrack from "./StepTrack";
import AnnotationVisibilityTrack from "./AnnotationVisibilityTrack";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * ControlPill - Timeline view/controller driven by external animation state.
 */
export default function ControlPill({
  durationMs = 30000,
  currentTimeMs = 0,
  isPlaying = false,
  speedMultiplier = 50,
  keyframesMs = [],
  selectedKeyframeMs = null,
  onSeek,
  onPause,
  onPlayToggle,
  onSpeedChange,
  onAddKeyframe,
  onDeleteKeyframe,
  onSelectKeyframe,
  onMoveKeyframe,
  getAuthoritativeTimeMs,
  onDragStateChange,
  variant = "default",
  // Step track / drawing mode — motion drawings only.
  drawings,
  onUpdateDrawing,
  onUpdateDrawingNoHistory,
  onBeginHistoryGroup,
  onEndHistoryGroup,
  onAddStep,
  selectedPlayerIds,
  selectedMotionDrawingIds,
  playersById,
  drawingMode = false,
  // Annotation visibility track inputs — render when annotations are selected
  // in ANY slate mode (drawing, record, normal). Each selected annotation
  // gets its own lane below the timeline.
  annotationDrawings = [],
  selectedAnnotationDrawingIds = [],
  onUpdateAnnotationDrawing,
  onUpdateAnnotationDrawingNoHistory,
  activeDrawingUi = "none",
}) {
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
  const firstKeyframeMs = sortedKeyframes.length ? sortedKeyframes[0] : null;

  // In test variant: if no keyframe is manually selected, auto-select the nearest one within tolerance.
  const effectiveSelectedKeyframeMs = useMemo(() => {
    if (selectedKeyframeMs !== null && selectedKeyframeMs !== undefined) return selectedKeyframeMs;
    if (variant !== "test") return selectedKeyframeMs;
    return (keyframesMs || []).find((kf) => Math.abs(kf - clampedTimeMs) <= PROXIMITY_TOLERANCE_MS) ?? null;
  }, [selectedKeyframeMs, keyframesMs, clampedTimeMs, variant]);

  const handleSeek = (timeMs, meta) => {
    onPause?.();
    onSelectKeyframe?.(null);
    onSeek?.(timeMs, meta);
  };

  const handlePlayToggle = () => {
    if (!isPlaying && clampedTimeMs >= timelineDurationMs) {
      onSeek?.(0, { source: "engine" });
    }
    // Clear explicit selection on play so the button label tracks
    // the playhead position rather than staying locked to the last-clicked keyframe.
    if (!isPlaying) {
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
    onPause?.();
    if (selectedKeyframeMs === marker.timeMs) {
      onSelectKeyframe?.(null);
      return;
    }
    onSelectKeyframe?.(marker.timeMs);
    jumpToTime(marker.timeMs);
  };

  const handleKeyframeDragStart = (timeMs) => {
    if (firstKeyframeMs !== null && timeMs === firstKeyframeMs) {
      onSelectKeyframe?.(timeMs);
      return;
    }
    onPause?.();
    onSelectKeyframe?.(timeMs);
  };

  const handleKeyframeDragMove = () => {
    // Visual feedback handled in KeyframeDisplay; no state update needed during drag.
  };

  const handleKeyframeDragEnd = (fromTimeMs, toTimeMs) => {
    if (firstKeyframeMs !== null && fromTimeMs === firstKeyframeMs) {
      onSelectKeyframe?.(fromTimeMs);
      jumpToTime(fromTimeMs);
      return;
    }
    if (fromTimeMs === toTimeMs) return;
    onMoveKeyframe?.(fromTimeMs, toTimeMs);
    onSelectKeyframe?.(toTimeMs);
    jumpToTime(toTimeMs);
  };

  const handleAddKeyframe = (event) => {
    event.stopPropagation();
    onPause?.();
    onAddKeyframe?.();
  };

  const handleDeleteKeyframe = (event) => {
    event.stopPropagation();
    const targetMs = effectiveSelectedKeyframeMs;
    if (targetMs === null || targetMs === undefined) return;
    onDeleteKeyframe?.(targetMs);
    onSelectKeyframe?.(null);
  };

  // One motion-step lane per selected player or per entity whose drawing is
  // selected via the animation select tool. Accepts both v3 (kind==="motion" +
  // attachedEntityId) and legacy v2 (source==="coaching-draw") entries.
  const stepLanes = useMemo(() => {
    const entityIds = new Set(selectedPlayerIds || []);
    // When a motion drawing is selected, also show all steps for its entity
    // (the full chain) even if the entity itself isn't selected on canvas.
    if (selectedMotionDrawingIds?.length && drawings?.length) {
      for (const selId of selectedMotionDrawingIds) {
        const d = drawings.find((dr) => dr.id === selId);
        const entityId = d?.attachedEntityId || d?.attachedPlayerId;
        if (entityId) entityIds.add(entityId);
      }
    }
    return Array.from(entityIds).map((playerId) => ({
      playerId,
      drawings: (drawings || []).filter((d) => {
        if (d?.kind === "annotation") return false;
        const isMotion = d?.kind === "motion" || d?.source === "coaching-draw";
        const entityId = d?.attachedEntityId || d?.attachedPlayerId;
        return isMotion && entityId === playerId;
      }),
    })).filter(({ drawings: d }) => d.length > 0);
  }, [selectedPlayerIds, selectedMotionDrawingIds, drawings]);
  const hasSteps = stepLanes.length > 0;

  // Annotation visibility lanes: one per selected annotation drawing. Shown
  // whenever annotation is the active scope and there is at least one
  // selection, regardless of drawingMode — annotations are not bound to
  // drawing mode.
  const annotationLaneDrawings = useMemo(() => {
    if (activeDrawingUi !== "annotation") return [];
    if (!selectedAnnotationDrawingIds?.length) return [];
    const selectedSet = new Set(selectedAnnotationDrawingIds);
    return (annotationDrawings || []).filter((d) => selectedSet.has(d?.id));
  }, [activeDrawingUi, annotationDrawings, selectedAnnotationDrawingIds]);
  const hasAnnotationLanes = annotationLaneDrawings.length > 0;

  return (
    <div
      className={`flex flex-col items-center justify-between gap-[3.125px] sm:gap-[6.25px]
                      bg-BrandBlack
                       py-[3.125px] sm:py-[6.25px] px-[12.5px] sm:px-[15.625px] md:px-[18.75px]
                      rounded-[25px] sm:rounded-[28.125px] md:rounded-[31.25px]
                      select-none z-50
                      absolute left-1/2 transform -translate-x-1/2 bottom-[12px]
                      w-[323px] sm:w-[388px] md:w-[517px] lg:w-[646px]
                      min-h-[62.5px] sm:min-h-[75px] md:min-h-[100px] lg:min-h-[125px]`}
    >
      <div className="flex flex-col w-full" style={{ gap: hasSteps || hasAnnotationLanes ? 2 : undefined }}>
        <TimeBar
          durationMs={timelineDurationMs}
          currentTimeMs={clampedTimeMs}
          isPlaying={isPlaying}
          keyframes={keyframeMarkers}
          selectedKeyframeMs={selectedKeyframeMs}
          effectiveSelectedKeyframeMs={effectiveSelectedKeyframeMs}
          onSeek={handleSeek}
          onPause={onPause}
          onKeyframeClick={handleKeyframeClick}
          onKeyframeDragStart={handleKeyframeDragStart}
          onKeyframeDragMove={handleKeyframeDragMove}
          onKeyframeDragEnd={handleKeyframeDragEnd}
          getAuthoritativeTimeMs={getAuthoritativeTimeMs}
          onDragStateChange={onDragStateChange}
          keyframesMs={keyframesMs}
          variant={variant}
        />

        {hasSteps && (
          <div style={{ marginTop: -12, display: "flex", flexDirection: "column", gap: 2 }}>
            {stepLanes.map(({ playerId, drawings: laneDrawings }) => (
              <StepTrack
                key={playerId}
                drawings={laneDrawings}
                durationMs={timelineDurationMs}
                currentTimeMs={clampedTimeMs}
                onUpdateDrawing={onUpdateDrawing}
                onUpdateDrawingNoHistory={onUpdateDrawingNoHistory}
                onBeginHistoryGroup={onBeginHistoryGroup}
                onEndHistoryGroup={onEndHistoryGroup}
                onSeek={handleSeek}
                playersById={playersById}
              />
            ))}
          </div>
        )}

        {hasAnnotationLanes && (
          <div style={{ marginTop: hasSteps ? 2 : -12, display: "flex", flexDirection: "column", gap: 2 }}>
            <AnnotationVisibilityTrack
              drawings={annotationLaneDrawings}
              durationMs={timelineDurationMs}
              currentTimeMs={clampedTimeMs}
              onUpdateDrawing={onUpdateAnnotationDrawing}
              onUpdateDrawingNoHistory={onUpdateAnnotationDrawingNoHistory}
              onBeginHistoryGroup={onBeginHistoryGroup}
              onEndHistoryGroup={onEndHistoryGroup}
              onSeek={handleSeek}
            />
          </div>
        )}
      </div>

      {drawingMode ? (
        <div className="flex flex-1 w-full items-center gap-[3.125px] sm:gap-[6.25px]">
          {/* Left third — matches SpeedSlider's natural w-200/641 */}
          <SpeedSlider
            speedMultiplier={speedMultiplier}
            onSpeedChange={onSpeedChange}
            durationMs={timelineDurationMs}
          />
          {/* Center third — play button */}
          <div className="flex-1 flex items-center justify-center">
            <div
              onClick={handlePlayToggle}
              className="h-[37.5px] w-[37.5px] sm:h-[43.75px] sm:w-[43.75px] md:h-[50px] md:w-[50px] bg-BrandOrange flex items-center justify-center rounded-lg cursor-pointer"
            >
              {isPlaying ? (
                <svg width="22.5" height="22.5" viewBox="0 0 24 24" fill="currentColor" className="text-BrandBlack">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <IoPlayOutline className="text-BrandBlack text-[22.5px] sm:text-[22.5px] md:text-[25px] lg:text-[31.25px]" />
              )}
            </div>
          </div>
          {/* Right third — mirrors left width, reset button right-aligned */}
          <div className="w-200/641 flex items-center justify-end">
            <div
              onClick={() => { onPause?.(); onSeek?.(0, { source: "engine" }); }}
              className="h-[16px] sm:h-[22px] md:h-[24px] lg:h-[32px] w-[16px] sm:w-[22px] md:w-[24px] lg:w-[32px] bg-BrandBlack2 flex items-center justify-center rounded-sm cursor-pointer"
            >
              <IoRefreshOutline className="text-BrandOrange text-[17.5px] sm:text-[20px] md:text-[22.5px] lg:text-[25px]" />
            </div>
          </div>
        </div>
      ) : (
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

          {(onAddKeyframe || onDeleteKeyframe) && (
            <KeyframeManager
              selectedKeyframe={effectiveSelectedKeyframeMs}
              onAddKeyframe={handleAddKeyframe}
              onDeleteKeyframe={handleDeleteKeyframe}
              variant={variant}
            />
          )}
        </div>
      )}
    </div>
  );
}
