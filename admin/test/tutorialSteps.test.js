/**
 * Tests for the pure onboarding-tour step data and state machine. The DOM
 * click-detection / positioning logic lives in TutorialContext.jsx and
 * TutorialOverlay.jsx and is not covered here — only the step list and the
 * reducer transitions.
 */
import { describe, it, expect } from "vitest";
import {
  getTutorialSteps,
  stepMatchesRoute,
  tutorialReducer,
  initialTutorialState,
} from "../../src/context/tutorialSteps.js";

describe("getTutorialSteps", () => {
  it("includes both the play flow and the invite flow for a team user", () => {
    const steps = getTutorialSteps({ isPersonalTeam: false });
    expect(steps.some((s) => s.flow === "play")).toBe(true);
    expect(steps.some((s) => s.flow === "invite")).toBe(true);
    expect(steps.at(-1).id).toBe("finish");
  });

  it("skips the invite flow entirely for a personal/solo-team user", () => {
    const steps = getTutorialSteps({ isPersonalTeam: true });
    expect(steps.every((s) => s.flow !== "invite")).toBe(true);
    expect(steps.at(-1).id).toBe("finish-solo");
  });

  it("defaults to the team flow when no user is provided", () => {
    const steps = getTutorialSteps(null);
    expect(steps.some((s) => s.flow === "invite")).toBe(true);
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
