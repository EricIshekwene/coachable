/**
 * adminDangerMode.test.js
 *
 * Tests for the Danger Mode (elevated admin permissions) system.
 * Covers the client-side adminElevation utility and the server-side
 * elevation flow logic.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isAdminElevated,
  getAdminElevatedUntil,
  setAdminElevated,
  clearAdminElevated,
  ELEVATED_TTL_MS,
} from "../../src/utils/adminElevation.js";

// ── Utility tests ─────────────────────────────────────────────────────────────

describe("adminElevation utility", () => {
  beforeEach(() => {
    clearAdminElevated();
  });

  afterEach(() => {
    clearAdminElevated();
  });

  it("isAdminElevated returns false when no elevation stored", () => {
    expect(isAdminElevated()).toBe(false);
  });

  it("getAdminElevatedUntil returns 0 when no elevation stored", () => {
    expect(getAdminElevatedUntil()).toBe(0);
  });

  it("setAdminElevated stores a future timestamp", () => {
    const future = Date.now() + ELEVATED_TTL_MS;
    setAdminElevated(future);
    expect(getAdminElevatedUntil()).toBe(future);
  });

  it("isAdminElevated returns true when timestamp is in the future", () => {
    setAdminElevated(Date.now() + 60_000);
    expect(isAdminElevated()).toBe(true);
  });

  it("isAdminElevated returns false when timestamp is in the past", () => {
    setAdminElevated(Date.now() - 1);
    expect(isAdminElevated()).toBe(false);
  });

  it("clearAdminElevated removes elevation", () => {
    setAdminElevated(Date.now() + 60_000);
    clearAdminElevated();
    expect(isAdminElevated()).toBe(false);
    expect(getAdminElevatedUntil()).toBe(0);
  });

  it("ELEVATED_TTL_MS is 10 minutes", () => {
    expect(ELEVATED_TTL_MS).toBe(10 * 60 * 1000);
  });
});

// ── Server-side elevation logic (pure logic tests, no HTTP) ──────────────────

describe("requireElevated logic", () => {
  /**
   * Simulate the server-side elevation check.
   * @param {{ elevatedAt: number|null, expiresAt: number }} session
   * @param {number} elevatedTtlMs
   * @returns {"ok"|"unauthorized"|"elevation_required"}
   */
  function checkElevation(session, elevatedTtlMs = ELEVATED_TTL_MS) {
    if (!session) return "unauthorized";
    if (Date.now() > session.expiresAt) return "unauthorized";
    if (!session.elevatedAt || Date.now() - session.elevatedAt > elevatedTtlMs) {
      return "elevation_required";
    }
    return "ok";
  }

  it("returns elevation_required for a fresh (non-elevated) session", () => {
    const session = { expiresAt: Date.now() + 7_200_000, elevatedAt: null };
    expect(checkElevation(session)).toBe("elevation_required");
  });

  it("returns ok for a recently elevated session", () => {
    const session = { expiresAt: Date.now() + 7_200_000, elevatedAt: Date.now() };
    expect(checkElevation(session)).toBe("ok");
  });

  it("returns elevation_required when elevation has expired", () => {
    const elevatedTtlMs = 1000;
    const session = {
      expiresAt: Date.now() + 7_200_000,
      elevatedAt: Date.now() - elevatedTtlMs - 1,
    };
    expect(checkElevation(session, elevatedTtlMs)).toBe("elevation_required");
  });

  it("returns unauthorized for an expired session", () => {
    const session = { expiresAt: Date.now() - 1, elevatedAt: Date.now() };
    expect(checkElevation(session)).toBe("unauthorized");
  });

  it("returns unauthorized for a null session", () => {
    expect(checkElevation(null)).toBe("unauthorized");
  });
});
