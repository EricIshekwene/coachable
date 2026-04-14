# Mobile Editor — Admin Sandbox

## Status: In Progress (paused)

Protected route: `/admin/mobile-view` (requires admin session from `/admin`)

---

## What Was Built

### Files Created / Modified

| File | Change |
|---|---|
| `src/pages/AdminMobileView.jsx` | New page — renders Slate with `mobileLayout` prop, no `MobileViewOnlyGate` |
| `src/components/MobileEditorBar.jsx` | New component — replaces all three desktop panels on mobile |
| `src/features/slate/Slate.jsx` | Added `mobileLayout` prop; suppresses `WideSidebar` + `RightPanel`; swaps `ControlPill` for `MobileEditorBar` |
| `src/App.jsx` | Route `/admin/mobile-view` wired up, guarded by `RequireAdminSession` |

### Layout

```
┌─────────────────────────────┐
│                             │
│         CANVAS              │
│   (flex-1, full width)      │
│                             │
├─────────────────────────────┤
│  ▶  0:05  ━━━●━━━━━━━  +KF │  ← MobileTimeline (scrubber)
├─────────────────────────────┤
│  [⚙Tools]  [👥Players]  [⋮More] │  ← Nav tab bar
└─────────────────────────────┘
```

Each tab opens a slide-up bottom sheet:
- **Tools** — tool picker (Select / Pan / Draw), Undo/Redo/Reset, Zoom, Add Player, Delete Selected
- **Players** — scrollable player list, tap to select, trash to delete
- **More** — Save to Playbook, Import Play, Advanced Settings

### Key Architecture Decisions

- `MobileEditorBar` is a **flex sibling** of the canvas div (not absolutely positioned over it), so the canvas fills the remaining height cleanly.
- `AdminMobileView` uses `flex-col` so canvas + bar stack vertically.
- When `mobileLayout=true`, `WideSidebar` and `RightPanel` are **not rendered at all** — no hidden DOM waste.
- The desktop editor is completely untouched — `mobileLayout` defaults to `false`.
- Touch interactions already work on the canvas layer (pinch-to-zoom, single-finger drag) — the main gap was always the UI chrome, not the canvas itself.

---

## What Still Needs Work

### High Priority
- [ ] **Pan vs drag disambiguation** — single finger currently both pans AND drags players. Need a mode toggle (e.g. long-press to drag, single-tap-drag to pan) or a dedicated pan mode button in the toolbar.
- [ ] **Player add UX** — "Add Player" drops a player at a default position off-screen on small viewports. Should drop at canvas center.
- [ ] **Keyframe add feedback** — no visual confirmation when a keyframe is added on mobile.

### Medium Priority
- [ ] **Draw tool on mobile** — drawing with a finger works at the canvas level but the draw sub-tool picker (arrow, erase, etc.) is buried inside the Tools sheet. Consider promoting it to a persistent floating pill when the Draw tool is active.
- [ ] **Selected player context** — when a player is tapped/selected, show a small floating action strip (colour picker, delete, number edit) near the player rather than requiring the user to open the Players sheet.
- [ ] **Timeline keyframe tap** — the keyframe ticks on the scrubber are very small for finger taps. Increase hit area or add a dedicated keyframe list in the Players/More sheet.
- [ ] **RecordingControlBar** — currently skipped (`!recording.recordingModeEnabled` guard). Wire up mobile-compatible recording controls if recording mode is ever tested on mobile.

### Low Priority / Polish
- [ ] Safe area insets — `env(safe-area-inset-bottom)` is applied to the nav bar but not tested on a real iPhone with home indicator.
- [ ] Sheet snap points — currently sheets go to a fixed 70dvh max. Could add a full-screen snap for the Players list.
- [ ] Haptic feedback — consider `navigator.vibrate()` on keyframe add / player select for tactile confirmation.
- [ ] View-only mode on mobile — `ViewOnlyControls` is still rendered inside the canvas div and is not mobile-optimised.

---

## How to Test

1. Go to `/admin` and log in with the admin password.
2. Navigate to `/admin/mobile-view`.
3. Use Chrome DevTools → Toggle device toolbar (or open on a real phone).
4. Test: drag players, pinch-to-zoom, tap Tools/Players/More tabs, scrub the timeline.
