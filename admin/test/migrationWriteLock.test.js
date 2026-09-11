/**
 * Tests for the global migrationWriteLock middleware.
 *
 * Calls the middleware directly with stub req/res objects — no Express, no
 * network. The migration-status cache is driven with its real
 * `ingestMigrationStatusPayload` / `resetMigrationStatusCache` helpers so the
 * status logic under test is the production one; only `userTeams.js` is
 * stubbed, because it is the single thing that would touch Postgres.
 *
 * The three properties that MUST hold:
 *   - reads are never blocked
 *   - nobody is ever locked out by an infrastructure failure (fail open)
 *   - an unmigrated coach sees no change at all
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetUserTeams = vi.fn();
vi.mock("../../server/lib/userTeams.js", () => ({
  getUserTeams: (...args) => mockGetUserTeams(...args),
}));

const { signToken } = await import("../../server/middleware/auth.js");
const {
  ingestMigrationStatusPayload,
  resetMigrationStatusCache,
} = await import("../../server/lib/migrationStatus.js");
const {
  migrationWriteLock,
  MIGRATED_ERROR_CODE,
  V2_APP_URL,
  pathnameOf,
  isExemptPath,
  extractTeamIdFromPath,
  extractTeamIdFromBody,
} = await import("../../server/middleware/migrationWriteLock.js");

const TEAM_LIVE = "11111111-1111-4111-8111-111111111111";
const TEAM_MIGRATING = "22222222-2222-4222-8222-222222222222";
const TEAM_V1 = "33333333-3333-4333-8333-333333333333";
const USER_ID = "99999999-9999-4999-8999-999999999999";

/** Seed the real cache with a snapshot containing one team per status. */
function loadCache(teams) {
  const summary = { v1_only: 0, migrating: 0, v2_live: 0, total: teams.length };
  for (const t of teams) summary[t.status] += 1;
  const result = ingestMigrationStatusPayload({ contractVersion: 1, summary, teams });
  expect(result.ok).toBe(true);
}

function stubResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

/** Run the middleware against a stub request. Always awaited — the membership
 *  fallback path is async. */
async function run({ method = "POST", url = "/", body = {}, userId = USER_ID } = {}) {
  const req = {
    method,
    originalUrl: url,
    url,
    body,
    headers: userId ? { authorization: `Bearer ${signToken(userId)}` } : {},
    cookies: {},
  };
  const res = stubResponse();
  const next = vi.fn();
  await migrationWriteLock(req, res, next);
  return { res, next };
}

beforeEach(() => {
  resetMigrationStatusCache();
  mockGetUserTeams.mockReset();
  mockGetUserTeams.mockResolvedValue([]);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  resetMigrationStatusCache();
  vi.restoreAllMocks();
});

// ── Pure helpers ─────────────────────────────────────────────────────────────

describe("migrationWriteLock helpers", () => {
  it("strips query and hash off a url", () => {
    expect(pathnameOf("/teams/x/plays?a=1")).toBe("/teams/x/plays");
    expect(pathnameOf("/auth/login#z")).toBe("/auth/login");
    expect(pathnameOf(undefined)).toBe("/");
  });

  it("matches exemptions on whole segments only", () => {
    expect(isExemptPath("/admin")).toBe(true);
    expect(isExemptPath("/admin/plays/1")).toBe(true);
    expect(isExemptPath("/administrators")).toBe(false);
    expect(isExemptPath("/teams/abc/plays")).toBe(false);
  });

  it("exempts /onboarding/create-team and /onboarding/solo but not join-team", () => {
    expect(isExemptPath("/onboarding/create-team")).toBe(true);
    expect(isExemptPath("/onboarding/solo")).toBe(true);
    expect(isExemptPath("/onboarding/join-team")).toBe(false);
  });

  it("extracts a team id only when the second segment is a UUID", () => {
    expect(extractTeamIdFromPath(`/teams/${TEAM_LIVE}/plays`)).toBe(TEAM_LIVE);
    expect(extractTeamIdFromPath(`/teams/${TEAM_LIVE}/suite/roster`)).toBe(TEAM_LIVE);
    expect(extractTeamIdFromPath("/teams/join")).toBeNull();
    expect(extractTeamIdFromPath("/teams/create")).toBeNull();
    expect(extractTeamIdFromPath("/teams/create-personal")).toBeNull();
    expect(extractTeamIdFromPath("/users/me")).toBeNull();
  });

  it("extracts body.teamId only when it is a UUID", () => {
    expect(extractTeamIdFromBody({ teamId: TEAM_LIVE })).toBe(TEAM_LIVE);
    expect(extractTeamIdFromBody({ teamId: "nope" })).toBeNull();
    expect(extractTeamIdFromBody(null)).toBeNull();
    expect(extractTeamIdFromBody({})).toBeNull();
  });
});

// ── Fail open ────────────────────────────────────────────────────────────────

