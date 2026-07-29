/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTutorial } from "../../context/TutorialContext";

const MOVE_DURATION_MS = 350;
const MOVE_FALLBACK_MS = MOVE_DURATION_MS + 80;
const CLICK_DURATION_MS = 400;
const DWELL_DURATION_MS = 1800;

const initialCursorState = {
  phase: "IDLE",
  visible: false,
  clickKey: 0,
  position: { x: 0, y: 0 },
  // True after the first MOVE so subsequent moves use a position transition.
  hasPositioned: false,
  // True only on the very first MOVE — suppresses the top/left transition so
  // the cursor snaps to the target instead of gliding from (0,0).
  skipPositionTransition: false,
};

function cursorReducer(state, action) {
  switch (action.type) {
    case "HIDE":
      return { ...state, phase: "IDLE", visible: false };
    case "MOVE":
      return {
        ...state,
        phase: "MOVING",
        visible: true,
        position: action.target,
        skipPositionTransition: !state.hasPositioned,
        hasPositioned: true,
      };
    case "CLICK":
      return {
        ...state,
        phase: "CLICKING",
        visible: true,
        clickKey: state.clickKey + 1,
        skipPositionTransition: false,
      };
    default:
      return state;
  }
}

/**
 * Computes a fixed-position rect for the target cursor, tracking scroll/resize/layout.
 *
 * WHY no functional updater: React 18 concurrent mode can replay a pending
 * `setRect(fn)` during a higher-priority re-render. At replay time the closed-over
 * `r` variable from a previous RAF tick is stale — if layout has changed it can be
 * null, causing "Cannot read properties of null (reading 'top')". Using a ref for
 * the bail-out comparison and always calling `setRect` with a plain value (never a
 * function) makes the crash impossible: nothing is ever replayed.
 */
