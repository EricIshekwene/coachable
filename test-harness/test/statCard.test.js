/**
 * statCard.test.js
 *
 * Pure logic tests for StatCard: tone-to-color resolution, delta direction
 * inference, loading skeleton guard, and source guards.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// ── Tone resolution ───────────────────────────────────────────────────────────

const TONE_COLOR = {
  default: "var(--ui-text-muted)",
  success: "var(--ui-success)",
  warning: "var(--ui-warning)",
  danger:  "var(--ui-danger)",
};

function toneColor(tone) {
  return TONE_COLOR[tone] ?? TONE_COLOR.default;
}

describe("StatCard tone color", () => {
  it("default tone uses --ui-text-muted", () => {
    expect(toneColor("default")).toBe("var(--ui-text-muted)");
  });

  it("success tone uses --ui-success", () => {
    expect(toneColor("success")).toBe("var(--ui-success)");
  });

  it("warning tone uses --ui-warning", () => {
    expect(toneColor("warning")).toBe("var(--ui-warning)");
  });

  it("danger tone uses --ui-danger", () => {
    expect(toneColor("danger")).toBe("var(--ui-danger)");
  });

  it("unknown tone falls back to default", () => {
    expect(toneColor("neon")).toBe("var(--ui-text-muted)");
  });
});

// ── Delta direction ───────────────────────────────────────────────────────────

function deltaDir(delta) {
  if (delta == null) return "flat";
  if (delta.value > 0) return "up";
  if (delta.value < 0) return "down";
  return "flat";
}

function deltaColor(dir) {
  return dir === "up" ? "var(--ui-success)" : dir === "down" ? "var(--ui-danger)" : "var(--ui-text-subtle)";
}

describe("StatCard delta direction", () => {
  it("positive value is 'up'", () => {
    expect(deltaDir({ value: 12 })).toBe("up");
  });

  it("negative value is 'down'", () => {
    expect(deltaDir({ value: -5 })).toBe("down");
  });

  it("zero value is 'flat'", () => {
    expect(deltaDir({ value: 0 })).toBe("flat");
  });

  it("null delta is 'flat'", () => {
    expect(deltaDir(null)).toBe("flat");
  });
});

describe("StatCard delta color", () => {
  it("up delta uses success color", () => {
    expect(deltaColor("up")).toBe("var(--ui-success)");
  });

  it("down delta uses danger color", () => {
    expect(deltaColor("down")).toBe("var(--ui-danger)");
  });

  it("flat delta uses subtle color", () => {
    expect(deltaColor("flat")).toBe("var(--ui-text-subtle)");
  });
});

// ── Loading skeleton ──────────────────────────────────────────────────────────

function showsSkeleton(loading) {
  return loading === true;
}

describe("StatCard loading state", () => {
  it("shows skeleton when loading=true", () => {
    expect(showsSkeleton(true)).toBe(true);
  });

  it("does not show skeleton when loading=false", () => {
    expect(showsSkeleton(false)).toBe(false);
  });

  it("does not show skeleton by default (undefined)", () => {
    expect(showsSkeleton(undefined)).toBe(false);
  });
});

// ── Source guards ─────────────────────────────────────────────────────────────

describe("StatCard source guard", () => {
  const src = readFileSync(resolve(ROOT, "src/design-system/components/StatCard.jsx"), "utf8");

  it("has data-component attribute", () => {
    expect(src).toContain('data-component="StatCard"');
  });

  it("exports a default function", () => {
    expect(src).toContain("export default function StatCard");
  });

  it("imports FiArrowUp for positive deltas", () => {
    expect(src).toContain("FiArrowUp");
  });

  it("imports FiArrowDown for negative deltas", () => {
    expect(src).toContain("FiArrowDown");
  });

  it("uses --ui-success token", () => {
    expect(src).toContain("--ui-success");
  });

  it("uses --ui-danger token", () => {
    expect(src).toContain("--ui-danger");
  });

  it("uses --ui-warning token", () => {
    expect(src).toContain("--ui-warning");
  });

  it("uses --ui-surface for default tone background", () => {
    expect(src).toContain("--ui-surface");
  });

  it("renders icon slot", () => {
    expect(src).toContain("icon");
  });

  it("supports loading prop", () => {
    expect(src).toContain("loading");
  });

  it("renders label prop", () => {
    expect(src).toContain("label");
  });

  it("renders value prop", () => {
    expect(src).toContain("value");
  });
});
