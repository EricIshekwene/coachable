import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clampEncodeDimensions, isSafari, supportsCanvasCaptureStream } from "../../src/utils/videoEncoder";

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

describe("isSafari", () => {
  let originalNavigator;

  beforeEach(() => {
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  function setUA(ua) {
    Object.defineProperty(global, "navigator", {
      value: { userAgent: ua },
      writable: true,
      configurable: true,
    });
  }

  it("returns true for Mac Safari", () => {
    setUA(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"
    );
    expect(isSafari()).toBe(true);
  });

  it("returns true for iOS Safari (iPhone)", () => {
    setUA(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    );
    expect(isSafari()).toBe(true);
  });

  it("returns false for Chrome on Mac", () => {
    setUA(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    expect(isSafari()).toBe(false);
  });

  it("returns false for Edge on Mac", () => {
    setUA(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0"
    );
    expect(isSafari()).toBe(false);
  });

  it("returns false for Firefox", () => {
    setUA(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:127.0) Gecko/20100101 Firefox/127.0"
    );
    expect(isSafari()).toBe(false);
  });

  it("returns false for Chrome on iOS (CriOS)", () => {
    setUA(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.0.0 Mobile/15E148 Safari/604.1"
    );
    expect(isSafari()).toBe(false);
  });

  it("returns false when navigator is undefined", () => {
    Object.defineProperty(global, "navigator", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(isSafari()).toBe(false);
  });
});

describe("supportsCanvasCaptureStream", () => {
  let originalDocument;

  beforeEach(() => {
    originalDocument = global.document;
  });

  afterEach(() => {
    global.document = originalDocument;
  });

  it("returns true when canvas has captureStream method", () => {
    global.document = {
      createElement: () => ({ captureStream: () => {} }),
    };
    expect(supportsCanvasCaptureStream()).toBe(true);
  });

  it("returns false when canvas lacks captureStream", () => {
    global.document = {
      createElement: () => ({}),
    };
    expect(supportsCanvasCaptureStream()).toBe(false);
  });

  it("returns false when document.createElement throws", () => {
    global.document = {
      createElement: () => { throw new Error("not available"); },
    };
    expect(supportsCanvasCaptureStream()).toBe(false);
  });
});
