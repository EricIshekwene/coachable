/**
 * Tests for the V1 -> V2 "your account has moved" interstitial.
 *
 * Covers:
 *  - The destination is the beta host, never the apex (the apex IS V1)
 *  - 'migrating' is not treated as moved
 *  - All-moved -> interstitial; mixed -> interstitial only on the moved team
 *  - Mixed + active team not moved -> non-blocking banner instead
 *  - FAIL OPEN: no data / not ready / empty teams -> no interstitial, no banner
 *  - GET /migration/me returns { hasEverLoaded, teams } from the cache module
 *  - GET /migration/me never calls V2 (it only reads the cache module)
 *  - The route is registered as a GET, so the cutover write-lock cannot block it
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  V2_APP_URL,
  isMovedTeam,
  clearMigrationRedirectMarkers,
  getV2HandoffDestination,
  getV2LoginDestination,
  hasMigrationRedirectMarker,
  isTrustedAllLiveStatus,
  markMigrationRedirect,
  migrationRedirectMarkerKey,
  shouldShowMovedInterstitial,
  shouldShowMovedBanner,
} from "../../src/utils/migrationDestination.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** @param {string} teamId @param {string} status */
const team = (teamId, status) => ({ teamId, teamName: `Team ${teamId}`, status });

/** A loaded status value, as MigrationStatusContext builds it. */
const loaded = (teams) => ({ ready: true, teams });

// ── Destination ──────────────────────────────────────────────────────────────

describe("V2 destination", () => {
  it("points at the beta host", () => {
    expect(V2_APP_URL).toBe("https://beta.coachableplays.com");
  });

  it("is never the bare apex, which is V1 itself", () => {
    expect(V2_APP_URL).not.toBe("https://coachableplays.com");
    expect(V2_APP_URL).not.toBe("https://www.coachableplays.com");
    expect(new URL(V2_APP_URL).hostname).toBe("beta.coachableplays.com");
  });
});

describe("automatic migration redirect", () => {
  const allLive = {
    ready: true,
    fresh: true,
    snapshotGeneration: "a:v2_live|b:v2_live",
    teams: [team("a", "v2_live"), team("b", "v2_live")],
  };

  it("requires a fresh trusted all-live, non-empty snapshot", () => {
    expect(isTrustedAllLiveStatus(allLive)).toBe(true);
    expect(isTrustedAllLiveStatus({ ...allLive, fresh: false })).toBe(false);
    expect(isTrustedAllLiveStatus({ ...allLive, ready: false })).toBe(false);
    expect(isTrustedAllLiveStatus({ ...allLive, teams: [] })).toBe(false);
    expect(isTrustedAllLiveStatus({ ...allLive, teams: [team("a", "v2_live"), team("b", "v1_only")] })).toBe(false);
    expect(isTrustedAllLiveStatus({ ...allLive, teams: [team("a", "migrating")] })).toBe(false);
    expect(isTrustedAllLiveStatus({ ...allLive, teams: [team("a", "unknown")] })).toBe(false);
  });

  it("uses beta login with a fixed V2-relative return target", () => {
    const url = new URL(getV2LoginDestination());
    expect(url.origin).toBe(V2_APP_URL);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("returnTo")).toBe("/app/plays");
  });

  it("scopes the one-shot marker to session, user, snapshot, and beta origin", () => {
    const values = new Map();
    const storage = {
      get length() { return values.size; },
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
      key: (index) => [...values.keys()][index] || null,
    };
    const scope = { userId: "user-a", snapshotGeneration: allLive.snapshotGeneration };
    const nextSnapshot = { ...scope, snapshotGeneration: "a:v2_live|b:v2_live|c:v2_live" };
    const otherUser = { ...scope, userId: "user-b" };
    expect(migrationRedirectMarkerKey(scope)).toContain("https://beta.coachableplays.com");
    expect(hasMigrationRedirectMarker(scope, storage)).toBe(false);
    markMigrationRedirect(scope, storage);
    expect(hasMigrationRedirectMarker(scope, storage)).toBe(true);
    expect(hasMigrationRedirectMarker(nextSnapshot, storage)).toBe(false);
    expect(hasMigrationRedirectMarker(otherUser, storage)).toBe(false);
    clearMigrationRedirectMarkers(storage);
    expect(hasMigrationRedirectMarker(scope, storage)).toBe(false);
  });
});

