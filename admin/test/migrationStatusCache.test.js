/**
 * Tests for the V1 -> V2 migration-status cache (server/lib/migrationStatus.js).
 *
 * Tests cover:
 *   - Contract version is checked first; unknown versions are refused
 *   - Payload validation (bad shape, bad status, missing teamId)
 *   - "Never loaded" is distinguishable from "loaded and says v1_only"
 *   - FAIL TO LAST-KNOWN-GOOD: every poll failure leaves the snapshot intact
 *   - A v2_live team never flips back to v1_only on a failed poll
 *   - 401/403 is logged distinctly from an outage, and never mutates the cache
 *   - Missing V2_MIGRATION_CRON_SECRET skips polling and never throws
 *   - The secret value is never written to a log or an error message
 *   - Staleness reporting via getSnapshotMeta()
 *   - getUserTeamStatuses / userHasV2LiveTeam resolve via V1's own memberships
 *
 * `server/lib/userTeams.js` is mocked so these tests never touch Postgres.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const MODULE_PATH = "../../server/lib/migrationStatus.js";

vi.mock("../../server/lib/userTeams.js", () => ({
  getUserTeams: vi.fn(async () => []),
}));

const SECRET = "test-cron-secret-value";

/** Build a valid contractVersion-1 payload. */
function payload(teams = [], overrides = {}) {
  const summary = { v1_only: 0, migrating: 0, v2_live: 0, total: teams.length };
  for (const t of teams) summary[t.status] += 1;
  return {
    contractVersion: 1,
    generatedAt: "2026-09-10T12:00:00.000Z",
    summary,
    teams,
    ...overrides,
  };
}

/** A single team row. */
function team(teamId, status, teamName = `Team ${teamId}`) {
  return { teamId, teamName, status, previousStatus: null, rolledBackAt: null, updatedAt: null };
}

/** Stub global fetch with a canned response. */
function stubFetch({ status = 200, body = payload(), json = true } = {}) {
  const fn = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: json ? async () => body : async () => { throw new Error("Unexpected token"); },
  }));
  globalThis.fetch = fn;
  return fn;
}

let mod;

beforeEach(async () => {
  vi.resetModules();
  vi.restoreAllMocks();
  process.env.V2_MIGRATION_CRON_SECRET = SECRET;
  delete process.env.V2_BASE_URL;
  mod = await import(MODULE_PATH);
  mod.resetMigrationStatusCache();
});

afterEach(() => {
  mod.stopMigrationStatusPolling();
  delete process.env.V2_MIGRATION_CRON_SECRET;
  delete process.env.V2_BASE_URL;
});

// ── Contract version ─────────────────────────────────────────────────────────

describe("contract version", () => {
  it("accepts version 1", () => {
    expect(mod.parseMigrationStatusPayload(payload()).ok).toBe(true);
  });

  it("refuses an unrecognised version rather than guessing the shape", () => {
    for (const v of [2, 0, "1", null, undefined]) {
      const r = mod.parseMigrationStatusPayload(payload([], { contractVersion: v }));
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/contractVersion/);
    }
  });

  it("refuses a v2 payload even if the rest of the shape looks plausible", () => {
    const r = mod.parseMigrationStatusPayload(
      payload([team("t1", "v2_live")], { contractVersion: 2 })
    );
    expect(r.ok).toBe(false);
  });
});

// ── Payload validation ───────────────────────────────────────────────────────

describe("payload validation", () => {
  it("rejects a non-object payload", () => {
    expect(mod.parseMigrationStatusPayload(null).ok).toBe(false);
    expect(mod.parseMigrationStatusPayload("nope").ok).toBe(false);
  });

  it("rejects a missing teams array", () => {
    const r = mod.parseMigrationStatusPayload({ contractVersion: 1, summary: {}, teams: null });
    expect(r.ok).toBe(false);
  });

  it("rejects a missing summary", () => {
    const r = mod.parseMigrationStatusPayload({ contractVersion: 1, teams: [] });
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown team status", () => {
    const r = mod.parseMigrationStatusPayload(payload([team("t1", "archived")]));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/status/);
  });

  it("rejects a row without a teamId", () => {
    const r = mod.parseMigrationStatusPayload(payload([{ status: "v1_only" }]));
    expect(r.ok).toBe(false);
  });
});

