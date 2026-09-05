/**
 * Tests for the onboarding-tour card transition helpers
 * (contentFadePhase and cardBodyMode in
 * src/components/tutorial/tutorialOverlayLogic.js): the content cross-fade
 * phase on step change, and the delayed "Loadingâ€¦" body softening that
 * keeps fast transitions from flashing a loading hint.
 */
import { describe, it, expect } from "vitest";
import { contentFadePhase, cardBodyMode } from "../../src/components/tutorial/tutorialOverlayLogic.js";

describe("contentFadePhase â€” step change cross-fade", () => {
  it("is idle when the displayed step matches the active step", () => {
    expect(contentFadePhase("enter-title", "enter-title")).toBe("idle");
  });

  it("fades out when the active step has moved past the displayed one", () => {
    expect(contentFadePhase("enter-title", "pick-preset")).toBe("fade-out");
  });

  it("fades out on a backwards/jump change too (any id mismatch)", () => {
    expect(contentFadePhase("pick-preset", "enter-title")).toBe("fade-out");
  });

  it("is idle when there is no displayed step yet (first render â€” show immediately)", () => {
    expect(contentFadePhase(null, "new-play")).toBe("idle");
    expect(contentFadePhase(undefined, "new-play")).toBe("idle");
  });

  it("is idle when the tour has exited (no active step)", () => {
    expect(contentFadePhase("finish", null)).toBe("idle");
    expect(contentFadePhase("finish", undefined)).toBe("idle");
  });

  it("is idle when both ids are missing", () => {
    expect(contentFadePhase(null, null)).toBe("idle");
    expect(contentFadePhase(undefined, undefined)).toBe("idle");
  });
});

describe("cardBodyMode â€” delayed loading hint", () => {
  it("shows the step body when the target is mounted (not waiting)", () => {
    expect(cardBodyMode(false, false, false)).toBe("step-body");
  });

  it("shows the step body even if a stale loading-delay flag is set but waiting ended", () => {
    expect(cardBodyMode(false, true, false)).toBe("step-body");
  });

  it("keeps showing the (fading) step body while the cross-fade is in progress, even if waiting", () => {
    expect(cardBodyMode(true, false, true)).toBe("step-body");
    expect(cardBodyMode(true, true, true)).toBe("step-body");
  });

  it("renders the hint invisibly while waiting but before the grace window elapses", () => {
    expect(cardBodyMode(true, false, false)).toBe("loading-pending");
  });

  it("fades the hint in once waiting has outlasted the grace window", () => {
    expect(cardBodyMode(true, true, false)).toBe("loading");
  });

  it("never returns 'loading' unless waiting persists past the delay and no fade is running", () => {
    for (const waiting of [true, false]) {
      for (const ready of [true, false]) {
        for (const fading of [true, false]) {
          const mode = cardBodyMode(waiting, ready, fading);
          if (mode === "loading") {
            expect(waiting).toBe(true);
            expect(ready).toBe(true);
            expect(fading).toBe(false);
          }
        }
      }
    }
  });
});
