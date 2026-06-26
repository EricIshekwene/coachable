# Slate UX Standards

**Status:** Authoritative reference for all editor UX decisions.
**Scope:** Every behavioral decision documented here applies to both desktop and mobile unless a surface exception is noted. Motion and animation standards comply with `design/general-formatting-standards.md` §10.
**Cross-reference:** Mobile gesture model → `engineering/planning/features/mobile-slate-plan.md`. Mobile wiring → same doc.

---

## 01 — Editor modes: Drawing vs. Keyframe

The Slate editor operates in one of two mutually exclusive modes, chosen at play creation and fixed for the lifetime of the play.

| | Drawing mode | Keyframe mode |
|---|---|---|
| **Who sees it** | Football coaches only | All sports |
| **How animation works** | Paths drawn on players define movement | Manual player positioning + keyframes |
| **Primary tool** | Motion draw (stroke/arrow snapped to players) | Select + drag |
| **Annotation drawing** | Available (on top of motion drawings) | Available |
| **keyframe timeline** | Present but tracks are empty — motion paths drive playback | Primary animation mechanism |

**Mode is set once.** There is no in-editor control to switch between Drawing and Keyframe mode after play creation. The mode is saved in `play.meta.editorMode` and restored on every subsequent open.

For non-Football sports, the mode is always Keyframe. The Drawing/Keyframe choice is not shown.

---

## 02 — Tool state machine

### Top-level tools

The canvas is always in exactly one of these tool states:

| Tool | Trigger | Effect |
|---|---|---|
| `select` | Default; Escape from any tool | Click/drag to move players; marquee on empty canvas |
| `pen` | Draw tab (annotation scope) | Annotation drawing mode — overlays only |
| `animDraw` | Animation Drawing palette (drawing mode) | Motion drawing — paths snap to players |
| `hand` | Pan tool button | One-finger pan (desktop and mobile escape hatch) |
| `addPlayer` / `addBall` / `addCone` | Add tab | Tap-to-place mode |
| `prefab` | Prefabs tab | Tap-to-place a prefab formation |
| `color` | Color picker | Player color assignment |

### Mutual exclusion: draw mode and entity selection

Activating the pen tool (`select` → `pen`) **immediately clears all entity selections** — `selectedItemIds` and `selectedPlayerIds` are both set to `[]`. A player cannot remain selected while draw mode is active.

Returning from `pen` to `select` (via Escape or toggling the button) does not restore the prior selection. The coach must re-select.

### Pen tool is a toggle

Clicking the active pen tool deactivates it and returns to `select`. The same toggle applies to `animDraw`. All other tools are no-ops when clicked while already active.

### Escape key behavior (progressive retreat)

Escape is a progressive retreat — one press, one step back:

1. **In-progress shape being drawn** → cancels the shape; stays in draw mode
2. **Draw mode active, no in-progress stroke** → clears draw selection; stays in draw mode
3. **Select mode with selection active** → clears selection; stays in select mode
4. **Select mode with nothing selected** → no-op

Escape never jumps multiple levels in one press.

---

## 03 — Field orientation

### Sport default rotation

Each sport opens with a default field orientation baked into `SPORT_DEFAULTS`:

| Sport | Default rotation |
|---|---|
| Basketball | 90° (portrait) |
| Lacrosse | 90° (portrait) |
| Womens Lacrosse | 90° (portrait) |
| Football, Soccer, Rugby, Field Hockey, Ice Hockey, Blank | 0° (landscape) |

### Coach override

The coach can rotate and flip the field at any time using the rotate controls (rotate left / straighten / rotate right, flip X / flip Y). The override is saved with the play.

### Sport change resets orientation

Changing the field type via Advanced Settings resets the field rotation to that sport's default. The coach's prior manual rotation is not preserved across a sport change.

---

## 04 — Keyframe capture scope

When the coach presses **Add Keyframe**, every player and every ball on the canvas receives a keyframe at the current playhead time. There is no "only players that moved" logic. The button always snapshots every entity's current position.

**The first keyframe is permanently locked.** It cannot be moved or deleted. It anchors the starting formation. A play always has a defined start state.

---

## 05 — Undo / redo

The undo stack is **gesture-level**. One user gesture = one undo entry.

