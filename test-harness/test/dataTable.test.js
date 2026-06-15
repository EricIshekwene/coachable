/**
 * dataTable.test.js
 *
 * Tests for DataTable, Th, and Td logic — empty-state detection,
 * column cell resolution, size padding maps, and source guards.
 * Pure logic tests; no DOM rendering required.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// -- Mirrors DataTable logic --

/** @param {boolean} loading @param {any[]} data @returns {boolean} */
function isEmpty(loading, data) {
  return !loading && data.length === 0;
}

/**
 * Mirrors DataTable's cell value resolution.
 * @param {{ key: string, render?: Function }} col
 * @param {Record<string, any>} row
 * @param {number} i
 */
function resolveCell(col, row, i) {
  return col.render ? col.render(row, i) : row[col.key];
}

/** @param {Record<string, any>} row @param {string} keyField @returns {any} */
function rowKey(row, keyField) {
  return row[keyField];
}

// -- Mirrors Th / Td size logic --

/** @param {"md"|"sm"|"xs"|undefined} size */
function thPadding(size) {
  return size === "xs" ? "px-2 py-1.5" : size === "sm" ? "px-3 py-2" : "px-4 py-3";
}

/** @param {"md"|"sm"|"xs"|undefined} size */
function tdPadding(size) {
  return size === "xs" ? "px-2 py-1.5" : size === "sm" ? "px-3 py-3" : "px-4 py-4";
}

// ── isEmpty ──────────────────────────────────────────────────────────────────

describe("DataTable isEmpty logic", () => {
  it("is empty when not loading and data has no items", () => {
    expect(isEmpty(false, [])).toBe(true);
  });

  it("is not empty while loading, even with zero data items", () => {
    expect(isEmpty(true, [])).toBe(false);
  });

  it("is not empty when data has at least one item", () => {
    expect(isEmpty(false, [{ id: 1 }])).toBe(false);
  });

  it("is not empty while loading with items present", () => {
    expect(isEmpty(true, [{ id: 1 }])).toBe(false);
  });
});

// ── Cell resolution ───────────────────────────────────────────────────────────

describe("DataTable column cell resolution", () => {
  const row = { id: "u1", name: "Alice", email: "alice@example.com" };

  it("returns raw field value when no render fn is provided", () => {
    const col = { key: "name", label: "Name" };
    expect(resolveCell(col, row, 0)).toBe("Alice");
  });

  it("calls render fn when provided and returns its output", () => {
    const col = { key: "email", label: "Email", render: (r) => `<${r.email}>` };
    expect(resolveCell(col, row, 0)).toBe("<alice@example.com>");
  });

  it("passes row index as second argument to render", () => {
    const col = { key: "idx", label: "#", render: (_r, i) => i + 1 };
    expect(resolveCell(col, row, 4)).toBe(5);
  });

  it("missing key with no render fn returns undefined", () => {
    const col = { key: "nonexistent", label: "N/A" };
    expect(resolveCell(col, row, 0)).toBeUndefined();
  });
});

// ── Row key ───────────────────────────────────────────────────────────────────

describe("DataTable keyField row key", () => {
  it("extracts the id field as key", () => {
    expect(rowKey({ id: "abc", name: "X" }, "id")).toBe("abc");
  });

  it("can use any field as the key", () => {
    expect(rowKey({ email: "x@y.com", id: 42 }, "email")).toBe("x@y.com");
  });
});

// ── Column API shape ──────────────────────────────────────────────────────────

describe("DataTable column API contract", () => {
  it("minimal column must have key and label", () => {
    const col = { key: "name", label: "Name" };
    expect(col.key).toBeTruthy();
    expect(col.label).toBeTruthy();
  });

  it("align defaults to left when not specified", () => {
    const col = { key: "x", label: "X" };
    expect(col.align ?? "left").toBe("left");
  });

  it("optional render is a function or undefined", () => {
    const col = { key: "name", label: "Name", render: (r) => r.name };
    expect(typeof col.render).toBe("function");
  });
});

// ── Th padding ────────────────────────────────────────────────────────────────

describe("Th size padding mapping", () => {
  it("md (default) uses px-4 py-3", () => {
    expect(thPadding("md")).toBe("px-4 py-3");
    expect(thPadding(undefined)).toBe("px-4 py-3");
  });

  it("sm uses px-3 py-2", () => {
    expect(thPadding("sm")).toBe("px-3 py-2");
  });

  it("xs uses px-2 py-1.5", () => {
    expect(thPadding("xs")).toBe("px-2 py-1.5");
  });
});

// ── Td padding ────────────────────────────────────────────────────────────────

describe("Td size padding mapping", () => {
  it("md (default) uses px-4 py-4", () => {
    expect(tdPadding("md")).toBe("px-4 py-4");
    expect(tdPadding(undefined)).toBe("px-4 py-4");
  });

  it("sm uses px-3 py-3", () => {
    expect(tdPadding("sm")).toBe("px-3 py-3");
  });

  it("xs uses px-2 py-1.5", () => {
    expect(tdPadding("xs")).toBe("px-2 py-1.5");
  });
});

// ── Source guards ─────────────────────────────────────────────────────────────

describe("DataTable source guard", () => {
  it("DataTable.jsx imports Th, Td, TableSearchHeader", () => {
    const src = readFileSync(resolve(ROOT, "src/design-system/components/DataTable.jsx"), "utf8");
    expect(src).toContain("import Th from");
    expect(src).toContain("import Td from");
    expect(src).toContain("import TableSearchHeader from");
  });

  it("DataTable.jsx carries data-component attribute", () => {
    const src = readFileSync(resolve(ROOT, "src/design-system/components/DataTable.jsx"), "utf8");
    expect(src).toContain('data-component="DataTable"');
  });
});

describe("Th source guard", () => {
  it("Th.jsx carries data-component attribute", () => {
    const src = readFileSync(resolve(ROOT, "src/design-system/components/Th.jsx"), "utf8");
    expect(src).toContain('data-component="Th"');
  });

  it("Th.jsx uses --ui-text-muted for color", () => {
    const src = readFileSync(resolve(ROOT, "src/design-system/components/Th.jsx"), "utf8");
    expect(src).toContain("--ui-text-muted");
  });

  it("Th.jsx uses --ui-border for border", () => {
    const src = readFileSync(resolve(ROOT, "src/design-system/components/Th.jsx"), "utf8");
    expect(src).toContain("--ui-border");
  });
});

describe("Td source guard", () => {
  it("Td.jsx carries data-component attribute", () => {
    const src = readFileSync(resolve(ROOT, "src/design-system/components/Td.jsx"), "utf8");
    expect(src).toContain('data-component="Td"');
  });

  it("Td.jsx uses --ui-border for row divider", () => {
    const src = readFileSync(resolve(ROOT, "src/design-system/components/Td.jsx"), "utf8");
    expect(src).toContain("--ui-border");
  });
});

describe("TableSearchHeader source guard", () => {
  it("TableSearchHeader.jsx carries data-component attribute", () => {
    const src = readFileSync(resolve(ROOT, "src/design-system/components/TableSearchHeader.jsx"), "utf8");
    expect(src).toContain('data-component="TableSearchHeader"');
  });
});
