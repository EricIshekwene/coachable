/**
 * designTokenUnification.test.js
 *
 * Guards the "single source of truth" rule established on the
 * design-rule-correction branch: the admin --adm-* color tokens must DERIVE
 * from the product brand palette (--color-Brand* in src/index.css), not keep
 * their own parallel hex values. This is a static-analysis test over the two
 * CSS files so it stays fast and environment-free.
 *
 * If these assertions fail, the admin world has drifted back into a separate
 * palette and the design-rules "single source of truth" claim is no longer true.
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

describe("admin tokens derive from the brand palette", () => {
  const dark = ruleBody(adminCss, '[data-admin-theme="dark"]');
  const light = ruleBody(adminCss, '[data-admin-theme="light"]');

  it("found both admin theme blocks", () => {
    expect(dark.length).toBeGreaterThan(0);
    expect(light.length).toBeGreaterThan(0);
  });

  // Core color tokens that MUST reference a brand token (directly or via color-mix).
  const mustReferenceBrand = [
    "--adm-bg",
    "--adm-surface",
    "--adm-text",
    "--adm-text2",
    "--adm-accent",
    "--adm-success",
  ];

  for (const token of mustReferenceBrand) {
    it(`${token} references --color-Brand* in both themes`, () => {
      for (const [name, body] of [["dark", dark], ["light", light]]) {
        const line = body.split(";").find((l) => l.includes(`${token}:`)) ?? "";
        expect(line, `${token} in ${name}`).toMatch(/var\(--color-Brand/);
      }
    });
  }

  it("brand accent + success alias the exact brand tokens", () => {
    expect(dark).toMatch(/--adm-accent:\s*var\(--color-BrandOrange\)/);
    expect(dark).toMatch(/--adm-success:\s*var\(--color-BrandGreen\)/);
    expect(light).toMatch(/--adm-accent:\s*var\(--color-BrandOrange\)/);
    expect(light).toMatch(/--adm-success:\s*var\(--color-BrandGreen\)/);
  });

  it("does not reintroduce the old off-brand hex values for core tokens", () => {
    // Old admin background / text / green that drifted from the brand palette.
    expect(dark).not.toMatch(/--adm-bg:\s*#0f1117/);
    expect(dark).not.toMatch(/--adm-text:\s*#f0f2f6/);
    expect(dark).not.toMatch(/--adm-success:\s*#4ade80/);
  });
});
