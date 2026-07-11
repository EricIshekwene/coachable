/**
 * printLayout.test.js — Multi-Play Printing (see docs/printing.md)
 *
 * Tests cover:
 *   - PRINT_LAYOUTS / DEFAULT_PER_PAGE layout config (2/4/6-up, 4 default)
 *   - getPrintLayout exact match + fallback-to-default behavior
 *   - PRINT_STYLES / DEFAULT_STYLE_ID sheet-style config, getPrintStyle
 *     fallback, and getPlayNumber cross-page numbering
 *   - paginatePlays chunking: order, page counts, remainders, bad input
 *   - canShowPrintAction gating (coach-only + 'printing' entitlement,
 *     fails closed on missing/undefined input)
 *   - Entitlement wiring guard: the 'printing' feature key must exist in the
 *     DB CHECK constraint, both server SUITE_FEATURES lists, the admin
 *     toggle page, and the Plays.jsx bulk-bar gate (static file reads, same
 *     pattern as designTokenUnification.test.js)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  PRINT_LAYOUTS,
  PRINT_STYLES,
  DEFAULT_PER_PAGE,
  DEFAULT_STYLE_ID,
  getPrintLayout,
  getPrintStyle,
  getPlayNumber,
  paginatePlays,
  canShowPrintAction,
} from "../../../src/components/printing/printLayout.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..", "..");

/** Build n fake plays with stable ids so ordering is checkable. */
function makePlays(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `play-${i}`, title: `Play ${i}` }));
}

// ── Layout config ─────────────────────────────────────────────────────────────

describe("PRINT_LAYOUTS", () => {
  it("offers exactly the three PRD layouts: 2, 4, and 6 per page", () => {
    expect(PRINT_LAYOUTS.map((l) => l.perPage)).toEqual([2, 4, 6]);
  });

  it("uses a single column for 2-up and two columns for 4-up and 6-up", () => {
    const byPerPage = Object.fromEntries(PRINT_LAYOUTS.map((l) => [l.perPage, l.columns]));
    expect(byPerPage[2]).toBe(1);
    expect(byPerPage[4]).toBe(2);
    expect(byPerPage[6]).toBe(2);
  });

  it("gives every layout a human-readable label", () => {
    for (const layout of PRINT_LAYOUTS) {
      expect(layout.label).toMatch(/per page/);
    }
  });

  it("defaults to 4 per page, and the default exists in PRINT_LAYOUTS", () => {
    expect(DEFAULT_PER_PAGE).toBe(4);
    expect(PRINT_LAYOUTS.some((l) => l.perPage === DEFAULT_PER_PAGE)).toBe(true);
  });
});

describe("getPrintLayout", () => {
  it("returns the matching layout for each valid perPage", () => {
    for (const layout of PRINT_LAYOUTS) {
      expect(getPrintLayout(layout.perPage)).toBe(layout);
    }
  });

  it.each([0, 1, 3, 5, 7, -4, null, undefined, NaN, "4"])(
    "falls back to the 4-up default for invalid perPage %j",
    (bad) => {
      expect(getPrintLayout(bad).perPage).toBe(DEFAULT_PER_PAGE);
    }
  );
});

// ── Sheet styles ──────────────────────────────────────────────────────────────

describe("PRINT_STYLES", () => {
  it("offers the minimal style plus the three branded styles", () => {
    expect(PRINT_STYLES.map((s) => s.id)).toEqual(["minimal", "sideline", "playcall", "gameday"]);
  });

  it("gives every style a unique id and a non-empty picker label and description", () => {
    const ids = PRINT_STYLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const style of PRINT_STYLES) {
      expect(style.label.length).toBeGreaterThan(0);
      expect(style.description.length).toBeGreaterThan(0);
    }
  });

  it("defaults to the original minimal style, and the default exists in PRINT_STYLES", () => {
    expect(DEFAULT_STYLE_ID).toBe("minimal");
    expect(PRINT_STYLES.some((s) => s.id === DEFAULT_STYLE_ID)).toBe(true);
  });
});

describe("getPrintStyle", () => {
  it("returns the matching style for each valid id", () => {
    for (const style of PRINT_STYLES) {
      expect(getPrintStyle(style.id)).toBe(style);
    }
  });

  it.each(["", "bold", null, undefined, 4, "MINIMAL"])(
    "falls back to the minimal default for invalid style id %j",
    (bad) => {
      expect(getPrintStyle(bad).id).toBe(DEFAULT_STYLE_ID);
    }
  );
});

