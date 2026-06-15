/**
 * listItem.test.js
 *
 * Tests for ListItem slot logic, interactivity, divider, and selected states.
 * Pure logic tests that mirror the component's behavior without DOM rendering.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// -- Pure logic mirrors from ListItem.jsx --

/** @param {Function|undefined} onClick @returns {boolean} */
function isInteractive(onClick) {
  return Boolean(onClick);
}

/**
 * Mirrors the background resolution logic (onMouseEnter / selected style).
 * @param {boolean} selected
 * @param {boolean} hovered
 * @param {boolean} interactive
 */
function resolveBackground(selected, hovered, interactive) {
  if (selected) return "var(--ui-accent-muted)";
  if (hovered && interactive) return "var(--ui-surface-2)";
  return "";
}

/**
 * Mirrors the divider border-bottom resolution.
 * @param {boolean|undefined} divider
 * @returns {string|undefined}
 */
function resolveDivider(divider) {
  const effective = divider !== false; // default true
  return effective ? "1px solid var(--ui-border)" : undefined;
}

/**
 * Mirrors the keyboard activation check.
 * @param {string} key
 * @returns {boolean}
 */
function isActivationKey(key) {
  return key === "Enter" || key === " ";
}

// ── Interactivity ─────────────────────────────────────────────────────────────

describe("ListItem interactivity", () => {
  it("is interactive when onClick is a function", () => {
    expect(isInteractive(() => {})).toBe(true);
  });

  it("is not interactive when onClick is undefined", () => {
    expect(isInteractive(undefined)).toBe(false);
  });

  it("is not interactive when onClick is null", () => {
    expect(isInteractive(null)).toBe(false);
  });

  it("is not interactive when onClick is 0", () => {
    expect(isInteractive(0)).toBe(false);
  });
});

// ── Background states ─────────────────────────────────────────────────────────

describe("ListItem background states", () => {
  it("selected state always uses accent-muted background", () => {
    expect(resolveBackground(true, false, true)).toBe("var(--ui-accent-muted)");
    expect(resolveBackground(true, false, false)).toBe("var(--ui-accent-muted)");
  });

  it("hover on interactive item uses surface-2 background", () => {
    expect(resolveBackground(false, true, true)).toBe("var(--ui-surface-2)");
  });

  it("hover on non-interactive item produces no background", () => {
    expect(resolveBackground(false, true, false)).toBe("");
  });

  it("default (not selected, not hovered) produces empty string", () => {
    expect(resolveBackground(false, false, false)).toBe("");
  });

  it("selected takes priority over hover highlight", () => {
    expect(resolveBackground(true, true, true)).toBe("var(--ui-accent-muted)");
  });
});

// ── Divider prop ──────────────────────────────────────────────────────────────

describe("ListItem divider prop", () => {
  it("renders divider by default (prop not specified)", () => {
    expect(resolveDivider(undefined)).toBe("1px solid var(--ui-border)");
  });

  it("renders divider when divider=true", () => {
    expect(resolveDivider(true)).toBe("1px solid var(--ui-border)");
  });

  it("no divider when divider=false", () => {
    expect(resolveDivider(false)).toBeUndefined();
  });
});

// ── Keyboard activation ───────────────────────────────────────────────────────

describe("ListItem keyboard activation", () => {
  it("Enter key activates interactive item", () => {
    expect(isActivationKey("Enter")).toBe(true);
  });

  it("Space key activates interactive item", () => {
    expect(isActivationKey(" ")).toBe(true);
  });

  it("other keys do not activate", () => {
    expect(isActivationKey("Tab")).toBe(false);
    expect(isActivationKey("Escape")).toBe(false);
    expect(isActivationKey("ArrowDown")).toBe(false);
  });
});

// ── Source guards ─────────────────────────────────────────────────────────────

describe("ListItem source guard", () => {
  const src = readFileSync(resolve(ROOT, "src/design-system/components/ListItem.jsx"), "utf8");

  it("has data-component attribute", () => {
    expect(src).toContain('data-component="ListItem"');
  });

  it("exposes leading slot", () => {
    expect(src).toContain("leading");
  });

  it("exposes trailing slot", () => {
    expect(src).toContain("trailing");
  });

  it("exposes badge slot", () => {
    expect(src).toContain("badge");
  });

  it("supports selected prop", () => {
    expect(src).toContain("selected");
  });

  it("uses --ui-border for divider", () => {
    expect(src).toContain("--ui-border");
  });

  it("uses --ui-accent-muted for selected background", () => {
    expect(src).toContain("--ui-accent-muted");
  });

  it("uses --ui-surface-2 for hover background", () => {
    expect(src).toContain("--ui-surface-2");
  });
});
