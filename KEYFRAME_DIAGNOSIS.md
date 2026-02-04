# Keyframe system diagnosis

## Summary

Keyframe add failures and “struggling with many players” are caused by: **(1) hard cap of 10 keyframes**, **(2) 4% minimum distance between keyframes** making adds feel random when near existing keyframes, **(3) automatic keyframe-add on every slate-changing action** (e.g. drag start, undo, edit, delete), and **(4) no `externalTimePercent`** so ControlPill can use a stale playhead when reacting to `addKeyframeSignal`. With many players you do more edits/drags, so you hit the cap and “too close” more often.

---

## 1. Hard limit of 10 keyframes

**Where:** `src/components/controlPill/ControlPill.jsx` (around lines 227–236)

- `addKeyframeAtTime` returns early if `keyframes.length >= 10` and calls `onKeyframeAddAttempt` with `reason: "max"`.
- With many players you often want more keyframes to capture different formations; the fixed cap of 10 is likely too low and is a direct cause of “can’t add keyframe”.

**Fix options:** Make the limit configurable (e.g. prop or setting), or remove/increase it (e.g. 20–30) with UI feedback when at limit.

---

## 2. 4% minimum distance between keyframes

**Where:** `src/components/controlPill/ControlPill.jsx` (around lines 239–266)

- `MIN_DISTANCE = 4` (percent). A new keyframe is rejected if any existing keyframe is within 4% (`Math.abs(kf - timePercentValue) < 4`). User gets `onKeyframeAddAttempt` with `reason: "too-close"`.
- On a 0–100 timeline this makes it easy to hit “too close” when:
  - Playhead is near an existing keyframe (e.g. after seeking).
  - User does small successive edits; each can trigger an add at nearly the same time%.
- With many players, more drags/edits mean more add attempts at similar times, so “too close” shows up more often.

**Fix options:** Reduce `MIN_DISTANCE` (e.g. 2%), or make it configurable; or snap new keyframes to the nearest “slot” instead of rejecting.

---

## 3. Keyframe add is triggered on every slate-changing action

**Where:**  
- `src/App.jsx`: `pushHistory()` (lines 220–224) both pushes undo history and increments `keyframeSignal`: `setKeyframeSignal((prev) => prev + 1)` and `markKeyframeSnapshotPending()`.
- ControlPill: `addKeyframeSignal` effect (lines 396–402) runs when `addKeyframeSignal` changes and calls `addKeyframeAtTime(timePercent)`.

So **every** call to `pushHistory()` tries to add a keyframe at the current time. `pushHistory()` is used for:

- `handleItemDragStart` (drag start)
- `handleSaveEditPlayer`
- `handleDeletePlayer`
- `handleDeleteSelected`
- (and undo-related flow)

So: one drag start → one keyframe add attempt. Many players → many small drags → many add attempts → you quickly hit the 10-keyframe cap and/or “too close”.

**Fix options:**  
- Do **not** tie keyframe add to `pushHistory`. Only add a keyframe when the user explicitly clicks “Add Keyframe” (or equivalent). Use a separate mechanism for “update snapshot at current keyframe” (e.g. only `markKeyframeSnapshotPending()` on drag end / edit, without incrementing `keyframeSignal`).  
- Or: keep current behavior but make it “update snapshot at current time if there is already a keyframe there, else add new keyframe only if under cap and not too close,” and ensure the UI explains the 10-keyframe and 4% rules.

---

## 4. ControlPill timePercent vs App timePercent (addKeyframeSignal effect)

**Where:**  
- `src/App.jsx`: ControlPill is used **without** `externalTimePercent={timePercent}` (only `onTimePercentChange`, `addKeyframeSignal`, etc.).  
- `src/components/controlPill/ControlPill.jsx`: The effect that runs on `addKeyframeSignal` uses local `timePercent` and calls `addKeyframeAtTime(timePercent)`.

ControlPill owns its own `timePercent` and syncs *out* to App via `onTimePercentChange`. It does not receive App’s `timePercent` as `externalTimePercent`. So when App fires `addKeyframeSignal` (e.g. from `pushHistory`), the effect in ControlPill runs with whatever **ControlPill’s** `timePercent` is. In practice they’re usually the same because the user moves the playhead in ControlPill, but effect order is not guaranteed, so in theory you could add a keyframe at a slightly stale time. Less critical than (1)–(3), but worth fixing for consistency.

**Fix options:** Pass `externalTimePercent={timePercent}` from App to ControlPill so the playhead is driven by App when reacting to `addKeyframeSignal`, or ensure the add-keyframe path uses a ref updated from App’s `timePercent` so the value used for `addKeyframeAtTime` is always the same as the one used for snapshot/editing.

---

## 5. Snapshot work with many players (performance / correctness)

**Where:** `src/App.jsx`

- `snapshotSlateState()` (673–679) deep-copies `playersById`, `representedPlayerIds`, and `ball`. With many players this is a large object per keyframe.
- The effect that flushes `pendingKeyframeSnapshotsRef` (792–804) depends on `[playersById, representedPlayerIds, ball, keyframes]`. So it runs on every change to any of those. For each pending keyframe it does `next[kf] = snapshotSlateState()`. With many players this can be heavy and cause jank during drags/edits.
- When a **new** keyframe is added, the “keyframes changed” effect (764–786) adds it to `pendingKeyframeSnapshotsRef`; the flush effect then runs (because `keyframes` changed) and fills snapshots. So the new keyframe does get a snapshot. No evidence that “many players” breaks correctness of snapshots; the main issue is add being rejected by cap/distance and by how often add is triggered.

**Fix options:** If you see slowness with many players: throttle or batch snapshot updates, or avoid re-running the flush effect on every `playersById` change (e.g. run only when `keyframes` or a dedicated “snapshot version” changes), and/or use a more compact snapshot format for interpolation.

---

## Recommended next steps

1. **Decouple keyframe add from `pushHistory`**  
   Only add a keyframe when the user explicitly asks (e.g. “Add Keyframe” button or slate action that is clearly “add keyframe”). Use `markKeyframeSnapshotPending()` (and existing drag-end snapshot update) to update the snapshot at the current keyframe when the user edits/drags, without sending `addKeyframeSignal`.

2. **Raise or remove the 10-keyframe cap**  
   Make it configurable or increase it (e.g. 20–30), and show a clear message when at limit.

3. **Relax or make configurable the 4% minimum distance**  
   e.g. 2% or a prop, and/or snap to a grid to avoid “too close” rejections.

4. **Optionally pass `externalTimePercent`**  
   So that when App triggers `addKeyframeSignal`, ControlPill (or the add logic) uses the same playhead value App uses for snapshots and editing.

5. **Optional: performance**  
   If the UI is slow with many players, optimize snapshot flushing (dependencies and batching) as above.

---

## Files to change (reference)

| Area | File |
|------|------|
| Keyframe cap & min distance | `src/components/controlPill/ControlPill.jsx` |
| When keyframe add is triggered | `src/App.jsx` (`pushHistory`, `setKeyframeSignal`) |
| ControlPill time sync | `src/App.jsx` (ControlPill props), `ControlPill.jsx` (effect deps / use of timePercent) |
| Snapshot flush effect | `src/App.jsx` (effect with `[playersById, representedPlayerIds, ball, keyframes]`) |
