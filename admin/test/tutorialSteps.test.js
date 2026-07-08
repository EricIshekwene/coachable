/**
 * Tests for the pure onboarding-tour step data and state machine: the
 * sport-adaptive step list, the outcome predicates (`isComplete`), the
 * auto-action descriptors, and the reducer transitions. DOM resolution,
 * event collection, and auto-action execution live in TutorialContext.jsx /
 * TutorialOverlay.jsx and are not covered here.
 */
import { describe, it, expect } from "vitest";
import {
  getTutorialSteps,
  getSportCapabilities,
  stepMatchesRoute,
  tutorialReducer,
  initialTutorialState,
  hasEvent,
  lastEvent,
} from "../../src/context/tutorialSteps.js";

const ids = (steps) => steps.map((s) => s.id);
const step = (steps, id) => steps.find((s) => s.id === id);

describe("getSportCapabilities", () => {
  it("flags football as the only multi-mode sport", () => {
    expect(getSportCapabilities("football").multiMode).toBe(true);
    for (const sport of ["rugby", "soccer", "lacrosse", "womens lacrosse", "basketball", "field hockey", "ice hockey"]) {
      expect(getSportCapabilities(sport).multiMode).toBe(false);
    }
  });

  it("every real sport has prefabs; the blank canvas does not", () => {
    expect(getSportCapabilities("rugby").hasPrefabs).toBe(true);
    expect(getSportCapabilities("football").hasPrefabs).toBe(true);
    expect(getSportCapabilities("blank").hasPrefabs).toBe(false);
    expect(getSportCapabilities("").hasPrefabs).toBe(false);
  });
});

describe("getTutorialSteps — sport-adaptive step list", () => {
  it("football (multi-mode + prefabs) includes mode selection, prefab, and the keyframe flow", () => {
    const steps = getTutorialSteps({ isPersonalTeam: false, sport: "football" });
    expect(ids(steps)).toEqual([
      "new-play",
      "enter-title",
      "pick-preset",
      "choose-mode",
      "create-play",
      "add-player",
      "place-prefab",
      "draw-tool",
      "draw-route",
      "add-keyframe",
      "move-player-keyframe",
      "play-animation",
      "back-to-playbook",
      "invite-intro",
      "invite-send",
      "finish",
    ]);
  });

  it("a single-mode prefab sport (rugby) skips mode selection but keeps the prefab step", () => {
    const steps = getTutorialSteps({ isPersonalTeam: false, sport: "rugby" });
    expect(ids(steps)).not.toContain("choose-mode");
    expect(ids(steps)).toContain("place-prefab");
    expect(ids(steps)).toContain("add-keyframe");
  });

  it("the blank canvas skips both mode selection and the prefab step", () => {
    const steps = getTutorialSteps({ isPersonalTeam: false, sport: "blank" });
    expect(ids(steps)).not.toContain("choose-mode");
    expect(ids(steps)).not.toContain("place-prefab");
  });

  it("replaces the old save steps with the auto-save back-to-playbook step", () => {
    const steps = getTutorialSteps({ isPersonalTeam: false, sport: "football" });
    expect(ids(steps)).not.toContain("save-play");
    expect(ids(steps)).not.toContain("confirm-save");
    expect(ids(steps)).toContain("back-to-playbook");
  });

  it("splits title entry from preset picking, in that order", () => {
    const list = ids(getTutorialSteps({ isPersonalTeam: false, sport: "soccer" }));
    expect(list.indexOf("enter-title")).toBeGreaterThan(-1);
    expect(list.indexOf("enter-title")).toBeLessThan(list.indexOf("pick-preset"));
    expect(list.indexOf("pick-preset")).toBeLessThan(list.indexOf("create-play"));
  });

  it("includes both the play flow and the invite flow for a team user", () => {
    const steps = getTutorialSteps({ isPersonalTeam: false, sport: "football" });
    expect(steps.some((s) => s.flow === "play")).toBe(true);
    expect(steps.some((s) => s.flow === "invite")).toBe(true);
    expect(steps.at(-1).id).toBe("finish");
  });

  it("skips the invite flow entirely for a personal/solo-team user", () => {
    const steps = getTutorialSteps({ isPersonalTeam: true, sport: "football" });
    expect(steps.every((s) => s.flow !== "invite")).toBe(true);
    expect(steps.at(-1).id).toBe("finish-solo");
  });

  it("defaults to the team flow when no user is provided", () => {
    const steps = getTutorialSteps(null);
    expect(steps.some((s) => s.flow === "invite")).toBe(true);
  });

  it("gives every non-manual step an outcome predicate AND an auto-action for the Next button", () => {
    const steps = getTutorialSteps({ isPersonalTeam: false, sport: "football" });
    for (const s of steps) {
      if (s.advanceOn === "manual") {
        expect(s.ctaLabel, s.id).toBeTruthy();
      } else {
        expect(s.advanceOn, s.id).toBe("auto");
        expect(typeof s.isComplete, s.id).toBe("function");
        expect(s.autoAction, s.id).toBeTruthy();
        expect(["click", "fill", "run"]).toContain(s.autoAction.kind);
      }
    }
  });
});

