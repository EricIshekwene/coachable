/**
 * Pure step data + state machine for the onboarding product tour.
 * Kept free of React/DOM so it can be unit tested directly (admin/test/tutorialSteps.test.js).
 * DOM resolution (selector -> element), event collection, and auto-action
 * execution live in TutorialContext.jsx.
 *
 * Step advancement is OUTCOME-BASED: every non-manual step declares a pure
 * `isComplete(ctx)` predicate evaluated against `{ pathname, events }`, where
 * `events` are the tutorialBus outcome events collected since the step became
 * active. A step only advances when its real outcome occurred (navigation
 * happened, a player was actually added, a keyframe was actually written...),
 * never merely because a click landed inside the target area.
 *
 * Every step also declares an `autoAction` — the "Next" button on the step
 * card performs the step's default action for the user (fill the title, click
 * the highlighted button, place a player, draw a sample route...) and the
 * resulting real outcome advances the tour exactly like a manual interaction.
 */

import { resolveFieldTypeFromSport } from "../features/slate/hooks/useAdvancedSettings";

const EDITOR_ROUTE_RE = /^\/app\/plays\/[^/]+\/edit$/;

/** Field types with more than one editor mode (keyframe + drawing). */
const MULTI_MODE_FIELD_TYPES = new Set(["Football"]);

/**
 * Sport capabilities that shape the step list. Prefabs exist for every real
 * sport; only the Blank canvas has none (the preview mock and the live
 * /sport-prefab-presets endpoint both return nothing for it).
 * @param {string | null | undefined} sport - e.g. "football", "womens lacrosse"
 * @returns {{ fieldType: string, multiMode: boolean, hasPrefabs: boolean }}
 */
export function getSportCapabilities(sport) {
  const fieldType = resolveFieldTypeFromSport(sport);
  return {
    fieldType,
    multiMode: MULTI_MODE_FIELD_TYPES.has(fieldType),
    hasPrefabs: fieldType !== "Blank",
  };
}

/** Last collected event of a given type, or undefined. */
export function lastEvent(events, type) {
  for (let i = (events?.length ?? 0) - 1; i >= 0; i--) {
    if (events[i]?.type === type) return events[i];
  }
  return undefined;
}

/** True when at least one event of the given type was collected. */
export function hasEvent(events, type) {
  return Boolean(events?.some((e) => e?.type === type));
}

/**
 * Flow A — create the coach's first play. Always shown; adapts to the sport:
 * a mode-selection step for multi-mode sports, a prefab step for sports that
 * have prefabs, then the keyframe flow (all sports end up in keyframe mode —
 * single-mode sports only have it, and the multi-mode step guides to it).
 * @param {{ multiMode: boolean, hasPrefabs: boolean }} caps
 */
