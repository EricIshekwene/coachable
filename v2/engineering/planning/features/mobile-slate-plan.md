# ✅ Done — Mobile Slate — Wiring Plan for End Users

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

## How to Wire Mobile Editing in the New Repo

In the v2 repo, there is no `MobileViewOnlyGate` to remove — just wire it correctly the first time. There are three things to do. None of them touch the Slate editor itself.

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

### Change 3 — Wire `onNavigateHome` and `flushRef` for mobile Back button

The mobile editor shows a Back button (top-left) that appears only when `onNavigateHome` is passed as a prop to Slate. When tapped, `MobileEditorBar` calls `onNavigateHome()` directly — **the flush is the page's responsibility**, not Slate's.

Slate exposes `flushToDatabase` via `externalFlushRef` (the `flushRef` prop). The page handler must `await` it before navigating — without `await`, navigation fires before the PATCH resolves and dirty edits are dropped. The admin editor (`AdminPlayEditPage.jsx`) does this correctly; make the user editor match it exactly:

```jsx
// PlayEdit.jsx (user-facing)
const navigate = useNavigate();
const flushRef = useRef(null);   // Slate populates this on mount via externalFlushRef

const handleBack = useCallback(async () => {
  await flushRef.current?.();    // flush completes before navigate — must be awaited
  navigate("/app/plays");
}, [navigate]);

// Pass both props:
<Slate
  ...
  flushRef={flushRef}
  onNavigateHome={handleBack}
/>
```

Without `onNavigateHome`, the mobile Back button does not appear and users have to use the browser back gesture — which still triggers the `beforeunload` / `visibilitychange` flush, so data is not lost, but the UX has no explicit back affordance.

### Change 4 — Call `installMobileViewportFixes` once from `PlayEdit.jsx`

The mobile Slate editor is full-screen. `installMobileViewportFixes` keeps `--app-viewport-height` updated as the browser chrome resizes (mobile Safari address bar), scrolls focused inputs into view when the on-screen keyboard appears, and prevents viewport shift when a sheet opens a text input.

```jsx
// PlayEdit.jsx — add this effect
useEffect(() => {
  const cleanup = installMobileViewportFixes();
  return cleanup;
}, []);
```

**Important:** `installMobileViewportFixes` is NOT idempotent — each call registers a new set of event listeners. If `App.jsx` already calls it globally, do not also call it from `PlayEdit.jsx`. Call it in exactly one place. In v1, `App.jsx` calls it globally; in v2, decide one canonical location and don't double-install.

### Change 5 — Enable play list buttons on mobile

`Plays.jsx` currently gates both the New Play button and the Edit button on `!isMobile`:

```jsx
// Before
const canCreatePlay = isCoach && !isMobile;
const canEditPlay = isCoach && !isMobile;

// After
const canCreatePlay = isCoach;
const canEditPlay = isCoach;
```

Both checks must be removed together. Removing `canEditPlay` but not `canCreatePlay` leaves coaches unable to create plays on mobile; removing `canCreatePlay` but not `canEditPlay` hides the New Play button even though the editor is ready.

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
  → page's handleBack() is called
    → await flushRef.current?.()      page awaits the flush — Slate's flushToDatabase
      → if isDirty: runs updatePlay immediately (no debounce)
      → waits for PATCH response
    → navigate("/app/plays")          only called after PATCH resolves
