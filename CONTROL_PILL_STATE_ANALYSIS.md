# ControlPill State Analysis

## Critical State to Expose (Required for External Control)

### 1. **timePercent** (0-100)
- **Type**: `number` (0-100)
- **Purpose**: Current playback position in the timeline
- **Critical**: YES - This is the primary state that other components need to know
- **Usage**: Other components can react to timeline position changes (e.g., update canvas, animate players)

### 2. **keyframes** (Array of positions)
- **Type**: `number[]` (array of 0-100 values, sorted)
- **Purpose**: All keyframe positions on the timeline
- **Critical**: YES - Essential for understanding animation key points
- **Usage**: Other components can use keyframes to:
  - Jump to specific moments
  - Show visual indicators
  - Export/save animation data
  - Sync player positions at keyframes

### 3. **speedMultiplier** (0-100)
- **Type**: `number` (0-100)
- **Purpose**: Controls playback speed (slider thumb position)
- **Critical**: YES - Controls animation speed
- **Calculated Speed**: `(0.25 + (speedMultiplier / 100) * 3.75) * 3`
  - 0 = 0.75x speed
  - 50 = ~2.25x speed (default)
  - 100 = 4.5x speed
- **Usage**: Other components can adjust their animation speed accordingly

### 4. **isPlaying** (Playback State)
- **Type**: `boolean`
- **Purpose**: Whether animation is currently playing
- **Critical**: YES - Other components need to know if animation is active
- **Usage**: 
  - Pause/resume animations in other components
  - Show/hide UI elements based on playback state
  - Trigger updates only when playing

## Important State to Expose (Useful for Context)

### 5. **selectedKeyframe** (Currently Selected)
- **Type**: `number | null` (timePercent value or null)
- **Purpose**: Which keyframe is currently selected
- **Critical**: NO - But useful for context
- **Usage**: 
  - Highlight selected keyframe in other views
  - Show details about selected keyframe
  - Enable keyframe-specific operations

### 6. **autoplayEnabled** (Loop Behavior)
- **Type**: `boolean`
- **Purpose**: Whether animation loops or stops at 100%
- **Critical**: NO - But useful for controlling behavior
- **Usage**: 
  - Other components can adjust their loop behavior
  - Show different UI when autoplay is disabled

## Optional State (Internal Only - May Not Need Exposure)

### 7. **isDragging** (User Interaction)
- **Type**: `boolean`
- **Purpose**: Whether user is currently dragging the timeline
- **Critical**: NO - Internal UI state
- **Note**: Could be useful if other components need to pause updates during drag

### 8. **isDropdownOpen** (UI State)
- **Type**: `boolean`
- **Purpose**: Whether dropdown menu is open
- **Critical**: NO - Pure UI state, no external impact

### 9. **actionHistory / redoHistory** (Undo/Redo)
- **Type**: `Array<Action>`
- **Purpose**: Internal undo/redo state
- **Critical**: NO - Internal to ControlPill

## Recommended Props Interface

```javascript
// Props to receive from parent (for external control)
interface ControlPillProps {
  // Callbacks for state changes
  onTimePercentChange?: (timePercent: number) => void;
  onKeyframesChange?: (keyframes: number[]) => void;
  onSpeedChange?: (speedMultiplier: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onSelectedKeyframeChange?: (keyframe: number | null) => void;
  onAutoplayChange?: (enabled: boolean) => void;
  
  // Optional: External control
  externalTimePercent?: number; // Allow parent to control time
  externalIsPlaying?: boolean;  // Allow parent to control play state
  externalSpeed?: number;       // Allow parent to control speed
}

// State to expose via callbacks
interface ControlPillState {
  timePercent: number;           // 0-100
  keyframes: number[];           // Array of 0-100 values
  speedMultiplier: number;       // 0-100
  isPlaying: boolean;
  selectedKeyframe: number | null;
  autoplayEnabled: boolean;
}
```

## Suggested Component Breakdown Structure

```
components/
  subcomponents/
    controlPill/
      TimePill.jsx          // The draggable timeline pill
      SpeedSlider.jsx       // Speed control slider
      PlaybackControls.jsx  // Play/pause/skip buttons
      KeyframeManager.jsx   // Add/delete keyframe logic
      KeyframeDisplay.jsx   // Keyframe icons on timeline
      DropdownMenu.jsx      // Settings dropdown (trash, undo, redo, autoplay)
      ControlPill.jsx       // Main component (orchestrates subcomponents)
```

## Key Functions to Expose

1. **Jump to time**: `jumpToTime(timePercent: number)` - Programmatically set time
2. **Jump to keyframe**: `jumpToKeyframe(keyframeIndex: number)` - Jump to specific keyframe
3. **Add keyframe at current time**: `addKeyframeAtCurrent()` - External trigger
4. **Get calculated speed**: `getCalculatedSpeed()` - Returns actual speed multiplier
5. **Get duration**: `getDuration()` - Returns actual duration in seconds

## Notes

- The `LOOP_SECONDS = 30` constant defines the base duration
- Speed calculation: `speed = (0.25 + (speedMultiplier / 100) * 3.75) * 3`
- Actual duration: `LOOP_SECONDS / speed`
- Visual position mapping: 3%-97% visual range maps to 0-100% timePercent
