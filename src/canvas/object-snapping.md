# Object Snapping (Konva Canvas)

This document explains how dragging and snapping works in `KonvaCanvasRoot.jsx`.

## What snapping does

When you drag a draggable item (player or ball) in **Select** mode, the canvas:

1. Finds nearby alignment guides.
2. Shows dashed guideline lines.
3. Moves the dragged item so its **center** aligns to the nearest guide.
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

Because zoom changes screen scale, the snap threshold is converted from pixels to world units:

`guidelineOffsetWorld = GUIDELINE_OFFSET / worldOrigin.scale`

Where:
- `GUIDELINE_OFFSET = 5` (screen pixels)

This keeps snapping consistent across zoom levels.

## What it snaps to (guide stops)

Guide stops are built in world coordinates from:

1. World/stage center lines
- Vertical: `x = 0` and current screen-center world `x`
- Horizontal: `y = 0` and current screen-center world `y`

2. Field center lines (when field image is available)
- Vertical: `centerX`
- Horizontal: `centerY`

3. Other items (excluding the dragged item)
- Vertical stop: `item.x`
- Horizontal stop: `item.y`

Important:
- No item edge guides are used (`x - r`, `x + r`, `y - r`, `y + r` are not included).
- No field edge guides are used (`left/right/top/bottom` are not included).

## What part of dragged item can snap

The dragged item snaps by center only:

- Vertical snapping edge: `{ guide: node.x(), offset: 0, snap: "center" }`
- Horizontal snapping edge: `{ guide: node.y(), offset: 0, snap: "center" }`

No start/end edge snapping is used.

## Closest-guide selection

During drag move:

1. Compare dragged center guides to all guide stops.
2. Keep only candidates within `guidelineOffsetWorld`.
3. Choose closest vertical candidate and closest horizontal candidate independently.

This gives stable independent X/Y snapping.

## Guideline rendering

Guidelines are drawn in a dedicated overlay layer:

```jsx
<Layer listening={false} name="guidesLayer" ref={guidesLayerRef} />
```

They are:
- Orange stroke: `#FF7A18`
- Dashed (`dash: [4, 4]`)
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

Object snapping aligns players and ball centers to:
- World/stage center lines
- Optional field center lines
- Other object centers

with zoom-consistent thresholds and live dashed orange guidelines.
