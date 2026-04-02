import { useState, useRef, useCallback } from "react";
import { log as logDrawDebug } from "../../../canvas/drawDebugLogger";

/**
 * Manages the drawings state array (static annotations on the canvas).
 * Provides CRUD operations and snapshot/restore for history integration.
 *
 * Drawing shape: { id, type: "stroke"|"arrow"|"text", points, color, strokeWidth, text, fontSize, x, y }
 */
export function useDrawings({ historyApiRef }) {
  const [drawings, setDrawings] = useState([]);
  const nextIdRef = useRef(1);

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
    const id = `drawing-${nextIdRef.current}`;
    nextIdRef.current += 1;
    return id;
  };

  const addDrawing = useCallback((data) => {
    historyApiRef.current?.pushHistory?.();
    const id = generateId();
    const drawing = { id, ...data };
    setDrawings((prev) => [...prev, drawing]);
    logDrawDebug(`addDrawing id=${id} ${summarizeDrawing(drawing)}`);
    return id;
  }, [historyApiRef]);

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

  const clearDrawings = useCallback(() => {
    setDrawings([]);
    logDrawDebug("clearDrawings");
  }, []);

  const resetDrawings = useCallback(() => {
    setDrawings([]);
    nextIdRef.current = 1;
    logDrawDebug("resetDrawings");
  }, []);

  const snapshotDrawings = useCallback(() => {
    return drawings.map((d) => ({ ...d }));
  }, [drawings]);

  const applyDrawings = useCallback((snapshot) => {
    setDrawings(snapshot || []);
    const maxId = (snapshot || []).reduce((max, d) => {
      const match = d.id?.match(/drawing-(\d+)/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    nextIdRef.current = maxId + 1;
    logDrawDebug(`applyDrawings count=${(snapshot || []).length} nextId=${nextIdRef.current}`);
  }, []);

  return {
    drawings,
    addDrawing,
    removeDrawing,
    removeMultipleDrawings,
    updateDrawing,
    updateMultipleDrawings,
    updateMultipleDrawingsNoHistory,
    toggleDrawingHidden,
    clearDrawings,
    resetDrawings,
    snapshotDrawings,
    applyDrawings,
  };
}
