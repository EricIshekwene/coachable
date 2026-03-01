# Canvas System Overview

This folder implements the interactive Konva-based canvas for the sports play designer.

## Architecture

The canvas uses **react-konva** (Konva.js) with a single component (`KonvaCanvasRoot`) that handles all rendering and interaction. Canvas hooks extract reusable logic into focused modules.

### Coordinate System

- World coordinates are centered: `(0, 0)` is the middle of the viewport/field.
- `+x` is right, `+y` is down, units are pixels.
- Camera transform: `translate(camera.x, camera.y) scale(camera.zoom)`.
- Field rotates visually but world coords stay axis-aligned.

---

## Folder Structure

```
canvas/
├── KonvaCanvasRoot.jsx    # Main canvas component (Stage, items, interactions)
├── BoardViewport.jsx      # Wrapper div for clipping and export ref
├── canvas.md              # This file
├── object-snapping.md     # Snapping behavior documentation
└── hooks/
    ├── useCanvasSize.js   # ResizeObserver for container dimensions
    ├── useCanvasPan.js    # Pointer-based camera panning
    ├── useCanvasMarquee.js # Rubber-band marquee selection
    └── useCanvasSnapping.js # Snap guide math + imperative drawing
```

---

## Component Responsibilities

### KonvaCanvasRoot

The main canvas component. Renders a Konva `Stage` containing:
- **Field image** — centered and rotated based on `fieldRotation`
- **Player circles** — colored circles with number/name text
- **Ball** — image rendered at world coordinates
- **Snap guidelines** — orange dashed lines drawn during drag

Handles all interaction:
- **Pan** (hand tool or middle-mouse) via `useCanvasPan`
- **Zoom** (Ctrl+wheel or pinch)
- **Marquee select** (drag on empty space with select tool) via `useCanvasMarquee`
- **Item drag** with center-to-center snapping via `useCanvasSnapping`
- **Add player** (click on empty space with addPlayer tool)

Exposes an imperative animation renderer via `animationRendererRef`:
- `setPoses(poseMap)` — directly update Konva node positions (bypasses React state)
- `clearPoses()` — clear animation overrides
- `getCurrentPose(id)` — read current rendered position

### BoardViewport

Wrapper `<div>` that clips content with `overflow: hidden`, provides the ref for future image export, and prevents touch/select browser defaults.

### Hooks

- **useCanvasSize** — Tracks container width/height via ResizeObserver
- **useCanvasPan** — Pointer-based panning with hand tool or middle-mouse
- **useCanvasMarquee** — Rubber-band selection box with intersection testing
- **useCanvasSnapping** — Pure snapping math (center-to-center, field center, canvas center) and imperative guideline drawing

---

## Rendering Pipeline

1. `BoardViewport` clips the visible area
2. Konva `Stage` fills the viewport
3. Background layer renders the field image (centered, rotated)
4. Items layer renders players and ball at world coordinates
5. Guides layer renders snap guidelines during drag (imperative, not React state)

## Interaction Flow

- Tool modes: `hand`, `select`, `addPlayer`, `color`
- **Hand tool**: pointer down → pan start → pointer move → camera delta → pointer up → pan end
- **Select tool**: pointer down on item → drag with snapping; pointer down on empty → marquee select
- **Add player**: pointer down on empty → screen-to-world conversion → add player at world coords
- **Zoom**: Ctrl+wheel → zoom toward pointer; plain wheel → vertical pan
