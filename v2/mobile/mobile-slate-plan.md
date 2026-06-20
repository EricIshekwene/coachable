# Mobile Slate — Wiring Plan for End Users

**Status:** The mobile Slate editor is feature-complete and live behind the admin flag at `/admin/mobile-view` and `/admin/plays/:id/edit`. It is intentionally NOT wired for regular users yet — the user-facing editor path (`/app/plays/:id/edit`) goes through `MobileViewOnlyGate` which forces view-only on mobile. This document describes exactly what needs to happen to wire the full mobile editing experience for regular coach users.

Reference: `src/pages/MOBILE_EDITOR.md` — full feature spec, touch model, and layout description. That document stays as the technical feature spec. This document is the wiring and API call plan.

---

## Current Architecture — How It Works Today

### The User Path (Current — View Only on Mobile)

```
/app/plays/:id/edit
  → PlayEdit.jsx (or PlayEditPage.jsx)
    → MobileViewOnlyGate (wraps Slate)
      → detects isMobile === true
      → clones Slate child with viewOnly={true}
      → shows "View-only mode" dismissible banner
```

On mobile, the coach can see their play but cannot edit it. The editor UI renders but all interaction is disabled.

### The Admin Path (Current — Full Mobile Editor)

```
/admin/plays/:id/edit
  → AdminPlayEditPage.jsx
    → <Slate mobileLayout={isMobile} adminMode={true} />
      (no MobileViewOnlyGate wrapping)
```

The admin editor detects `isMobile` via a `useEffect` + `matchMedia` hook and passes `mobileLayout={true}` to Slate. When `mobileLayout` is true, Slate swaps the desktop chrome for `MobileEditorBar`, hides the desktop sidebar and right panel, and enables the touch gesture model.

The underlying play data, autosave, and export logic are identical between mobile and desktop. `mobileLayout` is a UI-only prop — it does not change what gets saved.

---

## What Needs to Change to Wire It for Users

There are three things to change. None of them touch the Slate editor itself.

### Change 1 — Remove `MobileViewOnlyGate` from the user editor path

`MobileViewOnlyGate` is the only thing blocking mobile editing for users. It wraps `<Slate>` and forces `viewOnly={true}` on small screens. To enable mobile editing, either:

**Option A — Remove the gate entirely** (if all supported sports/features work on mobile)
```jsx
// Before (PlayEdit.jsx or PlayEditPage.jsx)
<MobileViewOnlyGate>
  <Slate ... />
</MobileViewOnlyGate>

// After
<Slate ... />
```

**Option B — Pass mobileLayout instead of viewOnly** (recommended — keeps the gate as the detection point but changes what it does)
```jsx
// MobileViewOnlyGate.jsx — change behavior from "force viewOnly" to "pass mobileLayout"
const enhancedChild = isMobile
  ? { ...child, props: { ...child.props, mobileLayout: true } }  // was viewOnly: true
  : child;

// Also remove the "View-only mode" banner entirely (no longer needed)
```

Option B is cleaner because `MobileViewOnlyGate` continues to serve as the breakpoint detection point and the prop injection point. If mobile editing needs to be turned off for a specific sport or feature in the future, the gate is still there to add that logic.

### Change 2 — Ensure `mobileLayout` prop reaches Slate in the user editor

Look at how `PlayEditPage.jsx` currently renders Slate and confirm `mobileLayout` is not hardcoded to false or missing:

```jsx
// The mobileLayout prop must be passed through from MobileViewOnlyGate
// or detected internally in the page component

// Minimal version — let the gate inject it:
<MobileViewOnlyGate>
  <Slate
    playId={playId}
    teamId={teamId}
    onSave={handleSave}
    onNavigateHome={handleBack}
    // mobileLayout will be injected by MobileViewOnlyGate
  />
</MobileViewOnlyGate>
```

If `Slate` does not accept `mobileLayout` in the user-facing version, confirm the prop is wired in `Slate.jsx`'s prop list. It is already wired in the admin version — the user version should be identical.

### Change 3 — Wire `onNavigateHome` for mobile Back button

