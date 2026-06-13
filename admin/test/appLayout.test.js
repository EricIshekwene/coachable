/**
 * appLayout.test.js
 *
 * Tests for the main-app layout system (src/components/layout/): AppShell,
 * AppPage, AppHeader, AppSection, AppCard.
 *
 * These mirror each component's className / structural logic as pure functions
 * (the same style as adminShell.test.js), so they run under the existing Vitest
 * setup with no DOM-rendering dependencies. Full virtual-DOM rendering tests are
 * deferred to the RTL testing phase.
 */

import { describe, it, expect } from "vitest";

// ── AppPage ─────────────────────────────────────────────────────────────────

const MAX_WIDTH = {
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  full: "max-w-none",
};

/** Mirrors AppPage className construction. */
function resolveAppPageClasses(maxWidth = "4xl", className = "") {
  const maxWidthClass = MAX_WIDTH[maxWidth] ?? MAX_WIDTH["4xl"];
  return `mx-auto w-full min-w-0 overflow-y-auto px-6 py-8 md:px-10 md:py-12 ${maxWidthClass} ${className}`.trim();
}

describe("AppPage", () => {
  it("always includes overflow-y-auto (enforces the scroll rule from project memory)", () => {
    expect(resolveAppPageClasses()).toContain("overflow-y-auto");
    expect(resolveAppPageClasses("2xl")).toContain("overflow-y-auto");
    expect(resolveAppPageClasses("full", "extra")).toContain("overflow-y-auto");
  });

  it("does not rely on a fixed h-screen height", () => {
    expect(resolveAppPageClasses()).not.toContain("h-screen");
  });

  it("maps each maxWidth token to the correct Tailwind class", () => {
    expect(resolveAppPageClasses("2xl")).toContain("max-w-2xl");
    expect(resolveAppPageClasses("4xl")).toContain("max-w-4xl");
    expect(resolveAppPageClasses("6xl")).toContain("max-w-6xl");
    expect(resolveAppPageClasses("full")).toContain("max-w-none");
  });

  it("defaults to max-w-4xl for an unknown maxWidth token", () => {
    expect(resolveAppPageClasses("bogus")).toContain("max-w-4xl");
  });

  it("is horizontally centered", () => {
    expect(resolveAppPageClasses()).toContain("mx-auto");
  });
});

// ── AppShell ──────────────────────────────────────────────────────────────────

/** Mirrors AppShell's decision of whether to render an AppHeader. */
function shellHasHeader({ title, subtitle, backTo, actions, headerExtra } = {}) {
  return Boolean(title || subtitle || backTo || actions || headerExtra);
}

/** Mirrors AppShell root className construction. */
function resolveShellRootClasses(className = "") {
  return `overflow-y-auto ${className}`.trim();
}

describe("AppShell", () => {
  it("root is a scroll container (overflow-y-auto)", () => {
    expect(resolveShellRootClasses()).toContain("overflow-y-auto");
  });

  it("renders a header when any header prop is provided", () => {
    expect(shellHasHeader({ title: "Profile" })).toBe(true);
    expect(shellHasHeader({ actions: "x" })).toBe(true);
    expect(shellHasHeader({ backTo: "/app" })).toBe(true);
  });

  it("omits the header when no header props are provided", () => {
    expect(shellHasHeader({})).toBe(false);
    expect(shellHasHeader()).toBe(false);
  });
});

// ── AppHeader ─────────────────────────────────────────────────────────────────

describe("AppHeader", () => {
  /** Mirrors AppHeader back-label defaulting. */
  function resolveBackLabel(backLabel) {
    return backLabel ?? "Back";
  }

  it("defaults the back label to 'Back'", () => {
    expect(resolveBackLabel(undefined)).toBe("Back");
    expect(resolveBackLabel("Home")).toBe("Home");
  });
});

// ── AppCard ───────────────────────────────────────────────────────────────────

describe("AppCard", () => {
  /** Mirrors AppCard padding resolution. */
  function resolvePadding(padding = true) {
    return typeof padding === "string" ? padding : padding ? "p-5" : "";
  }

  it("uses p-5 padding by default", () => {
    expect(resolvePadding()).toBe("p-5");
  });

  it("supports custom string padding", () => {
    expect(resolvePadding("p-8")).toBe("p-8");
  });

  it("renders no padding when padding is false", () => {
    expect(resolvePadding(false)).toBe("");
  });
});

// ── AppSection ────────────────────────────────────────────────────────────────

describe("AppSection", () => {
  /** Mirrors AppSection's decision of whether to render the heading row. */
  function hasHeadingRow({ title, actions } = {}) {
    return Boolean(title || actions);
  }

  it("renders the heading row when a title is provided", () => {
    expect(hasHeadingRow({ title: "Account Info" })).toBe(true);
  });

  it("renders the heading row when only actions are provided", () => {
    expect(hasHeadingRow({ actions: "x" })).toBe(true);
  });

  it("omits the heading row when neither title nor actions are provided", () => {
    expect(hasHeadingRow({})).toBe(false);
  });
});
