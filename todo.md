Eric
    right panel breakdown
        player row dleete player
        edit player modal
        color pop up 
        select un select
    Sidebar breakdown

    Control pill
        slide keyframes?
        changeadd keyframe styling

    Tool pop up

Mouse and drag

colors


Dylan

## Task 1: Fix Zoom Center Point
**Problem**: Zoom functionality zooms toward the left side instead of the center of the viewport.

**Context**: 
- Zoom is implemented in `App.jsx` via `setZoomPercent()` which updates `camera.zoom`
- Camera transform is applied in `WorldLayer.jsx` using `transform: translate(${x}px, ${y}px) scale(${zoom})`
- Current zoom behavior shifts content left instead of zooming from viewport center

**Expected Behavior**: 
- When zooming in/out, the zoom should occur from the center of the visible viewport
- Content should scale around the center point, not shift horizontally

**Files to Review**:
- `src/canvas/WorldLayer.jsx` - Camera transform application
- `src/canvas/PanHandler.jsx` - Pan/zoom interaction handling
- `src/App.jsx` - Zoom state management (`setZoomPercent`, `zoomIn`, `zoomOut`)

**Technical Notes**:
- May need to adjust `transform-origin` or calculate offset based on viewport center
- Consider mouse/pointer position for zoom-to-point functionality
- Reference: `src/canvas/CanvasRoot.jsx` and related canvas files for current implementation

---

## Task 2: Implement Percentage-Based Positioning System
**Problem**: Players and ball spawn at absolute pixel positions and don't align with the field center. Need a coordinate system relative to the field image center.

**Current State**:
- Items (players/ball) use absolute pixel coordinates (`x`, `y`) in world space
- Items are rendered via `ItemVisual.jsx` (players and ball)
- Field image is rendered in `FieldLayer.jsx`
- Items don't automatically center on the field

**Required Solution**:
- Convert item positioning from absolute pixels to percentage-based coordinates
- Percentage should be relative to the field image center (0%, 0% = center of field)
- System should work with any field image size/type
- Maintain backward compatibility or provide migration path for existing items

**Implementation Considerations**:
- Define field image dimensions and center point
- Create conversion functions: `pixelsToPercent(x, y)` and `percentToPixels(percentX, percentY)`
- Update `DraggableItem.jsx` to work with percentage coordinates
- Update `ItemsLayer.jsx` to convert percentages to pixel positions for rendering
- Ensure items spawn at field center (0%, 0%) by default

**Files to Modify**:
- `src/canvas/ItemVisual.jsx` - Item rendering
- `src/canvas/DraggableItem.jsx` - Item positioning/dragging
- `src/canvas/ItemsLayer.jsx` - Item layer management
- `src/canvas/FieldLayer.jsx` - Field image reference for center calculation
- `src/App.jsx` - Item state structure (may need to change from `{x, y}` to `{percentX, percentY}`)

**Acceptance Criteria**:
- [ ] New players/ball spawn at field center (0%, 0%)
- [ ] Items can be positioned using percentage coordinates relative to field center
- [ ] System works with different field image sizes
- [ ] Dragging items updates percentage coordinates correctly
