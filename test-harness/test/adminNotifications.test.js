/**
 * adminNotifications.test.js
 *
 * Unit tests for the pure notification helpers backing the admin
 * notification command center: audience SQL targeting, audience labels,
 * and response aggregation for the analytics detail view.
 */

import { describe, it, expect } from "vitest";
import {
  buildNotifAudienceSql,
  buildNotifAudienceLabel,
  aggregateNotifResponses,
} from "../../server/lib/notificationAudience.js";

describe("buildNotifAudienceSql", () => {
  it("defaults to all verified users with no extra params", () => {
    const { where, params } = buildNotifAudienceSql({});
    expect(where).toContain("u.email IS NOT NULL");
    expect(where).not.toContain("EXISTS");
    expect(params).toEqual([]);
  });

  it("active mode filters on recent play activity", () => {
    const { where } = buildNotifAudienceSql({ mode: "active" });
    expect(where).toContain("plays p");
    expect(where).toContain("30 days");
    expect(where).not.toContain("NOT EXISTS");
  });

  it("inactive mode negates the active condition", () => {
    const { where } = buildNotifAudienceSql({ mode: "inactive" });
    expect(where).toContain("NOT EXISTS");
  });

  it("coaches mode targets coach-family roles", () => {
    const { where } = buildNotifAudienceSql({ mode: "coaches" });
    expect(where).toContain("tm.role IN ('owner','coach','assistant_coach')");
  });

  it("players mode targets the player role", () => {
    const { where } = buildNotifAudienceSql({ mode: "players" });
    expect(where).toContain("tm.role = 'player'");
  });

  it("sport filter binds a parameter and uses ILIKE", () => {
    const { where, params } = buildNotifAudienceSql({ sport: "Rugby" });
    expect(where).toContain("t.sport ILIKE $1");
    expect(params).toEqual(["Rugby"]);
  });

  it("has_plays and no_plays produce opposite EXISTS clauses", () => {
    expect(buildNotifAudienceSql({ playFilter: "has_plays" }).where)
      .toContain("EXISTS (SELECT 1 FROM plays p WHERE p.created_by_user_id = u.id)");
    expect(buildNotifAudienceSql({ playFilter: "no_plays" }).where)
      .toContain("NOT EXISTS (SELECT 1 FROM plays p WHERE p.created_by_user_id = u.id)");
  });

  it("signup date range binds params in order", () => {
    const { where, params } = buildNotifAudienceSql({ signupFrom: "2026-01-01", signupTo: "2026-02-01" });
    expect(where).toContain("u.created_at >= $1");
    expect(where).toContain("u.created_at <= ($2::date + interval '1 day')");
    expect(params).toEqual(["2026-01-01", "2026-02-01"]);
  });

  it("combines mode + sport + playFilter with sequential param indexes", () => {
    const { where, params } = buildNotifAudienceSql({ mode: "coaches", sport: "Soccer", playFilter: "has_plays" });
    expect(where).toContain("tm.role IN ('owner','coach','assistant_coach')");
    expect(where).toContain("t.sport ILIKE $1");
    expect(params).toEqual(["Soccer"]);
  });
});

describe("buildNotifAudienceLabel", () => {
  it("labels each base mode", () => {
    expect(buildNotifAudienceLabel({ mode: "all" })).toBe("All users");
    expect(buildNotifAudienceLabel({ mode: "active" })).toBe("Active users");
    expect(buildNotifAudienceLabel({ mode: "inactive" })).toBe("Inactive users");
    expect(buildNotifAudienceLabel({ mode: "coaches" })).toBe("Coaches");
    expect(buildNotifAudienceLabel({ mode: "players" })).toBe("Players");
  });

  it("appends sport and play filter with a separator", () => {
    expect(buildNotifAudienceLabel({ mode: "coaches", sport: "Rugby", playFilter: "has_plays" }))
      .toBe("Coaches · Rugby · has plays");
  });

  it("describes a signup range", () => {
    expect(buildNotifAudienceLabel({ signupFrom: "2026-01-01", signupTo: "2026-02-01" }))
      .toContain("joined 2026-01-01");
  });

  it("falls back to All users for an unknown mode", () => {
    expect(buildNotifAudienceLabel({ mode: "nonsense" })).toBe("All users");
  });
});

describe("aggregateNotifResponses", () => {
  const blocks = [
    { id: "t1", kind: "text", html: "<p>Hi</p>" },
    { id: "q_rate", kind: "question", type: "rating", label: "Rate it" },
    { id: "q_choice", kind: "question", type: "multiple", label: "Pick one", options: ["A", "B", "C"] },
    { id: "q_yn", kind: "question", type: "yes_no", label: "Agree?" },
    { id: "q_text", kind: "question", type: "paragraph", label: "Thoughts" },
    { id: "q_check", kind: "question", type: "checkboxes", label: "All that apply", options: ["X", "Y"] },
  ];

  const rows = [
    { answers: { q_rate: 5, q_choice: "A", q_yn: "Yes", q_text: "Great", q_check: ["X", "Y"] } },
    { answers: { q_rate: 3, q_choice: "A", q_yn: "No", q_text: "Meh", q_check: ["X"] } },
    { answers: { q_rate: 4, q_choice: "B", q_yn: "Yes" } },
  ];

  it("ignores text blocks and summarizes only questions", () => {
    const summary = aggregateNotifResponses(blocks, rows);
    expect(summary).toHaveLength(5);
    expect(summary.find((s) => s.id === "t1")).toBeUndefined();
  });

  it("computes a rating average and a 1–5 distribution", () => {
    const rate = aggregateNotifResponses(blocks, rows).find((s) => s.id === "q_rate");
    expect(rate.average).toBeCloseTo(4, 5);
    expect(rate.distribution).toHaveLength(5);
    expect(rate.distribution.find((d) => d.name === "5★").value).toBe(1);
    expect(rate.distribution.find((d) => d.name === "3★").value).toBe(1);
  });

  it("counts multiple-choice selections per option", () => {
    const choice = aggregateNotifResponses(blocks, rows).find((s) => s.id === "q_choice");
    expect(choice.distribution.find((d) => d.name === "A").value).toBe(2);
    expect(choice.distribution.find((d) => d.name === "B").value).toBe(1);
    expect(choice.distribution.find((d) => d.name === "C").value).toBe(0);
  });

  it("counts yes/no answers", () => {
    const yn = aggregateNotifResponses(blocks, rows).find((s) => s.id === "q_yn");
    expect(yn.distribution.find((d) => d.name === "Yes").value).toBe(2);
    expect(yn.distribution.find((d) => d.name === "No").value).toBe(1);
  });

  it("tallies each checkbox option independently", () => {
    const check = aggregateNotifResponses(blocks, rows).find((s) => s.id === "q_check");
    expect(check.distribution.find((d) => d.name === "X").value).toBe(2);
    expect(check.distribution.find((d) => d.name === "Y").value).toBe(1);
  });

  it("collects free-text samples newest-first", () => {
    const text = aggregateNotifResponses(blocks, rows).find((s) => s.id === "q_text");
    expect(text.samples).toEqual(["Meh", "Great"]);
  });

  it("handles no responses without throwing", () => {
    const summary = aggregateNotifResponses(blocks, []);
    const rate = summary.find((s) => s.id === "q_rate");
    expect(rate.average).toBe(0);
    expect(rate.distribution.every((d) => d.value === 0)).toBe(true);
  });
});
