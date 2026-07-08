/**
 * Tests for the admin tutorial-preview mock API (src/utils/tutorialPreview.js).
 * Covers the in-memory handlers the onboarding tour depends on: the fake
 * session, play create/list/update, invites, and the fail-soft fallback.
 * Each test injects a fresh store so nothing leaks between cases.
 */
import { describe, it, expect } from "vitest";
import { mockApiFetch, createPreviewStore, isTutorialPreviewActive } from "../../src/utils/tutorialPreview.js";

describe("isTutorialPreviewActive", () => {
  it("is false outside a browser session (no sessionStorage flag)", () => {
    expect(isTutorialPreviewActive()).toBe(false);
  });
});

describe("mockApiFetch — fake session", () => {
  it("returns an onboarded non-personal coach from /auth/me so RequireAuth/RequireOnboarded pass and the invite flow is included", async () => {
    const db = createPreviewStore();
    const data = await mockApiFetch("/auth/me", {}, db);
    expect(data.user.onboarded).toBe(true);
    expect(data.user.isPersonalTeam).toBe(false);
    expect(["owner", "coach"]).toContain(data.user.role);
    expect(data.user.teamId).toBe("preview-team");
    expect(data.allTeams).toHaveLength(1);
  });

  it("serves team members and invite codes for the Team page", async () => {
    const db = createPreviewStore();
    const members = await mockApiFetch("/teams/preview-team/members", {}, db);
    expect(members.members.length).toBeGreaterThan(0);
    const codes = await mockApiFetch("/teams/preview-team/invite-codes", {}, db);
    expect(codes.codes.coach).toBeTruthy();
    expect(codes.codes.player).toBeTruthy();
  });

  it("fails closed on flags and suite features so gated UI stays hidden", async () => {
    const db = createPreviewStore();
    expect((await mockApiFetch("/flags/me", {}, db)).flags).toEqual({});
    expect((await mockApiFetch("/teams/preview-team/suite/features", {}, db)).features).toEqual({});
  });
});

describe("mockApiFetch — plays lifecycle (the tour's Flow A)", () => {
  it("creates a play, lists it, fetches it by id, and patches it in memory", async () => {
    const db = createPreviewStore();
    const created = await mockApiFetch("/teams/preview-team/plays", {
      method: "POST",
      body: { title: "First Play", playData: { play: {} } },
    }, db);
    expect(created.play.id).toMatch(/^preview-play-/);
    expect(created.play.title).toBe("First Play");

    const list = await mockApiFetch("/teams/preview-team/plays", {}, db);
    expect(list.plays).toHaveLength(1);

    const fetched = await mockApiFetch(`/teams/preview-team/plays/${created.play.id}`, {}, db);
    expect(fetched.play.title).toBe("First Play");

    const patched = await mockApiFetch(`/teams/preview-team/plays/${created.play.id}`, {
      method: "PATCH",
      body: { title: "Renamed" },
    }, db);
    expect(patched.play.title).toBe("Renamed");
    expect(db.plays[0].title).toBe("Renamed");
  });

  it("rejects with a 404-shaped error for a missing play so PlayEditPage falls back cleanly", async () => {
    const db = createPreviewStore();
    await expect(mockApiFetch("/teams/preview-team/plays/nope", {}, db)).rejects.toMatchObject({ status: 404 });
  });
});

describe("mockApiFetch — invites and fallback", () => {
  it("accepts an invite send without doing anything (Flow B)", async () => {
    const db = createPreviewStore();
    const res = await mockApiFetch("/teams/preview-team/invites", {
      method: "POST",
      body: { email: "assistant@example.com", role: "coach" },
    }, db);
    expect(res).toEqual({});
  });

  it("rotates an invite code in memory", async () => {
    const db = createPreviewStore();
    const before = db.inviteCodes.coach;
    const res = await mockApiFetch("/teams/preview-team/invite-codes/rotate", {
      method: "POST",
      body: { role: "coach" },
    }, db);
    expect(res.code).toBeTruthy();
    expect(db.inviteCodes.coach).not.toBe(before);
  });

  it("resolves unknown endpoints to {} instead of throwing (fail soft, never persist)", async () => {
    const db = createPreviewStore();
    const res = await mockApiFetch("/some/unknown/endpoint", { method: "POST", body: { x: 1 } }, db);
    expect(res).toEqual({});
  });
});
