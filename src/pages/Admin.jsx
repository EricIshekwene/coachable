import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import logo from "../assets/logos/full_Coachable_logo.png";
import ConfirmModal from "../components/subcomponents/ConfirmModal";
import { formatFailedTestsReport } from "../testing/formatFailedTestsReport";
import {
  isAdminElevated,
  getAdminElevatedUntil,
  setAdminElevated,
  clearAdminElevated,
} from "../utils/adminElevation";

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

// ── Shared UI helpers ──────────────────────────────────────────────────────
function SectionHeader({ title, badge, badgeColor = "bg-BrandOrange/20 text-BrandOrange", children }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <h2 className="font-Manrope text-base font-bold text-white">{title}</h2>
        {badge && (
          <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, color = "text-white" }) {
  return (
    <div className="flex flex-col rounded-xl border border-white/6 bg-[#1e2228] px-5 py-4">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-BrandGray">{label}</span>
      <span className={`mt-1.5 font-Manrope text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Admin() {
  const navigate = useNavigate();
  // ── Auth ──
  const [session, setSession] = useState(() => sessionStorage.getItem(SESSION_KEY) || "");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [logging, setLogging] = useState(false);
  const authed = Boolean(session);

  // ── Users ──
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", teamName: "", sport: "" });
  const [creating, setCreating] = useState(false);
  const [usersSearch, setUsersSearch] = useState("");
  const [hideDemoAccounts, setHideDemoAccounts] = useState(true);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [filterRole, setFilterRole] = useState(""); // "coach"|"owner"|"assistant_coach"|"player"|""
  const [filterVerified, setFilterVerified] = useState(""); // "verified"|"unverified"|""
  const [filterOnboarded, setFilterOnboarded] = useState(""); // "yes"|"no"|""
  const [filterMinPlays, setFilterMinPlays] = useState("");
  const [filterMinFolders, setFilterMinFolders] = useState("");
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
  const [platformPlays, setPlatformPlays] = useState([]);
  const [playsLoading, setPlaysLoading] = useState(false);
  const [playsError, setPlaysError] = useState("");

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
      const data = await apiFetch("/admin/login", { method: "POST", body: { password } });
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
    adminFetch("/admin/logout", { method: "POST" }).catch(() => {});
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
    navigate(`/admin/users/${userId}`);
  }, [navigate]);

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
      case "open": return { label: "Open", className: "bg-blue-500/20 text-blue-400" };
      case "in_progress": return { label: "In Progress", className: "bg-yellow-500/20 text-yellow-400" };
      case "resolved": return { label: "Resolved", className: "bg-green-500/20 text-green-400" };
      default: return { label: status, className: "bg-white/6 text-BrandGray" };
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

  // ── Derived stats ──
  const verifiedCount = users.filter((u) => u.email_verified_at).length;
  const notOnboardedCount = users.filter((u) => !u.onboarded_at).length;
  const betaTesterCount = users.filter((u) => u.is_beta_tester).length;
  const normalizedUsersSearch = usersSearch.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    const minPlays = filterMinPlays !== "" ? parseInt(filterMinPlays, 10) : null;
    const minFolders = filterMinFolders !== "" ? parseInt(filterMinFolders, 10) : null;
    return users.filter((u) => {
      if (hideDemoAccounts && u.email?.endsWith("@coachable-seed.invalid")) return false;
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
      if (minPlays !== null && !isNaN(minPlays) && (u.plays_created ?? 0) < minPlays) return false;
      if (minFolders !== null && !isNaN(minFolders) && (u.folders_created ?? 0) < minFolders) return false;
      return true;
    });
  }, [users, normalizedUsersSearch, hideDemoAccounts, filterRole, filterVerified, filterOnboarded, filterMinPlays, filterMinFolders]);

  const activeFilterCount = [filterRole, filterVerified, filterOnboarded, filterMinPlays, filterMinFolders].filter(Boolean).length;

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
    setFilterMinPlays("");
    setFilterMinFolders("");
  }
  const usersTableMaxHeight = usersPerPage * 56 + 56;

  // ──────────────────────────────────────────────────────────────────────────
  // LOGIN SCREEN
  // ──────────────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="flex h-screen items-center justify-center bg-BrandBlack font-DmSans">
        <div className="w-full max-w-sm rounded-2xl bg-[#1e2228] p-8 shadow-xl border border-white/6">
          <img src={logo} alt="Coachable" className="mx-auto mb-6 h-6 opacity-70" />
          <h1 className="mb-1 text-center font-Manrope text-lg font-bold text-white">Admin Panel</h1>
          <p className="mb-6 text-center text-xs text-BrandGray">Restricted access</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full rounded-lg border border-white/8 bg-BrandBlack px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-BrandGray focus:border-BrandOrange"
            />
            {loginError && <p className="text-xs text-red-400">{loginError}</p>}
            <button
              type="submit"
              disabled={logging || !password}
              className="w-full rounded-lg bg-BrandOrange py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {logging ? "Authenticating..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DASHBOARD
  // ──────────────────────────────────────────────────────────────────────────

  // ── Danger Mode countdown display ──
  const dangerSecsLeft = elevatedUntil > 0 ? Math.max(0, Math.ceil((elevatedUntil - Date.now()) / 1000)) : 0;
  const dangerMinsDisplay = dangerSecsLeft > 0
    ? `${Math.floor(dangerSecsLeft / 60)}:${String(dangerSecsLeft % 60).padStart(2, "0")}`
    : null;

  return (
    <div className="h-screen overflow-y-auto bg-[#13151a] font-DmSans text-white">
      <ConfirmModal
        open={confirmModal.open}
        message={confirmModal.message}
        subtitle={confirmModal.subtitle}
        confirmLabel={confirmModal.confirmLabel}
        danger={confirmModal.danger}
        onConfirm={handleConfirmOk}
        onCancel={handleConfirmCancel}
      />

      {/* ── Danger Mode (elevation) modal ── */}
      {elevateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-[#1a0e0e] p-7 shadow-2xl">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-lg">⚠</span>
              <h2 className="font-Manrope text-base font-bold text-red-400">Danger Mode Required</h2>
            </div>
            <p className="mb-5 text-xs text-red-300/70">
              Re-enter your admin password to unlock destructive operations for 10 minutes.
            </p>
            <form onSubmit={handleElevate} className="flex flex-col gap-3">
              <input
                type="password"
                value={elevatePassword}
                onChange={(e) => setElevatePassword(e.target.value)}
                placeholder="Admin password"
                autoFocus
                className="w-full rounded-lg border border-red-500/20 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-red-300/30 focus:border-red-500/60"
              />
              {elevateError && <p className="text-xs text-red-400">{elevateError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleElevateCancel}
                  className="flex-1 rounded-lg border border-white/8 py-2.5 text-xs text-BrandGray transition hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={elevating || !elevatePassword}
                  className="flex-1 rounded-lg bg-red-600 py-2.5 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {elevating ? "Verifying..." : "Unlock Danger Mode"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 border-b border-white/6 bg-[#13151a]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Coachable" className="h-5 opacity-70" />
            <span className="rounded bg-BrandOrange/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-BrandOrange">
              Admin
            </span>
            {dangerMinsDisplay && (
              <span className="animate-pulse rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                ⚠ Danger Mode · {dangerMinsDisplay}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={usersLoading || errorsLoading || playsLoading || userIssuesLoading}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/8 disabled:opacity-40"
            >
              <svg
                className={`h-3.5 w-3.5 ${usersLoading || errorsLoading || playsLoading || userIssuesLoading ? "animate-spin" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/6 px-3.5 py-2 text-xs text-BrandGray transition hover:border-white/20 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-10">
        {/* ── Stat row ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-7">
          <StatCard label="Total Users" value={users.length} />
          <StatCard label="Verified" value={verifiedCount} color="text-green-400" />
          <StatCard label="Not Onboarded" value={notOnboardedCount} color={notOnboardedCount > 0 ? "text-yellow-400" : "text-BrandGray2"} />
          <StatCard label="Beta Testers" value={betaTesterCount} color="text-purple-400" />
          <StatCard label="Error Reports" value={errorTotal} color={errorTotal > 0 ? "text-red-400" : "text-BrandGray2"} />
          <StatCard label="Reported Issues" value={userIssueTotal} color={userIssueTotal > 0 ? "text-purple-400" : "text-BrandGray2"} />
          <StatCard label="Platform Plays" value={playsLoading ? "..." : platformPlays.length} color="text-BrandOrange" />
        </div>

        {/* ── Quick Nav ── */}
        {/* ══════════════════════════════════════════════════════════════════
            USERS SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <section id="users" style={{ scrollMarginTop: "4rem" }}>
          <SectionHeader title="Users" badge={`${users.length}`} badgeColor="bg-white/6 text-BrandGray">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreate(true)}
                className="rounded-lg bg-BrandOrange/15 px-3 py-1.5 text-xs font-semibold text-BrandOrange transition hover:bg-BrandOrange/25"
              >
                Create Account
              </button>
              <button
                onClick={handleDeleteAll}
                className="rounded-lg bg-red-600/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-600/20"
              >
                Delete All Users
              </button>
            </div>
          </SectionHeader>
          {usersError && (
            <div className="mb-3 rounded-lg bg-red-600/10 px-4 py-2 text-sm text-red-400">{usersError}</div>
          )}

          {/* Users table */}
          <div className="overflow-hidden rounded-xl border border-white/6">
            <div className="border-b border-white/6 bg-[#1a1d23] px-4 py-3 flex flex-col gap-3">
              {/* Row 1: search + demo toggle + copy buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px] flex-1 max-w-xl">
                  <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-BrandGray2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                  </svg>
                  <input
                    type="text"
                    value={usersSearch}
                    onChange={(e) => setUsersSearch(e.target.value)}
                    placeholder="Search by name, email, or team"
                    className="w-full rounded-lg border border-white/8 bg-BrandBlack px-10 py-2.5 text-sm text-white outline-none placeholder:text-BrandGray2 focus:border-BrandOrange"
                  />
                  {usersSearch && (
                    <button
                      type="button"
                      onClick={() => setUsersSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-BrandGray2 transition hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-BrandGray select-none">
                  <input
                    type="checkbox"
                    checked={hideDemoAccounts}
                    onChange={(e) => setHideDemoAccounts(e.target.checked)}
                    className="accent-BrandOrange"
                  />
                  Hide demo
                </label>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyEmails("outlook")}
                    title="Copy emails separated by semicolons (Outlook format)"
                    className="rounded-lg border border-white/8 bg-BrandBlack px-3 py-2 text-xs text-BrandGray transition hover:border-BrandOrange/40 hover:text-white"
                  >
                    {emailCopied === "outlook" ? "Copied!" : "Copy for Outlook"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyEmails("gmail")}
                    title="Copy emails separated by commas (Gmail format)"
                    className="rounded-lg border border-white/8 bg-BrandBlack px-3 py-2 text-xs text-BrandGray transition hover:border-BrandOrange/40 hover:text-white"
                  >
                    {emailCopied === "gmail" ? "Copied!" : "Copy for Gmail"}
                  </button>
                </div>
              </div>
              {/* Row 2: advanced filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="rounded-lg border border-white/8 bg-BrandBlack px-3 py-2 text-xs text-white outline-none focus:border-BrandOrange"
                >
                  <option value="">All roles</option>
                  <option value="owner">Owner</option>
                  <option value="coach">Coach</option>
                  <option value="assistant_coach">Assistant Coach</option>
                  <option value="player">Player</option>
                </select>
                <select
                  value={filterVerified}
                  onChange={(e) => setFilterVerified(e.target.value)}
                  className="rounded-lg border border-white/8 bg-BrandBlack px-3 py-2 text-xs text-white outline-none focus:border-BrandOrange"
                >
                  <option value="">Any verification</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </select>
                <select
                  value={filterOnboarded}
                  onChange={(e) => setFilterOnboarded(e.target.value)}
                  className="rounded-lg border border-white/8 bg-BrandBlack px-3 py-2 text-xs text-white outline-none focus:border-BrandOrange"
                >
                  <option value="">Any onboard status</option>
                  <option value="yes">Onboarded</option>
                  <option value="no">Not onboarded</option>
                </select>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-BrandGray2">Min plays</span>
                  <input
                    type="number"
                    min="0"
                    value={filterMinPlays}
                    onChange={(e) => setFilterMinPlays(e.target.value)}
                    placeholder="0"
                    className="w-16 rounded-lg border border-white/8 bg-BrandBlack px-2 py-2 text-xs text-white outline-none focus:border-BrandOrange"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-BrandGray2">Min folders</span>
                  <input
                    type="number"
                    min="0"
                    value={filterMinFolders}
                    onChange={(e) => setFilterMinFolders(e.target.value)}
                    placeholder="0"
                    className="w-16 rounded-lg border border-white/8 bg-BrandBlack px-2 py-2 text-xs text-white outline-none focus:border-BrandOrange"
                  />
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-lg bg-white/6 px-3 py-2 text-xs text-BrandGray transition hover:bg-white/10 hover:text-white"
                  >
                    Reset filters ({activeFilterCount})
                  </button>
                )}
              </div>
            </div>
            <div className="hide-scroll overflow-auto" style={{ maxHeight: `${usersTableMaxHeight}px` }}>
              <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/6 bg-[#1e2228]">
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-BrandGray">Name</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-BrandGray">Email</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-BrandGray">Team</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-BrandGray">Plays</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-BrandGray">Folders</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-BrandGray">Status</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-BrandGray">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {usersLoading && users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-xs text-BrandGray2">Loading...</td>
                  </tr>
                )}
                {!usersLoading && users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-xs text-BrandGray2">No users found</td>
                  </tr>
                )}
                {!usersLoading && users.length > 0 && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-xs text-BrandGray2">No users match your search</td>
                  </tr>
                )}
                {filteredUsers.map((u) => {
                  const memberships = getSortedMemberships(u.memberships);
                  const hasCoachingRole = Boolean(u.can_view_activity);

                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-white/4 transition hover:bg-white/2 ${!u.onboarded_at ? "opacity-60" : ""}`}
                    >
                      <td className="px-4 py-3 font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenUserActivity(u.id)}
                            className="cursor-pointer text-left text-white transition hover:text-BrandOrange hover:underline"
                          >
                            {u.name}
                          </button>
                          {hasCoachingRole && (
                            <span className="rounded bg-BrandOrange/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-BrandOrange">
                              Activity
                            </span>
                          )}
                          {!u.onboarded_at && (
                            <span className="rounded bg-yellow-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-yellow-400">
                              Not onboarded
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-BrandGray2">
                          {hasCoachingRole ? "Click name to open activity" : "Click name to open details"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-BrandGray">{u.email}</td>
                      <td className="px-4 py-3 text-BrandGray">
                        {memberships.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {memberships.slice(0, 2).map((membership) => (
                              <span
                                key={`${u.id}-${membership.teamId}-${membership.role}`}
                                className="rounded-full bg-white/6 px-2 py-1 text-[10px] font-semibold text-BrandGray"
                              >
                                {membership.teamName} <span className="text-BrandGray2">({formatRole(membership.role)})</span>
                              </span>
                            ))}
                            {memberships.length > 2 && (
                              <span className="rounded-full bg-white/6 px-2 py-1 text-[10px] font-semibold text-BrandGray2">
                                +{memberships.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-BrandGray2">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-white">
                        {u.plays_created ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-white">
                        {u.folders_created ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            u.email_verified_at
                              ? "bg-green-500/15 text-green-400"
                              : "bg-white/6 text-BrandGray2"
                          }`}>
                            {u.email_verified_at ? "Verified" : "Unverified"}
                          </span>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleBetaTester(u);
                            }}
                            title={u.is_beta_tester ? "Remove beta tester" : "Make beta tester"}
                            className={`rounded-full px-2 py-1 text-[10px] font-semibold transition ${
                              u.is_beta_tester
                                ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                                : "bg-white/6 text-BrandGray2 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {u.is_beta_tester ? "Beta Tester" : "Standard"}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-BrandGray2">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenUserActivity(u.id)}
                            className="rounded px-2 py-1 text-xs text-BrandOrange transition hover:bg-BrandOrange/10"
                          >
                            {hasCoachingRole ? "Activity" : "Details"}
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteUser(u.id, u.name);
                            }}
                            className="rounded px-2 py-1 text-xs text-red-400/70 transition hover:bg-red-600/15 hover:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-white/6 bg-[#161a1f] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-BrandGray2">
                {filteredUsers.length === users.length
                  ? `${users.length} users`
                  : `${filteredUsers.length} matching users`}
              </p>
              <label className="flex items-center gap-2 text-xs text-BrandGray">
                <span className="uppercase tracking-wider text-BrandGray2">Visible Rows</span>
                <select
                  value={usersPerPage}
                  onChange={(e) => setUsersPerPage(Number(e.target.value))}
                  className="rounded-lg border border-white/8 bg-BrandBlack px-3 py-2 text-sm text-white outline-none focus:border-BrandOrange"
                >
                  {USER_PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            PLATFORM PLAYS SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <section id="plays" style={{ scrollMarginTop: "4rem" }}>
          <SectionHeader title="Platform Plays" badge={`${platformPlays.length}`} badgeColor="bg-BrandOrange/15 text-BrandOrange">
            <button
              onClick={() => window.open("/admin/app", "_self")}
              className="flex items-center gap-1.5 rounded-lg bg-BrandOrange/20 px-3 py-1.5 text-xs font-semibold text-BrandOrange transition hover:bg-BrandOrange/30"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Open Admin App
            </button>
          </SectionHeader>

          {playsError && (
            <div className="mb-3 rounded-lg bg-red-600/10 px-4 py-2 text-sm text-red-400">{playsError}</div>
          )}

          <div className="rounded-2xl border border-white/6 bg-[#1e2228] p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="font-Manrope text-lg font-bold text-white">Manage landing-page plays in Admin App</p>
                <p className="mt-2 text-sm leading-relaxed text-BrandGray">
                  Create platform plays and assign landing-page sections in Admin App.
                  The main admin dashboard no longer mirrors every play here, so this page stays focused on accounts and support operations.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/6 px-3 py-1 text-[11px] font-semibold text-BrandGray">
                    {playsLoading ? "Loading plays..." : `${platformPlays.length} platform plays`}
                  </span>
                  <span className="rounded-full bg-BrandOrange/15 px-3 py-1 text-[11px] font-semibold text-BrandOrange">
                    Section assignments live in /admin/app
                  </span>
                </div>
              </div>
              <button
                onClick={() => window.open("/admin/app", "_self")}
                className="flex items-center justify-center gap-2 rounded-xl bg-BrandOrange px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
              >
                Open Admin App
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5H19.5M19.5 4.5V10.5M19.5 4.5L10.5 13.5M19.5 13.5V18.75C19.5 19.9926 18.4926 21 17.25 21H5.25C4.00736 21 3 19.9926 3 18.75V6.75C3 5.50736 4.00736 4.5 5.25 4.5H10.5" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            TESTS SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <section id="tests" style={{ scrollMarginTop: "4rem" }}>
          <SectionHeader title="Tests" badge={allSuites ? `${totalTestCount} tests` : "Loading..."} badgeColor="bg-purple-500/15 text-purple-400">
            <button
              onClick={runTests}
              disabled={testRunning || enabledSuites.size === 0}
              className="flex items-center gap-2 rounded-lg bg-purple-500/20 px-4 py-2 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/30 active:scale-[0.97] disabled:opacity-40"
            >
              {testRunning ? (
                <>
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                  {enabledSuites.size === SUITE_NAMES.length ? "Run All Tests" : `Run ${selectedTestCount} Tests`}
                </>
              )}
            </button>
          </SectionHeader>

          {/* Test result summary bar */}
          {testResults && (
            <div className="mb-4 flex items-center gap-4 rounded-xl border border-white/6 bg-[#1e2228] px-5 py-3">
              <div className={`flex items-center gap-2 font-Manrope text-sm font-bold ${testStats.failed === 0 ? "text-green-400" : "text-red-400"}`}>
                {testStats.failed === 0 ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {testStats.failed === 0 ? "All Passing" : `${testStats.failed} Failing`}
              </div>
              <span className="text-xs text-BrandGray">{testStats.passed}/{testStats.total} passed</span>
              {testStats.failed > 0 && failedTestsReport && (
                <button
                  onClick={() => copyToClipboard(failedTestsReport, "all-failed-tests")}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/20"
                >
                  {copied === "all-failed-tests" ? "Copied!" : "Copy Failed Tests"}
                </button>
              )}
              <span className="ml-auto font-mono text-xs text-BrandGray2">{testTotalMs.toFixed(0)}ms</span>
            </div>
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
                  className={`cursor-pointer rounded-xl border p-3.5 transition ${
                    checked
                      ? "border-purple-500/30 bg-purple-500/5"
                      : "border-white/6 bg-[#1e2228] opacity-50 hover:opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-Manrope text-xs font-bold leading-tight">{name}</span>
                    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                      checked ? "border-purple-400 bg-purple-500/30" : "border-white/20"
                    }`}>
                      {checked && (
                        <svg className="h-2.5 w-2.5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] leading-snug text-BrandGray2">{SUITE_DESCRIPTIONS[name]}</p>
                  {suiteResult ? (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold ${suiteFailed === 0 ? "text-green-400" : "text-red-400"}`}>
                        {suiteFailed === 0 ? `${suitePassed} pass` : `${suiteFailed} fail`}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2 text-[10px] text-BrandGray2">{allSuites?.[name]?.length ?? "…"} tests</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Test results list */}
          {testResults && (
            <div className="mt-4 space-y-2">
              {testResults.map((suite) => {
                const isCollapsed = collapsedSuites.has(suite.name);
                const suiteFail = suite.results.filter((r) => r.status === "fail").length;
                return (
                  <div key={suite.name} className="overflow-hidden rounded-xl border border-white/6">
                    <button
                      onClick={() => setCollapsedSuites((prev) => {
                        const next = new Set(prev);
                        next.has(suite.name) ? next.delete(suite.name) : next.add(suite.name);
                        return next;
                      })}
                      className="flex w-full items-center justify-between bg-[#1e2228] px-4 py-3 transition hover:bg-[#252a31]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`h-2 w-2 rounded-full ${suiteFail === 0 ? "bg-green-400" : "bg-red-400"}`} />
                        <span className="font-Manrope text-sm font-bold">{suite.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-green-400">{suite.results.filter((r) => r.status === "pass").length} pass</span>
                        {suiteFail > 0 && <span className="text-red-400">{suiteFail} fail</span>}
                        <span className="font-mono text-BrandGray2">{suite.totalMs.toFixed(1)}ms</span>
                        <svg className={`h-3.5 w-3.5 text-BrandGray2 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {!isCollapsed && (
                      <div className="divide-y divide-white/4">
                        {suite.results.map((r, i) => {
                          const key = `${suite.name}-${i}`;
                          const isExpanded = expandedTests.has(key);
                          return (
                            <div key={key} className={r.status === "fail" ? "bg-red-600/5" : ""}>
                              <div
                                className="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-white/2"
                                onClick={() => setExpandedTests((prev) => {
                                  const next = new Set(prev);
                                  next.has(key) ? next.delete(key) : next.add(key);
                                  return next;
                                })}
                              >
                                {r.status === "pass" ? (
                                  <svg className="h-3.5 w-3.5 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="h-3.5 w-3.5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )}
                                <span className="flex-1 text-xs text-white">{r.testName}</span>
                                <span className="font-mono text-[10px] text-BrandGray2">
                                  {r.durationMs < 1 ? `${(r.durationMs * 1000).toFixed(0)}μs` : `${r.durationMs.toFixed(1)}ms`}
                                </span>
                              </div>
                              {isExpanded && r.error && (
                                <div className="mx-4 mb-2">
                                  <pre className="rounded-lg border border-red-500/20 bg-red-600/10 px-4 py-3 font-mono text-[11px] leading-relaxed text-red-300 whitespace-pre-wrap">
                                    {r.error}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            ERROR REPORTS SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <section id="errors" style={{ scrollMarginTop: "4rem" }}>
          <SectionHeader title="Error Reports" badge={errorTotal > 0 ? `${errorTotal}` : "None"} badgeColor={errorTotal > 0 ? "bg-red-500/15 text-red-400" : "bg-white/6 text-BrandGray2"}>
            {errors.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const text = errors.map((r) => formatReportText(r)).join("\n\n---\n\n");
                    copyToClipboard(text, "all-errors");
                  }}
                  className="rounded-lg border border-BrandOrange/40 bg-BrandOrange/10 px-3 py-1.5 text-xs font-semibold text-BrandOrange transition hover:bg-BrandOrange/20"
                >
                  {copied === "all-errors" ? "Copied!" : "Copy Reports"}
                </button>
                <button
                  onClick={handleClearErrors}
                  className="rounded-lg bg-red-600/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-600/20"
                >
                  Clear All
                </button>
              </div>
            )}
          </SectionHeader>

          {errorsError && (
            <div className="mb-3 rounded-lg bg-red-600/10 px-4 py-2 text-sm text-red-400">{errorsError}</div>
          )}

          {errorsLoading && errors.length === 0 && (
            <div className="rounded-xl border border-white/6 px-6 py-10 text-center text-xs text-BrandGray2">
              Loading...
            </div>
          )}

          {!errorsLoading && errors.length === 0 && (
            <div className="rounded-xl border border-white/6 bg-[#1e2228] px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/4">
                <svg className="h-5 w-5 text-BrandGray2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-BrandGray">No error reports</p>
              <p className="mt-0.5 text-xs text-BrandGray2">Errors from users will appear here</p>
            </div>
          )}

          {errors.length > 0 && (
            <div className="hide-scroll max-h-[60vh] overflow-y-auto space-y-2 pr-1 rounded-xl">
              {errors.map((r) => {
                const isExpanded = expandedError === r.id;
                const device = r.device_info || {};
                const title = deriveTitle(r);
                return (
                  <div
                    key={r.id}
                    className="overflow-hidden rounded-xl border border-white/6 transition hover:border-white/10"
                  >
                    <button
                      onClick={() => setExpandedError(isExpanded ? null : r.id)}
                      className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
                    >
                      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        r.component === "api"
                          ? "bg-BrandOrange/20 text-BrandOrange"
                          : r.component === "videoExport"
                          ? "bg-purple-500/20 text-purple-400"
                          : r.component === "global"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-white/6 text-BrandGray"
                      }`}>
                        {r.component || "unknown"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-BrandOrange">{title}</p>
                        <p className="mt-0.5 truncate text-xs text-BrandGray">{r.error_message}</p>
                        <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-BrandGray2">
                          <span>{parseDevice(r.user_agent)}</span>
                          {device.screenWidth && <span>{device.screenWidth}×{device.screenHeight}</span>}
                          <span>{formatTime(r.created_at)}</span>
                        </div>
                      </div>
                      <svg className={`mt-1 h-3.5 w-3.5 shrink-0 text-BrandGray2 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-white/5 bg-[#1e2228]/60 px-4 py-3">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                          <div><span className="text-BrandGray2">Page:</span> <span className="text-BrandGray">{r.page_url || "—"}</span></div>
                          <div><span className="text-BrandGray2">User ID:</span> <span className="font-mono text-BrandGray">{r.user_id || "anonymous"}</span></div>
                          <div><span className="text-BrandGray2">Device:</span> <span className="text-BrandGray">{device.platform || "—"}{device.isMobile ? " (mobile)" : " (desktop)"}{device.standalone ? " [PWA]" : ""}</span></div>
                          <div><span className="text-BrandGray2">Session:</span> <span className="font-mono text-BrandGray">{r.session_id?.slice(0, 12) || "—"}...</span></div>
                        </div>
                        {r.extra && (
                          <div className="mt-3">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">Extra</p>
                            <pre className="overflow-x-auto rounded-lg bg-BrandBlack/50 p-2 text-[11px] text-BrandGray">{JSON.stringify(r.extra, null, 2)}</pre>
                          </div>
                        )}
                        {r.error_stack && (
                          <div className="mt-3">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-BrandGray2">Stack Trace</p>
                            <pre className="hide-scroll max-h-40 overflow-auto rounded-lg bg-BrandBlack/50 p-2 text-[11px] leading-relaxed text-red-400/80">{r.error_stack}</pre>
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[10px] text-BrandGray2">{new Date(r.created_at).toLocaleString()}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(r.error_message + "\n" + (r.error_stack || ""), r.id); }}
                              className="rounded px-2 py-1 text-xs text-BrandGray transition hover:bg-white/6 hover:text-white"
                            >
                              {copied === r.id ? "Copied!" : "Copy"}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteError(r.id); }}
                              className="rounded px-2 py-1 text-xs text-red-400 transition hover:bg-red-600/20"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            REPORTED ISSUES SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <section id="reported-issues" style={{ scrollMarginTop: "4rem" }}>
          <SectionHeader title="Reported Issues" badge={userIssueTotal > 0 ? `${userIssueTotal}` : "None"} badgeColor={userIssueTotal > 0 ? "bg-purple-500/15 text-purple-400" : "bg-white/6 text-BrandGray2"} />

          {userIssuesError && (
            <div className="mb-3 rounded-lg bg-red-600/10 px-4 py-2 text-sm text-red-400">{userIssuesError}</div>
          )}

          {userIssuesLoading && userIssues.length === 0 && (
            <div className="rounded-xl border border-white/6 px-6 py-10 text-center text-xs text-BrandGray2">Loading...</div>
          )}

          {!userIssuesLoading && userIssues.length === 0 && (
            <div className="rounded-xl border border-white/6 bg-[#1e2228] px-6 py-12 text-center">
              <p className="text-sm font-semibold text-BrandGray">No reported issues</p>
              <p className="mt-0.5 text-xs text-BrandGray2">Issues submitted by beta testers will appear here</p>
            </div>
          )}

          {userIssues.length > 0 && (
            <div className="hide-scroll max-h-[60vh] overflow-y-auto space-y-2 pr-1 rounded-xl">
              {userIssues.map((issue) => {
                const isExpanded = expandedIssue === issue.id;
                const meta = issueStatusMeta(issue.status);
                return (
                  <div key={issue.id} className="overflow-hidden rounded-xl border border-white/6 transition hover:border-white/10">
                    <button
                      onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                      className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
                    >
                      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${meta.className}`}>
                        {meta.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{issue.title}</p>
                        <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-BrandGray2">
                          <span>{issue.user_name || "Unknown"}</span>
                          {issue.user_email && <span>{issue.user_email}</span>}
                          <span>{formatTime(issue.created_at)}</span>
                        </div>
                      </div>
                      <svg className={`mt-1 h-3.5 w-3.5 shrink-0 text-BrandGray2 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-white/5 bg-[#1e2228]/60 px-4 py-4">
                        <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-BrandGray">{issue.description}</p>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase text-BrandGray2">Status:</span>
                            <select
                              value={issue.status}
                              onChange={(e) => handleIssueStatusChange(issue, e.target.value)}
                              className="rounded-lg border border-BrandGray2/30 bg-BrandBlack px-2 py-1 text-xs text-white outline-none focus:border-BrandOrange"
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-BrandGray2">{new Date(issue.created_at).toLocaleString()}</span>
                            <button
                              onClick={() => handleDeleteIssue(issue.id)}
                              className="rounded px-2 py-1 text-xs text-red-400 transition hover:bg-red-600/20"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            DEMO VIDEOS SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <section id="demo-videos" style={{ scrollMarginTop: "4rem" }}>
          <SectionHeader title="Demo Videos" badge="Tutorial videos" badgeColor="bg-blue-500/15 text-blue-400">
            <button
              onClick={() => window.open("/admin/demo-videos", "_self")}
              className="flex items-center gap-1.5 rounded-lg bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-400 transition hover:bg-blue-500/25"
            >
              Manage Videos
            </button>
          </SectionHeader>
          <div className="flex items-center justify-between rounded-xl border border-white/6 bg-[#1e2228] px-5 py-4">
            <div>
              <p className="text-sm font-semibold">Tutorial video library</p>
              <p className="mt-0.5 text-xs text-BrandGray2">Manage which how-to videos appear on the Videos page for coaches</p>
            </div>
            <button
              onClick={() => window.open("/admin/demo-videos", "_self")}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
            >
              Open Video Manager
            </button>
          </div>
        </section>

        <div className="h-6" />
      </div>

      {/* ── Create Account Modal ── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/8 bg-[#1a1d23] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-BrandOrange/20">
                <svg className="h-5 w-5 text-BrandOrange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <h2 className="font-Manrope text-base font-bold">Create Account</h2>
                <p className="text-xs text-BrandGray">No email verification required</p>
              </div>
            </div>
            <form onSubmit={handleCreateAccount} className="flex flex-col gap-3">
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name *"
                required
                className="w-full rounded-lg border border-white/8 bg-BrandBlack px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-BrandGray2 focus:border-BrandOrange"
              />
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email address *"
                required
                className="w-full rounded-lg border border-white/8 bg-BrandBlack px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-BrandGray2 focus:border-BrandOrange"
              />
              <input
                type="text"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Password * (min 6 chars)"
                required
                minLength={6}
                className="w-full rounded-lg border border-white/8 bg-BrandBlack px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-BrandGray2 focus:border-BrandOrange"
              />
              <div className="mt-1 border-t border-white/6 pt-3">
                <p className="mb-2.5 text-xs text-BrandGray2">Optional — create a team (auto-onboards user)</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createForm.teamName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, teamName: e.target.value }))}
                    placeholder="Team name"
                    className="flex-1 rounded-lg border border-white/8 bg-BrandBlack px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-BrandGray2 focus:border-BrandOrange"
                  />
                  <input
                    type="text"
                    value={createForm.sport}
                    onChange={(e) => setCreateForm((f) => ({ ...f, sport: e.target.value }))}
                    placeholder="Sport"
                    className="w-28 rounded-lg border border-white/8 bg-BrandBlack px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-BrandGray2 focus:border-BrandOrange"
                  />
                </div>
              </div>
              {usersError && <p className="text-xs text-red-400">{usersError}</p>}
              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-white/8 px-4 py-2 text-sm text-BrandGray transition hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-BrandOrange px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

