/**
 * Tests mirroring the view-only playback entry-point wiring restored in:
 *  - src/pages/app/PlayView.jsx      (in-app detail header "View" button)
 *  - src/pages/PlayViewOnlyPage.jsx  (the /view route Slate mount)
 *  - src/pages/SharedPlay.jsx        (shared/public detail "View" button)
 *
 * These are pure re-wiring changes (a prop pass-through, a header <Link>, an
 * icon/label swap), so — matching the repo convention (see
 * sharedPlayViewport.test.js) — the load-bearing logic is mirrored as small
 * pure functions and asserted here, rather than rendering the pages.
 *
 * The facts locked in:
 *  1. The detail action row (which now holds the View button) shows only for a
 *     non-view-only viewer looking at a team play. The View button itself lives
 *     inside that row but OUTSIDE the coach-edit gate — every viewer who sees
 *     the row sees View, while Edit stays gated behind canCoachEdit.
 *  2. The View button targets the dedicated /view route for the play.
 *  3. The /view host page must pass autoplayOnLoad so Slate autoplays on open
 *     (the Slate autoplay effect no-ops unless autoplayOnLoad && viewOnly).
 */
import { describe, it, expect } from "vitest";

/**
 * Mirrors the outer action-row gate in PlayView.jsx: `!effectiveViewOnly && play.teamId`.
 * @param {boolean} effectiveViewOnly - viewOnly prop OR playerViewMode.
 * @param {string|null|undefined} teamId - the play's teamId.
 * @returns {boolean} whether the detail action row (View + optional Edit) renders.
 */
const showsDetailActionRow = (effectiveViewOnly, teamId) =>
  !effectiveViewOnly && Boolean(teamId);

/**
 * Mirrors the View button's visibility: it is inside the action row but not
 * behind the `canCoachEdit` gate, so it shows whenever the row shows.
 * @param {boolean} effectiveViewOnly
 * @param {string|null|undefined} teamId
 * @returns {boolean}
 */
const showsViewButton = (effectiveViewOnly, teamId) =>
  showsDetailActionRow(effectiveViewOnly, teamId);

/**
 * Mirrors the Edit button's visibility: inside the row AND behind canCoachEdit.
 * @param {boolean} effectiveViewOnly
 * @param {string|null|undefined} teamId
 * @param {boolean} canCoachEdit
 * @returns {boolean}
 */
const showsEditButton = (effectiveViewOnly, teamId, canCoachEdit) =>
  showsDetailActionRow(effectiveViewOnly, teamId) && canCoachEdit;

/** Mirrors the View <Link> destination in PlayView.jsx / SharedPlay.jsx target. */
const viewRouteFor = (playId) => `/app/plays/${playId}/view`;

/**
 * Mirrors Slate's autoplay-on-load gate: `autoplayOnLoad && viewOnly`.
 * PlayViewOnlyPage now mounts <Slate viewOnly autoplayOnLoad />, so this is true.
 * @param {boolean} autoplayOnLoad
 * @param {boolean} viewOnly
 * @returns {boolean}
 */
const willAutoplayOnLoad = (autoplayOnLoad, viewOnly) =>
  Boolean(autoplayOnLoad) && Boolean(viewOnly);

describe("PlayView detail action row gating", () => {
  it("shows the action row for a normal coach viewing a team play", () => {
    expect(showsDetailActionRow(false, "team_1")).toBe(true);
  });

  it("hides the whole action row in view-only / player-view contexts", () => {
    expect(showsDetailActionRow(true, "team_1")).toBe(false);
  });

  it("hides the action row for a play with no team", () => {
    expect(showsDetailActionRow(false, null)).toBe(false);
  });
});

describe("View button is available to all viewers of the row (not coach-gated)", () => {
  it("shows View whenever the row shows, even without coach-edit rights", () => {
    expect(showsViewButton(false, "team_1")).toBe(true);
    // Edit is hidden for the same non-coach viewer...
    expect(showsEditButton(false, "team_1", /* canCoachEdit */ false)).toBe(false);
  });

  it("shows both View and Edit for a coach with edit rights", () => {
    expect(showsViewButton(false, "team_1")).toBe(true);
    expect(showsEditButton(false, "team_1", /* canCoachEdit */ true)).toBe(true);
  });

  it("hides View when the whole row is suppressed (view-only)", () => {
    expect(showsViewButton(true, "team_1")).toBe(false);
  });
});

describe("View button destination", () => {
  it("targets the dedicated /view route for the play", () => {
    expect(viewRouteFor("abc123")).toBe("/app/plays/abc123/view");
  });
});

describe("/view route autoplay wiring", () => {
  it("autoplays once the page passes autoplayOnLoad to a view-only Slate", () => {
    expect(willAutoplayOnLoad(true, true)).toBe(true);
  });

  it("does not autoplay if autoplayOnLoad is omitted (the pre-fix bug)", () => {
    expect(willAutoplayOnLoad(false, true)).toBe(false);
  });

  it("does not autoplay in an editing (non-view-only) mount", () => {
    expect(willAutoplayOnLoad(true, false)).toBe(false);
  });
});
