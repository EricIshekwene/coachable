/**
 * Regression tests for undo/redo in drawing mode.
 *
 * Background — bugs this guards against:
 *   1. StepTrack drag of a coaching-draw block on the timeline fired
 *      `onUpdateDrawing` on every pointer-move, and `useDrawings.updateDrawing`
 *      pushed history each call. A single drag produced dozens of undo entries
 *      capturing intermediate states, so the user had to press Ctrl+Z many
 *      times to back out a single visual edit.
 *   2. `addDrawingTagged` in drawing mode runs multiple mutations per logical
 *      action ("remove existing coaching draws + (maybe) split parent + add
 *      new step"). Each inner mutation called `pushHistory` separately,
 *      producing several near-duplicate undo entries.
 *   3. Slate's drawing-mode `handleDeletePlayer` removed the attached coaching
 *      draw then deleted the player — two history pushes per logical delete.
 *
 * The fix introduces a history-group API on `useSlateHistory`:
 *   - `beginGroup()` snapshots state once and bumps a depth counter.
 *   - While depth > 0, `pushHistory()` is suppressed.
 *   - `endGroup()` decrements; `withGroup(fn)` is the safe wrapper.
 *
 * These tests exercise that grouping behaviour with a minimal stand-in for the
 * hook (re-using its logic verbatim where possible).
 */
import { describe, it, expect, beforeEach } from "vitest";

// ── Inline pure-function copy of useSlateHistory's logic ─────────────────────
//
// We can't easily render React hooks in this Node test runner. Instead we
// replicate the small state machine — same shape, same rules — so the
// behaviour under test mirrors the hook one-to-one.

function createHistory({ snapshotSlate, applySlate, isRestoringRef }) {
  let past = [];
  let future = [];
  let groupDepth = 0;

  const pushHistory = () => {
    if (isRestoringRef.current) return;
    if (groupDepth > 0) return;
    past = [...past, snapshotSlate()];
    future = [];
  };

  const beginGroup = () => {
    if (groupDepth === 0 && !isRestoringRef.current) {
      past = [...past, snapshotSlate()];
      future = [];
    }
    groupDepth += 1;
  };

  const endGroup = () => {
    groupDepth = Math.max(0, groupDepth - 1);
  };

  const withGroup = (fn) => {
    beginGroup();
    try {
      return fn();
    } finally {
      endGroup();
    }
  };

  const onUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    past = past.slice(0, -1);
    future = [...future, snapshotSlate()];
    applySlate(previous);
  };

  const onRedo = () => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    future = future.slice(0, -1);
    past = [...past, snapshotSlate()];
    applySlate(next);
  };

  return {
    pushHistory,
    beginGroup,
    endGroup,
    withGroup,
    onUndo,
    onRedo,
    get pastLength() { return past.length; },
    get futureLength() { return future.length; },
  };
}

// ── Test harness: drawings array + history wrapper ───────────────────────────

