/**
 * Lightweight in-browser test runner.
 * Provides describe/it/expect API similar to vitest, but runs in the browser
 * and returns structured results with timing data.
 */

// ─── Expect (assertion library) ─────────────────────────────────────────────

/** Safely stringify a value without crashing on circular refs or DOM nodes. */
function safeStr(value) {
  if (value instanceof Element || value instanceof Node) return `[${value.constructor.name}]`;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function createExpect(actual) {
  const assert = (pass, message) => {
    if (!pass) throw new Error(message);
  };

  return {
    toBe(expected) {
      assert(actual === expected, `Expected ${safeStr(expected)}, got ${safeStr(actual)}`);
    },
    toEqual(expected) {
      const a = safeStr(actual);
      const b = safeStr(expected);
      assert(a === b, `Expected ${b}, got ${a}`);
    },
    toBeCloseTo(expected, precision = 2) {
      const factor = Math.pow(10, precision);
      const pass = Math.abs(actual - expected) < 1 / factor;
      assert(pass, `Expected ${actual} to be close to ${expected} (precision ${precision})`);
    },
    toBeTruthy() {
      assert(!!actual, `Expected ${safeStr(actual)} to be truthy`);
    },
    toBeFalsy() {
      assert(!actual, `Expected ${safeStr(actual)} to be falsy`);
    },
    toBeNull() {
      assert(actual === null, `Expected null, got ${safeStr(actual)}`);
    },
    toBeGreaterThan(n) {
      assert(actual > n, `Expected ${actual} > ${n}`);
    },
    toBeGreaterThanOrEqual(n) {
      assert(actual >= n, `Expected ${actual} >= ${n}`);
    },
    toBeLessThan(n) {
      assert(actual < n, `Expected ${actual} < ${n}`);
    },
    toBeLessThanOrEqual(n) {
      assert(actual <= n, `Expected ${actual} <= ${n}`);
    },
    toContain(item) {
      if (typeof actual === "string") {
        assert(actual.includes(item), `Expected "${actual}" to contain "${item}"`);
      } else if (Array.isArray(actual)) {
        assert(actual.includes(item), `Expected array to contain ${JSON.stringify(item)}`);
      } else {
        assert(false, `toContain requires string or array, got ${typeof actual}`);
      }
    },
    toHaveLength(len) {
      assert(actual?.length === len, `Expected length ${len}, got ${actual?.length}`);
    },
    toThrow(expectedMsg) {
      let threw = false;
      let error;
      try { actual(); } catch (e) { threw = true; error = e; }
      assert(threw, "Expected function to throw");
      if (expectedMsg) {
        const msg = error?.message || String(error);
        assert(msg.includes(expectedMsg), `Expected error "${msg}" to include "${expectedMsg}"`);
      }
    },
    get not() {
      const inner = createExpect(actual);
      return new Proxy(inner, {
        get(target, prop) {
          if (typeof target[prop] !== "function") return target[prop];
          return (...args) => {
            let threw = false;
            try { target[prop](...args); } catch { threw = true; }
            if (!threw) throw new Error(`Expected .not.${prop} to fail, but it passed`);
          };
        },
      });
    },
  };
}

// ─── Suite builder ──────────────────────────────────────────────────────────

/**
 * Creates a test suite definition. Call with a function that uses describe/it/expect.
 * Returns an array of { suiteName, testName, fn } entries.
 */
export function buildSuite(definitionFn) {
  const tests = [];
  let currentSuite = "";

  const describe = (name, fn) => {
    const prev = currentSuite;
    currentSuite = currentSuite ? `${currentSuite} > ${name}` : name;
    fn();
    currentSuite = prev;
  };

  const it = (name, fn, description = "") => {
    tests.push({ suiteName: currentSuite, testName: name, fn, description });
  };

  const expect = createExpect;

  definitionFn({ describe, it, expect });
  return tests;
}

// ─── Runner ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TestResult
 * @property {string} suiteName
 * @property {string} testName
 * @property {"pass"|"fail"} status
 * @property {number} durationMs
 * @property {string|null} error
 */

/**
 * Runs all tests in a suite and returns results.
 * @param {{ suiteName: string, testName: string, fn: Function }[]} tests
 * @returns {Promise<TestResult[]>}
 */
export async function runTests(tests) {
  const results = [];
  for (const test of tests) {
    const start = performance.now();
    let status = "pass";
    let error = null;
    try {
      const result = test.fn();
      if (result instanceof Promise) await result;
    } catch (e) {
      status = "fail";
      error = e?.message || String(e);
    }
    const durationMs = performance.now() - start;
    results.push({
      suiteName: test.suiteName,
      testName: test.testName,
      description: test.description || "",
      status,
      durationMs,
      error,
    });
  }
  return results;
}

/**
 * Runs multiple named suites and returns grouped results.
 * @param {Record<string, { suiteName, testName, fn }[]>} suiteMap
 * @returns {Promise<{ name: string, results: TestResult[], totalMs: number }[]>}
 */
export async function runAllSuites(suiteMap) {
  const output = [];
  for (const [name, tests] of Object.entries(suiteMap)) {
    const start = performance.now();
    const results = await runTests(tests);
    const totalMs = performance.now() - start;
    output.push({ name, results, totalMs });
  }
  return output;
}
