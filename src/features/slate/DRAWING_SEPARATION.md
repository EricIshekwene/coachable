# Drawing Scope Separation

Status: experimental, on branch `drawing-scope-separation`.

This document covers the annotation/motion drawing refactor: what shipped, what is intentionally deferred, and the rules new code must follow when touching anything in the drawing system.

## Why

The drawing system used to be one unified `drawings` array shared by two completely different concepts:

- **Annotation drawings** — pure visual overlays (text, shapes, arrows, free strokes) that a coach adds for explanation. They don't drive motion.
- **Motion drawings** — entity-attached paths that *are* the animation input. They drive how players and balls move during playback.

Sharing one array and one set of tool state caused a chain of subtle bugs: an annotation could accidentally pick up `attachedPlayerId`, a motion drawing could leak into the annotation palette, the eraser could cross scopes, both palettes could be visible at once, and player deletion could remove the wrong things.

The fix is structural separation: two runtime arrays, two selection sets, two subtool/style state bundles, two persisted arrays, and one explicit gate so only one scope can be active at a time.

## What shipped on this branch

### Foundation (`features/slate/utils/` + `canvas/`)
- `drawingTiming.js` — annotation visibility-window math (`MIN_DRAWING_WINDOW_MS`, `getAnnotationVisibilityWindow`, `normalizeAnnotationVisibilityWindow`, `isAnnotationDrawingVisibleAtTime`, `isAnnotationDrawing`, `isMotionDrawing`).
- `drawingSchema.js` — canonical shape helpers (`getDrawingKind`, `normalizeAnnotationDrawing`, `normalizeMotionDrawing`, `splitLegacyDrawingsArray`, `buildSeparatedDrawingsPayload`).
- `canvas/drawingScopeConfig.js` — capability matrix (`ANNOTATION_DRAW_SCOPE`, `MOTION_DRAW_SCOPE`, helper `scopeAllows*` predicates).

### State split in `Slate.jsx`
- Two `useDrawings` instances: `annotationDrawingsState` and `motionDrawingsState`. Each owns its own ids (`adraw-N` and `mdraw-N`), history snapshots, and CRUD operations.
- Separate selection state: `selectedAnnotationDrawingIds` / `selectedMotionDrawingIds`.
- Separate subtool state: `annotationDrawSubTool` / `motionDrawSubTool`.
- Separate style state: every `draw*` field has annotation and motion variants.
- Derived `activeDrawingUi`: `"motion"` when `drawingMode` is true, `"annotation"` when `canvasTool === "pen"` outside drawing mode, otherwise `"none"`.
- Back-compat shims (`drawingsState`, `drawSubTool`, `drawColor`, etc.) point at the active scope so legacy call sites keep working until they're migrated explicitly.

### Mode gating
**`drawingMode` is the sole gate.** In drawing mode, only motion is allowed and the pen tool is hidden. Outside drawing mode, only annotation is allowed and motion subtools are hidden. The two scopes can never coexist.

### Behavioral rules now enforced
- `handleDeletePlayer` cascades only into motion drawings; annotations are immune to entity deletion.
- `addDrawingTagged` routes to the correct scope and defensively scrubs cross-scope fields on the way in.
- Pose sampling (`renderPoseAtTime`) reads only from motion drawings — annotations can never influence entity positions.
- `useCanvasDrawing` filters eraser hit-testing by scope: an annotation eraser cannot delete a motion drawing and vice versa.
- Motion snap-source lookup (`findSnapPlayer`) filters by `kind === "motion"` (with legacy `source === "coaching-draw"` and `attachedPlayerId` fallbacks).

### Palette mutual exclusion
- `FloatingToolPillShell` provides a shared outer container (height, padding, border, shadow, top offset, z-index, centering) for both palettes.
- `DrawToolsPill` (annotation) renders only when `!drawingMode && canvasTool === "pen"`.
- `AnimationDrawingTools` (motion) renders only when `drawingMode`.
- The two render conditions cannot overlap → only one palette is visible at a time, structurally.

### Persistence (v3)
- `EXPORT_SCHEMA_VERSION = "play-export-v3"`.
- Exports write `play.annotationDrawings` and `play.motionDrawings`; `play.drawings` is gone.
- Imports accept v3 (separated) or v2 (combined). v2 plays are migrated by `splitLegacyDrawingsArray` on read; `attachedPlayerId` is upgraded to `attachedEntityId` + `attachedEntityType`.
- Annotations without `visibleStartMs` / `visibleEndMs` default to full duration.

### Tests
- `admin/test/drawingScopeSeparation.test.js` — 21 cases covering kind detection, normalization, legacy splitting, and the scope capability matrix.
- `admin/test/annotationDrawingVisibility.test.js` — 13 cases covering window defaults, clamping, minimum-window enforcement, visibility checks, and discriminators.
- `admin/test/drawingExportV3Migration.test.js` — 8 cases covering v3 round-trip, v2 migration, cross-scope scrubbing, and unknown-schema rejection.
- Full suite: 498 passing, 4 pre-existing failures unrelated to this work (playPreviewPlayer, syncSports).

## Data model

### Annotation drawing
```ts
{
  kind: "annotation",
  id: string,           // "adraw-N" for new, legacy "drawing-N" preserved on import
  type: "stroke" | "arrow" | "text" | "shape",
  // type-specific geometry/style fields (points, color, strokeWidth, text, ...)
  visibleStartMs?: number,
  visibleEndMs?: number,
  hidden?: boolean,
}
```
- Never carries `attachedEntityId`, `attachedPlayerId`, `attachedEntityType`, `stepStartMs`, `stepEndMs`, `stepIndex`, `source`, or any continuation field.
- Affects rendering only.
- New annotations default to `visibleStartMs: 0`, `visibleEndMs: durationMs`.