```

The `beforeunload` and `visibilitychange` listeners on the page also trigger flush for browser-managed navigation (tab close, app backgrounded on iOS). These fire-and-forget (not awaited) because the browser does not wait for async work on unload.

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
// PlayEdit.jsx — add this effect
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

Currently `Plays.jsx` disables both the New Play button and the Edit button on mobile (`canEditPlay = isCoach && !isMobile`, `canCreatePlay = isCoach && !isMobile`). Once the mobile editor is wired, both checks must be removed simultaneously (see Change 5).

---

## What the Mobile Editor Does NOT Have (Known Gaps)

These are documented in `MOBILE_EDITOR.md` and remain deferred. All four are gracefully absent — no broken UI, no crashes:

- **GIF export** — `MobileEditorBar` filters the GIF row when `onGifExport` is not passed as a function. Slate never passes `onGifExport` in the mobile path — the button simply does not appear.
- **Recording mode** — no `startRecording` trigger exists anywhere in `MobileEditorBar`. Recording cannot be initiated from mobile UI.
- **Fine-grained drawing styles** — `fontSize`, `arrowHead`, `eraserSize`, `strokeWidth` are not present in `MobileEditorBar` at all. Draw tab exposes color pickers only.
- **Canvas inset** — canvas is full-bleed under the floating chrome rather than inset between bars. Intentional layout choice, not a crash.

These gaps are acceptable for v1 of mobile editing. They should be tracked as follow-on tasks, not blockers.

---

## Testing Checklist Before Shipping Mobile Editing to Users

Tests are split into **automated** (Playwright, run at 390×844 viewport / iPhone 14 profile) and **manual** checkpoints. Every automated spec has a binary pass/fail. Manual items include the acceptance criterion in parentheses.

### Automated — Playwright (390×844, iPhone 14)

**Sport matrix** — one Playwright spec per sport. Each spec must: load the editor with a fixture play of the given sport, assert the field image is visible and bounding-box is not clipped by the viewport, place one player, and confirm a PATCH fires within 2 seconds. All 9 must pass:

```
[ ] Rugby           — field visible + unclipped; player placed; PATCH fires ≤2s
[ ] Soccer          — field visible + unclipped; player placed; PATCH fires ≤2s
[ ] Football        — field visible + unclipped; player placed; PATCH fires ≤2s
[ ] Lacrosse        — field visible + unclipped; player placed; PATCH fires ≤2s  (defaultFieldRotation=90)
[ ] Women's Lacrosse — field visible + unclipped; player placed; PATCH fires ≤2s (defaultFieldRotation=90)
[ ] Basketball      — field visible + unclipped; player placed; PATCH fires ≤2s  (defaultFieldRotation=90)
[ ] Field Hockey    — field visible + unclipped; player placed; PATCH fires ≤2s
[ ] Ice Hockey      — field visible + unclipped; player placed; PATCH fires ≤2s
[ ] Blank           — canvas renders; player placed; PATCH fires ≤2s
```

**Flush-on-back** — make a dirty edit, intercept network, tap Back. PASS = PATCH response is received before the page URL changes to `/app/plays`. FAIL = URL changes before PATCH resolves, or no PATCH fires at all.

```
[ ] Flush-on-back: PATCH resolves before navigation (Playwright network intercept)
```

**Play list activation** — on mobile viewport as coach role:

```
[ ] /app/plays shows "New Play" button (canCreatePlay gate removed)
[ ] /app/plays shows "Edit" button on play cards (canEditPlay gate removed)
```

### Manual

```
Setup:
[ ] Open /app/plays/:id/edit on a real iOS device (PASS = page loads; FAIL = blank screen or error)
[ ] Confirm mobileLayout=true is passed to Slate via React DevTools (PASS = prop is true; FAIL = prop is false or missing)
[ ] Confirm desktop sidebar and right panel are hidden (PASS = neither element is visible; FAIL = either renders on screen)
[ ] installMobileViewportFixes called exactly once — --app-viewport-height CSS var is set on <html> (PASS = var present with px value; FAIL = var missing or NaN)

Load:
[ ] Play data loads correctly — canvas shows players, ball, drawings, keyframes (PASS = all elements visible; FAIL = blank canvas or missing elements)
[ ] Sport field image renders at correct size (PASS = field fills canvas without overflow or visible gap; FAIL = field is cropped or undersized)

Edit:
[ ] One-finger drag moves a player (PASS = player follows finger; FAIL = player does not move)
[ ] Two-finger pinch/pan zooms and pans the canvas (PASS = canvas scales/pans; FAIL = no response)
[ ] One-finger on empty canvas opens marquee (PASS = selection rect appears; FAIL = nothing happens)
[ ] Tap empty canvas deselects (PASS = selection clears; FAIL = selection persists)
[ ] Add Player (Add tab) — tap to place works (PASS = player appears at tap point; FAIL = no player added)
[ ] Add Ball — tap to place works (PASS = ball appears at tap point; FAIL = no ball added)
[ ] Timeline scrub (drag) works without visible frame drops or freezing (PASS = smooth scrub; FAIL = jank or freeze)
[ ] Add keyframe button works (PASS = keyframe appears on timeline; FAIL = no new keyframe)
[ ] Delete keyframe works — select keyframe first (PASS = keyframe removed; FAIL = keyframe remains)
[ ] Play/pause works (PASS = animation plays and pauses; FAIL = no motion or stuck)
[ ] Draw tab — pen stroke works (PASS = stroke appears on canvas; FAIL = no stroke)
[ ] Draw tab — arrow tool works (PASS = arrow appears; FAIL = no arrow)
[ ] Color swatch picker works in Draw tab (PASS = stroke color changes; FAIL = color unchanged)
[ ] Player color picker works in Players tab (PASS = player color changes; FAIL = color unchanged)
[ ] Context pill appears on single item select (PASS = pill visible; FAIL = no pill)
[ ] Context pill shows correct player number/name (PASS = label matches player; FAIL = wrong label or empty)
[ ] Undo/Redo works (Tools tab) (PASS = state reverts/reapplies; FAIL = no change)
[ ] Field rotate works (Tools tab) (PASS = field rotates; FAIL = no rotation)

