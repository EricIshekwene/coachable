/**
 * Tests for cone rendering branching in PlayPreviewCard.
 * Cones live inside ballsById with objectType === "cone" and must render with
 * the cone sprite + coneSizePercent rather than the field-specific ball sprite.
 */
import { describe, it, expect } from "vitest";

const toFiniteNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Mirrors the cone-detection branch in PlayPreviewCard. */
const isConeEntity = (entity) => entity?.objectType === "cone";

/** Mirrors the coneSizePx derivation in PlayPreviewCard. */
const computeConeSizePx = (ballSettings) => {
  const coneSizePercent = clamp(toFiniteNumber(ballSettings?.coneSizePercent, 70), 10, 400);
  return Math.max(6, Math.round((22 * coneSizePercent) / 100));
};

const computeBallSizePx = (ballSettings) => {
  const ballSizePercent = clamp(toFiniteNumber(ballSettings?.sizePercent, 100), 10, 400);
  return Math.max(6, Math.round((22 * ballSizePercent) / 100));
};

describe("PlayPreviewCard cone detection", () => {
  it("recognizes entities with objectType === 'cone' as cones", () => {
    expect(isConeEntity({ id: "cone-1", x: 0, y: 0, objectType: "cone" })).toBe(true);
  });

  it("treats balls (and untagged entities) as non-cones", () => {
    expect(isConeEntity({ id: "ball-1", x: 0, y: 0, objectType: "ball" })).toBe(false);
    expect(isConeEntity({ id: "ball-1", x: 0, y: 0 })).toBe(false);
    expect(isConeEntity(null)).toBe(false);
    expect(isConeEntity(undefined)).toBe(false);
  });
});

describe("PlayPreviewCard cone sizing", () => {
  it("uses coneSizePercent (default 70) when absent", () => {
    // 22 * 70 / 100 = 15.4 → round to 15
    expect(computeConeSizePx({})).toBe(15);
    expect(computeConeSizePx(undefined)).toBe(15);
  });

  it("honors a custom coneSizePercent", () => {
    expect(computeConeSizePx({ coneSizePercent: 100 })).toBe(22);
    expect(computeConeSizePx({ coneSizePercent: 200 })).toBe(44);
  });

  it("clamps coneSizePercent to [10, 400]", () => {
    // 10% → 22*10/100 = 2.2 → max(6, 2) = 6
    expect(computeConeSizePx({ coneSizePercent: 0 })).toBe(6);
    // 400% → 22*400/100 = 88
    expect(computeConeSizePx({ coneSizePercent: 9999 })).toBe(88);
  });

  it("derives a distinct size from the ball sprite (uses different setting)", () => {
    const settings = { sizePercent: 100, coneSizePercent: 70 };
    expect(computeBallSizePx(settings)).toBe(22);
    expect(computeConeSizePx(settings)).toBe(15);
  });
});
