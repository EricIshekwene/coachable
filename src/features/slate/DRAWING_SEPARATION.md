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

## What is intentionally deferred (still pending on this branch)

The original plan also called for these changes; they are scoped out of the initial commits and tracked as follow-up work. The architecture in this branch is the foundation they would build on — none of them require revisiting the data model.

1. **Right-panel scope routing.** `RightPanel.jsx` already receives `activeDrawingUi`, both selection sets, and both arrays. `DrawingStyleSection` and `DrawingObjectsList` still operate on a single combined list; they need to be split into annotation and motion variants (or made scope-aware) so the sections shown match the active scope and never display drawings from the other one.
2. **Timeline visibility tracks.** Annotation drawings have `visibleStartMs` / `visibleEndMs` in the data model, but the timeline does not yet render visibility tracks for them. The plan calls for `RangeTrackLane.jsx` (generic single-lane draggable range block) and `AnnotationVisibilityTrack.jsx` (annotation-specific wrapper). `StepTrack.jsx` should be refactored to consume motion-only data through `RangeTrackLane`. `ControlPill.jsx` already accepts the new props (`annotationDrawings`, `selectedAnnotationDrawingIds`, `onUpdateAnnotationDrawing*`, `activeDrawingUi`) and is wired from `Slate.jsx` — it just doesn't render the annotation lane yet.
3. **`SlateRecord.jsx` mirror.** Record mode still uses the unified `useDrawings` instance. It needs the same dual-state + scope-gate refactor as `Slate.jsx`. Until then, record mode is on the legacy single-array model.
4. **`SlateDrawing.jsx` mirror.** This is a thin wrapper today; once SlateRecord is updated, double-check this one still passes through correctly.
5. **`PlayPreviewCard.jsx`.** Preview currently reads `play.drawings`. It must be updated to read `play.annotationDrawings` + `play.motionDrawings`, animate poses from motion only, and filter annotation overlays through `isAnnotationDrawingVisibleAtTime(displayTimeMs, durationMs)`.

When you pick any of these up, follow the data-model and rules sections above — they are the long-term contract.

## Migration notes for existing data

- No DB migration is needed. The server stores plays as opaque JSON (no schema on `plays.data`). Legacy v2 rows continue to work and are migrated on read via `splitLegacyDrawingsArray`.
- New saves write v3. Once a play is saved on this branch, it is in v3 format. If you switch back to `main` without merging, that play will *not* load correctly on main — main's importer doesn't know about `annotationDrawings` / `motionDrawings`.
- Local autosave / undo history records the new shape too. Undo snapshots stamped before the refactor (combined `drawings`) are still accepted by `compositeApplySlate` so undo across the upgrade still works.