### Motion drawing
```ts
{
  kind: "motion",
  id: string,           // "mdraw-N" for new, legacy "drawing-N" preserved on import
  type: "stroke" | "arrow",
  // geometry/style fields (points, color, strokeWidth, ...)
  attachedEntityId: string,
  attachedEntityType: "player" | "ball",
  stepStartMs: number,
  stepEndMs: number,
  stepIndex: number,
  continuedFromMotionDrawingId?: string,
  hidden?: boolean,
}
```
- Never carries `visibleStartMs` / `visibleEndMs`.
- Only this shape can influence playback.
- Only this shape can snap to entities or continue from prior path tips.

### Persisted payload
```ts
play: {
  ...,
  annotationDrawings: AnnotationDrawing[],
  motionDrawings: MotionDrawing[],
  // play.drawings is intentionally absent in v3
}
```

## Rules new code must follow

- Never write a `drawings` array on the play object — write `annotationDrawings` and `motionDrawings` instead.
- Never check `source === "coaching-draw"` for new code; use `kind === "motion"` or call `isMotionDrawing(d)`.
- Never reach across scopes: an annotation handler must never touch the motion bucket and vice versa. The `drawingMode` gate makes this easy — branch on it and route to the right state.
- When importing or migrating legacy data, route it through `splitLegacyDrawingsArray` so attachment fields, ids, and timing defaults are resolved consistently.
- When building palettes or right-panel sections, gate rendering on `activeDrawingUi` (or equivalently `!drawingMode` vs `drawingMode`) so only the relevant scope's UI appears.

## Additional changes that landed after the initial commits

The items below were originally deferred and have since shipped on this same branch.

### Right-panel scope routing
`RightPanel.jsx` reads `activeDrawingUi` and gates both `DrawingStyleSection` and `DrawingObjectsList` on it.

- `DrawingObjectsList` accepts `drawingScope`. Annotation list is labeled **Annotations**; motion list is labeled **Motion Steps**. Motion entries are detected via `kind === "motion"` with the legacy source/entity fallback so v2 plays still display correctly.
- `DrawingStyleSection` accepts `drawingScope`. Under motion scope, the text and shape style editors are suppressed even if `drawSubTool` somehow ends up holding `"text"` or `"shape"` — the editors can never appear out of scope.
- When neither scope is active, both sections are hidden. The legacy "click a drawing in the list to silently activate pen mode" path was removed — users enter a drawing scope explicitly via the sidebar Draw button (annotation) or by activating a motion tool in `/admin/drawing` (motion).

### Timeline visibility tracks
- New `controlPill/AnnotationVisibilityTrack.jsx` renders one lane per selected annotation drawing, sized by `visibleStartMs` / `visibleEndMs`. Drag the body to move the window, drag the edges to resize. Minimum window is enforced by `MIN_DRAWING_WINDOW_MS`. The whole drag emits no-history updates wrapped in one `onBeginHistoryGroup` / `onEndHistoryGroup` pair so the gesture collapses into a single undo entry.
- Visually distinct from motion `StepTrack` lanes: cool cyan with a dashed border vs warm orange with a solid border.
- `ControlPill.jsx` renders annotation lanes whenever `activeDrawingUi === "annotation"` AND there is at least one selected annotation, regardless of `drawingMode`. Annotations are not bound to drawing mode.
- `StepTrack.jsx` updated to consume v3 (`kind === "motion"`) entries in addition to legacy v2 entries, with `attachedEntityId` / `attachedPlayerId` fallback.

### `SlateRecord.jsx` mirror
Record mode is always annotation-scope (it has no `drawingMode` toggle), but it instantiates both buckets so imported v3/v2 plays with motion drawings still round-trip cleanly through save/reload.

- Two `useDrawings` instances (annotation + motion); the back-compat `drawingsState` shim points at the annotation bucket.
- Snapshot/apply write the v3 shape; v2 combined `drawings` snapshots are migrated through `splitLegacyDrawingsArray`.
- `onReset` clears both buckets.
- Play export writes `annotationDrawings` + `motionDrawings`. Play import accepts v3, v2, or no drawings.
- `KonvaCanvasRoot` receives the combined `drawings` view for rendering plus typed `annotationDrawings` / `motionDrawings` props for scope-aware downstream behavior.

### `PlayPreviewCard.jsx`
- Reads `play.annotationDrawings` + `play.motionDrawings` (v3); falls back to splitting legacy `play.drawings` (v2) so older saved plays still render.
- `drawingPathPoses` and `drawingPathBallRotation` read motion drawings only; annotations can never drive entity poses or ball rotation.
- Camera bounds still consider every drawing (`allDrawings`) so a temporary annotation appearing/disappearing does not snap the camera.
- Annotation drawings in the SVG render are filtered through `isAnnotationDrawingVisibleAtTime(displayTimeMs, durationMs)`. Motion drawings always render.

### `SlateDrawing.jsx`
Thin wrapper around `Slate` with `drawingMode={true}`. No further changes were needed — the Slate-level refactor covers it entirely.

## Migration notes for existing data

- No DB migration is needed. The server stores plays as opaque JSON (no schema on `plays.data`). Legacy v2 rows continue to work and are migrated on read via `splitLegacyDrawingsArray`.
- New saves write v3. Once a play is saved on this branch, it is in v3 format. If you switch back to `main` without merging, that play will *not* load correctly on main — main's importer doesn't know about `annotationDrawings` / `motionDrawings`.
- Local autosave / undo history records the new shape too. Undo snapshots stamped before the refactor (combined `drawings`) are still accepted by `compositeApplySlate` so undo across the upgrade still works.
