/**
 * Tiny event + action bus connecting the onboarding product tour to the real
 * app. Pure module state, no React/DOM imports, so it is unit-testable and
 * safe to import from anywhere.
 *
 * Two halves:
 *
 * 1. OUTCOME EVENTS — the pages/editor emit small facts about what actually
 *    happened ("player-added", "keyframe-added", "invite-sent", ...). The
 *    tour listens and only advances a step when its real outcome occurred,
 *    never merely because a click landed inside the target area. Emitting is
 *    a no-op when nothing is listening, so the emit call sites cost nothing
 *    outside a tour run.
 *
 * 2. AUTO-PERFORM ACTIONS — the editor registers named actions ("place-player",
 *    "draw-route", ...) that the tour's "Next" button can invoke to perform a
 *    step's default action on the user's behalf. Registration is scoped to the
 *    component's lifetime via the returned cleanup function.
 */

/** @type {Set<(event: { type: string, detail?: Object }) => void>} */
const listeners = new Set();

/** @type {Map<string, Function>} */
const actions = new Map();

/**
 * Emit a tutorial outcome event. Safe to call from anywhere — a no-op when
 * the tour isn't listening.
 * @param {string} type - e.g. "player-added", "keyframe-added"
 * @param {Object} [detail] - small payload (ids, flags); keep it serializable
 */
export function emitTutorialEvent(type, detail = {}) {
  if (!listeners.size) return;
  const event = { type, detail };
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      /* one bad listener must not break the others */
    }
  });
}

/**
 * Subscribe to tutorial outcome events.
 * @param {(event: { type: string, detail?: Object }) => void} listener
 * @returns {() => void} unsubscribe
 */
export function onTutorialEvent(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Register named auto-perform actions (usually from a useEffect in the editor
 * or a page). Later registrations of the same name win until unregistered.
 * @param {Record<string, Function>} actionMap
 * @returns {() => void} cleanup that removes exactly these registrations
 */
export function registerTutorialActions(actionMap) {
  const entries = Object.entries(actionMap || {});
  entries.forEach(([name, fn]) => {
    if (typeof fn === "function") actions.set(name, fn);
  });
  return () => {
    entries.forEach(([name, fn]) => {
      if (actions.get(name) === fn) actions.delete(name);
    });
  };
}

/**
 * Run a registered auto-perform action by name.
 * @param {string} name
 * @returns {boolean} true if an action was found and invoked
 */
export function runTutorialAction(name) {
  const fn = actions.get(name);
  if (typeof fn !== "function") return false;
  try {
    fn();
  } catch {
    /* an auto-action failure should never crash the tour */
  }
  return true;
}

/** True when an auto-perform action with this name is currently registered. */
export function hasTutorialAction(name) {
  return actions.has(name);
}