describe("event helpers", () => {
  const events = [
    { type: "title-changed", detail: { hasText: true } },
    { type: "tool-selected", detail: { tool: "pen" } },
    { type: "title-changed", detail: { hasText: false } },
  ];

  it("hasEvent finds any occurrence of a type", () => {
    expect(hasEvent(events, "tool-selected")).toBe(true);
    expect(hasEvent(events, "player-added")).toBe(false);
    expect(hasEvent(undefined, "player-added")).toBe(false);
  });

  it("lastEvent returns the most recent occurrence so later state wins", () => {
    expect(lastEvent(events, "title-changed").detail.hasText).toBe(false);
    expect(lastEvent(events, "nope")).toBeUndefined();
  });
});

describe("outcome predicates — steps only advance on their real outcome", () => {
  const steps = getTutorialSteps({ isPersonalTeam: false, sport: "football" });
  const ctx = (overrides = {}) => ({ pathname: "/app/plays", events: [], ...overrides });

  it("new-play completes on navigation to the create page, not on a click", () => {
    const s = step(steps, "new-play");
    expect(s.isComplete(ctx())).toBe(false);
    expect(s.isComplete(ctx({ pathname: "/app/plays/new" }))).toBe(true);
  });

  it("enter-title tracks the LATEST title state (typing then clearing does not complete)", () => {
    const s = step(steps, "enter-title");
    expect(s.isComplete(ctx())).toBe(false);
    expect(s.isComplete(ctx({ events: [{ type: "title-changed", detail: { hasText: true } }] }))).toBe(true);
    expect(
      s.isComplete(ctx({
        events: [
          { type: "title-changed", detail: { hasText: true } },
          { type: "title-changed", detail: { hasText: false } },
        ],
      }))
    ).toBe(false);
  });

  it("pick-preset requires an actual preset selection event", () => {
    const s = step(steps, "pick-preset");
    expect(s.isComplete(ctx())).toBe(false);
    expect(s.isComplete(ctx({ events: [{ type: "preset-selected", detail: { presetId: "blank" } }] }))).toBe(true);
  });

  it("choose-mode only completes when KEYFRAME is the selected mode", () => {
    const s = step(steps, "choose-mode");
    expect(s.isComplete(ctx({ events: [{ type: "mode-selected", detail: { mode: "drawing" } }] }))).toBe(false);
    expect(s.isComplete(ctx({ events: [{ type: "mode-selected", detail: { mode: "keyframe" } }] }))).toBe(true);
    expect(
      s.isComplete(ctx({
        events: [
          { type: "mode-selected", detail: { mode: "keyframe" } },
          { type: "mode-selected", detail: { mode: "drawing" } },
        ],
      }))
    ).toBe(false);
  });

  it("create-play completes only when the editor route actually mounted", () => {
    const s = step(steps, "create-play");
    expect(s.isComplete(ctx({ pathname: "/app/plays/new" }))).toBe(false);
    expect(s.isComplete(ctx({ pathname: "/app/plays/preview-play-1/edit" }))).toBe(true);
  });

  it("add-player / place-prefab / draw-route / add-keyframe / move-player complete on their editor outcomes", () => {
    expect(step(steps, "add-player").isComplete(ctx({ events: [{ type: "player-added", detail: {} }] }))).toBe(true);
    expect(step(steps, "add-player").isComplete(ctx())).toBe(false);
    expect(step(steps, "place-prefab").isComplete(ctx({ events: [{ type: "prefab-placed", detail: {} }] }))).toBe(true);
    expect(step(steps, "draw-route").isComplete(ctx({ events: [{ type: "drawing-added", detail: {} }] }))).toBe(true);
    expect(step(steps, "add-keyframe").isComplete(ctx({ events: [{ type: "keyframe-added", detail: {} }] }))).toBe(true);
    expect(step(steps, "move-player-keyframe").isComplete(ctx({ events: [{ type: "keyframe-pose-updated", detail: {} }] }))).toBe(true);
  });

  it("draw-tool requires the pen tool to be the CURRENTLY active tool", () => {
    const s = step(steps, "draw-tool");
    expect(s.isComplete(ctx({ events: [{ type: "tool-selected", detail: { tool: "pen" } }] }))).toBe(true);
    expect(
      s.isComplete(ctx({
        events: [
          { type: "tool-selected", detail: { tool: "pen" } },
          { type: "tool-selected", detail: { tool: "select" } },
        ],
      }))
    ).toBe(false);
  });

  it("play-animation completes when playback actually started", () => {
    expect(step(steps, "play-animation").isComplete(ctx({ events: [{ type: "playback-started", detail: {} }] }))).toBe(true);
  });

  it("back-to-playbook completes on navigation back to the plays list", () => {
    const s = step(steps, "back-to-playbook");
    expect(s.isComplete(ctx({ pathname: "/app/plays/preview-play-1/edit" }))).toBe(false);
    expect(s.isComplete(ctx({ pathname: "/app/plays" }))).toBe(true);
  });

  it("invite-send requires a COACH invite to have actually been sent", () => {
    const s = step(steps, "invite-send");
    expect(s.isComplete(ctx({ events: [{ type: "invite-sent", detail: { role: "player" } }] }))).toBe(false);
    expect(s.isComplete(ctx({ events: [{ type: "invite-sent", detail: { role: "coach" } }] }))).toBe(true);
  });
});