describe("getPlayNumber", () => {
  it("numbers cells 1-based within the first page", () => {
    expect(getPlayNumber(0, 4, 0)).toBe(1);
    expect(getPlayNumber(0, 4, 3)).toBe(4);
  });

  it("continues numbering across pages for every layout", () => {
    expect(getPlayNumber(1, 4, 0)).toBe(5);
    expect(getPlayNumber(2, 6, 5)).toBe(18);
    expect(getPlayNumber(3, 2, 1)).toBe(8);
  });

  it("matches the flattened pagination order end to end", () => {
    const plays = makePlays(10);
    const perPage = 4;
    const numbers = paginatePlays(plays, perPage).flatMap((page, pageIndex) =>
      page.map((_, cellIndex) => getPlayNumber(pageIndex, perPage, cellIndex))
    );
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

// ── Pagination ────────────────────────────────────────────────────────────────

describe("paginatePlays", () => {
  it("chunks an exact multiple into full pages", () => {
    const pages = paginatePlays(makePlays(8), 4);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(4);
    expect(pages[1]).toHaveLength(4);
  });

  it("puts the remainder on a short final page", () => {
    const pages = paginatePlays(makePlays(10), 4);
    expect(pages.map((p) => p.length)).toEqual([4, 4, 2]);
  });

  it("preserves plays-list order across pages", () => {
    const plays = makePlays(7);
    const flat = paginatePlays(plays, 2).flat();
    expect(flat.map((p) => p.id)).toEqual(plays.map((p) => p.id));
  });

  it("returns a single short page when there are fewer plays than perPage", () => {
    const pages = paginatePlays(makePlays(3), 6);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(3);
  });

  it("returns no pages for an empty selection", () => {
    expect(paginatePlays([], 4)).toEqual([]);
  });

  it("returns no pages for non-array input", () => {
    expect(paginatePlays(null, 4)).toEqual([]);
    expect(paginatePlays(undefined, 4)).toEqual([]);
    expect(paginatePlays({ length: 3 }, 4)).toEqual([]);
  });

  it.each([0, -2, NaN, null, undefined])(
    "clamps invalid perPage %j to 1 instead of looping forever",
    (bad) => {
      const pages = paginatePlays(makePlays(3), bad);
      expect(pages).toHaveLength(3);
      expect(pages.every((p) => p.length === 1)).toBe(true);
    }
  );

  it("floors fractional perPage", () => {
    const pages = paginatePlays(makePlays(9), 4.9);
    expect(pages.map((p) => p.length)).toEqual([4, 4, 1]);
  });

  it("handles the ~40-play PRD perf scenario at every layout", () => {
    const plays = makePlays(40);
    expect(paginatePlays(plays, 2)).toHaveLength(20);
    expect(paginatePlays(plays, 4)).toHaveLength(10);
    expect(paginatePlays(plays, 6).map((p) => p.length)).toEqual([6, 6, 6, 6, 6, 6, 4]);
  });
});

// ── Gating ────────────────────────────────────────────────────────────────────

describe("canShowPrintAction", () => {
  it("shows Print only for a coach on an entitled team", () => {
    expect(canShowPrintAction(true, true)).toBe(true);
  });

  it("hides Print for non-coaches even when the team is entitled", () => {
    expect(canShowPrintAction(false, true)).toBe(false);
  });

  it("hides Print for coaches on non-entitled teams", () => {
    expect(canShowPrintAction(true, false)).toBe(false);
  });

  it("fails closed when inputs are missing or not yet loaded", () => {
    expect(canShowPrintAction(undefined, undefined)).toBe(false);
    expect(canShowPrintAction(null, null)).toBe(false);
    expect(canShowPrintAction(true, undefined)).toBe(false);
    expect(canShowPrintAction(undefined, true)).toBe(false);
  });

  it("always returns a real boolean, never a truthy/falsy passthrough", () => {
    expect(canShowPrintAction(1, "yes")).toBe(true);
    expect(canShowPrintAction(true, 0)).toBe(false);
  });
});

// ── Entitlement wiring guard (static file reads) ─────────────────────────────

describe("'printing' entitlement wiring", () => {
  const read = (rel) => readFileSync(resolve(ROOT, rel), "utf8");

  it("is allowed by the team_suite_features CHECK constraint in schema.sql", () => {
    const schema = read("server/db/schema.sql");
    const checks = schema.match(/CHECK \(feature IN \([^)]*\)\)/g) || [];
    expect(checks.length).toBeGreaterThan(0);
    for (const check of checks) {
      expect(check).toContain("'printing'");
    }
  });

  it("is listed in SUITE_FEATURES in both server route files", () => {
    for (const file of ["server/routes/adminTeamSuite.js", "server/routes/suite.js"]) {
      const src = read(file);
      const match = src.match(/const SUITE_FEATURES = \[([^\]]*)\]/);
      expect(match, `${file} must define SUITE_FEATURES`).toBeTruthy();
      expect(match[1]).toContain('"printing"');
    }
  });

  it("has a toggle entry on the admin Team Suite page", () => {
    const src = read("src/pages/AdminTeamSuitePage.jsx");
    expect(src).toMatch(/key:\s*"printing"/);
  });

  it("gates the Plays bulk bar via useSuiteFeature('printing') + canShowPrintAction", () => {
    const src = read("src/pages/app/Plays.jsx");
    expect(src).toMatch(/useSuiteFeature\(\s*["']printing["']\s*\)/);
    expect(src).toMatch(/canShowPrintAction\(/);
  });
});
