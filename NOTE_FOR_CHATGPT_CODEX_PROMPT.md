# Note for ChatGPT: context to add to the Codex prompt

When you generate a prompt for Codex (or any coding agent) about fixing keyframes in this project, **include the following context** so the agent has enough to work from without re-diagnosing everything.

---

## Project and stack

- **Project:** Coachable – React (Vite) app with a timeline, keyframes, and a “slate” of players + ball on a canvas.
- **Relevant areas:** `src/App.jsx` (keyframe state, snapshots, `pushHistory`, `addKeyframeSignal`), `src/components/controlPill/ControlPill.jsx` (keyframe add/delete, 10-keyframe cap, 4% min distance).

---

## What’s wrong (short version)

1. **Only 10 keyframes allowed** – hard-coded in ControlPill; with many players we need more.
2. **4% minimum distance** – new keyframe is rejected if within 4% of any existing one; with many small edits/drags this triggers “too close” often.
3. **Keyframe add is tied to every slate-changing action** – `pushHistory()` in App both pushes undo and increments `addKeyframeSignal`, so every drag start / edit / delete tries to add a keyframe. With many players we do more of these actions and hit the cap / “too close” constantly.
4. **ControlPill doesn’t receive App’s playhead** – App doesn’t pass `externalTimePercent` to ControlPill, so when reacting to `addKeyframeSignal`, ControlPill uses its own `timePercent`; effect order can make this slightly inconsistent (minor).

---

## What we want

- **Add keyframes only when the user explicitly asks** (e.g. “Add Keyframe” button or a dedicated action), not on every `pushHistory`. Updating the snapshot at the current keyframe when the user edits/drags is fine (existing drag-end and `markKeyframeSnapshotPending` logic).
- **Allow more keyframes** – configurable or higher limit (e.g. 20–30) and clear UI feedback when at limit.
- **Relax or make configurable the 4% rule** – e.g. 2% or a setting, so adding keyframes doesn’t fail so often when the playhead is near an existing keyframe.
- **Optional:** Pass `externalTimePercent={timePercent}` from App to ControlPill so the playhead used for add-keyframe is the same as the one used for snapshots.

---

## Key files and symbols

- **App.jsx:** `pushHistory`, `setKeyframeSignal`, `keyframeSnapshots`, `markKeyframeSnapshotPending`, `findEditTargetKeyframe`, `snapshotSlateState`, `ControlPill` usage (no `externalTimePercent`).
- **ControlPill.jsx:** `addKeyframeAtTime` (10-keyframe check, MIN_DISTANCE 4), the `useEffect` that depends on `addKeyframeSignal` and calls `addKeyframeAtTime(timePercent)`.

---

## Full diagnosis (for reference)

A full technical diagnosis is in **KEYFRAME_DIAGNOSIS.md** in this repo. The agent can use it for implementation details, recommended next steps, and file references.

---

**TL;DR for the Codex prompt:**  
“Keyframe add is currently triggered on every slate change (e.g. drag start) and is limited to 10 keyframes with a 4% min distance, so with many players we hit the limit and ‘too close’ constantly. We want: add keyframes only on explicit user action; higher or configurable keyframe limit; relaxed or configurable min distance; optional playhead sync via externalTimePercent. See KEYFRAME_DIAGNOSIS.md and NOTE_FOR_CHATGPT_CODEX_PROMPT.md for details.”