function setupHarness() {
  let drawings = [];
  const isRestoringRef = { current: false };

  const history = createHistory({
    snapshotSlate: () => ({ drawings: drawings.map((d) => ({ ...d })) }),
    applySlate: (snap) => {
      drawings = (snap.drawings || []).map((d) => ({ ...d }));
    },
    isRestoringRef,
  });

  // Mirrors useDrawings.updateDrawing — pushes history then mutates.
  const updateDrawing = (id, patch) => {
    history.pushHistory();
    const idx = drawings.findIndex((d) => d.id === id);
    if (idx === -1) return;
    drawings[idx] = { ...drawings[idx], ...patch };
  };

  // Mirrors useDrawings.updateDrawingNoHistory.
  const updateDrawingNoHistory = (id, patch) => {
    const idx = drawings.findIndex((d) => d.id === id);
    if (idx === -1) return;
    drawings[idx] = { ...drawings[idx], ...patch };
  };

  const addDrawing = (d) => {
    history.pushHistory();
    drawings = [...drawings, { ...d }];
  };

  const removeDrawing = (id) => {
    history.pushHistory();
    drawings = drawings.filter((d) => d.id !== id);
  };

  const removeMultipleDrawings = (ids) => {
    if (!ids?.length) return;
    history.pushHistory();
    const idSet = new Set(ids);
    drawings = drawings.filter((d) => !idSet.has(d.id));
  };

  return {
    history,
    getDrawings: () => drawings,
    seedDrawings: (initial) => { drawings = initial.map((d) => ({ ...d })); },
    addDrawing,
    removeDrawing,
    removeMultipleDrawings,
    updateDrawing,
    updateDrawingNoHistory,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Drawing-mode history grouping — pushHistory suppression", () => {
  let h;
  beforeEach(() => { h = setupHarness(); });

  it("collapses nested pushHistory calls into one entry while inside a group", () => {
    h.seedDrawings([{ id: "d1", stepStartMs: 0, stepEndMs: 5000 }]);
    h.history.beginGroup();
    h.updateDrawing("d1", { stepStartMs: 100 });
    h.updateDrawing("d1", { stepStartMs: 200 });
    h.updateDrawing("d1", { stepStartMs: 300 });
    h.history.endGroup();
    expect(h.history.pastLength).toBe(1);
  });

  it("withGroup snapshots once even with many nested mutations", () => {
    h.seedDrawings([{ id: "d1", x: 0 }]);
    h.history.withGroup(() => {
      for (let i = 0; i < 20; i++) {
        h.updateDrawing("d1", { x: i });
      }
    });
    expect(h.history.pastLength).toBe(1);
  });

  it("ungrouped pushes still create one entry each", () => {
    h.seedDrawings([{ id: "d1", x: 0 }]);
    h.updateDrawing("d1", { x: 1 });
    h.updateDrawing("d1", { x: 2 });
    h.updateDrawing("d1", { x: 3 });
    expect(h.history.pastLength).toBe(3);
  });

  it("undo after a group restores pre-group state in one step", () => {
    h.seedDrawings([{ id: "d1", stepStartMs: 0, stepEndMs: 5000 }]);
    h.history.withGroup(() => {
      h.updateDrawing("d1", { stepStartMs: 1000 });
      h.updateDrawing("d1", { stepStartMs: 2000 });
      h.updateDrawing("d1", { stepStartMs: 3000 });
    });
    expect(h.getDrawings()[0].stepStartMs).toBe(3000);
    h.history.onUndo();
    expect(h.getDrawings()[0].stepStartMs).toBe(0);
  });

  it("redo replays the whole group", () => {
    h.seedDrawings([{ id: "d1", stepStartMs: 0 }]);
    h.history.withGroup(() => {
      h.updateDrawing("d1", { stepStartMs: 1000 });
      h.updateDrawing("d1", { stepStartMs: 2000 });
    });
    h.history.onUndo();
    expect(h.getDrawings()[0].stepStartMs).toBe(0);
    h.history.onRedo();
    expect(h.getDrawings()[0].stepStartMs).toBe(2000);
  });

  it("nested begin/end groups behave as a single outer group", () => {
    h.seedDrawings([{ id: "d1", x: 0 }]);
    h.history.beginGroup();
    h.history.beginGroup();
    h.updateDrawing("d1", { x: 1 });
    h.updateDrawing("d1", { x: 2 });
    h.history.endGroup();
    h.updateDrawing("d1", { x: 3 });
    h.history.endGroup();
    expect(h.history.pastLength).toBe(1);
    h.history.onUndo();
    expect(h.getDrawings()[0].x).toBe(0);
  });

  it("withGroup still closes the group when fn throws", () => {
    h.seedDrawings([{ id: "d1", x: 0 }]);
    expect(() =>
      h.history.withGroup(() => {
        h.updateDrawing("d1", { x: 5 });
        throw new Error("boom");
      })
    ).toThrow("boom");
    // After the throw, depth must be back to 0 — a subsequent push must NOT
    // be suppressed (otherwise crashes would freeze the undo stack).
    h.updateDrawing("d1", { x: 6 });
    expect(h.history.pastLength).toBe(2);
  });

  it("isRestoringRef suppresses beginGroup snapshot too", () => {
    h.seedDrawings([{ id: "d1", x: 0 }]);
    h.history.isRestoringRef = { current: true };
    // re-create with restoring flag
    const h2 = setupHarness();
    h2.seedDrawings([{ id: "d1", x: 0 }]);
    // Simulate a restore by calling beginGroup with isRestoringRef true.
    // Reach into the inner createHistory by remaking it:
    const restoring = { current: true };
    const localHist = createHistory({
      snapshotSlate: () => ({ drawings: [] }),
      applySlate: () => {},
      isRestoringRef: restoring,
    });
    localHist.beginGroup();
    localHist.endGroup();
    expect(localHist.pastLength).toBe(0);
  });
});

