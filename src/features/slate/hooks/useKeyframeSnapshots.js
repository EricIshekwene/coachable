import { useCallback, useEffect, useRef, useState } from "react";

export function useKeyframeSnapshots({
  defaultKeyframeTolerance,
  snapshotSlateState,
  playersById,
  representedPlayerIds,
  ball,
  timePercent,
}) {
  const [keyframes, setKeyframes] = useState([]);
  const [selectedKeyframe, setSelectedKeyframe] = useState(null);
  const [keyframeTolerance, setKeyframeTolerance] = useState(defaultKeyframeTolerance);
  const [keyframeSignal, setKeyframeSignal] = useState(0);
  const [timelineResetSignal, setTimelineResetSignal] = useState(0);
  const [keyframeSnapshots, setKeyframeSnapshots] = useState(() => ({}));

  const pendingKeyframeUpdateRef = useRef(false);
  const pendingKeyframeTimeRef = useRef(null);
  const prevKeyframesRef = useRef([]);
  const latestKeyframesRef = useRef([]);
  const latestKeyframeSnapshotsRef = useRef({});
  const pendingKeyframeSnapshotsRef = useRef(new Set());

  const findNearestKeyframeAtTime = useCallback(
    (timeValue, frames) => {
      let nearest = null;
      let nearestDistance = Infinity;
      (frames || []).forEach((kf) => {
        const distance = Math.abs(kf - timeValue);
        if (distance < keyframeTolerance && distance < nearestDistance) {
          nearest = kf;
          nearestDistance = distance;
        }
      });
      return nearest;
    },
    [keyframeTolerance]
  );

  const findEditTargetKeyframe = useCallback(
    (timeValue, frames) => {
      const sorted = [...(frames || [])].sort((a, b) => a - b);
      if (sorted.length === 0) return null;
      const nearest = findNearestKeyframeAtTime(timeValue, sorted);
      if (nearest !== null && nearest !== undefined) return nearest;
      if (sorted.length === 1) return sorted[0];
      if (timeValue >= sorted[sorted.length - 1]) return sorted[sorted.length - 1];
      if (timeValue <= sorted[0]) return sorted[0];
      return null;
    },
    [findNearestKeyframeAtTime]
  );

  const markKeyframeSnapshotPending = useCallback(() => {
    const keyframeAtTime = findEditTargetKeyframe(timePercent, keyframes);
    if (!keyframeAtTime) return;
    pendingKeyframeUpdateRef.current = true;
    pendingKeyframeTimeRef.current = keyframeAtTime;
  }, [findEditTargetKeyframe, timePercent, keyframes]);

  const requestAddKeyframe = useCallback(() => {
    setKeyframeSignal((prev) => prev + 1);
  }, []);

  const clearKeyframeInternals = () => {
    pendingKeyframeUpdateRef.current = false;
    pendingKeyframeTimeRef.current = null;
    pendingKeyframeSnapshotsRef.current = new Set();
    prevKeyframesRef.current = [];
    latestKeyframesRef.current = [];
    latestKeyframeSnapshotsRef.current = {};
  };

  const resetKeyframeState = () => {
    clearKeyframeInternals();
    setSelectedKeyframe(null);
    setKeyframes([]);
    setKeyframeSnapshots({});
    setTimelineResetSignal((prev) => prev + 1);
  };

  const loadKeyframeState = ({ nextKeyframes, nextSnapshots }) => {
    clearKeyframeInternals();
    setSelectedKeyframe(null);
    setKeyframes(nextKeyframes || []);
    setKeyframeSnapshots(nextSnapshots || {});
  };

  useEffect(() => {
    latestKeyframesRef.current = keyframes;
    const prevKeyframes = prevKeyframesRef.current || [];
    const added = keyframes.filter((kf) => !prevKeyframes.includes(kf));
    const removed = prevKeyframes.filter((kf) => !keyframes.includes(kf));

    if (removed.length) {
      setKeyframeSnapshots((prev) => {
        const next = { ...prev };
        removed.forEach((kf) => {
          delete next[kf];
        });
        return next;
      });
    }

    if (added.length) {
      added.forEach((kf) => pendingKeyframeSnapshotsRef.current.add(kf));
    }

    prevKeyframesRef.current = keyframes;
  }, [keyframes]);

  useEffect(() => {
    latestKeyframeSnapshotsRef.current = keyframeSnapshots;
  }, [keyframeSnapshots]);

  useEffect(() => {
    if (pendingKeyframeSnapshotsRef.current.size === 0) return;
    const pending = Array.from(pendingKeyframeSnapshotsRef.current);
    pendingKeyframeSnapshotsRef.current.clear();
    setKeyframeSnapshots((prev) => {
      const next = { ...prev };
      pending.forEach((kf) => {
        next[kf] = snapshotSlateState();
      });
      return next;
    });
  }, [playersById, representedPlayerIds, ball, keyframes, snapshotSlateState]);

  useEffect(() => {
    const frames = latestKeyframesRef.current;
    if (!frames || frames.length === 0) return;
    const nearest = findNearestKeyframeAtTime(timePercent, frames);
    const shouldSeedSingle = frames.length === 1;
    const target =
      nearest !== null && nearest !== undefined ? nearest : shouldSeedSingle ? frames[0] : null;
    if (target === null || target === undefined) return;
    if (latestKeyframeSnapshotsRef.current[target]) return;
    setKeyframeSnapshots((prev) => ({
      ...prev,
      [target]: snapshotSlateState(),
    }));
  }, [timePercent, findNearestKeyframeAtTime, snapshotSlateState]);

  useEffect(() => {
    if (!pendingKeyframeUpdateRef.current) return;
    const keyframeAtTime = pendingKeyframeTimeRef.current;
    if (keyframeAtTime === null || keyframeAtTime === undefined) return;
    pendingKeyframeUpdateRef.current = false;
    pendingKeyframeTimeRef.current = null;
    setKeyframeSnapshots((prev) => ({
      ...prev,
      [keyframeAtTime]: snapshotSlateState(),
    }));
  }, [playersById, representedPlayerIds, ball, snapshotSlateState]);

  return {
    keyframes,
    setKeyframes,
    selectedKeyframe,
    setSelectedKeyframe,
    keyframeTolerance,
    setKeyframeTolerance,
    keyframeSignal,
    requestAddKeyframe,
    timelineResetSignal,
    keyframeSnapshots,
    setKeyframeSnapshots,
    latestKeyframesRef,
    latestKeyframeSnapshotsRef,
    findNearestKeyframeAtTime,
    findEditTargetKeyframe,
    markKeyframeSnapshotPending,
    resetKeyframeState,
    loadKeyframeState,
    clearKeyframeInternals,
  };
}

export default useKeyframeSnapshots;
