/**
 * onboardingMobileLayout.test.js
 *
 * Regression guard for the July 2026 mobile incident: the onboarding left
 * panel's only children are step panels with `absolute inset-0`, so the panel
 * has no intrinsic height. It must therefore carry an unconditional `h-full`
 * (not just `md:h-full`) — without it the panel collapses to 0px on mobile and
 * the entire onboarding flow (including sport selection) renders blank.
 *
 * Static-analysis test — reads the JSX source directly, matching the pattern
 * of designTokenUnification.test.js.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const onboardingSrc = readFileSync(resolve(ROOT, "src/pages/Onboarding.jsx"), "utf8");

/**
 * className string of the main-flow left panel (the white 3/5 column).
 * The invite-code variant has a similar bg-white md:w-3/5 panel, but its
 * children are in-flow (no absolute steps), so it isn't affected — only the
 * `relative` panel hosting the absolute step panels is guarded here.
 */
function leftPanelClassName() {
  const matches = [...onboardingSrc.matchAll(/className="([^"]*bg-white[^"]*md:w-3\/5[^"]*)"/g)];
  const main = matches.find(([, cls]) => cls.split(/\s+/).includes("relative"));
  return main ? main[1] : null;
}

describe("Onboarding main flow — left panel mobile height", () => {
  it("still uses absolute-positioned step panels (precondition for this guard)", () => {
    // If the step transition moves away from absolute inset-0 panels, the
    // h-full requirement below may no longer apply — revisit this test then.
    expect(onboardingSrc).toMatch(/absolute inset-0 overflow-y-auto/);
  });

  it("left panel has an unconditional h-full so absolute step panels get a box on mobile", () => {
    const className = leftPanelClassName();
    expect(className, "main-flow left panel div (relative + bg-white + md:w-3/5) not found").toBeTruthy();
    const classes = className.split(/\s+/);
    expect(classes, "h-full must apply at ALL breakpoints, not only md:").toContain("h-full");
  });
});
