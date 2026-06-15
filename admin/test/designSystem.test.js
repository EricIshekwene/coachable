/**
 * designSystem.test.js
 *
 * Tests for the multi-page design system navigation registry. These validate
 * the pure metadata module (designSystemNav.js) — slug integrity, the default
 * section, prev/next adjacency — without importing the heavy section component
 * tree, so the suite runs in a plain Node environment.
 */

import { describe, it, expect } from "vitest";
import {
  DESIGN_SYSTEM_NAV,
  ALL_SECTIONS,
  DEFAULT_SECTION_ID,
  getSection,
  getAdjacentSections,
} from "../../src/admin/designSystem/designSystemNav.js";

describe("design system nav registry", () => {
  it("exposes grouped sections", () => {
    expect(Array.isArray(DESIGN_SYSTEM_NAV)).toBe(true);
    expect(DESIGN_SYSTEM_NAV.length).toBeGreaterThanOrEqual(6);
    for (const group of DESIGN_SYSTEM_NAV) {
      expect(typeof group.group).toBe("string");
      expect(group.group.length).toBeGreaterThan(0);
      expect(Array.isArray(group.sections)).toBe(true);
      expect(group.sections.length).toBeGreaterThan(0);
    }
  });

  it("flattens every grouped section into ALL_SECTIONS", () => {
    const grouped = DESIGN_SYSTEM_NAV.reduce((sum, g) => sum + g.sections.length, 0);
    expect(ALL_SECTIONS.length).toBe(grouped);
    expect(ALL_SECTIONS.length).toBeGreaterThanOrEqual(30);
  });

  it("gives every section a unique, url-safe slug", () => {
    const ids = ALL_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("gives every section a label and summary", () => {
    for (const section of ALL_SECTIONS) {
      expect(section.label.trim().length).toBeGreaterThan(0);
      expect(section.summary.trim().length).toBeGreaterThan(0);
    }
  });

  it("includes the default section", () => {
    expect(ALL_SECTIONS.some((s) => s.id === DEFAULT_SECTION_ID)).toBe(true);
  });
});

describe("getSection", () => {
  it("resolves a known id", () => {
    expect(getSection("color").id).toBe("color");
  });

  it("falls back to the first section for unknown / missing ids", () => {
    expect(getSection("does-not-exist").id).toBe(ALL_SECTIONS[0].id);
    expect(getSection(undefined).id).toBe(ALL_SECTIONS[0].id);
  });
});

describe("getAdjacentSections", () => {
  it("has no previous for the first section", () => {
    const { prev, next } = getAdjacentSections(ALL_SECTIONS[0].id);
    expect(prev).toBeNull();
    expect(next?.id).toBe(ALL_SECTIONS[1].id);
  });

  it("has no next for the last section", () => {
    const last = ALL_SECTIONS[ALL_SECTIONS.length - 1];
    const { prev, next } = getAdjacentSections(last.id);
    expect(next).toBeNull();
    expect(prev?.id).toBe(ALL_SECTIONS[ALL_SECTIONS.length - 2].id);
  });

  it("links a middle section to both neighbors", () => {
    const middleIndex = Math.floor(ALL_SECTIONS.length / 2);
    const middle = ALL_SECTIONS[middleIndex];
    const { prev, next } = getAdjacentSections(middle.id);
    expect(prev?.id).toBe(ALL_SECTIONS[middleIndex - 1].id);
    expect(next?.id).toBe(ALL_SECTIONS[middleIndex + 1].id);
  });

  it("returns nulls for an unknown id", () => {
    expect(getAdjacentSections("nope")).toEqual({ prev: null, next: null });
  });
});
