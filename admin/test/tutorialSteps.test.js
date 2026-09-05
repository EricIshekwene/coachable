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
  SPORT_TAG_EXAMPLES,
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
      "add-tags",
      "pick-preset",
      "choose-mode",
      "create-play",
      "select-add-player",
      "place-player",
      "add-player-alt-color",
      "add-object",
      "select-players-for-prefab",
      "save-as-prefab",
      "open-prefabs",
      "select-prefab",
      "place-prefab",
      "draw-tool",
      "draw-route",
      "add-keyframe",
      "move-player-keyframe",
      "play-animation",
      "undo-redo",
      "back-to-playbook",
      "invite-intro",
      "invite-send",
      "finish",
    ]);
  });

  it("a single-mode prefab sport (rugby) skips mode selection but keeps the prefab steps", () => {
    const steps = getTutorialSteps({ isPersonalTeam: false, sport: "rugby" });
    expect(ids(steps)).not.toContain("choose-mode");
    expect(ids(steps)).toContain("select-add-player");
    expect(ids(steps)).toContain("place-player");
    expect(ids(steps)).toContain("add-player-alt-color");
    expect(ids(steps)).toContain("add-object");
    expect(ids(steps)).toContain("select-players-for-prefab");
    expect(ids(steps)).toContain("save-as-prefab");
    expect(ids(steps)).toContain("open-prefabs");
    expect(ids(steps)).toContain("select-prefab");
    expect(ids(steps)).toContain("place-prefab");
    expect(ids(steps)).toContain("add-keyframe");
    expect(ids(steps)).toContain("undo-redo");
  });

  it("the blank canvas skips both mode selection and all prefab steps", () => {
    const steps = getTutorialSteps({ isPersonalTeam: false, sport: "blank" });
    expect(ids(steps)).not.toContain("choose-mode");
    expect(ids(steps)).not.toContain("select-players-for-prefab");
    expect(ids(steps)).not.toContain("save-as-prefab");
    expect(ids(steps)).not.toContain("open-prefabs");
    expect(ids(steps)).not.toContain("select-prefab");
    expect(ids(steps)).not.toContain("place-prefab");
    // new unconditional steps should still be present
    expect(ids(steps)).toContain("add-player-alt-color");
    expect(ids(steps)).toContain("add-object");
    expect(ids(steps)).toContain("undo-redo");
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

  it("add-tags step sits between enter-title and pick-preset for every sport", () => {
    for (const sport of ["football", "rugby", "soccer", "lacrosse", "basketball", "blank"]) {
      const list = ids(getTutorialSteps({ isPersonalTeam: false, sport }));
      const ti = list.indexOf("enter-title");
      const ai = list.indexOf("add-tags");
      const pi = list.indexOf("pick-preset");
      expect(ti, `${sport}: enter-title missing`).toBeGreaterThan(-1);
      expect(ai, `${sport}: add-tags missing`).toBeGreaterThan(-1);
      expect(pi, `${sport}: pick-preset missing`).toBeGreaterThan(-1);
      expect(ti, `${sport}: enter-title before add-tags`).toBeLessThan(ai);
      expect(ai, `${sport}: add-tags before pick-preset`).toBeLessThan(pi);
    }
  });

  it("new unconditional steps appear for every sport: add-player-alt-color, add-object, undo-redo", () => {
    for (const sport of ["football", "rugby", "soccer", "lacrosse", "basketball", "blank"]) {
      const list = ids(getTutorialSteps({ isPersonalTeam: false, sport }));
      expect(list, `${sport}: add-player-alt-color missing`).toContain("add-player-alt-color");
      expect(list, `${sport}: add-object missing`).toContain("add-object");
      expect(list, `${sport}: undo-redo missing`).toContain("undo-redo");
    }
  });

  it("new prefab steps (select-players-for-prefab, save-as-prefab) appear for prefab sports and not blank", () => {
    for (const sport of ["football", "rugby", "soccer", "lacrosse", "basketball"]) {
      const list = ids(getTutorialSteps({ isPersonalTeam: false, sport }));
      expect(list, `${sport}: select-players-for-prefab missing`).toContain("select-players-for-prefab");
      expect(list, `${sport}: save-as-prefab missing`).toContain("save-as-prefab");
    }
    const blankList = ids(getTutorialSteps({ isPersonalTeam: false, sport: "blank" }));
    expect(blankList).not.toContain("select-players-for-prefab");
    expect(blankList).not.toContain("save-as-prefab");
  });

  it("step ordering: place-player -> add-player-alt-color -> add-object -> prefab steps -> draw-tool for prefab sports", () => {
    const list = ids(getTutorialSteps({ isPersonalTeam: false, sport: "football" }));
    const pp = list.indexOf("place-player");
    const ac = list.indexOf("add-player-alt-color");
    const ao = list.indexOf("add-object");
    const sp = list.indexOf("select-players-for-prefab");
    const sa = list.indexOf("save-as-prefab");
    const op = list.indexOf("open-prefabs");
    const dt = list.indexOf("draw-tool");
    expect(pp).toBeLessThan(ac);
    expect(ac).toBeLessThan(ao);
    expect(ao).toBeLessThan(sp);
    expect(sp).toBeLessThan(sa);
    expect(sa).toBeLessThan(op);
    expect(op).toBeLessThan(dt);
  });

  it("undo-redo step is manual with ctaLabel and sits between play-animation and back-to-playbook", () => {
    const footballSteps = getTutorialSteps({ isPersonalTeam: false, sport: "football" });
    const ur = step(footballSteps, "undo-redo");
    expect(ur).toBeTruthy();
    expect(ur.advanceOn).toBe("manual");
    expect(ur.ctaLabel).toBeTruthy();
    const list = ids(footballSteps);
    expect(list.indexOf("play-animation")).toBeLessThan(list.indexOf("undo-redo"));
    expect(list.indexOf("undo-redo")).toBeLessThan(list.indexOf("back-to-playbook"));
  });

  it("pick-preset has placement bottom (not right)", () => {
    const footballSteps = getTutorialSteps({ isPersonalTeam: false, sport: "football" });
    expect(step(footballSteps, "pick-preset").placement).toBe("bottom");
  });

  it("select-prefab has placement right (not left)", () => {
    const footballSteps = getTutorialSteps({ isPersonalTeam: false, sport: "football" });
    expect(step(footballSteps, "select-prefab").placement).toBe("right");
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

  it("add-tags completes when any tag-added event fires", () => {
    const s = step(steps, "add-tags");
    expect(s.isComplete(ctx())).toBe(false);
    expect(s.isComplete(ctx({ events: [{ type: "tag-added", detail: { tag: "Red Zone" } }] }))).toBe(true);
  });

  it("select-add-player completes when addPlayer tool is selected", () => {
    const s = step(steps, "select-add-player");
    expect(s.isComplete(ctx())).toBe(false);
    expect(s.isComplete(ctx({ events: [{ type: "tool-selected", detail: { tool: "select" } }] }))).toBe(false);
    expect(s.isComplete(ctx({ events: [{ type: "tool-selected", detail: { tool: "addPlayer" } }] }))).toBe(true);
  });

  it("place-player / open-prefabs / select-prefab / place-prefab / draw-route / add-keyframe / move-player complete on their editor outcomes", () => {
    expect(step(steps, "place-player").isComplete(ctx({ events: [{ type: "player-added", detail: {} }] }))).toBe(true);
    expect(step(steps, "place-player").isComplete(ctx())).toBe(false);
    expect(step(steps, "add-player-alt-color").isComplete(ctx({ events: [{ type: "player-alt-color-added", detail: {} }] }))).toBe(true);
    expect(step(steps, "add-player-alt-color").isComplete(ctx())).toBe(false);
    expect(step(steps, "add-object").isComplete(ctx({ events: [{ type: "object-added", detail: {} }] }))).toBe(true);
    expect(step(steps, "add-object").isComplete(ctx())).toBe(false);
    expect(step(steps, "select-players-for-prefab").isComplete(ctx({ events: [{ type: "players-selected-for-prefab", detail: {} }] }))).toBe(true);
    expect(step(steps, "select-players-for-prefab").isComplete(ctx())).toBe(false);
    expect(step(steps, "save-as-prefab").isComplete(ctx({ events: [{ type: "prefab-saved-by-user", detail: {} }] }))).toBe(true);
    expect(step(steps, "save-as-prefab").isComplete(ctx())).toBe(false);
    expect(step(steps, "open-prefabs").isComplete(ctx({ events: [{ type: "prefab-popover-opened" }] }))).toBe(true);
    expect(step(steps, "open-prefabs").isComplete(ctx())).toBe(false);
    expect(step(steps, "select-prefab").isComplete(ctx({ events: [{ type: "prefab-selected", detail: {} }] }))).toBe(true);
    expect(step(steps, "select-prefab").isComplete(ctx())).toBe(false);
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

describe("tutorialReducer — BACK", () => {
  const steps = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("BACK on step 0 is a no-op", () => {
    const started = tutorialReducer(initialTutorialState, { type: "START", steps });
    const after = tutorialReducer(started, { type: "BACK" });
    expect(after.stepIndex).toBe(0);
    expect(after).toBe(started);
  });

  it("BACK when inactive is a no-op", () => {
    const state = tutorialReducer(initialTutorialState, { type: "BACK" });
    expect(state).toBe(initialTutorialState);
  });

  it("BACK decrements stepIndex by 1", () => {
    let state = tutorialReducer(initialTutorialState, { type: "START", steps });
    state = tutorialReducer(state, { type: "ADVANCE" }); // index 1
    state = tutorialReducer(state, { type: "BACK" });    // index 0
    expect(state.stepIndex).toBe(0);
    expect(state.active).toBe(true);
  });

  it("BACK then ADVANCE returns to the same index", () => {
    let state = tutorialReducer(initialTutorialState, { type: "START", steps });
    state = tutorialReducer(state, { type: "ADVANCE" }); // index 1
    state = tutorialReducer(state, { type: "BACK" });    // index 0
    state = tutorialReducer(state, { type: "ADVANCE" }); // index 1
    expect(state.stepIndex).toBe(1);
  });

  it("BACK never goes below index 0 (double-back from step 1)", () => {
    let state = tutorialReducer(initialTutorialState, { type: "START", steps });
    state = tutorialReducer(state, { type: "ADVANCE" }); // index 1
    state = tutorialReducer(state, { type: "BACK" });    // index 0
    const after = tutorialReducer(state, { type: "BACK" }); // still 0
    expect(after.stepIndex).toBe(0);
    expect(after).toBe(state);
  });
});

describe("SPORT_TAG_EXAMPLES", () => {
  it("every real sport has exactly 3 example tags", () => {
    for (const sport of ["football", "rugby", "soccer", "lacrosse", "womens lacrosse", "basketball", "field hockey", "ice hockey", "blank"]) {
      expect(SPORT_TAG_EXAMPLES[sport], sport).toHaveLength(3);
      for (const tag of SPORT_TAG_EXAMPLES[sport]) {
        expect(typeof tag, `${sport} tag must be a string`).toBe("string");
        expect(tag.trim().length, `${sport} tag must not be empty`).toBeGreaterThan(0);
      }
    }
  });

  it("each sport's examples are distinct tags (no duplicates within a sport)", () => {
    for (const [sport, examples] of Object.entries(SPORT_TAG_EXAMPLES)) {
      const unique = new Set(examples);
      expect(unique.size, `${sport} has duplicate tags`).toBe(examples.length);
    }
  });
});

describe("undoAction declarations", () => {
  const footballSteps = getTutorialSteps({ sport: "football", isPersonalTeam: false });
  const soccerSteps   = getTutorialSteps({ sport: "soccer",   isPersonalTeam: false });

  it("select-add-player has undoAction delete-play (cleaning up the created play when going back to editor entry)", () => {
    expect(step(footballSteps, "select-add-player")?.undoAction).toEqual({ kind: "delete-play" });
    expect(step(soccerSteps,   "select-add-player")?.undoAction).toEqual({ kind: "delete-play" });
  });

  it("place-player has undoAction slate-undo", () => {
    expect(step(footballSteps, "place-player")?.undoAction).toEqual({ kind: "slate-undo" });
  });

  it("open-prefabs has undoAction slate-undo (undoes the player so place-player can be re-triggered on back)", () => {
    expect(step(footballSteps, "open-prefabs")?.undoAction).toEqual({ kind: "slate-undo" });
    expect(step(soccerSteps, "open-prefabs")?.undoAction).toEqual({ kind: "slate-undo" });
  });

  it("place-prefab has undoAction slate-undo (only for sports with prefabs)", () => {
    expect(step(footballSteps, "place-prefab")?.undoAction).toEqual({ kind: "slate-undo" });
    expect(step(soccerSteps, "place-prefab")?.undoAction).toEqual({ kind: "slate-undo" });
  });

  it("draw-route has undoAction slate-undo", () => {
    expect(step(footballSteps, "draw-route")?.undoAction).toEqual({ kind: "slate-undo" });
  });

  it("add-keyframe has undoAction slate-undo", () => {
    expect(step(footballSteps, "add-keyframe")?.undoAction).toEqual({ kind: "slate-undo" });
  });

  it("move-player-keyframe has undoAction slate-undo", () => {
    expect(step(footballSteps, "move-player-keyframe")?.undoAction).toEqual({ kind: "slate-undo" });
  });

  it("add-tags has undoAction run:clear-tutorial-tags", () => {
    expect(step(footballSteps, "add-tags")?.undoAction).toEqual({ kind: "run", action: "clear-tutorial-tags" });
    expect(step(soccerSteps, "add-tags")?.undoAction).toEqual({ kind: "run", action: "clear-tutorial-tags" });
  });

  it("add-player-alt-color has undoAction slate-undo", () => {
    expect(step(footballSteps, "add-player-alt-color")?.undoAction).toEqual({ kind: "slate-undo" });
    expect(step(soccerSteps,   "add-player-alt-color")?.undoAction).toEqual({ kind: "slate-undo" });
  });

  it("add-object has undoAction slate-undo", () => {
    expect(step(footballSteps, "add-object")?.undoAction).toEqual({ kind: "slate-undo" });
    expect(step(soccerSteps,   "add-object")?.undoAction).toEqual({ kind: "slate-undo" });
  });

  it("steps without persistent state have no undoAction", () => {
    for (const id of ["enter-title", "pick-preset", "create-play", "select-players-for-prefab", "save-as-prefab", "select-prefab", "draw-tool", "play-animation", "undo-redo", "back-to-playbook"]) {
      expect(step(footballSteps, id)?.undoAction).toBeUndefined();
    }
  });
});
