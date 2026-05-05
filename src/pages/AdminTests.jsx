import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../admin/AdminContext";
import { adminPath } from "../admin/adminNav";
import { AdminShell, AdminHeader, AdminPage, AdminBtn, AdminSpinner } from "../admin/components";
import { formatFailedTestsReport } from "../testing/formatFailedTestsReport";

const SUITE_NAMES = [
  "Drawing Geometry",
  "Interpolation",
  "Import / Export",
  "Animation Schema",
  "Routes",
];

const SUITE_DESCRIPTIONS = {
  "Drawing Geometry": "Pure math utilities for the canvas drawing editor — bounds calculation, hit-testing, resize, rotate, and polygon operations.",
  "Interpolation": "Animation interpolation engine — calculates player positions between keyframes during playback using linear interpolation.",
  "Import / Export": "Play file serialization — building export JSON, validating imports, and verifying data survives the round trip.",
  "Animation Schema": "Animation data structure utilities — keyframe sorting, track normalization, upsert/delete operations, and deep cloning.",
  "Routes": "Route guards, auth recovery, public share links, and critical login/onboarding/save flows against real route contracts.",
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, valueStyle }) {
  return (
    <div className="flex flex-col rounded-[var(--adm-radius)] px-5 py-4" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--adm-muted)" }}>{label}</span>
      <span className="mt-1 font-Manrope text-2xl font-bold" style={valueStyle || { color: "var(--adm-text)" }}>{value}</span>
      {sub && <span className="mt-0.5 text-xs" style={{ color: "var(--adm-muted)" }}>{sub}</span>}
    </div>
  );
}

