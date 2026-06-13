/**
 * designTokenUnification.test.js
 *
 * Guards the "single source of truth" rule: every axis of the design system
 * must derive from the canonical tokens in src/index.css, not maintain a
 * parallel set of raw values.
 *
 * Currently guards:
 *   - Color: shared --ui-* tokens derive from brand tokens; admin aliases --ui-*
 *   - Radius: admin --adm-radius* must alias the shared --radius-* scale from index.css
 *   - Shadow: admin --adm-shadow* must alias the shared --shadow-* scale from index.css
 *
 * These are static-analysis tests — they read the CSS files directly, so they
 * stay fast and environment-free.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const adminCss = readFileSync(resolve(ROOT, "src/admin/admin.css"), "utf8");
const indexCss = readFileSync(resolve(ROOT, "src/index.css"), "utf8");

/** Extract the body of a CSS rule by its selector text. */
function ruleBody(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) return "";
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

describe("brand palette is the single source of truth", () => {
  it("index.css @theme defines the canonical brand values", () => {
    expect(indexCss).toMatch(/--color-BrandOrange:\s*#FF7A18/i);
    expect(indexCss).toMatch(/--color-BrandGreen:\s*#4FA85D/i);
    expect(indexCss).toMatch(/--color-BrandBlack:\s*#121212/i);
    expect(indexCss).toMatch(/--color-BrandText:\s*#f5f7fa/i);
  });

  it("brand light overrides reach light-mode admin surfaces", () => {
    // The light neutrals override must target both the app shell AND admin.
    expect(indexCss).toMatch(/\[data-admin-theme="light"\]\s*\{[\s\S]*?--color-BrandBlack:\s*#ffffff/i);
  });
});

describe("shared semantic UI tokens", () => {
  const expectedTokens = [
    "--ui-bg", "--ui-surface", "--ui-surface-2", "--ui-surface-3",
    "--ui-surface-elevated", "--ui-border", "--ui-border-strong", "--ui-text",
    "--ui-text-muted", "--ui-text-subtle", "--ui-accent", "--ui-accent-muted",
    "--ui-success", "--ui-success-muted", "--ui-warning", "--ui-warning-muted",
    "--ui-danger", "--ui-danger-muted", "--ui-info", "--ui-info-muted", "--ui-overlay",
  ];

  it.each(expectedTokens)("%s is declared in a :root block", (token) => {
    const roots = [...indexCss.matchAll(/:root\s*\{([\s\S]*?)\}/g)].map((match) => match[1]);
    expect(roots.some((body) => body.includes(`${token}:`))).toBe(true);
  });

  it("core semantic tokens derive from the brand palette", () => {
    expect(indexCss).toMatch(/--ui-bg:\s*var\(--color-BrandBlack\)/);
    expect(indexCss).toMatch(/--ui-text:\s*var\(--color-BrandWhite\)/);
    expect(indexCss).toMatch(/--ui-accent:\s*var\(--color-BrandOrange\)/);
    expect(indexCss).toMatch(/--ui-success:\s*var\(--color-BrandGreen\)/);
  });
});

describe("admin tokens derive from the shared semantic layer", () => {
  const dark = ruleBody(adminCss, '[data-admin-theme="dark"]');
  const light = ruleBody(adminCss, '[data-admin-theme="light"]');

  it("found both admin theme blocks", () => {
    expect(dark.length).toBeGreaterThan(0);
    expect(light.length).toBeGreaterThan(0);
  });

  const mustReferenceUi = [
    "--adm-bg",
    "--adm-surface",
    "--adm-text",
    "--adm-text2",
    "--adm-accent",
    "--adm-success",
  ];

  for (const token of mustReferenceUi) {
    it(`${token} references --ui-* in both themes`, () => {
      for (const [name, body] of [["dark", dark], ["light", light]]) {
        const line = body.split(";").find((l) => l.includes(`${token}:`)) ?? "";
        expect(line, `${token} in ${name}`).toMatch(/var\(--ui-/);
      }
    });
  }

  it("accent + success alias the exact semantic tokens", () => {
    expect(dark).toMatch(/--adm-accent:\s*var\(--ui-accent\)/);
    expect(dark).toMatch(/--adm-success:\s*var\(--ui-success\)/);
    expect(light).toMatch(/--adm-accent:\s*var\(--ui-accent\)/);
    expect(light).toMatch(/--adm-success:\s*var\(--ui-success\)/);
  });

  it("does not reintroduce the old off-brand hex values for core tokens", () => {
    // Old admin background / text / green that drifted from the brand palette.
    expect(dark).not.toMatch(/--adm-bg:\s*#0f1117/);
    expect(dark).not.toMatch(/--adm-text:\s*#f0f2f6/);
    expect(dark).not.toMatch(/--adm-success:\s*#4ade80/);
  });
});

describe("shared radius + shadow scale is the single source", () => {
  // index.css must define the canonical radius and shadow tokens
  it("index.css :root defines the canonical radius scale", () => {
    expect(indexCss).toMatch(/--radius-sm:\s*6px/);
    expect(indexCss).toMatch(/--radius-md:\s*8px/);
    expect(indexCss).toMatch(/--radius:\s*10px/);
    expect(indexCss).toMatch(/--radius-lg:\s*14px/);
    expect(indexCss).toMatch(/--radius-xl:\s*18px/);
  });

  it("index.css :root defines the canonical shadow scale", () => {
    expect(indexCss).toMatch(/--shadow-sm:/);
    expect(indexCss).toMatch(/--shadow:/);
    expect(indexCss).toMatch(/--shadow-lg:/);
  });

  it("index.css defines motion tokens in @theme", () => {
    expect(indexCss).toMatch(/--duration-fast:\s*150ms/);
    expect(indexCss).toMatch(/--duration-base:\s*200ms/);
    expect(indexCss).toMatch(/--duration-slow:\s*300ms/);
  });

  const adminCssForStructure = readFileSync(
    resolve(ROOT, "src/admin/admin.css"),
    "utf8",
  );

  // Admin radius tokens must alias the shared scale — no hard-coded px values
  const radiusTokens = ["--adm-radius", "--adm-radius-sm", "--adm-radius-md", "--adm-radius-lg", "--adm-radius-xl"];
  for (const token of radiusTokens) {
    it(`${token} aliases var(--radius*)`, () => {
      const matches = adminCssForStructure.match(new RegExp(`${token}:\\s*([^;]+)`, "g")) ?? [];
      expect(matches.length).toBeGreaterThan(0);
      for (const match of matches) {
        expect(match, `${token} must alias a shared --radius-* token`).toMatch(/var\(--radius/);
      }
    });
  }

  // Admin shadow tokens must alias the shared scale — no raw box-shadow literals
  const shadowTokens = ["--adm-shadow", "--adm-shadow-sm", "--adm-shadow-lg"];
  for (const token of shadowTokens) {
    it(`${token} aliases var(--shadow*)`, () => {
      const matches = adminCssForStructure.match(new RegExp(`${token}:\\s*([^;]+)`, "g")) ?? [];
      expect(matches.length).toBeGreaterThan(0);
      for (const match of matches) {
        expect(match, `${token} must alias a shared --shadow-* token`).toMatch(/var\(--shadow/);
      }
    });
  }
});
