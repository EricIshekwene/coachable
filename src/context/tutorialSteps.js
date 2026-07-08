/**
 * Pure step data + state machine for the onboarding product tour.
 * Kept free of React/DOM so it can be unit tested directly (admin/test/tutorialSteps.test.js).
 * DOM resolution (selector -> element, route matching against the router) lives in TutorialContext.jsx.
 */

const EDITOR_ROUTE_RE = /^\/app\/plays\/[^/]+\/edit$/;

/** Flow A — create the coach's first play. Always shown. */
const PLAY_FLOW_STEPS = [
  {
    id: "new-play",
    flow: "play",
    route: "/app/plays",
    selector: '[data-testid="tutorial-new-play"]',
    placement: "bottom",
    title: "Create your first play",
    body: "Click New Play to get started.",
    advanceOn: "click",
  },
  {
    id: "pick-preset",
    flow: "play",
    route: "/app/plays/new",
    selector: '[data-testid="tutorial-preset-blank"]',
    advanceSelector: '[data-testid="tutorial-preset-grid"]',
    placement: "right",
    title: "Give it a name and pick a starting point",
    body: "Add a title above, then choose a template — or Blank to start from scratch.",
    advanceOn: "click",
  },
  {
    id: "create-play",
    flow: "play",
    route: "/app/plays/new",
    selector: '[data-testid="tutorial-create-play"]',
    placement: "top",
    title: "Open the editor",
    body: "Click Create & Open Editor.",
    advanceOn: "click",
  },
  {
    id: "add-player",
    flow: "play",
    route: EDITOR_ROUTE_RE,
    selector: '[data-testid="tutorial-add-player"]',
    placement: "right",
    title: "Add a player",
    body: "Click Add Player.",
    advanceOn: "click",
  },
  {
    id: "place-player",
    flow: "play",
    route: EDITOR_ROUTE_RE,
    selector: "[data-slate-root]",
    placement: "corner",
    title: "Place your player",
    body: "Click anywhere on the field to place the player.",
    advanceOn: "click",
  },
  {
    id: "draw-tool",
    flow: "play",
    route: EDITOR_ROUTE_RE,
    selector: '[data-testid="tutorial-draw-tool"]',
    placement: "right",
    title: "Draw a route",
    body: "Click Draw to sketch a route for your player.",
    advanceOn: "click",
  },
  {
    id: "draw-route",
    flow: "play",
    route: EDITOR_ROUTE_RE,
    selector: "[data-slate-root]",
    placement: "corner",
    title: "Draw the route",
    body: "Click and drag on the field to draw a route.",
    advanceOn: "click",
  },
  {
    id: "save-play",
    flow: "play",
    route: EDITOR_ROUTE_RE,
    selector: '[data-testid="tutorial-save-to-playbook"]',
    placement: "left",
    title: "Save your play",
    body: "Click Save to Playbook.",
    advanceOn: "click",
  },
  {
    id: "confirm-save",
    flow: "play",
    route: EDITOR_ROUTE_RE,
    selector: '[data-testid="tutorial-confirm-save"]',
    placement: "top",
    title: "Finish saving",
    body: "Click Save Play to finish — that's your first play done!",
    advanceOn: "click",
  },
];

/** Flow B — invite assistant coaches / team members. Skipped for personal/solo teams. */
const INVITE_FLOW_STEPS = [
  {
    id: "invite-intro",
    flow: "invite",
    route: EDITOR_ROUTE_RE,
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
    advanceSelector: '[data-testid="tutorial-invite-send-coach"]',
    placement: "left",
    title: "Invite an assistant coach",
    body: "Enter their email and click Invite — or copy the coach code to share it directly.",
    advanceOn: "click",
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
  route: EDITOR_ROUTE_RE,
  selector: null,
  placement: "center",
  title: "You're all set!",
  body: "You've created your first play. You can replay this tour anytime from Settings.",
  advanceOn: "manual",
  ctaLabel: "Finish",
};

/**
 * Returns the ordered step list for a given user. Personal/solo-team users
 * (no teammates to invite) skip Flow B entirely.
 * @param {{ isPersonalTeam?: boolean } | null | undefined} user
 */
export function getTutorialSteps(user) {
  if (user?.isPersonalTeam) return [...PLAY_FLOW_STEPS, SOLO_FINISH_STEP];
  return [...PLAY_FLOW_STEPS, ...INVITE_FLOW_STEPS];
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