function buildPlayFlowSteps({ multiMode, hasPrefabs }) {
  const steps = [
    {
      id: "new-play",
      flow: "play",
      route: "/app/plays",
      selector: '[data-testid="tutorial-new-play"]',
      placement: "bottom",
      title: "Create your first play",
      body: "Click New Play to get started.",
      advanceOn: "auto",
      isComplete: ({ pathname }) => pathname === "/app/plays/new",
      autoAction: { kind: "click", selector: '[data-testid="tutorial-new-play"]' },
    },
    {
      id: "enter-title",
      flow: "play",
      route: "/app/plays/new",
      selector: '[data-testid="tutorial-title-input"]',
      placement: "bottom",
      title: "Name your play",
      body: "Type a title — the Create button stays disabled until your play has one.",
      advanceOn: "auto",
      isComplete: ({ events }) => Boolean(lastEvent(events, "title-changed")?.detail?.hasText),
      autoAction: {
        kind: "fill",
        selector: '[data-testid="tutorial-title-input"]',
        value: "My First Play",
      },
    },
    {
      id: "pick-preset",
      flow: "play",
      route: "/app/plays/new",
      selector: '[data-testid="tutorial-preset-grid"]',
      placement: "right",
      title: "Pick a starting point",
      body: "Choose a template — or Blank to start from scratch.",
      advanceOn: "auto",
      isComplete: ({ events }) => hasEvent(events, "preset-selected"),
      autoAction: { kind: "click", selector: '[data-testid="tutorial-preset-blank"]' },
    },
  ];

  if (multiMode) {
    steps.push({
      id: "choose-mode",
      flow: "play",
      route: "/app/plays/new",
      selector: '[data-testid="tutorial-mode-picker"]',
      placement: "top",
      title: "Choose an editor mode",
      body: "This sport has two editors: Drawing for quick static routes, Keyframe for animated plays. Pick Keyframe for this tour.",
      advanceOn: "auto",
      isComplete: ({ events }) => lastEvent(events, "mode-selected")?.detail?.mode === "keyframe",
      autoAction: { kind: "click", selector: '[data-testid="tutorial-mode-keyframe"]' },
    });
  }

  steps.push(
    {
      id: "create-play",
      flow: "play",
      route: "/app/plays/new",
      selector: '[data-testid="tutorial-create-play"]',
      placement: "top",
      title: "Open the editor",
      body: "Click Create & Open Editor.",
      advanceOn: "auto",
      isComplete: ({ pathname }) => EDITOR_ROUTE_RE.test(pathname),
      autoAction: { kind: "click", selector: '[data-testid="tutorial-create-play"]' },
    },
    {
      id: "add-player",
      flow: "play",
      route: EDITOR_ROUTE_RE,
      selector: '[data-testid="tutorial-add-player"]',
      placement: "right",
      title: "Add a player",
      body: "Click the Add Player icon to drop a player on the field — or click the row, then click the field to place them exactly.",
      advanceOn: "auto",
      isComplete: ({ events }) => hasEvent(events, "player-added"),
      autoAction: { kind: "run", action: "place-player" },
    }
  );

  if (hasPrefabs) {
    steps.push({
      id: "place-prefab",
      flow: "play",
      route: EDITOR_ROUTE_RE,
      selector: '[data-testid="tutorial-prefabs"]',
      placement: "right",
      title: "Place a prefab",
      body: "Prefabs drop a whole formation at once. Open Prefabs, pick one, then click the field to place it.",
      advanceOn: "auto",
      isComplete: ({ events }) => hasEvent(events, "prefab-placed"),
      autoAction: { kind: "run", action: "place-prefab" },
    });
  }

  steps.push(
    {
      id: "draw-tool",
      flow: "play",
      route: EDITOR_ROUTE_RE,
      selector: '[data-testid="tutorial-draw-tool"]',
      placement: "right",
      title: "Draw a route",
      body: "Click Draw to sketch a route for your player.",
      advanceOn: "auto",
      isComplete: ({ events }) => lastEvent(events, "tool-selected")?.detail?.tool === "pen",
      autoAction: { kind: "click", selector: '[data-testid="tutorial-draw-tool"]' },
    },
    {
      id: "draw-route",
      flow: "play",
      route: EDITOR_ROUTE_RE,
      selector: "[data-slate-root]",
      placement: "corner",
      title: "Draw the route",
      body: "Click and drag on the field to draw a route.",
      advanceOn: "auto",
      isComplete: ({ events }) => hasEvent(events, "drawing-added"),
      autoAction: { kind: "run", action: "draw-route" },
    },
    {
      id: "add-keyframe",
      flow: "play",
      route: EDITOR_ROUTE_RE,
      selector: '[data-testid="tutorial-add-keyframe"]',
      placement: "top",
      title: "Add a keyframe",
      body: "Drag the playhead to a later point on the timeline, then click Add Step to capture a keyframe there.",
      advanceOn: "auto",
      isComplete: ({ events }) => hasEvent(events, "keyframe-added"),
      autoAction: { kind: "run", action: "add-keyframe" },
    },
    {
      id: "move-player-keyframe",
      flow: "play",
      route: EDITOR_ROUTE_RE,
      selector: "[data-slate-root]",
      placement: "corner",
      title: "Move a player in this keyframe",
      body: "With the playhead on your new keyframe, drag a player to where they should be at that moment — the keyframe updates.",
      advanceOn: "auto",
      isComplete: ({ events }) => hasEvent(events, "keyframe-pose-updated"),
      autoAction: { kind: "run", action: "move-player" },
    },
    {
      id: "play-animation",
      flow: "play",
      route: EDITOR_ROUTE_RE,
      selector: '[data-testid="tutorial-play-animation"]',
      placement: "top",
      title: "Preview the animation",
      body: "Press Play to watch your play animate between keyframes.",
      advanceOn: "auto",
      isComplete: ({ events }) => hasEvent(events, "playback-started"),
      autoAction: { kind: "run", action: "play-animation" },
    },
    {
      id: "back-to-playbook",
      flow: "play",
      route: EDITOR_ROUTE_RE,
      selector: '[data-testid="tutorial-back-home"]',
      placement: "right",
      title: "Back to your playbook",
      body: "Plays save automatically — there's nothing to submit. Click the Coachable logo in the top-left to head back to your playbook.",
      advanceOn: "auto",
      isComplete: ({ pathname }) => pathname === "/app/plays",
      autoAction: { kind: "click", selector: '[data-testid="tutorial-back-home"]' },
    }
  );

  return steps;
}