The mobile editor shows a Back button (top-left) that appears only when `onNavigateHome` is passed as a prop to Slate. When tapped, it calls `onNavigateHome` which should flush unsaved changes before navigating.

The admin editor already has this. The user editor page needs to pass the same handler:

```jsx
// PlayEditPage.jsx (user-facing)
const navigate = useNavigate();

const handleBack = useCallback(() => {
  // Slate internally calls flushAutosave before calling onNavigateHome
  // No need to do anything here except navigate
  navigate("/app/plays");
}, [navigate]);

// Then pass it:
<Slate
  ...
  onNavigateHome={handleBack}
/>
```

Without `onNavigateHome`, the mobile Back button does not appear and users have to use the browser back gesture — which still triggers the `beforeunload` / `visibilitychange` flush, so data is not lost, but the UX has no explicit back affordance.

---

## Full API Call Chain — Load, Edit, Save

### Load (page mount)

```
PlayEditPage mounts
  → fetchPlay(teamId, playId)         GET /teams/:teamId/plays/:playId
      → returns { play: { id, name, sport, play_data, ... } }
  → pass play_data to Slate via playData prop
  → Slate deserializes play_data via animation/serialize.js
  → canvas hydrates with players, ball, keyframes, drawings
```

The play is fetched once on mount. Slate then owns the state internally. No further fetch until the user explicitly loads a different play.

### Autosave (during editing)

```
User makes a change (move player, add keyframe, draw, etc.)
  → Slate marks isDirty = true
  → debounce timer fires (500ms after last change)
    → buildPlayExport()               serializes current canvas + animation state
    → updatePlay(teamId, playId, { playData: exportedData, name })
                                      PATCH /teams/:teamId/plays/:playId
    → marks isDirty = false
```

This is the same autosave path regardless of mobile or desktop. `mobileLayout` does not change it.

### Manual Save (Export tab → Save to Playbook)

```
User taps "Save to Playbook" in the Export tab
  → opens SaveToPlaybookModal
  → user selects playbook section
  → saveToPlaybook(teamId, playId, sectionId)
                                      POST /teams/:teamId/plays/:playId/save-to-playbook
                                      (or equivalent route — confirm actual route name)
  → shows success toast
  → modal closes
```

### Flush on Navigate Away

```
User taps Back button (mobile) or browser back
  → Slate.flushAutosave() is called (synchronously or awaited)
    → if isDirty: runs updatePlay immediately (no debounce)
    → waits for response
  → onNavigateHome() is called
  → navigate("/app/plays")
```

The `beforeunload` and `visibilitychange` listeners also trigger flush for browser-managed navigation (tab close, app backgrounded on iOS).

### Play Name Update

```
User edits play name in Export tab (mobile) or title bar (desktop)
  → controlled input updates local name state
  → on blur or Enter: updatePlay(teamId, playId, { name })
                                      PATCH /teams/:teamId/plays/:playId
```

Name is a separate field from `play_data` in the PATCH body. Both can be sent together or separately.

---

## Safe Area Wiring

The mobile Slate editor is full-screen — it fills `100dvh` and does not use the `AppLayout` shell. This means:

1. **The bottom nav is not present** in the editor — the editor is a full-screen overlay
2. **Top safe area**: the top tab bar uses `padding-top: env(safe-area-inset-top)` to clear the iOS notch
3. **Bottom safe area**: the timeline bar uses `padding-bottom: env(safe-area-inset-bottom)` to clear the home indicator

The `installMobileViewportFixes` utility (used in the admin mobile view) must also be called from the user-facing editor page. It:
- Keeps `--app-viewport-height` CSS var updated as the browser chrome resizes (mobile Safari address bar shrinks on scroll)
- Scrolls focused inputs into view when the on-screen keyboard appears
- Prevents the viewport from shifting when a sheet opens a text input

```jsx
// PlayEditPage.jsx — add this effect
useEffect(() => {
  const cleanup = installMobileViewportFixes();
  return cleanup;
}, []);
```

---

## Routing — How the User Gets to the Mobile Editor

