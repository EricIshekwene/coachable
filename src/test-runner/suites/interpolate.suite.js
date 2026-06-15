/**
 * In-browser test suite for animation interpolation functions.
 */
import { buildSuite } from "../testRunner";
import { getPoseAtTime, samplePosesAtTime } from "../../animation/interpolate";

export default buildSuite(({ describe, it, expect }) => {
  // ─── getPoseAtTime ────────────────────────────────────────────────────
  describe("getPoseAtTime", () => {
    it("returns fallback for empty keyframes", () => {
      const pose = getPoseAtTime({ keyframes: [] }, 500, { x: 10, y: 20 });
      expect(pose.x).toBe(10);
      expect(pose.y).toBe(20);
    }, "When a track has no keyframes, the player should stay at its fallback position (where it was placed on the canvas). If this fails, players with no animation data would jump to (0,0) during playback.");

    it("returns fallback for null track", () => {
      const pose = getPoseAtTime(null, 500, { x: 7, y: 8 });
      expect(pose.x).toBe(7);
      expect(pose.y).toBe(8);
    }, "A null track (player never animated) should gracefully return the fallback. Failure would cause a crash when playing animations that don't include all players.");

    it("returns first keyframe when time <= first.t", () => {
      const track = { keyframes: [{ t: 100, x: 5, y: 10 }, { t: 200, x: 15, y: 20 }] };
      const pose = getPoseAtTime(track, 0);
      expect(pose.x).toBe(5);
      expect(pose.y).toBe(10);
    }, "Before the first keyframe, the player should be at the first keyframe's position (not interpolating to nothing). Failure means players would disappear or jump at the start of playback.");

    it("returns last keyframe when time >= last.t", () => {
      const track = { keyframes: [{ t: 100, x: 5, y: 10 }, { t: 200, x: 15, y: 20 }] };
      const pose = getPoseAtTime(track, 999);
      expect(pose.x).toBe(15);
      expect(pose.y).toBe(20);
    }, "After the last keyframe, the player should stay at its final position. Failure means players would jump back to a start position or disappear at the end of the animation.");

    it("returns exact keyframe when time matches", () => {
      const track = { keyframes: [
        { t: 0, x: 0, y: 0 },
        { t: 500, x: 50, y: 100 },
        { t: 1000, x: 100, y: 200 },
      ]};
      const pose = getPoseAtTime(track, 500);
      expect(pose.x).toBe(50);
      expect(pose.y).toBe(100);
    }, "When the time exactly matches a keyframe, the exact keyframe values should be returned (no interpolation rounding). Failure could cause slight jitter at keyframe positions during playback.");

    it("interpolates linearly between keyframes", () => {
      const track = { keyframes: [
        { t: 0, x: 0, y: 0 },
        { t: 1000, x: 100, y: 200 },
      ]};
      const pose = getPoseAtTime(track, 500);
      expect(pose.x).toBeCloseTo(50);
      expect(pose.y).toBeCloseTo(100);
    }, "At 50% between two keyframes, the position should be exactly halfway. This is the core linear interpolation (lerp) that drives all animation. If this math is wrong, all player movements during playback will be incorrect.");

    it("interpolates at 25% between keyframes", () => {
      const track = { keyframes: [
        { t: 0, x: 0, y: 0 },
        { t: 1000, x: 100, y: 200 },
      ]};
      const pose = getPoseAtTime(track, 250);
      expect(pose.x).toBeCloseTo(25);
      expect(pose.y).toBeCloseTo(50);
    }, "At 25% through the keyframe span, positions should be 25% of the way. Validates the alpha calculation (t - left.t) / (right.t - left.t). Failure means the interpolation speed curve is wrong.");

    it("interpolates rotation when present", () => {
      const track = { keyframes: [
        { t: 0, x: 0, y: 0, r: 0 },
        { t: 1000, x: 100, y: 100, r: 90 },
      ]};
      const pose = getPoseAtTime(track, 500);
      expect(pose.r).toBeCloseTo(45);
    }, "Rotation (r field) should also interpolate linearly between keyframes. This is used for player facing direction. Failure means player rotation won't animate smoothly — it would snap between values.");

    it("handles single keyframe", () => {
      const track = { keyframes: [{ t: 500, x: 42, y: 99 }] };
      const pose = getPoseAtTime(track, 500);
      expect(pose.x).toBe(42);
      expect(pose.y).toBe(99);
    }, "A track with only one keyframe should always return that position. This is common when a player is placed but only has a starting position. Failure would cause a crash or return garbage values.");

    it("returns first keyframe copy for single keyframe before time", () => {
      const track = { keyframes: [{ t: 500, x: 42, y: 99 }] };
      const pose = getPoseAtTime(track, 0);
      expect(pose.x).toBe(42);
    }, "Before a single keyframe's time, the player should still be at that keyframe's position (clamp to first). Failure means players would vanish before their keyframe time.");

    it("handles non-finite timeMs gracefully", () => {
      const track = { keyframes: [{ t: 0, x: 1, y: 2 }, { t: 100, x: 10, y: 20 }] };
      const pose = getPoseAtTime(track, NaN);
      expect(pose.x).toBe(1);
    }, "NaN or Infinity time should be treated as 0 rather than crashing. This guards against bugs where the timeline passes an invalid time value during edge cases like rapid scrubbing.");

    it("interpolates between 3 keyframes correctly", () => {
      const track = { keyframes: [
        { t: 0, x: 0, y: 0 },
        { t: 100, x: 100, y: 0 },
        { t: 200, x: 100, y: 100 },
      ]};
      const pose = getPoseAtTime(track, 150);
      expect(pose.x).toBeCloseTo(100);
      expect(pose.y).toBeCloseTo(50);
    }, "With 3 keyframes, interpolation at t=150 should be between the 2nd and 3rd keyframes (not the 1st and 3rd). Validates that the correct keyframe pair is found. Failure means multi-segment animations would interpolate over wrong spans.");
  });

  // ─── samplePosesAtTime ────────────────────────────────────────────────
  describe("samplePosesAtTime", () => {
    it("samples all tracks", () => {
      const animation = {
        tracks: {
          p1: { keyframes: [{ t: 0, x: 0, y: 0 }, { t: 1000, x: 100, y: 100 }] },
          p2: { keyframes: [{ t: 0, x: 50, y: 50 }, { t: 1000, x: 150, y: 150 }] },
        },
      };
      const poses = samplePosesAtTime(animation, 500);
      expect(poses.p1.x).toBeCloseTo(50);
      expect(poses.p2.x).toBeCloseTo(100);
    }, "Should interpolate all tracks at the given time and return a map of player ID to pose. This is what the animation engine calls every frame during playback. Failure means the entire animation playback is broken.");

    it("uses fallback poses for missing tracks", () => {
      const animation = { tracks: {} };
      const fallbacks = { p1: { x: 10, y: 20 } };
      const poses = samplePosesAtTime(animation, 500, fallbacks);
      expect(poses.p1.x).toBe(10);
      expect(poses.p1.y).toBe(20);
    }, "Players without animation tracks should use their canvas position as fallback. Without this, non-animated players would jump to (0,0) during playback.");

    it("filters by playerIds", () => {
      const animation = {
        tracks: {
          p1: { keyframes: [{ t: 0, x: 0, y: 0 }] },
          p2: { keyframes: [{ t: 0, x: 50, y: 50 }] },
        },
      };
      const poses = samplePosesAtTime(animation, 0, {}, ["p1"]);
      expect(poses.p1).toBeTruthy();
      expect(poses.p2).toBeFalsy();
    }, "When playerIds filter is provided, only those players should be sampled. This is used for recording mode where only specific players need interpolation. Failure would sample unnecessary tracks, wasting performance.");

    it("handles null animation gracefully", () => {
      const poses = samplePosesAtTime(null, 500, { p1: { x: 1, y: 2 } });
      expect(poses.p1.x).toBe(1);
    }, "Null animation (no animation data loaded yet) should return fallback poses without crashing. This happens during initial load before animation data is fetched from the server.");

    it("merges track IDs and fallback IDs", () => {
      const animation = {
        tracks: { p1: { keyframes: [{ t: 0, x: 5, y: 5 }] } },
      };
      const fallbacks = { p2: { x: 99, y: 99 } };
      const poses = samplePosesAtTime(animation, 0, fallbacks);
      expect(poses.p1.x).toBe(5);
      expect(poses.p2.x).toBe(99);
    }, "Should return poses for both players with tracks AND players with only fallbacks. This ensures all players are visible during playback, even if only some have been animated.");
  });
});