// ── Never-loaded vs loaded ───────────────────────────────────────────────────

describe("never-loaded state", () => {
  it("reports hasEverLoaded false before any successful fetch", () => {
    expect(mod.hasEverLoaded()).toBe(false);
  });

  it("answers v1_only for every team while never loaded", () => {
    expect(mod.getTeamStatus("anything")).toBe("v1_only");
    expect(mod.getFreshValidatedTeamStatus("anything")).toBeNull();
  });

  it("is distinguishable from a loaded snapshot that says v1_only", () => {
    expect(mod.getTeamStatus("t1")).toBe("v1_only");
    expect(mod.hasEverLoaded()).toBe(false);

    mod.ingestMigrationStatusPayload(payload([team("t1", "v1_only")]));
    expect(mod.getTeamStatus("t1")).toBe("v1_only");
    expect(mod.hasEverLoaded()).toBe(true);
  });

  it("getSnapshotMeta reports never-loaded as stale with null timestamps", () => {
    const meta = mod.getSnapshotMeta();
    expect(meta).toMatchObject({
      hasEverLoaded: false,
      lastSuccessAt: null,
      ageMs: null,
      isStale: true,
      summary: null,
      contractVersion: null,
    });
  });
});

describe("strict admission status reads", () => {
  it("only returns an explicit fresh row, never the cache default", () => {
    mod.ingestMigrationStatusPayload(payload([team("t1", "v1_only")]));
    expect(mod.getFreshValidatedTeamStatus("t1")).toBe("v1_only");
    expect(mod.getFreshValidatedTeamStatus("missing-team")).toBeNull();
  });

  it("refuses a once-valid row after it becomes stale", () => {
    mod.ingestMigrationStatusPayload(payload([team("t1", "v2_live")]));
    const base = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(base + mod.STALENESS_THRESHOLD_MS + 1);
    expect(mod.getFreshValidatedTeamStatus("t1")).toBeNull();
  });
});

// ── Fail to last-known-good ──────────────────────────────────────────────────

describe("fail to last-known-good, never to open", () => {
  beforeEach(() => {
    mod.ingestMigrationStatusPayload(payload([team("t1", "v2_live"), team("t2", "migrating")]));
    expect(mod.getTeamStatus("t1")).toBe("v2_live");
  });

  it("keeps the snapshot when the network throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    globalThis.fetch = vi.fn(async () => { throw new Error("ECONNREFUSED"); });
    const r = await mod.pollMigrationStatusOnce();
    expect(r.ok).toBe(false);
    expect(mod.getTeamStatus("t1")).toBe("v2_live");
    expect(mod.hasEverLoaded()).toBe(true);
  });

  it("keeps the snapshot on a 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch({ status: 500 });
    await mod.pollMigrationStatusOnce();
    expect(mod.getTeamStatus("t1")).toBe("v2_live");
  });

  it("keeps the snapshot when the body is not JSON", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch({ json: false });
    await mod.pollMigrationStatusOnce();
    expect(mod.getTeamStatus("t1")).toBe("v2_live");
  });

  it("keeps the snapshot when the contract version is unrecognised", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch({ body: payload([team("t1", "v1_only")], { contractVersion: 99 }) });
    await mod.pollMigrationStatusOnce();
    expect(mod.getTeamStatus("t1")).toBe("v2_live"); // did NOT flip back
    expect(err).toHaveBeenCalled();
  });

  it("logs a 401 distinctly as a wrong-secret condition, not an outage", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch({ status: 401 });
    const r = await mod.pollMigrationStatusOnce();
    expect(r.ok).toBe(false);
    const line = err.mock.calls.flat().join(" ");
    expect(line).toMatch(/AUTH FAILURE/);
    expect(line).toMatch(/SECRET/i);
    expect(mod.getTeamStatus("t1")).toBe("v2_live");
  });

  it("treats 403 the same as 401", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch({ status: 403 });
    await mod.pollMigrationStatusOnce();
    expect(err.mock.calls.flat().join(" ")).toMatch(/AUTH FAILURE/);
  });

  it("a successful poll does replace the snapshot", async () => {
    stubFetch({ body: payload([team("t1", "v1_only")]) });
    const r = await mod.pollMigrationStatusOnce();
    expect(r.ok).toBe(true);
    expect(mod.getTeamStatus("t1")).toBe("v1_only");
  });
});