function TestRow({ result, isExpanded, onToggle }) {
  const hasDesc = Boolean(result.description);
  return (
    <div style={result.status === "fail" ? { backgroundColor: "rgba(239,68,68,0.04)" } : {}}>
      <div
        className={`flex items-center gap-3 px-4 py-2.5 text-sm ${hasDesc ? "cursor-pointer" : ""}`}
        onClick={hasDesc ? onToggle : undefined}
      >
        <div className="shrink-0">
          {result.status === "pass" ? (
            <svg className="h-4 w-4" style={{ color: "var(--adm-success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4" style={{ color: "var(--adm-danger)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span style={{ color: "var(--adm-text)" }}>{result.testName}</span>
          <span className="ml-2 text-[11px]" style={{ color: "var(--adm-muted)" }}>{result.suiteName}</span>
        </div>
        <span className="shrink-0 rounded px-2 py-0.5 font-mono text-[11px]" style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-muted)" }}>
          {result.durationMs < 1
            ? `${(result.durationMs * 1000).toFixed(0)}μs`
            : `${result.durationMs.toFixed(1)}ms`}
        </span>
        {hasDesc && (
          <svg
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            style={{ color: "var(--adm-muted)" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
      {isExpanded && hasDesc && (
        <div className="mx-4 mb-3 mt-0 rounded-[var(--adm-radius-sm)] px-4 py-3" style={{ border: "1px solid var(--adm-border)", backgroundColor: "var(--adm-bg)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "var(--adm-muted)" }}>{result.description}</p>
        </div>
      )}
      {result.error && (
        <div className="mx-4 mb-3 mt-0">
          <pre className="whitespace-pre-wrap rounded-[var(--adm-radius-sm)] px-4 py-3 font-mono text-xs leading-relaxed" style={{ backgroundColor: "var(--adm-danger-dim)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--adm-color-red-soft)" }}>
            {result.error}
          </pre>
        </div>
      )}
    </div>
  );
}

function SuiteCheckbox({ name, checked, onChange, testCount }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <div
        className="flex h-4 w-4 items-center justify-center rounded border transition"
        style={checked
          ? { borderColor: "var(--adm-accent)", backgroundColor: "var(--adm-accent)" }
          : { borderColor: "var(--adm-border2)", backgroundColor: "transparent" }}
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
      >
        {checked && (
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span className="text-xs transition" style={{ color: "var(--adm-text)" }}>{name}</span>
      <span className="text-[10px]" style={{ color: "var(--adm-muted)" }}>{testCount}</span>
    </label>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AdminTests() {
  const { basePath } = useAdmin();
  const [allSuites, setAllSuites] = useState(null);
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedTests, setExpandedTests] = useState(new Set());
  const [collapsedSuites, setCollapsedSuites] = useState(new Set());
  const [enabledSuites, setEnabledSuites] = useState(() => new Set(SUITE_NAMES));
  const runAllSuitesRef = useRef(null);
  const startTimeRef = useRef(0);
  const [totalMs, setTotalMs] = useState(0);

  useEffect(() => {
    Promise.all([
      import("../testing/testRunner"),
      import("../testing/suites/drawingGeometry.suite"),
      import("../testing/suites/interpolate.suite"),
      import("../testing/suites/importExport.suite"),
      import("../testing/suites/animationSchema.suite"),
      import("../testing/suites/routes.suite"),
    ]).then(([runner, drawingGeometry, interpolation, importExport, animationSchema, routes]) => {
      runAllSuitesRef.current = runner.runAllSuites;
      setAllSuites({
        "Drawing Geometry": drawingGeometry.default,
        "Interpolation": interpolation.default,
        "Import / Export": importExport.default,
        "Animation Schema": animationSchema.default,
        "Routes": routes.default,
      });
    }).catch((err) => console.error("Failed to load test suites:", err));
  }, []);

  const toggleSuiteEnabled = useCallback((name, enabled) => {
    setEnabledSuites((prev) => {
      const next = new Set(prev);
      enabled ? next.add(name) : next.delete(name);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setEnabledSuites(new Set(SUITE_NAMES)), []);
  const selectNone = useCallback(() => setEnabledSuites(new Set()), []);

  const selectedSuiteMap = useMemo(() => {
    if (!allSuites) return {};
    const map = {};
    for (const name of enabledSuites) {
      if (allSuites[name]) map[name] = allSuites[name];
    }
    return map;
  }, [allSuites, enabledSuites]);

  const selectedTestCount = useMemo(
    () => Object.values(selectedSuiteMap).reduce((n, s) => n + s.length, 0),
    [selectedSuiteMap]
  );

  const runSelected = useCallback(async () => {
    if (enabledSuites.size === 0 || !runAllSuitesRef.current) return;
    setRunning(true);
    setResults(null);
    setExpandedTests(new Set());
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    startTimeRef.current = performance.now();
    try {
      const suiteResults = await runAllSuitesRef.current(selectedSuiteMap);
      setResults(suiteResults);
      setTotalMs(performance.now() - startTimeRef.current);
    } catch (err) {
      console.error("Test runner error:", err);
    } finally {
      setRunning(false);
    }
  }, [selectedSuiteMap, enabledSuites.size]);

  const toggleTest = useCallback((key) => {
    setExpandedTests((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const toggleSuiteCollapse = useCallback((name) => {
    setCollapsedSuites((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    if (!results) return { total: 0, passed: 0, failed: 0, avgMs: 0 };
    let total = 0, passed = 0, failed = 0, sumMs = 0;
    for (const suite of results) {
      for (const r of suite.results) {
        total++;
        sumMs += r.durationMs;
        if (r.status === "pass") passed++;
        else failed++;
      }
    }
    return { total, passed, failed, avgMs: total > 0 ? sumMs / total : 0 };
  }, [results]);
  const failedTestsReport = useMemo(() => formatFailedTestsReport(results), [results]);

  // Filter + search
  const searchLower = search.toLowerCase();
  const filteredSuites = useMemo(() => {
    if (!results) return [];
    return results.map((suite) => {
      const filtered = suite.results.filter((r) => {
        if (filter !== "all" && r.status !== filter) return false;
        if (searchLower) {
          const haystack = `${r.suiteName} ${r.testName} ${r.description || ""} ${suite.name}`.toLowerCase();
          return haystack.includes(searchLower);
        }
        return true;
      });
      return { ...suite, filteredResults: filtered };
    }).filter((s) => s.filteredResults.length > 0);
  }, [results, filter, searchLower]);

  const totalRegistered = allSuites
    ? Object.values(allSuites).reduce((n, s) => n + s.length, 0)
    : 0;
  const copyToClipboard = useCallback((text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  }, []);

  return (
    <AdminShell>
      <AdminHeader
        title="Tests"
        backLabel="Dashboard"
        backTo={adminPath(basePath, "")}
        actions={
          <AdminBtn
            variant="primary"
            onClick={runSelected}
            disabled={running || enabledSuites.size === 0 || !allSuites}
          >
            {running ? (
              <span className="flex items-center gap-2"><AdminSpinner size={12} /> Running...</span>
            ) : !allSuites ? "Loading suites..."
              : enabledSuites.size === SUITE_NAMES.length ? "Run All Tests"
              : `Run ${enabledSuites.size} Suite${enabledSuites.size !== 1 ? "s" : ""}`}
          </AdminBtn>
        }
      />

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Dashboard stats */}
        {results ? (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Status"
                value={stats.failed === 0 ? "ALL PASS" : "FAILING"}
                valueStyle={{ color: stats.failed === 0 ? "var(--adm-success)" : "var(--adm-danger)" }}
                sub={`${totalMs.toFixed(0)}ms total`}
              />
              <StatCard label="Total Tests" value={stats.total} sub={`${results.length} suite${results.length !== 1 ? "s" : ""} run`} />
              <StatCard label="Passed" value={stats.passed} valueStyle={{ color: "var(--adm-success)" }} sub={`${stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(0) : 0}% pass rate`} />
              <StatCard
                label={stats.failed > 0 ? "Failed" : "Avg Time"}
                value={stats.failed > 0 ? stats.failed : `${stats.avgMs < 1 ? (stats.avgMs * 1000).toFixed(0) + "μs" : stats.avgMs.toFixed(1) + "ms"}`}
                valueStyle={{ color: stats.failed > 0 ? "var(--adm-danger)" : "var(--adm-muted)" }}
                sub={stats.failed > 0 ? "needs attention" : "per test"}
              />
            </div>
            {stats.failed > 0 && failedTestsReport && (
              <div className="mb-5 flex justify-end">
                <AdminBtn variant="danger" size="sm" onClick={() => copyToClipboard(failedTestsReport, "all-failed-tests")}>
                  {copied === "all-failed-tests" ? "Copied!" : "Copy Failed Tests"}
                </AdminBtn>
              </div>
            )}

            {/* Suite selector + Search + Filter */}
            <div className="mb-5 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-4 rounded-[var(--adm-radius-sm)] px-4 py-3" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--adm-muted)" }}>Suites</span>
                {SUITE_NAMES.map((name) => (
                  <SuiteCheckbox
                    key={name}
                    name={name}
                    checked={enabledSuites.has(name)}
                    onChange={(v) => toggleSuiteEnabled(name, v)}
                    testCount={allSuites?.[name]?.length ?? "..."}
                  />
                ))}
                <div className="ml-auto flex gap-2 text-[11px]">
                  <button onClick={selectAll} className="transition" style={{ color: "var(--adm-muted)" }}>All</button>
                  <span style={{ color: "var(--adm-border2)" }}>|</span>
                  <button onClick={selectNone} className="transition" style={{ color: "var(--adm-muted)" }}>None</button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--adm-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tests by name, suite, or keyword..."
                    className="w-full rounded-[var(--adm-radius-sm)] py-2.5 pl-10 pr-4 text-sm outline-none"
                    style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-muted)" }}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex gap-1 rounded-[var(--adm-radius-sm)] p-1" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                  {[
                    { key: "all", label: "All", count: stats.total },
                    { key: "pass", label: "Passed", count: stats.passed },
                    { key: "fail", label: "Failed", count: stats.failed },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className="rounded px-3 py-1.5 text-xs font-semibold transition"
                      style={filter === f.key
                        ? f.key === "fail" ? { backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }
                          : f.key === "pass" ? { backgroundColor: "var(--adm-badge-green-bg)", color: "var(--adm-success)" }
                          : { backgroundColor: "var(--adm-surface3)", color: "var(--adm-text)" }
                        : { color: "var(--adm-muted)" }}
                    >
                      {f.label}
                      {f.count > 0 && <span className="ml-1.5 opacity-60">{f.count}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {search && (
              <p className="mb-3 text-xs" style={{ color: "var(--adm-muted)" }}>
                {filteredSuites.reduce((n, s) => n + s.filteredResults.length, 0)} results for &ldquo;{search}&rdquo;
              </p>
            )}
          </>
        ) : !running ? (
          /* Empty state */
          <div className="mt-12">
            <div className="text-center">
              <div
                className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}
              >
                <svg className="h-10 w-10" style={{ color: "var(--adm-text2)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
              </div>
              <h3 className="font-Manrope text-lg font-bold" style={{ color: "var(--adm-text)" }}>Test Dashboard</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--adm-text2)" }}>{SUITE_NAMES.length} suites with {totalRegistered} tests ready to run</p>
              <p className="mt-1 text-xs" style={{ color: "var(--adm-muted)" }}>Select which suites to run, then hit the button</p>
            </div>

            {/* Suite selector cards */}
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SUITE_NAMES.map((name) => {
                const checked = enabledSuites.has(name);
                return (
                  <div
                    key={name}
                    onClick={() => toggleSuiteEnabled(name, !checked)}
                    className="cursor-pointer rounded-[var(--adm-radius)] p-4 transition"
                    style={checked
                      ? { border: "1px solid var(--adm-accent)", backgroundColor: "var(--adm-accent-dim)" }
                      : { border: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)", boxShadow: "var(--adm-shadow-sm)" }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-Manrope text-sm font-bold" style={{ color: "var(--adm-text)" }}>{name}</h4>
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded border transition"
                        style={checked
                          ? { borderColor: "var(--adm-accent)", backgroundColor: "var(--adm-accent)" }
                          : { borderColor: "var(--adm-border2)" }}
                      >
                        {checked && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--adm-muted)" }}>{SUITE_DESCRIPTIONS[name]}</p>
                    <p className="mt-2 text-xs" style={{ color: "var(--adm-muted)" }}>{allSuites?.[name]?.length ?? "..."} tests</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-center gap-4">
              <div className="flex gap-2 text-xs">
                <button onClick={selectAll} className="transition" style={{ color: "var(--adm-muted)" }}>Select All</button>
                <span style={{ color: "var(--adm-border2)" }}>|</span>
                <button onClick={selectNone} className="transition" style={{ color: "var(--adm-muted)" }}>Select None</button>
              </div>
              <AdminBtn variant="primary" onClick={runSelected} disabled={enabledSuites.size === 0}>
                {enabledSuites.size === SUITE_NAMES.length
                  ? `Run All ${totalRegistered} Tests`
                  : enabledSuites.size === 0 ? "Select suites to run"
                  : `Run ${selectedTestCount} Tests (${enabledSuites.size} suite${enabledSuites.size !== 1 ? "s" : ""})`}
              </AdminBtn>
            </div>
          </div>
        ) : (
          <div className="mt-20 flex flex-col items-center">
            <AdminSpinner size={48} />
            <p className="mt-5 font-Manrope text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Running {selectedTestCount} tests across {enabledSuites.size} suite{enabledSuites.size !== 1 ? "s" : ""}...</p>
            <p className="mt-1 text-xs" style={{ color: "var(--adm-muted)" }}>This usually takes less than a second</p>
          </div>
        )}

        {/* Suite results */}
        {filteredSuites.map((suite) => {
          const suitePass = suite.results.filter((r) => r.status === "pass").length;
          const suiteFail = suite.results.filter((r) => r.status === "fail").length;
          const isCollapsed = collapsedSuites.has(suite.name);
          const suiteTotal = suite.results.length;
          const passRate = suiteTotal > 0 ? Math.round((suitePass / suiteTotal) * 100) : 0;

          return (
            <div key={suite.name} className="mb-4 overflow-hidden rounded-[var(--adm-radius)]" style={{ border: "1px solid var(--adm-border)" }}>
              <div
                className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors"
                style={{ backgroundColor: "var(--adm-surface2)" }}
                onClick={() => toggleSuiteCollapse(suite.name)}
              >
                <div className="flex items-center gap-3">
                  <svg className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} style={{ color: "var(--adm-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: suiteFail === 0 ? "var(--adm-success)" : "var(--adm-danger)" }} />
                  <div>
                    <span className="font-Manrope text-sm font-bold" style={{ color: "var(--adm-text)" }}>{suite.name}</span>
                    <span className="ml-3 text-[11px]" style={{ color: "var(--adm-muted)" }}>{SUITE_DESCRIPTIONS[suite.name]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="hidden items-center gap-2 sm:flex">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ backgroundColor: "var(--adm-border2)" }}>
                      <div className="h-full rounded-full" style={{ width: `${passRate}%`, backgroundColor: suiteFail === 0 ? "var(--adm-success)" : "var(--adm-danger)" }} />
                    </div>
                    <span style={{ color: "var(--adm-muted)" }}>{passRate}%</span>
                  </div>
                  <span style={{ color: "var(--adm-success)" }}>{suitePass}</span>
                  {suiteFail > 0 && <span style={{ color: "var(--adm-danger)" }}>{suiteFail}</span>}
                  <span className="font-mono" style={{ color: "var(--adm-muted)" }}>{suite.totalMs.toFixed(1)}ms</span>
                </div>
              </div>

              {!isCollapsed && (
                <div style={{ borderTop: "1px solid var(--adm-border)" }}>
                  {suite.filteredResults.map((r, i) => {
                    const key = `${suite.name}-${i}`;
                    return (
                      <div key={key} style={i > 0 ? { borderTop: "1px solid var(--adm-border)" } : {}}>
                        <TestRow
                          result={r}
                          isExpanded={expandedTests.has(key)}
                          onToggle={() => toggleTest(key)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {results && filteredSuites.length === 0 && (
          <div className="mt-10 text-center">
            <p className="text-sm" style={{ color: "var(--adm-muted)" }}>No tests match your current filter</p>
            <button onClick={() => { setFilter("all"); setSearch(""); }} className="mt-2 text-xs transition hover:opacity-70" style={{ color: "var(--adm-accent)" }}>
              Clear filters
            </button>
          </div>
        )}

        <div className="h-8" />
      </div>
    </AdminShell>
  );
}