describe("opaque V2 handoff", () => {
  it("passes an issued opaque intent but never accepts a raw V1 invite code", () => {
    const destination = getV2HandoffDestination({ intent: "opaque-server-issued-intent" });
    const url = new URL(destination);
    expect(url.origin).toBe(V2_APP_URL);
    expect(url.searchParams.get("intent")).toBe("opaque-server-issued-intent");
    expect(url.searchParams.get("returnTo")).toBe("/app/plays");
    expect(getV2HandoffDestination({ inviteCode: "RAW-V1-CODE" })).toBeNull();
  });
});

// ── Which teams count as moved ───────────────────────────────────────────────

describe("isMovedTeam", () => {
  it("only v2_live counts as moved", () => {
    expect(isMovedTeam(team("a", "v2_live"))).toBe(true);
    expect(isMovedTeam(team("a", "migrating"))).toBe(false);
    expect(isMovedTeam(team("a", "v1_only"))).toBe(false);
    expect(isMovedTeam(null)).toBe(false);
  });
});

// ── Interstitial visibility ──────────────────────────────────────────────────

describe("shouldShowMovedInterstitial", () => {
  it("shows when every team has moved", () => {
    const status = loaded([team("a", "v2_live"), team("b", "v2_live")]);
    expect(shouldShowMovedInterstitial(status, "a")).toBe(true);
  });

  it("shows for a single moved team", () => {
    expect(shouldShowMovedInterstitial(loaded([team("a", "v2_live")]), "a")).toBe(true);
  });

  it("mixed: shows only while the moved team is the active one", () => {
    const status = loaded([team("a", "v2_live"), team("b", "v1_only")]);
    expect(shouldShowMovedInterstitial(status, "a")).toBe(true);
    expect(shouldShowMovedInterstitial(status, "b")).toBe(false);
  });

  it("never shows for an unmigrated coach", () => {
    const status = loaded([team("a", "v1_only"), team("b", "migrating")]);
    expect(shouldShowMovedInterstitial(status, "a")).toBe(false);
    expect(shouldShowMovedInterstitial(status, "b")).toBe(false);
  });

  it("FAILS OPEN when there is no trustworthy data", () => {
    // Cache never loaded / request failed / still in flight
    expect(shouldShowMovedInterstitial({ ready: false, teams: [] }, "a")).toBe(false);
    // A ready-but-empty response must not gate anyone either
    expect(shouldShowMovedInterstitial(loaded([]), "a")).toBe(false);
    expect(shouldShowMovedInterstitial(undefined, "a")).toBe(false);
    expect(shouldShowMovedInterstitial({ ready: true, teams: null }, "a")).toBe(false);
    // Even a ready response saying "moved" is ignored while ready is false
    expect(shouldShowMovedInterstitial({ ready: false, teams: [team("a", "v2_live")] }, "a")).toBe(false);
  });
});

// ── Banner visibility (the non-blocking half of the mixed case) ──────────────

describe("shouldShowMovedBanner", () => {
  it("shows while the coach works in the team that has not moved", () => {
    const status = loaded([team("a", "v2_live"), team("b", "v1_only")]);
    expect(shouldShowMovedBanner(status, "b")).toBe(true);
  });

  it("does not double up with the interstitial on the moved team", () => {
    const status = loaded([team("a", "v2_live"), team("b", "v1_only")]);
    expect(shouldShowMovedBanner(status, "a")).toBe(false);
  });

  it("shows nothing for an unmigrated coach or with no data", () => {
    expect(shouldShowMovedBanner(loaded([team("a", "v1_only")]), "a")).toBe(false);
    expect(shouldShowMovedBanner({ ready: false, teams: [team("a", "v2_live")] }, "b")).toBe(false);
  });

  it("never doubles up with the interstitial when every team has moved", () => {
    // Regression: with no active team selected, no moved team matched the null
    // id, so the banner fired alongside the all-moved interstitial.
    const status = loaded([team("a", "v2_live"), team("b", "v2_live")]);
    expect(shouldShowMovedInterstitial(status, null)).toBe(true);
    expect(shouldShowMovedBanner(status, null)).toBe(false);
    expect(shouldShowMovedBanner(status, undefined)).toBe(false);
    expect(shouldShowMovedBanner(status, "a")).toBe(false);
    expect(shouldShowMovedBanner(loaded([team("a", "v2_live")]), null)).toBe(false);
  });

  it("interstitial and banner are mutually exclusive in every case", () => {
    const cases = [
      loaded([team("a", "v2_live"), team("b", "v1_only")]),
      loaded([team("a", "v2_live"), team("b", "v2_live")]),
      loaded([team("a", "v2_live")]),
      loaded([team("a", "v1_only")]),
      loaded([team("a", "v2_live"), team("b", "migrating")]),
      loaded([team("a", "v1_only"), team("b", "migrating")]),
      loaded([]), // zero teams
      { ready: true, teams: null },
      { ready: false, teams: [team("a", "v2_live")] },
      { ready: false, teams: [] },
      undefined,
    ];
    for (const status of cases) {
      for (const active of ["a", "b", "unknown", null, undefined]) {
        const both =
          shouldShowMovedInterstitial(status, active) && shouldShowMovedBanner(status, active);
        expect(both).toBe(false);
      }
    }
  });
});