// ── Secret handling ──────────────────────────────────────────────────────────

describe("secret handling", () => {
  it("skips the fetch entirely and does not throw when the secret is missing", async () => {
    delete process.env.V2_MIGRATION_CRON_SECRET;
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchFn = stubFetch();
    const r = await mod.pollMigrationStatusOnce();
    expect(r.ok).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(err.mock.calls.flat().join(" ")).toMatch(/V2_MIGRATION_CRON_SECRET/);
    expect(mod.hasEverLoaded()).toBe(false);
  });

  it("startMigrationStatusPolling does not crash the server without the secret", () => {
    delete process.env.V2_MIGRATION_CRON_SECRET;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(() => mod.startMigrationStatusPolling()).not.toThrow();
    mod.stopMigrationStatusPolling();
  });

  it("sends the secret in the x-cron-secret header", async () => {
    const fetchFn = stubFetch();
    await mod.pollMigrationStatusOnce();
    expect(fetchFn.mock.calls[0][1].headers["x-cron-secret"]).toBe(SECRET);
  });

  it("never writes the secret value into any log line", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    stubFetch({ status: 401 });
    await mod.pollMigrationStatusOnce();
    globalThis.fetch = vi.fn(async () => { throw new Error("boom"); });
    await mod.pollMigrationStatusOnce();
    const all = [...err.mock.calls, ...log.mock.calls].flat().join(" ");
    expect(all).not.toContain(SECRET);
  });
});

// ── URL / base URL ───────────────────────────────────────────────────────────

describe("endpoint URL", () => {
  it("defaults to the beta host, never the bare apex", async () => {
    const fetchFn = stubFetch();
    await mod.pollMigrationStatusOnce();
    expect(fetchFn.mock.calls[0][0]).toBe(
      "https://beta.coachableplays.com/api/internal/migration-status"
    );
  });

  it("honours V2_BASE_URL for rehearsal stubs and strips a trailing slash", async () => {
    process.env.V2_BASE_URL = "http://localhost:3999/";
    const fetchFn = stubFetch();
    await mod.pollMigrationStatusOnce();
    expect(fetchFn.mock.calls[0][0]).toBe(
      "http://localhost:3999/api/internal/migration-status"
    );
  });
});

// ── Staleness ────────────────────────────────────────────────────────────────

