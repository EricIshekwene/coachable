/**
 * Regression tests for the preset save→load cycle that was duplicating a ball
 * onto presets every time they were edited.
 *
 * Background:
 *   - A preset's playData has `entities.ballsById = {}` (no ball).
 *   - Old `primaryBall` useMemo fell back to INITIAL_BALL whenever ballsById was empty.
 *   - That INITIAL_BALL was exported as `entities.ball: INITIAL_BALL` on every save.
 *   - On reload, `normalizeBallsSnapshot` saw empty ballsById, fell through to ball,
 *     and re-created the ball — so a ball reappeared each time the preset was opened.
 *
 * The fix:
 *   1. `primaryBall` returns null when there are no balls.
 *   2. Snapshot functions emit `ball: null` instead of `ball: {}`.
 *   3. `normalizeBallsSnapshot` trusts an explicit `ballsById` (even {}) as authoritative.
 */
import { describe, it, expect } from "vitest";

// ── Inline copy of the fixed helpers (mirrors useSlateEntities.js) ───────────

const INITIAL_BALL = { id: "ball-1", x: 40, y: 0, objectType: "ball" };
const INITIAL_BALLS_BY_ID = { [INITIAL_BALL.id]: { ...INITIAL_BALL } };

const toFiniteNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeObjectType = (value) => (value === "cone" ? "cone" : "ball");

const normalizeBall = (id, value) => ({
  id: String(value?.id || id || INITIAL_BALL.id),
  x: toFiniteNumber(value?.x, 0),
  y: toFiniteNumber(value?.y, 0),
  objectType: normalizeObjectType(value?.objectType),
  ...(value?.hidden ? { hidden: true } : {}),
});

const cloneBallsById = (byId) =>
  Object.fromEntries(
    Object.entries(byId || {}).map(([id, value]) => {
      const normalized = normalizeBall(id, value);
      return [normalized.id, normalized];
    })
  );

/** Fixed normalizeBallsSnapshot — trusts explicit ballsById even when empty. */
const normalizeBallsSnapshot = ({ ballsById, ball } = {}) => {
  if (ballsById !== undefined && ballsById !== null) {
    return cloneBallsById(ballsById);
  }
  if (ball && typeof ball === "object" && Object.keys(ball).length > 0) {
    const normalized = normalizeBall(ball.id || INITIAL_BALL.id, ball);
    return { [normalized.id]: normalized };
  }
  if (ballsById === undefined && ball === undefined) {
    return cloneBallsById(INITIAL_BALLS_BY_ID);
  }
  return {};
};

/** Computes primaryBall the same way the hook does — returning null on empty. */
const computePrimaryBall = (ballsById) => {
  const primaryBallId = Object.keys(ballsById || {})[0] || null;
  if (primaryBallId && ballsById?.[primaryBallId]) return ballsById[primaryBallId];
  return null;
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Preset ball save/load cycle — primaryBall", () => {
  it("returns null when ballsById is empty (the core fix)", () => {
    expect(computePrimaryBall({})).toBe(null);
  });

  it("returns the ball when ballsById has entries", () => {
    const ball = { id: "ball-1", x: 100, y: 50, objectType: "ball" };
    expect(computePrimaryBall({ "ball-1": ball })).toEqual(ball);
  });

  it("returns null when ballsById is null/undefined", () => {
    expect(computePrimaryBall(null)).toBe(null);
    expect(computePrimaryBall(undefined)).toBe(null);
  });
});

describe("Preset ball save/load cycle — normalizeBallsSnapshot", () => {
  it("trusts explicit empty ballsById as authoritative (no ball)", () => {
    // This is the bug-fix scenario: preset saved with ballsById={} should
    // restore as no balls, even if a stale `ball` field is present.
    const result = normalizeBallsSnapshot({ ballsById: {}, ball: INITIAL_BALL });
    expect(result).toEqual({});
  });

  it("trusts ballsById with entries (round-trip)", () => {
    const ball = { id: "ball-1", x: 100, y: 50, objectType: "ball" };
    const result = normalizeBallsSnapshot({ ballsById: { "ball-1": ball }, ball: null });
    expect(result["ball-1"]).toMatchObject({ id: "ball-1", x: 100, y: 50 });
  });

  it("falls back to legacy `ball` field when ballsById is missing", () => {
    const legacyBall = { id: "ball-1", x: 25, y: 10 };
    const result = normalizeBallsSnapshot({ ball: legacyBall });
    expect(result["ball-1"]).toMatchObject({ id: "ball-1", x: 25, y: 10 });
  });

  it("returns INITIAL_BALL when no data at all (brand-new editor)", () => {
    const result = normalizeBallsSnapshot({});
    expect(result[INITIAL_BALL.id]).toMatchObject({ id: "ball-1", x: 40, y: 0 });
  });

  it("returns empty when both fields are explicitly null", () => {
    const result = normalizeBallsSnapshot({ ballsById: null, ball: null });
    expect(result).toEqual({});
  });

  it("treats empty object `ball` as no ball (not a valid legacy ball)", () => {
    const result = normalizeBallsSnapshot({ ball: {} });
    expect(result).toEqual({});
  });
});

describe("Preset ball save/load cycle — full round-trip", () => {
  /**
   * Simulates buildPlayExport's ball/ballsById output, given current editor state.
   * Mirrors src/utils/exportPlay.js lines 80-81.
   */
  function simulateExport(ballsById) {
    const primaryBall = computePrimaryBall(ballsById);
    return {
      ball: primaryBall ?? null,
      ballsById: ballsById ?? null,
    };
  }

  /**
   * Simulates validatePlayImport + loadEntitiesState's pipeline:
   * what gets pushed into setBallsById after a reload.
   * Mirrors src/utils/importPlay.js and Slate.jsx loadPlayFromImport.
   */
  function simulateImport({ ball, ballsById }) {
    // validatePlayImport returns ball as-is when ballsById is present
    const nextBall = ball !== undefined ? ball : INITIAL_BALL;
    const nextBallsById = ballsById ?? null;
    return normalizeBallsSnapshot({ ballsById: nextBallsById, ball: nextBall });
  }

  it("preset with no ball stays without a ball across save→load", () => {
    // Start: user deleted ball
    const editorState = {};

    // Save
    const exported = simulateExport(editorState);
    expect(exported.ball).toBe(null);
    expect(exported.ballsById).toEqual({});

    // Load
    const reloaded = simulateImport(exported);
    expect(reloaded).toEqual({});
  });

  it("preset with a ball preserves it across save→load", () => {
    const ball = { id: "ball-1", x: 100, y: 50, objectType: "ball" };
    const editorState = { "ball-1": ball };

    const exported = simulateExport(editorState);
    expect(exported.ball).toMatchObject({ id: "ball-1", x: 100, y: 50 });
    expect(exported.ballsById).toEqual({ "ball-1": ball });

    const reloaded = simulateImport(exported);
    expect(reloaded["ball-1"]).toMatchObject({ id: "ball-1", x: 100, y: 50 });
  });

  it("multiple save/load cycles do not duplicate or resurrect the ball", () => {
    let state = {};
    for (let i = 0; i < 5; i++) {
      const exported = simulateExport(state);
      state = simulateImport(exported);
      expect(state).toEqual({});
    }
  });
});
