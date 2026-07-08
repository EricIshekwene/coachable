/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { isTutorialPreviewActive, endTutorialPreviewAndReturn } from "../utils/tutorialPreview";
import { getTutorialSteps, stepMatchesRoute, tutorialReducer, initialTutorialState } from "./tutorialSteps";

const TutorialContext = createContext(null);

/**
 * Owns the onboarding product-tour state machine (see tutorialSteps.js) and
 * the single document-level click listener that auto-advances "click"
 * steps when the user actually clicks the highlighted element.
 * Mounted above the router in App.jsx so the tour survives navigation
 * between AppLayout-wrapped pages and the standalone play editor route.
 */
export function TutorialProvider({ children }) {
  const { user, markTutorialComplete, resetTutorial: resetTutorialFlag } = useAuth();
  const [state, dispatch] = useReducer(tutorialReducer, initialTutorialState);
  const location = useLocation();
  const wasActiveRef = useRef(false);

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

  // Single capture-phase click listener drives every "click"-type step.
  useEffect(() => {
    if (!state.active || !currentStep || currentStep.advanceOn !== "click" || !routeReady) return undefined;

    const targetSelector = currentStep.advanceSelector || currentStep.selector;
    if (!targetSelector) return undefined;

    const handleClick = (event) => {
      const candidates = document.querySelectorAll(targetSelector);
      for (const el of candidates) {
        if (el.contains(event.target)) {
          advance();
          return;
        }
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [state.active, currentStep, routeReady, advance]);

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
