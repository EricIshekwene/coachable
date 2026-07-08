/**
 * Tests for the onboarding-tour event/action bus (src/context/tutorialBus.js):
 * outcome-event fan-out, unsubscribe, action registration scoping, and the
 * fail-soft behavior around throwing listeners/actions.
 */
import { describe, it, expect, vi } from "vitest";
import {
  emitTutorialEvent,
  onTutorialEvent,
  registerTutorialActions,
  runTutorialAction,
  hasTutorialAction,
} from "../../src/context/tutorialBus.js";

describe("tutorial events", () => {
  it("delivers emitted events to subscribers and stops after unsubscribe", () => {
    const seen = [];
    const off = onTutorialEvent((e) => seen.push(e));
    emitTutorialEvent("player-added", { id: "p1" });
    expect(seen).toEqual([{ type: "player-added", detail: { id: "p1" } }]);
    off();
    emitTutorialEvent("player-added", { id: "p2" });
    expect(seen).toHaveLength(1);
  });

  it("a throwing listener does not break the other listeners", () => {
    const good = vi.fn();
    const offBad = onTutorialEvent(() => { throw new Error("boom"); });
    const offGood = onTutorialEvent(good);
    emitTutorialEvent("keyframe-added", { t: 4000 });
    expect(good).toHaveBeenCalledTimes(1);
    offBad();
    offGood();
  });

  it("emitting with no listeners is a harmless no-op", () => {
    expect(() => emitTutorialEvent("anything")).not.toThrow();
  });
});

describe("tutorial actions", () => {
  it("registers, runs, and unregisters named actions", () => {
    const place = vi.fn();
    const cleanup = registerTutorialActions({ "place-player": place });
    expect(hasTutorialAction("place-player")).toBe(true);
    expect(runTutorialAction("place-player")).toBe(true);
    expect(place).toHaveBeenCalledTimes(1);
    cleanup();
    expect(hasTutorialAction("place-player")).toBe(false);
    expect(runTutorialAction("place-player")).toBe(false);
  });

  it("cleanup only removes its own registration (a newer one wins and survives)", () => {
    const first = vi.fn();
    const second = vi.fn();
    const cleanupFirst = registerTutorialActions({ act: first });
    const cleanupSecond = registerTutorialActions({ act: second });
    cleanupFirst(); // stale cleanup must not remove the newer registration
    expect(runTutorialAction("act")).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    cleanupSecond();
    expect(hasTutorialAction("act")).toBe(false);
  });

  it("a throwing action is contained and still reports as invoked", () => {
    const cleanup = registerTutorialActions({ bad: () => { throw new Error("boom"); } });
    expect(runTutorialAction("bad")).toBe(true);
    cleanup();
  });

  it("ignores non-function registrations", () => {
    const cleanup = registerTutorialActions({ nope: "not-a-function" });
    expect(hasTutorialAction("nope")).toBe(false);
    cleanup();
  });
});
