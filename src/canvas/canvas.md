# Canvas System Overview

This folder implements a layered canvas architecture for building interactive sports plays (field + players + camera).  
The goal is to keep behavior predictable, scalable, and readable as complexity grows.

The canvas follows a **viewport → camera → world → items** mental model, similar to tools like Figma or Miro.

---

## Mental Model

There are three coordinate spaces:

1. **Viewport space**
   - What the user can see.
   - Clipped to screen bounds.
   - Used for export.

2. **World space**
   - The infinite field where objects live.
   - Players, balls, and markings use world coordinates.
   - The field image is anchored here.

3. **Camera**
   - Controls how the world is viewed.
   - Panning moves the camera, not the field or items directly.
   - Zoom scales the world uniformly.

Dragging behavior depends on the active tool:
- **Hand tool** → pans the camera.
- **Select tool** → drags individual items.

---

## Folder Structure

src/canvas/
├── CanvasRoot.jsx
├── BoardViewport.jsx
├── PanHandler.jsx
├── WorldLayer.jsx
├── FieldLayer.jsx
├── DraggableItem.jsx
├── ItemsLayer.jsx
└── renderers/
└── ItemVisual.jsx


Each file has a single responsibility.

---

## Component Responsibilities

### CanvasRoot

**Role**
- Top-level coordinator for the canvas.
- Owns shared state.

**Owns**
- `tool` ("hand" | "select")
- `camera` `{ x, y, zoom }`
- `items` array `{ id, type, x, y, ... }`

**Does NOT**
- Render visuals directly.
- Handle pointer math itself.

---

### BoardViewport

**Role**
- Defines the visible screen area.

**Owns**
- `ref` used for export.
- Clipping via `overflow-hidden`.
- Background color.

**Key properties**
- `position: relative`
- `overflow: hidden`

Everything outside this component is invisible.

---

### PanHandler

**Role**
- Handles camera panning via pointer input.

**Behavior**
- Only active when `tool === "hand"`.
- Only responds to dragging empty space.
- Updates `camera.x` and `camera.y`.

**Important rule**
- If a draggable item is clicked, it calls `stopPropagation()`, preventing pan.

---

### WorldLayer

**Role**
- Applies camera transform to the world.

**Behavior**
- Wraps all world content.
- Applies:
transform: translate(camera.x, camera.y) scale(camera.zoom)


**Result**
- Field and all items move together during pan and zoom.

---

### FieldLayer

**Role**
- Renders the pitch graphic.

**Positioning**
- Centered by default using CSS percentages:
- `left: 50%`
- `top: 50%`
- `transform: translate(-50%, -50%)`

**Rules**
- No React state.
- No dragging logic.
- `pointer-events: none`
- `draggable={false}`

The field can extend beyond the viewport and will be clipped.

---

### DraggableItem

**Role**
- Generic draggable wrapper for a single object.

**Used for**
- Players
- Balls
- Cones, arrows, text (future)

**Behavior**
- Active only when `tool === "select"`.
- Uses pointer delta math to update `{ x, y }` in world space.
- Calls `e.stopPropagation()` on pointer down.

**Does NOT**
- Pan the camera.
- Know about other items.
- Handle visuals.

---

### ItemsLayer

**Role**
- Renders all draggable items.

**Behavior**
- Maps `items` array → `DraggableItem`.
- Delegates appearance to `ItemVisual`.

Keeps rendering logic separate from interaction logic.

---

### ItemVisual

**Role**
- Pure visual rendering.

**Examples**
- Player → colored circle
- Ball → image asset

**Rules**
- No pointer logic.
- No state.
- No position math.

---

## Default Positioning Rules

- The field is **always centered** by CSS, not JavaScript.
- Initial camera state:
{ x: 0, y: 0, zoom: 1 }

- Items placed near `{ x: 0, y: 0 }` appear near midfield.

Avoid hardcoded pixel values like `{ x: 300, y: 300 }`.

---

## Why This Architecture

This structure prevents common issues:
- No nested draggable conflicts.
- No magic numbers tied to screen size.
- Clean separation of input, layout, and visuals.
- Easy export (capture only `BoardViewport`).

It also makes future features easier:
- Zoom
- Snap-to-grid
- Multi-select
- Keyframe animation
- Different sports fields

---

## Summary

- **Viewport** defines what is visible.
- **Camera** defines where you are looking.
- **World** contains everything.
- **Items** move independently unless the camera moves.

If something moves unexpectedly, check:
1. Which layer owns the movement?
2. Whether propagation was stopped.
3. Whether the transform is applied at the correct level.

## Debug Checklist

Use this list when something moves incorrectly, drags unexpectedly, or disappears.

### 1. Field is not centered
- Confirm `FieldLayer` uses:
  - `left: 50%`
  - `top: 50%`
  - `transform: translate(-50%, -50%)`
- Ensure there is **no field position stored in React state**.
- Verify the camera default is `{ x: 0, y: 0, zoom: 1 }`.

---

### 2. Field or items disappear while panning
- Check `BoardViewport` has:
  - `position: relative`
  - `overflow: hidden`
- Confirm the field image has `max-w-none`.
- Verify `WorldLayer` is not constrained by width/height.

---

### 3. Dragging a player also pans the camera
- Ensure `DraggableItem` calls:
  ```js
  e.stopPropagation();