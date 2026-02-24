const lerp = (from, to, t) => from + (to - from) * t;

export function buildInterpolatedSlate(
  timeValue,
  frames,
  snapshots,
  initialBall,
  keyframeTolerance
) {
  void keyframeTolerance;
  const availableKeyframes = (frames || [])
    .filter((kf) => snapshots[kf])
    .sort((a, b) => a - b);

  if (availableKeyframes.length === 0) return null;

  if (timeValue <= availableKeyframes[0]) {
    return snapshots[availableKeyframes[0]];
  }
  if (timeValue >= availableKeyframes[availableKeyframes.length - 1]) {
    return snapshots[availableKeyframes[availableKeyframes.length - 1]];
  }

  let prevKeyframe = availableKeyframes[0];
  let nextKeyframe = availableKeyframes[availableKeyframes.length - 1];
  for (let i = 0; i < availableKeyframes.length - 1; i += 1) {
    const current = availableKeyframes[i];
    const next = availableKeyframes[i + 1];
    if (timeValue >= current && timeValue <= next) {
      prevKeyframe = current;
      nextKeyframe = next;
      break;
    }
  }

  if (prevKeyframe === nextKeyframe) {
    return snapshots[prevKeyframe];
  }

  const prevSnapshot = snapshots[prevKeyframe];
  const nextSnapshot = snapshots[nextKeyframe];
  if (!prevSnapshot || !nextSnapshot) return null;

  const t = (timeValue - prevKeyframe) / (nextKeyframe - prevKeyframe);
  const prevPlayers = prevSnapshot.playersById || {};
  const nextPlayers = nextSnapshot.playersById || {};
  const allPlayerIds = new Set([...Object.keys(prevPlayers), ...Object.keys(nextPlayers)]);

  const interpolatedPlayers = {};
  allPlayerIds.forEach((id) => {
    const prevPlayer = prevPlayers[id];
    const nextPlayer = nextPlayers[id];
    if (prevPlayer && nextPlayer) {
      interpolatedPlayers[id] = {
        ...prevPlayer,
        ...nextPlayer,
        x: lerp(prevPlayer.x ?? 0, nextPlayer.x ?? 0, t),
        y: lerp(prevPlayer.y ?? 0, nextPlayer.y ?? 0, t),
      };
      return;
    }
    interpolatedPlayers[id] = { ...(prevPlayer || nextPlayer) };
  });

  const prevBall = prevSnapshot.ball || initialBall;
  const nextBall = nextSnapshot.ball || initialBall;
  const interpolatedBall = {
    ...prevBall,
    ...nextBall,
    x: lerp(prevBall.x ?? 0, nextBall.x ?? 0, t),
    y: lerp(prevBall.y ?? 0, nextBall.y ?? 0, t),
  };

  const represented =
    t <= 0.5
      ? [...(prevSnapshot.representedPlayerIds || [])]
      : [...(nextSnapshot.representedPlayerIds || [])];

  return {
    playersById: interpolatedPlayers,
    representedPlayerIds: represented,
    ball: interpolatedBall,
  };
}

export default buildInterpolatedSlate;
