/**
 * Pure logic for the tutorial overlay (no React/DOM), kept out of
 * TutorialOverlay.jsx so the component file only exports a component
 * (react-refresh) and the helpers stay directly unit-testable.
 * Tested in admin/test/tutorialProgress.test.js, tutorialBlocker.test.js,
 * and tutorialTransitions.test.js.
 */

/**
 * Percentage of the tour completed after reaching the given step, clamped to [0, 100].
 * Safe against degenerate inputs: a missing/zero/negative `totalSteps` (or a
 * non-finite `stepNumber`) yields 0 rather than NaN/Infinity.
 *
 * @param {number} stepNumber - 1-based index of the current step.
 * @param {number} totalSteps - Total number of steps in the tour.
 * @returns {number} Fill percentage for the progress bar, in [0, 100].
 */
export function tutorialProgressPercent(stepNumber, totalSteps) {
  if (!Number.isFinite(stepNumber) || !Number.isFinite(totalSteps) || totalSteps <= 0) return 0;
  return Math.min(100, Math.max(0, (stepNumber / totalSteps) * 100));
}

/**
 * Computes the four transparent click-trap panels that tile the viewport
 * around the spotlight hole (driver.js-style screen blocker). Everything the
 * panels cover swallows pointer events; only the padded hole over the target
 * is left uncovered so real clicks reach the actual control underneath.
 *
 * @param {{top: number, left: number, width: number, height: number} | null} rect
 *   - The spotlighted target's viewport rect, or `null` when the step has no
 *     (mounted) target — in that case a single full-screen panel is returned.
 * @param {number} pad - Padding added around the rect (SPOTLIGHT_PAD), so the
 *   uncovered hole matches the visual spotlight ring exactly.
 * @param {number} viewportWidth - `window.innerWidth`.
 * @param {number} viewportHeight - `window.innerHeight`.
 * @returns {Array<{top: number, left: number, width: number, height: number}>}
 *   Panel rects (above, below, left of, and right of the hole) with the hole
 *   clamped to the viewport so widths/heights are never negative.
 */
export function blockerPanels(rect, pad, viewportWidth, viewportHeight) {
  if (!rect) {
    return [{ top: 0, left: 0, width: viewportWidth, height: viewportHeight }];
  }
  const holeTop = Math.max(0, Math.min(viewportHeight, rect.top - pad));
  const holeLeft = Math.max(0, Math.min(viewportWidth, rect.left - pad));
  const holeBottom = Math.max(holeTop, Math.min(viewportHeight, rect.top + rect.height + pad));
  const holeRight = Math.max(holeLeft, Math.min(viewportWidth, rect.left + rect.width + pad));
  return [
    // Above the hole (full width)
    { top: 0, left: 0, width: viewportWidth, height: holeTop },
    // Below the hole (full width)
    { top: holeBottom, left: 0, width: viewportWidth, height: viewportHeight - holeBottom },
    // Left of the hole (hole-height band)
    { top: holeTop, left: 0, width: holeLeft, height: holeBottom - holeTop },
    // Right of the hole (hole-height band)
    { top: holeTop, left: holeRight, width: viewportWidth - holeRight, height: holeBottom - holeTop },
  ];
}

/**
 * Cross-fade phase for the instruction card's content. The card keeps
 * rendering the *previous* step's content (faded out) for a brief moment
 * after the active step changes, then swaps and fades the new content in —
 * instead of hard-swapping text the instant the step advances.
 *
 * @param {string|null|undefined} displayedStepId - id of the step whose content the card is currently rendering.
 * @param {string|null|undefined} activeStepId - id of the tour's actual current step.
 * @returns {"idle"|"fade-out"} `"fade-out"` while the displayed content lags
 *   behind the active step (content should be at opacity 0 and a swap is
 *   pending); `"idle"` when they match or either id is missing (nothing to
 *   fade from/to, so the content renders normally).
 */
export function contentFadePhase(displayedStepId, activeStepId) {
  if (displayedStepId == null || activeStepId == null) return "idle";
  return displayedStepId === activeStepId ? "idle" : "fade-out";
}

/**
 * Decides what the instruction card's body should render, softening the
 * "waiting for the next screen to mount" state so it never flashes.
 *
 * @param {boolean} waitingForTarget - The step has a selector but its element isn't mounted yet.
 * @param {boolean} loadingHintReady - The waiting state has persisted past LOADING_HINT_DELAY_MS.
 * @param {boolean} fading - The content cross-fade is in its fade-out phase.
 * @returns {"step-body"|"loading-pending"|"loading"} `"step-body"` renders the
 *   step's body text (also while fading out, so the old text fades instead of
 *   snapping to a loading hint); `"loading-pending"` renders the hint fully
 *   transparent (reserving layout, invisible during fast transitions);
 *   `"loading"` fades the hint in for genuinely slow mounts.
 */
export function cardBodyMode(waitingForTarget, loadingHintReady, fading) {
  if (fading || !waitingForTarget) return "step-body";
  return loadingHintReady ? "loading" : "loading-pending";
}
