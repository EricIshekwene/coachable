/**
 * Tests for the onboarding-tour progress bar math
 * (tutorialProgressPercent in src/components/tutorial/tutorialOverlayLogic.js):
 * normal fill percentages, [0, 100] clamping, and degenerate inputs
 * (zero/undefined totals must never produce NaN or Infinity).
 */
import { describe, it, expect } from "vitest";
import { tutorialProgressPercent } from "../../src/components/tutorial/tutorialOverlayLogic.js";

describe("tutorialProgressPercent â€” normal cases", () => {
  it("returns 10 for step 1 of 10", () => {
    expect(tutorialProgressPercent(1, 10)).toBe(10);
  });

  it("returns 50 for step 5 of 10", () => {
    expect(tutorialProgressPercent(5, 10)).toBe(50);
  });

  it("returns 100 for the final step (10 of 10)", () => {
    expect(tutorialProgressPercent(10, 10)).toBe(100);
  });

  it("handles non-integer results (1 of 3)", () => {
    expect(tutorialProgressPercent(1, 3)).toBeCloseTo(33.333, 2);
  });

  it("returns 100 for a single-step tour (1 of 1)", () => {
    expect(tutorialProgressPercent(1, 1)).toBe(100);
  });
});

describe("tutorialProgressPercent â€” clamping", () => {
  it("clamps to 100 when stepNumber exceeds totalSteps", () => {
    expect(tutorialProgressPercent(12, 10)).toBe(100);
  });

  it("clamps to 0 for negative stepNumber", () => {
    expect(tutorialProgressPercent(-3, 10)).toBe(0);
  });

  it("returns 0 for step 0 of 10", () => {
    expect(tutorialProgressPercent(0, 10)).toBe(0);
  });
});

describe("tutorialProgressPercent â€” degenerate inputs", () => {
  it("returns 0 (not Infinity/NaN) when totalSteps is 0", () => {
    const result = tutorialProgressPercent(5, 0);
    expect(result).toBe(0);
    expect(Number.isFinite(result)).toBe(true);
  });

  it("returns 0 (not NaN) when totalSteps is undefined", () => {
    const result = tutorialProgressPercent(5, undefined);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });

  it("returns 0 when both arguments are undefined", () => {
    expect(tutorialProgressPercent(undefined, undefined)).toBe(0);
  });

  it("returns 0 when stepNumber is undefined or NaN", () => {
    expect(tutorialProgressPercent(undefined, 10)).toBe(0);
    expect(tutorialProgressPercent(NaN, 10)).toBe(0);
  });

  it("returns 0 for negative totalSteps", () => {
    expect(tutorialProgressPercent(3, -5)).toBe(0);
  });

  it("never returns NaN or Infinity across a sweep of odd inputs", () => {
    const odd = [undefined, null, NaN, Infinity, -Infinity, 0, -1, 0.5, 7];
    for (const a of odd) {
      for (const b of odd) {
        const r = tutorialProgressPercent(a, b);
        expect(Number.isFinite(r)).toBe(true);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(100);
      }
    }
  });
});
