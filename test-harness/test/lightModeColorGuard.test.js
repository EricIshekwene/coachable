/**
 * Static source-scan guard: asserts that user-facing app files contain zero raw
 * Brand* Tailwind classes used for surfaces, borders, or muted text.
 *
 * These classes only work correctly in dark mode. The --ui-* token layer provides
 * correct light-mode values. Every app page and shared card component must use
 * --ui-* tokens (via style props or Tailwind v4 [color:var(--ui-*)] classes) for
 * surface, border, and neutral text roles.
 *
 * Does NOT guard accent/brand colors (BrandOrange, BrandGreen, BrandWhite, BrandText).
 * Only guards the neutral color classes that break in light mode.
 */
import { describe, test, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relPath) {
  return readFileSync(resolve(ROOT, relPath), "utf8");
}

/** All JSX files in src/pages/app/ */
const appPageFiles = readdirSync(resolve(ROOT, "src/pages/app"))
  .filter((f) => f.endsWith(".jsx"))
  .map((f) => `src/pages/app/${f}`);

/** Shared card components used across the app */
const sharedCardFiles = [
  "src/components/PlayCard.jsx",
  "src/components/FolderCard.jsx",
];

const allGuardedFiles = [...appPageFiles, ...sharedCardFiles];

// ── bg-BrandBlack2 (surface background — breaks in light mode) ────────────────

describe("no bg-BrandBlack2 in app pages / shared cards", () => {
  test.each(allGuardedFiles)("%s", (file) => {
    const source = read(file);
    expect(source).not.toMatch(/bg-BrandBlack2/);
  });
});

// ── border-BrandGray2/ (hairline/standard border — invisible in light mode) ───

describe("no border-BrandGray2/ in app pages / shared cards", () => {
  test.each(allGuardedFiles)("%s", (file) => {
    const source = read(file);
    expect(source).not.toMatch(/border-BrandGray2\//);
  });
});

// ── text-BrandGray (muted text — near-zero contrast in light mode) ────────────
// Uses word boundary so text-BrandGray2 is NOT flagged (separate token).

describe("no text-BrandGray (word-boundary) in app pages / shared cards", () => {
  test.each(allGuardedFiles)("%s", (file) => {
    const source = read(file);
    expect(source).not.toMatch(/text-BrandGray\b(?!2)/);
  });
});

// ── text-BrandGray2 (placeholder/disabled text — low-contrast in light mode) ──

describe("no text-BrandGray2 in app pages / shared cards", () => {
  test.each(allGuardedFiles)("%s", (file) => {
    const source = read(file);
    expect(source).not.toMatch(/text-BrandGray2/);
  });
});
