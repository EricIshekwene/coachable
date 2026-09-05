/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { isTutorialPreviewActive, endTutorialPreviewAndReturn } from "../utils/tutorialPreview";
import { getTutorialSteps, stepMatchesRoute, tutorialReducer, initialTutorialState } from "./tutorialSteps";
import { onTutorialEvent, runTutorialAction } from "./tutorialBus";
import { apiFetch } from "../utils/api";

const TutorialContext = createContext(null);

/** How often (ms) auto steps re-check their completion predicate between events. */
const EVAL_INTERVAL_MS = 400;

/**
 * Sets a controlled React input's value the way a user would: through the
 * native value setter + an `input` event, so React's onChange fires and the
 * page's state (and any tutorial events it emits) update for real.
 * @param {HTMLInputElement | HTMLTextAreaElement} el
 * @param {string} value
 */
function setNativeInputValue(el, value) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (!setter) return;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Owns the onboarding product-tour state machine (see tutorialSteps.js).
 * Steps advance on VERIFIED OUTCOMES: while an "auto" step is active, the
 * provider collects tutorialBus outcome events and evaluates the step's pure
 * `isComplete({ pathname, events })` predicate on every event, route change,
 * and a slow safety interval — advancing only when the step's real outcome
 * occurred (navigation happened, the player was actually added, ...).
 *
 * Also exposes `performStepAction()` — the card's "Next" button — which
 * executes the step's declared autoAction (click the real control, fill the
 * real input, or run an editor-registered action) and lets the resulting real
 * outcome advance the tour exactly like a manual interaction.
 *
 * Mounted above the router in App.jsx so the tour survives navigation
 * between AppLayout-wrapped pages and the standalone play editor route.
 */