describe("Drawing-mode history grouping — StepTrack drag scenario", () => {
  let h;
  beforeEach(() => { h = setupHarness(); });

  it("simulated step-block drag (50 pointer-moves) produces ONE undo entry", () => {
    h.seedDrawings([{ id: "d1", stepStartMs: 0, stepEndMs: 5000 }]);
    // Drag handler opens group on first move, fires updateDrawingNoHistory
    // on each move, closes group on pointer up.
    h.history.beginGroup();
    for (let i = 1; i <= 50; i++) {
      h.updateDrawingNoHistory("d1", { stepStartMs: i * 10 });
    }
    h.history.endGroup();
    expect(h.history.pastLength).toBe(1);
    expect(h.getDrawings()[0].stepStartMs).toBe(500);
    h.history.onUndo();
    expect(h.getDrawings()[0].stepStartMs).toBe(0);
  });

  it("two sequential drags produce two independent undo entries", () => {
    h.seedDrawings([{ id: "d1", stepStartMs: 0, stepEndMs: 5000 }]);

    // Drag 1
    h.history.beginGroup();
    h.updateDrawingNoHistory("d1", { stepStartMs: 500 });
    h.updateDrawingNoHistory("d1", { stepStartMs: 1000 });
    h.history.endGroup();

    // Drag 2
    h.history.beginGroup();
    h.updateDrawingNoHistory("d1", { stepStartMs: 1500 });
    h.updateDrawingNoHistory("d1", { stepStartMs: 2000 });
    h.history.endGroup();

    expect(h.history.pastLength).toBe(2);
    h.history.onUndo();
    expect(h.getDrawings()[0].stepStartMs).toBe(1000);
    h.history.onUndo();
    expect(h.getDrawings()[0].stepStartMs).toBe(0);
  });
});

describe("Drawing-mode history grouping — addDrawingTagged scenario", () => {
  let h;
  beforeEach(() => { h = setupHarness(); });

  it("replace existing coaching-draw + add new one collapses to one undo entry", () => {
    h.seedDrawings([
      { id: "old-1", source: "coaching-draw", attachedPlayerId: "p1", points: [0, 0, 100, 100] },
    ]);
    // Mirror addDrawingTagged: wrap remove+add in a group.
    h.history.withGroup(() => {
      h.removeDrawing("old-1");
      h.addDrawing({
        id: "new-1",
        source: "coaching-draw",
        attachedPlayerId: "p1",
        points: [0, 0, 200, 200],
      });
    });
    expect(h.history.pastLength).toBe(1);
    expect(h.getDrawings()).toHaveLength(1);
    expect(h.getDrawings()[0].id).toBe("new-1");

    // Single undo restores the original drawing.
    h.history.onUndo();
    expect(h.getDrawings()).toHaveLength(1);
    expect(h.getDrawings()[0].id).toBe("old-1");
  });

  it("continuation that splits the parent collapses to one undo entry", () => {
    h.seedDrawings([
      { id: "p1-s0", source: "coaching-draw", attachedPlayerId: "p1", stepStartMs: 0, stepEndMs: 30000, stepIndex: 0 },
    ]);
    // Mirrors addDrawingTagged continuation: update parent stepEndMs + add new step.
    h.history.withGroup(() => {
      h.updateDrawing("p1-s0", { stepEndMs: 15000 });
      h.addDrawing({
        id: "p1-s1",
        source: "coaching-draw",
        attachedPlayerId: "p1",
        stepStartMs: 15000,
        stepEndMs: 30000,
        stepIndex: 1,
      });
    });
    expect(h.history.pastLength).toBe(1);
    expect(h.getDrawings()).toHaveLength(2);

    h.history.onUndo();
    expect(h.getDrawings()).toHaveLength(1);
    expect(h.getDrawings()[0].stepEndMs).toBe(30000);
  });

  it("multi-existing replace uses removeMultipleDrawings + addDrawing as one entry", () => {
    h.seedDrawings([
      { id: "old-1", source: "coaching-draw", attachedPlayerId: "p1", stepIndex: 0 },
      { id: "old-2", source: "coaching-draw", attachedPlayerId: "p1", stepIndex: 1 },
      { id: "old-3", source: "coaching-draw", attachedPlayerId: "p1", stepIndex: 2 },
    ]);
    h.history.withGroup(() => {
      h.removeMultipleDrawings(["old-1", "old-2", "old-3"]);
      h.addDrawing({ id: "new-1", source: "coaching-draw", attachedPlayerId: "p1", stepIndex: 0 });
    });
    expect(h.history.pastLength).toBe(1);
    expect(h.getDrawings()).toHaveLength(1);

    h.history.onUndo();
    expect(h.getDrawings()).toHaveLength(3);
  });
});

describe("Drawing-mode history grouping — handleDeletePlayer scenario", () => {
  let h;
  beforeEach(() => { h = setupHarness(); });

  it("drawing-mode player delete (remove drawing + delete player) is one undo", () => {
    h.seedDrawings([
      { id: "d1", source: "coaching-draw", attachedPlayerId: "p1" },
    ]);
    // Simulate entities.handleDeletePlayer with an internal pushHistory call,
    // wrapped by Slate.handleDeletePlayer in a group together with removeDrawing.
    h.history.withGroup(() => {
      h.removeDrawing("d1");
      // entities.handleDeletePlayer also pushes — suppressed by group.
      h.history.pushHistory();
    });
    expect(h.history.pastLength).toBe(1);
  });
});
