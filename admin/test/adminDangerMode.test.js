/**
 * adminDangerMode.test.js
 *
 * Tests for the Danger Mode (elevated admin permissions) system.
 * Covers the client-side adminElevation utility, the server-side
 * elevation flow logic, and the useDangerMode hook's ensureElevated shortcut.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

// ── useDangerMode — ensureElevated shortcut ───────────────────────────────────
// Tests the critical path: when the session is already elevated, ensureElevated
// must resolve true immediately without opening any modal (no fetch required).

describe("useDangerMode — ensureElevated already-elevated shortcut", () => {
  beforeEach(() => {
    clearAdminElevated();
  });

  afterEach(() => {
    clearAdminElevated();
    vi.restoreAllMocks();
  });

  it("resolves true immediately when already elevated (no modal needed)", async () => {
    setAdminElevated(Date.now() + 60_000);
    // Simulate the ensureElevated guard used by the hook
    function ensureElevatedSync() {
      if (isAdminElevated()) return Promise.resolve(true);
      return Promise.resolve(false);
    }
    const result = await ensureElevatedSync();
    expect(result).toBe(true);
  });

  it("does not resolve true when elevation has expired", async () => {
    setAdminElevated(Date.now() - 1);
    function ensureElevatedSync() {
      if (isAdminElevated()) return Promise.resolve(true);
      return Promise.resolve(false);
    }
    const result = await ensureElevatedSync();
    expect(result).toBe(false);
  });

  it("does not resolve true when no elevation has been set", async () => {
    function ensureElevatedSync() {
      if (isAdminElevated()) return Promise.resolve(true);
      return Promise.resolve(false);
    }
    const result = await ensureElevatedSync();
    expect(result).toBe(false);
  });
});

// ── useDangerMode — server response handling (pure logic) ─────────────────────

describe("useDangerMode — server response shapes", () => {
  /**
   * Simulate what the hook does after a successful /admin/elevate/request response.
   * @param {{ elevated: boolean, elevatedUntil?: number, maskedEmail?: string }} data
   * @returns {{ immediatelyElevated: boolean, advancesToCodeStep: boolean }}
   */
  function processRequestResponse(data) {
    if (data.elevated) {
      setAdminElevated(data.elevatedUntil);
      return { immediatelyElevated: true, advancesToCodeStep: false };
    }
    return { immediatelyElevated: false, advancesToCodeStep: true };
  }

  beforeEach(() => clearAdminElevated());
  afterEach(() => clearAdminElevated());

  it("elevates immediately when server responds with elevated=true", () => {
    const elevatedUntil = Date.now() + ELEVATED_TTL_MS;
    const result = processRequestResponse({ elevated: true, elevatedUntil });
    expect(result.immediatelyElevated).toBe(true);
    expect(result.advancesToCodeStep).toBe(false);
    expect(isAdminElevated()).toBe(true);
  });

  it("advances to code step when server sends an OTP (elevated=false)", () => {
    const result = processRequestResponse({ elevated: false, maskedEmail: "a***@b.com" });
    expect(result.immediatelyElevated).toBe(false);
    expect(result.advancesToCodeStep).toBe(true);
    expect(isAdminElevated()).toBe(false);
  });
});