describe("stepMatchesRoute", () => {
  it("matches an exact string route", () => {
    expect(stepMatchesRoute({ route: "/app/plays" }, "/app/plays")).toBe(true);
    expect(stepMatchesRoute({ route: "/app/plays" }, "/app/plays/new")).toBe(false);
  });

  it("matches a regex route", () => {
    const step = { route: /^\/app\/plays\/[^/]+\/edit$/ };
    expect(stepMatchesRoute(step, "/app/plays/abc123/edit")).toBe(true);
    expect(stepMatchesRoute(step, "/app/plays/abc123/view")).toBe(false);
  });

  it("treats a missing route as always matching", () => {
    expect(stepMatchesRoute({}, "/anything")).toBe(true);
  });
});

describe("tutorialReducer", () => {
  const steps = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("START activates the tour at step 0 with the given steps", () => {
    const state = tutorialReducer(initialTutorialState, { type: "START", steps });
    expect(state).toEqual({ active: true, stepIndex: 0, steps });
  });

  it("ADVANCE moves to the next step while more remain", () => {
    const started = tutorialReducer(initialTutorialState, { type: "START", steps });
    const next = tutorialReducer(started, { type: "ADVANCE" });
    expect(next.active).toBe(true);
    expect(next.stepIndex).toBe(1);
  });

  it("ADVANCE past the last step deactivates the tour", () => {
    let state = tutorialReducer(initialTutorialState, { type: "START", steps });
    state = tutorialReducer(state, { type: "ADVANCE" }); // -> index 1
    state = tutorialReducer(state, { type: "ADVANCE" }); // -> index 2 (last)
    state = tutorialReducer(state, { type: "ADVANCE" }); // -> past last, completes
    expect(state.active).toBe(false);
  });

  it("ADVANCE is a no-op when the tour is not active", () => {
    const state = tutorialReducer(initialTutorialState, { type: "ADVANCE" });
    expect(state).toBe(initialTutorialState);
  });

  it("EXIT deactivates the tour without resetting stepIndex", () => {
    const started = tutorialReducer(initialTutorialState, { type: "START", steps });
    const advanced = tutorialReducer(started, { type: "ADVANCE" });
    const exited = tutorialReducer(advanced, { type: "EXIT" });
    expect(exited.active).toBe(false);
    expect(exited.stepIndex).toBe(1);
  });

  it("RESET returns to the initial state", () => {
    const started = tutorialReducer(initialTutorialState, { type: "START", steps });
    const reset = tutorialReducer(started, { type: "RESET" });
    expect(reset).toEqual(initialTutorialState);
  });

  it("ignores unknown action types", () => {
    const state = tutorialReducer(initialTutorialState, { type: "NOPE" });
    expect(state).toBe(initialTutorialState);
  });
});
