import { useState, useRef, useCallback } from "react";
import { log as logDrawDebug } from "../../../canvas/drawDebugLogger";
import { flipDrawing } from "../../../canvas/drawingGeometry";

/**
 * Manages a single drawing-scope state array (annotation or motion).
 *
 * Each instance is bound to one `kind` ("annotation" or "motion"). New IDs are
 * prefixed by kind so two instances can never collide on the same id.
 * Legacy `drawing-{n}` ids from imported plays are preserved as-is — the id
 * counter is bumped past the highest legacy id on apply.
 *
 * @param {object} args
 * @param {object} args.historyApiRef - ref to history API for pushHistory()
 * @param {"annotation"|"motion"} [args.kind] - drawing scope this instance owns
 */
export function useDrawings({ historyApiRef, kind = "annotation" }) {
  const [drawings, setDrawings] = useState([]);
  const nextIdRef = useRef(1);
  const idPrefix = kind === "motion" ? "mdraw" : "adraw";

  const summarizeDrawing = (drawing) => {
    if (!drawing) return "drawing=unknown";
    if (drawing.type === "stroke") {
      return `type=stroke points=${Math.floor((drawing.points?.length || 0) / 2)} color=${drawing.color || "n/a"} width=${drawing.strokeWidth || "n/a"}`;
    }
    if (drawing.type === "arrow") {
      return `type=arrow points=${Math.floor((drawing.points?.length || 0) / 2)} color=${drawing.color || "n/a"} width=${drawing.strokeWidth || "n/a"} head=${drawing.arrowHeadType || "standard"}`;
    }
    if (drawing.type === "text") {
      return `type=text chars=${drawing.text?.length || 0} x=${drawing.x ?? "n/a"} y=${drawing.y ?? "n/a"} fontSize=${drawing.fontSize || "n/a"} align=${drawing.align || "left"}`;
    }
    return `type=${drawing.type || "unknown"}`;
  };

  const generateId = () => {
    const id = `${idPrefix}-${nextIdRef.current}`;
    nextIdRef.current += 1;
    return id;
  };

  const addDrawing = useCallback((data) => {
    historyApiRef.current?.pushHistory?.();
    const id = generateId();
    // Stamp `kind` on every drawing so downstream consumers can discriminate
    // without re-running heuristics. Caller-provided kind wins so the schema
    // helpers can override (e.g., when applying a migrated snapshot).
    const drawing = { kind, id, ...data };
    setDrawings((prev) => [...prev, drawing]);
    logDrawDebug(`addDrawing kind=${kind} id=${id} ${summarizeDrawing(drawing)}`);
    return id;
  }, [historyApiRef, kind, idPrefix]);

  const removeDrawing = useCallback((id) => {
    historyApiRef.current?.pushHistory?.();
    setDrawings((prev) => {
      const removed = prev.find((d) => d.id === id);
      if (removed) {
        logDrawDebug(`removeDrawing id=${id} ${summarizeDrawing(removed)}`);
      } else {
        logDrawDebug(`removeDrawing id=${id} status=not-found`);
      }
      return prev.filter((d) => d.id !== id);
    });
  }, [historyApiRef]);

  const removeMultipleDrawings = useCallback((ids) => {
    if (!ids?.length) return;
    historyApiRef.current?.pushHistory?.();
    const idSet = new Set(ids);
    setDrawings((prev) => {
      const removed = prev.filter((d) => idSet.has(d.id));
      logDrawDebug(`removeMultipleDrawings requested=${ids.length} removed=${removed.length}`);
      return prev.filter((d) => !idSet.has(d.id));
    });
  }, [historyApiRef]);

  const updateDrawing = useCallback((id, changes) => {
    historyApiRef.current?.pushHistory?.();
    setDrawings((prev) => {
      const index = prev.findIndex((d) => d.id === id);
      if (index === -1) {
        logDrawDebug(`updateDrawing id=${id} status=not-found`);
        return prev;
      }
      const next = [...prev];
      const before = next[index];
      const after = { ...before, ...changes };
      next[index] = after;
      logDrawDebug(`updateDrawing id=${id} ${summarizeDrawing(before)} -> ${summarizeDrawing(after)}`);
      return next;
    });
  }, [historyApiRef]);

  /**
   * Update a single drawing without pushing history. Pair with explicit
   * `historyApiRef.current.beginGroup()` / `endGroup()` (or a single
   * `pushHistory()` at gesture start) when the caller manages history itself —
   * e.g. timeline step-block drag, which fires many updates per pointer-move.
   */
  const updateDrawingNoHistory = useCallback((id, changes) => {
    setDrawings((prev) => {
      const index = prev.findIndex((d) => d.id === id);
      if (index === -1) return prev;
      const next = [...prev];
      next[index] = { ...next[index], ...changes };
      return next;
    });
  }, []);

  /**
   * Update multiple drawings in a single setState call WITHOUT pushing history.
   * Used during drag/resize/rotate gestures where history was pushed at gesture start.
   * @param {Map<string, Object>|Object} idToChanges
   */
  const updateMultipleDrawingsNoHistory = useCallback((idToChanges) => {
    const entries = idToChanges instanceof Map
      ? Array.from(idToChanges.entries())
      : Object.entries(idToChanges);
    if (!entries.length) return;
    const changesMap = new Map(entries);
    setDrawings((prev) =>
      prev.map((d) => {
        const changes = changesMap.get(d.id);
        return changes ? { ...d, ...changes } : d;
      })
    );
  }, []);

  /**
   * Update multiple drawings with a single history push.
   * Used for final style changes applied to multiple selected drawings.
   */
  const updateMultipleDrawings = useCallback((idToChanges) => {
    const entries = idToChanges instanceof Map
      ? Array.from(idToChanges.entries())
      : Object.entries(idToChanges);
    if (!entries.length) return;
    historyApiRef.current?.pushHistory?.();
    const changesMap = new Map(entries);
    setDrawings((prev) =>
      prev.map((d) => {
        const changes = changesMap.get(d.id);
        return changes ? { ...d, ...changes } : d;
      })
    );
    logDrawDebug(`updateMultipleDrawings count=${entries.length}`);
  }, [historyApiRef]);

  /**
   * Toggles the `hidden` flag on a drawing, hiding or showing it on the canvas.
   * @param {string} id - Drawing ID
   */
  const toggleDrawingHidden = useCallback((id) => {
    setDrawings((prev) => {
      const index = prev.findIndex((d) => d.id === id);
      if (index === -1) return prev;
      const next = [...prev];
      next[index] = { ...next[index], hidden: !next[index].hidden };
      return next;
    });
  }, []);

  /**
   * Reflects every drawing across the given axis. Caller is responsible for
   * pushing history before invoking (the Reflect Play handler in Slate does
   * a single pushHistory for the whole reflect operation).
   * @param {"x"|"y"} axis - "x" flips vertically, "y" flips horizontally.
   */
  const flipAllDrawings = useCallback((axis) => {
    if (axis !== "x" && axis !== "y") return;
    setDrawings((prev) => prev.map((d) => flipDrawing(d, axis)));
    logDrawDebug(`flipAllDrawings axis=${axis}`);
  }, []);

  const clearDrawings = useCallback(() => {
    setDrawings([]);
    logDrawDebug("clearDrawings");
  }, []);

  const resetDrawings = useCallback(() => {
    setDrawings([]);
    nextIdRef.current = 1;
    logDrawDebug(`resetDrawings kind=${kind}`);
  }, [kind]);

  const snapshotDrawings = useCallback(() => {
    return drawings.map((d) => ({ ...d }));
  }, [drawings]);

  const applyDrawings = useCallback((snapshot) => {
    setDrawings(snapshot || []);
    // Scan every id format we might encounter — legacy `drawing-N`, the new
    // per-kind `adraw-N` / `mdraw-N` — and bump the counter past the highest.
    const maxId = (snapshot || []).reduce((max, d) => {
      const match = d.id?.match(/(?:drawing|adraw|mdraw)-(\d+)/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    nextIdRef.current = maxId + 1;
    logDrawDebug(`applyDrawings kind=${kind} count=${(snapshot || []).length} nextId=${nextIdRef.current}`);
  }, [kind]);

  return {
    kind,
    drawings,
    addDrawing,
    removeDrawing,
    removeMultipleDrawings,
    updateDrawing,
    updateDrawingNoHistory,
    updateMultipleDrawings,
    updateMultipleDrawingsNoHistory,
    toggleDrawingHidden,
    flipAllDrawings,
    clearDrawings,
    resetDrawings,
    snapshotDrawings,
    applyDrawings,
  };
}
