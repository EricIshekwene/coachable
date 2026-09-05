import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiX, FiArrowLeft } from "react-icons/fi";
import { useTutorial } from "../../context/TutorialContext";
import { tutorialProgressPercent, blockerPanels, contentFadePhase, cardBodyMode } from "./tutorialOverlayLogic";

const SPOTLIGHT_PAD = 8;
const CARD_WIDTH = 320;
const CARD_HEIGHT_ESTIMATE = 168;
const VIEWPORT_MARGIN = 12;
// How long the card content stays faded out before swapping to the next step's content.
const CONTENT_FADE_MS = 150;
// How long a "waiting for target" state must persist before the card shows "Loading…".
// Fast page/element transitions resolve within this window and never flash the hint.
const LOADING_HINT_DELAY_MS = 250;

/** Computes a fixed-position rect for the target spotlight ring, tracking scroll/resize/layout. */
function useTargetRect(selector, enabled) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!enabled || !selector) {
      setRect(null);
      return undefined;
    }
    let frameId;
    // Require this many consecutive frames of an identical rect before committing.
    const STABLE_FRAMES_REQUIRED = 6; // ≈ 100 ms at 60 fps
    let pendingRect = null; // last observed rect (may still be animating)
    let stableCount = 0;   // how many consecutive frames pendingRect has been unchanged
    const tick = () => {
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        // Check whether the observed rect is identical to what we saw last frame.
        const same =
          pendingRect !== null &&
          pendingRect.top    === r.top    &&
          pendingRect.left   === r.left   &&
          pendingRect.width  === r.width  &&
          pendingRect.height === r.height;

        if (same) {
          stableCount++;
          if (stableCount >= STABLE_FRAMES_REQUIRED) {
            // Rect has been stable long enough — commit to React state.
            // Use the functional updater to avoid committing if it's already current.
            setRect((prev) =>
              prev &&
              prev.top    === pendingRect.top    &&
              prev.left   === pendingRect.left   &&
              prev.width  === pendingRect.width  &&
              prev.height === pendingRect.height
                ? prev
                : { ...pendingRect }
            );
          }
          // else: still counting down — leave state as-is (null or last stable value)
        } else {
          // Rect changed: reset stability counter and record the new candidate.
          stableCount = 0;
          pendingRect = { top: r.top, left: r.left, width: r.width, height: r.height };
          // Do NOT call setRect here — we only commit after STABLE_FRAMES_REQUIRED frames.
        }
      } else {
        // Element gone or not yet mounted: reset everything and null out.
        stableCount = 0;
        pendingRect = null;
        setRect(null);
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [selector, enabled]);

  return rect;
}

/** Places the instruction card near the target rect (or centered when there is none), clamped to the viewport. */
function cardPosition(rect, placement) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top;
  let left;

  if (!rect || placement === "center") {
    top = vh / 2 - CARD_HEIGHT_ESTIMATE / 2;
    left = vw / 2 - CARD_WIDTH / 2;
  } else if (placement === "corner") {
    // For large targets (e.g. the whole canvas) — pin to a fixed corner so the
    // card never sits on top of the exact spot the user needs to click.
    top = VIEWPORT_MARGIN;
    left = vw - CARD_WIDTH - VIEWPORT_MARGIN;
  } else if (placement === "bottom") {
    top = rect.top + rect.height + 16;
    left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
  } else if (placement === "top") {
    top = rect.top - 16 - CARD_HEIGHT_ESTIMATE;
    left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
  } else if (placement === "left") {
    top = rect.top + rect.height / 2 - CARD_HEIGHT_ESTIMATE / 2;
    left = rect.left - 16 - CARD_WIDTH;
  } else {
    top = rect.top + rect.height / 2 - CARD_HEIGHT_ESTIMATE / 2;
    left = rect.left + rect.width + 16;
  }

  top = Math.min(Math.max(top, VIEWPORT_MARGIN), vh - CARD_HEIGHT_ESTIMATE - VIEWPORT_MARGIN);
  left = Math.min(Math.max(left, VIEWPORT_MARGIN), vw - CARD_WIDTH - VIEWPORT_MARGIN);
  return { top, left };
}

/**
 * Full-screen animated tour overlay: dims the page, cuts a spotlight hole
 * around the current step's target (real clicks pass through to it), and
 * shows an instruction card with an always-present top-left exit button.
 * Everything outside the hole, the card, and the exit button is click-blocked
 * (four-panel trap / full-screen backdrop) while the tour runs; the blocker
 * unmounts with the overlay on exit, so no cleanup pass is needed.
 */
