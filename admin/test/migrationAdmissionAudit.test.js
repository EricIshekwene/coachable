import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.ADMIN_HASH ||= "test-admin-hash";
});
import {
  credentialFingerprint,
  getPostFenceMembershipEvidence,
  recordResolverDecision,
} from "../../server/lib/migrationAdmissionAudit.js";
import {
  createMigrationAdmissionAuditRouter,
  parseTerminalReleaseRequest,
} from "../../server/routes/migrationAdmissionAudit.js";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "22222222-2222-4222-8222-222222222222";
const EVIDENCE_ID = "33333333-3333-4333-8333-333333333333";

describe("migration admission audit evidence", () => {
  it("fingerprints a standing code without retaining the credential", () => {
    const fingerprint = credentialFingerprint("  a1b2  ");
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint).not.toContain("A1B2");
  });

  it("records a resolver refusal with the fingerprint but never the raw standing code", async () => {
    const database = { query: vi.fn(async () => ({ rows: [] })) };
    const fingerprint = credentialFingerprint("A1B2");
    await recordResolverDecision(database, {
      teamId: TEAM_ID, decision: "in_progress", source: "teams.join", credentialFingerprint: fingerprint,
    });
    const [, values] = database.query.mock.calls[0];
    expect(values).toContain(fingerprint);
    expect(values).not.toContain("A1B2");
    expect(database.query.mock.calls[0][0]).toContain("resolver_decision");
  });

  it("returns post-fence membership evidence with IDs, timestamps, and a fingerprint only", async () => {
    const database = {
      query: vi.fn(async () => ({ rows: [{
        team_id: TEAM_ID, fence_generation: JOB_ID, migration_job_id: JOB_ID,
        acknowledged_at: "2026-09-15T01:00:00.000Z", released_at: null,
        membership_id: "44444444-4444-4444-8444-444444444444",
        user_id: "55555555-5555-4555-8555-555555555555",
        joined_at: "2026-09-15T01:01:00.000Z",
      }] })),
    };
    const evidence = await getPostFenceMembershipEvidence(database, TEAM_ID);
    expect(evidence[0]).toMatchObject({ teamId: TEAM_ID, fenceGeneration: JOB_ID, acknowledgedAt: "2026-09-15T01:00:00.000Z" });
    expect(evidence[0].membership).toMatchObject({ id: "44444444-4444-4444-8444-444444444444", joinedAt: "2026-09-15T01:01:00.000Z" });
    expect(evidence[0].membership.evidenceFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(database.query.mock.calls[0][0]).toContain("tm.joined_at >= f.acknowledged_at");
  });

  it("requires a terminal outcome and recorded V2 rollback evidence identifier", () => {
    expect(parseTerminalReleaseRequest({
      teamId: TEAM_ID, fenceGeneration: JOB_ID, terminalOutcome: "rollback",
      v2RollbackEvidenceId: EVIDENCE_ID, v2RollbackCompletedAt: "2026-09-15T01:02:00.000Z",
    })).toMatchObject({ ok: true });
    expect(parseTerminalReleaseRequest({ teamId: TEAM_ID, fenceGeneration: JOB_ID, terminalOutcome: "success" }).ok).toBe(false);
  });

  it("records V2 rollback evidence before releasing the exact V1 fence", async () => {
    const calls = [];
    const client = {
      query: vi.fn(async (sql) => {
        calls.push(sql);
        if (sql.includes("v2_rollback_evidence")) return { rows: [{ id: "66666666-6666-4666-8666-666666666666", occurred_at: new Date() }] };
        if (sql.includes("SELECT fence_generation")) return { rows: [{ fence_generation: JOB_ID, released_at: null }] };
        if (sql.includes("fence_release")) return { rows: [{ id: "77777777-7777-4777-8777-777777777777", occurred_at: new Date() }] };
        return { rows: [] };
      }),
      release: vi.fn(),
    };
    const router = createMigrationAdmissionAuditRouter({ connect: async () => client }, vi.fn());
    const releaseLayer = router.stack.find((layer) => layer.route?.path === "/fence-release");
    const handler = releaseLayer.route.stack.at(-1).handle;
    const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({
      body: { teamId: TEAM_ID, fenceGeneration: JOB_ID, terminalOutcome: "rollback", v2RollbackEvidenceId: EVIDENCE_ID, v2RollbackCompletedAt: "2026-09-15T01:02:00.000Z" },
      actor: { authMode: "legacy_admin", userId: null },
    }, res, (err) => { throw err; });
    expect(res.statusCode).toBe(200);
    expect(calls.findIndex((sql) => sql.includes("v2_rollback_evidence"))).toBeLessThan(calls.findIndex((sql) => sql.includes("SET fenced = FALSE")));
    expect(calls.indexOf("COMMIT")).toBeGreaterThan(calls.findIndex((sql) => sql.includes("fence_release")));
    expect(client.release).toHaveBeenCalledOnce();
  });
});
