# Coachable

A browser-based sports play designer (rugby focus) built with React, Vite, and Konva.

## Setup Instructions

### Prerequisites

- **Node.js** (version 18 or higher recommended)
- **npm** (comes with Node.js)

### Installation

```bash
cd coachable
npm install
npm run dev
```

The app will start at `http://localhost:5173`.

### Available Scripts

- `npm run dev` — Start the development server
- `npm run build` — Build for production
- `npm run preview` — Preview the production build
- `npm run lint` — Run ESLint

### Troubleshooting

- If dependency issues occur, delete `node_modules` and `package-lock.json`, then run `npm install` again
- Requires Node.js 18+

## Project Structure

```
src/
├── main.jsx                    # App entry point
├── App.jsx                     # Root component (message popup state)
├── index.css                   # Global styles (Tailwind)
│
├── animation/                  # Animation engine and schema
│   ├── schema.js               # Data normalization, keyframe helpers
│   ├── engine.js               # RAF-driven playback engine
│   ├── interpolate.js          # Pose interpolation between keyframes
│   ├── serialize.js            # JSON import/export
│   ├── debugLogger.js          # Ring-buffer debug logging
│   └── index.js                # Public barrel exports
│
├── canvas/                     # Konva-based canvas rendering
│   ├── KonvaCanvasRoot.jsx     # Main canvas (Stage, items, interactions)
│   ├── BoardViewport.jsx       # Viewport wrapper (clipping, export ref)
│   └── hooks/                  # Canvas interaction hooks
│       ├── useCanvasSize.js    # ResizeObserver
│       ├── useCanvasPan.js     # Pan handling
│       ├── useCanvasMarquee.js # Marquee selection
│       └── useCanvasSnapping.js # Snap guides
│
├── features/slate/             # Main play editor feature
│   ├── Slate.jsx               # Top-level wiring component
│   └── hooks/                  # State management hooks
│       ├── useSlateEntities.js # Players, ball, selection, drag
│       ├── useSlateHistory.js  # Undo/redo for entities
│       ├── useFieldViewport.js # Camera, zoom, rotation
│       └── useAdvancedSettings.js # Settings + logging
│
├── components/                 # UI components
│   ├── WideSidebar.jsx         # Left tools panel entry
│   ├── RightPanel.jsx          # Right info/settings panel
│   ├── AdvancedSettings.jsx    # Advanced settings modal
│   ├── controlPill/            # Bottom timeline controller
│   ├── sidebar/                # Sidebar section components
│   ├── wideSidebar/            # Wide sidebar root
│   ├── rightPanel/             # Right panel sections
│   ├── advancedSettings/       # Advanced settings sections
│   ├── subcomponents/          # Shared UI primitives (Buttons, Popovers)
│   ├── MessagePopup/           # Toast notifications
│   └── messaging/              # useMessagePopup hook
│
├── utils/                      # Import/export utilities
│   ├── exportPlay.js           # Build + download play JSON
│   └── importPlay.js           # Validate + parse imported plays
│
└── assets/                     # Images and fonts
```

## Coordinate System

- World coordinates are centered: `(0, 0)` is the middle of the field.
- `+x` is right, `+y` is down, units are pixels.
- Camera transform is `translate(camera.x, camera.y) scale(camera.zoom)`.
- Field rotates visually but world coordinates stay axis-aligned.

## Key Architecture

- **State management**: Custom hooks in `features/slate/hooks/` — no Redux or context
- **Canvas**: Konva.js via react-konva. Single `KonvaCanvasRoot` component handles all rendering
- **Animation**: Immutable JSON data + RAF engine. Playback updates Konva nodes imperatively (no React re-renders per frame)
- **Import/Export**: Versioned JSON schema (`play-export-v2`)
