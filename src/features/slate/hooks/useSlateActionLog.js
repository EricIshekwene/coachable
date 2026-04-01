import { useCallback, useRef, useState } from "react";

const MAX_ACTION_LOG_ENTRIES = 100;

/**
 * Manages a capped, timestamped log of discrete slate actions for debug inspection.
 * Actions are accumulated in state so DebugPanel re-renders on every new entry.
 *
 * @returns {{ logAction: Function, actionLog: Array }}
 */
export function useSlateActionLog() {
  const [actionLog, setActionLog] = useState([]);
  const counterRef = useRef(0);

  /**
   * Appends a new action entry to the log. Oldest entries are dropped when the
   * cap is reached.
   *
   * @param {string} type - Action type identifier (e.g. "player_added")
   * @param {Object} [detail] - Optional extra fields to include in the entry
   */
  const logAction = useCallback((type, detail = {}) => {
    const id = counterRef.current++;
    const entry = { id, type, ts: Date.now(), ...detail };
    setActionLog((prev) => {
      const next = [entry, ...prev];
      return next.length > MAX_ACTION_LOG_ENTRIES ? next.slice(0, MAX_ACTION_LOG_ENTRIES) : next;
    });
  }, []);

  return { logAction, actionLog };
}
