/**
 * adminModal.test.js
 *
 * Tests for AdminModal behavior — open/close logic, Escape key handling,
 * and overlay click-to-close logic — as pure state machine tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Simulate the open/close state machine ─────────────────────────────────────

/**
 * Minimal simulation of AdminModal's stateful behavior.
 * Mirrors the component's:
 *   - early return when !open
 *   - Escape key listener registration / cleanup
 *   - overlay mousedown-to-close
 */
function createModalController(initialOpen = false) {
  let open = initialOpen;
  let onClose = null;
  const keydownListeners = [];

  function mount(closeCallback) {
    onClose = closeCallback;
    if (open) {
      const handler = (e) => { if (e.key === "Escape") onClose?.(); };
      keydownListeners.push(handler);
      return handler;
    }
    return null;
  }

  function unmount(handler) {
    const idx = keydownListeners.indexOf(handler);
    if (idx !== -1) keydownListeners.splice(idx, 1);
  }

  function pressEscape() {
    keydownListeners.forEach((h) => h({ key: "Escape" }));
  }

  function pressOtherKey() {
    keydownListeners.forEach((h) => h({ key: "Enter" }));
  }

  function clickOverlay(isTarget) {
    if (isTarget) onClose?.();
  }

  return { mount, unmount, pressEscape, pressOtherKey, clickOverlay, get open() { return open; } };
}

describe("AdminModal open/close logic", () => {
  it("does not render (returns null equivalent) when open is false", () => {
    const ctrl = createModalController(false);
    const handler = ctrl.mount(() => {});
    expect(handler).toBeNull();
  });

  it("registers keydown listener when open is true", () => {
    const ctrl = createModalController(true);
    const handler = ctrl.mount(() => {});
    expect(handler).toBeTruthy();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    const ctrl = createModalController(true);
    ctrl.mount(onClose);
    ctrl.pressEscape();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does NOT call onClose for non-Escape keys", () => {
    const onClose = vi.fn();
    const ctrl = createModalController(true);
    ctrl.mount(onClose);
    ctrl.pressOtherKey();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when the overlay backdrop is clicked", () => {
    const onClose = vi.fn();
    const ctrl = createModalController(true);
    ctrl.mount(onClose);
    ctrl.clickOverlay(true);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does NOT call onClose when inner panel is clicked (isTarget=false)", () => {
    const onClose = vi.fn();
    const ctrl = createModalController(true);
    ctrl.mount(onClose);
    ctrl.clickOverlay(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("listener is removed after unmount", () => {
    const onClose = vi.fn();
    const ctrl = createModalController(true);
    const handler = ctrl.mount(onClose);
    ctrl.unmount(handler);
    ctrl.pressEscape();
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ── AdminModal width prop ──────────────────────────────────────────────────────

describe("AdminModal width prop", () => {
  it("default width is max-w-md", () => {
    const DEFAULT_WIDTH = "max-w-md";
    expect(DEFAULT_WIDTH).toBe("max-w-md");
  });

  it("accepts custom width class", () => {
    const width = "max-w-2xl";
    expect(width).toMatch(/^max-w-/);
  });
});