export function TutorialProvider({ children }) {
  const { user, markTutorialComplete, resetTutorial: resetTutorialFlag } = useAuth();
  const [state, dispatch] = useReducer(tutorialReducer, initialTutorialState);
  const location = useLocation();
  const navigate = useNavigate();
  const wasActiveRef = useRef(false);
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  const currentStep = state.active ? state.steps[state.stepIndex] ?? null : null;
  const routeReady = currentStep ? stepMatchesRoute(currentStep, location.pathname) : false;

  const startTutorial = useCallback(() => {
    dispatch({ type: "START", steps: getTutorialSteps(user) });
  }, [user]);

  const advance = useCallback(() => {
    dispatch({ type: "ADVANCE" });
  }, []);

  /**
   * Goes back one step, running the current step's undoAction first (if any),
   * then dispatching BACK and navigating to the previous step's route.
   *
   * delete-play: extracts playId from the editor URL and DELETEs it via API,
   * then navigates to /app/plays/new so the user can recreate.
   * slate-undo: fires the "undo-step" tutorialBus action (registered in Slate)
   * to call slateHistory.onUndo() and revert the most recent canvas change.
   * run: fires the named tutorialBus action (e.g. "clear-tutorial-tags").
   */
  const goBack = useCallback(async () => {
    if (!state.active || state.stepIndex === 0) return;
    const fromStep = state.steps[state.stepIndex];
    const toStep = state.steps[state.stepIndex - 1];
    if (!fromStep || !toStep) return;

    const undo = fromStep.undoAction;
    if (undo?.kind === "delete-play") {
      const match = pathnameRef.current.match(/^\/app\/plays\/([^/]+)\/edit$/);
      const playId = match?.[1];
      const teamId = user?.teamId;
      if (teamId && playId) {
        try { await apiFetch(`/teams/${teamId}/plays/${playId}`, { method: "DELETE" }); } catch {}
      }
      dispatch({ type: "BACK" });
      navigate("/app/plays/new");
      // PlayNew mounts async after navigation; give it time to register its actions.
      if (toStep.crisisRestore) {
        setTimeout(() => runTutorialAction(toStep.crisisRestore), 400);
      }
      return;
    }

    if (undo?.kind === "slate-undo") {
      runTutorialAction("undo-step");
    }

    if (undo?.kind === "run" && undo.action) {
      runTutorialAction(undo.action);
    }

    dispatch({ type: "BACK" });
    if (typeof toStep.route === "string") navigate(toStep.route);
    // Non-delete-play backs (e.g. pick-preset → add-tags) may need form state restored.
    if (toStep.crisisRestore) {
      setTimeout(() => runTutorialAction(toStep.crisisRestore), 80);
    }
  }, [state.active, state.stepIndex, state.steps, user, navigate, dispatch]);

  const exitTutorial = useCallback(() => {
    dispatch({ type: "EXIT" });
  }, []);

  const resetTutorial = useCallback(async () => {
    dispatch({ type: "RESET" });
    await resetTutorialFlag?.();
  }, [resetTutorialFlag]);

  // Whenever the tour transitions from active -> inactive (finished the last
  // step OR exited early via the X), persist completion so it won't re-launch.
  // In admin preview mode there is nothing to persist — tear the fake session
  // down and return to the admin dashboard instead.
  useEffect(() => {
    if (wasActiveRef.current && !state.active) {
      if (isTutorialPreviewActive()) {
        endTutorialPreviewAndReturn();
        return;
      }
      markTutorialComplete?.();
    }
    wasActiveRef.current = state.active;
  }, [state.active, markTutorialComplete]);

  // ── Outcome-based advancement for "auto" steps ──
  // Events collected since the current step became active. Cleared on every
  // step change so an outcome from a previous step can never satisfy the next.
  const stepEventsRef = useRef([]);
  useEffect(() => {
    stepEventsRef.current = [];
  }, [state.active, state.stepIndex]);

  useEffect(() => {
    if (!state.active || !currentStep || currentStep.advanceOn !== "auto") return undefined;
    if (typeof currentStep.isComplete !== "function") return undefined;

    let advanced = false;
    const evaluate = () => {
      if (advanced) return;
      let complete = false;
      try {
        complete = currentStep.isComplete({
          pathname: pathnameRef.current,
          events: stepEventsRef.current,
        });
      } catch {
        complete = false;
      }
      if (complete) {
        advanced = true;
        advance();
      }
    };

    const unsubscribe = onTutorialEvent((event) => {
      stepEventsRef.current = [...stepEventsRef.current, event];
      evaluate();
    });
    const intervalId = setInterval(evaluate, EVAL_INTERVAL_MS);
    evaluate();

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [state.active, state.stepIndex, currentStep, advance]);

  // Route changes are outcomes too (e.g. "click New Play" completes when the
  // create page mounts) — re-evaluate the current step on every navigation.
  useEffect(() => {
    if (!state.active || !currentStep || currentStep.advanceOn !== "auto") return;
    if (typeof currentStep.isComplete !== "function") return;
    let complete = false;
    try {
      complete = currentStep.isComplete({ pathname: location.pathname, events: stepEventsRef.current });
    } catch {
      complete = false;
    }
    if (complete) advance();
  }, [location.pathname, state.active, currentStep, advance]);

  /**
   * "Next" — perform the current step's default action for the user. The
   * action drives the REAL page/editor (native click, native input value, or
   * an editor-registered action), so the resulting outcome event advances the
   * step through the exact same verification path as a manual interaction.
   */
  const performStepAction = useCallback(() => {
    const step = state.active ? state.steps[state.stepIndex] ?? null : null;
    const action = step?.autoAction;
    if (!action) return;

    if (action.kind === "click") {
      const el = document.querySelector(action.selector || step.selector || "");
      el?.click();
      return;
    }
    if (action.kind === "fill") {
      const el = document.querySelector(action.selector || "");
      if (!el) return;
      setNativeInputValue(el, action.value ?? "");
      if (action.thenClickSelector) {
        // Give React a tick to commit the controlled-input state (the follow-up
        // button is often disabled until the value lands) before clicking.
        setTimeout(() => document.querySelector(action.thenClickSelector)?.click(), 150);
      }
      return;
    }
    if (action.kind === "run") {
      runTutorialAction(action.action);
    }
  }, [state.active, state.stepIndex, state.steps]);

  return (
    <TutorialContext.Provider
      value={{
        active: state.active,
        currentStep,
        routeReady,
        stepNumber: state.stepIndex + 1,
        stepIndex: state.stepIndex,
        totalSteps: state.steps.length,
        steps: state.steps,
        startTutorial,
        advance,
        goBack,
        exitTutorial,
        resetTutorial,
        performStepAction,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within a TutorialProvider");
  return ctx;
}
