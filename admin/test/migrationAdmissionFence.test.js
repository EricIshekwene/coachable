/** Focused tests for the V1 durable migration admission fence. */

import { describe, expect, it, vi } from "vitest";
import {
  acknowledgeMigrationAdmissionFence,
  getActiveMigrationAdmissionFence,
  releaseMigrationAdmissionFence,
} from "../../server/lib/migrationAdmissionFence.js";
import {
  bearerFenceSecret,
  createInternalMigrationAdmissionFenceRouter,
  hasValidFenceSecret,
  parseFenceRequest,
} from "../../server/routes/internalMigrationAdmissionFence.js";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "22222222-2222-4222-8222-222222222222";
const NEWER_JOB_ID = "33333333-3333-4333-8333-333333333333";
const ACKNOWLEDGED_AT = "2026-09-15T04:00:00.000Z";

function row(overrides = {}) {
  return {
    team_id: TEAM_ID,
    fence_generation: JOB_ID,
    migration_job_id: JOB_ID,
    acknowledged_at: ACKNOWLEDGED_AT,
    released_at: null,
    reason: "v2_migration",
    ...overrides,
  };
}

function scriptedClient(responses) {
  return { query: vi.fn(async () => responses.shift() ?? { rows: [] }) };
}

describe("migration admission fence persistence", () => {
  it("creates a durable acknowledgement for a new generation", async () => {
    const client = scriptedClient([{ rows: [] }, { rows: [row()] }]);
    const result = await acknowledgeMigrationAdmissionFence(client, {
      teamId: TEAM_ID, fenceGeneration: JOB_ID, jobId: JOB_ID, reason: "v2_migration",
    });
    expect(result.outcome).toBe("acknowledged");
    expect(result.fence).toMatchObject({ teamId: TEAM_ID, fenceGeneration: JOB_ID, jobId: JOB_ID });
    expect(client.query.mock.calls[1][0]).toContain("INSERT INTO migration_admission_fences");
  });

  it("retries the same active generation idempotently while preserving its acknowledgement evidence", async () => {
    const client = scriptedClient([{ rows: [row()] }]);
    const result = await acknowledgeMigrationAdmissionFence(client, {
      teamId: TEAM_ID, fenceGeneration: JOB_ID, jobId: JOB_ID,
    });
    expect(result.outcome).toBe("acknowledged");
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query.mock.calls[1][0]).toContain("migration_admission_fence_history");
  });

  it("refuses a different generation while a fence is active", async () => {
    const client = scriptedClient([{ rows: [row()] }]);
    const result = await acknowledgeMigrationAdmissionFence(client, {
      teamId: TEAM_ID, fenceGeneration: NEWER_JOB_ID, jobId: NEWER_JOB_ID,
    });
    expect(result).toEqual({ outcome: "generation_conflict" });
  });

  it("does not let a stale release clear a newer fence", async () => {
    const client = scriptedClient([{ rows: [row({ fence_generation: NEWER_JOB_ID })] }]);
    const result = await releaseMigrationAdmissionFence(client, {
      teamId: TEAM_ID, fenceGeneration: JOB_ID,
    });
    expect(result).toBe("generation_conflict");
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it("reads the active fence through a caller-owned transaction client", async () => {
    const client = scriptedClient([{ rows: [{ id: TEAM_ID }] }, { rows: [row()] }]);
    await expect(getActiveMigrationAdmissionFence(TEAM_ID, client)).resolves.toMatchObject({
      teamId: TEAM_ID, fenceGeneration: JOB_ID,
    });
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query.mock.calls[0][0]).toContain("FROM teams WHERE id = $1 FOR SHARE");
  });

  it("does not acknowledge a first fence while an admission that saw no fence holds the team lock", async () => {
    let releaseAdmissionLock;
    let fenceTriedToLock;
    const admissionLockHeld = new Promise((resolve) => { fenceTriedToLock = resolve; });
    const admissionLockReleased = new Promise((resolve) => { releaseAdmissionLock = resolve; });
    const events = [];
    const admissionClient = {
      query: vi.fn(async (sql) => {
        if (sql.includes("FROM teams WHERE id = $1 FOR SHARE")) return { rows: [{ id: TEAM_ID }] };
        if (sql.includes("FROM migration_admission_fences")) return { rows: [] };
        throw new Error(`unexpected admission query: ${sql}`);
      }),
    };
    await expect(getActiveMigrationAdmissionFence(TEAM_ID, admissionClient)).resolves.toBeNull();

    const fenceClient = {
      query: vi.fn(async (sql) => {
        if (sql === "BEGIN") return { rows: [] };
        if (sql.includes("FROM teams WHERE id = $1 FOR UPDATE")) {
          fenceTriedToLock();
          await admissionLockReleased;
          return { rows: [{ id: TEAM_ID }] };
        }
        if (sql.includes("FROM migration_admission_fences")) return { rows: [] };
        if (sql.includes("INSERT INTO migration_admission_fences")) return { rows: [row()] };
        if (sql.includes("migration_admission_fence_history")) return { rows: [] };
        if (sql === "COMMIT") { events.push("FENCE_COMMIT"); return { rows: [] }; }
        throw new Error(`unexpected fence query: ${sql}`);
      }),
      release: vi.fn(),
    };
    const router = createInternalMigrationAdmissionFenceRouter({ connect: async () => fenceClient }, () => "test-fence-secret");
    const handler = router.stack.find((layer) => layer.route?.path === "/migration-admission-fences").route.stack[0].handle;
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json() { events.push("FENCE_ACK"); return this; },
    };
    const fenceRequest = handler({
      headers: { authorization: "Bearer test-fence-secret" },
      get: () => "Bearer test-fence-secret",
      body: { teamId: TEAM_ID, fenceGeneration: JOB_ID },
    }, res);
    await admissionLockHeld;
    expect(events).toEqual([]);

    // In the real admission transaction its membership INSERT and COMMIT occur
    // before PostgreSQL releases this FOR SHARE lock. The fence may only commit
    // and acknowledge after that point.
    events.push("ADMISSION_MEMBERSHIP_COMMIT");
    releaseAdmissionLock();
    await fenceRequest;
    expect(events).toEqual(["ADMISSION_MEMBERSHIP_COMMIT", "FENCE_COMMIT", "FENCE_ACK"]);
    expect(admissionClient.query.mock.calls[0][0]).toContain("FOR SHARE");
    expect(fenceClient.query.mock.calls[1][0]).toContain("FOR UPDATE");
  });
});

