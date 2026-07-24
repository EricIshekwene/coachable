// @vitest-environment jsdom
/**
 * Tests for the shared-play "add to team" flow: the team-eligibility
 * filtering used by SharedPlay.jsx/SharedFolder.jsx before deciding whether
 * to show a team picker, the server-side membership resolution mirrored
 * from server/routes/shared.js (resolveTargetMembership), and the
 * TeamPickerModal component itself.
 */
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import TeamPickerModal from "../../src/components/TeamPickerModal.jsx";

const COACH_ROLES = ["owner", "coach", "assistant_coach"];

// ── Client-side eligibility filter (mirrors SharedPlay.jsx / SharedFolder.jsx) ──

/**
 * Mirrors the `coachEligibleTeams` computation in SharedPlay.jsx: only teams
 * where the user holds a coach-level role are valid copy targets.
 * @param {Array<{teamId: string, role: string}>} allTeams
 * @param {string} activeTeamId
 */
const coachEligibleTeams = (allTeams, activeTeamId) =>
  (allTeams || [])
    .filter((t) => COACH_ROLES.includes(t.role))
    .map((t) => ({ ...t, isActive: t.teamId === activeTeamId }));

describe("coachEligibleTeams (client-side team-picker gating)", () => {
  const allTeams = [
    { teamId: "team-a", teamName: "Varsity", role: "coach" },
    { teamId: "team-b", teamName: "JV", role: "owner" },
    { teamId: "team-c", teamName: "Rec League", role: "player" },
  ];

  it("excludes teams where the user is only a player", () => {
    const eligible = coachEligibleTeams(allTeams, "team-a");
    expect(eligible.map((t) => t.teamId)).toEqual(["team-a", "team-b"]);
  });

  it("marks the currently active team", () => {
    const eligible = coachEligibleTeams(allTeams, "team-b");
    expect(eligible.find((t) => t.teamId === "team-b").isActive).toBe(true);
    expect(eligible.find((t) => t.teamId === "team-a").isActive).toBe(false);
  });

  it("multiple eligible teams means the UI must prompt, not guess", () => {
    const eligible = coachEligibleTeams(allTeams, "team-a");
    // This is the exact condition SharedPlay.jsx uses to decide whether to
    // open TeamPickerModal instead of silently copying to one team.
    expect(eligible.length > 1).toBe(true);
  });

  it("a single eligible team means no picker is needed", () => {
    const soloTeam = [{ teamId: "team-a", teamName: "Varsity", role: "coach" }];
    expect(coachEligibleTeams(soloTeam, "team-a").length).toBe(1);
  });
});

// ── Server-side membership resolution (mirrors server/routes/shared.js) ─────

/**
 * Mirrors resolveTargetMembership() in server/routes/shared.js against an
 * in-memory fixture instead of Postgres, so the branching logic (explicit
 * teamId vs. default team, membership vs. role checks) is covered without a
 * DB. See server/routes/shared.js findMembership/resolveDefaultMembership.
 */
function resolveTargetMembership({ memberships, activeTeamId, requestedTeamId }) {
  const findMembership = (teamId) => memberships.find((m) => m.team_id === teamId) || null;

  const resolveDefault = () => {
    if (activeTeamId) {
      const m = findMembership(activeTeamId);
      if (m) return m;
    }
    return memberships[0] || null;
  };

  const membership = requestedTeamId ? findMembership(requestedTeamId) : resolveDefault();

  if (!membership) {
    return requestedTeamId
      ? { ok: false, status: 403, error: "You don't have access to that team" }
      : { ok: false, status: 400, error: "You are not a member of any team" };
  }
  if (!COACH_ROLES.includes(membership.role)) {
    return { ok: false, status: 403, error: "Only coaches can add plays to the playbook" };
  }
  return { ok: true, membership };
}

describe("resolveTargetMembership (server-side)", () => {
  const memberships = [
    { team_id: "team-a", role: "coach" },
    { team_id: "team-b", role: "owner" },
    { team_id: "team-c", role: "player" },
  ];

  it("honors an explicit teamId the user belongs to", () => {
    const result = resolveTargetMembership({ memberships, activeTeamId: "team-a", requestedTeamId: "team-b" });
    expect(result).toEqual({ ok: true, membership: { team_id: "team-b", role: "owner" } });
  });

  it("rejects an explicit teamId the user does not belong to", () => {
    const result = resolveTargetMembership({ memberships, activeTeamId: "team-a", requestedTeamId: "team-z" });
    expect(result).toEqual({ ok: false, status: 403, error: "You don't have access to that team" });
  });

  it("rejects an explicit teamId where the user's role isn't coach-level", () => {
    const result = resolveTargetMembership({ memberships, activeTeamId: "team-a", requestedTeamId: "team-c" });
    expect(result).toEqual({ ok: false, status: 403, error: "Only coaches can add plays to the playbook" });
  });

  it("falls back to the active team when no teamId is given (no client-side gap)", () => {
    const result = resolveTargetMembership({ memberships, activeTeamId: "team-b", requestedTeamId: null });
    expect(result.membership.team_id).toBe("team-b");
  });

  it("falls back to the first membership when there's no active team on file", () => {
    const result = resolveTargetMembership({ memberships, activeTeamId: null, requestedTeamId: null });
    expect(result.membership.team_id).toBe("team-a");
  });

  it("returns 400 when the user has no memberships at all", () => {
    const result = resolveTargetMembership({ memberships: [], activeTeamId: null, requestedTeamId: null });
    expect(result).toEqual({ ok: false, status: 400, error: "You are not a member of any team" });
  });
});

// ── TeamPickerModal component ───────────────────────────────────────────────

describe("TeamPickerModal", () => {
  const teams = [
    { teamId: "team-a", teamName: "Varsity", role: "coach", isActive: true },
    { teamId: "team-b", teamName: "JV", role: "owner", isActive: false },
  ];

  it("renders nothing when closed", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(TeamPickerModal, { open: false, teams, onSelect: vi.fn(), onCancel: vi.fn() })
      );
    });
    expect(container.textContent).toBe("");
    act(() => root.unmount());
    container.remove();
  });

  it("lists every eligible team and calls onSelect with the chosen teamId", () => {
    const onSelect = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(TeamPickerModal, { open: true, teams, onSelect, onCancel: vi.fn() })
      );
    });

    expect(container.textContent).toContain("Varsity");
    expect(container.textContent).toContain("JV");

    const buttons = Array.from(container.querySelectorAll("button"));
    const jvButton = buttons.find((b) => b.textContent.includes("JV"));
    act(() => { jvButton.click(); });

    expect(onSelect).toHaveBeenCalledWith("team-b");

    act(() => root.unmount());
    container.remove();
  });

  it("calls onCancel when the close button is clicked", () => {
    const onCancel = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(TeamPickerModal, { open: true, teams, onSelect: vi.fn(), onCancel })
      );
    });

    const closeButton = container.querySelector('button[aria-label="Cancel"]');
    act(() => { closeButton.click(); });
    expect(onCancel).toHaveBeenCalled();

    act(() => root.unmount());
    container.remove();
  });
});
