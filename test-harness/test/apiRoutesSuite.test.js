/**
 * Smoke test for the in-app "API Routes" suite shown on the admin Tests page.
 * Loads the suite definition and runs each test through the in-app test runner
 * so contract regressions surface in CI as well as in the admin UI.
 */
import { describe, it, expect } from "vitest";
import apiRoutesSuite from "../../src/test-runner/suites/apiRoutes.suite.js";
import { runTests } from "../../src/test-runner/testRunner.js";

describe("API Routes in-app suite", () => {
  it("runs every test in the suite and they all pass", async () => {
    const results = await runTests(apiRoutesSuite);
    const failures = results.filter((r) => r.status === "fail");
    if (failures.length) {
      const summary = failures
        .map((f) => `  - ${f.suiteName} > ${f.testName}: ${f.error}`)
        .join("\n");
      throw new Error(`${failures.length} in-app API Routes test(s) failed:\n${summary}`);
    }
    expect(results.length).toBeGreaterThan(0);
  });
});