describe("internal fence request boundary", () => {
  it("requires UUID team and generation and derives the job from generation", () => {
    expect(parseFenceRequest({ teamId: TEAM_ID, fenceGeneration: JOB_ID, reason: "v2_migration" })).toMatchObject({
      ok: true, value: { action: "fence", teamId: TEAM_ID, jobId: JOB_ID, fenceGeneration: JOB_ID },
    });
    expect(parseFenceRequest({ teamId: "nope", fenceGeneration: JOB_ID }).ok).toBe(false);
    expect(parseFenceRequest({ teamId: TEAM_ID, fenceGeneration: JOB_ID, reason: "x".repeat(501) }).ok).toBe(false);
  });

  it("accepts only a correctly formatted bearer secret without exposing it", () => {
    expect(bearerFenceSecret("Bearer secret-value")).toBe("secret-value");
    expect(bearerFenceSecret("Basic secret-value")).toBeNull();
    expect(hasValidFenceSecret("secret-value", "secret-value")).toBe(true);
    expect(hasValidFenceSecret("wrong", "secret-value")).toBe(false);
  });

  it("returns acknowledgement only after the database transaction commits", async () => {
    const calls = [];
    const client = {
      query: vi.fn(async (sql) => {
        calls.push(sql);
        if (sql.includes("SELECT id FROM teams")) return { rows: [{ id: TEAM_ID }] };
        if (sql.includes("FROM migration_admission_fences")) return { rows: [] };
        if (sql.includes("INSERT INTO migration_admission_fences")) return { rows: [row()] };
        return { rows: [] };
      }),
      release: vi.fn(),
    };
    const router = createInternalMigrationAdmissionFenceRouter({ connect: async () => client }, () => "test-fence-secret");
    const handler = router.stack.find((layer) => layer.route?.path === "/migration-admission-fences").route.stack[0].handle;
    const res = {
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { calls.push("RESPONSE"); this.body = body; return this; },
    };
    await handler({
      headers: { authorization: "Bearer test-fence-secret" },
      get: (name) => (name === "authorization" ? "Bearer test-fence-secret" : undefined),
      body: { teamId: TEAM_ID, fenceGeneration: JOB_ID, reason: "v2_migration" },
    }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ teamId: TEAM_ID, fenceGeneration: JOB_ID, fenced: true });
    expect(calls.indexOf("COMMIT")).toBeLessThan(calls.indexOf("RESPONSE"));
    expect(client.release).toHaveBeenCalledOnce();
  });
});
