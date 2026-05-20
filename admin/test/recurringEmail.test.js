import { describe, expect, it } from "vitest";
import { computeNextSendAt } from "../../server/utils/computeNextSendAt.js";

// ── computeNextSendAt ─────────────────────────────────────────────────────────

describe("computeNextSendAt", () => {
  // Use a fixed "now": Wednesday 2026-05-20 at 08:00 UTC (day=3, hour=8)
  const NOW = new Date("2026-05-20T08:00:00.000Z");

  describe("weekly", () => {
    it("returns the same day when send time is later today", () => {
      // Wednesday at 10:00 UTC — 2 hours from now
      const next = computeNextSendAt(
        { frequency_type: "weekly", frequency_day_of_week: 3, frequency_hour: 10, last_sent_at: null },
        NOW
      );
      expect(next.getUTCDay()).toBe(3);
      expect(next.getUTCHours()).toBe(10);
      expect(next > NOW).toBe(true);
    });

    it("advances one week when send time already passed today", () => {
      // Wednesday at 07:00 UTC — already past
      const next = computeNextSendAt(
        { frequency_type: "weekly", frequency_day_of_week: 3, frequency_hour: 7, last_sent_at: null },
        NOW
      );
      expect(next.getUTCDay()).toBe(3);
      expect(next.getUTCHours()).toBe(7);
      // Must be 7 days later
      const diffMs = next - NOW;
      expect(diffMs).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    });

    it("schedules correctly for a future day this week", () => {
      // Friday (day 5) at 09:00 UTC — 2 days away
      const next = computeNextSendAt(
        { frequency_type: "weekly", frequency_day_of_week: 5, frequency_hour: 9, last_sent_at: null },
        NOW
      );
      expect(next.getUTCDay()).toBe(5);
      expect(next.getUTCHours()).toBe(9);
      expect(next > NOW).toBe(true);
    });

    it("schedules correctly when target day is Sunday (day 0) and today is Wednesday", () => {
      const next = computeNextSendAt(
        { frequency_type: "weekly", frequency_day_of_week: 0, frequency_hour: 9, last_sent_at: null },
        NOW
      );
      expect(next.getUTCDay()).toBe(0);
      expect(next > NOW).toBe(true);
    });
  });

  describe("monthly", () => {
    it("schedules for later this month when day has not passed", () => {
      // Day 25 at 09:00 — today is the 20th
      const next = computeNextSendAt(
        { frequency_type: "monthly", frequency_day_of_month: 25, frequency_hour: 9, last_sent_at: null },
        NOW
      );
      expect(next.getUTCDate()).toBe(25);
      expect(next.getUTCMonth()).toBe(NOW.getUTCMonth());
      expect(next > NOW).toBe(true);
    });

    it("rolls to next month when the day has passed", () => {
      // Day 10 at 09:00 — today is the 20th
      const next = computeNextSendAt(
        { frequency_type: "monthly", frequency_day_of_month: 10, frequency_hour: 9, last_sent_at: null },
        NOW
      );
      expect(next.getUTCDate()).toBe(10);
      expect(next.getUTCMonth()).toBe(NOW.getUTCMonth() + 1);
      expect(next > NOW).toBe(true);
    });

    it("rolls to next month when same day but send time already passed", () => {
      // Day 20 at 07:00 UTC — today is the 20th at 08:00 so it's past
      const next = computeNextSendAt(
        { frequency_type: "monthly", frequency_day_of_month: 20, frequency_hour: 7, last_sent_at: null },
        NOW
      );
      expect(next.getUTCDate()).toBe(20);
      expect(next.getUTCMonth()).toBe(NOW.getUTCMonth() + 1);
    });
  });

  describe("custom interval", () => {
    it("schedules N days from last_sent_at when result is in the future", () => {
      const lastSent = new Date("2026-05-18T09:00:00.000Z"); // 2 days ago
      const next = computeNextSendAt(
        { frequency_type: "custom", frequency_interval_days: 7, frequency_hour: 9, last_sent_at: lastSent },
        NOW
      );
      // 7 days from lastSent = 2026-05-25T09:00Z
      expect(next.toISOString()).toBe("2026-05-25T09:00:00.000Z");
    });

    it("schedules N days from now when last_sent result would be in the past", () => {
      const lastSent = new Date("2026-05-10T09:00:00.000Z"); // 10 days ago, +7 = May 17, already past
      const next = computeNextSendAt(
        { frequency_type: "custom", frequency_interval_days: 7, frequency_hour: 9, last_sent_at: lastSent },
        NOW
      );
      // Falls back to N days from now
      expect(next > NOW).toBe(true);
      const diffDays = (next - NOW) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeGreaterThanOrEqual(6.9);
    });

    it("uses now as base when last_sent_at is null", () => {
      const next = computeNextSendAt(
        { frequency_type: "custom", frequency_interval_days: 14, frequency_hour: 9, last_sent_at: null },
        NOW
      );
      expect(next > NOW).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("returns null for unknown frequency_type", () => {
      const next = computeNextSendAt(
        { frequency_type: "hourly", frequency_hour: 9, last_sent_at: null },
        NOW
      );
      expect(next).toBeNull();
    });

    it("uses hour 9 by default when frequency_hour is missing", () => {
      const next = computeNextSendAt(
        { frequency_type: "weekly", frequency_day_of_week: 5, last_sent_at: null },
        NOW
      );
      expect(next.getUTCHours()).toBe(9);
    });

    it("always returns a future date", () => {
      for (const type of ["weekly", "monthly", "custom"]) {
        const campaign =
          type === "weekly"
            ? { frequency_type: "weekly", frequency_day_of_week: NOW.getUTCDay(), frequency_hour: NOW.getUTCHours() - 1, last_sent_at: null }
            : type === "monthly"
            ? { frequency_type: "monthly", frequency_day_of_month: NOW.getUTCDate(), frequency_hour: NOW.getUTCHours() - 1, last_sent_at: null }
            : { frequency_type: "custom", frequency_interval_days: 1, frequency_hour: 0, last_sent_at: new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000) };
        const next = computeNextSendAt(campaign, NOW);
        expect(next > NOW).toBe(true);
      }
    });
  });
});
