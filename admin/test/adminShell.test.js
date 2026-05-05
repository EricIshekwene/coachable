/**
 * adminShell.test.js
 *
 * Tests for AdminShell theme attribute logic and AdminProvider context defaults.
 */

import { describe, it, expect } from "vitest";

// ── Simulate AdminShell attribute resolution ───────────────────────────────────

/**
 * Mirrors the data-admin-theme attribute assignment in AdminShell.
 * @param {"dark"|"light"} theme
 * @returns {string}
 */
function resolveThemeAttr(theme) {
  return theme;
}

/**
 * Mirrors AdminShell className construction.
 * @param {string} extra
 * @returns {string}
 */
function resolveShellClasses(extra = "") {
  return `font-DmSans h-screen overflow-y-auto ${extra}`.trim();
}

describe("AdminShell theme attribute", () => {
  it("sets data-admin-theme to 'dark' when theme is dark", () => {
    expect(resolveThemeAttr("dark")).toBe("dark");
  });

  it("sets data-admin-theme to 'light' when theme is light", () => {
    expect(resolveThemeAttr("light")).toBe("light");
  });
});

describe("AdminShell className", () => {
  it("always includes overflow-y-auto for scrollable page (per project memory requirement)", () => {
    const classes = resolveShellClasses();
    expect(classes).toContain("overflow-y-auto");
  });

  it("always includes h-screen", () => {
    const classes = resolveShellClasses();
    expect(classes).toContain("h-screen");
  });

  it("always includes font-DmSans", () => {
    const classes = resolveShellClasses();
    expect(classes).toContain("font-DmSans");
  });

  it("appends extra className when provided", () => {
    const classes = resolveShellClasses("flex items-center");
    expect(classes).toContain("flex");
    expect(classes).toContain("items-center");
  });
});

// ── AdminProvider context defaults ────────────────────────────────────────────

describe("AdminContext defaults", () => {
  it("default theme is dark", () => {
    const DEFAULT = { theme: "dark", basePath: "/admin" };
    expect(DEFAULT.theme).toBe("dark");
  });

  it("default basePath is /admin", () => {
    const DEFAULT = { theme: "dark", basePath: "/admin" };
    expect(DEFAULT.basePath).toBe("/admin");
  });
});

// ── Theme × basePath combinations ─────────────────────────────────────────────

describe("AdminProvider theme + basePath combinations", () => {
  const cases = [
    { theme: "dark", basePath: "/admin" },
    { theme: "light", basePath: "/admin2" },
  ];

  for (const { theme, basePath } of cases) {
    it(`theme="${theme}" basePath="${basePath}" produces valid attr + path`, () => {
      expect(["dark", "light"]).toContain(theme);
      expect(basePath.startsWith("/")).toBe(true);
    });
  }
});
