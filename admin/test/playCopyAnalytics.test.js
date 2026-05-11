/**
 * Tests for play copy analytics filtering.
 * Verifies that plays copied from platform plays are excluded from
 * "plays created" counts and activity logs in admin analytics.
 *
 * Mirrors the SQL filter logic: AND copied_from_platform_play_id IS NULL
 * used in admin.js GET /admin/users and GET /admin/users/:userId.
 */
import { describe, it, expect } from "vitest";

// ── Helpers mirroring SQL filter logic ───────────────────────────────────────

/**
 * Mirrors: COUNT(*) FROM plays WHERE created_by_user_id = userId
 *   AND NOT is_seeded AND copied_from_platform_play_id IS NULL
 *
 * @param {Array<{createdByUserId: string, isSeeded: boolean, copiedFromPlatformPlayId: string|null}>} plays
 * @param {string} userId
 * @returns {number}
 */
const countPlaysCreated = (plays, userId) =>
  plays.filter(
    (p) =>
      p.createdByUserId === userId &&
      !p.isSeeded &&
      p.copiedFromPlatformPlayId === null
  ).length;

/**
 * Mirrors: COUNT(*) FROM plays WHERE updated_by_user_id = userId
 *   AND created_by_user_id <> userId AND NOT is_seeded
 *   AND copied_from_platform_play_id IS NULL
 *
 * @param {Array<{createdByUserId: string, updatedByUserId: string, isSeeded: boolean, copiedFromPlatformPlayId: string|null}>} plays
 * @param {string} userId
 * @returns {number}
 */
const countPlaysUpdated = (plays, userId) =>
  plays.filter(
    (p) =>
      p.updatedByUserId === userId &&
      p.createdByUserId !== userId &&
      !p.isSeeded &&
      p.copiedFromPlatformPlayId === null
  ).length;

/**
 * Mirrors the activity log play_created entries filter:
 *   WHERE created_by_user_id = userId AND copied_from_platform_play_id IS NULL
 *
 * @param {Array<{createdByUserId: string, copiedFromPlatformPlayId: string|null, title: string}>} plays
 * @param {string} userId
 * @returns {Array<{activityType: string, label: string}>}
 */
const getPlayCreatedActivity = (plays, userId) =>
  plays
    .filter(
      (p) =>
        p.createdByUserId === userId && p.copiedFromPlatformPlayId === null
    )
    .map((p) => ({ activityType: "play_created", label: p.title }));

// ── Test data ─────────────────────────────────────────────────────────────────

const USER_A = "user-a";
const USER_B = "user-b";
const PLATFORM_PLAY_ID = "platform-play-1";

const makePlays = () => [
  // User A created from scratch — should count
  { id: "1", title: "Scratch Play 1", createdByUserId: USER_A, updatedByUserId: USER_A, isSeeded: false, copiedFromPlatformPlayId: null },
  { id: "2", title: "Scratch Play 2", createdByUserId: USER_A, updatedByUserId: USER_A, isSeeded: false, copiedFromPlatformPlayId: null },
  // User A copied from playbook — should NOT count
  { id: "3", title: "Copied Play 1", createdByUserId: USER_A, updatedByUserId: USER_A, isSeeded: false, copiedFromPlatformPlayId: PLATFORM_PLAY_ID },
  { id: "4", title: "Copied Play 2", createdByUserId: USER_A, updatedByUserId: USER_A, isSeeded: false, copiedFromPlatformPlayId: PLATFORM_PLAY_ID },
  { id: "5", title: "Copied Play 3", createdByUserId: USER_A, updatedByUserId: USER_A, isSeeded: false, copiedFromPlatformPlayId: PLATFORM_PLAY_ID },
  // User A seeded play — should NOT count
  { id: "6", title: "Seeded Play", createdByUserId: USER_A, updatedByUserId: USER_A, isSeeded: true, copiedFromPlatformPlayId: null },
  // User B created, User A updated — should count toward A's plays_updated (not copied)
  { id: "7", title: "B Play Updated by A", createdByUserId: USER_B, updatedByUserId: USER_A, isSeeded: false, copiedFromPlatformPlayId: null },
  // User B created, User A updated — but copied — should NOT count
  { id: "8", title: "B Copied Updated by A", createdByUserId: USER_B, updatedByUserId: USER_A, isSeeded: false, copiedFromPlatformPlayId: PLATFORM_PLAY_ID },
];

