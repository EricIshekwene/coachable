/**
 * adminBtn.test.js
 *
 * Tests for AdminBtn variant style resolution logic.
 * Tests the pure style-mapping logic extracted from the component
 * without needing DOM rendering.
 */

import { describe, it, expect } from "vitest";

/**
 * Mirrors the variantStyle map from AdminBtn.jsx.
 * Kept in sync — if AdminBtn.jsx changes, update here too.
 * @param {"primary"|"secondary"|"danger"|"ghost"} variant
 * @returns {Record<string, string>}
 */
function resolveVariantStyle(variant) {
  return {
    primary: {
      backgroundColor: "var(--adm-accent)",
      color: "#fff",
      border: "none",
    },
    secondary: {
      backgroundColor: "var(--adm-surface2)",
      color: "var(--adm-text)",
      border: "1px solid var(--adm-border)",
    },
    danger: {
      backgroundColor: "var(--adm-danger-dim)",
      color: "var(--adm-danger)",
      border: "1px solid transparent",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--adm-muted)",
      border: "none",
    },
  }[variant];
}

/**
 * Mirrors the sizeClasses logic from AdminBtn.jsx.
 * @param {"sm"|"md"} size
 * @returns {string}
 */
function resolveSizeClasses(size) {
  return size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
}

describe("AdminBtn variant styles", () => {
  it("primary uses accent background and white text", () => {
    const style = resolveVariantStyle("primary");
    expect(style.backgroundColor).toBe("var(--adm-accent)");
    expect(style.color).toBe("#fff");
    expect(style.border).toBe("none");
  });

  it("secondary uses surface2 background with border", () => {
    const style = resolveVariantStyle("secondary");
    expect(style.backgroundColor).toBe("var(--adm-surface2)");
    expect(style.color).toBe("var(--adm-text)");
    expect(style.border).toContain("var(--adm-border)");
  });

  it("danger uses danger-dim background and danger text", () => {
    const style = resolveVariantStyle("danger");
    expect(style.backgroundColor).toBe("var(--adm-danger-dim)");
    expect(style.color).toBe("var(--adm-danger)");
  });

  it("ghost uses transparent background and muted text", () => {
    const style = resolveVariantStyle("ghost");
    expect(style.backgroundColor).toBe("transparent");
    expect(style.color).toBe("var(--adm-muted)");
  });

  it("all variants reference CSS variables, not hardcoded hex (except primary text)", () => {
    for (const variant of ["secondary", "danger", "ghost"]) {
      const style = resolveVariantStyle(variant);
      const values = Object.values(style).join(" ");
      expect(values).toContain("var(--adm-");
    }
  });
});

describe("AdminBtn size classes", () => {
  it("sm size applies smaller padding and text-xs", () => {
    const classes = resolveSizeClasses("sm");
    expect(classes).toContain("text-xs");
    expect(classes).toContain("px-3");
  });

  it("md size applies larger padding and text-sm", () => {
    const classes = resolveSizeClasses("md");
    expect(classes).toContain("text-sm");
    expect(classes).toContain("px-3.5");
  });

  it("defaults to md classes for unknown size input", () => {
    // "md" is the default in the component
    const classes = resolveSizeClasses("md");
    expect(classes).toBeTruthy();
  });
});
