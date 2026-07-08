/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { isTutorialPreviewActive, endTutorialPreviewAndReturn } from "../utils/tutorialPreview";
import { getTutorialSteps, stepMatchesRoute, tutorialReducer, initialTutorialState } from "./tutorialSteps";
import { onTutorialEvent, runTutorialAction } from "./tutorialBus";

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
        totalSteps: state.steps.length,
        startTutorial,
        advance,
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