### Current route structure
```
/app/plays              → Plays.jsx (list)
/app/plays/:id          → PlayView.jsx (view only — shared with desktop player view)
/app/plays/:id/edit     → PlayEditPage.jsx (edit — currently view-only on mobile via gate)
```

After wiring, `/app/plays/:id/edit` becomes the mobile editor for coaches. No new route needed.

### How the user gets there from the play list

Currently `Plays.jsx` disables the edit button on mobile (`canEditPlay = isCoach && !isMobile`). Once the mobile editor is wired, this check should be removed:

```jsx
// Before
const canEditPlay = isCoach && !isMobile;

// After
const canEditPlay = isCoach;
```

Play creation on mobile (`canCreatePlay`) may also need to be enabled. The creation flow opens `PlayNew.jsx` which likely navigates to the editor after creating the play — this should work without changes if the editor is wired.

---

## What the Mobile Editor Does NOT Have (Known Gaps)

These are documented in `MOBILE_EDITOR.md` and remain deferred:

- **GIF export** — not exposed on mobile (Video + Image export are available)
- **Recording mode** — skipped on mobile, still in progress on desktop
- **Fine-grained drawing styles** — font size, arrow-head type, shape type, eraser size — desktop defaults only
- **Canvas inset** — canvas is full-bleed under the floating chrome rather than inset between bars

These gaps are acceptable for v1 of mobile editing. They should be tracked as follow-on tasks, not blockers.

---

## Testing Checklist Before Shipping Mobile Editing to Users

```
Setup:
[ ] Open /app/plays/:id/edit on a real iOS device (or Chrome DevTools iPhone viewport)
[ ] Confirm mobileLayout=true is passed to Slate (check React DevTools)
[ ] Confirm the desktop sidebar and right panel are hidden

Load:
[ ] Play data loads correctly — canvas shows players, ball, drawings, keyframes
[ ] Sport field image renders at correct size

Edit:
[ ] One-finger drag moves a player
[ ] Two-finger pinch/pan zooms and pans the canvas
[ ] One-finger on empty canvas opens marquee
[ ] Tap empty canvas deselects
[ ] Add Player (Add tab) — tap to place works
[ ] Add Ball — tap to place works
[ ] Timeline scrub (drag) works at 60fps without jank
[ ] Add keyframe button works
[ ] Delete keyframe works (select keyframe first)
[ ] Play/pause works
[ ] Draw tab — pen stroke works
[ ] Draw tab — arrow tool works
[ ] Color swatch picker works in Draw tab
[ ] Player color picker works in Players tab
[ ] Context pill appears on single item select
[ ] Context pill shows correct player number/name
[ ] Undo/Redo works (Tools tab)
[ ] Field rotate works (Tools tab)

Save:
[ ] Autosave fires after edit (check Network tab — PATCH /teams/...)
[ ] Play name edit in Export tab saves on blur
[ ] Save to Playbook works
[ ] Export Image (PNG) works
[ ] Export Video (MP4) works

Navigation:
[ ] Back button appears top-left
[ ] Tapping Back flushes autosave before navigating (check Network — PATCH fires before navigate)
[ ] Browser back (swipe left on iOS) also flushes
[ ] App backgrounded mid-edit — foregrounding shows saved state

Safe areas:
[ ] Top tab bar clears the notch on notched devices
[ ] Bottom timeline clears the home indicator
[ ] No content hidden behind the notch or home indicator

Light mode:
[ ] Editor chrome renders correctly in light mode
[ ] Canvas background is correct in light mode
[ ] No invisible text or borders
```

---

## Summary — The Minimum Required to Ship

1. **Change `MobileViewOnlyGate`** to inject `mobileLayout={true}` instead of `viewOnly={true}` on mobile
2. **Remove the view-only banner** from `MobileViewOnlyGate`
3. **Pass `onNavigateHome`** from `PlayEditPage.jsx` to Slate for the mobile Back button
4. **Call `installMobileViewportFixes`** from `PlayEditPage.jsx` on mount
5. **Remove `&& !isMobile`** from `canEditPlay` in `Plays.jsx`

That is five changes across three files. The Slate editor itself requires zero changes — `mobileLayout` is already fully implemented. The wiring is entirely in the shell around it.