| Gesture | Undo entries |
|---|---|
| Drag a player from A to B | 1 — snapshot taken at drag start |
| Draw a full annotation stroke | 1 — committed at pointer up |
| Draw a full motion path step | 1 — committed at pointer up |
| Drag a timeline block (StepTrack) across 50 pointer-move events | 1 — history group wraps the gesture |
| Delete a player (including attached motion drawings) | 1 — history group wraps the cascade |
| Add keyframe | 1 |
| Add player / ball / cone | 1 |

Position updates during a drag do not push history. Only the drag start snapshot matters. Undoing always restores the state from before the gesture began.

---

## 06 — Animation playback and scrubbing

Full scrub is supported. The coach can:

- **Play / pause** at any time
- **Drag the playhead** to any point in the timeline while paused or playing
- **Click a keyframe diamond** to jump to that time

There is no play/stop-only restriction. Pause mid-animation, scrub back, and resume from any position.

On mobile, the scrubber is RAF-driven (60 fps, no per-frame React renders). On desktop, the timeline bar supports click-to-seek and drag-to-scrub.

---

## 07 — Selection model

### Single select (select tool active)

**Desktop:** Click an entity to select it and deselect everything else. Clicking with a modifier key (Ctrl or Cmd) **toggles** the clicked entity in/out of the current selection without clearing others.

**Mobile:** Every tap toggles the tapped entity in/out of selection. No modifier key needed. Tap a selected entity to deselect it; tap an unselected entity to add it to the selection.

### Marquee select

Drag on empty canvas to draw a marquee rectangle. All entities inside the rectangle at pointer-up replace the current selection (desktop). On mobile, marquee-select completes on finger lift; a near-zero marquee (finger that barely moved) is treated as a tap-to-deselect-all.

### The asymmetry is intentional

Desktop and mobile selection behaviors differ by design. Desktop users have a modifier key; mobile users do not, so toggle-on-tap is the mobile substitute. The two surfaces are not required to match.

### Context pill

When exactly one entity is selected, the context pill appears (below the tab bar on mobile, as a floating overlay on desktop). It shows the player number/name, quick color swatches, and a delete action. When 2+ entities are selected, the pill shows a "Save Group" action instead.

---

## 08 — Drawing system

The editor has two drawing scopes. They are structurally separate and can never coexist. Only one scope can be active at a time.

### Annotation drawings (all sports, all plays)

**What they are:** Pure visual overlays — text, shapes, arrows, and free strokes drawn on top of the canvas. They do not drive any player movement.

**How to enter:** Activate the Draw tab (desktop sidebar or mobile Draw tab). The `pen` tool arms and the annotation palette appears.

**Sub-tools:** Pen (free stroke), Arrow, Text, Shape, Eraser, Select.

**Visibility window:** Each annotation has a `visibleStartMs` / `visibleEndMs` range. New annotations default to the full play duration (always visible). The coach can drag the annotation's lane in the timeline to change when it appears and disappears. The minimum window is `MIN_DRAWING_WINDOW_MS`.

**Scope isolation:** The annotation eraser cannot delete motion drawings. Annotation drawings are immune to player deletion — deleting a player never removes annotation drawings.

### Motion drawings (Football / Drawing mode only)

**What they are:** Entity-attached paths that define how players and the ball move during playback. A motion drawing is a stroke or arrow with an `attachedEntityId`, `stepStartMs`, and `stepEndMs`. The animation engine reads these paths to derive player positions during playback — no manual keyframes are needed.

**How to enter:** Motion drawing mode is activated when the play's `editorMode` is `"drawing"` (set at creation for Football plays). The `AnimationDrawingTools` palette replaces the annotation palette.

**Sub-tools:** Stroke (free path), Arrow. Text and Shape are annotation-only and do not appear in motion scope.

**Snap behavior — start of stroke:** A motion drawing must start near a player or the tip of an existing path. If the pointer-down lands more than 50px (world coords) from any player center and more than 70px from any existing path tip, the stroke is rejected. The coach cannot draw a free-floating motion path.

**Snap target priority:** Path tips take priority over player centers. If the coach draws near the end of an existing route, the new stroke continues that route (forming a multi-step path). If the coach draws directly on a player's body, a fresh step starts from their center.

