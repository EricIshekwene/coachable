# Target Konva Architecture

## Scene Graph Design

Stage
  → BackgroundLayer
  → FieldLayer
  → PlayerLayer
      → PlayerGroup
          → PlayerShape
          → PlayerLabel
  → InteractionLayer
  → OverlayLayer

---

## Camera Strategy

Use Group wrapper for world transform.

Group props:
- x (camera pan)
- y (camera pan)
- scaleX / scaleY (zoom)

---

## Player Node Design

Each player represented as:

Group
  → Circle / CustomShape
  → Text label

Group should be draggable.

---

## Playback Strategy

Playback uses:

- Interpolated positions
- Direct Konva node updates
- layer.batchDraw()

---

## Timeline Authority

ControlPill remains source of truth for timePercent.

Renderer only consumes interpolated state.

---

## Drag Interaction

Use Konva drag events:
- onDragMove updates preview
- onDragEnd commits state
