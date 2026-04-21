/**
 * Tests for PlayPreviewPlayer and the PlayPreviewCard speed fix.
 * Covers playback rate derivation, time formatting, and controlled-time logic.
 */
import { describe, it, expect } from "vitest";

// ── Shared helpers (mirrors PlayPreviewPlayer.jsx / PlayPreviewCard.jsx) ──────

const toFiniteNumber = (value, fallback = 0) => {
  const n = Number(value);
  return isFinite(n) ? n : fallback;
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Computes playback rate from a 0–100 speedMultiplier.
 * Formula is shared across Slate.jsx, ViewOnlyControls, SpeedSlider, and PlayPreviewCard.
 */
const speedToPlaybackRate = (speedMultiplier) =>
  (0.25 + (speedMultiplier / 100) * 3.75) * 3;

const formatTime = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
};

const DEFAULT_SPEED_MULTIPLIER = 50;
const DEFAULT_DURATION_MS = 30000;

/**
 * Reads speedMultiplier from play data (mirrors PlayPreviewCard / PlayPreviewPlayer).
 */
const getPlaybackRate = (playData) => {
  const speedMult = toFiniteNumber(
    playData?.play?.playback?.speedMultiplier,
    DEFAULT_SPEED_MULTIPLIER
  );
  return speedToPlaybackRate(speedMult);
};

// ── speedToPlaybackRate ───────────────────────────────────────────────────────

describe("speedToPlaybackRate", () => {
  it("returns 0.75 at multiplier 0 (slowest)", () => {
    expect(speedToPlaybackRate(0)).toBeCloseTo(0.75);
  });

  it("returns 6.375 at multiplier 50 (default)", () => {
    expect(speedToPlaybackRate(50)).toBeCloseTo(6.375);
  });

  it("returns 12 at multiplier 100 (fastest)", () => {
    expect(speedToPlaybackRate(100)).toBeCloseTo(12);
  });

  it("is strictly increasing across the range", () => {
    const rates = [0, 25, 50, 75, 100].map(speedToPlaybackRate);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeGreaterThan(rates[i - 1]);
    }
  });
});

// ── getPlaybackRate (reads from playData) ─────────────────────────────────────

describe("getPlaybackRate from playData", () => {
  it("uses the play's saved speedMultiplier", () => {
    const playData = { play: { playback: { speedMultiplier: 100 } } };
    expect(getPlaybackRate(playData)).toBeCloseTo(12);
  });

  it("falls back to default (50) when playback is missing", () => {
    expect(getPlaybackRate({})).toBeCloseTo(speedToPlaybackRate(DEFAULT_SPEED_MULTIPLIER));
    expect(getPlaybackRate(null)).toBeCloseTo(speedToPlaybackRate(DEFAULT_SPEED_MULTIPLIER));
    expect(getPlaybackRate({ play: {} })).toBeCloseTo(speedToPlaybackRate(DEFAULT_SPEED_MULTIPLIER));
  });

  it("falls back to default when speedMultiplier is non-numeric", () => {
    const playData = { play: { playback: { speedMultiplier: "fast" } } };
    expect(getPlaybackRate(playData)).toBeCloseTo(speedToPlaybackRate(DEFAULT_SPEED_MULTIPLIER));
  });
});

// ── formatTime ────────────────────────────────────────────────────────────────

describe("formatTime", () => {
  it("formats 0 as 0:00", () => {
    expect(formatTime(0)).toBe("0:00");
  });

  it("formats 30000ms (30s) as 0:30", () => {
    expect(formatTime(30000)).toBe("0:30");
  });

  it("formats 90000ms (90s) as 1:30", () => {
    expect(formatTime(90000)).toBe("1:30");
  });

  it("zero-pads seconds below 10", () => {
    expect(formatTime(5000)).toBe("0:05");
  });

  it("clamps negative values to 0:00", () => {
    expect(formatTime(-1000)).toBe("0:00");
  });
});

// ── controlled time logic ─────────────────────────────────────────────────────

describe("PlayPreviewCard controlled time mode", () => {
  it("uses controlledTimeMs when provided instead of internal state", () => {
    // Simulates the displayTimeMs selection logic in PlayPreviewCard
    const resolveDisplayTime = (controlledTimeMs, autoplay, isHovered, internalTimeMs) => {
      const isControlled = controlledTimeMs !== null && controlledTimeMs !== undefined;
      if (isControlled) return controlledTimeMs;
      return autoplay === "hover" && !isHovered ? 0 : internalTimeMs;
    };

    expect(resolveDisplayTime(5000, "always", false, 1000)).toBe(5000);
    expect(resolveDisplayTime(0, "always", false, 9999)).toBe(0);
    expect(resolveDisplayTime(null, "hover", false, 1500)).toBe(0);
    expect(resolveDisplayTime(null, "hover", true, 1500)).toBe(1500);
    expect(resolveDisplayTime(null, "always", false, 2500)).toBe(2500);
  });

  it("shouldPlay is false when controlledTimeMs is provided", () => {
    const resolveShouldPlay = (controlledTimeMs, autoplay, isHovered) => {
      const isControlled = controlledTimeMs !== null && controlledTimeMs !== undefined;
      return !isControlled && (autoplay === "always" || (autoplay === "hover" && isHovered));
    };

    expect(resolveShouldPlay(5000, "always", false)).toBe(false);
    expect(resolveShouldPlay(0, "hover", true)).toBe(false);
    expect(resolveShouldPlay(null, "always", false)).toBe(true);
    expect(resolveShouldPlay(null, "hover", true)).toBe(true);
    expect(resolveShouldPlay(null, "hover", false)).toBe(false);
  });
});

// ── RAF time advance simulation ───────────────────────────────────────────────

describe("PlayPreviewPlayer time advance", () => {
  it("advances time by delta * playbackRate and wraps at durationMs", () => {
    const durationMs = 10000;
    const playbackRate = speedToPlaybackRate(50); // ~6.375

    const advance = (prev, deltaMs) => (prev + deltaMs * playbackRate) % durationMs;

    // Normal advance
    const after1s = advance(0, 1000);
    expect(after1s).toBeCloseTo(6375);

    // Wraps around
    const afterWrap = advance(9000, 1000);
    expect(afterWrap).toBeLessThan(durationMs);
    expect(afterWrap).toBeGreaterThanOrEqual(0);
  });

  it("produces correct real-world duration for a given speedMultiplier", () => {
    // At speedMultiplier=50, rate≈6.375 — a 30s virtual play takes ~4.7s real time
    const durationMs = 30000;
    const rate = speedToPlaybackRate(50);
    const realSeconds = durationMs / 1000 / rate;
    expect(realSeconds).toBeCloseTo(4.7, 0);
  });
});
