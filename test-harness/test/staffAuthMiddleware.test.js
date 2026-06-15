/**
 * staffAuthMiddleware.test.js
 *
 * Tests for the PR-2 middleware family in staffAuth.js:
 *   - requireAdminOrStaff (legacy_admin | owner_jwt | staff)
 *   - requirePerm
 *   - requireSportScope
 *   - redactByPerm
 *   - writeAudit
 *
 * Module-level pool, JWT verifier, and admin-session probe are mocked so
 * we test composition logic, not the underlying infra.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockState = {
  legacyAdminValid: false,
  tokenToUserId: new Map(),
  staffRows: new Map(),     // userId → { permissions, roleId?, roleName?, roleDescription?, rolePermissions? }
  auditInserts: [],
};

vi.mock("../../server/routes/admin.js", () => ({
  hasValidAdminSession: () => mockState.legacyAdminValid,
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

vi.mock("../../server/db/pool.js", () => ({
  default: {
    query: async (sql, params) => {
      if (sql.includes("FROM staff_admins")) {
        const userId = params[0];
        const row = mockState.staffRows.get(userId);
        if (row === undefined) return { rows: [] };
        if (row && typeof row === "object" && !Array.isArray(row) && Object.prototype.hasOwnProperty.call(row, "permissions")) {
          return {
            rows: [{
              role_id: row.roleId || null,
              role_name: row.roleName || null,
              role_description: row.roleDescription || null,
              role_permissions: row.rolePermissions ?? {},
              permissions: row.permissions,
            }],
          };
        }
        return { rows: [{ role_id: null, role_name: null, role_description: null, role_permissions: {}, permissions: row }] };
      }
      if (sql.includes("INSERT INTO admin_audit_log")) {
        const [authMode, userId, action, targetType, targetId, metadata] = params;
        mockState.auditInserts.push({
          authMode, userId, action, targetType, targetId, metadata,
        });
        return { rows: [] };
      }
      throw new Error("Unmocked query: " + sql);
    },
  },
}));

const {
  getPermissionAtPath,
  actorHasPerm,
  actorHasSportScope,
  mergeStaffPermissions,
  resolveActor,
  requireAdminOrStaff,
  requirePerm,
  requireSportScope,
  redactByPerm,
  writeAudit,
} = await import("../../server/middleware/staffAuth.js");

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq({ token, legacy, params, query } = {}) {
  mockState.legacyAdminValid = !!legacy;
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    cookies: {},
    params: params || {},
    query: query || {},
  };
}

function makeRes() {
  const res = {
    statusCode: 200,
    body: null,
    _jsonCalled: false,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this._jsonCalled = true; this.body = payload; return this; },
  };
  return res;
}

const OWNER = "00000000-0000-0000-0000-000000000001";
const STAFF_A = "00000000-0000-0000-0000-0000000000a1";
const RANDO = "00000000-0000-0000-0000-0000000000ff";

beforeEach(() => {
  mockState.legacyAdminValid = false;
  mockState.tokenToUserId.clear();
  mockState.staffRows.clear();
  mockState.auditInserts.length = 0;
  process.env.OWNER_USER_ID = OWNER;
});

afterEach(() => {
  delete process.env.OWNER_USER_ID;
});

// ── getPermissionAtPath ──────────────────────────────────────────────────────

describe("getPermissionAtPath", () => {
  it("returns undefined for null/non-object roots", () => {
    expect(getPermissionAtPath(null, "a.b")).toBeUndefined();
    expect(getPermissionAtPath(undefined, "a.b")).toBeUndefined();
    expect(getPermissionAtPath("nope", "a.b")).toBeUndefined();
  });

  it("walks a dotted path", () => {
    const p = { users: { viewEmails: true, viewTable: false } };
    expect(getPermissionAtPath(p, "users.viewEmails")).toBe(true);
    expect(getPermissionAtPath(p, "users.viewTable")).toBe(false);
  });

  it("returns undefined on missing segments", () => {
    const p = { users: { viewEmails: true } };
    expect(getPermissionAtPath(p, "users.missing")).toBeUndefined();
    expect(getPermissionAtPath(p, "missing.deeper")).toBeUndefined();
  });

  it("returns array values intact", () => {
    const p = { plays: { sportScope: ["rugby", "football"] } };
    expect(getPermissionAtPath(p, "plays.sportScope")).toEqual(["rugby", "football"]);
  });
});

// ── actorHasPerm / actorHasSportScope ────────────────────────────────────────

describe("actorHasPerm", () => {
  it("returns true for owner regardless of perms", () => {
    expect(actorHasPerm({ isOwner: true, permissions: null }, "anything")).toBe(true);
  });

  it("returns true when staff perm is exactly true", () => {
    expect(actorHasPerm({ isOwner: false, permissions: { x: { y: true } } }, "x.y")).toBe(true);
  });

  it("returns false when staff perm is missing or non-true", () => {
    expect(actorHasPerm({ isOwner: false, permissions: {} }, "x.y")).toBe(false);
    expect(actorHasPerm({ isOwner: false, permissions: { x: { y: false } } }, "x.y")).toBe(false);
    expect(actorHasPerm({ isOwner: false, permissions: { x: { y: "true" } } }, "x.y")).toBe(false);
  });
});

describe("actorHasSportScope", () => {
  it("owner always passes", () => {
    expect(actorHasSportScope({ isOwner: true, permissions: null }, "p", "rugby")).toBe(true);
  });

  it('"*" scope passes for any sport', () => {
    const a = { isOwner: false, permissions: { p: "*" } };
    expect(actorHasSportScope(a, "p", "rugby")).toBe(true);
    expect(actorHasSportScope(a, "p", "football")).toBe(true);
  });

  it("array scope passes only for listed sports", () => {
    const a = { isOwner: false, permissions: { p: ["rugby"] } };
    expect(actorHasSportScope(a, "p", "rugby")).toBe(true);
    expect(actorHasSportScope(a, "p", "football")).toBe(false);
  });

  it("missing scope denies", () => {
    expect(actorHasSportScope({ isOwner: false, permissions: {} }, "p", "rugby")).toBe(false);
  });
});

describe("mergeStaffPermissions", () => {
  it("returns the role permissions when no overrides exist", () => {
    expect(mergeStaffPermissions({ tests: { run: true } }, null)).toEqual({ tests: { run: true } });
  });

  it("lets overrides add and remove nested permissions", () => {
    expect(
      mergeStaffPermissions(
        {
          plays: { viewFolders: true, rename: true, sportScope: ["rugby", "football"] },
          tests: { run: true },
        },
        {
          plays: { rename: false, sportScope: ["rugby"] },
          tests: { run: false },
          issues: { view: true },
        }
      )
    ).toEqual({
      plays: { viewFolders: true, rename: false, sportScope: ["rugby"] },
      tests: { run: false },
      issues: { view: true },
    });
  });
});

// ── resolveActor ─────────────────────────────────────────────────────────────

describe("resolveActor", () => {
  it("returns legacy_admin actor when legacy session is valid", async () => {
    const actor = await resolveActor(makeReq({ legacy: true }));
    expect(actor).toEqual({
      authMode: "legacy_admin", userId: OWNER, isOwner: true, permissions: null,
    });
  });

  it("returns owner_jwt actor for owner JWT", async () => {
    mockState.tokenToUserId.set("t-owner", OWNER);
    const actor = await resolveActor(makeReq({ token: "t-owner" }));
    expect(actor).toEqual({
      authMode: "owner_jwt", userId: OWNER, isOwner: true, permissions: null,
    });
  });

  it("returns staff actor for non-owner with active staff_admins row", async () => {
    mockState.tokenToUserId.set("t-staff", STAFF_A);
    mockState.staffRows.set(STAFF_A, { permissions: { dashboard: { viewAnalytics: true } } });
    const actor = await resolveActor(makeReq({ token: "t-staff" }));
    expect(actor).toEqual({
      authMode: "staff",
      userId: STAFF_A,
      isOwner: false,
      roleId: null,
      roleName: null,
      roleDescription: null,
      rolePermissions: {},
      permissionOverrides: { dashboard: { viewAnalytics: true } },
      permissions: { dashboard: { viewAnalytics: true } },
    });
  });

  it("returns null for non-owner user with no staff row", async () => {
    mockState.tokenToUserId.set("t-rando", RANDO);
    expect(await resolveActor(makeReq({ token: "t-rando" }))).toBeNull();
  });

  it("returns null when no auth", async () => {
    expect(await resolveActor(makeReq())).toBeNull();
  });

  it("normalizes null permissions to {} for a staff row", async () => {
    mockState.tokenToUserId.set("t-staff", STAFF_A);
    mockState.staffRows.set(STAFF_A, { permissions: null });
    const actor = await resolveActor(makeReq({ token: "t-staff" }));
    expect(actor.permissions).toEqual({});
  });

  it("merges role permissions with staff overrides", async () => {
    mockState.tokenToUserId.set("t-staff", STAFF_A);
    mockState.staffRows.set(STAFF_A, {
      roleId: "role-1",
      roleName: "Contractor",
      roleDescription: "Baseline contractor access",
      rolePermissions: { plays: { viewFolders: true, rename: true, sportScope: ["rugby", "football"] } },
      permissions: { plays: { rename: false, sportScope: ["rugby"] }, tests: { run: true } },
    });
    const actor = await resolveActor(makeReq({ token: "t-staff" }));
    expect(actor.roleId).toBe("role-1");
    expect(actor.permissionOverrides).toEqual({
      plays: { rename: false, sportScope: ["rugby"] },
      tests: { run: true },
    });
    expect(actor.permissions).toEqual({
      plays: { viewFolders: true, rename: false, sportScope: ["rugby"] },
      tests: { run: true },
    });
  });
});

// ── requireAdminOrStaff middleware ───────────────────────────────────────────

describe("requireAdminOrStaff", () => {
  it("attaches actor and calls next() for legacy admin", async () => {
    const req = makeReq({ legacy: true });
    const res = makeRes();
    const next = vi.fn();
    await requireAdminOrStaff(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.actor.authMode).toBe("legacy_admin");
  });

  it("attaches actor and calls next() for staff", async () => {
    mockState.tokenToUserId.set("t", STAFF_A);
    mockState.staffRows.set(STAFF_A, { permissions: { dashboard: { viewAnalytics: true } } });
    const req = makeReq({ token: "t" });
    const res = makeRes();
    const next = vi.fn();
    await requireAdminOrStaff(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.actor.authMode).toBe("staff");
  });

  it("401s with no auth", async () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();
    await requireAdminOrStaff(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("401s for non-owner JWT with no staff row", async () => {
    mockState.tokenToUserId.set("t", RANDO);
    const req = makeReq({ token: "t" });
    const res = makeRes();
    const next = vi.fn();
    await requireAdminOrStaff(req, res, next);
    expect(res.statusCode).toBe(401);
  });
});

// ── requirePerm ──────────────────────────────────────────────────────────────

describe("requirePerm", () => {
  it("passes for owner", () => {
    const req = { actor: { isOwner: true, permissions: null } };
    const res = makeRes();
    const next = vi.fn();
    requirePerm("anything")(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("passes for staff with the permission", () => {
    const req = { actor: { isOwner: false, permissions: { users: { viewTable: true } } } };
    const res = makeRes();
    const next = vi.fn();
    requirePerm("users.viewTable")(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("403s for staff without the permission", () => {
    const req = { actor: { isOwner: false, permissions: { users: {} } } };
    const res = makeRes();
    const next = vi.fn();
    requirePerm("users.viewTable")(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.missingPermission).toBe("users.viewTable");
  });
});

// ── requireSportScope ────────────────────────────────────────────────────────

describe("requireSportScope", () => {
  it("passes for owner without checking scope", async () => {
    const req = makeReq({ params: { sport: "anything" } });
    req.actor = { isOwner: true, permissions: null };
    const next = vi.fn();
    await requireSportScope("plays.sportScope")(req, makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("passes for staff when sport is in the scope", async () => {
    const req = makeReq({ params: { sport: "rugby" } });
    req.actor = { isOwner: false, permissions: { plays: { sportScope: ["rugby"] } } };
    const next = vi.fn();
    await requireSportScope("plays.sportScope")(req, makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("403s when sport not in scope", async () => {
    const req = makeReq({ params: { sport: "football" } });
    req.actor = { isOwner: false, permissions: { plays: { sportScope: ["rugby"] } } };
    const res = makeRes();
    const next = vi.fn();
    await requireSportScope("plays.sportScope")(req, res, next);
    expect(res.statusCode).toBe(403);
  });

  it("400s when sport cannot be resolved", async () => {
    const req = makeReq({ params: {} });
    req.actor = { isOwner: false, permissions: { plays: { sportScope: ["rugby"] } } };
    const res = makeRes();
    const next = vi.fn();
    await requireSportScope("plays.sportScope")(req, res, next);
    expect(res.statusCode).toBe(400);
  });

  it("supports a custom sport resolver", async () => {
    const req = makeReq();
    req.actor = { isOwner: false, permissions: { plays: { sportScope: ["football"] } } };
    const next = vi.fn();
    await requireSportScope("plays.sportScope", () => "football")(req, makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });
});

// ── redactByPerm ─────────────────────────────────────────────────────────────

describe("redactByPerm", () => {
  it("no-ops for owner", () => {
    const req = { actor: { isOwner: true, permissions: null } };
    const res = makeRes();
    const originalJson = res.json;
    redactByPerm({ email: { perm: "users.viewEmails", mask: "email" } })(req, res, vi.fn());
    expect(res.json).toBe(originalJson);
  });

  it("masks fields the staff cannot see (single object payload)", () => {
    const req = { actor: { isOwner: false, permissions: { users: { viewEmails: false } } } };
    const res = makeRes();
    redactByPerm({ email: { perm: "users.viewEmails", mask: "email" } })(req, res, vi.fn());
    res.json({ id: 1, email: "alice@example.com", name: "Alice" });
    expect(res.body.email).toBe("a*****@example.com");
    expect(res.body.name).toBe("Alice");
  });

  it("masks fields across an array payload", () => {
    const req = { actor: { isOwner: false, permissions: { users: { viewEmails: false } } } };
    const res = makeRes();
    redactByPerm({ email: { perm: "users.viewEmails", mask: "email" } })(req, res, vi.fn());
    res.json([
      { id: 1, email: "alice@example.com" },
      { id: 2, email: "bob@example.com" },
    ]);
    expect(res.body[0].email).toBe("a*****@example.com");
    expect(res.body[1].email).toBe("b*****@example.com");
  });

  it("does NOT mask when permission IS granted", () => {
    const req = { actor: { isOwner: false, permissions: { users: { viewEmails: true } } } };
    const res = makeRes();
    redactByPerm({ email: { perm: "users.viewEmails", mask: "email" } })(req, res, vi.fn());
    res.json({ email: "alice@example.com" });
    expect(res.body.email).toBe("alice@example.com");
  });

  it("supports username + email masking together", () => {
    const req = {
      actor: { isOwner: false, permissions: { users: { viewEmails: false, viewUsernames: false } } },
    };
    const res = makeRes();
    redactByPerm({
      email: { perm: "users.viewEmails", mask: "email" },
      name: { perm: "users.viewUsernames", mask: "username" },
    })(req, res, vi.fn());
    res.json({ id: 1, email: "alice@example.com", name: "Alice" });
    expect(res.body.email).toBe("a*****@example.com");
    expect(res.body.name).toBe("Hidden user");
  });

  it("masks nested user rows inside an object payload", () => {
    const req = {
      actor: { isOwner: false, permissions: { users: { viewEmails: false, viewUsernames: false } } },
    };
    const res = makeRes();
    redactByPerm({
      email: { perm: "users.viewEmails", mask: "email" },
      name: { perm: "users.viewUsernames", mask: "username" },
    })(req, res, vi.fn());
    res.json({
      users: [
        { id: 1, email: "alice@example.com", name: "Alice" },
        { id: 2, email: "bob@example.com", name: "Bob" },
      ],
    });
    expect(res.body.users[0].email).toBe("a*****@example.com");
    expect(res.body.users[0].name).toBe("Hidden user");
    expect(res.body.users[1].email).toBe("b*****@example.com");
    expect(res.body.users[1].name).toBe("Hidden user");
  });
});

// ── writeAudit ───────────────────────────────────────────────────────────────

describe("writeAudit", () => {
  it("inserts a row with actor mode + userId + action", async () => {
    const req = { actor: { authMode: "staff", userId: STAFF_A } };
    await writeAudit(req, "play.delete", { targetType: "play", targetId: "p-1" });
    expect(mockState.auditInserts).toHaveLength(1);
    expect(mockState.auditInserts[0]).toMatchObject({
      authMode: "staff",
      userId: STAFF_A,
      action: "play.delete",
      targetType: "play",
      targetId: "p-1",
    });
  });

  it("attributes legacy_admin to OWNER_USER_ID", async () => {
    const req = { actor: { authMode: "legacy_admin", userId: OWNER } };
    await writeAudit(req, "user.editStatus", { metadata: { newStatus: "active" } });
    expect(mockState.auditInserts[0].userId).toBe(OWNER);
    expect(mockState.auditInserts[0].authMode).toBe("legacy_admin");
    expect(mockState.auditInserts[0].metadata).toEqual({ newStatus: "active" });
  });

  it("is a no-op when req.actor is missing (does not throw)", async () => {
    await expect(writeAudit({}, "x.y")).resolves.toBeUndefined();
    expect(mockState.auditInserts).toHaveLength(0);
  });
});