Save:
[ ] Autosave fires after edit — Network tab shows PATCH /teams/... (PASS = PATCH fires within 2s of edit; FAIL = no PATCH or fires after >5s)
[ ] Play name edit in Export tab saves on blur — PATCH fires with updated name (PASS = name persists after reload; FAIL = name reverts)
[ ] Save to Playbook works (PASS = success toast appears, play appears in playbook; FAIL = error or play missing)
[ ] Export Image (PNG) works (PASS = PNG downloads; FAIL = error or no download)
[ ] Export Video (MP4) works (PASS = MP4 downloads; FAIL = error or no download)

Navigation:
[ ] Back button appears top-left (PASS = button visible; FAIL = button absent)
[ ] Tapping Back flushes autosave before navigating — confirmed by Playwright spec above (PASS = automated spec passes; FAIL = spec fails)
[ ] Browser back (swipe left on iOS) also triggers flush (PASS = PATCH fires on swipe; FAIL = no PATCH or play reverts)
[ ] App backgrounded mid-edit — foregrounding shows saved state (PASS = play data matches last edit; FAIL = canvas reverts to pre-edit state)

Safe areas:
[ ] Top tab bar clears the notch on notched devices (PASS = no content behind notch; FAIL = tab bar overlaps notch)
[ ] Bottom timeline clears the home indicator (PASS = timeline above home indicator; FAIL = timeline hidden behind indicator)
[ ] No content hidden behind the notch or home indicator (PASS = all interactive elements reachable; FAIL = any tap target inaccessible)

Light mode:
[ ] Editor chrome renders correctly in light mode (PASS = all chrome elements visible; FAIL = invisible elements or broken layout)
[ ] Canvas background is correct in light mode (PASS = field and background render; FAIL = blank or wrong color)
[ ] No invisible text or borders (PASS = all text legible; FAIL = any text invisible against background)
```

---

## Summary — The Minimum Required to Ship

1. **Change `MobileViewOnlyGate`** to inject `mobileLayout={true}` instead of `viewOnly={true}` on mobile
2. **Remove the view-only banner** from `MobileViewOnlyGate`
3. **Pass `flushRef` and `onNavigateHome`** from `PlayEdit.jsx` to Slate — `handleBack` must `await flushRef.current?.()` before navigating (the flush is the page's responsibility, not Slate's)
4. **Call `installMobileViewportFixes`** from `PlayEdit.jsx` on mount — call it exactly once across `App.jsx` and `PlayEdit.jsx`, not both (the function is not idempotent)
5. **Remove `&& !isMobile`** from both `canEditPlay` and `canCreatePlay` in `Plays.jsx` — both must be removed together

That is five changes across three files. The Slate editor itself requires zero changes — `mobileLayout` is already fully implemented. The wiring is entirely in the shell around it.

---

## Cross-Reference Notes

**References:** `src/pages/MOBILE_EDITOR.md` in the v1 repo (technical feature spec — reference for mobile UX decisions). **Referenced by:** `v2/TODO.md` item 9.2.

**New repo note:** In the v2 repo, the mobile editor is wired correctly from the start — no retrofit needed. Use this doc as the specification for how to build it. File paths in the new repo:

- `PlayEdit.jsx` → `src/app/pages/PlayEdit.jsx`
- `Plays.jsx` → `src/app/pages/Plays.jsx`
- `Slate.jsx` → `src/slate/Slate.jsx`
- `AdminPlayEdit.jsx` → `src/admin/pages/AdminPlayEdit.jsx`
- `MobileViewOnlyGate` — do not include in the new repo. Wire `mobileLayout` detection directly in `PlayEdit.jsx`. The gate only existed to block mobile in v1.
