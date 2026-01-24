import React, { useState, useEffect, useRef } from 'react';
import TimePill from './subcomponents/controlPill/TimePill';
import SpeedSlider from './subcomponents/controlPill/SpeedSlider';
import PlaybackControls from './subcomponents/controlPill/PlaybackControls';
import KeyframeManager from './subcomponents/controlPill/KeyframeManager';
import DropdownMenu from './subcomponents/controlPill/DropdownMenu';

// Duration for one full traversal from 0 -> 100 before looping
const LOOP_SECONDS = 30;

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
  // Optional: External control
  externalTimePercent,
  externalIsPlaying,
  externalSpeed,
}) {
  // Core state
  const [timePercent, setTimePercent] = useState(externalTimePercent ?? 0);
  const [isPlaying, setIsPlaying] = useState(externalIsPlaying ?? false);
  const [speedMultiplier, setSpeedMultiplier] = useState(externalSpeed ?? 50);
  const [keyframes, setKeyframes] = useState([]);
  const [selectedKeyframe, setSelectedKeyframe] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);

  // Undo/Redo state
  const [actionHistory, setActionHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);

  // Refs for animation
  const rafId = useRef(null);
  const lastTs = useRef(null);

  // Sync with external props if provided
  useEffect(() => {
    if (externalTimePercent !== undefined) {
      setTimePercent(externalTimePercent);
    }
  }, [externalTimePercent]);

  useEffect(() => {
    if (externalIsPlaying !== undefined) {
      setIsPlaying(externalIsPlaying);
    }
  }, [externalIsPlaying]);

  useEffect(() => {
    if (externalSpeed !== undefined) {
      setSpeedMultiplier(externalSpeed);
    }
  }, [externalSpeed]);

  // Notify parent of timePercent changes
  useEffect(() => {
    onTimePercentChange?.(timePercent);
  }, [timePercent, onTimePercentChange]);

  // Notify parent of keyframes changes
  useEffect(() => {
    onKeyframesChange?.(keyframes);
  }, [keyframes, onKeyframesChange]);

  // Notify parent of speed changes
  useEffect(() => {
    onSpeedChange?.(speedMultiplier);
  }, [speedMultiplier, onSpeedChange]);

  // Notify parent of play state changes
  useEffect(() => {
    onPlayStateChange?.(isPlaying);
  }, [isPlaying, onPlayStateChange]);

  // Notify parent of selected keyframe changes
  useEffect(() => {
    onSelectedKeyframeChange?.(selectedKeyframe);
  }, [selectedKeyframe, onSelectedKeyframeChange]);

  // Notify parent of autoplay changes
  useEffect(() => {
    onAutoplayChange?.(autoplayEnabled);
  }, [autoplayEnabled, onAutoplayChange]);

  // Animation loop that updates timePercent based on speed multiplier
  useEffect(() => {
    if (!isPlaying) {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = null;
      lastTs.current = null;
      return;
    }

    const tick = (ts) => {
      if (lastTs.current == null) lastTs.current = ts;
      const dt = (ts - lastTs.current) / 1000; // seconds since last frame
      lastTs.current = ts;

      // Speed calculation: 0 = 0.25x (slow), 75 = ~3x (default), 100 = 4x (fast)
      const speed = (0.25 + (speedMultiplier / 100) * 3.75) * 3;

      setTimePercent((p) => {
        const next = p + (dt / LOOP_SECONDS) * 100 * speed;
        // If autoplay is disabled, return to start (0) when reaching 100, but don't continue playing
        if (next >= 100) {
          if (!autoplayEnabled) {
            setIsPlaying(false); // Stop playing when autoplay is off
            return 0; // Return to start
          }
          return next - 100; // loop back when autoplay is on
        }
        return next;
      });

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = null;
      lastTs.current = null;
    };
  }, [isPlaying, speedMultiplier, autoplayEnabled]);

  // Handle time change
  const handleTimeChange = (newPercent) => {
    setTimePercent(newPercent);
  };

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
    setIsPlaying(false); // Pause when dragging
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Handle speed change
  const handleSpeedChange = (newSpeed) => {
    setSpeedMultiplier(newSpeed);
  };

  // Handle play toggle
  const handlePlayToggle = () => {
    setIsPlaying((p) => !p);
  };

  // Handle skip back (placeholder - implement logic as needed)
  const handleSkipBack = () => {
    // TODO: Implement skip back logic
  };

  // Handle skip forward (placeholder - implement logic as needed)
  const handleSkipForward = () => {
    // TODO: Implement skip forward logic
  };

  // Handle adding a keyframe at current time position
  const handleAddKeyframe = (e) => {
    e.stopPropagation(); // Prevent triggering pill click

    // Limit maximum keyframes to 10
    if (keyframes.length >= 10) {
      return;
    }

    // Check if keyframe already exists at this position (within 4% tolerance)
    const MIN_DISTANCE = 4; // Minimum distance between keyframes in percent
    const existingKeyframe = keyframes.find(kf => Math.abs(kf - timePercent) < MIN_DISTANCE);

    if (!existingKeyframe) {
      // Clear redo history when making new changes
      setRedoHistory([]);
      // Add keyframe
      const newKeyframes = [...keyframes, timePercent].sort((a, b) => a - b);
      setKeyframes(newKeyframes);
      // Record the action for undo
      setActionHistory([...actionHistory, { type: 'add', keyframe: timePercent }]);
    }
  };

  // Handle clicking on a keyframe
  const handleKeyframeClick = (e, timePercentValue) => {
    e.stopPropagation(); // Prevent triggering pill click
    if (selectedKeyframe === timePercentValue) {
      setSelectedKeyframe(null); // Deselect if already selected
    } else {
      setSelectedKeyframe(timePercentValue); // Select this keyframe
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
      setSelectedKeyframe(null);
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
      setSelectedKeyframe(null);
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
          setSelectedKeyframe(null);
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
          setSelectedKeyframe(null);
        }
        // Add action back to undo history
        setActionHistory([...actionHistory, { type: 'delete', keyframe: lastRedoAction.keyframe }]);
      } else if (lastRedoAction.type === 'clear') {
        // Redo clear: save current state, then clear
        const currentKeyframes = [...keyframes];
        setKeyframes([]);
        setSelectedKeyframe(null);
        // Add action back to undo history with the keyframes that were cleared
        setActionHistory([...actionHistory, { type: 'clear', keyframes: currentKeyframes }]);
      }

      setRedoHistory(newRedoHistory);
    }
  };

  // Handle autoplay toggle
  const handleAutoplayToggle = () => {
    const newAutoplayState = !autoplayEnabled;
    setAutoplayEnabled(newAutoplayState);
    // When autoplay is turned off, return to start
    if (!newAutoplayState) {
      setTimePercent(0);
      setIsPlaying(false);
    }
  };

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
        autoplayEnabled={autoplayEnabled}
        onAutoplayToggle={handleAutoplayToggle}
        canUndo={actionHistory.length > 0}
        canRedo={redoHistory.length > 0}
      />
    </>
  );
}
