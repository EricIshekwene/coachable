# ControlPill Component

Timeline view/controller for the play editor. Driven by external animation state from `Slate.jsx`.

## Structure

```
controlPill/
├── ControlPill.jsx       # Main timeline control component
├── TimeBar.jsx           # Timeline progress bar with direct DOM updates
├── TimePill.jsx          # Draggable timeline with ticks and thumb
├── KeyframeDisplay.jsx   # Keyframe icons on timeline
├── SpeedSlider.jsx       # Speed control slider with time display
├── PlaybackControls.jsx  # Play/pause/skip buttons
├── KeyframeManager.jsx   # Add/delete keyframe button
├── DropdownMenu.jsx      # Settings dropdown (trash, autoplay, copy debug)
├── DebugOverlay.jsx      # Dev overlay for live engine timing
└── README.md             # This file
```

## Props (from Slate)

ControlPill is a **controlled component**. All state is owned by `Slate.jsx` and the `AnimationEngine`:

| Prop | Type | Description |
|------|------|-------------|
| `currentTimeMs` | number | Current engine time in milliseconds |
| `durationMs` | number | Total animation duration |
| `isPlaying` | boolean | Whether the engine is playing |
| `speedMultiplier` | number (0-100) | Speed slider value |
| `keyframeTimes` | number[] | Array of keyframe times in ms |
| `selectedKeyframeTime` | number \| null | Currently selected keyframe time |
| `autoplayEnabled` | boolean | Whether animation loops |
| `onSeek(timeMs)` | function | Seek the engine to a time |
| `onPlayToggle()` | function | Toggle play/pause |
| `onSpeedChange(value)` | function | Update speed multiplier |
| `onAddKeyframe()` | function | Add keyframe at current time |
| `onDeleteKeyframe(timeMs)` | function | Delete a specific keyframe |
| `onDeleteAllKeyframes()` | function | Clear all keyframes |
| `onAutoplayChange(enabled)` | function | Toggle autoplay |

## Sub-components

### TimeBar
Renders timeline progress using direct DOM updates (not React state) for smooth animation. RAF-throttled scrubbing.

### TimePill
Timeline with tick marks at 0%, 25%, 50%, 75%, 100%. Shows keyframe icons via KeyframeDisplay. Draggable thumb for scrubbing.

### KeyframeDisplay
Renders keyframe icons on the timeline. Shows selected vs unselected states.

### SpeedSlider
MUI slider for speed control (0-100). Displays calculated duration.

### PlaybackControls
Play/pause button, skip back (to previous keyframe or time 0), skip forward (to next keyframe or end).

### KeyframeManager
"Add Keyframe" when no keyframe selected, "Delete Keyframe" when one is selected.

### DropdownMenu
Trash (clear all keyframes), autoplay toggle, copy debug logs.

### DebugOverlay
Dev overlay showing live engine/UI timing and tick diagnostics. Enabled via advanced settings logging.

## Speed Calculation

`playbackRate = (0.25 + (speedMultiplier / 100) * 3.75) * 3`

Base duration: 30 seconds.
