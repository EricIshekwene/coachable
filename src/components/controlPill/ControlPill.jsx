import React, { useState, useEffect, useRef } from 'react';
import TimePill from './TimePill';
import SpeedSlider from './SpeedSlider';
import PlaybackControls from './PlaybackControls';
import KeyframeManager from './KeyframeManager';
import DropdownMenu from './DropdownMenu';

const MAX_KEYFRAMES = 30;
const MIN_KEYFRAME_DISTANCE = 2;

/**
 * ControlPill - Main timeline control component
 * Manages timeline state, playback, keyframes, and exposes state via callbacks
 */
export default function ControlPill({
  // Callbacks for state changes (exposed to parent)
  onTimePercentChange,
  onKeyframesChange,
  onSpeedChange,
  onPlayStateChange,
  onSelectedKeyframeChange,
  onAutoplayChange,
  onKeyframeAddAttempt,
  // Optional: External control
  externalTimePercent,
  externalIsPlaying,
  externalSpeed,
  externalSelectedKeyframe,
  externalAutoplayEnabled,
  externalKeyframes,
  // Optional: external signal to add a keyframe at current time
  addKeyframeSignal,
  // Optional: external signal to reset timeline/keyframes
  resetSignal,
  onRequestAddKeyframe,
}) {
  // Core state
  const [keyframes, setKeyframes] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);

  // Undo/Redo state
  const [actionHistory, setActionHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);

  const timePercent = externalTimePercent ?? 0;
  const isPlaying = externalIsPlaying ?? false;
  const speedMultiplier = externalSpeed ?? 50;
  const selectedKeyframe = externalSelectedKeyframe ?? null;
  const isAutoplayEnabled = externalAutoplayEnabled ?? autoplayEnabled;

  const lastKeyframeSignal = useRef(addKeyframeSignal);
  const lastResetSignal = useRef(resetSignal);
  const latestTimePercentRef = useRef(externalTimePercent ?? 0);

  const areKeyframesEqual = (a = [], b = []) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (Math.abs(a[i] - b[i]) > 0.0001) return false;
    }
    return true;
  };

  useEffect(() => {
    latestTimePercentRef.current = externalTimePercent ?? timePercent;
  }, [externalTimePercent, timePercent]);

  useEffect(() => {
    if (!Array.isArray(externalKeyframes)) return;
    const next = [...externalKeyframes].sort((a, b) => a - b);
    setKeyframes((prev) => (areKeyframesEqual(prev, next) ? prev : next));
    setActionHistory([]);
    setRedoHistory([]);
  }, [externalKeyframes]);

  // Notify parent of keyframes changes
  useEffect(() => {
    onKeyframesChange?.(keyframes);
  }, [keyframes, onKeyframesChange]);


  // Handle time change
  const handleTimeChange = (newPercent) => {
    onSelectedKeyframeChange?.(null);
    onPlayStateChange?.(false);
    onTimePercentChange?.(newPercent);
  };

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
    onPlayStateChange?.(false); // Pause when dragging
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Handle speed change
  const handleSpeedChange = (newSpeed) => {
    onSpeedChange?.(newSpeed);
  };

  // Handle play toggle
  const handlePlayToggle = () => {
    if (!isPlaying && timePercent >= 100) {
      onTimePercentChange?.(0);
    }
    onPlayStateChange?.(!isPlaying);
  };

  const jumpToTime = (nextTime) => {
    if (keyframes.includes(nextTime)) {
      onSelectedKeyframeChange?.(nextTime);
      onTimePercentChange?.(nextTime);
      return;
    }
    onSelectedKeyframeChange?.(null);
    onTimePercentChange?.(nextTime);
  };

  const getSortedKeyframes = () => [...keyframes].sort((a, b) => a - b);

  // Handle skip back (previous keyframe or start)
  const handleSkipBack = () => {
    const sorted = getSortedKeyframes();
    if (sorted.length === 0) {
      jumpToTime(0);
      return;
    }
    const EPS = 0.001;
    const previous = [...sorted].reverse().find((kf) => kf < timePercent - EPS);
    if (previous !== undefined) {
      jumpToTime(previous);
      return;
    }
    jumpToTime(0);
  };

  // Handle skip forward (next keyframe or end)
  const handleSkipForward = () => {
    const sorted = getSortedKeyframes();
    if (sorted.length === 0) {
      jumpToTime(100);
      return;
    }
    const EPS = 0.001;
    const next = sorted.find((kf) => kf > timePercent + EPS);
    if (next !== undefined) {
      jumpToTime(next);
      return;
    }
    jumpToTime(100);
  };

  // Handle adding a keyframe at current time position
  const addKeyframeAtTime = (timePercentValue) => {
    // Limit maximum keyframes
    if (keyframes.length >= MAX_KEYFRAMES) {
      onKeyframeAddAttempt?.({
        added: false,
        reason: "max",
        timePercent: timePercentValue,
        keyframes: [...keyframes],
        maxKeyframes: MAX_KEYFRAMES,
      });
      return;
    }

    // Check if keyframe already exists at this position (within tolerance)
    const existingKeyframe = keyframes.find(
      (kf) => Math.abs(kf - timePercentValue) < MIN_KEYFRAME_DISTANCE
    );

    if (!existingKeyframe) {
      // Clear redo history when making new changes
      setRedoHistory([]);
      // Add keyframe
      const newKeyframes = [...keyframes, timePercentValue].sort((a, b) => a - b);
      setKeyframes(newKeyframes);
      // Record the action for undo
      setActionHistory([...actionHistory, { type: "add", keyframe: timePercentValue }]);
      onKeyframeAddAttempt?.({
        added: true,
        reason: "added",
        timePercent: timePercentValue,
        keyframes: newKeyframes,
      });
      return;
    }
    onSelectedKeyframeChange?.(existingKeyframe);
    onTimePercentChange?.(existingKeyframe);
    onKeyframeAddAttempt?.({
      added: false,
      reason: "too-close",
      timePercent: timePercentValue,
      keyframes: [...keyframes],
      minDistance: MIN_KEYFRAME_DISTANCE,
      selectedKeyframe: existingKeyframe,
    });
  };

  const handleAddKeyframe = (e) => {
    e.stopPropagation(); // Prevent triggering pill click
    if (onRequestAddKeyframe) {
      onRequestAddKeyframe();
      return;
    }
    const currentTime = externalTimePercent ?? timePercent;
    addKeyframeAtTime(currentTime);
  };

  // Handle clicking on a keyframe
  const handleKeyframeClick = (e, timePercentValue) => {
    e.stopPropagation(); // Prevent triggering pill click
    if (selectedKeyframe === timePercentValue) {
      onSelectedKeyframeChange?.(null); // Deselect if already selected
    } else {
      onSelectedKeyframeChange?.(timePercentValue); // Select this keyframe
      onTimePercentChange?.(timePercentValue);
    }
  };

  // Handle deleting selected keyframe
  const handleDeleteKeyframe = (e) => {
    e.stopPropagation(); // Prevent triggering pill click
    if (selectedKeyframe !== null) {
      const deletedKeyframe = selectedKeyframe;
      // Clear redo history when making new changes
      setRedoHistory([]);
      // Remove keyframe
      setKeyframes(keyframes.filter(kf => kf !== deletedKeyframe));
      onSelectedKeyframeChange?.(null);
      // Record the action for undo
      setActionHistory([...actionHistory, { type: 'delete', keyframe: deletedKeyframe }]);
    }
  };

  // Handle trash button - remove all keyframes
  const handleTrash = (e) => {
    e.stopPropagation();
    if (keyframes.length > 0) {
      // Clear redo history when making new changes
      setRedoHistory([]);
      // Record all deletions as a single clear action
      const allKeyframes = [...keyframes];
      setKeyframes([]);
      onSelectedKeyframeChange?.(null);
      // Record the clear action for undo
      setActionHistory([...actionHistory, { type: 'clear', keyframes: allKeyframes }]);
    }
  };

  // Handle undo - reverse the last action
  const handleUndo = (e) => {
    e.stopPropagation();
    if (actionHistory.length > 0) {
      const lastAction = actionHistory[actionHistory.length - 1];
      const newActionHistory = actionHistory.slice(0, -1);

      // Reverse the action
      if (lastAction.type === 'add') {
        // Undo add: remove the keyframe
        const newKeyframes = keyframes.filter(kf => kf !== lastAction.keyframe);
        setKeyframes(newKeyframes);
        if (selectedKeyframe === lastAction.keyframe) {
          onSelectedKeyframeChange?.(null);
        }
        // Add reversed action to redo history
        setRedoHistory([...redoHistory, { type: 'delete', keyframe: lastAction.keyframe }]);
      } else if (lastAction.type === 'delete') {
        // Undo delete: add the keyframe back
        const newKeyframes = [...keyframes, lastAction.keyframe].sort((a, b) => a - b);
        setKeyframes(newKeyframes);
        // Add reversed action to redo history
        setRedoHistory([...redoHistory, { type: 'add', keyframe: lastAction.keyframe }]);
      } else if (lastAction.type === 'clear') {
        // Undo clear: restore all keyframes
        setRedoHistory([...redoHistory, { type: 'clear', keyframes: lastAction.keyframes }]);
        setKeyframes(lastAction.keyframes);
      }

      setActionHistory(newActionHistory);
    }
  };

  // Handle redo - re-apply the last undone action
  const handleRedo = (e) => {
    e.stopPropagation();
    if (redoHistory.length > 0) {
      const lastRedoAction = redoHistory[redoHistory.length - 1];
      const newRedoHistory = redoHistory.slice(0, -1);

      // Re-apply the action
      if (lastRedoAction.type === 'add') {
        // Redo add: add the keyframe
        const newKeyframes = [...keyframes, lastRedoAction.keyframe].sort((a, b) => a - b);
        setKeyframes(newKeyframes);
        // Add action back to undo history
        setActionHistory([...actionHistory, { type: 'add', keyframe: lastRedoAction.keyframe }]);
      } else if (lastRedoAction.type === 'delete') {
        // Redo delete: remove the keyframe
        const newKeyframes = keyframes.filter(kf => kf !== lastRedoAction.keyframe);
        setKeyframes(newKeyframes);
        if (selectedKeyframe === lastRedoAction.keyframe) {
          onSelectedKeyframeChange?.(null);
        }
        // Add action back to undo history
        setActionHistory([...actionHistory, { type: 'delete', keyframe: lastRedoAction.keyframe }]);
      } else if (lastRedoAction.type === 'clear') {
        // Redo clear: save current state, then clear
        const currentKeyframes = [...keyframes];
        setKeyframes([]);
        onSelectedKeyframeChange?.(null);
        // Add action back to undo history with the keyframes that were cleared
        setActionHistory([...actionHistory, { type: 'clear', keyframes: currentKeyframes }]);
      }

      setRedoHistory(newRedoHistory);
    }
  };

  // Handle autoplay toggle
  const handleAutoplayToggle = () => {
    const newAutoplayState = !isAutoplayEnabled;
    if (externalAutoplayEnabled === undefined) {
      setAutoplayEnabled(newAutoplayState);
    }
    onAutoplayChange?.(newAutoplayState);
    // When autoplay is turned off, return to start
    if (!newAutoplayState) {
      onTimePercentChange?.(0);
      onPlayStateChange?.(false);
    }
  };

  // Add a keyframe when the parent explicitly requests it
  useEffect(() => {
    if (addKeyframeSignal === undefined) return;
    if (addKeyframeSignal === lastKeyframeSignal.current) return;
    lastKeyframeSignal.current = addKeyframeSignal;
    addKeyframeAtTime(latestTimePercentRef.current);
  }, [addKeyframeSignal]);

  // Reset timeline state when parent emits a reset signal.
  useEffect(() => {
    if (resetSignal === undefined) return;
    if (resetSignal === lastResetSignal.current) return;
    lastResetSignal.current = resetSignal;
    setKeyframes([]);
    setActionHistory([]);
    setRedoHistory([]);
    onSelectedKeyframeChange?.(null);
    onPlayStateChange?.(false);
    onTimePercentChange?.(0);
  }, [resetSignal, onSelectedKeyframeChange, onPlayStateChange, onTimePercentChange]);

  return (
    <>
      {/* Slate Time controller and keyframes */}
      <div className={`aspect-[641/124] h-[62.5px] sm:h-[75px] md:h-[100px] lg:h-[125px]
                        flex flex-col items-center justify-between gap-[3.125px] sm:gap-[6.25px] 
                        bg-BrandBlack
                         py-[3.125px] sm:py-[6.25px] px-[12.5px] sm:px-[15.625px] md:px-[18.75px]
                        rounded-[25px] sm:rounded-[28.125px] md:rounded-[31.25px] 
                        select-none z-50
                        absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${isDropdownOpen ? 'top-[84%]' : 'top-[87%]   '
        }`}>
        {/* Time pill */}
        <TimePill
          timePercent={timePercent}
          onTimeChange={handleTimeChange}
          keyframes={keyframes}
          selectedKeyframe={selectedKeyframe}
          onKeyframeClick={handleKeyframeClick}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          isDragging={isDragging}
        />

        {/* Time slide with time display, play buttons and keyframe button */}
        <div className="flex flex-1 w-full items-center justify-between gap-[3.125px] sm:gap-[6.25px]">
          {/* Speed slider */}
          <SpeedSlider
            speedMultiplier={speedMultiplier}
            onSpeedChange={handleSpeedChange}
          />

          {/* Playback controls */}
          <PlaybackControls
            isPlaying={isPlaying}
            onPlayToggle={handlePlayToggle}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
          />

          {/* Keyframe manager */}
          <KeyframeManager
            selectedKeyframe={selectedKeyframe}
            onAddKeyframe={handleAddKeyframe}
            onDeleteKeyframe={handleDeleteKeyframe}
          />
        </div>
      </div>

      {/* Dropdown menu */}
      <DropdownMenu
        isOpen={isDropdownOpen}
        onToggle={() => setIsDropdownOpen(!isDropdownOpen)}
        onTrash={handleTrash}
        onUndo={handleUndo}
        onRedo={handleRedo}
        autoplayEnabled={isAutoplayEnabled}
        onAutoplayToggle={handleAutoplayToggle}
        canUndo={actionHistory.length > 0}
        canRedo={redoHistory.length > 0}
      />
    </>
  );
}
