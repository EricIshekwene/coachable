function formatDuration(durationMs) {
  if (durationMs < 1) return `${(durationMs * 1000).toFixed(0)}us`;
  return `${durationMs.toFixed(1)}ms`;
}

export function formatFailedTestsReport(suites) {
  const failures = [];

  for (const suite of suites || []) {
    for (const result of suite.results || []) {
      if (result.status !== "fail") continue;

      failures.push(
        [
          `[${suite.name}] ${result.testName}`,
          result.suiteName ? `Group: ${result.suiteName}` : null,
          result.description ? `Description: ${result.description}` : null,
          `Duration: ${formatDuration(result.durationMs)}`,
          `Error:\n${result.error || "Unknown failure"}`,
        ].filter(Boolean).join("\n")
      );
    }
  }

  if (failures.length === 0) return "";

  return [`Failed tests: ${failures.length}`, ...failures].join("\n\n---\n\n");
}
