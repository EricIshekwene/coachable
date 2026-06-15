/**
 * staffAuthOwner.test.js
 *
 * Tests for the PR-1 surface of staffAuth.js: owner identity helpers and
 * `requireOwnerOrLegacyAdmin` middleware. Pure-logic tests — no HTTP server.
 *
 * `hasValidAdminSession` and the JWT helpers are mocked so this suite tests
 * staffAuth.js's composition logic, not the underlying auth modules.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockState = {
  legacyAdminValid: false,
  tokenToUserId: new Map(), // token string → userId or null
};

vi.mock("../../server/routes/admin.js", () => ({
  hasValidAdminSession: (_req) => mockState.legacyAdminValid,
}));

vi.mock("../../server/middleware/auth.js", () => ({
  readSessionToken: (req) =>
    req.headers?.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : req.cookies?.coachable_session || null,
  verifySessionToken: (token) =>
    token && mockState.tokenToUserId.has(token)
      ? mockState.tokenToUserId.get(token)
      : null,
}));

// SUT imported AFTER mocks are declared (vi.mock is hoisted, so this works).
const {
  getOwnerUserId,
  isOwner,
  resolveOwnerActor,
  requireOwnerOrLegacyAdmin,
} = await import("../../server/middleware/staffAuth.js");

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq({ token, legacy } = {}) {
  mockState.legacyAdminValid = !!legacy;
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    cookies: {},
  };
}

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

const OWNER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  mockState.legacyAdminValid = false;
  mockState.tokenToUserId.clear();
  delete process.env.OWNER_USER_ID;
});

afterEach(() => {
  delete process.env.OWNER_USER_ID;
});

// ── getOwnerUserId ───────────────────────────────────────────────────────────

describe("getOwnerUserId", () => {
  it("returns null when OWNER_USER_ID is unset", () => {
    expect(getOwnerUserId()).toBeNull();
  });

  it("returns null when OWNER_USER_ID is empty/whitespace", () => {
    process.env.OWNER_USER_ID = "   ";
    expect(getOwnerUserId()).toBeNull();
  });

  it("returns the trimmed value when set", () => {
    process.env.OWNER_USER_ID = `  ${OWNER_ID}  `;
    expect(getOwnerUserId()).toBe(OWNER_ID);
  });
});

// ── isOwner ──────────────────────────────────────────────────────────────────

describe("isOwner", () => {
  it("returns false when OWNER_USER_ID is unset", () => {
    expect(isOwner(OWNER_ID)).toBe(false);
  });

  it("returns false for a null/undefined userId", () => {
    process.env.OWNER_USER_ID = OWNER_ID;
    expect(isOwner(null)).toBe(false);
    expect(isOwner(undefined)).toBe(false);
    expect(isOwner("")).toBe(false);
  });

  it("returns false for a non-owner user", () => {
    process.env.OWNER_USER_ID = OWNER_ID;
    expect(isOwner(OTHER_ID)).toBe(false);
  });

  it("returns true for the owner user", () => {
    process.env.OWNER_USER_ID = OWNER_ID;
    expect(isOwner(OWNER_ID)).toBe(true);
  });
});

// ── resolveOwnerActor ────────────────────────────────────────────────────────

describe("resolveOwnerActor", () => {
  it("returns null when no auth is present", () => {
    expect(resolveOwnerActor(makeReq())).toBeNull();
  });

  it("returns legacy_admin actor when admin session is valid (even without OWNER_USER_ID)", () => {
    const actor = resolveOwnerActor(makeReq({ legacy: true }));
    expect(actor).toEqual({
      authMode: "legacy_admin",
      userId: null,
      isOwner: true,
    });
  });

  it("returns legacy_admin actor with userId when OWNER_USER_ID is set", () => {
    process.env.OWNER_USER_ID = OWNER_ID;
    const actor = resolveOwnerActor(makeReq({ legacy: true }));
    expect(actor).toEqual({
      authMode: "legacy_admin",
      userId: OWNER_ID,
      isOwner: true,
    });
  });

  it("returns owner_jwt actor when the JWT subject matches OWNER_USER_ID", () => {
    process.env.OWNER_USER_ID = OWNER_ID;
    mockState.tokenToUserId.set("tok-owner", OWNER_ID);
    const actor = resolveOwnerActor(makeReq({ token: "tok-owner" }));
    expect(actor).toEqual({
      authMode: "owner_jwt",
      userId: OWNER_ID,
      isOwner: true,
    });
  });

  it("returns null for a non-owner JWT", () => {
    process.env.OWNER_USER_ID = OWNER_ID;
    mockState.tokenToUserId.set("tok-other", OTHER_ID);
    expect(resolveOwnerActor(makeReq({ token: "tok-other" }))).toBeNull();
  });

  it("returns null for an invalid token", () => {
    process.env.OWNER_USER_ID = OWNER_ID;
    // tokenToUserId doesn't have this key → verifySessionToken mock returns null
    expect(resolveOwnerActor(makeReq({ token: "tok-bogus" }))).toBeNull();
  });
});

// ── requireOwnerOrLegacyAdmin ────────────────────────────────────────────────

describe("requireOwnerOrLegacyAdmin", () => {
  it("calls next() with legacy admin session and attaches req.actor", () => {
    const req = makeReq({ legacy: true });
    const res = makeRes();
    const next = vi.fn();

    requireOwnerOrLegacyAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.actor).toEqual({
      authMode: "legacy_admin",
      userId: null,
      isOwner: true,
    });
    expect(res.statusCode).toBe(200);
  });

  it("calls next() with owner JWT and attaches req.actor", () => {
    process.env.OWNER_USER_ID = OWNER_ID;
    mockState.tokenToUserId.set("tok-owner", OWNER_ID);
    const req = makeReq({ token: "tok-owner" });
    const res = makeRes();
    const next = vi.fn();

    requireOwnerOrLegacyAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.actor).toEqual({
      authMode: "owner_jwt",
      userId: OWNER_ID,
      isOwner: true,
    });
  });

  it("returns 503 when OWNER_USER_ID is unset and no legacy admin session", () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    requireOwnerOrLegacyAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      error: "Owner not configured. Set OWNER_USER_ID env var.",
    });
  });

  it("returns 401 when no auth is presented (OWNER_USER_ID configured)", () => {
    process.env.OWNER_USER_ID = OWNER_ID;
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    requireOwnerOrLegacyAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Owner authentication required" });
  });

  it("returns 401 when JWT belongs to a non-owner user", () => {
    process.env.OWNER_USER_ID = OWNER_ID;
    mockState.tokenToUserId.set("tok-other", OTHER_ID);
    const req = makeReq({ token: "tok-other" });
    const res = makeRes();
    const next = vi.fn();

    requireOwnerOrLegacyAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("legacy admin session still works as break-glass when OWNER_USER_ID is unset", () => {
    const req = makeReq({ legacy: true });
    const res = makeRes();
    const next = vi.fn();

    requireOwnerOrLegacyAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.actor.authMode).toBe("legacy_admin");
    expect(req.actor.userId).toBeNull();
  });
});