**One route per player per step:** Each player can have one motion drawing per step index. Drawing a new route on a player who already has a route for that step replaces the old one.

**Cascading delete:** Deleting a player in drawing mode also deletes all motion drawings attached to that player. This is intentional — orphaned paths with no entity would cause broken animations.

**Annotation drawings still available:** In drawing mode, the coach can activate the annotation pen tool to draw overlays on top of the motion paths. Entering the pen tool temporarily switches to annotation scope; the motion sub-tool is cleared while annotation is active.

### Scope cannot be changed after play creation

A Football play opened in Drawing mode stays in Drawing mode. A play opened in Keyframe mode stays in Keyframe mode. There is no in-editor switch.

---

## 09 — Autosave

The editor saves automatically. No explicit save action is required under normal use.

**User-facing contract:**
- Every change is saved without any action from the coach
- Navigating away (Back button, browser back, tab close, app backgrounded) always flushes pending changes before leaving — no edits are lost on exit
- There is no "Saving…" / "Saved" indicator — autosave is silent

Manual save actions (Export tab → "Save to Playbook", Export Image, Export Video) are separate from autosave and explicitly initiated by the coach.

---

## 10 — Mobile gesture model

The full touch model is documented in `engineering/planning/features/mobile-slate-plan.md` and `src/pages/MOBILE_EDITOR.md`. The summary:

| Gesture | Action |
|---|---|
| 1 finger on an entity | Drag it |
| 1 finger on empty canvas | Marquee-select |
| Near-zero marquee on release | Deselect all (tap equivalent) |
| 2 fingers anywhere | Pan + pinch-zoom simultaneously; cancels any in-progress 1-finger marquee |
| Pan tool active | 1 finger pans (escape hatch) |
| Draw tab active | Pen tool armed; finger strokes draw |

The `slate-ux-standards.md` treats this table as a summary. The mobile docs are authoritative.

---

## 11 — Performance limits

| Resource | Intended limit | Notes |
|---|---|---|
| Players | 40 | Not enforced in code; inferred from sport (22 for two-team sports, 10–12 for smaller sports). 40 is the design cap. |
| Annotation drawings | ~50 | No hard cap; degradation expected above this count. |
| Motion drawings | No cap | One per player per step; player count is the effective limit. |
| Keyframes | No cap | Timeline designed for plays under 30 seconds; very long animations with dense keyframes are untested. |
| Animation duration | 30 seconds (default max) | Enforced in `seekTimeline` via `durationMs` clamp. |

---

## Quick reference

| Decision | Rule |
|---|---|
| Editor mode | Set at creation; fixed. Football only shows Drawing/Keyframe choice. |
| Draw mode vs. selection | Mutually exclusive. Entering pen tool clears all entity selections. |
| Pen tool | Toggle — click again to return to select. |
| Escape | Progressive retreat — one press, one step back. |
| Field rotation default | Per sport (Basketball/Lacrosse = 90°; others = 0°). |
| Field rotation override | Coach can rotate any time; saved with play. |
| Sport change | Resets rotation to new sport's default. |
| Keyframe button | Snapshots ALL entities — not just selected, not just moved. |
| First keyframe | Permanently locked — cannot move or delete. |
| Undo granularity | One gesture = one undo entry. |
| Playback scrub | Full scrub — pause anywhere, drag to any time. |
| Select (desktop) | Click = replace. Modifier + click = toggle. |
| Select (mobile) | Every tap toggles. |
| Marquee | Replaces selection at pointer-up. |
| Annotation drawings | Visual overlays. Visible window is configurable. Immune to player delete. |
| Motion drawings | Snap to player or path tip required. Drive playback. Deleted with player. |
| Autosave | Silent. Flush guaranteed on navigate-away. |
| Player limit | 40 (design cap; not code-enforced). |
| Animation duration | 30 seconds max. |

---

## Cross-reference notes

**References:** `engineering/planning/features/mobile-slate-plan.md` (mobile gesture model and wiring), `design/general-formatting-standards.md` §10 (motion budget applies to all Slate transitions).

**Referenced by:** `v2/TODO.md` item 9.1.
