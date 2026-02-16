# Object Snapping (Konva Canvas)

This document explains how dragging + snapping works in `KonvaCanvasRoot.jsx`.

## What snapping does

When you drag a draggable item (player or ball) in **Select** mode, the canvas:

1. Finds nearby alignment guides.
2. Shows dashed guideline lines.
3. Moves the dragged item so one of its edges/center aligns to the nearest guide.
4. Clears guidelines when drag ends.

Snapping can happen on:
- X only
- Y only
- X and Y together

## Coordinate model

All snap math is done in **world coordinates**, not screen pixels.

The world is rendered inside:

```jsx
<Group x={worldOrigin.x} y={worldOrigin.y} scaleX={worldOrigin.scale} scaleY={worldOrigin.scale} />
```

Because zoom changes screen scale, the snap distance is converted from pixels to world units:

`guidelineOffsetWorld = GUIDELINE_OFFSET / worldOrigin.scale`

Where:
- `GUIDELINE_OFFSET = 5` (screen pixels)

This keeps snapping feel consistent at different zoom levels.

## What it snaps to (guide stops)

Guide stops are built in world coordinates from:

1. World/stage center lines
- Vertical: `x = 0` and current screen-center world `x`
- Horizontal: `y = 0` and current screen-center world `y`

2. Field/world bounds (when field image is available)
- Vertical: `left`, `centerX`, `right`
- Horizontal: `top`, `centerY`, `bottom`

3. Other items (excluding the dragged item)
- Each item is treated as a circle:
  - Player radius: same display size logic as rendering
  - Ball radius: `ballSizePx / 2`
- For each other item:
  - Vertical stops: `x - r`, `x`, `x + r`
  - Horizontal stops: `y - r`, `y`, `y + r`

## What part of dragged item can snap

The dragged item is also treated as a circle and exposes snapping edges:

- Vertical edges: `x - r`, `x`, `x + r`
- Horizontal edges: `y - r`, `y`, `y + r`

Offsets are tracked so snapping sets the item center correctly after edge alignment.

## Closest-guide selection

During drag move:

1. Compare each dragged edge/center to each guide stop.
2. Keep only candidates within `guidelineOffsetWorld`.
3. Choose closest vertical candidate and closest horizontal candidate independently.

This gives stable independent X/Y snapping.

## Guideline rendering

Guidelines are drawn in a dedicated overlay layer:

```jsx
<Layer listening={false} name="guidesLayer" ref={guidesLayerRef} />
```

They are:
- Dashed
- Non-interactive (`listening={false}`)
- Drawn imperatively for performance (no React state churn during drag)

## When snapping is active

Snapping runs only when all are true:
- Tool is `"select"`
- Marquee selection is not active
- Pan interaction is not active

It does not run while panning or marquee-selecting.

## Drag callbacks and behavior

Existing drag callbacks are preserved:
- `onItemDragStart`
- `onItemChange`
- `onItemDragEnd`

`onItemChange` receives the **snapped** position during drag when snapping is applied.

## Cleanup behavior

Guides are cleared on:
- Drag start
- Drag move when no snap candidates exist
- Drag end
- Escape/cancel interactions that end marquee/drag visual state

## Summary

Object snapping aligns players/ball to:
- Center lines
- Optional field bounds
- Other objects’ circle edges and centers

with zoom-consistent thresholds and live dashed guidelines.
