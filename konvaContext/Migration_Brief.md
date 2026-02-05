# Coachable → React-Konva Migration Brief

## Overview

Coachable is an interactive sports play design application that allows users to:

- Place players and ball on a field
- Animate player movement using keyframes
- Scrub and playback timeline animations
- Import/export slate animation data

The current rendering engine uses DOM elements and CSS transforms, which causes performance issues when many players exist and leads to timeline synchronization problems.

The goal of this migration is to replace rendering with react-konva while preserving Coachable’s existing data model and timeline architecture.

---

## Current Rendering Architecture

Rendering uses nested React DOM components:

CanvasRoot  
→ BoardViewport  
→ WorldLayer  
→ ItemsLayer  
→ DraggableItem  
→ ItemVisual  

### BoardViewport
Provides viewport clipping and container layout.

### WorldLayer
Applies camera transforms using CSS:
- translate
- scale

### ItemsLayer
Renders each player and ball as individual DOM elements.

Problems:
- DOM element count scales linearly with player count
- CSS transforms create layout recalculations
- React rerenders trigger heavy redraw cost

---

## Timeline Architecture

Timeline state exists inside App.jsx.

### Core Timeline State

- timePercent (0-100 float)
- keyframes (sorted array of timePercent values)
- keyframeSnapshots (Map<timePercent, Snapshot>)
- isPlaying boolean
- requestAnimationFrame loop drives playback

---

### Playback Flow

1. rAF updates timePercent
2. buildInterpolatedSlate(timePercent)
3. applySlate(interpolatedState)
4. React rerenders ItemsLayer

Problems:
- React rerender cost during playback
- Imported snapshots can be overwritten
- Renderer and timeline state sometimes desync

---

## Slate Data Model

### Player Structure
{
id: string,
x: number,
y: number,
rotation: number,
team: offense | defense,
metadata?: object
}

---

### Snapshot Structure

Represents entire slate state at a keyframe.

Contains:
- Player positions
- Ball position
- RepresentedPlayerIds
- Additional animation metadata

Snapshots must be immutable.

---

## Known Bugs

### Snapshot Overwrite Bug
Imported snapshots sometimes replaced by newly generated snapshots.

### Playback Glitch Bug
Playhead moves but rendered slate does not update smoothly.

### Keyframe Distance Bug
Minimum distance logic occasionally prevents correct insertion.

---

## Migration Goals

### Rendering
Replace DOM renderer with:

Stage → Layer → Group → Shape nodes

While preserving:
- Drag callbacks
- Selection callbacks
- Camera pan + zoom
- Data model compatibility

---

### Timeline
Ensure:
- Smooth playback animation
- Deterministic scrubbing
- Immutable snapshot import
- ControlPill remains time authority

---

## Konva Architecture Strategy

### State Ownership
React holds canonical state.

Konva provides high-performance drawing.

---

### Playback Optimization Strategy
During playback:

- Use Konva node refs
- Update node position directly
- Use layer.batchDraw()
- Avoid full React rerenders

---

## Performance Targets

- Support 60+ players
- Maintain >50 FPS playback
- Maintain smooth drag interactions

---

## Migration Phases

Phase 1 — Renderer replacement  
Phase 2 — Drag system migration  
Phase 3 — Playback optimization  
Phase 4 — ControlPill synchronization  
Phase 5 — Timeline bug stabilization