// ── plays_created count ───────────────────────────────────────────────────────

describe("plays_created analytics count", () => {
  it("counts only scratch plays, not copies or seeded plays", () => {
    expect(countPlaysCreated(makePlays(), USER_A)).toBe(2);
  });

  it("returns 0 when all plays are copied from platform", () => {
    const plays = [
      { createdByUserId: USER_A, isSeeded: false, copiedFromPlatformPlayId: PLATFORM_PLAY_ID },
      { createdByUserId: USER_A, isSeeded: false, copiedFromPlatformPlayId: PLATFORM_PLAY_ID },
    ];
    expect(countPlaysCreated(plays, USER_A)).toBe(0);
  });

  it("returns 0 when all plays are seeded", () => {
    const plays = [
      { createdByUserId: USER_A, isSeeded: true, copiedFromPlatformPlayId: null },
    ];
    expect(countPlaysCreated(plays, USER_A)).toBe(0);
  });

  it("counts only the specified user's scratch plays (not other users')", () => {
    // USER_B has 1 scratch play (id "7") and 1 copied play (id "8"); only scratch counts
    expect(countPlaysCreated(makePlays(), USER_B)).toBe(1);
  });

  it("counts a non-copied, non-seeded play correctly", () => {
    const plays = [
      { createdByUserId: USER_A, isSeeded: false, copiedFromPlatformPlayId: null },
    ];
    expect(countPlaysCreated(plays, USER_A)).toBe(1);
  });
});

// ── plays_updated count ───────────────────────────────────────────────────────

describe("plays_updated analytics count", () => {
  it("counts only non-copied plays updated by user but created by another", () => {
    expect(countPlaysUpdated(makePlays(), USER_A)).toBe(1);
  });

  it("excludes plays where user is both creator and updater", () => {
    const plays = [
      { createdByUserId: USER_A, updatedByUserId: USER_A, isSeeded: false, copiedFromPlatformPlayId: null },
    ];
    expect(countPlaysUpdated(plays, USER_A)).toBe(0);
  });

  it("excludes copied plays from plays_updated", () => {
    const plays = [
      { createdByUserId: USER_B, updatedByUserId: USER_A, isSeeded: false, copiedFromPlatformPlayId: PLATFORM_PLAY_ID },
    ];
    expect(countPlaysUpdated(plays, USER_A)).toBe(0);
  });
});

// ── Activity log play_created entries ────────────────────────────────────────

describe("play_created activity log entries", () => {
  it("excludes copied plays from activity log", () => {
    const activity = getPlayCreatedActivity(makePlays(), USER_A);
    expect(activity.map((a) => a.label)).toEqual(
      expect.arrayContaining(["Scratch Play 1", "Scratch Play 2"])
    );
    expect(activity.map((a) => a.label)).not.toContain("Copied Play 1");
    expect(activity.map((a) => a.label)).not.toContain("Copied Play 2");
    expect(activity.map((a) => a.label)).not.toContain("Copied Play 3");
  });

  it("returns empty array when all plays are copies", () => {
    const plays = [
      { createdByUserId: USER_A, copiedFromPlatformPlayId: PLATFORM_PLAY_ID, title: "Copied" },
    ];
    expect(getPlayCreatedActivity(plays, USER_A)).toHaveLength(0);
  });

  it("all returned entries have activityType play_created", () => {
    const activity = getPlayCreatedActivity(makePlays(), USER_A);
    expect(activity.every((a) => a.activityType === "play_created")).toBe(true);
  });
});
