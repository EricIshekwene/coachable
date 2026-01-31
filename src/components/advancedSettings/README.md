# Advanced Settings (`src/components/advancedSettings/`)

This folder contains the **Advanced Settings panel** and its section components. The Advanced Settings panel is a full-height sidebar that appears on the right side of the screen when opened, providing access to pitch, player, export video, and animation configuration options.

## High-level behavior

- **Fixed-width, full-height panel**: `AdvancedSettings.jsx` renders an absolute positioned panel that is `h-screen` and uses flex column layout.
- **Scrollable content + pinned footer**:
- The **main content** (pitch settings, player settings, export video settings, animation settings, save prefab button) lives inside a **scroll container**.
  - The **Reset to Default** button lives in a **non-scrolling footer** at the bottom.
- **Close button**: A close button is positioned to the left of the panel.

This is implemented by splitting the panel into:

- **Scrollable area**: `flex-1 shrink-0 overflow-y-auto`
- **Footer**: `shrink-0` (so it never gets pushed off-screen)

You can see this in `AdvancedSettings.jsx`.

## Data flow (where state comes from)

`AdvancedSettings.jsx` itself is a **layout/composition** component. State is owned by `src/App.jsx` and passed down as props:

- **Settings object**: `value` (object with `pitch`, `players`, `exportVideo`, `animation` sections)
- **Update callback**: `onChange(nextSettings)` - called when any section updates
- **Reset callback**: `onReset()` - resets all settings to defaults
- **Close callback**: `onClose()` - closes the panel

Each section component receives only its relevant slice of the settings object and an `onChange` callback that updates that specific section.

## Settings structure

The settings object has the following structure:

```javascript
{
  pitch: {
    showMarkings: boolean,      // Toggle field markings visibility
    pitchSize: string,          // "Full Field" | "Half Pitch" | "Goal" | "Quarter Field"
    pitchColor: string,         // Hex color code (e.g., "#4FA85D")
  },
  players: {
    baseSizePx: number,         // Default player size in pixels (10-50)
  },
  exportVideo: {
    videoQuality: string,       // "360p" | "480p" | "720p" | "1080p" | "1440p" | "2160p (4K)"
    watermark: boolean,         // Toggle watermark on exported videos
    includeMetadata: boolean,   // Toggle metadata inclusion in exports
  },
  animation: {
    playOnLoad: boolean,         // Auto-play animation on load
  },
}
```

## Section-by-section

### `PitchSettingsSection.jsx`

Controls for the rugby field appearance:

- **Show Markings**: Toggle switch to show/hide the field markings image
- **Pitch Size**: Dropdown to select field scale ("Full Field", "Half Pitch", "Goal", "Quarter Field")
- **Pitch Color**: 
  - Dropdown with predefined color options (shows color swatch + name)
  - Hex input field for custom colors
  - Automatically detects if the current color matches a predefined option

**Props:**
- `value` (object): `{ showMarkings, pitchSize, pitchColor }`
- `onChange(nextValue)`: Updates the pitch settings

**Constants:**
- `PITCH_SIZE_OPTIONS`: Array of available pitch size options
- `PITCH_COLOR_OPTIONS`: Array of `{ name, hex }` objects for predefined colors

### `PlayerSettingsSection.jsx`

Controls for default player appearance:

- **Default Player Size (px)**: 
  - Slider (10-50px range) + number input
  - This is the "base" size that the Right Panel's size percentage scales from

**Props:**
- `value` (object): `{ baseSizePx }`
- `onChange(nextValue)`: Updates the player settings

**Note:** The Right Panel's "All Players" section controls `sizePercent` (which scales from this base), `color`, `showNumber`, and `showName`. Those controls are intentionally kept in the Right Panel, not Advanced Settings.

### `ExportVideoSettingsSection.jsx`

Controls for video export configuration (settings are stored but not yet implemented):

- **Video Quality**: Dropdown to select export resolution
- **Watermark**: Toggle switch (uses crown icon when enabled)
- **Include Metadata**: Toggle switch

**Props:**
- `value` (object): `{ videoQuality, watermark, includeMetadata }`
- `onChange(nextValue)`: Updates the export video settings

**Constants:**
- `VIDEO_QUALITY_OPTIONS`: Array of available quality options

### `AnimationSettingsSection.jsx`

Controls for animation behavior (settings are stored but not yet fully implemented):

- **Start on Load**: Toggle switch to auto-play animation when loaded

**Props:**
- `value` (object): `{ playOnLoad }`
- `onChange(nextValue)`: Updates the animation settings

### `SavePrefabButton.jsx`

- Presentational button: “Save Current Frame as Prefab”.
- Lives in the Advanced Settings scroll area and is intentionally not wired yet.

## How settings affect the canvas

### Pitch Settings

- **Pitch Color**: Applied as the canvas background color via `BoardViewport` style prop
- **Show Markings**: Controls visibility of `FieldLayer` (returns `null` when false)
- **Pitch Size**: Scales the field image via CSS transform (different scale factors for each size option)

These are wired in:
- `src/canvas/CanvasRoot.jsx` - extracts pitch settings and passes to `BoardViewport` and `FieldLayer`
- `src/canvas/BoardViewport.jsx` - accepts `style` prop for background color
- `src/canvas/FieldLayer.jsx` - accepts `showMarkings` and `pitchSize` props

### Player Settings

- **Base Size (px)**: Used as the base pixel size in `ItemVisual.jsx` when calculating player render size
  - Formula: `sizePx = Math.max(6, Math.round((basePx * sizePercent) / 100))`
  - The Right Panel's `sizePercent` (from `allPlayersDisplay`) scales from this base

This is wired in:
- `src/canvas/CanvasRoot.jsx` - extracts `playerBaseSizePx` and passes to `ItemsLayer`
- `src/canvas/ItemsLayer.jsx` - passes `playerBaseSizePx` to `ItemVisual`
- `src/canvas/ItemVisual.jsx` - uses `playerBaseSizePx` instead of hardcoded `30`

### Export Video & Animation Settings

These settings are stored in App state but **not yet implemented** in the actual export/animation logic. They are ready for future implementation.

## Common patterns

### Dropdown menus

Both `PitchSettingsSection` and `ExportVideoSettingsSection` use dropdown menus with click-outside-to-close behavior:

1. Use `useRef` to track the dropdown container
2. Use `useState` to track open/closed state
3. Use `useEffect` to add/remove click-outside listener when open
4. Dropdowns are absolutely positioned below the trigger button

### Toggle switches

All sections use consistent toggle switch styling:
- 32px width, 16px height
- Orange when on, gray when off
- Smooth transition animations
- Accessible with `aria-label`

### Sliders

`PlayerSettingsSection` uses MUI `Slider` with:
- Consistent styling (orange theme matching ControlPill)
- Number input alongside for direct value entry
- Min/max validation

## Default values

Default settings are defined in `src/App.jsx` as `DEFAULT_ADVANCED_SETTINGS`:

```javascript
{
  pitch: {
    showMarkings: true,
    pitchSize: "Full Field",
    pitchColor: "#4FA85D", // Stadium Grass
  },
  players: {
    baseSizePx: 30,
  },
  exportVideo: {
    videoQuality: "1080p",
    watermark: true,
    includeMetadata: true,
  },
  animation: {
    playOnLoad: true,
  },
}
```

The "Reset to Default" button calls `onReset()` which sets the entire settings object back to these defaults.
