import { useState } from "react";

export function useSlateHistory({ snapshotSlate, applySlate, isRestoringRef, onMarkKeyframeSnapshotPending, logEvent }) {
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);

  const pushHistory = () => {
    if (isRestoringRef.current) return;
    onMarkKeyframeSnapshotPending?.();
    setHistoryPast((prev) => [...prev, snapshotSlate()]);
    setHistoryFuture([]);
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
    onUndo,
    onRedo,
    clearSlateHistory,
    historyPast,
    historyFuture,
  };
}

export default useSlateHistory;
