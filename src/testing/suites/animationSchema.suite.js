/**
 * In-browser test suite for animation schema utilities.
 */
import { buildSuite } from "../testRunner";
import {
  normalizeAnimation,
  normalizeTrack,
  sortAndDedupeKeyframes,
  createEmptyAnimation,
  upsertKeyframe,
  deleteKeyframeAtTime,
  getTrackKeyframeTimes,
  moveKeyframeTime,
  cloneAnimation,
  ANIMATION_VERSION,
  DEFAULT_DURATION_MS,
} from "../../animation/schema";

export default buildSuite(({ describe, it, expect }) => {
  // ─── sortAndDedupeKeyframes ───────────────────────────────────────────
  describe("sortAndDedupeKeyframes", () => {
    it("sorts by time ascending", () => {
      const result = sortAndDedupeKeyframes([{ t: 200, x: 0, y: 0 }, { t: 100, x: 1, y: 1 }]);
      expect(result[0].t).toBe(100);
      expect(result[1].t).toBe(200);
    }, "Keyframes must always be sorted by time for interpolation to work correctly. If unsorted keyframes slip through, the animation engine will interpolate between wrong keyframe pairs, causing players to teleport.");

    it("deduplicates keyframes within 0.5ms", () => {
      const result = sortAndDedupeKeyframes([
        { t: 100, x: 0, y: 0 },
        { t: 100.3, x: 1, y: 1 },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].x).toBe(1);
    }, "Two keyframes within 0.5ms are treated as the same point in time (the later one wins). This prevents micro-duplicates from accumulating during rapid recording. Without dedup, the keyframe array would grow unbounded and slow down playback.");

    it("keeps keyframes > 0.5ms apart", () => {
      const result = sortAndDedupeKeyframes([
        { t: 100, x: 0, y: 0 },
        { t: 101, x: 1, y: 1 },
      ]);
      expect(result).toHaveLength(2);
    }, "Keyframes more than 0.5ms apart are legitimately different and must both be kept. If they get merged, fine-grained movement details from recording mode would be lost.");

    it("filters out invalid keyframes", () => {
      const result = sortAndDedupeKeyframes([null, undefined, { t: 0, x: 0, y: 0 }, "bad"]);
      expect(result).toHaveLength(1);
    }, "Invalid entries (null, strings, undefined) in the keyframes array must be silently filtered out. This prevents corrupted data from crashing the animation engine.");

    it("handles empty array", () => {
      expect(sortAndDedupeKeyframes([])).toEqual([]);
    }, "An empty keyframes array should return an empty array (not null or undefined). This is the base case for newly created tracks with no keyframes yet.");

    it("preserves rotation field", () => {
      const result = sortAndDedupeKeyframes([{ t: 0, x: 1, y: 2, r: 45 }]);
      expect(result[0].r).toBe(45);
    }, "The optional rotation field (r) must be preserved during normalization. If it's stripped out, player facing angles won't be saved and will reset to 0 on reload.");
  });

  // ─── normalizeTrack ───────────────────────────────────────────────────
  describe("normalizeTrack", () => {
    it("normalizes keyframes", () => {
      const track = normalizeTrack({ keyframes: [{ t: 0, x: 5, y: 10 }] });
      expect(track.keyframes).toHaveLength(1);
      expect(track.keyframes[0].x).toBe(5);
    }, "normalizeTrack should pass keyframes through sortAndDedupeKeyframes and return a clean track object. This is called on every track during serialization. Failure means tracks could contain invalid or unsorted data.");

    it("handles null track", () => {
      const track = normalizeTrack(null);
      expect(track.keyframes).toEqual([]);
    }, "A null track should be normalized to {keyframes: []} instead of crashing. This handles cases where animation data references a player ID that doesn't have track data yet.");
  });

  // ─── normalizeAnimation ───────────────────────────────────────────────
  describe("normalizeAnimation", () => {
    it("sets version", () => {
      const anim = normalizeAnimation({});
      expect(anim.version).toBe(ANIMATION_VERSION);
    }, "Every animation object must have the correct version field for serialization compatibility. If the version is wrong, deserializeAnimation will reject the data on import.");

    it("defaults durationMs", () => {
      const anim = normalizeAnimation({});
      expect(anim.durationMs).toBe(DEFAULT_DURATION_MS);
    }, "Missing duration should default to 30000ms (30 seconds). If this defaults to 0 or NaN, the timeline would be zero-length and keyframes couldn't be placed.");

    it("preserves tracks", () => {
      const anim = normalizeAnimation({
        tracks: { p1: { keyframes: [{ t: 0, x: 1, y: 2 }] } },
      });
      expect(anim.tracks.p1.keyframes).toHaveLength(1);
    }, "Existing track data must pass through normalization intact. If tracks are dropped, all animation data would be silently lost during save.");

    it("handles null input", () => {
      const anim = normalizeAnimation(null);
      expect(anim.version).toBe(ANIMATION_VERSION);
      expect(anim.durationMs).toBe(DEFAULT_DURATION_MS);
    }, "Null animation (no data loaded) should return a valid empty animation rather than crashing. This is called during initial state setup before any plays are loaded.");

    it("preserves meta", () => {
      const anim = normalizeAnimation({ meta: { note: "test" } });
      expect(anim.meta.note).toBe("test");
    }, "The meta field stores timestamps and custom metadata. It must survive normalization. If dropped, createdAt/updatedAt timestamps would be lost.");

    it("enforces min duration of 1ms", () => {
      const anim = normalizeAnimation({ durationMs: -100 });
      expect(anim.durationMs).toBeGreaterThanOrEqual(1);
    }, "Negative or zero duration is invalid and must be clamped to at least 1ms. Without this, division-by-zero errors would occur in timeline percentage calculations.");
  });

  // ─── createEmptyAnimation ─────────────────────────────────────────────
  describe("createEmptyAnimation", () => {
    it("creates with default duration", () => {
      const anim = createEmptyAnimation();
      expect(anim.durationMs).toBe(DEFAULT_DURATION_MS);
      expect(anim.version).toBe(ANIMATION_VERSION);
    }, "New plays start with a default empty animation. This must have the correct version and 30-second duration. If wrong, new plays would have broken timelines.");

    it("creates with custom duration", () => {
      const anim = createEmptyAnimation({ durationMs: 5000 });
      expect(anim.durationMs).toBe(5000);
    }, "The duration should be configurable for different play lengths. If the parameter is ignored, all new animations would be forced to 30 seconds.");

    it("has empty tracks", () => {
      const anim = createEmptyAnimation();
      expect(Object.keys(anim.tracks)).toHaveLength(0);
    }, "New animations start with no tracks (no player movement data). If tracks are pre-populated, new plays might contain ghost animation data.");
  });

  // ─── upsertKeyframe ───────────────────────────────────────────────────
  describe("upsertKeyframe", () => {
    it("inserts into empty track", () => {
      const track = upsertKeyframe({ keyframes: [] }, { t: 100, x: 5, y: 10 });
      expect(track.keyframes).toHaveLength(1);
      expect(track.keyframes[0].t).toBe(100);
    }, "Adding the first keyframe to an empty track. This is what happens when a coach first drags a player to set their starting position. Failure means no keyframes could ever be created.");

    it("updates existing keyframe at same time", () => {
      const track = upsertKeyframe(
        { keyframes: [{ t: 100, x: 0, y: 0 }] },
        { t: 100, x: 99, y: 99 }
      );
      expect(track.keyframes).toHaveLength(1);
      expect(track.keyframes[0].x).toBe(99);
    }, "Moving a player at an existing keyframe time should UPDATE the keyframe (not create a duplicate). If duplicates are created, the track would have two keyframes at the same time, causing interpolation ambiguity.");

    it("inserts in sorted order", () => {
      const track = upsertKeyframe(
        { keyframes: [{ t: 0, x: 0, y: 0 }, { t: 200, x: 20, y: 20 }] },
        { t: 100, x: 10, y: 10 }
      );
      expect(track.keyframes).toHaveLength(3);
      expect(track.keyframes[1].t).toBe(100);
    }, "New keyframes must be inserted in time-sorted position. If appended to the end unsorted, the interpolation engine would produce wrong positions between keyframes.");
  });

  // ─── deleteKeyframeAtTime ─────────────────────────────────────────────
  describe("deleteKeyframeAtTime", () => {
    it("removes keyframe at exact time", () => {
      const track = deleteKeyframeAtTime(
        { keyframes: [{ t: 0, x: 0, y: 0 }, { t: 100, x: 10, y: 10 }] },
        100
      );
      expect(track.keyframes).toHaveLength(1);
      expect(track.keyframes[0].t).toBe(0);
    }, "Deleting a keyframe should remove only the one at the specified time. This is used when the coach right-clicks a keyframe to delete it. Failure means keyframes can't be removed from the timeline.");

    it("does nothing if time not found", () => {
      const track = deleteKeyframeAtTime(
        { keyframes: [{ t: 0, x: 0, y: 0 }] },
        999
      );
      expect(track.keyframes).toHaveLength(1);
    }, "Attempting to delete at a time with no keyframe should be a no-op. If this deletes the nearest keyframe instead, coaches would accidentally lose keyframes.");
  });

  // ─── getTrackKeyframeTimes ────────────────────────────────────────────
  describe("getTrackKeyframeTimes", () => {
    it("collects all unique times sorted", () => {
      const anim = normalizeAnimation({
        tracks: {
          p1: { keyframes: [{ t: 0, x: 0, y: 0 }, { t: 200, x: 0, y: 0 }] },
          p2: { keyframes: [{ t: 100, x: 0, y: 0 }, { t: 200, x: 0, y: 0 }] },
        },
      });
      const times = getTrackKeyframeTimes(anim);
      expect(times).toEqual([0, 100, 200]);
    }, "Collects all keyframe timestamps across all tracks and deduplicates. This is used to render keyframe markers on the timeline. Duplicates (t=200 appears in both tracks) must be merged. Failure would show duplicate markers on the timeline.");

    it("filters by playerIds", () => {
      const anim = normalizeAnimation({
        tracks: {
          p1: { keyframes: [{ t: 0, x: 0, y: 0 }] },
          p2: { keyframes: [{ t: 500, x: 0, y: 0 }] },
        },
      });
      const times = getTrackKeyframeTimes(anim, ["p1"]);
      expect(times).toEqual([0]);
    }, "When filtering by player IDs, only those players' keyframe times should be returned. This is used for per-player keyframe display in recording mode. Failure would show other players' keyframes.");
  });

  // ─── moveKeyframeTime ─────────────────────────────────────────────────
  describe("moveKeyframeTime", () => {
    it("moves keyframe from one time to another", () => {
      const track = moveKeyframeTime(
        { keyframes: [{ t: 100, x: 5, y: 5 }, { t: 200, x: 10, y: 10 }] },
        100, 150
      );
      expect(track.keyframes[0].t).toBe(150);
      expect(track.keyframes[0].x).toBe(5);
    }, "Dragging a keyframe on the timeline changes its time but preserves its position data. This is how coaches adjust timing. If the position data is lost during the move, the player's position would reset to (0,0) at that keyframe.");

    it("returns same track if from === to", () => {
      const original = { keyframes: [{ t: 100, x: 5, y: 5 }] };
      const track = moveKeyframeTime(original, 100, 100);
      expect(track.keyframes[0].t).toBe(100);
    }, "Moving a keyframe to its current position is a no-op. This avoids unnecessary re-renders and history pushes when the drag ends at the same spot.");
  });

  // ─── cloneAnimation ───────────────────────────────────────────────────
  describe("cloneAnimation", () => {
    it("deep clones animation", () => {
      const original = normalizeAnimation({
        tracks: { p1: { keyframes: [{ t: 0, x: 1, y: 2 }] } },
      });
      const clone = cloneAnimation(original);
      clone.tracks.p1.keyframes[0].x = 999;
      expect(original.tracks.p1.keyframes[0].x).toBe(1);
    }, "Cloning must create a fully independent copy — mutating the clone must not affect the original. This is critical for undo/redo history: each history entry must be an independent snapshot. If cloning is shallow, undoing would corrupt the current state.");
  });
});
