import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiX } from "react-icons/fi";
import { useTutorial } from "../../context/TutorialContext";

const SPOTLIGHT_PAD = 8;
const CARD_WIDTH = 320;
const CARD_HEIGHT_ESTIMATE = 168;
const VIEWPORT_MARGIN = 12;

/** Computes a fixed-position rect for the target spotlight ring, tracking scroll/resize/layout. */
function useTargetRect(selector, enabled) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!enabled || !selector) {
      setRect(null);
      return undefined;
    }
    let frameId;
    const tick = () => {
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect((prev) => {
          if (prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height) {
            return prev;
          }
          return { top: r.top, left: r.left, width: r.width, height: r.height };
        });
      } else {
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
 */
export default function TutorialOverlay() {
  const { active, currentStep, routeReady, stepNumber, totalSteps, advance, exitTutorial } = useTutorial();
  const navigate = useNavigate();
  const rect = useTargetRect(currentStep?.selector, active && routeReady && Boolean(currentStep?.selector));
  const hasTarget = Boolean(currentStep?.selector);
  const waitingForTarget = active && routeReady && hasTarget && !rect;
  const cardRef = useRef(null);

  if (!active || !currentStep) return null;

  const { top, left } = cardPosition(rect, currentStep.placement);

  const handleCta = () => {
    if (currentStep.navigateTo) navigate(currentStep.navigateTo);
    advance();
  };

  return createPortal(
    // pointer-events-none on the wrapper so clicks pass through everywhere except
    // the specific children that opt back in with pointer-events-auto (backdrop
    // when there's no target, the exit button, and the instruction card).
    <div className="pointer-events-none fixed inset-0 z-[10050]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Dimmed backdrop with a spotlight hole cut around the target (pointer-events pass through the hole). */}
      {rect ? (
        <div
          className="tutorial-spotlight-ring pointer-events-none fixed rounded-xl outline outline-2"
          style={{
            top: rect.top - SPOTLIGHT_PAD,
            left: rect.left - SPOTLIGHT_PAD,
            width: rect.width + SPOTLIGHT_PAD * 2,
            height: rect.height + SPOTLIGHT_PAD * 2,
            boxShadow: "0 0 0 9999px rgba(10,10,10,0.72)",
            transition: "top 0.18s ease, left 0.18s ease, width 0.18s ease, height 0.18s ease",
          }}
        />
      ) : (
        <div
          className={`fixed inset-0 bg-black/70 backdrop-blur-[1px] ${hasTarget ? "pointer-events-none" : "pointer-events-auto"}`}
        />
      )}

      {/* Top-left exit control — always visible, exits the tour from any step. */}
      <button
        type="button"
        onClick={exitTutorial}
        className="pointer-events-auto fixed left-4 top-4 flex items-center gap-2 rounded-lg border border-BrandGray2/40 bg-BrandBlack px-3 py-2 text-xs font-semibold text-BrandGray transition hover:border-BrandGray hover:text-BrandWhite"
      >
        <FiX className="text-sm" />
        Exit tutorial
      </button>

      {/* Instruction card */}
      <div
        ref={cardRef}
        className="pointer-events-auto fixed flex flex-col gap-2.5 rounded-xl border border-BrandGray2/60 bg-BrandBlack p-4 shadow-[0_18px_38px_-18px_rgba(0,0,0,0.95)]"
        style={{ top, left, width: CARD_WIDTH }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-BrandOrange">
            Step {stepNumber} of {totalSteps}
          </span>
        </div>
        <p className="font-DmSans text-sm font-semibold text-BrandWhite">{currentStep.title}</p>
        <p className="font-DmSans text-xs text-BrandGray">
          {waitingForTarget ? "Loading…" : currentStep.body}
        </p>
        {currentStep.advanceOn === "manual" && (
          <button
            type="button"
            onClick={handleCta}
            className="mt-1 rounded-lg bg-BrandOrange px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            {currentStep.ctaLabel || "Continue"}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
