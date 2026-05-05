import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import ConfirmModal from "../components/subcomponents/ConfirmModal";
import { formatFailedTestsReport } from "../testing/formatFailedTestsReport";
import {
  isAdminElevated,
  getAdminElevatedUntil,
  setAdminElevated,
  clearAdminElevated,
} from "../utils/adminElevation";
import { useAdmin } from "../admin/AdminContext";
import { adminPath } from "../admin/adminNav";
import AnalyticsDashboard from "../admin/analytics/AnalyticsDashboard";
import ActivityFeed from "../admin/analytics/ActivityFeed";
import { useDashboardAnalytics } from "../admin/analytics/useDashboardAnalytics";
import {
  AdminShell,
  AdminHeader,
  AdminPage,
  AdminCard,
  AdminSection,
  AdminBtn,
  AdminInput,
  AdminSelect,
  AdminCheckbox,
  AdminModal,
  AdminBadge,
  AdminEmptyState,
  AdminSpinner,
} from "../admin/components";

const SESSION_KEY = "coachable_admin_session";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const USER_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ── Test suite registry (names/descriptions only — suites loaded lazily) ──
const SUITE_NAMES = ["Drawing Geometry", "Interpolation", "Import / Export", "Animation Schema", "Routes"];
const SUITE_DESCRIPTIONS = {
  "Drawing Geometry": "Bounds, hit-testing, resize/rotate math",
  "Interpolation": "Player positions between keyframes",
  "Import / Export": "Play file serialization round-trip",
  "Animation Schema": "Keyframe sorting, track normalization",
  "Routes": "Route guards, auth recovery, public links, and critical login/onboarding/save flows",
};

