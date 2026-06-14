/**
 * Static source-scan tests that verify Session 4 overlay migration completeness.
 * Each test asserts that a raw inline-overlay pattern no longer exists in a file
 * that was explicitly migrated to use the design-system components.
 *
 * Guards are narrowly scoped to the specific files and patterns that were
 * migrated. Valid form controls and layout classes are NOT guarded.
 */
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relPath) {
  return readFileSync(resolve(ROOT, relPath), "utf8");
}

// ── Raw modal backdrop pattern ─────────────────────────────────────────────────

describe("fixed inset-0 z-50 raw backdrop guard", () => {
  const migratedFiles = [
    "src/pages/app/DemoVideos.jsx",
    "src/pages/app/Team.jsx",
    "src/pages/app/Plays.jsx",
  ];

  test.each(migratedFiles)("%s has no raw fixed-inset overlay", (file) => {
    const source = read(file);
    expect(source).not.toMatch(/fixed inset-0 z-50/);
  });
});

// ── Raw absolute context-menu guard ───────────────────────────────────────────

describe("absolute z-50 raw menu guard (PlayCard / FolderCard)", () => {
  const menuFiles = [
    "src/components/PlayCard.jsx",
    "src/components/FolderCard.jsx",
  ];

  test.each(menuFiles)("%s has no raw absolute context-menu panel", (file) => {
    const source = read(file);
    // The old pattern: absolute positioned div with z-50 acting as a menu panel
    expect(source).not.toMatch(/absolute.*bottom-full.*z-50/);
    expect(source).not.toMatch(/absolute.*z-50.*bottom-full/);
  });
});

// ── Raw animate-spin guard (app pages) ───────────────────────────────────────

describe("animate-spin raw spinner guard (app pages)", () => {
  const appPages = [
    "src/pages/app/DemoVideos.jsx",
    "src/pages/app/Team.jsx",
    "src/pages/app/Plays.jsx",
    "src/pages/app/PlayNew.jsx",
    "src/pages/app/Playbooks.jsx",
  ];

  test.each(appPages)("%s uses no raw animate-spin (uses Spinner component instead)", (file) => {
    const source = read(file);
    expect(source).not.toMatch(/animate-spin/);
  });
});

// ── Popover migration: no raw absolute filter panel in Playbooks ───────────────

test("Playbooks.jsx: filter panel uses Popover, not raw absolute div", () => {
  const source = read("src/pages/app/Playbooks.jsx");
  // The original absolute panel: 'absolute right-0 top-[calc(100%+0.75rem)] z-20'
  expect(source).not.toMatch(/absolute.*z-20.*w-\[280px\]/);
  expect(source).not.toMatch(/top-\[calc\(100%\+0\.75rem\)\].*z-20/);
  // The migrated version uses Popover
  expect(source).toMatch(/<Popover/);
});

// ── Popover migration: no raw absolute tag dropdown in PlayNew ─────────────────

test("PlayNew.jsx: tag suggestions use Popover, not raw absolute div", () => {
  const source = read("src/pages/app/PlayNew.jsx");
  // The original absolute panel: 'absolute left-0 right-0 top-0 z-20'
  expect(source).not.toMatch(/absolute left-0 right-0 top-0 z-20/);
  // The migrated version uses Popover
  expect(source).toMatch(/<Popover/);
});

// ── Toast migration: no raw toast div in Plays ────────────────────────────────

test("Plays.jsx: toasts use Toast component, not raw fixed bottom toast divs", () => {
  const source = read("src/pages/app/Plays.jsx");
  // The original patterns: 'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-[fadeInUp'
  expect(source).not.toMatch(/fixed bottom-6 left\/2 z-50.*animate/);
  expect(source).not.toMatch(/animate-\[fadeInUp/);
  // The migrated version uses Toast
  expect(source).toMatch(/<Toast/);
});
