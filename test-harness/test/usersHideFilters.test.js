/**
 * Tests for the Admin users table "Hide" dropdown filters.
 * Covers verified/unverified and beta tester/standard hide options
 * alongside the existing role and demo-account filters.
 */
import { describe, it, expect } from "vitest";

/**
 * Mirrors the filtering logic in src/pages/Admin.jsx for the users table.
 * @param {Array} users - List of user records.
 * @param {Set<string>} hideOptions - Set of hide keys (e.g. "verified", "beta_tester").
 * @returns {Array} Filtered users.
 */
function applyHideFilters(users, hideOptions) {
  return users.filter((u) => {
    if (hideOptions.has("demo") && u.email?.endsWith("@coachable-seed.invalid")) return false;
    if (hideOptions.has("player") && (u.memberships || []).some((m) => m.role === "player")) return false;
    if (hideOptions.has("assistant_coach") && (u.memberships || []).some((m) => m.role === "assistant_coach")) return false;
    if (hideOptions.has("coach") && (u.memberships || []).some((m) => m.role === "coach")) return false;
    if (hideOptions.has("owner") && (u.memberships || []).some((m) => m.role === "owner")) return false;
    if (hideOptions.has("verified") && u.email_verified_at) return false;
    if (hideOptions.has("unverified") && !u.email_verified_at) return false;
    if (hideOptions.has("beta_tester") && u.is_beta_tester) return false;
    if (hideOptions.has("standard") && !u.is_beta_tester) return false;
    return true;
  });
}

const users = [
  { id: "u1", email: "verified-beta@example.com", email_verified_at: "2026-01-01T00:00:00Z", is_beta_tester: true, memberships: [{ role: "coach" }] },
  { id: "u2", email: "verified-standard@example.com", email_verified_at: "2026-01-02T00:00:00Z", is_beta_tester: false, memberships: [{ role: "owner" }] },
  { id: "u3", email: "unverified-beta@example.com", email_verified_at: null, is_beta_tester: true, memberships: [{ role: "player" }] },
  { id: "u4", email: "unverified-standard@example.com", email_verified_at: null, is_beta_tester: false, memberships: [{ role: "assistant_coach" }] },
  { id: "u5", email: "demo@coachable-seed.invalid", email_verified_at: "2026-01-03T00:00:00Z", is_beta_tester: false, memberships: [{ role: "player" }] },
];

describe("Admin users table hide filters", () => {
  describe("verified / unverified", () => {
    it("hides verified users when 'verified' is set", () => {
      const result = applyHideFilters(users, new Set(["verified"]));
      const ids = result.map((u) => u.id).sort();
      expect(ids).toEqual(["u3", "u4"]);
    });

    it("hides unverified users when 'unverified' is set", () => {
      const result = applyHideFilters(users, new Set(["unverified"]));
      const ids = result.map((u) => u.id).sort();
      expect(ids).toEqual(["u1", "u2", "u5"]);
    });

    it("returns nothing when both verified and unverified are hidden", () => {
      const result = applyHideFilters(users, new Set(["verified", "unverified"]));
      expect(result).toHaveLength(0);
    });
  });

  describe("beta tester / standard", () => {
    it("hides beta testers when 'beta_tester' is set", () => {
      const result = applyHideFilters(users, new Set(["beta_tester"]));
      const ids = result.map((u) => u.id).sort();
      expect(ids).toEqual(["u2", "u4", "u5"]);
    });

    it("hides standard users when 'standard' is set", () => {
      const result = applyHideFilters(users, new Set(["standard"]));
      const ids = result.map((u) => u.id).sort();
      expect(ids).toEqual(["u1", "u3"]);
    });

    it("returns nothing when both beta_tester and standard are hidden", () => {
      const result = applyHideFilters(users, new Set(["beta_tester", "standard"]));
      expect(result).toHaveLength(0);
    });
  });

  describe("combined hide filters", () => {
    it("composes verified + beta_tester hides correctly", () => {
      const result = applyHideFilters(users, new Set(["verified", "beta_tester"]));
      const ids = result.map((u) => u.id).sort();
      expect(ids).toEqual(["u4"]);
    });

    it("composes with demo hide filter", () => {
      const result = applyHideFilters(users, new Set(["demo", "unverified"]));
      const ids = result.map((u) => u.id).sort();
      expect(ids).toEqual(["u1", "u2"]);
    });

    it("returns the full list when no hide options are active", () => {
      const result = applyHideFilters(users, new Set());
      expect(result).toHaveLength(users.length);
    });
  });
});
