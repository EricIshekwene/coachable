/**
 * Client-side error reporting utility.
 * Captures errors and sends structured reports to the backend for admin review.
 *
 * @module errorReporter
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const IS_DEV = Boolean(import.meta.env.DEV);

let _userId = null;
let _sessionId = null;

// Generate a unique session ID for this browser tab.
try {
  _sessionId = crypto.randomUUID();
} catch {
  _sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Deduplication map: stable fingerprint -> { count, firstSentAt, lastSeenAt }.
 * Identical errors within DEDUP_WINDOW_MS are collapsed into a single report.
 * @type {Map<string, { count: number, firstSentAt: number, lastSeenAt: number }>}
 */
const _dedup = new Map();
const DEDUP_WINDOW_MS = 10_000;
const GLOBAL_THROTTLE_WINDOW_MS = 10_000;
const GLOBAL_THROTTLE_MAX_REPORTS = 5;
const _globalReportTimestamps = [];
const GLOBAL_IGNORED_MESSAGES = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
];

function normalizeErrorMessage(value) {
  const normalized = String(value ?? "")
    .replace(/^Uncaught\s+/i, "")
    .replace(/^Unhandled(?:\s+promise)?\s+rejection:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || "Unknown error";
}

function normalizeRoutePath(value) {
  const raw = String(value || "");
  const pathOnly = raw.split("?")[0].split("#")[0];
  return pathOnly
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .replace(/\/[A-Za-z0-9_-]{16,}(?=\/|$)/g, "/:id");
}

function buildDedupKey({ component, action, errorMessage, errorStack }) {
  const normalizedMessage = normalizeErrorMessage(
    errorMessage || String(errorStack || "").split("\n")[0]
  );
  return `${component || "unknown"}::${action || "unknown"}::${normalizedMessage}`;
}

function pruneDedupEntries(now = Date.now()) {
  for (const [key, entry] of _dedup.entries()) {
    if (now - entry.lastSeenAt >= DEDUP_WINDOW_MS * 2) {
      _dedup.delete(key);
    }
  }
}

function shouldThrottleGlobalReport(now = Date.now()) {
  while (_globalReportTimestamps.length && now - _globalReportTimestamps[0] >= GLOBAL_THROTTLE_WINDOW_MS) {
    _globalReportTimestamps.shift();
  }
  if (_globalReportTimestamps.length >= GLOBAL_THROTTLE_MAX_REPORTS) {
    return true;
  }
  _globalReportTimestamps.push(now);
  return false;
}

function shouldIgnoreGlobalError(message) {
  const normalizedMessage = normalizeErrorMessage(message).toLowerCase();
  if (!normalizedMessage) return true;
  return GLOBAL_IGNORED_MESSAGES.some((entry) => normalizedMessage.includes(entry.toLowerCase()));
}

/**
 * Gather device/browser info from the current environment.
 * @returns {{ platform: string, screenWidth: number, screenHeight: number, pixelRatio: number, isMobile: boolean, standalone: boolean }}
 */
function getDeviceInfo() {
  try {
    return {
      platform: navigator?.platform || "unknown",
      screenWidth: typeof screen !== "undefined" ? screen.width : 0,
      screenHeight: typeof screen !== "undefined" ? screen.height : 0,
      pixelRatio: window?.devicePixelRatio || 1,
      isMobile: /iPhone|iPad|iPod|Android/i.test(navigator?.userAgent || ""),
      standalone: window?.matchMedia?.("(display-mode: standalone)")?.matches || false,
    };
  } catch {
    return {
      platform: "unknown",
      screenWidth: 0,
      screenHeight: 0,
      pixelRatio: 1,
      isMobile: false,
      standalone: false,
    };
  }
}

/**
 * Set the current user ID for error reports. Call this when the user logs in.
 * @param {string|null} userId - The authenticated user's UUID, or null on logout
 */
export function setErrorReporterUserId(userId) {
  _userId = userId;
}

/**
 * Send an error report to the backend.
 * Fire-and-forget: never throws, never blocks the UI.
 *
 * @param {Object} opts
 * @param {string} opts.errorMessage - Human-readable error description
 * @param {string} [opts.errorStack] - Stack trace if available
 * @param {string} [opts.component] - Component or module name (for example "videoExport")
 * @param {string} [opts.action] - What the user was doing (for example "exportVideo")
 * @param {Object} [opts.extra] - Additional structured context
 */
export function reportError({ errorMessage, errorStack, component, action, extra }) {
  try {
    const normalizedMessage = normalizeErrorMessage(errorMessage);
    const now = Date.now();

    pruneDedupEntries(now);

    const dedupKey = buildDedupKey({
      component,
      action,
      errorMessage: normalizedMessage,
      errorStack,
    });
    const existing = _dedup.get(dedupKey);
    if (existing && now - existing.firstSentAt < DEDUP_WINDOW_MS) {
      existing.count += 1;
      existing.lastSeenAt = now;
      return;
    }

    const occurrences = existing ? existing.count : 0;
    _dedup.set(dedupKey, { count: 1, firstSentAt: now, lastSeenAt: now });

    const body = {
      errorMessage: normalizedMessage,
      errorStack: errorStack || null,
      component: component || null,
      action: action || null,
      pageUrl: typeof window !== "undefined"
        ? window.location?.pathname?.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id").replace(/\/\d+/g, "/:id")
        : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      deviceInfo: getDeviceInfo(),
      extra: {
        ...(extra || {}),
        ...(occurrences > 1 ? { previousWindowOccurrences: occurrences } : {}),
      },
      userId: _userId,
      sessionId: _sessionId,
    };

    fetch(`${API_URL}/error-reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {
      // Silently ignore. Reporting failures should never recurse.
    });
  } catch {
    // Never throw from the error reporter.
  }
}

/**
 * Report a backend or route-level API failure in a consistent format.
 *
 * @param {Object} opts
 * @param {string} opts.path
 * @param {string} [opts.method]
 * @param {number|null} [opts.status]
 * @param {string} opts.errorMessage
 * @param {string|null} [opts.errorStack]
 * @param {Object} [opts.extra]
 */
export function reportApiError({ path, method = "GET", status = null, errorMessage, errorStack = null, extra = {} }) {
  reportError({
    errorMessage,
    errorStack,
    component: "api",
    action: `${String(method || "GET").toUpperCase()} ${normalizeRoutePath(path || "/")}`,
    extra: {
      status,
      ...extra,
    },
  });
}

/**
 * Install global error handlers (window.onerror + unhandledrejection).
 * Call once at app startup. Safe to call multiple times.
 */
let _installed = false;
export function installGlobalErrorHandlers() {
  if (_installed || IS_DEV) return;
  _installed = true;

  window.addEventListener("error", (event) => {
    if (shouldThrottleGlobalReport()) return;
    if (shouldIgnoreGlobalError(event.message)) return;
    reportError({
      errorMessage: normalizeErrorMessage(event.message),
      errorStack: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
      component: "global",
      action: "uncaughtError",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (shouldThrottleGlobalReport()) return;
    const err = event.reason;
    const message = normalizeErrorMessage(err?.message || String(err));
    if (shouldIgnoreGlobalError(message)) return;
    reportError({
      errorMessage: message,
      errorStack: err?.stack || null,
      component: "global",
      action: "unhandledRejection",
    });
  });
}

export function __resetErrorReporterForTests() {
  _userId = null;
  _dedup.clear();
  _globalReportTimestamps.length = 0;
}
