import { useRef, useState } from "react";

/**
 * Manages undo/redo history for slate entity snapshots.
 *
 * History grouping: multi-mutation user actions (e.g. "delete player + delete
 * attached drawing", "drag step block on the timeline", "replace coaching-draw
 * sequence") should appear as ONE undo entry. Wrap them with
 * `beginGroup()` / `endGroup()` (or `withGroup(fn)`): the first call
 * snapshots state once, subsequent `pushHistory` calls are suppressed until
 * the matching `endGroup`.
 *
 * @param {Object} params
 * @param {Function} params.snapshotSlate - Returns a snapshot of current slate state.
 * @param {Function} params.applySlate - Restores slate state from a snapshot.
 * @param {React.MutableRefObject} params.isRestoringRef - Ref flag to suppress history push during restore.
 * @param {Function} params.logEvent - Scoped logging callback.
 * @returns {Object} pushHistory, beginGroup/endGroup/withGroup, onUndo, onRedo, clearSlateHistory, and stack state.
 */
export function useSlateHistory({ snapshotSlate, applySlate, isRestoringRef, logEvent }) {
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);
  const groupDepthRef = useRef(0);

  const pushHistory = () => {
    if (isRestoringRef.current) return;
    if (groupDepthRef.current > 0) return;
    setHistoryPast((prev) => [...prev, snapshotSlate()]);
    setHistoryFuture([]);
  };

  /**
   * Open a history group. The first call snapshots current state; nested calls
   * just bump the depth counter. Until the matching `endGroup`, individual
   * `pushHistory` calls do nothing.
   */
  const beginGroup = () => {
    if (groupDepthRef.current === 0 && !isRestoringRef.current) {
      setHistoryPast((prev) => [...prev, snapshotSlate()]);
      setHistoryFuture([]);
    }
    groupDepthRef.current += 1;
  };

  /** Close a history group opened with `beginGroup`. */
  const endGroup = () => {
    groupDepthRef.current = Math.max(0, groupDepthRef.current - 1);
  };

  /**
   * Run `fn` inside a history group. Any throws still close the group so a
   * crashed handler does not leave subsequent edits permanently un-undoable.
   */
  const withGroup = (fn) => {
    beginGroup();
    try {
      return fn();
    } finally {
      endGroup();
    }
  };

  const onUndo = () => {
    logEvent?.("slate", "undo");
    setHistoryPast((prev) => {
      if (prev.length === 0) return prev;
      const nextPast = prev.slice(0, -1);
      const previous = prev[prev.length - 1];
      setHistoryFuture((future) => [...future, snapshotSlate()]);
      applySlate(previous);
      return nextPast;
    });
  };

  const onRedo = () => {
    logEvent?.("slate", "redo");
    setHistoryFuture((prev) => {
      if (prev.length === 0) return prev;
      const nextFuture = prev.slice(0, -1);
      const next = prev[prev.length - 1];
      setHistoryPast((past) => [...past, snapshotSlate()]);
      applySlate(next);
      return nextFuture;
    });
  };

  const clearSlateHistory = () => {
    setHistoryPast([]);
    setHistoryFuture([]);
  };

  return {
    pushHistory,
    beginGroup,
    endGroup,
    withGroup,
    onUndo,
    onRedo,
    clearSlateHistory,
    historyPast,
    historyFuture,
  };
}

export default useSlateHistory;
