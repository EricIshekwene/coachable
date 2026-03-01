const lerp = (from, to, t) => from + (to - from) * t;

const hasRotation = (pose) => typeof pose?.r === "number" && Number.isFinite(pose.r);

export const getPoseAtTime = (track, timeMs, fallbackPose = { x: 0, y: 0, r: 0 }) => {
  const keyframes = Array.isArray(track?.keyframes) ? track.keyframes : [];
  if (keyframes.length === 0) {
    return { ...fallbackPose };
  }

  const t = Number.isFinite(Number(timeMs)) ? Number(timeMs) : 0;
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];

  if (t <= first.t) return { ...first };
  if (t >= last.t) return { ...last };

  for (let i = 0; i < keyframes.length; i += 1) {
    if (keyframes[i].t === t) {
      return { ...keyframes[i] };
    }
  }

  let left = first;
  let right = last;
  for (let i = 0; i < keyframes.length - 1; i += 1) {
    const current = keyframes[i];
    const next = keyframes[i + 1];
    if (t > current.t && t < next.t) {
      left = current;
      right = next;
      break;
    }
  }

  if (left.t === right.t) return { ...left };
  const alpha = (t - left.t) / (right.t - left.t);
  const pose = {
    x: lerp(left.x, right.x, alpha),
    y: lerp(left.y, right.y, alpha),
  };

  if (hasRotation(left) || hasRotation(right)) {
    const leftRotation = hasRotation(left) ? left.r : 0;
    const rightRotation = hasRotation(right) ? right.r : leftRotation;
    pose.r = lerp(leftRotation, rightRotation, alpha);
  }

  return pose;
};

export const samplePosesAtTime = (animation, timeMs, fallbackPoses = {}, playerIds) => {
  const tracks =
    animation && typeof animation === "object" && animation.tracks && typeof animation.tracks === "object"
      ? animation.tracks
      : {};
  const ids =
    Array.isArray(playerIds) && playerIds.length
      ? playerIds
      : Array.from(new Set([...Object.keys(tracks), ...Object.keys(fallbackPoses || {})]));

  const poses = {};
  ids.forEach((playerId) => {
    const track = tracks[playerId];
    const fallback = fallbackPoses?.[playerId] || { x: 0, y: 0, r: 0 };
    poses[playerId] = getPoseAtTime(track, timeMs, fallback);
  });
  return poses;
};
