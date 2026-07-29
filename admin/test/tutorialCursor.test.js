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

  it("does not crash when getBoundingClientRect transiently returns null", async () => {
    const target = document.createElement("div");
    target.className = "tracked";
    // First call returns null (simulates the concurrent-render edge case), second returns a real rect.
    target.getBoundingClientRect = vi.fn().mockReturnValueOnce(null).mockReturnValue(rect(10, 20, 30, 40));
    document.body.appendChild(target);
    const onRect = vi.fn();

    await act(async () => {
      root.render(React.createElement(RectProbe, { selector: ".tracked", enabled: true, onRect }));
    });
    // First frame: getBoundingClientRect returns null — hook should skip the update (rect stays null).
    await flushAnimationFrame();
    // Second frame: getBoundingClientRect returns the real rect.
    await flushAnimationFrame();

    expect(onRect).toHaveBeenLastCalledWith({ left: 10, top: 20, width: 30, height: 40 });
  });

  it("does not crash when getBoundingClientRect returns an object with null top", async () => {
    const target = document.createElement("div");
    target.className = "tracked";
    // Simulates a DOMRect-like object where layout properties haven't committed yet.
    target.getBoundingClientRect = vi
      .fn()
      .mockReturnValueOnce({ top: null, left: null, width: null, height: null })
      .mockReturnValue(rect(5, 15, 25, 35));
    document.body.appendChild(target);
    const onRect = vi.fn();

    await act(async () => {
      root.render(React.createElement(RectProbe, { selector: ".tracked", enabled: true, onRect }));
    });
    // First frame: top is null — hook should skip the update (rect stays null).
    await flushAnimationFrame();
    // Second frame: real values — hook should update.
    await flushAnimationFrame();

    expect(onRect).toHaveBeenLastCalledWith({ left: 5, top: 15, width: 25, height: 35 });
  });

  it("resets rect to null immediately when selector changes", async () => {
    const targetA = document.createElement("div");
    targetA.className = "target-a";
    targetA.getBoundingClientRect = vi.fn(() => rect(0, 10, 50, 20));
    const targetB = document.createElement("div");
    targetB.className = "target-b";
    targetB.getBoundingClientRect = vi.fn(() => rect(0, 200, 50, 20));
    document.body.appendChild(targetA);
    document.body.appendChild(targetB);
    const onRect = vi.fn();

    await act(async () => {
      root.render(React.createElement(RectProbe, { selector: ".target-a", enabled: true, onRect }));
    });
    await flushAnimationFrame();
    expect(onRect).toHaveBeenLastCalledWith({ left: 0, top: 10, width: 50, height: 20 });

    // Switching selector — rect should immediately clear to null before the RAF fires for the new target.
    await act(async () => {
      root.render(React.createElement(RectProbe, { selector: ".target-b", enabled: true, onRect }));
    });
    expect(onRect).toHaveBeenLastCalledWith(null);

    // After a RAF, rect should update to target-b's geometry.
    await flushAnimationFrame();
    expect(onRect).toHaveBeenLastCalledWith({ left: 0, top: 200, width: 50, height: 20 });
  });

  it("skips redundant setRect calls when the DOMRect is unchanged across frames", async () => {
    // Regression guard: the old implementation used a functional updater for the
    // bail-out. React 18 concurrent mode can replay pending functional updaters
    // during a higher-priority render; if the closed-over `r` became stale/null
    // at replay time the updater would throw "Cannot read properties of null
    // (reading 'top')". The fix tracks the previous value in a ref and calls
    // setRect with a plain object — nothing is ever replayed.
    // This test verifies the bail-out: N identical frames produce exactly one
    // non-null onRect call, not N calls.
    const target = document.createElement("div");
    target.className = "stable";
    target.getBoundingClientRect = vi.fn(() => rect(0, 100, 200, 50));
    document.body.appendChild(target);
    const onRect = vi.fn();

    await act(async () => {
      root.render(React.createElement(RectProbe, { selector: ".stable", enabled: true, onRect }));
    });
    await flushAnimationFrame();
    await flushAnimationFrame();
    await flushAnimationFrame();

    // getBoundingClientRect called once per frame (3 total), but setRect only
    // fires once (first detection) because the ref bail-out suppresses duplicates.
    expect(target.getBoundingClientRect).toHaveBeenCalledTimes(3);
    const nonNullCalls = onRect.mock.calls.filter(([r]) => r !== null);
    expect(nonNullCalls.length).toBe(1);
    expect(nonNullCalls[0][0]).toEqual({ left: 0, top: 100, width: 200, height: 50 });
  });

  it("rect cycles null → value → null → value when element appears, disappears, and reappears", async () => {
    // Covers the else-branch prevRef guard: setRect(null) is only called once
    // when the element goes absent, not once per frame while it stays absent.
    const target = document.createElement("div");
    target.className = "cycling";
    target.getBoundingClientRect = vi.fn(() => rect(0, 50, 100, 100));
    const onRect = vi.fn();

    await act(async () => {
      root.render(React.createElement(RectProbe, { selector: ".cycling", enabled: true, onRect }));
    });

    // Element absent — rect stays null.
    await flushAnimationFrame();
    expect(onRect).toHaveBeenLastCalledWith(null);

    // Element appears — rect updates.
    document.body.appendChild(target);
    await flushAnimationFrame();
    expect(onRect).toHaveBeenLastCalledWith({ left: 0, top: 50, width: 100, height: 100 });

    // Element removed — rect resets to null.
    document.body.removeChild(target);
    await flushAnimationFrame();
    expect(onRect).toHaveBeenLastCalledWith(null);

    // Element re-added — rect picks back up.
    document.body.appendChild(target);
    await flushAnimationFrame();
    expect(onRect).toHaveBeenLastCalledWith({ left: 0, top: 50, width: 100, height: 100 });
  });

  it("re-reports identical geometry when selector changes to an element with the same rect", async () => {
    // Regression guard for the prevRef reset: when switching selectors, the effect
    // resets prevRef.current to null before starting the new RAF loop. Without this
    // reset, if the new element has the same bounding geometry as the old one the
    // bail-out comparison would suppress the first setRect call for the new selector,
    // leaving the component in null (from the effect's setRect(null)) indefinitely.
    const targetA = document.createElement("div");
    targetA.className = "same-geo-a";
    targetA.getBoundingClientRect = vi.fn(() => rect(0, 10, 50, 20));
    const targetB = document.createElement("div");
    targetB.className = "same-geo-b";
    targetB.getBoundingClientRect = vi.fn(() => rect(0, 10, 50, 20)); // identical geometry
    document.body.appendChild(targetA);
    document.body.appendChild(targetB);
    const onRect = vi.fn();

    await act(async () => {
      root.render(React.createElement(RectProbe, { selector: ".same-geo-a", enabled: true, onRect }));
    });
    await flushAnimationFrame();
    expect(onRect).toHaveBeenLastCalledWith({ left: 0, top: 10, width: 50, height: 20 });

    await act(async () => {
      root.render(React.createElement(RectProbe, { selector: ".same-geo-b", enabled: true, onRect }));
    });
    // Selector change triggers setRect(null) immediately.
    expect(onRect).toHaveBeenLastCalledWith(null);

    // After one frame the new selector's rect should be reported even though
    // the geometry is identical to the previous selector's rect.
    await flushAnimationFrame();
    expect(onRect).toHaveBeenLastCalledWith({ left: 0, top: 10, width: 50, height: 20 });
  });

  it("correctly re-reports rect after rapid A→B→A selector cycling", async () => {
    const targetA = document.createElement("div");
    targetA.className = "cycle-a";
    targetA.getBoundingClientRect = vi.fn(() => rect(10, 20, 100, 50));
    const targetB = document.createElement("div");
    targetB.className = "cycle-b";
    targetB.getBoundingClientRect = vi.fn(() => rect(200, 300, 80, 40));
    document.body.appendChild(targetA);
    document.body.appendChild(targetB);
    const onRect = vi.fn();

    await act(async () => {
      root.render(React.createElement(RectProbe, { selector: ".cycle-a", enabled: true, onRect }));
    });
    await flushAnimationFrame();
    expect(onRect).toHaveBeenLastCalledWith({ left: 10, top: 20, width: 100, height: 50 });

    // A → B
    await act(async () => {
      root.render(React.createElement(RectProbe, { selector: ".cycle-b", enabled: true, onRect }));
    });
    await flushAnimationFrame();
    expect(onRect).toHaveBeenLastCalledWith({ left: 200, top: 300, width: 80, height: 40 });

    // B → A
    await act(async () => {
      root.render(React.createElement(RectProbe, { selector: ".cycle-a", enabled: true, onRect }));
    });
    // Selector change immediately clears rect.
    expect(onRect).toHaveBeenLastCalledWith(null);
    // After a frame, target-a's rect is reported again (prevRef was reset on step change).
    await flushAnimationFrame();
    expect(onRect).toHaveBeenLastCalledWith({ left: 10, top: 20, width: 100, height: 50 });
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