describe("staleness", () => {
  it("a fresh snapshot is not stale", () => {
    mod.ingestMigrationStatusPayload(payload([team("t1", "v2_live")]));
    const meta = mod.getSnapshotMeta();
    expect(meta.isStale).toBe(false);
    expect(meta.hasEverLoaded).toBe(true);
    expect(meta.contractVersion).toBe(1);
    expect(meta.summary).toEqual({ v1_only: 0, migrating: 0, v2_live: 1, total: 1 });
    expect(typeof meta.lastSuccessAt).toBe("string");
  });

  it("goes stale once the snapshot ages past the threshold", () => {
    mod.ingestMigrationStatusPayload(payload([team("t1", "v2_live")]));
    const base = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(base + mod.STALENESS_THRESHOLD_MS + 1000);
    expect(mod.getSnapshotMeta().isStale).toBe(true);
  });

  it("logs loudly when a poll runs against a stale snapshot", async () => {
    mod.ingestMigrationStatusPayload(payload([team("t1", "v2_live")]));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const base = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(base + mod.STALENESS_THRESHOLD_MS + 60_000);
    globalThis.fetch = vi.fn(async () => { throw new Error("ECONNREFUSED"); });
    await mod.pollMigrationStatusOnce();
    expect(err.mock.calls.flat().join(" ")).toMatch(/STALE/);
  });

  it("getSnapshotMeta exposes no secret", () => {
    mod.ingestMigrationStatusPayload(payload([team("t1", "v2_live")]));
    expect(JSON.stringify(mod.getSnapshotMeta())).not.toContain(SECRET);
  });
});

// ── User -> team resolution (V1's own memberships) ───────────────────────────

describe("user resolution via V1 memberships", () => {
  it("maps each V1 membership to its migration status", async () => {
    const { getUserTeams } = await import("../../server/lib/userTeams.js");
    getUserTeams.mockResolvedValue([
      { teamId: "t1", teamName: "Varsity" },
      { teamId: "t2", teamName: "JV" },
    ]);
    mod.ingestMigrationStatusPayload(payload([team("t1", "v2_live", "Varsity")]));

    const rows = await mod.getUserTeamStatuses("u1");
    expect(rows).toEqual([
      { teamId: "t1", teamName: "Varsity", status: "v2_live" },
      { teamId: "t2", teamName: "JV", status: "v1_only" }, // absent from snapshot
    ]);
  });

  it("userHasV2LiveTeam is true when any team has moved", async () => {
    const { getUserTeams } = await import("../../server/lib/userTeams.js");
    getUserTeams.mockResolvedValue([
      { teamId: "t1", teamName: "Varsity" },
      { teamId: "t2", teamName: "JV" },
    ]);
    mod.ingestMigrationStatusPayload(payload([team("t2", "v2_live", "JV")]));
    expect(await mod.userHasV2LiveTeam("u1")).toBe(true);
  });

  it("userHasV2LiveTeam is false when no team has moved", async () => {
    const { getUserTeams } = await import("../../server/lib/userTeams.js");
    getUserTeams.mockResolvedValue([{ teamId: "t1", teamName: "Varsity" }]);
    mod.ingestMigrationStatusPayload(payload([team("t1", "migrating", "Varsity")]));
    expect(await mod.userHasV2LiveTeam("u1")).toBe(false);
  });

  it("returns an empty list for a missing userId without querying", async () => {
    expect(await mod.getUserTeamStatuses("")).toEqual([]);
  });
});

// ── Polling lifecycle ────────────────────────────────────────────────────────

describe("polling lifecycle", () => {
  it("polls immediately at start and can be stopped", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchFn = stubFetch({ body: payload([team("t1", "v2_live")]) });
    const stop = mod.startMigrationStatusPolling();
    await vi.waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
    // Wait on the OBSERVABLE cache state, not the fetch call count: the fetch
    // spy resolves the moment fetch() is invoked, one microtask before
    // `await res.json()` -> ingestMigrationStatusPayload() has written the
    // snapshot. Waiting on the count alone reads the cache too early.
    await vi.waitFor(() => expect(mod.getTeamStatus("t1")).toBe("v2_live"));
    stop();
  });

  it("a second start call is a no-op while a timer is running", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchFn = stubFetch();
    mod.startMigrationStatusPolling();
    mod.startMigrationStatusPolling();
    await vi.waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
    mod.stopMigrationStatusPolling();
  });

  it("importing the module does not start polling on its own", async () => {
    vi.resetModules();
    const fetchFn = stubFetch();
    const fresh = await import(MODULE_PATH);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(fresh.hasEverLoaded()).toBe(false);
  });
});
