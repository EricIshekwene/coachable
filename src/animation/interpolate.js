const lerp = (from, to, t) => from + (to - from) * t;

const hasRotation = (pose) => typeof pose?.r === "number" && Number.isFinite(pose.r);

/**
 * Linearly interpolates a pose (x, y, optional r) from a track's keyframes at a given time.
 * @param {Object} track - Track with keyframes array.
 * @param {number} timeMs - Time in milliseconds.
 * @param {Object} [fallbackPose] - Fallback if track has no keyframes.
 * @returns {{ x: number, y: number, r?: number }}
 */
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

/**
 * Computes the travel direction angle (in Konva degrees) for a track at a given time.
 * Used to orient oblong balls (football, rugby) so the tip points toward movement.
 * Returns null if direction cannot be determined (< 2 keyframes or no movement).
 * @param {Object} track - Track with keyframes array.
 * @param {number} timeMs - Time in milliseconds.
 * @returns {number|null} Rotation in degrees (0 = pointing right, 90 = down, etc.)
 */
export const getDirectionAtTime = (track, timeMs) => {
  const keyframes = Array.isArray(track?.keyframes) ? track.keyframes : [];
  if (keyframes.length < 2) return null;

  const t = Number.isFinite(Number(timeMs)) ? Number(timeMs) : 0;
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];

  let dx, dy;
  if (t <= first.t) {
    const second = keyframes[1];
    dx = second.x - first.x;
    dy = second.y - first.y;
  } else if (t >= last.t) {
    const prev = keyframes[keyframes.length - 2];
    dx = last.x - prev.x;
    dy = last.y - prev.y;
  } else {
    let left = first;
    let right = last;
    for (let i = 0; i < keyframes.length - 1; i += 1) {
      if (t >= keyframes[i].t && t <= keyframes[i + 1].t) {
        left = keyframes[i];
        right = keyframes[i + 1];
        break;
      }
    }
    dx = right.x - left.x;
    dy = right.y - left.y;
  }

  if (dx === 0 && dy === 0) return null;
  // Ball images are drawn tip-up (0° = upright). atan2 gives 0° for rightward movement,
  // so add 90° so the tip aligns with the direction of travel.
  return Math.atan2(dy, dx) * (180 / Math.PI) + 90;
};

/**
 * Samples poses for multiple tracks at a given time.
 * @param {Object} animation - Animation object with tracks.
 * @param {number} timeMs - Time in milliseconds.
 * @param {Object} [fallbackPoses] - Map of fallback poses keyed by player ID.
 * @param {string[]} [playerIds] - Specific IDs to sample (defaults to all tracks).
 * @returns {Object} Map of player ID to interpolated pose.
 */
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
