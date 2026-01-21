# ControlPill Subcomponents

This folder contains the subcomponents that make up the ControlPill timeline control.

## Component Structure

```
controlPill/
├── TimePill.jsx          # Draggable timeline with ticks and thumb
├── KeyframeDisplay.jsx   # Keyframe icons on timeline
├── SpeedSlider.jsx       # Speed control slider with time display
├── PlaybackControls.jsx # Play/pause/skip buttons
├── KeyframeManager.jsx   # Add/delete keyframe button
├── DropdownMenu.jsx      # Settings dropdown (trash, undo, redo, autoplay)
└── README.md            # This file
```

## Main ControlPill Component

The main `ControlPill.jsx` component (in `src/components/`) orchestrates all these subcomponents and exposes state via optional callbacks.

### Usage Example

```jsx
import ControlPill from './components/ControlPill';

function App() {
  const [timePercent, setTimePercent] = useState(0);
  const [keyframes, setKeyframes] = useState([]);
  const [speed, setSpeed] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <ControlPill
      // Optional: Receive state updates
      onTimePercentChange={(percent) => {
        setTimePercent(percent);
        console.log('Time:', percent);
      }}
      onKeyframesChange={(kfs) => {
        setKeyframes(kfs);
        console.log('Keyframes:', kfs);
      }}
      onSpeedChange={(speed) => {
        setSpeed(speed);
        console.log('Speed:', speed);
      }}
      onPlayStateChange={(playing) => {
        setIsPlaying(playing);
        console.log('Playing:', playing);
      }}
      onSelectedKeyframeChange={(kf) => {
        console.log('Selected keyframe:', kf);
      }}
      onAutoplayChange={(enabled) => {
        console.log('Autoplay:', enabled);
      }}
      
      // Optional: External control (two-way binding)
      externalTimePercent={timePercent}
      externalIsPlaying={isPlaying}
      externalSpeed={speed}
    />
  );
}
```

### Exposed State

The ControlPill component exposes the following state via callbacks:

1. **timePercent** (0-100) - Current timeline position
2. **keyframes** - Array of keyframe positions (0-100 values)
3. **speedMultiplier** (0-100) - Speed control value
4. **isPlaying** - Playback state
5. **selectedKeyframe** - Currently selected keyframe (number | null)
6. **autoplayEnabled** - Whether animation loops

### Key Functions

- `onTimePercentChange(timePercent)` - Called when timeline position changes
- `onKeyframesChange(keyframes)` - Called when keyframes are added/removed
- `onSpeedChange(speedMultiplier)` - Called when speed slider changes
- `onPlayStateChange(isPlaying)` - Called when play/pause state changes
- `onSelectedKeyframeChange(keyframe)` - Called when keyframe selection changes
- `onAutoplayChange(enabled)` - Called when autoplay toggle changes

## Component Details

### TimePill
- Displays the timeline with tick marks at 0%, 25%, 50%, 75%, 100%
- Shows keyframe icons (via KeyframeDisplay)
- Draggable thumb for scrubbing through timeline
- Clickable to jump to position

### KeyframeDisplay
- Renders keyframe icons on the timeline
- Shows selected vs unselected states
- Handles keyframe click events

### SpeedSlider
- Material-UI slider for speed control (0-100)
- Displays calculated duration in seconds
- Shows time icon

### PlaybackControls
- Play/pause button (toggles playback)
- Skip back button (placeholder for implementation)
- Skip forward button (placeholder for implementation)

### KeyframeManager
- "Add Keyframe" button when no keyframe is selected
- "Delete Keyframe" button when a keyframe is selected
- Limits to 10 keyframes maximum
- Enforces minimum 4% distance between keyframes

### DropdownMenu
- Trash icon - Clear all keyframes
- Undo icon - Undo last action
- Redo icon - Redo last undone action
- Autoplay toggle - Enable/disable looping
- Close button - Collapse dropdown

## Notes

- All callbacks are optional - ControlPill works standalone
- External control props allow two-way binding for controlled component pattern
- Speed calculation: `speed = (0.25 + (speedMultiplier / 100) * 3.75) * 3`
- Base loop duration: 30 seconds
- Visual timeline maps 3%-97% visual range to 0-100% timePercent