// ── GET /migration/me ────────────────────────────────────────────────────────

const getUserTeamStatuses = vi.fn();
const hasEverLoaded = vi.fn();

vi.mock("../../server/lib/migrationStatus.js", () => ({
  getUserTeamStatuses: (...args) => getUserTeamStatuses(...args),
  hasEverLoaded: (...args) => hasEverLoaded(...args),
}));

vi.mock("../../server/middleware/auth.js", () => ({
  requireAuth: (req, _res, next) => next(),
}));

/** Pull the registered layer for a method+path off an Express router. */
function findLayer(router, method, path) {
  return router.stack.find(
    (l) => l.route?.path === path && l.route?.methods?.[method] === true
  );
}

/** Minimal res double capturing status/json. */
function fakeRes() {
  return {
    statusCode: 200,
    body: undefined,
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

describe("GET /migration/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn(() => {
      throw new Error("the route must never call V2");
    });
  });

  it("is registered as a GET so the write-lock can never block it", async () => {
    const router = (await import("../../server/routes/migration.js")).default;
    expect(findLayer(router, "get", "/me")).toBeTruthy();
    expect(findLayer(router, "post", "/me")).toBeFalsy();
    expect(findLayer(router, "put", "/me")).toBeFalsy();
    expect(findLayer(router, "delete", "/me")).toBeFalsy();
  });

  it("returns the user's team statuses and the cache-loaded flag", async () => {
    const teams = [team("a", "v2_live"), team("b", "v1_only")];
    getUserTeamStatuses.mockResolvedValue(teams);
    hasEverLoaded.mockReturnValue(true);

    const router = (await import("../../server/routes/migration.js")).default;
    const layer = findLayer(router, "get", "/me");
    const res = fakeRes();
    const next = vi.fn();

    // Last handler in the stack is the route handler itself (requireAuth is mocked).
    const handlers = layer.route.stack.map((s) => s.handle);
    await handlers[handlers.length - 1]({ userId: "u1" }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(getUserTeamStatuses).toHaveBeenCalledWith("u1");
    expect(res.body).toEqual({ hasEverLoaded: true, teams });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("reports hasEverLoaded:false so the client shows nothing different", async () => {
    getUserTeamStatuses.mockResolvedValue([team("a", "v1_only")]);
    hasEverLoaded.mockReturnValue(false);

    const router = (await import("../../server/routes/migration.js")).default;
    const layer = findLayer(router, "get", "/me");
    const res = fakeRes();
    const handlers = layer.route.stack.map((s) => s.handle);
    await handlers[handlers.length - 1]({ userId: "u1" }, res, vi.fn());

    expect(res.body.hasEverLoaded).toBe(false);
    // And the client turns that into "no information at all"
    expect(shouldShowMovedInterstitial({ ready: false, teams: res.body.teams }, "a")).toBe(false);
  });

  it("passes errors to next() instead of throwing at the coach", async () => {
    getUserTeamStatuses.mockRejectedValue(new Error("db down"));
    hasEverLoaded.mockReturnValue(true);

    const router = (await import("../../server/routes/migration.js")).default;
    const layer = findLayer(router, "get", "/me");
    const res = fakeRes();
    const next = vi.fn();
    const handlers = layer.route.stack.map((s) => s.handle);
    await handlers[handlers.length - 1]({ userId: "u1" }, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.body).toBeUndefined();
  });
});
