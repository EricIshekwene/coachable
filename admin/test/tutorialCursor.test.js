// @vitest-environment jsdom
import React, { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { deriveTarget, useTargetRect } from "../../src/components/tutorial/TutorialCursor.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const rect = (left, top, width, height) => ({ left, top, width, height });

function RectProbe({ selector, enabled, onRect }) {
  const targetRect = useTargetRect(selector, enabled);
  useEffect(() => {
    onRect(targetRect);
  }, [targetRect, onRect]);
  return null;
}

describe("deriveTarget", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1000 });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 800 });
  });

  it("returns null for narrative center steps and missing selectors", () => {
    expect(deriveTarget({ selector: ".target", placement: "center" }, rect(10, 20, 30, 40), null)).toBeNull();
    expect(deriveTarget({ selector: null, placement: "bottom" }, rect(10, 20, 30, 40), null)).toBeNull();
  });

  it("uses the fixed field-center point for corner steps", () => {
    expect(deriveTarget({ selector: ".field", placement: "corner" }, rect(10, 20, 30, 40), null)).toEqual({
      x: 420,
      y: 416,
    });
  });

  it("uses the spotlight rect center for normal targeted steps", () => {
    expect(deriveTarget({ selector: ".target", placement: "bottom" }, rect(20, 40, 80, 120), null)).toEqual({
      x: 60,
      y: 100,
    });
  });

  it("prioritizes an auto-click rect over the spotlight rect", () => {
    expect(
      deriveTarget(
        { selector: ".spotlight", placement: "right", autoAction: { kind: "click", selector: ".button" } },
        rect(0, 0, 20, 20),
        rect(100, 200, 50, 30)
      )
    ).toEqual({
      x: 125,
      y: 215,
    });
  });
});

describe("useTargetRect", () => {
  let container;
  let root;
  let rafId;
  let rafCallbacks;

  const flushAnimationFrame = async () => {
    const callbacks = [...rafCallbacks.values()];
    rafCallbacks.clear();
    await act(async () => {
      callbacks.forEach((callback) => callback(performance.now()));
    });
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    rafId = 0;
    rafCallbacks = new Map();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      rafId += 1;
      rafCallbacks.set(rafId, callback);
      return rafId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      rafCallbacks.delete(id);
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("tracks the selected element bounding rect", async () => {
    const target = document.createElement("div");
    target.className = "tracked";
    target.getBoundingClientRect = vi.fn(() => rect(12, 24, 48, 96));
    document.body.appendChild(target);
    const onRect = vi.fn();

    await act(async () => {
      root.render(React.createElement(RectProbe, { selector: ".tracked", enabled: true, onRect }));
    });
    await flushAnimationFrame();

    expect(onRect).toHaveBeenLastCalledWith({ left: 12, top: 24, width: 48, height: 96 });
  });

  it("clears the rect when disabled", async () => {
    const target = document.createElement("div");
    target.className = "tracked";
    target.getBoundingClientRect = vi.fn(() => rect(5, 10, 15, 20));
    document.body.appendChild(target);
    const onRect = vi.fn();

    await act(async () => {
      root.render(React.createElement(RectProbe, { selector: ".tracked", enabled: true, onRect }));
    });
    await flushAnimationFrame();
    await act(async () => {
      root.render(React.createElement(RectProbe, { selector: ".tracked", enabled: false, onRect }));
    });

    expect(onRect).toHaveBeenLastCalledWith(null);
    expect(rafCallbacks.size).toBe(0);
  });
});