// ── Error report helpers ───────────────────────────────────────────────────
function parseDevice(ua) {
  if (!ua) return "Unknown";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android.*Mobile/.test(ua)) return "Android Phone";
  if (/Android/.test(ua)) return "Android Tablet";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return ua.slice(0, 40);
}
function formatTime(ts) {
  const d = new Date(ts);
  const diffMin = Math.floor((Date.now() - d) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}
function deriveTitle(r) {
  const msg = (r.error_message || "").toLowerCase();
  const component = (r.component || "").toLowerCase();
  const action = (r.action || "").toLowerCase();
  const extra = r.extra || {};
  if (component === "api") {
    if (extra.kind === "network" || msg.includes("could not reach the server")) return "Backend Connection Failure";
    if (action.includes("/auth/login")) return "Login Route Failure";
    if (action.includes("/onboarding")) return "Onboarding Route Failure";
    if (action.includes("/teams/") && action.includes("/plays")) return "Play Save Route Failure";
    if (extra.status >= 500) return `Backend ${extra.status} Error`;
    return "API Route Failure";
  }
  if (component === "videoexport" || action.includes("export")) {
    if (msg.includes("encoding") || msg.includes("encoder")) return "Video Export — Encoding Failed";
    if (msg.includes("muxer") || msg.includes("finalize") || msg.includes("colorspace")) return "Video Export — MP4 Muxer Crash";
    if (msg.includes("resolution") || msg.includes("dimension")) return "Video Export — Resolution Error";
    if (msg.includes("mediarecorder")) return "Video Export — MediaRecorder Fallback Failed";
    return "Video Export Fail";
  }
  if (component === "global") {
    if (action === "unhandledrejection") return "Unhandled Promise Rejection";
    if (msg.includes("network") || msg.includes("fetch")) return "Network Error";
    if (msg.includes("syntax")) return "Syntax Error";
    if (msg.includes("type")) return "Type Error";
    return "Uncaught Error";
  }
  if (component) return `${component.charAt(0).toUpperCase() + component.slice(1)} Error`;
  return "Unknown Error";
}

/**
 * Format a single error report as a copyable text string.
 * @param {Object} r - Error report
 * @returns {string}
 */
function formatReportText(r) {
  const device = r.device_info || {};
  const lines = [
    `[${deriveTitle(r)}]`,
    `Error: ${r.error_message}`,
    `Component: ${r.component || "unknown"} | Action: ${r.action || "—"}`,
    `Device: ${parseDevice(r.user_agent)} | ${device.screenWidth || "?"}x${device.screenHeight || "?"} @${device.pixelRatio || 1}x`,
    `Page: ${r.page_url || "—"}`,
    `Time: ${r.created_at ? new Date(r.created_at).toLocaleString() : "—"}`,
  ];
  if (r.extra && Object.keys(r.extra).length > 0) lines.push(`Extra: ${JSON.stringify(r.extra)}`);
  if (r.error_stack) lines.push(`Stack:\n${r.error_stack}`);
  return lines.join("\n");
}

function formatRole(role) {
  if (!role) return "Unknown";
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getUserInitials(name, email) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map((part) => part[0]).join("").toUpperCase();
}

function formatAdminDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSortedMemberships(memberships = []) {
  const rolePriority = {
    owner: 0,
    coach: 1,
    assistant_coach: 2,
    player: 3,
  };
  return [...memberships].sort((a, b) => {
    const roleDelta = (rolePriority[a.role] ?? 99) - (rolePriority[b.role] ?? 99);
    if (roleDelta !== 0) return roleDelta;
    return new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime();
  });
}

/**
 * Recent Activity section — displayed at the bottom of the admin dashboard.
 * @param {{ session: string }} props
 */
function RecentActivitySection({ session }) {
  const { data, loading, error } = useDashboardAnalytics({ session, period: "30d" });

  if (loading && !data) {
    return (
      <section id="recent-activity" style={{ scrollMarginTop: "4rem" }}>
        <AdminSection title="Recent Activity">
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px" }}>
            <AdminSpinner />
          </div>
        </AdminSection>
      </section>
    );
  }

  if (error) {
    return (
      <section id="recent-activity" style={{ scrollMarginTop: "4rem" }}>
        <AdminSection title="Recent Activity">
          <div style={{ color: "var(--adm-danger)", fontSize: 13 }}>
            Failed to load recent activity: {error}
          </div>
        </AdminSection>
      </section>
    );
  }

  return (
    <section id="recent-activity" style={{ scrollMarginTop: "4rem" }}>
      <AdminSection title="Recent Activity">
        {data && (
          <AdminCard>
            <ActivityFeed
              users={data.recentUsers}
              errors={data.recentErrors}
              issues={data.recentIssues}
            />
          </AdminCard>
        )}
      </AdminSection>
    </section>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Admin() {
  const navigate = useNavigate();
  const { basePath } = useAdmin();
  // ── Auth ──
  const [session, setSession] = useState(() => sessionStorage.getItem(SESSION_KEY) || "");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [logging, setLogging] = useState(false);
  const [cookieChecking, setCookieChecking] = useState(!sessionStorage.getItem(SESSION_KEY));
  const authed = Boolean(session);

  // Auto-login via admin_sid cookie if no session in sessionStorage
  useEffect(() => {
    if (session) { setCookieChecking(false); return; }
    fetch(`${API_URL}/admin/session`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.session) {
          sessionStorage.setItem(SESSION_KEY, data.session);
          setSession(data.session);
        }
      })
      .catch(() => {})
      .finally(() => setCookieChecking(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Users ──
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", teamName: "", sport: "" });
  const [creating, setCreating] = useState(false);
  const [usersSearch, setUsersSearch] = useState("");
  const [hideOptions, setHideOptions] = useState(() => new Set(["demo", "player"]));
  const [hideDropdownOpen, setHideDropdownOpen] = useState(false);
  const hideDropdownRef = useRef(null);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [filterRole, setFilterRole] = useState(""); // "coach"|"owner"|"assistant_coach"|"player"|""
  const [filterVerified, setFilterVerified] = useState(""); // "verified"|"unverified"|""
  const [filterOnboarded, setFilterOnboarded] = useState(""); // "yes"|"no"|""
  const [filterPlays, setFilterPlays] = useState("");
  const [filterPlaysOp, setFilterPlaysOp] = useState(">");
  const [emailCopied, setEmailCopied] = useState(null); // "outlook"|"gmail"|null

  // ── Tests ──
  const [testResults, setTestResults] = useState(null);
  const [testRunning, setTestRunning] = useState(false);
  const [allSuites, setAllSuites] = useState(null); // lazily loaded to avoid circular deps
  const runAllSuitesRef = useRef(null);
  const [enabledSuites, setEnabledSuites] = useState(() => new Set(SUITE_NAMES));
  const [expandedTests, setExpandedTests] = useState(new Set());
  const [collapsedSuites, setCollapsedSuites] = useState(new Set());
  const testStartRef = useRef(0);
  const [testTotalMs, setTestTotalMs] = useState(0);

  // ── Platform Plays ──
  const [, setPlatformPlays] = useState([]);
  const [playsLoading, setPlaysLoading] = useState(false);
  const [, setPlaysError] = useState("");

  // ── Errors ──
  const [errors, setErrors] = useState([]);
  const [errorTotal, setErrorTotal] = useState(0);
  const [errorsLoading, setErrorsLoading] = useState(false);
  const [errorsError, setErrorsError] = useState("");
  const [expandedError, setExpandedError] = useState(null);
  const [copied, setCopied] = useState(null);

  // ── User Issues ──
  const [userIssues, setUserIssues] = useState([]);
  const [userIssueTotal, setUserIssueTotal] = useState(0);
  const [userIssuesLoading, setUserIssuesLoading] = useState(false);
  const [userIssuesError, setUserIssuesError] = useState("");
  const [expandedIssue, setExpandedIssue] = useState(null);

  // ── Confirm modal ──
  const [confirmModal, setConfirmModal] = useState({ open: false });
  const confirmResolveRef = useRef(null);

  // ── Danger Mode (elevated permissions) ──
  const [elevatedUntil, setElevatedUntil] = useState(() => getAdminElevatedUntil());
  const [elevateModal, setElevateModal] = useState(false);
  const [elevatePassword, setElevatePassword] = useState("");
  const [elevateError, setElevateError] = useState("");
  const [elevating, setElevating] = useState(false);
  const elevateResolveRef = useRef(null);
  // Tick every second so the countdown display stays live
  useEffect(() => {
    const id = setInterval(() => {
      const until = getAdminElevatedUntil();
      setElevatedUntil(until);
      if (until && Date.now() > until) {
        clearAdminElevated();
        setElevatedUntil(0);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /**
   * Open a confirmation modal and return a promise that resolves to
   * true (confirmed) or false (cancelled).
   * @param {Object} opts - Modal options forwarded to ConfirmModal
   */
  const openConfirm = useCallback((opts) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmModal({ open: true, ...opts });
    });
  }, []);

  const handleConfirmOk = () => {
    setConfirmModal({ open: false });
    confirmResolveRef.current?.(true);
  };

  const handleConfirmCancel = () => {
    setConfirmModal({ open: false });
    confirmResolveRef.current?.(false);
  };

  const handleElevateCancel = () => {
    setElevateModal(false);
    setElevatePassword("");
    setElevateError("");
    elevateResolveRef.current?.(false);
  };

  // ── Admin fetch helper ──
  const adminFetch = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "x-admin-session": session,
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      if (res.status === 401) {
        sessionStorage.removeItem(SESSION_KEY);
        setSession("");
        throw new Error("Session expired");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
    [session]
  );

  // ── Auth ──
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLogging(true);
    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Invalid password");
      sessionStorage.setItem(SESSION_KEY, data.session);
      setSession(data.session);
      setPassword("");
    } catch (err) {
      setLoginError(err.message || "Invalid password");
    } finally {
      setLogging(false);
    }
  };

  const handleLogout = () => {
    fetch(`${API_URL}/admin/logout`, { method: "POST", credentials: "include", headers: { "x-admin-session": session } }).catch(() => {});
    sessionStorage.removeItem(SESSION_KEY);
    clearAdminElevated();
    setElevatedUntil(0);
    setSession("");
    setUsers([]);
  };

  /**
   * Submit the elevation password to enter Danger Mode.
   * Resolves the pending ensureElevated promise on success.
   * @param {React.FormEvent} e
   */
  const handleElevate = async (e) => {
    e.preventDefault();
    setElevateError("");
    setElevating(true);
    try {
      const res = await fetch(`${API_URL}/admin/elevate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-session": session },
        body: JSON.stringify({ password: elevatePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Elevation failed");
      setAdminElevated(data.elevatedUntil);
      setElevatedUntil(data.elevatedUntil);
      setElevatePassword("");
      setElevateModal(false);
      elevateResolveRef.current?.(true);
    } catch (err) {
      setElevateError(err.message || "Invalid password");
    } finally {
      setElevating(false);
    }
  };

  /**
   * Ensure Danger Mode is active before a destructive action.
   * If already elevated, resolves immediately. Otherwise shows the elevation modal.
   * @returns {Promise<boolean>} true if elevated, false if cancelled
   */
  const ensureElevated = useCallback(() => {
    if (isAdminElevated()) return Promise.resolve(true);
    return new Promise((resolve) => {
      elevateResolveRef.current = resolve;
      setElevatePassword("");
      setElevateError("");
      setElevateModal(true);
    });
  }, []);

  // ── Users ──
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const data = await adminFetch("/admin/users");
      setUsers(data.users || []);
    } catch (err) {
      setUsersError(err.message);
    } finally {
      setUsersLoading(false);
    }
  }, [adminFetch]);

  const handleDeleteUser = async (id, name) => {
    const elevated = await ensureElevated();
    if (!elevated) return;
    const ok = await openConfirm({ message: `Delete "${name}"?`, subtitle: "This cannot be undone.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      await adminFetch(`/admin/users/${id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setUsersError(err.message);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setUsersError("");
    setCreating(true);
    try {
      await adminFetch("/admin/create-account", { method: "POST", body: createForm });
      setCreateForm({ name: "", email: "", password: "", teamName: "", sport: "" });
      setShowCreate(false);
      fetchUsers();
    } catch (err) {
      setUsersError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAll = async () => {
    const elevated = await ensureElevated();
    if (!elevated) return;
    const ok1 = await openConfirm({ message: "Delete ALL users?", subtitle: "This cannot be undone!", confirmLabel: "Delete All", danger: true });
    if (!ok1) return;
    const ok2 = await openConfirm({ message: "Are you absolutely sure?", subtitle: "ALL accounts will be permanently deleted.", confirmLabel: "Yes, Delete All", danger: true });
    if (!ok2) return;
    try {
      await adminFetch("/admin/users", { method: "DELETE" });
      setUsers([]);
    } catch (err) {
      setUsersError(err.message);
    }
  };

  const handleToggleBetaTester = async (u) => {
    try {
      const data = await adminFetch(`/admin/users/${u.id}/beta-tester`, {
        method: "PATCH",
        body: { isBetaTester: !u.is_beta_tester },
      });
      setUsers((prev) =>
        prev.map((user) =>
          user.id === u.id ? { ...user, is_beta_tester: data.user.is_beta_tester } : user
        )
      );
    } catch (err) {
      setUsersError(err.message);
    }
  };

  // ── Platform Plays ──
  const handleOpenUserActivity = useCallback((userId) => {
    navigate(adminPath(basePath, `/users/${userId}`));
  }, [navigate, basePath]);

  const fetchPlatformPlays = useCallback(async () => {
    setPlaysLoading(true);
    setPlaysError("");
    try {
      const data = await adminFetch("/admin/plays");
      setPlatformPlays(data.plays || []);
    } catch (err) {
      setPlaysError(err.message);
    } finally {
      setPlaysLoading(false);
    }
  }, [adminFetch]);

  // ── Tests (lazy-loaded to avoid circular import with routes.suite) ──
  const selectedSuiteMap = useMemo(() => {
    if (!allSuites) return {};
    const map = {};
    for (const name of enabledSuites) {
      if (allSuites[name]) map[name] = allSuites[name];
    }
    return map;
  }, [enabledSuites, allSuites]);

  const selectedTestCount = useMemo(
    () => Object.values(selectedSuiteMap).reduce((n, s) => n + s.length, 0),
    [selectedSuiteMap]
  );

  const totalTestCount = useMemo(
    () => allSuites ? Object.values(allSuites).reduce((n, s) => n + s.length, 0) : 0,
    [allSuites]
  );

  const runTests = useCallback(async () => {
    if (enabledSuites.size === 0 || !runAllSuitesRef.current) return;
    setTestRunning(true);
    setTestResults(null);
    setExpandedTests(new Set());
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    testStartRef.current = performance.now();
    try {
      const suiteResults = await runAllSuitesRef.current(selectedSuiteMap);
      setTestResults(suiteResults);
      setTestTotalMs(performance.now() - testStartRef.current);
    } catch (err) {
      console.error("Test runner error:", err);
    } finally {
      setTestRunning(false);
    }
  }, [selectedSuiteMap, enabledSuites.size]);

  const toggleSuiteEnabled = useCallback((name, enabled) => {
    setEnabledSuites((prev) => {
      const next = new Set(prev);
      enabled ? next.add(name) : next.delete(name);
      return next;
    });
  }, []);

  const testStats = useMemo(() => {
    if (!testResults) return { total: 0, passed: 0, failed: 0 };
    let total = 0, passed = 0, failed = 0;
    for (const suite of testResults) {
      for (const r of suite.results) {
        total++;
        if (r.status === "pass") passed++; else failed++;
      }
    }
    return { total, passed, failed };
  }, [testResults]);
  const failedTestsReport = useMemo(() => formatFailedTestsReport(testResults), [testResults]);

  // ── Errors ──
  const fetchErrors = useCallback(async () => {
    setErrorsLoading(true);
    setErrorsError("");
    try {
      const res = await fetch(`${API_URL}/error-reports?limit=50`, {
        headers: { "x-admin-session": session },
      });
      if (!res.ok) throw new Error("Failed to fetch errors");
      const data = await res.json();
      setErrors(data.reports || []);
      setErrorTotal(data.total || 0);
    } catch (err) {
      setErrorsError(err.message);
    } finally {
      setErrorsLoading(false);
    }
  }, [session]);

  const handleDeleteError = async (id) => {
    try {
      await fetch(`${API_URL}/error-reports/${id}`, {
        method: "DELETE",
        headers: { "x-admin-session": session },
      });
      setErrors((prev) => prev.filter((r) => r.id !== id));
      setErrorTotal((t) => t - 1);
    } catch (err) {
      setErrorsError(err.message);
    }
  };

  const handleClearErrors = async () => {
    const ok = await openConfirm({ message: "Clear ALL error reports?", subtitle: "This cannot be undone.", confirmLabel: "Clear All", danger: true });
    if (!ok) return;
    try {
      await fetch(`${API_URL}/error-reports`, {
        method: "DELETE",
        headers: { "x-admin-session": session },
      });
      setErrors([]);
      setErrorTotal(0);
    } catch (err) {
      setErrorsError(err.message);
    }
  };

  // ── User Issues ──
  const fetchUserIssues = useCallback(async () => {
    setUserIssuesLoading(true);
    setUserIssuesError("");
    try {
      const res = await fetch(`${API_URL}/admin/user-issues?limit=50`, {
        headers: { "x-admin-session": session },
      });
      if (!res.ok) throw new Error("Failed to fetch user issues");
      const data = await res.json();
      setUserIssues(data.issues || []);
      setUserIssueTotal(data.total || 0);
    } catch (err) {
      setUserIssuesError(err.message);
    } finally {
      setUserIssuesLoading(false);
    }
  }, [session]);

  const handleIssueStatusChange = async (issue, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/admin/user-issues/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-session": session },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setUserIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, status: newStatus } : i)));
    } catch (err) {
      setUserIssuesError(err.message);
    }
  };

  const handleDeleteIssue = async (id) => {
    const ok = await openConfirm({ message: "Delete this issue report?", subtitle: "This cannot be undone.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      await fetch(`${API_URL}/admin/user-issues/${id}`, {
        method: "DELETE",
        headers: { "x-admin-session": session },
      });
      setUserIssues((prev) => prev.filter((i) => i.id !== id));
      setUserIssueTotal((t) => t - 1);
    } catch (err) {
      setUserIssuesError(err.message);
    }
  };

  const issueStatusMeta = (status) => {
    switch (status) {
      case "open": return { label: "Open", status: "open" };
      case "in_progress": return { label: "In Progress", status: "in_progress" };
      case "resolved": return { label: "Resolved", status: "resolved" };
      default: return { label: status, status: undefined };
    }
  };

  const copyToClipboard = useCallback((text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  }, []);

  // ── Lazy-load test suites (avoids circular dep: Admin → routes.suite → Admin) ──
  useEffect(() => {
    Promise.all([
      import("../testing/testRunner"),
      import("../testing/suites/drawingGeometry.suite"),
      import("../testing/suites/interpolate.suite"),
      import("../testing/suites/importExport.suite"),
      import("../testing/suites/animationSchema.suite"),
      import("../testing/suites/routes.suite"),
    ]).then(([runner, dg, interp, ie, as, routes]) => {
      runAllSuitesRef.current = runner.runAllSuites;
      setAllSuites({
        "Drawing Geometry": dg.default,
        "Interpolation": interp.default,
        "Import / Export": ie.default,
        "Animation Schema": as.default,
        "Routes": routes.default,
      });
    }).catch((err) => console.error("Failed to load test suites:", err));
  }, []);

  // ── Global refresh ──
  const handleRefresh = useCallback(() => {
    fetchUsers();
    fetchErrors();
    fetchPlatformPlays();
    fetchUserIssues();
  }, [fetchUsers, fetchErrors, fetchPlatformPlays, fetchUserIssues]);

  // ── Initial load ──
  useEffect(() => {
    if (authed) {
      fetchUsers();
      fetchErrors();
      fetchPlatformPlays();
      fetchUserIssues();
    }
  }, [authed, fetchUsers, fetchErrors, fetchPlatformPlays, fetchUserIssues]);

  // ── Hide dropdown outside-click ──
  useEffect(() => {
    if (!hideDropdownOpen) return;
    function handleClick(e) {
      if (hideDropdownRef.current && !hideDropdownRef.current.contains(e.target)) {
        setHideDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [hideDropdownOpen]);

  // ── Derived stats ──
  const normalizedUsersSearch = usersSearch.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    const playsVal = filterPlays !== "" ? parseInt(filterPlays, 10) : null;
    /** @param {number} actual @param {string} op @param {number} val */
    function matchesOp(actual, op, val) {
      if (op === ">") return actual > val;
      if (op === "<") return actual < val;
      return actual === val;
    }
    return users.filter((u) => {
      if (hideOptions.has("demo") && u.email?.endsWith("@coachable-seed.invalid")) return false;
      if (hideOptions.has("player") && (u.memberships || []).some((m) => m.role === "player")) return false;
      if (hideOptions.has("assistant_coach") && (u.memberships || []).some((m) => m.role === "assistant_coach")) return false;
      if (hideOptions.has("coach") && (u.memberships || []).some((m) => m.role === "coach")) return false;
      if (hideOptions.has("owner") && (u.memberships || []).some((m) => m.role === "owner")) return false;
      if (normalizedUsersSearch) {
        const haystack = [
          u.name,
          u.email,
          ...(u.memberships || []).flatMap((m) => [m.teamName, m.role, m.sport]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedUsersSearch)) return false;
      }
      if (filterRole) {
        const hasRole = (u.memberships || []).some((m) => m.role === filterRole);
        if (!hasRole) return false;
      }
      if (filterVerified === "verified" && !u.email_verified_at) return false;
      if (filterVerified === "unverified" && u.email_verified_at) return false;
      if (filterOnboarded === "yes" && !u.onboarded_at) return false;
      if (filterOnboarded === "no" && u.onboarded_at) return false;
      if (playsVal !== null && !isNaN(playsVal) && !matchesOp(u.plays_created ?? 0, filterPlaysOp, playsVal)) return false;
      return true;
    });
  }, [users, normalizedUsersSearch, hideOptions, filterRole, filterVerified, filterOnboarded, filterPlays, filterPlaysOp]);

  const activeFilterCount = [filterRole, filterVerified, filterOnboarded, filterPlays].filter(Boolean).length;
  const filteredUserStats = useMemo(() => ({
    verified: filteredUsers.filter((u) => u.email_verified_at).length,
    beta: filteredUsers.filter((u) => u.is_beta_tester).length,
    pending: filteredUsers.filter((u) => !u.onboarded_at).length,
    coaching: filteredUsers.filter((u) => u.can_view_activity).length,
  }), [filteredUsers]);

  /** Copy filtered user emails to clipboard in the given separator format. */
  function handleCopyEmails(format) {
    const sep = format === "outlook" ? "; " : ", ";
    const text = filteredUsers.map((u) => u.email).join(sep);
    navigator.clipboard.writeText(text).then(() => {
      setEmailCopied(format);
      setTimeout(() => setEmailCopied(null), 2000);
    });
  }

  function resetFilters() {
    setFilterRole("");
    setFilterVerified("");
    setFilterOnboarded("");
    setFilterPlays("");
    setFilterPlaysOp(">");
    setHideOptions(new Set(["demo", "player"]));
  }

  /** Toggle a hide option on/off. */
  function toggleHideOption(key) {
    setHideOptions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  const usersTableMaxHeight = usersPerPage * 74 + 64;

  // ──────────────────────────────────────────────────────────────────────────
  // LOGIN SCREEN
  // ──────────────────────────────────────────────────────────────────────────
  if (!authed) {
    if (cookieChecking) {
      return (
        <AdminShell sidebar={false} className="flex items-center justify-center">
          <AdminSpinner size={24} />
        </AdminShell>
      );
    }
    return (
      <AdminShell sidebar={false} className="flex items-center justify-center">
        <AdminCard className="w-full max-w-sm" style={{ boxShadow: "var(--adm-shadow)" }}>
          <div className="mb-6 text-center">
            <p className="font-Manrope text-sm font-normal" style={{ color: "var(--adm-text)" }}>Admin Panel</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--adm-muted)" }}>Restricted access</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <AdminInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              autoFocus
            />
            {loginError && <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{loginError}</p>}
            <AdminBtn variant="primary" type="submit" disabled={logging || !password} className="w-full justify-center py-2.5">
              {logging ? "Authenticating…" : "Sign in"}
            </AdminBtn>
          </form>
        </AdminCard>
      </AdminShell>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DASHBOARD
  // ──────────────────────────────────────────────────────────────────────────

  const dangerSecsLeft = elevatedUntil > 0 ? Math.max(0, Math.ceil((elevatedUntil - Date.now()) / 1000)) : 0;
  const dangerMinsDisplay = dangerSecsLeft > 0
    ? `${Math.floor(dangerSecsLeft / 60)}:${String(dangerSecsLeft % 60).padStart(2, "0")}`
    : null;
  const anyLoading = usersLoading || errorsLoading || playsLoading || userIssuesLoading;

  return (
    <AdminShell>
      <ConfirmModal
        open={confirmModal.open}
        message={confirmModal.message}
        subtitle={confirmModal.subtitle}
        confirmLabel={confirmModal.confirmLabel}
        danger={confirmModal.danger}
        onConfirm={handleConfirmOk}
        onCancel={handleConfirmCancel}
      />

      {/* Danger Mode elevation modal */}
      <AdminModal open={elevateModal} onClose={handleElevateCancel} title="Danger Mode Required" width="max-w-sm" hideClose>
        <p className="mb-4 text-xs" style={{ color: "var(--adm-danger)" }}>
          Re-enter your admin password to unlock destructive operations for 10 minutes.
        </p>
        <form onSubmit={handleElevate} className="flex flex-col gap-3">
          <AdminInput
            type="password"
            value={elevatePassword}
            onChange={(e) => setElevatePassword(e.target.value)}
            placeholder="Admin password"
            autoFocus
          />
          {elevateError && <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{elevateError}</p>}
          <div className="flex gap-2">
            <AdminBtn variant="secondary" type="button" onClick={handleElevateCancel} className="flex-1 justify-center">Cancel</AdminBtn>
            <AdminBtn variant="danger" type="submit" disabled={elevating || !elevatePassword} className="flex-1 justify-center">
              {elevating ? "Verifying…" : "Unlock"}
            </AdminBtn>
          </div>
        </form>
      </AdminModal>

      <AdminHeader
        title="Dashboard"
        actions={
          <>
            {dangerMinsDisplay && (
              <span className="animate-pulse rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>
                Danger · {dangerMinsDisplay}
              </span>
            )}
            <AdminBtn variant="secondary" size="sm" onClick={handleRefresh} disabled={anyLoading}>
              {anyLoading ? <AdminSpinner size={12} /> : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Refresh
            </AdminBtn>
            <AdminBtn variant="ghost" size="sm" onClick={handleLogout}>Logout</AdminBtn>
          </>
        }
      />
      <AdminPage className="space-y-10">
        {/* Analytics dashboard */}
        <section>
          <AdminSection title="Analytics" />
          <AnalyticsDashboard session={session} />
        </section>

        {/* USERS */}
        <section id="users" style={{ scrollMarginTop: "4rem" }}>
          <AdminSection
            title="Users"
            actions={
              <div className="flex gap-2">
                <AdminBtn variant="primary" size="sm" onClick={() => setShowCreate(true)}>Create Account</AdminBtn>
                <AdminBtn variant="danger" size="sm" onClick={handleDeleteAll}>Delete All</AdminBtn>
              </div>
            }
          >
          {usersError && (
            <div className="mb-3 rounded-[var(--adm-radius-sm)] px-4 py-2 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{usersError}</div>
          )}

          {/* Users table */}
          <AdminCard padding={false} className="overflow-hidden">
            <div
              className="px-4 py-4 sm:px-5"
              style={{
                borderBottom: "1px solid var(--adm-border)",
                background: "linear-gradient(180deg, var(--adm-surface2) 0%, var(--adm-surface) 100%)",
              }}
            >
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[var(--adm-radius)] border px-3.5 py-3" style={{ backgroundColor: "var(--adm-surface)", borderColor: "var(--adm-border)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)" }}>Visible Users</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="font-Manrope text-2xl font-semibold" style={{ color: "var(--adm-text)" }}>{filteredUsers.length}</span>
                    <span className="pb-0.5 text-xs" style={{ color: "var(--adm-muted)" }}>of {users.length}</span>
                  </div>
                </div>
                <div className="rounded-[var(--adm-radius)] border px-3.5 py-3" style={{ backgroundColor: "var(--adm-surface)", borderColor: "var(--adm-border)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)" }}>Verified</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="font-Manrope text-2xl font-semibold" style={{ color: "var(--adm-success)" }}>{filteredUserStats.verified}</span>
                    <span className="pb-0.5 text-xs" style={{ color: "var(--adm-muted)" }}>ready accounts</span>
                  </div>
                </div>
                <div className="rounded-[var(--adm-radius)] border px-3.5 py-3" style={{ backgroundColor: "var(--adm-surface)", borderColor: "var(--adm-border)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)" }}>Beta Testers</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="font-Manrope text-2xl font-semibold" style={{ color: "var(--adm-badge-purple-text)" }}>{filteredUserStats.beta}</span>
                    <span className="pb-0.5 text-xs" style={{ color: "var(--adm-muted)" }}>flagged users</span>
                  </div>
                </div>
                <div className="rounded-[var(--adm-radius)] border px-3.5 py-3" style={{ backgroundColor: "var(--adm-surface)", borderColor: "var(--adm-border)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-muted)" }}>Needs Onboarding</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="font-Manrope text-2xl font-semibold" style={{ color: filteredUserStats.pending > 0 ? "var(--adm-warning)" : "var(--adm-text2)" }}>{filteredUserStats.pending}</span>
                    <span className="pb-0.5 text-xs" style={{ color: "var(--adm-muted)" }}>{filteredUserStats.coaching} with activity access</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3">
              {/* Row 1: search + hide + copy */}
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="relative min-w-[240px] flex-1">
                  <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--adm-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                  </svg>
                  <input
                    type="text"
                    value={usersSearch}
                    onChange={(e) => setUsersSearch(e.target.value)}
                    placeholder="Search by name, email, or team"
                    className="w-full rounded-[var(--adm-radius)] py-3 pl-10 pr-16 text-sm outline-none transition-colors"
                    style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border2)", color: "var(--adm-text)" }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--adm-accent)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px var(--adm-accent-dim)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--adm-border2)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  {usersSearch && (
                    <button type="button" onClick={() => setUsersSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs transition-opacity hover:opacity-70" style={{ color: "var(--adm-muted)" }}>
                      Clear
                    </button>
                  )}
                </div>
                <span className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold" style={{ backgroundColor: filteredUsers.length === users.length ? "var(--adm-surface3)" : "var(--adm-accent-dim)", color: filteredUsers.length === users.length ? "var(--adm-muted)" : "var(--adm-accent)" }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: filteredUsers.length === users.length ? "var(--adm-muted)" : "var(--adm-accent)" }} />
                  {filteredUsers.length === users.length ? "Full directory" : "Filtered view"}
                </span>
                <div className="relative shrink-0" ref={hideDropdownRef}>
                  <AdminBtn variant="secondary" size="sm" onClick={() => setHideDropdownOpen((o) => !o)}>
                    Hide {hideOptions.size > 0 && <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none" style={{ backgroundColor: "var(--adm-accent)" }}>{hideOptions.size}</span>}
                  </AdminBtn>
                  {hideDropdownOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-[var(--adm-radius)] py-1 shadow-xl" style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border2)" }}>
                      {[
                        { key: "demo", label: "Demo accounts" },
                        { key: "player", label: "Players" },
                        { key: "assistant_coach", label: "Assistant coaches" },
                        { key: "coach", label: "Coaches" },
                        { key: "owner", label: "Owners" },
                      ].map(({ key, label }) => (
                        <div key={key} className="px-3 py-1.5">
                          <AdminCheckbox checked={hideOptions.has(key)} onChange={() => toggleHideOption(key)} label={label} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 xl:ml-auto xl:justify-end">
                  <AdminBtn variant="secondary" size="sm" onClick={() => handleCopyEmails("outlook")} title="Semicolon-separated emails">
                    {emailCopied === "outlook" ? "Copied!" : "Copy · Outlook"}
                  </AdminBtn>
                  <AdminBtn variant="secondary" size="sm" onClick={() => handleCopyEmails("gmail")} title="Comma-separated emails">
                    {emailCopied === "gmail" ? "Copied!" : "Copy · Gmail"}
                  </AdminBtn>
                </div>
              </div>
              {/* Row 2: advanced filters */}
              <div className="flex flex-wrap items-center gap-2 rounded-[var(--adm-radius)] p-3" style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)" }}>
                <AdminSelect value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                  <option value="">All roles</option>
                  <option value="owner">Owner</option>
                  <option value="coach">Coach</option>
                  <option value="assistant_coach">Assistant Coach</option>
                  <option value="player">Player</option>
                </AdminSelect>
                <AdminSelect value={filterVerified} onChange={(e) => setFilterVerified(e.target.value)}>
                  <option value="">Any verification</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </AdminSelect>
                <AdminSelect value={filterOnboarded} onChange={(e) => setFilterOnboarded(e.target.value)}>
                  <option value="">Any onboard status</option>
                  <option value="yes">Onboarded</option>
                  <option value="no">Not onboarded</option>
                </AdminSelect>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: "var(--adm-muted)" }}>Plays</span>
                  <AdminSelect value={filterPlaysOp} onChange={(e) => setFilterPlaysOp(e.target.value)} className="w-16">
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="=">=</option>
                  </AdminSelect>
                  <input type="number" min="0" value={filterPlays} onChange={(e) => setFilterPlays(e.target.value)} placeholder="—" className="w-14 rounded-[var(--adm-radius-sm)] px-2 py-2 text-xs outline-none" style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }} />
                </div>
                {activeFilterCount > 0 && (
                  <AdminBtn variant="ghost" size="sm" onClick={resetFilters}>Reset ({activeFilterCount})</AdminBtn>
                )}
              </div>
              </div>
            </div>
            <div className="hide-scroll overflow-auto px-3 py-3 sm:px-4" style={{ maxHeight: `${usersTableMaxHeight}px`, backgroundColor: "var(--adm-bg)" }}>
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  <th className="sticky top-0 z-10 min-w-[260px] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: "var(--adm-surface)", borderBottom: "1px solid var(--adm-border)", color: "var(--adm-muted)", backdropFilter: "blur(12px)" }}>User</th>
                  <th className="sticky top-0 z-10 min-w-[220px] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: "var(--adm-surface)", borderBottom: "1px solid var(--adm-border)", color: "var(--adm-muted)", backdropFilter: "blur(12px)" }}>Email</th>
                  <th className="sticky top-0 z-10 min-w-[240px] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: "var(--adm-surface)", borderBottom: "1px solid var(--adm-border)", color: "var(--adm-muted)", backdropFilter: "blur(12px)" }}>Teams</th>
                  <th className="sticky top-0 z-10 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: "var(--adm-surface)", borderBottom: "1px solid var(--adm-border)", color: "var(--adm-muted)", backdropFilter: "blur(12px)" }}>Plays</th>
                  <th className="sticky top-0 z-10 min-w-[210px] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: "var(--adm-surface)", borderBottom: "1px solid var(--adm-border)", color: "var(--adm-muted)", backdropFilter: "blur(12px)" }}>Status</th>
                  <th className="sticky top-0 z-10 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: "var(--adm-surface)", borderBottom: "1px solid var(--adm-border)", color: "var(--adm-muted)", backdropFilter: "blur(12px)" }}>Joined</th>
                  <th className="sticky top-0 z-10 px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: "var(--adm-surface)", borderBottom: "1px solid var(--adm-border)", color: "var(--adm-muted)", backdropFilter: "blur(12px)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading && users.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-xs" style={{ color: "var(--adm-muted)" }}><AdminSpinner className="mx-auto" /></td></tr>
                )}
                {!usersLoading && users.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-xs" style={{ color: "var(--adm-muted)" }}>No users found</td></tr>
                )}
                {!usersLoading && users.length > 0 && filteredUsers.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-xs" style={{ color: "var(--adm-muted)" }}>No users match your search</td></tr>
                )}
                {filteredUsers.map((u) => {
                  const memberships = getSortedMemberships(u.memberships);
                  const hasCoachingRole = Boolean(u.can_view_activity);
                  const rowBaseStyle = {
                    backgroundColor: "var(--adm-surface)",
                    borderBottom: "1px solid var(--adm-border)",
                  };
                  return (
                    <tr
                      key={u.id}
                      className={!u.onboarded_at ? "opacity-80" : ""}
                      onMouseEnter={(e) => {
                        Array.from(e.currentTarget.children).forEach((cell) => {
                          cell.style.backgroundColor = "var(--adm-surface2)";
                        });
                      }}
                      onMouseLeave={(e) => {
                        Array.from(e.currentTarget.children).forEach((cell) => {
                          cell.style.backgroundColor = "var(--adm-surface)";
                        });
                      }}
                    >
                      <td className="px-4 py-4 align-top" style={rowBaseStyle}>
                        <div className="flex flex-wrap items-start gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                            style={hasCoachingRole
                              ? { backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }
                              : { backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}
                          >
                            {getUserInitials(u.name, u.email)}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => handleOpenUserActivity(u.id)}
                              className="truncate text-sm font-semibold transition-colors"
                              style={{ color: "var(--adm-text)" }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--adm-accent)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--adm-text)"; }}
                            >
                              {u.name}
                            </button>
                            <p className="mt-1 text-xs" style={{ color: "var(--adm-muted)" }}>
                              {memberships.length > 0 ? `${memberships.length} ${memberships.length === 1 ? "team role" : "team roles"}` : "No team memberships"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {!u.onboarded_at && <AdminBadge status="warning">Needs onboarding</AdminBadge>}
                              {hasCoachingRole && <AdminBadge status="info">Activity access</AdminBadge>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-xs" style={{ ...rowBaseStyle, color: "var(--adm-text2)" }}>
                        <div className="max-w-[220px] break-words leading-relaxed">{u.email}</div>
                      </td>
                      <td className="px-4 py-4 align-top" style={rowBaseStyle}>
                        {memberships.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {memberships.slice(0, 2).map((m) => (
                              <span key={`${u.id}-${m.teamId}-${m.role}`} className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}>
                                {m.teamName} <span className="ml-1" style={{ color: "var(--adm-muted)" }}>{formatRole(m.role)}</span>
                              </span>
                            ))}
                            {memberships.length > 2 && <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-muted)" }}>+{memberships.length - 2} more</span>}
                          </div>
                        ) : <span style={{ color: "var(--adm-muted)" }}>—</span>}
                      </td>
                      <td className="px-4 py-4 align-top" style={rowBaseStyle}>
                        <span className="inline-flex min-w-[52px] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}>
                          {u.plays_created ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top" style={rowBaseStyle}>
                        <div className="flex flex-wrap gap-1.5">
                          <AdminBadge status={u.email_verified_at ? "resolved" : undefined}>{u.email_verified_at ? "Verified" : "Unverified"}</AdminBadge>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleBetaTester(u); }}
                            title={u.is_beta_tester ? "Remove beta tester" : "Make beta tester"}
                            className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-opacity hover:opacity-80"
                            style={u.is_beta_tester ? { backgroundColor: "var(--adm-badge-purple-bg)", borderColor: "transparent", color: "var(--adm-badge-purple-text)" } : { backgroundColor: "var(--adm-surface3)", borderColor: "var(--adm-border)", color: "var(--adm-muted)" }}
                          >
                            {u.is_beta_tester ? "Beta tester" : "Standard"}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-xs" style={{ ...rowBaseStyle, color: "var(--adm-text2)" }}>{formatAdminDate(u.created_at)}</td>
                      <td className="px-4 py-4 align-top text-right" style={rowBaseStyle}>
                        <div className="flex justify-end">
                          <AdminBtn variant="danger" size="sm" onClick={() => handleDeleteUser(u.id, u.name)} className="whitespace-nowrap">Delete</AdminBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderTop: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span style={{ color: "var(--adm-text2)" }}>
                  {filteredUsers.length === users.length ? `${users.length} users in view` : `${filteredUsers.length} of ${users.length} users shown`}
                </span>
                {activeFilterCount > 0 && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}>
                    {activeFilterCount} filters active
                  </span>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--adm-muted)" }}>
                <span>Visible rows</span>
                <AdminSelect value={usersPerPage} onChange={(e) => setUsersPerPage(Number(e.target.value))} className="w-24">
                  {USER_PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </AdminSelect>
              </label>
            </div>
          </AdminCard>
          </AdminSection>
        </section>

        {/* TESTS */}
        <section id="tests" style={{ scrollMarginTop: "4rem" }}>
          <AdminSection
            title="Tests"
            subtitle={allSuites ? `${totalTestCount} tests across ${SUITE_NAMES.length} suites` : "Loading suites…"}
            actions={
              <AdminBtn variant="secondary" size="sm" onClick={runTests} disabled={testRunning || enabledSuites.size === 0}>
                {testRunning ? <><AdminSpinner size={12} />Running…</> : <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" /></svg>
                  {enabledSuites.size === SUITE_NAMES.length ? "Run All" : `Run ${selectedTestCount}`}
                </>}
              </AdminBtn>
            }
          >
            {/* Result summary */}
            {testResults && (
              <AdminCard padding={false} className="flex items-center gap-4 px-5 py-3">
                <div className="flex items-center gap-2 font-Manrope text-sm font-normal" style={{ color: testStats.failed === 0 ? "var(--adm-success)" : "var(--adm-danger)" }}>
                  {testStats.failed === 0
                    ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  }
                  {testStats.failed === 0 ? "All Passing" : `${testStats.failed} Failing`}
                </div>
                <span className="text-xs" style={{ color: "var(--adm-muted)" }}>{testStats.passed}/{testStats.total} passed</span>
                {testStats.failed > 0 && failedTestsReport && (
                  <AdminBtn variant="danger" size="sm" onClick={() => copyToClipboard(failedTestsReport, "all-failed-tests")}>
                    {copied === "all-failed-tests" ? "Copied!" : "Copy Failed"}
                  </AdminBtn>
                )}
                <span className="ml-auto font-mono text-xs" style={{ color: "var(--adm-muted)" }}>{testTotalMs.toFixed(0)}ms</span>
              </AdminCard>
            )}

            {/* Suite cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {SUITE_NAMES.map((name) => {
                const checked = enabledSuites.has(name);
                const suiteResult = testResults?.find((s) => s.name === name);
                const suiteFailed = suiteResult?.results.filter((r) => r.status === "fail").length ?? 0;
                const suitePassed = suiteResult?.results.filter((r) => r.status === "pass").length ?? 0;
                return (
                  <div
                    key={name}
                    onClick={() => toggleSuiteEnabled(name, !checked)}
                    className="cursor-pointer rounded-[var(--adm-radius)] p-3.5 transition"
                    style={{
                      backgroundColor: checked ? "rgba(139,92,246,0.06)" : "var(--adm-surface)",
                      border: checked ? "1px solid rgba(139,92,246,0.3)" : "1px solid var(--adm-border)",
                      opacity: checked ? 1 : 0.55,
                    }}
                    onMouseEnter={(e) => { if (!checked) e.currentTarget.style.opacity = "0.75"; }}
                    onMouseLeave={(e) => { if (!checked) e.currentTarget.style.opacity = "0.55"; }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-Manrope text-xs font-normal leading-tight" style={{ color: "var(--adm-text)" }}>{name}</span>
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded transition" style={{ backgroundColor: checked ? "rgba(139,92,246,0.3)" : "transparent", border: checked ? "1px solid var(--adm-badge-purple-text)" : "1px solid var(--adm-border2)" }}>
                        {checked && <svg className="h-2.5 w-2.5" style={{ color: "var(--adm-badge-purple-text)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] leading-snug" style={{ color: "var(--adm-muted)" }}>{SUITE_DESCRIPTIONS[name]}</p>
                    <p className="mt-2 text-[10px] font-semibold" style={{ color: suiteResult ? (suiteFailed === 0 ? "var(--adm-success)" : "var(--adm-danger)") : "var(--adm-muted)" }}>
                      {suiteResult ? (suiteFailed === 0 ? `${suitePassed} pass` : `${suiteFailed} fail`) : `${allSuites?.[name]?.length ?? "…"} tests`}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Test results list */}
            {testResults && (
              <div className="space-y-2">
                {testResults.map((suite) => {
                  const isCollapsed = collapsedSuites.has(suite.name);
                  const suiteFail = suite.results.filter((r) => r.status === "fail").length;
                  return (
                    <AdminCard key={suite.name} padding={false} className="overflow-hidden">
                      <button
                        onClick={() => setCollapsedSuites((prev) => { const n = new Set(prev); n.has(suite.name) ? n.delete(suite.name) : n.add(suite.name); return n; })}
                        className="flex w-full items-center justify-between px-4 py-3 transition-opacity hover:opacity-80"
                        style={{ backgroundColor: "var(--adm-surface2)" }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: suiteFail === 0 ? "var(--adm-success)" : "var(--adm-danger)" }} />
                          <span className="font-Manrope text-sm font-normal" style={{ color: "var(--adm-text)" }}>{suite.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span style={{ color: "var(--adm-success)" }}>{suite.results.filter((r) => r.status === "pass").length} pass</span>
                          {suiteFail > 0 && <span style={{ color: "var(--adm-danger)" }}>{suiteFail} fail</span>}
                          <span className="font-mono" style={{ color: "var(--adm-muted)" }}>{suite.totalMs.toFixed(1)}ms</span>
                          <svg className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} style={{ color: "var(--adm-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </button>
                      {!isCollapsed && (
                        <div style={{ borderTop: "1px solid var(--adm-border)" }}>
                          {suite.results.map((r, i) => {
                            const key = `${suite.name}-${i}`;
                            const isExpanded = expandedTests.has(key);
                            return (
                              <div key={key} style={{ backgroundColor: r.status === "fail" ? "var(--adm-danger-dim)" : "", borderBottom: "1px solid var(--adm-border)" }}>
                                <div className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-opacity hover:opacity-80"
                                  onClick={() => setExpandedTests((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; })}
                                >
                                  {r.status === "pass"
                                    ? <svg className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--adm-success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    : <svg className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--adm-danger)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                  }
                                  <span className="flex-1 text-xs" style={{ color: "var(--adm-text)" }}>{r.testName}</span>
                                  <span className="font-mono text-[10px]" style={{ color: "var(--adm-muted)" }}>{r.durationMs < 1 ? `${(r.durationMs * 1000).toFixed(0)}μs` : `${r.durationMs.toFixed(1)}ms`}</span>
                                </div>
                                {isExpanded && r.error && (
                                  <div className="mx-4 mb-2">
                                    <pre className="rounded-[var(--adm-radius-sm)] px-4 py-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap" style={{ backgroundColor: "var(--adm-danger-dim)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--adm-color-red-soft)" }}>{r.error}</pre>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </AdminCard>
                  );
                })}
              </div>
            )}
          </AdminSection>
        </section>

        {/* ERROR REPORTS */}
        <section id="errors" style={{ scrollMarginTop: "4rem" }}>
          <AdminSection
            title="Error Reports"
            subtitle={errorTotal > 0 ? `${errorTotal} reports` : "No reports"}
            actions={errors.length > 0 && (
              <div className="flex gap-2">
                <AdminBtn variant="secondary" size="sm" onClick={() => copyToClipboard(errors.map(formatReportText).join("\n\n---\n\n"), "all-errors")}>
                  {copied === "all-errors" ? "Copied!" : "Copy All"}
                </AdminBtn>
                <AdminBtn variant="danger" size="sm" onClick={handleClearErrors}>Clear All</AdminBtn>
              </div>
            )}
          >
            {errorsError && <div className="rounded-[var(--adm-radius-sm)] px-4 py-2 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{errorsError}</div>}
            {errorsLoading && errors.length === 0 && <AdminEmptyState title="Loading…" icon={<AdminSpinner />} />}
            {!errorsLoading && errors.length === 0 && (
              <AdminEmptyState
                title="No error reports"
                subtitle="Errors from users will appear here"
                icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
            )}
            {errors.length > 0 && (
              <div className="hide-scroll max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {errors.map((r) => {
                  const isExpanded = expandedError === r.id;
                  const device = r.device_info || {};
                  const title = deriveTitle(r);
                  const compColor = r.component === "api" ? { bg: "var(--adm-accent-dim)", color: "var(--adm-accent)" }
                    : r.component === "videoExport" ? { bg: "var(--adm-badge-purple-bg)", color: "var(--adm-badge-purple-text)" }
                    : r.component === "global" ? { bg: "var(--adm-danger-dim)", color: "var(--adm-danger)" }
                    : { bg: "var(--adm-surface3)", color: "var(--adm-muted)" };
                  return (
                    <AdminCard key={r.id} padding={false} className="overflow-hidden">
                      <button onClick={() => setExpandedError(isExpanded ? null : r.id)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-opacity hover:opacity-90">
                        <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={compColor}>{r.component || "unknown"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-normal" style={{ color: "var(--adm-accent)" }}>{title}</p>
                          <p className="mt-0.5 truncate text-xs" style={{ color: "var(--adm-text2)" }}>{r.error_message}</p>
                          <div className="mt-1 flex flex-wrap gap-x-3 text-[11px]" style={{ color: "var(--adm-muted)" }}>
                            <span>{parseDevice(r.user_agent)}</span>
                            {device.screenWidth && <span>{device.screenWidth}×{device.screenHeight}</span>}
                            <span>{formatTime(r.created_at)}</span>
                          </div>
                        </div>
                        <svg className={`mt-1 h-3.5 w-3.5 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ color: "var(--adm-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {isExpanded && (
                        <div className="px-4 py-3" style={{ borderTop: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface2)" }}>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            {[["Page", r.page_url || "—"], ["User ID", r.user_id || "anonymous"], ["Device", `${device.platform || "—"}${device.isMobile ? " (mobile)" : " (desktop)"}${device.standalone ? " [PWA]" : ""}`], ["Session", `${r.session_id?.slice(0, 12) || "—"}…`]].map(([k, v]) => (
                              <div key={k}><span style={{ color: "var(--adm-muted)" }}>{k}:</span> <span style={{ color: "var(--adm-text2)" }}>{v}</span></div>
                            ))}
                          </div>
                          {r.extra && <div className="mt-3"><p className="mb-1 text-[10px] font-normal uppercase tracking-wider" style={{ color: "var(--adm-muted)" }}>Extra</p><pre className="overflow-x-auto rounded-[var(--adm-radius-sm)] p-2 text-[11px]" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text2)" }}>{JSON.stringify(r.extra, null, 2)}</pre></div>}
                          {r.error_stack && <div className="mt-3"><p className="mb-1 text-[10px] font-normal uppercase tracking-wider" style={{ color: "var(--adm-muted)" }}>Stack</p><pre className="hide-scroll max-h-40 overflow-auto rounded-[var(--adm-radius-sm)] p-2 text-[11px] leading-relaxed" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-color-red-soft)" }}>{r.error_stack}</pre></div>}
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[10px]" style={{ color: "var(--adm-muted)" }}>{new Date(r.created_at).toLocaleString()}</span>
                            <div className="flex gap-2">
                              <AdminBtn variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); copyToClipboard(r.error_message + "\n" + (r.error_stack || ""), r.id); }}>{copied === r.id ? "Copied!" : "Copy"}</AdminBtn>
                              <AdminBtn variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteError(r.id); }}>Delete</AdminBtn>
                            </div>
                          </div>
                        </div>
                      )}
                    </AdminCard>
                  );
                })}
              </div>
            )}
          </AdminSection>
        </section>

        {/* REPORTED ISSUES */}
        <section id="reported-issues" style={{ scrollMarginTop: "4rem" }}>
          <AdminSection title="Reported Issues" subtitle={userIssueTotal > 0 ? `${userIssueTotal} open` : "None"}>
            {userIssuesError && <div className="rounded-[var(--adm-radius-sm)] px-4 py-2 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{userIssuesError}</div>}
            {userIssuesLoading && userIssues.length === 0 && <AdminEmptyState title="Loading…" icon={<AdminSpinner />} />}
            {!userIssuesLoading && userIssues.length === 0 && <AdminEmptyState title="No reported issues" subtitle="Issues submitted by beta testers will appear here" />}
            {userIssues.length > 0 && (
              <div className="hide-scroll max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {userIssues.map((issue) => {
                  const isExpanded = expandedIssue === issue.id;
                  const meta = issueStatusMeta(issue.status);
                  return (
                    <AdminCard key={issue.id} padding={false} className="overflow-hidden">
                      <button onClick={() => setExpandedIssue(isExpanded ? null : issue.id)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-opacity hover:opacity-90">
                        <AdminBadge status={meta.status} className="mt-0.5 shrink-0 uppercase">{meta.label}</AdminBadge>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-normal" style={{ color: "var(--adm-text)" }}>{issue.title}</p>
                          <div className="mt-1 flex flex-wrap gap-x-3 text-[11px]" style={{ color: "var(--adm-muted)" }}>
                            <span>{issue.user_name || "Unknown"}</span>
                            {issue.user_email && <span>{issue.user_email}</span>}
                            <span>{formatTime(issue.created_at)}</span>
                          </div>
                        </div>
                        <svg className={`mt-1 h-3.5 w-3.5 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ color: "var(--adm-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {isExpanded && (
                        <div className="px-4 py-4" style={{ borderTop: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface2)" }}>
                          <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--adm-text2)" }}>{issue.description}</p>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-normal uppercase" style={{ color: "var(--adm-muted)" }}>Status:</span>
                              <AdminSelect value={issue.status} onChange={(e) => handleIssueStatusChange(issue, e.target.value)}>
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                              </AdminSelect>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px]" style={{ color: "var(--adm-muted)" }}>{new Date(issue.created_at).toLocaleString()}</span>
                              <AdminBtn variant="danger" size="sm" onClick={() => handleDeleteIssue(issue.id)}>Delete</AdminBtn>
                            </div>
                          </div>
                        </div>
                      )}
                    </AdminCard>
                  );
                })}
              </div>
            )}
          </AdminSection>
        </section>

        {/* RECENT ACTIVITY */}
        <RecentActivitySection session={session} />

        <div className="h-6" />
      </AdminPage>

      {/* Create Account Modal */}
      <AdminModal open={showCreate} onClose={() => setShowCreate(false)} title="Create Account">
        <p className="mb-4 text-xs" style={{ color: "var(--adm-muted)" }}>No email verification required</p>
        <form onSubmit={handleCreateAccount} className="flex flex-col gap-3">
          <AdminInput type="text" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name *" required />
          <AdminInput type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email address *" required />
          <AdminInput type="text" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} placeholder="Password * (min 6 chars)" required minLength={6} />
          <div className="pt-3" style={{ borderTop: "1px solid var(--adm-border)" }}>
            <p className="mb-2.5 text-xs" style={{ color: "var(--adm-muted)" }}>Optional — create a team (auto-onboards user)</p>
            <div className="flex gap-2">
              <AdminInput className="flex-1" type="text" value={createForm.teamName} onChange={(e) => setCreateForm((f) => ({ ...f, teamName: e.target.value }))} placeholder="Team name" />
              <AdminInput className="w-28" type="text" value={createForm.sport} onChange={(e) => setCreateForm((f) => ({ ...f, sport: e.target.value }))} placeholder="Sport" />
            </div>
          </div>
          {usersError && <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{usersError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <AdminBtn variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</AdminBtn>
            <AdminBtn variant="primary" type="submit" disabled={creating}>{creating ? "Creating…" : "Create Account"}</AdminBtn>
          </div>
        </form>
      </AdminModal>
    </AdminShell>
  );
}