/** Flow B — invite assistant coaches / team members. Skipped for personal/solo teams. */
const INVITE_FLOW_STEPS = [
  {
    id: "invite-intro",
    flow: "invite",
    route: "/app/plays",
    selector: null,
    placement: "center",
    title: "Nice work!",
    body: "Now let's invite your assistant coaches so they can help build and run plays.",
    advanceOn: "manual",
    ctaLabel: "Continue",
    navigateTo: "/app/team",
  },
  {
    id: "invite-send",
    flow: "invite",
    route: "/app/team",
    selector: '[data-testid="tutorial-invite-card-coach"]',
    placement: "left",
    title: "Invite an assistant coach",
    body: "Enter their email and click Invite — or copy the coach code to share it directly.",
    advanceOn: "auto",
    isComplete: ({ events }) => lastEvent(events, "invite-sent")?.detail?.role === "coach",
    autoAction: {
      kind: "fill",
      selector: '[data-testid="tutorial-invite-email-coach"]',
      value: "assistant@example.com",
      thenClickSelector: '[data-testid="tutorial-invite-send-coach"]',
    },
  },
  {
    id: "finish",
    flow: "invite",
    route: "/app/team",
    selector: null,
    placement: "center",
    title: "You're all set!",
    body: "You've created a play and invited your team. You can replay this tour anytime from Settings.",
    advanceOn: "manual",
    ctaLabel: "Finish",
  },
];

/** Solo/personal-team users never see the invite flow, so give them their own finish step. */
const SOLO_FINISH_STEP = {
  id: "finish-solo",
  flow: "play",
  route: "/app/plays",
  selector: null,
  placement: "center",
  title: "You're all set!",
  body: "You've created your first play. You can replay this tour anytime from Settings.",
  advanceOn: "manual",
  ctaLabel: "Finish",
};

/**
 * Returns the ordered step list for a given user. The list adapts to the
 * user's sport (mode-selection step for multi-mode sports, prefab step for
 * sports with prefabs) and to team type (personal/solo-team users skip
 * Flow B entirely).
 * @param {{ isPersonalTeam?: boolean, sport?: string } | null | undefined} user
 */
export function getTutorialSteps(user) {
  const caps = getSportCapabilities(user?.sport);
  const playFlow = buildPlayFlowSteps(caps);
  if (user?.isPersonalTeam) return [...playFlow, SOLO_FINISH_STEP];
  return [...playFlow, ...INVITE_FLOW_STEPS];
}

/**
 * Does the current router pathname satisfy this step's route requirement?
 * @param {{ route?: string | RegExp }} step
 * @param {string} pathname
 */
export function stepMatchesRoute(step, pathname) {
  if (!step?.route) return true;
  if (typeof step.route === "string") return pathname === step.route;
  return step.route.test(pathname);
}

export const initialTutorialState = {
  active: false,
  stepIndex: 0,
  steps: [],
};

/**
 * Reducer for tour state. Actions: START (payload: steps), ADVANCE, EXIT, RESET.
 */
export function tutorialReducer(state, action) {
  switch (action.type) {
    case "START":
      return { active: true, stepIndex: 0, steps: action.steps ?? [] };
    case "ADVANCE": {
      if (!state.active) return state;
      const nextIndex = state.stepIndex + 1;
      if (nextIndex >= state.steps.length) {
        return { ...state, active: false };
      }
      return { ...state, stepIndex: nextIndex };
    }
    case "EXIT":
      return { ...state, active: false };
    case "RESET":
      return initialTutorialState;
    default:
      return state;
  }
}
