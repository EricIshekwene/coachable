/**
 * analyticsDashboard.test.js
 *
 * Tests for analytics dashboard pure logic:
 *   - period-to-interval mapping (backend route logic)
 *   - KpiCard delta color resolution
 *   - KpiStrip tile generation from summary data
 *   - sport label formatting
 *   - onboarding funnel percentage calculation
 *   - useDashboardAnalytics URL construction
 */

import { describe, it, expect } from "vitest";

// ── Backend: period → SQL interval mapping ────────────────────────────────────

const PERIOD_MAP = {
  "7d":  "7 days",
  "30d": "30 days",
  "90d": "90 days",
  "all": null,
};

describe("analytics period mapping", () => {
  it("maps 30d to '30 days'", () => {
    expect(PERIOD_MAP["30d"]).toBe("30 days");
  });

  it("maps 7d to '7 days'", () => {
    expect(PERIOD_MAP["7d"]).toBe("7 days");
  });

  it("maps 90d to '90 days'", () => {
    expect(PERIOD_MAP["90d"]).toBe("90 days");
  });

  it("maps all to null (no date filter)", () => {
    expect(PERIOD_MAP["all"]).toBeNull();
  });

  it("unknown period falls back to 30d default", () => {
    const key = PERIOD_MAP.hasOwnProperty("unknown") ? "unknown" : "30d";
    expect(PERIOD_MAP[key]).toBe("30 days");
  });
});

// ── KpiCard: delta color logic ────────────────────────────────────────────────

function resolveDeltaColor(delta) {
  if (delta == null) return "var(--adm-muted)";
  if (delta > 0) return "#4ade80";
  if (delta < 0) return "var(--adm-danger)";
  return "var(--adm-muted)";
}

function resolveDeltaText(delta, deltaLabel = "") {
  if (delta == null) return null;
  return `${delta > 0 ? "+" : ""}${delta}${deltaLabel ? " " + deltaLabel : ""}`;
}

describe("KpiCard delta display", () => {
  it("positive delta gets green color", () => {
    expect(resolveDeltaColor(5)).toBe("#4ade80");
  });

  it("negative delta gets danger color", () => {
    expect(resolveDeltaColor(-3)).toContain("var(--adm-danger)");
  });

  it("zero delta gets muted color", () => {
    expect(resolveDeltaColor(0)).toBe("var(--adm-muted)");
  });

  it("null delta gets muted color and null text", () => {
    expect(resolveDeltaColor(null)).toBe("var(--adm-muted)");
    expect(resolveDeltaText(null)).toBeNull();
  });

  it("positive delta text has + prefix", () => {
    expect(resolveDeltaText(8, "new")).toBe("+8 new");
  });

  it("negative delta text has no extra prefix", () => {
    expect(resolveDeltaText(-2, "new")).toBe("-2 new");
  });
});

// ── KpiStrip: tile generation ─────────────────────────────────────────────────

function buildTiles(summary) {
  return [
    { key: "users",  label: "Total Users",  value: summary.totalUsers?.toLocaleString(), delta: summary.newUsers  },
    { key: "teams",  label: "Teams",        value: summary.totalTeams?.toLocaleString(), delta: summary.newTeams  },
    { key: "plays",  label: "Plays",        value: summary.totalPlays?.toLocaleString(), delta: summary.newPlays  },
    { key: "active", label: "Active Teams", value: `${summary.activeTeamsPct ?? 0}%`,   delta: null              },
    { key: "errors", label: "Errors",       value: summary.openErrors?.toLocaleString(), delta: null             },
    { key: "issues", label: "Open Issues",  value: summary.openIssues?.toLocaleString(), delta: null             },
  ];
}

describe("KpiStrip tile generation", () => {
  const summary = {
    totalUsers: 312, newUsers: 8,
    totalTeams: 94,  newTeams: 3,
    totalPlays: 1847, newPlays: 34,
    activeTeamsPct: 67,
    openErrors: 12,
    openIssues: 5,
  };

  it("generates exactly 6 tiles", () => {
    expect(buildTiles(summary)).toHaveLength(6);
  });

  it("first tile is users with correct value", () => {
    const tiles = buildTiles(summary);
    expect(tiles[0].key).toBe("users");
    expect(tiles[0].value).toBe("312");
    expect(tiles[0].delta).toBe(8);
  });

  it("active teams tile shows percentage string", () => {
    const tiles = buildTiles(summary);
    const active = tiles.find((t) => t.key === "active");
    expect(active.value).toBe("67%");
    expect(active.delta).toBeNull();
  });

  it("errors and issues tiles have null delta", () => {
    const tiles = buildTiles(summary);
    expect(tiles.find((t) => t.key === "errors").delta).toBeNull();
    expect(tiles.find((t) => t.key === "issues").delta).toBeNull();
  });
});

// ── Sport label formatting ────────────────────────────────────────────────────

function fmtSport(s) {
  return (s || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

describe("sport label formatting", () => {
  it("capitalizes single word sport", () => {
    expect(fmtSport("rugby")).toBe("Rugby");
  });

  it("converts underscore to space and capitalizes", () => {
    expect(fmtSport("field_hockey")).toBe("Field Hockey");
  });

  it("handles ice_hockey", () => {
    expect(fmtSport("ice_hockey")).toBe("Ice Hockey");
  });

  it("handles null/undefined as unknown", () => {
    expect(fmtSport(null)).toBe("Unknown");
    expect(fmtSport(undefined)).toBe("Unknown");
  });
});

// ── Onboarding funnel percentage calculation ──────────────────────────────────

function funnelPct(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

describe("onboarding funnel percentages", () => {
  const funnel = { registered: 312, email_verified: 289, onboarded: 241, has_team: 230, has_plays: 194 };

  it("registered is 100%", () => {
    expect(funnelPct(funnel.registered, funnel.registered)).toBe(100);
  });

  it("email verified conversion is correct", () => {
    expect(funnelPct(funnel.email_verified, funnel.registered)).toBe(93);
  });

  it("onboarded conversion is correct", () => {
    expect(funnelPct(funnel.onboarded, funnel.registered)).toBe(77);
  });

  it("handles zero total without divide-by-zero", () => {
    expect(funnelPct(0, 0)).toBe(0);
  });
});

// ── useDashboardAnalytics URL construction ────────────────────────────────────

function buildAnalyticsUrl(apiBase, period) {
  return `${apiBase}/admin/analytics?period=${period}`;
}

describe("analytics URL construction", () => {
  it("includes period query param", () => {
    const url = buildAnalyticsUrl("http://localhost:3001", "30d");
    expect(url).toBe("http://localhost:3001/admin/analytics?period=30d");
  });

  it("works for all period values", () => {
    for (const p of ["7d", "30d", "90d", "all"]) {
      const url = buildAnalyticsUrl("http://localhost:3001", p);
      expect(url).toContain(`period=${p}`);
    }
  });
});
