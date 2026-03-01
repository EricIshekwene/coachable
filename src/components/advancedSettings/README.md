# Advanced Settings (`src/components/advancedSettings/`)

This folder contains the **Advanced Settings panel** and its section components. The panel appears as a full-height sidebar on the right side of the screen when opened.

## Structure

```
advancedSettings/
├── README.md
├── PitchSettingsSection.jsx
├── PlayerSettingsSection.jsx
├── BallSettingsSection.jsx
├── ExportVideoSettingsSection.jsx
├── AnimationSettingsSection.jsx
└── LoggerSettingsSection.jsx
```

## Data Flow

`AdvancedSettings.jsx` (in `src/components/`) is a layout component. State is owned by `useAdvancedSettings` in `src/features/slate/hooks/` and passed down as props:

- **Settings object**: `value` (with `pitch`, `players`, `ball`, `exportVideo`, `animation`, `logging` sections)
- **Update callback**: `onChange(nextSettings)`
- **Reset callback**: `onReset()` — resets to `DEFAULT_ADVANCED_SETTINGS`
- **Close callback**: `onClose()`

## Settings Structure

```javascript
{
  pitch: {
    showMarkings: boolean,
    pitchSize: "Full Field" | "Half Pitch" | "Goal" | "Quarter Field",
    pitchColor: string,       // hex color
  },
  players: {
    baseSizePx: number,       // 10-50
  },
  ball: {
    sizePercent: number,      // default 100
  },
  exportVideo: {
    videoQuality: string,
    watermark: boolean,
    includeMetadata: boolean,
  },
  animation: {
    playOnLoad: boolean,
  },
  logging: {
    slate: boolean,
    controlPill: boolean,
    canvas: boolean,
    sidebar: boolean,
  },
}
```

## Sections

- **PitchSettingsSection** — Show markings toggle, pitch size dropdown, pitch color (dropdown + hex input)
- **PlayerSettingsSection** — Default player size slider (10-50px)
- **BallSettingsSection** — Ball size percentage
- **ExportVideoSettingsSection** — Video quality, watermark, metadata (stored but not yet implemented)
- **AnimationSettingsSection** — Play on load toggle (stored but not yet implemented)
- **LoggerSettingsSection** — Per-scope console logging toggles for debugging

## How Settings Affect the Canvas

- **Pitch Color**: Applied as canvas background via `BoardViewport` style
- **Show Markings**: Controls field image visibility in `KonvaCanvasRoot`
- **Pitch Size**: Scales the field image
- **Base Size (px)**: Used as base pixel size for player circles. Right Panel's `sizePercent` scales from this base.

Default values are defined in `src/features/slate/hooks/useAdvancedSettings.js` as `DEFAULT_ADVANCED_SETTINGS`.