export default function TutorialOverlay() {
  const { active, currentStep, routeReady, stepNumber, stepIndex, totalSteps, steps, advance, goBack, exitTutorial, performStepAction } = useTutorial();
  const navigate = useNavigate();
  const rect = useTargetRect(currentStep?.selector, active && routeReady && Boolean(currentStep?.selector));
  const hasTarget = Boolean(currentStep?.selector);
  const waitingForTarget = active && routeReady && hasTarget && !rect;
  const cardRef = useRef(null);

  // Content cross-fade: keep rendering the previous step's content while it
  // fades out, then swap to the new step's content (which fades back in).
  // The card itself glides to its new position during the same window.
  const [displayed, setDisplayed] = useState({ step: null, stepNumber: 0 });
  const fadePhase = contentFadePhase(displayed.step?.id, currentStep?.id);

  useEffect(() => {
    if (!currentStep) {
      // Tour exited — reset so a restarted tour doesn't fade from stale content.
      setDisplayed((prev) => (prev.step ? { step: null, stepNumber: 0 } : prev));
      return undefined;
    }
    if (!displayed.step) {
      // First step of a (re)started tour: nothing to fade from, show immediately.
      setDisplayed({ step: currentStep, stepNumber });
      return undefined;
    }
    if (displayed.step.id === currentStep.id) return undefined;
    const timer = setTimeout(() => setDisplayed({ step: currentStep, stepNumber }), CONTENT_FADE_MS);
    return () => clearTimeout(timer);
  }, [currentStep, stepNumber, displayed.step]);

  // Delayed "Loading…": only show the hint if waiting persists past the
  // grace window, so fast page transitions never flash it.
  const [loadingHintReady, setLoadingHintReady] = useState(false);
  useEffect(() => {
    if (!waitingForTarget) {
      setLoadingHintReady(false);
      return undefined;
    }
    const timer = setTimeout(() => setLoadingHintReady(true), LOADING_HINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [waitingForTarget]);

  // Per-step scroll guard: reset whenever the active step changes so each
  // step is eligible for exactly one auto-scroll.
  const lastScrolledSelectorRef = useRef(null);
  useEffect(() => {
    lastScrolledSelectorRef.current = null;
  }, [currentStep?.id]);

  // Scroll the spotlighted element into view the first time it becomes visible
  // each step. Fires on `rect` rather than step change because popup targets
  // (e.g. the prefab popover) mount asynchronously after the step activates —
  // rect is null until they render, then transitions to non-null.
  useEffect(() => {
    if (!rect || !currentStep?.selector) return;
    if (lastScrolledSelectorRef.current === currentStep.selector) return;
    lastScrolledSelectorRef.current = currentStep.selector;
    const el = document.querySelector(currentStep.selector);
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: prefersReduced ? "instant" : "smooth", block: "nearest", inline: "nearest" });
  }, [rect, currentStep?.selector]);

  if (!active || !currentStep) return null;

  // Position tracks the *live* step so the card starts gliding immediately;
  // content tracks the *displayed* step so it cross-fades instead of snapping.
  const { top, left } = cardPosition(rect, currentStep.placement);
  const shownStep = displayed.step || currentStep;
  const shownStepNumber = displayed.step ? displayed.stepNumber : stepNumber;
  const isFading = fadePhase === "fade-out";
  const bodyMode = cardBodyMode(waitingForTarget, loadingHintReady, isFading);
  const fadeCls = `transition-opacity duration-150 ease-out motion-reduce:transition-none ${isFading ? "opacity-0" : "opacity-100"}`;

  const handleCta = () => {
    if (shownStep.navigateTo) navigate(shownStep.navigateTo);
    advance();
  };

  /** Delegates to goBack(), which handles undo, navigation, and BACK dispatch. */
  const handleBack = () => { goBack(); };

  const finishStepIds = new Set(["finish", "finish-solo"]);
  const showBack = stepIndex > 0 && !finishStepIds.has(shownStep.id);

  return createPortal(
    // pointer-events-none on the wrapper; the children opt back in with
    // pointer-events-auto. While the tour runs, the page underneath is fully
    // click-blocked: either by the four transparent panels tiled around the
    // spotlight hole (only the hole lets clicks through to the real target)
    // or by the full-screen backdrop when there's no visible target yet.
    // The exit button and instruction card sit on top and stay interactive.
    <div className="pointer-events-none fixed inset-0 z-[10050]" role="dialog" aria-modal="true" aria-label="Product tour">
      {rect ? (
        <>
          {/* Four-panel click-trap (driver.js style): transparent pointer-events-auto
              divs tile the viewport around the padded hole, so everything outside
              the spotlighted target is un-clickable. The dimming itself still comes
              from the spotlight ring's box-shadow below. */}
          {blockerPanels(rect, SPOTLIGHT_PAD, window.innerWidth, window.innerHeight).map((panel, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="pointer-events-auto fixed"
              style={{ top: panel.top, left: panel.left, width: panel.width, height: panel.height }}
            />
          ))}
          {/* Dimmed backdrop with a spotlight hole cut around the target (real clicks pass through the hole only). */}
          <div
            className="tutorial-spotlight-ring pointer-events-none fixed rounded-xl outline outline-2"
            style={{
              top: rect.top - SPOTLIGHT_PAD,
              left: rect.left - SPOTLIGHT_PAD,
              width: rect.width + SPOTLIGHT_PAD * 2,
              height: rect.height + SPOTLIGHT_PAD * 2,
              boxShadow: "0 0 0 9999px rgba(10,10,10,0.38)",
              transition: "top 0.18s ease, left 0.18s ease, width 0.18s ease, height 0.18s ease",
            }}
          />
        </>
      ) : (
        // No visible target (narrative step, or waiting for the next screen to
        // mount): full-screen backdrop blocks every click underneath in both cases.
        <div className="tutorial-backdrop pointer-events-auto fixed inset-0 bg-black/40 backdrop-blur-[1px]" />
      )}

      {/* Top-left exit control — always visible, exits the tour from any step. */}
      <button
        type="button"
        onClick={exitTutorial}
        className="pointer-events-auto fixed left-4 top-4 flex items-center gap-2 rounded-lg border border-BrandGray2/40 bg-BrandBlack px-5 py-3 text-sm font-semibold text-BrandGray transition hover:border-BrandGray hover:text-BrandWhite"
      >
        <FiX className="text-lg" />
        Exit tutorial
      </button>

      {/* Instruction card — glides (top/left transition) to each step's position instead of teleporting. */}
      <div
        ref={cardRef}
        className="pointer-events-auto fixed flex flex-col gap-2.5 rounded-xl border border-BrandGray2/60 bg-BrandBlack p-4 shadow-[0_18px_38px_-18px_rgba(0,0,0,0.95)] transition-[top,left] duration-300 ease-out motion-reduce:transition-none"
        style={{ top, left, width: CARD_WIDTH }}
      >
        <div className={`flex items-center justify-between ${fadeCls}`}>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-BrandOrange">
            Step {shownStepNumber} of {totalSteps}
          </span>
        </div>
        {/* Slim tour progress bar — fill animates as the user advances. */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-BrandGray2/30" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(tutorialProgressPercent(stepNumber, totalSteps))} aria-label="Tour progress">
          <div
            className="h-full rounded-full bg-BrandOrange transition-[width] duration-300 ease-out"
            style={{ width: `${tutorialProgressPercent(stepNumber, totalSteps)}%` }}
          />
        </div>
        <p className={`font-DmSans text-sm font-semibold text-BrandWhite ${fadeCls}`}>{shownStep.title}</p>
        <p className={`font-DmSans text-xs text-BrandGray ${fadeCls}`}>
          {bodyMode === "step-body" ? (
            shownStep.body
          ) : (
            // Waiting for the next screen's target: the hint mounts invisible
            // and only fades in if the wait outlasts the grace window, so fast
            // transitions never flash "Loading…".
            <span className={`transition-opacity duration-150 ease-out motion-reduce:transition-none ${bodyMode === "loading" ? "opacity-100" : "opacity-0"}`}>
              Loading…
            </span>
          )}
        </p>
        {/* Button row: Back on the left (ghost), primary CTA on the right. */}
        <div className="mt-1 flex items-center justify-between gap-2">
          {/* Back button — hidden on step 1 and finish steps; fades with the card content. */}
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isFading}
              aria-label="Go back to previous step"
              className={`flex items-center gap-1 text-xs text-BrandGray transition hover:text-BrandWhite active:scale-[0.98] motion-reduce:transition-none disabled:pointer-events-none ${isFading ? "opacity-0" : "opacity-100"}`}
            >
              <FiArrowLeft className="text-sm" />
              Back
            </button>
          ) : (
            <div aria-hidden="true" />
          )}

          {shownStep.advanceOn === "manual" ? (
            <button
              type="button"
              onClick={handleCta}
              disabled={isFading}
              className={`rounded-lg bg-BrandOrange px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 active:scale-[0.98] motion-reduce:transition-none ${isFading ? "opacity-0" : "opacity-100"}`}
            >
              {shownStep.ctaLabel || "Continue"}
            </button>
          ) : (
            // "Next" performs the step's default action for the user (fill the
            // input, click the highlighted control, place the player...). The
            // resulting real outcome advances the tour — Next never skips the
            // verification the manual interaction goes through.
            shownStep.autoAction && (
              <button
                type="button"
                onClick={performStepAction}
                disabled={waitingForTarget || isFading}
                className={`rounded-lg border border-BrandOrange/50 px-3.5 py-1.5 text-xs font-semibold text-BrandOrange transition hover:bg-BrandOrange/10 active:scale-[0.98] disabled:opacity-40 motion-reduce:transition-none ${isFading ? "!opacity-0" : "opacity-100"}`}
                title="Performs this step for you"
              >
                Next: do it for me
              </button>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
