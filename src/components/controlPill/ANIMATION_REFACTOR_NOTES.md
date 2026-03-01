# Timeline Refactor Notes

## What Changed
- `TimeBar.jsx` now renders timeline progress with direct DOM updates (`fill` + `thumb`) and does not use React state per frame.
- Scrubbing is pointer-driven and seek calls are rAF-throttled.
- `ControlPill.jsx` now includes a `Copy Debug` button for `[ANIMDBG]` ring-buffer logs.
- Dev overlay (`DebugOverlay.jsx`) shows live engine/UI timing and tick diagnostics.

## Assumptions Chosen
- Engine time is authoritative; UI time display is throttled to reduce rerenders.
- Scrubbing does not force pause; it seeks the engine directly so seeking while playing remains deterministic.
- Progress visuals follow engine time when not dragging, and follow drag time while dragging.

## Debug Workflow
- Use `Copy Debug` in the control pill to copy the latest log lines.
- Logs are tagged `[ANIMDBG]` with ISO timestamps.
