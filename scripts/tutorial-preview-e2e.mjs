/**
 * End-to-end driver for the admin tutorial preview, run exactly the way the
 * preview is launched in production: arm the coachable_tutorial_preview
 * sessionStorage flags, open /app/plays?startTutorial=1 on the Vite dev
 * server, then walk every step with the card's "Next — do it for me" button.
 *
 * Fails if ANY network request reaches the real API origin — the preview
 * must be fully mocked.
 *
 * Usage: node scripts/tutorial-preview-e2e.mjs [sport ...]
 */
import { createRequire } from "module";

// Playwright isn't a project dependency — resolve it from PLAYWRIGHT_MODULE
// (e.g. the npx cache) or a regular install.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.E2E_BASE_URL || "http://localhost:5173";
const API_ORIGIN = process.env.E2E_API_ORIGIN || "http://localhost:3001";
const SPORTS = process.argv.slice(2).length ? process.argv.slice(2) : ["football", "rugby", "blank"];
const STEP_TIMEOUT_MS = 20000;

async function runSport(browser, sport) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();

  const apiRequests = [];
  page.on("request", (req) => {
    if (req.url().startsWith(API_ORIGIN)) apiRequests.push(`${req.method()} ${req.url()}`);
  });
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  // Arm the preview exactly like Admin.jsx's handlePreviewTutorial does.
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => {
    sessionStorage.setItem("coachable_tutorial_preview", "1");
    sessionStorage.setItem("coachable_tutorial_preview_sport", s);
  }, sport);
  await page.goto(`${BASE}/app/plays?startTutorial=1`, { waitUntil: "domcontentloaded" });

  const dialog = page.locator('[role="dialog"][aria-label="Product tour"]');
  await dialog.waitFor({ timeout: 15000 });

  const visited = [];
  const started = Date.now();
  let lastLabel = "";

  while (Date.now() - started < 180000) {
    // Tour gone => finished; the teardown hard-navigates back to /admin.
    if (!(await dialog.count()) || !(await dialog.isVisible().catch(() => false))) break;

    const label = (await dialog.locator("span").first().textContent().catch(() => "")) || "";
    const title = (await dialog.locator("p").first().textContent().catch(() => "")) || "";
    if (label !== lastLabel) {
      visited.push(`${label.trim()} — ${title.trim()}`);
      lastLabel = label;
    }

    const manualCta = dialog.locator("button", { hasText: /^(Continue|Finish)$/ });
    const autoCta = dialog.locator("button", { hasText: "Next — do it for me" });

    // Click, then wait for the step counter to change (or the tour to end);
    // retry the click every 2s in case the target hadn't mounted yet.
    const stepStarted = Date.now();
    let changed = false;
    while (Date.now() - stepStarted < STEP_TIMEOUT_MS) {
      if (await manualCta.count()) {
        await manualCta.first().click().catch(() => {});
      } else if ((await autoCta.count()) && (await autoCta.first().isEnabled().catch(() => false))) {
        await autoCta.first().click().catch(() => {});
      }
      changed = await page
        .waitForFunction(
          (prev) => {
            const d = document.querySelector('[role="dialog"][aria-label="Product tour"]');
            if (!d) return true;
            const span = d.querySelector("span");
            return span && span.textContent !== prev;
          },
          lastLabel,
          { timeout: 2000 }
        )
        .then(() => true)
        .catch(() => false);
      if (changed) break;
    }
    if (!changed) {
      const stuckTitle = (await dialog.locator("p").first().textContent().catch(() => "")) || "";
      await context.close();
      return { sport, ok: false, error: `stuck on "${lastLabel.trim()} — ${stuckTitle.trim()}"`, visited, apiRequests, pageErrors };
    }
  }

  // Finishing tears the preview down and returns to /admin.
  await page.waitForURL(/\/admin/, { timeout: 15000 }).catch(() => {});
  const endedOnAdmin = page.url().includes("/admin");
  await context.close();
  return { sport, ok: endedOnAdmin, error: endedOnAdmin ? null : `ended on ${page.url()}`, visited, apiRequests, pageErrors };
}

const browser = await chromium.launch();
let failed = false;
for (const sport of SPORTS) {
  const r = await runSport(browser, sport);
  console.log(`\n=== ${sport} ${r.ok && r.apiRequests.length === 0 ? "PASS" : "FAIL"} ===`);
  console.log(r.visited.map((v) => `  ${v}`).join("\n"));
  if (r.error) console.log(`  ERROR: ${r.error}`);
  if (r.apiRequests.length) {
    console.log(`  !! ${r.apiRequests.length} request(s) hit the real API:`);
    r.apiRequests.slice(0, 10).forEach((u) => console.log(`     ${u}`));
  } else {
    console.log("  zero requests reached the real API");
  }
  if (r.pageErrors.length) console.log(`  page errors: ${r.pageErrors.slice(0, 5).join(" | ")}`);
  if (!r.ok || r.apiRequests.length) failed = true;
}
await browser.close();
process.exit(failed ? 1 : 0);
