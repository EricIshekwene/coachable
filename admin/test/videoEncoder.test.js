import { describe, it, expect } from "vitest";
import { clampEncodeDimensions } from "../../src/utils/videoEncoder";

describe("clampEncodeDimensions", () => {
  it("returns original dimensions when both are under the limit", () => {
    const result = clampEncodeDimensions(1280, 720);
    expect(result.width).toBe(1280);
    expect(result.height).toBe(720);
    expect(result.scale).toBe(1);
  });

  it("clamps tall canvas (portrait) to 1920 on the longest side", () => {
    // 2100x3840 → scale = 1920/3840 = 0.5 → 1050x1920
    const result = clampEncodeDimensions(2100, 3840);
    expect(result.height).toBe(1920);
    expect(result.width).toBeLessThanOrEqual(1920);
    expect(result.scale).toBeCloseTo(0.5, 2);
  });

  it("clamps wide canvas (landscape) to 1920 on the longest side", () => {
    const result = clampEncodeDimensions(3840, 2100);
    expect(result.width).toBe(1920);
    expect(result.height).toBeLessThanOrEqual(1920);
    expect(result.scale).toBeCloseTo(0.5, 2);
  });

  it("ensures even dimensions", () => {
    // 701x1281 → both odd
    const result = clampEncodeDimensions(701, 1281);
    expect(result.width % 2).toBe(0);
    expect(result.height % 2).toBe(0);
  });

  it("ensures even dimensions after clamping", () => {
    // Odd source that after scaling could produce odd output
    const result = clampEncodeDimensions(2999, 3001);
    expect(result.width % 2).toBe(0);
    expect(result.height % 2).toBe(0);
    expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(1920);
  });

  it("preserves aspect ratio", () => {
    const result = clampEncodeDimensions(2100, 3840);
    const originalRatio = 2100 / 3840;
    const clampedRatio = result.width / result.height;
    // Allow small rounding error from even-dimension adjustment
    expect(Math.abs(originalRatio - clampedRatio)).toBeLessThan(0.01);
  });

  it("does not upscale small dimensions", () => {
    const result = clampEncodeDimensions(640, 480);
    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
    expect(result.scale).toBe(1);
  });

  it("handles exactly 1920 dimension without change", () => {
    const result = clampEncodeDimensions(1080, 1920);
    expect(result.width).toBe(1080);
    expect(result.height).toBe(1920);
    expect(result.scale).toBe(1);
  });
});
