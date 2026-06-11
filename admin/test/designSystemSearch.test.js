/**
 * designSystemSearch.test.js
 *
 * Tests for the pure ranking helper behind the design-system search box and
 * ⌘K command palette. Validates blank-query handling, label/keyword/summary
 * matching, relevance ordering, the result limit, and that every result keys
 * back to a real section. Runs in a plain Node environment (no React).
 */

import { describe, it, expect } from "vitest";
import { searchDesignSystem } from "../../src/pages/designSystem/designSystemSearch.js";
import { ALL_SECTIONS } from "../../src/pages/designSystem/designSystemNav.js";

describe("searchDesignSystem", () => {
  it("returns nothing for a blank or whitespace query", () => {
    expect(searchDesignSystem("")).toEqual([]);
    expect(searchDesignSystem("   ")).toEqual([]);
    expect(searchDesignSystem(null)).toEqual([]);
  });

  it("ranks an exact label match first", () => {
    const results = searchDesignSystem("color");
    expect(results[0].id).toBe("color");
  });

  it("matches on keyword tags, not just labels", () => {
    // "toast" is only a keyword of the feedback section, not its label.
    const ids = searchDesignSystem("toast").map((r) => r.id);
    expect(ids).toContain("feedback");
  });

  it("finds the command palette via the 'cmd k' keyword", () => {
    const ids = searchDesignSystem("cmd k").map((r) => r.id);
    expect(ids).toContain("search");
  });

  it("is case- and punctuation-insensitive", () => {
    const a = searchDesignSystem("Dark-Mode")[0]?.id;
    const b = searchDesignSystem("dark mode")[0]?.id;
    expect(a).toBe("dark-mode");
    expect(b).toBe("dark-mode");
  });

  it("respects the result limit", () => {
    // A broad term that hits many sections.
    const results = searchDesignSystem("state", { limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("returns descending scores", () => {
    const results = searchDesignSystem("button");
    for (let i = 1; i < results.length; i += 1) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("only returns ids that map to real sections", () => {
    const valid = new Set(ALL_SECTIONS.map((s) => s.id));
    for (const r of searchDesignSystem("form")) {
      expect(valid.has(r.id)).toBe(true);
    }
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchDesignSystem("zzzzznotathing")).toEqual([]);
  });
});
