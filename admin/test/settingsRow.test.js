/**
 * settingsRow.test.js
 *
 * Tests for SettingsRow, DangerZone, SearchInput, FilterBar, and BulkBar
 * logic — source guards and pure prop/style resolution.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// -- SettingsRow logic --

function settingsRowBorderTop(divider) {
  return divider !== false ? "1px solid var(--ui-border)" : undefined;
}

function settingsRowLabelColor(danger) {
  return danger ? "var(--ui-danger)" : "var(--ui-text)";
}

// -- BulkBar logic --

function bulkBarVisible(visible) {
  return visible !== false; // default true
}

// -- SearchInput clear visibility --

function searchClearVisible(onClear, value) {
  return Boolean(onClear) && Boolean(value);
}

// ── SettingsRow ───────────────────────────────────────────────────────────────

describe("SettingsRow divider", () => {
  it("shows border-top by default", () => {
    expect(settingsRowBorderTop(undefined)).toBe("1px solid var(--ui-border)");
    expect(settingsRowBorderTop(true)).toBe("1px solid var(--ui-border)");
  });

  it("hides border-top when divider=false", () => {
    expect(settingsRowBorderTop(false)).toBeUndefined();
  });
});

describe("SettingsRow label color", () => {
  it("uses --ui-text for normal rows", () => {
    expect(settingsRowLabelColor(false)).toBe("var(--ui-text)");
    expect(settingsRowLabelColor(undefined)).toBe("var(--ui-text)");
  });

  it("uses --ui-danger for danger rows", () => {
    expect(settingsRowLabelColor(true)).toBe("var(--ui-danger)");
  });
});

describe("SettingsRow source guard", () => {
  const src = readFileSync(resolve(ROOT, "src/design-system/components/SettingsRow.jsx"), "utf8");

  it("has data-component attribute", () => {
    expect(src).toContain('data-component="SettingsRow"');
  });

  it("renders a control slot", () => {
    expect(src).toContain("control");
  });

  it("uses --ui-text for label color", () => {
    expect(src).toContain("--ui-text");
  });

  it("uses --ui-danger for danger tint", () => {
    expect(src).toContain("--ui-danger");
  });
});

// ── DangerZone ────────────────────────────────────────────────────────────────

describe("DangerZone source guard", () => {
  const src = readFileSync(resolve(ROOT, "src/design-system/components/DangerZone.jsx"), "utf8");

  it("has data-component attribute", () => {
    expect(src).toContain('data-component="DangerZone"');
  });

  it("uses --ui-danger for border and title", () => {
    expect(src).toContain("--ui-danger");
  });

  it("renders children slot", () => {
    expect(src).toContain("children");
  });

  it("renders title prop", () => {
    expect(src).toContain("title");
  });

  it("renders description prop", () => {
    expect(src).toContain("description");
  });
});

// ── SearchInput ───────────────────────────────────────────────────────────────

describe("SearchInput clear button visibility", () => {
  it("shows clear button when onClear provided and value is non-empty", () => {
    expect(searchClearVisible(() => {}, "hello")).toBe(true);
  });

  it("hides clear button when value is empty", () => {
    expect(searchClearVisible(() => {}, "")).toBe(false);
  });

  it("hides clear button when onClear is not provided", () => {
    expect(searchClearVisible(undefined, "hello")).toBe(false);
  });

  it("hides clear button when both are missing", () => {
    expect(searchClearVisible(undefined, "")).toBe(false);
  });
});

describe("SearchInput source guard", () => {
  const src = readFileSync(resolve(ROOT, "src/design-system/components/SearchInput.jsx"), "utf8");

  it("has data-component attribute", () => {
    expect(src).toContain('data-component="SearchInput"');
  });

  it("uses FiSearch icon", () => {
    expect(src).toContain("FiSearch");
  });

  it("uses FiX icon for clear button", () => {
    expect(src).toContain("FiX");
  });

  it("uses --ui-surface-2 for background", () => {
    expect(src).toContain("--ui-surface-2");
  });

  it("uses --ui-border for border color", () => {
    expect(src).toContain("--ui-border");
  });

  it("accepts onClear prop", () => {
    expect(src).toContain("onClear");
  });
});

// ── FilterBar ─────────────────────────────────────────────────────────────────

describe("FilterBar source guard", () => {
  const src = readFileSync(resolve(ROOT, "src/design-system/components/FilterBar.jsx"), "utf8");

  it("has data-component attribute", () => {
    expect(src).toContain('data-component="FilterBar"');
  });

  it("imports SearchInput", () => {
    expect(src).toContain("SearchInput");
  });

  it("renders chips slot", () => {
    expect(src).toContain("chips");
  });

  it("renders actions slot", () => {
    expect(src).toContain("actions");
  });
});

// ── BulkBar ───────────────────────────────────────────────────────────────────

describe("BulkBar visible prop", () => {
  it("is visible by default", () => {
    expect(bulkBarVisible(undefined)).toBe(true);
    expect(bulkBarVisible(true)).toBe(true);
  });

  it("is hidden when visible=false", () => {
    expect(bulkBarVisible(false)).toBe(false);
  });
});

describe("BulkBar source guard", () => {
  const src = readFileSync(resolve(ROOT, "src/design-system/components/BulkBar.jsx"), "utf8");

  it("has data-component attribute", () => {
    expect(src).toContain('data-component="BulkBar"');
  });

  it("renders count prop", () => {
    expect(src).toContain("count");
  });

  it("renders actions slot", () => {
    expect(src).toContain("actions");
  });

  it("uses --ui-accent for count text", () => {
    expect(src).toContain("--ui-accent");
  });

  it("uses --ui-accent-muted for background", () => {
    expect(src).toContain("--ui-accent-muted");
  });
});
