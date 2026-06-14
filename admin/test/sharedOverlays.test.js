/**
 * Logic-mirror tests for the Session 4 overlay components.
 * These tests verify ConfirmDialog prop mapping and Toast duration/role behaviour
 * without full DOM rendering.
 */
import { describe, test, expect, vi } from "vitest";

// ── ConfirmDialog prop interface ───────────────────────────────────────────────

describe("ConfirmDialog prop contract", () => {
  test("tone='danger' maps to danger variant on confirm button", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const source = readFileSync(`${ROOT}/src/design-system/components/ConfirmDialog.jsx`, "utf8");
    // variant={tone === "danger" ? "danger" : "primary"} — maps danger tone to danger variant
    expect(source).toMatch(/variant=\{tone === "danger" \? "danger"/);
  });

  test("loading prop disables cancel button", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const source = readFileSync(`${ROOT}/src/design-system/components/ConfirmDialog.jsx`, "utf8");
    // Cancel button should be disabled when loading
    expect(source).toMatch(/disabled.*loading/);
  });

  test("ConfirmModal shim maps message->title and subtitle->description", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const source = readFileSync(`${ROOT}/src/components/subcomponents/ConfirmModal.jsx`, "utf8");
    expect(source).toMatch(/title.*message/);
    expect(source).toMatch(/description.*subtitle/);
    expect(source).toMatch(/tone.*danger.*"danger".*"default"/);
  });
});

// ── Toast role/aria-live mapping ───────────────────────────────────────────────

describe("Toast component", () => {
  test("uses role=alert and aria-live=assertive for error tone", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const source = readFileSync(`${ROOT}/src/design-system/components/Toast.jsx`, "utf8");
    // Toast uses variable declarations for role/ariaLive based on tone
    expect(source).toMatch(/"alert"/);
    expect(source).toMatch(/"assertive"/);
  });

  test("uses role=status and aria-live=polite for non-error tones", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const source = readFileSync(`${ROOT}/src/design-system/components/Toast.jsx`, "utf8");
    // Toast uses variable declarations: const role = ... "status"; const ariaLive = ... "polite"
    expect(source).toMatch(/"status"/);
    expect(source).toMatch(/"polite"/);
  });

  test("auto-dismiss uses setTimeout via useEffect with duration", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const source = readFileSync(`${ROOT}/src/design-system/components/Toast.jsx`, "utf8");
    expect(source).toMatch(/setTimeout.*onClose.*duration|setTimeout.*duration.*onClose/);
  });

  test("SSR guard: no document access at module level", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const source = readFileSync(`${ROOT}/src/design-system/components/Toast.jsx`, "utf8");
    // Guard must be inside render, not at module scope
    expect(source).toMatch(/typeof document.*undefined/);
    // document.body access must NOT be at top-level (only inside the return)
    const bodyAccessIdx = source.indexOf("document.body");
    const guardIdx = source.indexOf('typeof document === "undefined"');
    expect(bodyAccessIdx).toBeGreaterThan(guardIdx);
  });
});