describe("migrationWriteLock fails open", () => {
  it("allows every write while the cache has never loaded", async () => {
    const { res, next } = await run({ url: `/teams/${TEAM_LIVE}/plays` });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it("allows writes when the snapshot has no locked team (pre-cutover no-op)", async () => {
    loadCache([{ teamId: TEAM_V1, teamName: "V1 Team", status: "v1_only" }]);
    const { res, next } = await run({ url: `/teams/${TEAM_V1}/plays` });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
    expect(mockGetUserTeams).not.toHaveBeenCalled();
  });

  it("allows the write when the membership lookup throws", async () => {
    loadCache([{ teamId: TEAM_LIVE, teamName: "Live", status: "v2_live" }]);
    mockGetUserTeams.mockRejectedValue(new Error("db down"));
    const { res, next } = await run({ url: "/prefabs" });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });
});

// ── Reads ────────────────────────────────────────────────────────────────────

describe("migrationWriteLock never blocks reads", () => {
  beforeEach(() => {
    loadCache([{ teamId: TEAM_LIVE, teamName: "Live", status: "v2_live" }]);
  });

  it.each(["GET", "HEAD", "OPTIONS"])("allows %s on a migrated team", async (method) => {
    const { res, next } = await run({ method, url: `/teams/${TEAM_LIVE}/plays` });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });
});

// ── Team-attributed writes ───────────────────────────────────────────────────

describe("migrationWriteLock blocks writes for locked teams", () => {
  beforeEach(() => {
    loadCache([
      { teamId: TEAM_LIVE, teamName: "Live Team", status: "v2_live" },
      { teamId: TEAM_MIGRATING, teamName: "Moving Team", status: "migrating" },
      { teamId: TEAM_V1, teamName: "Staying Team", status: "v1_only" },
    ]);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("blocks %s with 409", async (method) => {
    const { res, next } = await run({ method, url: `/teams/${TEAM_LIVE}/plays` });
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe(MIGRATED_ERROR_CODE);
    expect(res.body.status).toBe("v2_live");
    expect(res.body.v2Url).toBe(V2_APP_URL);
    expect(res.body.error).toContain(V2_APP_URL);
    expect(res.body.teamId).toBe(TEAM_LIVE);
  });

  it("blocks a migrating team too, with the migrating wording", async () => {
    const { res, next } = await run({ url: `/teams/${TEAM_MIGRATING}/folders` });
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe(MIGRATED_ERROR_CODE);
    expect(res.body.status).toBe("migrating");
  });

  it("leaves an unmigrated team completely unaffected", async () => {
    const { res, next } = await run({ url: `/teams/${TEAM_V1}/plays` });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it("blocks suite writes under /teams/:teamId/suite", async () => {
    const { res } = await run({ url: `/teams/${TEAM_LIVE}/suite/roster` });
    expect(res.statusCode).toBe(409);
  });

  it("blocks a copy-into-team write that names the team in the body", async () => {
    const { res } = await run({ url: "/shared/plays/tok/copy", body: { teamId: TEAM_LIVE } });
    expect(res.statusCode).toBe(409);
  });

  it("allows a copy-into-team write targeting an unmigrated team", async () => {
    const { res, next } = await run({ url: "/platform-plays/abc/copy", body: { teamId: TEAM_V1 } });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });
});

// ── Exemptions ───────────────────────────────────────────────────────────────

describe("migrationWriteLock exemptions keep a migrated coach unstuck", () => {
  beforeEach(() => {
    loadCache([{ teamId: TEAM_LIVE, teamName: "Live Team", status: "v2_live" }]);
    mockGetUserTeams.mockResolvedValue([{ teamId: TEAM_LIVE, teamName: "Live Team" }]);
  });

  it.each([
    "/auth/login",
    "/auth/logout",
    "/auth/signup",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/verification/send",
    "/users/me",
    "/users/me/change-email",
    "/onboarding/create-team",
    "/onboarding/solo",
    "/error-reports",
    "/user-issues",
    "/notifications/read-all",
    "/admin/login",
    "/admin/team-suite/abc/roster",
    "/staff/accept-invite",
    "/flags/admin",
  ])("allows POST %s", async (url) => {
    const { res, next } = await run({ url });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });
});

// ── Membership fallback ──────────────────────────────────────────────────────

describe("migrationWriteLock membership fallback", () => {
  beforeEach(() => {
    loadCache([
      { teamId: TEAM_LIVE, teamName: "Live Team", status: "v2_live" },
      { teamId: TEAM_V1, teamName: "Staying Team", status: "v1_only" },
    ]);
  });

  it("blocks when every team the user belongs to is locked", async () => {
    mockGetUserTeams.mockResolvedValue([{ teamId: TEAM_LIVE, teamName: "Live Team" }]);
    const { res, next } = await run({ url: "/prefabs" });
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe(MIGRATED_ERROR_CODE);
    expect(res.body.teams).toEqual([
      { teamId: TEAM_LIVE, teamName: "Live Team", status: "v2_live" },
    ]);
  });

  it("allows a partially migrated coach who still has an unmoved team", async () => {
    mockGetUserTeams.mockResolvedValue([
      { teamId: TEAM_LIVE, teamName: "Live Team" },
      { teamId: TEAM_V1, teamName: "Staying Team" },
    ]);
    const { res, next } = await run({ url: "/prefabs" });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it("allows a user with no teams at all (never trap a new account)", async () => {
    mockGetUserTeams.mockResolvedValue([]);
    const { res, next } = await run({ url: "/onboarding/join-team" });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it("allows an unauthenticated write through to the route's own requireAuth", async () => {
    mockGetUserTeams.mockResolvedValue([{ teamId: TEAM_LIVE, teamName: "Live Team" }]);
    const { res, next } = await run({ url: "/prefabs", userId: null });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
    expect(mockGetUserTeams).not.toHaveBeenCalled();
  });
});
