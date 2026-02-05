# Acceptance Tests

## Rendering Tests

### Slate Load Test
All players and ball render at correct positions.

---

### Player Drag Test
Dragging must:
- Follow cursor smoothly
- Persist final position
- Maintain FPS > 50

---

## Timeline Tests

### Scrubbing Test
Scrubbing timeline must:
- Apply correct snapshot or interpolation
- Avoid visual flicker
- Avoid state mismatch

---

### Playback Test
Playback must:
- Advance timePercent continuously
- Interpolate player movement
- Stop at final keyframe

---

### Keyframe Add Test
Adding keyframe must:
- Save snapshot immutably
- Not overwrite imported snapshots
- Appear in timeline UI

---

### Import Test
Importing must:
- Restore all snapshots
- Preserve timeline determinism

---

## Performance Tests

### Stress Test
With 60 players:
- Dragging remains smooth
- Playback remains smooth
- CPU usage remains stable

---

## ControlPill Tests

ControlPill must remain synchronized with:

- timePercent
- keyframe list
- playback state
