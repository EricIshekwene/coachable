/**
 * adminPagination.test.js
 *
 * Tests for the pure getPaginationRange helper behind AdminPagination: short
 * ranges render every page, long ranges collapse with ellipses, the first and
 * last pages always show, and inputs are clamped.
 */

import { describe, it, expect } from "vitest";
import { getPaginationRange } from "../../src/admin/components/paginationRange.js";

describe("getPaginationRange", () => {
  it("returns an empty list for zero or negative page counts", () => {
    expect(getPaginationRange(1, 0)).toEqual([]);
    expect(getPaginationRange(1, -5)).toEqual([]);
  });

  it("lists every page when the count fits without ellipses", () => {
    expect(getPaginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPaginationRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses the right side near the start", () => {
    const range = getPaginationRange(2, 24, 1);
    expect(range[0]).toBe(1);
    expect(range[range.length - 1]).toBe(24);
    expect(range).toContain("…");
    expect(range.filter((x) => x === "…")).toHaveLength(1);
  });

  it("collapses the left side near the end", () => {
    const range = getPaginationRange(24, 24, 1);
    expect(range[0]).toBe(1);
    expect(range[range.length - 1]).toBe(24);
    expect(range.filter((x) => x === "…")).toHaveLength(1);
    expect(range).toContain(23);
  });

  it("collapses both sides in the middle with two ellipses", () => {
    const range = getPaginationRange(12, 24, 1);
    expect(range[0]).toBe(1);
    expect(range[range.length - 1]).toBe(24);
    expect(range.filter((x) => x === "…")).toHaveLength(2);
    expect(range).toContain(11);
    expect(range).toContain(12);
    expect(range).toContain(13);
  });

  it("always includes the current page", () => {
    for (const page of [1, 5, 10, 18, 24]) {
      expect(getPaginationRange(page, 24, 1)).toContain(page);
    }
  });

  it("clamps an out-of-bounds current page", () => {
    expect(getPaginationRange(0, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPaginationRange(99, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("respects a wider siblingCount", () => {
    const range = getPaginationRange(12, 40, 2);
    expect(range).toContain(10);
    expect(range).toContain(11);
    expect(range).toContain(12);
    expect(range).toContain(13);
    expect(range).toContain(14);
  });
});
