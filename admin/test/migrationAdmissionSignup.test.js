// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "../../server/node_modules/express/index.js";

const recorded = vi.hoisted(() => ({ sql: [] }));

vi.mock("../../server/node_modules/bcrypt/bcrypt.js", () => ({ default: { hash: vi.fn(async () => "hash"), compare: vi.fn(async () => false) } }));
vi.mock("../../server/db/pool.js", () => {
  const client = {
    query: vi.fn(async (sql) => {
      recorded.sql.push(String(sql));
      if (/INSERT INTO users/i.test(sql)) return { rows: [{ id: "user-1", name: "Nia Coach", email: "nia@example.test", onboarded_at: null, created_at: "2026-09-16T00:00:00.000Z" }] };
      return { rows: [] };
    }),
    release: vi.fn(),
  };
  return { default: { connect: vi.fn(async () => client), query: vi.fn(async () => ({ rows: [] })), __client: client } };
});
vi.mock("../../server/lib/migrationAdmission.js", () => ({
  resolveTargetCodeAdmission: vi.fn(async () => ({ outcome: "v2_live", teamId: "team-1" })),
  hasUsableV1Membership: vi.fn(async () => false),
  requestV2CodeHandoff: vi.fn(async () => ({ opaque: true })),
  sendAdmissionInProgress: vi.fn((res) => res.status(409).json({ code: "MIGRATION_IN_PROGRESS" })),
  CROSS_VERSION_REVIEW: "CROSS_VERSION_REVIEW",
}));
vi.mock("../../server/lib/migrationAdmissionAudit.js", () => ({ recordResolverDecision: vi.fn(async () => {}), credentialFingerprint: vi.fn(() => "fp") }));
vi.mock("../../server/middleware/rateLimit.js", () => ({ authLimiter: (_r, _s, n) => n(), emailLimiter: (_r, _s, n) => n() }));
vi.mock("../../server/middleware/auth.js", () => ({ signToken: vi.fn(() => "tok"), setSessionCookie: vi.fn(), clearSessionCookie: vi.fn(), requireAuth: (_r, _s, n) => n() }));
vi.mock("../../server/lib/email.js", () => ({ generateCode: vi.fn(() => "000000"), sendVerificationEmail: vi.fn(), sendPasswordResetEmail: vi.fn() }));
vi.mock("../../server/lib/userTeams.js", () => ({ resolveActiveTeam: vi.fn(async () => null) }));

const { default: authRouter } = await import("../../server/routes/auth.js");
const { default: pool } = await import("../../server/db/pool.js");
const { resolveTargetCodeAdmission } = await import("../../server/lib/migrationAdmission.js");
let server; let baseUrl;
beforeEach(async () => { recorded.sql = []; pool.__client.query.mockClear(); const app = express(); app.use(express.json()); app.use("/auth", authRouter); await new Promise((r) => { server = app.listen(0, r); }); baseUrl = `http://127.0.0.1:${server.address().port}`; });
afterEach(async () => { await new Promise((r) => server.close(r)); vi.clearAllMocks(); });
const body = { name: "Nia Coach", email: "nia@example.test", password: "correct-horse-battery", inviteCode: "TEAMCODE1" };
const signup = () => fetch(`${baseUrl}/auth/signup`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const issued = (pattern) => recorded.sql.some((sql) => pattern.test(sql));

describe("POST /auth/signup migrated target ordering", () => {
  it.each(["v2_live", "in_progress"])("%s creates no V1 identity or membership", async (outcome) => {
    resolveTargetCodeAdmission.mockResolvedValueOnce({ outcome, teamId: "team-1" });
    const response = await signup();
    expect(response.status).toBe(409);
    expect(issued(/INSERT INTO users/i)).toBe(false);
    expect(issued(/INSERT INTO team_memberships/i)).toBe(false);
    expect(issued(/INSERT INTO user_preferences/i)).toBe(false);
    expect(issued(/\bROLLBACK\b/i)).toBe(true);
    expect(issued(/\bCOMMIT\b/i)).toBe(false);
  });

  it("positive control: v1_only creates the V1 user and commits", async () => {
    resolveTargetCodeAdmission.mockResolvedValueOnce({ outcome: "v1_only", teamId: "team-1" });
    const response = await signup();
    expect(response.status).toBe(201);
    expect(issued(/INSERT INTO users/i)).toBe(true);
    expect(issued(/\bCOMMIT\b/i)).toBe(true);
  });
});
