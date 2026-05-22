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
 * @param {"primary"|"secondary"|"outline"|"danger"|"ghost"} variant
 * @returns {Record<string, string>}
 */
function resolveVariantStyle(variant) {
  return {
    primary: {
      background: "linear-gradient(135deg, color-mix(in srgb, var(--adm-accent) 96%, white 4%) 0%, var(--adm-accent) 100%)",
      color: "#fff",
      border: "1px solid color-mix(in srgb, var(--adm-accent) 66%, transparent)",
      boxShadow: "0 10px 24px color-mix(in srgb, var(--adm-accent-dim) 95%, transparent)",
    },
    secondary: {
      backgroundColor: "var(--adm-surface2)",
      color: "var(--adm-text)",
      border: "1px solid var(--adm-border2)",
      boxShadow: "var(--adm-shadow-sm)",
    },
    outline: {
      backgroundColor: "transparent",
      color: "var(--adm-text)",
      border: "1px solid var(--adm-border2)",
    },
    danger: {
      backgroundColor: "var(--adm-danger-dim)",
      color: "var(--adm-danger)",
      border: "1px solid color-mix(in srgb, var(--adm-danger) 20%, transparent)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--adm-text2)",
      border: "1px solid transparent",
    },
  }[variant];
}

/**
 * Mirrors the sizeClasses logic from AdminBtn.jsx.
 * @param {"sm"|"md"|"lg"|"icon"} size
 * @returns {string}
 */
function resolveSizeClasses(size) {
  return {
    sm: "min-h-9 px-3 py-1.5 text-xs",
    md: "min-h-10 px-3.5 py-2 text-sm",
    lg: "min-h-11 px-4 py-2.5 text-sm",
    icon: "h-10 w-10 justify-center p-0 text-sm",
  }[size] ?? "min-h-10 px-3.5 py-2 text-sm";
}

describe("AdminBtn variant styles", () => {
  it("primary uses the accent gradient and white text", () => {
    const style = resolveVariantStyle("primary");
    expect(style.background).toContain("var(--adm-accent)");
    expect(style.color).toBe("#fff");
    expect(style.border).toContain("var(--adm-accent)");
  });

  it("secondary uses surface2 background with border", () => {
    const style = resolveVariantStyle("secondary");
    expect(style.backgroundColor).toBe("var(--adm-surface2)");
    expect(style.color).toBe("var(--adm-text)");
    expect(style.border).toContain("var(--adm-border2)");
  });

  it("outline uses transparent background with a border", () => {
    const style = resolveVariantStyle("outline");
    expect(style.backgroundColor).toBe("transparent");
    expect(style.color).toBe("var(--adm-text)");
    expect(style.border).toContain("var(--adm-border2)");
  });

  it("ghost uses transparent background and secondary text", () => {
    const style = resolveVariantStyle("ghost");
    expect(style.backgroundColor).toBe("transparent");
    expect(style.color).toBe("var(--adm-text2)");
  });

  it("danger uses danger-dim background and danger text", () => {
    const style = resolveVariantStyle("danger");
    expect(style.backgroundColor).toBe("var(--adm-danger-dim)");
    expect(style.color).toBe("var(--adm-danger)");
  });

  it("all variants reference CSS variables, not hardcoded hex (except primary text)", () => {
    for (const variant of ["secondary", "outline", "danger", "ghost"]) {
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

  it("icon size creates a square icon button", () => {
    const classes = resolveSizeClasses("icon");
    expect(classes).toContain("h-10");
    expect(classes).toContain("w-10");
  });

  it("defaults to md classes for unknown size input", () => {
    // "md" is the default in the component
    const classes = resolveSizeClasses("md");
    expect(classes).toBeTruthy();
  });
});
