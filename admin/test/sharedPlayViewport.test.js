/**
 * Tests mirroring the shared-play viewing fixes in src/features/slate/Slate.jsx
 * and src/canvas/KonvaCanvasRoot.jsx:
 *  - autoplay-on-load only fires once a play actually has motion to show
 *    (a play with zero or single-keyframe tracks has nothing to animate)
 *  - the canvas reserves bottom space equal to the ViewOnlyControls bar's
 *    measured height so the field never renders underneath it, but only
 *    while the view-only overlay is actually showing
 */
import { describe, it, expect } from "vitest";

/** Mirrors the `hasMotion` check in Slate.jsx's autoplay-on-load effect. */
const hasMotion = (tracks) =>
  Object.values(tracks || {}).some((track) => (track?.keyframes?.length || 0) > 1);

/** Mirrors the `viewOnlyBottomInset` prop passed to KonvaCanvasRoot in Slate.jsx. */
const resolveCanvasBottomInset = (showViewOverlay, measuredBarHeight) =>
  showViewOverlay ? measuredBarHeight : 0;

/** Mirrors the inline style branch in KonvaCanvasRoot.jsx's canvas container. */
const resolveContainerBottomStyle = (viewOnlyBottomInset) =>
  viewOnlyBottomInset > 0 ? viewOnlyBottomInset : undefined;

describe("autoplay-on-load motion gating", () => {
  it("does not autoplay a play with no tracks", () => {
    expect(hasMotion({})).toBe(false);
  });

  it("does not autoplay a play whose tracks have only a single keyframe (static pose)", () => {
    expect(hasMotion({ p1: { keyframes: [{ t: 0 }] } })).toBe(false);
  });

  it("autoplays a play with at least one track that actually moves", () => {
    expect(hasMotion({
      p1: { keyframes: [{ t: 0 }] },
      p2: { keyframes: [{ t: 0 }, { t: 1000 }] },
    })).toBe(true);
  });
});

describe("view-only canvas bottom inset", () => {
  it("reserves no space while the view-only overlay isn't showing (edit mode)", () => {
    expect(resolveCanvasBottomInset(false, 96)).toBe(0);
  });

  it("reserves exactly the measured ViewOnlyControls bar height once it's showing", () => {
    expect(resolveCanvasBottomInset(true, 96)).toBe(96);
  });

  it("reserves nothing if the bar hasn't reported a height yet", () => {
    expect(resolveCanvasBottomInset(true, 0)).toBe(0);
  });
});

describe("KonvaCanvasRoot container bottom style", () => {
  it("leaves bottom unset (falls back to inset-0's bottom:0) when there is no inset", () => {
    expect(resolveContainerBottomStyle(0)).toBeUndefined();
  });

  it("applies an explicit bottom offset in px when an inset is reserved", () => {
    expect(resolveContainerBottomStyle(110)).toBe(110);
  });
});
