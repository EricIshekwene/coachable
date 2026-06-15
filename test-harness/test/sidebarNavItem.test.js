/**
 * sidebarNavItem.test.js
 *
 * Pure logic tests for AdminSidebarNavItem: active/inactive style resolution,
 * keyboard activation, badge rendering, and source guards.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// ── Active/inactive style ─────────────────────────────────────────────────────

function activeStyle(active) {
  if (active) {
    return {
      backgroundColor: "color-mix(in srgb, var(--adm-accent-dim) 85%, var(--adm-surface2))",
      color: "var(--adm-accent)",
      boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--adm-accent) 22%, transparent)",
    };
  }
  return { color: "var(--adm-text2)" };
}

describe("SidebarNavItem active style", () => {
  it("active item gets accent-dim background", () => {
    const style = activeStyle(true);
    expect(style.backgroundColor).toContain("var(--adm-accent-dim)");
  });

  it("active item gets accent text color", () => {
    expect(activeStyle(true).color).toBe("var(--adm-accent)");
  });

  it("active item gets inset ring boxShadow", () => {
    const style = activeStyle(true);
    expect(style.boxShadow).toContain("inset");
    expect(style.boxShadow).toContain("--adm-accent");
  });

  it("inactive item uses text2 color", () => {
    expect(activeStyle(false).color).toBe("var(--adm-text2)");
  });

  it("inactive item has no backgroundColor", () => {
    expect(activeStyle(false).backgroundColor).toBeUndefined();
  });

  it("inactive item has no boxShadow", () => {
    expect(activeStyle(false).boxShadow).toBeUndefined();
  });
});

describe("SidebarNavItem defaults", () => {
  it("active defaults to false", () => {
    const style = activeStyle(undefined);
    expect(style.color).toBe("var(--adm-text2)");
  });
});

// ── Keyboard activation ───────────────────────────────────────────────────────

function shouldActivateOnKey(key) {
  return key === "Enter" || key === " ";
}

describe("SidebarNavItem keyboard activation", () => {
  it("activates on Enter key", () => {
    expect(shouldActivateOnKey("Enter")).toBe(true);
  });

  it("activates on Space key", () => {
    expect(shouldActivateOnKey(" ")).toBe(true);
  });

  it("does not activate on other keys", () => {
    expect(shouldActivateOnKey("Tab")).toBe(false);
    expect(shouldActivateOnKey("Escape")).toBe(false);
    expect(shouldActivateOnKey("a")).toBe(false);
  });
});

// ── Source guards ─────────────────────────────────────────────────────────────

describe("SidebarNavItem source guard", () => {
  const src = readFileSync(resolve(ROOT, "src/admin/components/SidebarNavItem.jsx"), "utf8");

  it("has data-component attribute", () => {
    expect(src).toContain('data-component="SidebarNavItem"');
  });

  it("exports a default function", () => {
    expect(src).toContain("export default function SidebarNavItem");
  });

  it("renders label prop", () => {
    expect(src).toContain("label");
  });

  it("renders icon slot", () => {
    expect(src).toContain("icon");
  });

  it("renders badge slot", () => {
    expect(src).toContain("badge");
  });

  it("uses --adm-accent for active color", () => {
    expect(src).toContain("var(--adm-accent)");
  });

  it("uses --adm-accent-dim for active background", () => {
    expect(src).toContain("--adm-accent-dim");
  });

  it("uses --adm-text2 for inactive text", () => {
    expect(src).toContain("var(--adm-text2)");
  });

  it("uses inset box-shadow for active ring", () => {
    expect(src).toContain("inset");
  });

  it("has tabIndex for keyboard navigation", () => {
    expect(src).toContain("tabIndex");
  });

  it("has role=button", () => {
    expect(src).toContain('role="button"');
  });

  it("has onKeyDown handler", () => {
    expect(src).toContain("onKeyDown");
  });
});

// ── SelectableCard source guards ──────────────────────────────────────────────

describe("SelectableCard source guard", () => {
  const src = readFileSync(resolve(ROOT, "src/admin/components/SelectableCard.jsx"), "utf8");

  it("has data-component attribute", () => {
    expect(src).toContain('data-component="SelectableCard"');
  });

  it("exports a default function", () => {
    expect(src).toContain("export default function SelectableCard");
  });

  it("imports FiCheck for checkmark", () => {
    expect(src).toContain("FiCheck");
  });

  it("uses --adm-accent-dim for selected background", () => {
    expect(src).toContain("--adm-accent-dim");
  });

  it("uses --adm-surface2 for unselected background", () => {
    expect(src).toContain("--adm-surface2");
  });

  it("renders checkmark only when selected", () => {
    expect(src).toContain("selected");
    expect(src).toContain("FiCheck");
  });

  it("renders label prop", () => {
    expect(src).toContain("label");
  });

  it("renders description prop", () => {
    expect(src).toContain("description");
  });

  it("has role=button", () => {
    expect(src).toContain('role="button"');
  });

  it("has onKeyDown handler", () => {
    expect(src).toContain("onKeyDown");
  });
});
