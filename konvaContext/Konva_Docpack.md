# Konva Documentation Pack

## Scene Graph

Konva rendering hierarchy:

Stage
→ Layer
→ Group
→ Shape nodes

React-Konva wraps Konva nodes as React components.

Docs:
https://konvajs.org/docs/react/index.html

---

## Performance Best Practices

### batchDraw()

Redraw multiple changes efficiently.

https://konvajs.org/docs/performance/Batch_Draw.html

Use during playback loops.

---

### Shape Caching

Cache complex visuals to improve performance.

https://konvajs.org/docs/performance/Shape_Caching.html

---

### Disable Listening

Disable event detection on static layers.

https://konvajs.org/api/Konva.Layer.html

---

## Drag System

Konva supports built-in dragging.

https://konvajs.org/docs/drag_and_drop/Drag_Events.html

Recommended pattern:
- Update React state on dragend
- Use dragmove for visual preview only

---

## Animation Strategies

### Konva.Animation
Frame-driven animation loop.

https://konvajs.org/docs/animations/Create_an_Animation.html

---

### node.to()
Tween animation for property transitions.

https://konvajs.org/docs/react/Simple_Animations.html

---

## Transformer Tool

Used for selection, resizing, and rotation.

https://konvajs.org/docs/react/Transformer.html