export function useTargetRect(selector, enabled) {
  const [rect, setRect] = useState(null);
  // Tracks the last value we passed to setRect so the RAF tick can skip redundant
  // updates without a functional updater.
  const prevRef = useRef(null);

  useEffect(() => {
    // Always clear stale geometry from the previous step immediately so the
    // cursor never snaps to a prior element's position on the new step.
    prevRef.current = null;
    setRect(null);

    if (!enabled || !selector) {
      return undefined;
    }
    let frameId;
    const tick = () => {
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect?.() ?? null;
        // Only accept rects where top is a real number — DOMRect can transiently
        // return null-valued properties during concurrent React renders.
        if (r && typeof r.top === "number") {
          const top = r.top;
          const left = r.left;
          const width = r.width;
          const height = r.height;
          const prev = prevRef.current;
          if (!prev || prev.top !== top || prev.left !== left || prev.width !== width || prev.height !== height) {
            const snap = { top, left, width, height };
            prevRef.current = snap;
            setRect(snap);
          }
        }
      } else {
        // Guard: only call setRect(null) the first time the element goes absent so we
        // don't schedule a no-op state update on every frame when it stays absent.
        if (prevRef.current !== null) {
          prevRef.current = null;
          setRect(null);
        }
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [selector, enabled]);

  return rect;
}

/**
 * Derives the screen-space {x, y} point the cursor should point at for the
 * current tutorial step.
 *
 * @param {Object|null} step - current tutorial step
 * @param {Object|null} spotRect - bounding rect of the spotlight/selector target
 * @param {Object|null} autoRect - bounding rect of an auto-action target (if different from spotlight)
 * @returns {{ x: number, y: number } | null}
 */
export function deriveTarget(step, spotRect, autoRect) {
  if (!step || !step.selector || step.placement === "center") return null;
  if (step.placement === "corner") {
    return { x: window.innerWidth * 0.42, y: window.innerHeight * 0.52 };
  }
  if (autoRect) {
    return { x: autoRect.left + autoRect.width / 2, y: autoRect.top + autoRect.height / 2 };
  }
  if (spotRect) {
    return { x: spotRect.left + spotRect.width / 2, y: spotRect.top + spotRect.height / 2 };
  }
  return null;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReduced(media.matches);
    handleChange();
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, []);

  return reduced;
}

/**
 * Renders an animated guide cursor that tracks the current tutorial step's
 * target element, moves to it with a CSS transition, then plays a click
 * animation to hint the user where to interact.
 *
 * Mounted at the root level in App.jsx (inside TutorialProvider). Only
 * renders when a tutorial step is active and has a targetable selector.
 */
export default function TutorialCursor() {
  const { active, currentStep, routeReady } = useTutorial();
  const [state, dispatch] = useReducer(cursorReducer, initialCursorState);
  const cursorRef = useRef(null);
  const moveFallbackRef = useRef(null);
  // Guards against both top and left transitionend firing CLICK twice for one MOVE.
  const clickDispatchedRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const spotlightRect = useTargetRect(
    currentStep?.selector,
    active && routeReady && Boolean(currentStep?.selector)
  );

  const autoClickSelector =
    currentStep?.autoAction?.kind === "click" &&
    currentStep.autoAction.selector !== currentStep.selector
      ? currentStep.autoAction.selector
      : null;
  const autoClickRect = useTargetRect(autoClickSelector, active && Boolean(autoClickSelector));

  const target = useMemo(
    () => deriveTarget(currentStep, spotlightRect, autoClickRect),
    [currentStep, spotlightRect, autoClickRect]
  );

  useEffect(() => {
    if (!active || !currentStep) return undefined;
    if (!target) {
      dispatch({ type: "HIDE" });
      return undefined;
    }

    dispatch({ type: "MOVE", target });
    clickDispatchedRef.current = false;

    if (prefersReducedMotion) return undefined;

    if (moveFallbackRef.current) window.clearTimeout(moveFallbackRef.current);
    moveFallbackRef.current = window.setTimeout(() => {
      moveFallbackRef.current = null;
      dispatch({ type: "CLICK" });
    }, MOVE_FALLBACK_MS);

    return () => {
      if (moveFallbackRef.current) {
        window.clearTimeout(moveFallbackRef.current);
        moveFallbackRef.current = null;
      }
    };
  }, [active, currentStep, target, prefersReducedMotion]);

  useEffect(() => {
    if (!active || !currentStep || state.phase !== "CLICKING" || prefersReducedMotion) return undefined;
    const replayId = window.setTimeout(() => {
      dispatch({ type: "CLICK" });
    }, CLICK_DURATION_MS + DWELL_DURATION_MS);
    return () => window.clearTimeout(replayId);
  }, [active, currentStep, state.phase, state.clickKey, prefersReducedMotion]);

  if (!active || !currentStep) return null;

  const visible = Boolean(target) && state.visible;

  const handleTransitionEnd = (event) => {
    if (prefersReducedMotion || event.target !== cursorRef.current) return;
    // Guard: only the first of top/left transitionend events dispatches CLICK.
    if (
      state.phase === "MOVING" &&
      !clickDispatchedRef.current &&
      (event.propertyName === "top" || event.propertyName === "left")
    ) {
      clickDispatchedRef.current = true;
      if (moveFallbackRef.current) {
        window.clearTimeout(moveFallbackRef.current);
        moveFallbackRef.current = null;
      }
      dispatch({ type: "CLICK" });
    }
  };

  // On the very first show the cursor snaps to position (opacity-only transition)
  // so it doesn't visibly glide from (0,0) across the screen. Subsequent moves
  // use the full top/left transition to slide between step targets.
  const positionTransition = prefersReducedMotion
    ? "none"
    : state.skipPositionTransition
      ? "opacity 0.12s ease"
      : "top 350ms ease-out, left 350ms ease-out, opacity 0.12s ease";

  return createPortal(
    <div
      ref={cursorRef}
      className="pointer-events-none fixed z-[10051]"
      style={{
        top: state.position.y,
        left: state.position.x,
        opacity: visible ? 1 : 0,
        transition: positionTransition,
      }}
      onTransitionEnd={handleTransitionEnd}
      aria-hidden="true"
    >
      <style>{`
        @keyframes cursor-click {
          0%   { transform: scale(1)    }
          30%  { transform: scale(0.78) }
          65%  { transform: scale(1.04) }
          100% { transform: scale(1)    }
        }

        @keyframes cursor-ring {
          0%   { transform: scale(0.5);  opacity: 0.85; }
          100% { transform: scale(2.4);  opacity: 0;    }
        }
      `}</style>
      <svg
        key={`arrow-${state.clickKey}`}
        width="28"
        height="28"
        viewBox="0 0 18 26"
        fill="none"
        style={{
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.55))",
          animation: state.phase === "CLICKING" && !prefersReducedMotion ? "cursor-click 220ms ease-out" : "none",
          transformOrigin: "3px 2px",
        }}
      >
        <path
          d="M 3 2 L 3 20 L 7 16 L 11 24 L 13 23 L 9 15 L 15 15 Z"
          fill="#ffffff"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span
        key={`ring-${state.clickKey}`}
        className="absolute rounded-full"
        style={{
          left: -4,
          top: 8,
          width: 14,
          height: 14,
          border: "2px solid #FF7A18",
          background: "transparent",
          animation: state.phase === "CLICKING" && !prefersReducedMotion ? "cursor-ring 400ms ease-out" : "none",
        }}
      />
    </div>,
    document.body
  );
}
