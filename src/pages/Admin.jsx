import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { ConfirmDialog } from "../design-system/components";
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
} from "../admin/components";
import {
  Card,
  Section,
  Button,
  Input,
  Select,
  Checkbox,
  Modal,
  Avatar,
  Badge,
  EmptyState,
  SearchInput,
  Spinner,
  DataTable,
} from "../design-system/components";

const SESSION_KEY = "coachable_admin_session";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const USER_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const USERS_VIEW_STATE_KEY = "coachable_admin_users_view_state_v1";

function readUsersViewState() {
  try {
    const raw = sessionStorage.getItem(USERS_VIEW_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function patchUsersViewState(patch) {
  try {
    const current = readUsersViewState();
    sessionStorage.setItem(USERS_VIEW_STATE_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    // sessionStorage unavailable — ignore
  }
}

const TIME_AGE_OPTIONS = [
  { value: "1h",  label: "1 hour" },
  { value: "2h",  label: "2 hours" },
  { value: "4h",  label: "4 hours" },
  { value: "8h",  label: "8 hours" },
  { value: "1d",  label: "1 day" },
  { value: "2d",  label: "2 days" },
  { value: "7d",  label: "7 days" },
  { value: "30d", label: "30 days" },
];
const TIME_AGE_MS = { "1h": 36e5, "2h": 72e5, "4h": 144e5, "8h": 288e5, "1d": 864e5, "2d": 1728e5, "7d": 6048e5, "30d": 2592e6 };

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
        <Section title="Recent Activity">
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px" }}>
            <Spinner />
          </div>
        </Section>
      </section>
    );
  }

  if (error) {
    return (
      <section id="recent-activity" style={{ scrollMarginTop: "4rem" }}>
        <Section title="Recent Activity">
          <div style={{ color: "var(--adm-danger)", fontSize: 13 }}>
            Failed to load recent activity: {error}
          </div>
        </Section>
      </section>
    );
  }

  return (
    <section id="recent-activity" style={{ scrollMarginTop: "4rem" }}>
      <Section title="Recent Activity">
        {data && (
          <Card>
            <ActivityFeed
              users={data.recentUsers}
              errors={data.recentErrors}
              issues={data.recentIssues}
            />
          </Card>
        )}
      </Section>
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
  const persistedUsersView = useRef(readUsersViewState()).current;
  const [usersSearch, setUsersSearch] = useState(() => persistedUsersView.usersSearch || "");
  const [hideOptions, setHideOptions] = useState(() => new Set(
    Array.isArray(persistedUsersView.hideOptions) ? persistedUsersView.hideOptions : ["demo"]
  ));
  const [hideDropdownOpen, setHideDropdownOpen] = useState(false);
  const hideDropdownRef = useRef(null);
  const usersScrollRef = useRef(null);
  const hasRestoredScrollRef = useRef(false);
  const [usersPerPage, setUsersPerPage] = useState(() => persistedUsersView.usersPerPage || 10);
  const [filterRole, setFilterRole] = useState(() => persistedUsersView.filterRole || ""); // "coach"|"owner"|"assistant_coach"|"player"|""
  const [filterVerified, setFilterVerified] = useState(() => persistedUsersView.filterVerified || ""); // "verified"|"unverified"|""
  const [filterOnboarded, setFilterOnboarded] = useState(() => persistedUsersView.filterOnboarded || ""); // "yes"|"no"|""
  const [filterPlays, setFilterPlays] = useState(() => persistedUsersView.filterPlays || "");
  const [filterPlaysOp, setFilterPlaysOp] = useState(() => persistedUsersView.filterPlaysOp || ">");
  const [filterSport, setFilterSport] = useState(() => persistedUsersView.filterSport || "");
  const [filterJoinedAge, setFilterJoinedAge] = useState(() => persistedUsersView.filterJoinedAge || "");
  const [filterJoinedOp, setFilterJoinedOp] = useState(() => persistedUsersView.filterJoinedOp || "<");
  const [filterActivityAge, setFilterActivityAge] = useState(() => persistedUsersView.filterActivityAge || "");
  const [filterActivityOp, setFilterActivityOp] = useState(() => persistedUsersView.filterActivityOp || "<");
  const [sortKey, setSortKey] = useState(() => persistedUsersView.sortKey || ""); // ""|"plays"|"teamSize"|"name"|"sport"|"joined"|"team"
  const [sortDir, setSortDir] = useState(() => persistedUsersView.sortDir || "asc"); // "asc"|"desc"
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
  const [elevateStep, setElevateStep] = useState("password"); // "password" | "code"
  const [elevatePassword, setElevatePassword] = useState("");
  const [elevateCode, setElevateCode] = useState("");
  const [elevateMaskedEmail, setElevateMaskedEmail] = useState("");
  const [elevateError, setElevateError] = useState("");
  const [elevating, setElevating] = useState(false);
  const elevateResolveRef = useRef(null);

  // ── Admin Settings ──
  const [securityEmail, setSecurityEmail] = useState(""); // masked display value
  const [securityEmailInput, setSecurityEmailInput] = useState(""); // raw input for editing
  const [securityEmailConfigured, setSecurityEmailConfigured] = useState(false);
  const [securityEmailEditing, setSecurityEmailEditing] = useState(false);
  const [securityEmailSaving, setSecurityEmailSaving] = useState(false);
  const [securityEmailError, setSecurityEmailError] = useState("");
  const [securityEmailSuccess, setSecurityEmailSuccess] = useState("");
  const [securityEmailStep, setSecurityEmailStep] = useState("input"); // "input" | "code"
  const [securityEmailCode, setSecurityEmailCode] = useState("");
  const [securityEmailMasked, setSecurityEmailMasked] = useState(""); // current masked email shown during OTP step
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
    setElevateStep("password");
    setElevatePassword("");
    setElevateCode("");
    setElevateMaskedEmail("");
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
   * Step 1: Validate admin password. If a security email is configured the
   * server sends an OTP and we advance to the code entry step. If no email is
   * configured the server elevates immediately.
   * @param {React.FormEvent} e
   */
  const handleElevateRequestCode = async (e) => {
    e.preventDefault();
    setElevateError("");
    setElevating(true);
    try {
      const res = await fetch(`${API_URL}/admin/elevate/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-session": session },
        body: JSON.stringify({ password: elevatePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Elevation failed");

      if (data.elevated) {
        // No security email configured — elevated immediately
        setAdminElevated(data.elevatedUntil);
        setElevatedUntil(data.elevatedUntil);
        setElevatePassword("");
        setElevateModal(false);
        elevateResolveRef.current?.(true);
      } else {
        // OTP sent — advance to code step
        setElevateMaskedEmail(data.maskedEmail || "");
        setElevateStep("code");
        setElevatePassword("");
      }
    } catch (err) {
      setElevateError(err.message || "Invalid password");
    } finally {
      setElevating(false);
    }
  };

  /**
   * Step 2: Submit the OTP received by email to complete Danger Mode elevation.
   * @param {React.FormEvent} e
   */
  const handleElevateConfirmCode = async (e) => {
    e.preventDefault();
    setElevateError("");
    setElevating(true);
    try {
      const res = await fetch(`${API_URL}/admin/elevate/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-session": session },
        body: JSON.stringify({ code: elevateCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setAdminElevated(data.elevatedUntil);
      setElevatedUntil(data.elevatedUntil);
      setElevateCode("");
      setElevateStep("password");
      setElevateModal(false);
      elevateResolveRef.current?.(true);
    } catch (err) {
      setElevateError(err.message || "Invalid code");
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
      setElevateStep("password");
      setElevatePassword("");
      setElevateCode("");
      setElevateMaskedEmail("");
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

  /**
   * Step 1: Submit new security email. If a current email exists the server
   * sends an OTP to it; we advance to the code step. Otherwise applies immediately.
   * @param {React.FormEvent} e
   */
  const handleSaveSecurityEmail = async (e) => {
    e.preventDefault();
    setSecurityEmailError("");
    setSecurityEmailSuccess("");
    setSecurityEmailSaving(true);
    try {
      const data = await adminFetch("/admin/settings/security-email", {
        method: "PUT",
        body: { email: securityEmailInput },
      });
      if (data.codeSent) {
        setSecurityEmailMasked(data.maskedEmail || "");
        setSecurityEmailCode("");
        setSecurityEmailStep("code");
      } else {
        setSecurityEmail(data.maskedEmail || "");
        setSecurityEmailConfigured(!!data.configured);
        setSecurityEmailInput("");
        setSecurityEmailEditing(false);
        setSecurityEmailStep("input");
        setSecurityEmailSuccess(data.configured ? "Security email saved." : "Security email cleared.");
        setTimeout(() => setSecurityEmailSuccess(""), 3000);
      }
    } catch (err) {
      setSecurityEmailError(err.message || "Failed to save");
    } finally {
      setSecurityEmailSaving(false);
    }
  };

  /**
   * Step 2: Submit OTP to confirm the security email change.
   * @param {React.FormEvent} e
   */
  const handleConfirmSecurityEmailCode = async (e) => {
    e.preventDefault();
    setSecurityEmailError("");
    setSecurityEmailSaving(true);
    try {
      const data = await adminFetch("/admin/settings/security-email/confirm", {
        method: "POST",
        body: { code: securityEmailCode },
      });
      setSecurityEmail(data.maskedEmail || "");
      setSecurityEmailConfigured(!!data.configured);
      setSecurityEmailInput("");
      setSecurityEmailCode("");
      setSecurityEmailStep("input");
      setSecurityEmailEditing(false);
      setSecurityEmailSuccess(data.configured ? "Security email updated." : "Security email cleared.");
      setTimeout(() => setSecurityEmailSuccess(""), 3000);
    } catch (err) {
      setSecurityEmailError(err.message || "Invalid code");
    } finally {
      setSecurityEmailSaving(false);
    }
  };

  // ── Initial load ──
  useEffect(() => {
    if (authed) {
      fetchUsers();
      fetchErrors();
      fetchPlatformPlays();
      fetchUserIssues();
      // Load configured security email (server returns masked value)
      adminFetch("/admin/settings/security-email")
        .then((data) => {
          setSecurityEmail(data.email || "");
          setSecurityEmailConfigured(!!data.configured);
        })
        .catch(() => {});
    }
  }, [authed, fetchUsers, fetchErrors, fetchPlatformPlays, fetchUserIssues, adminFetch]);

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

  // ── Persist users-table view state (filters + scroll) across navigation ──
  useEffect(() => {
    patchUsersViewState({
      usersSearch,
      hideOptions: Array.from(hideOptions),
      usersPerPage,
      filterRole,
      filterVerified,
      filterOnboarded,
      filterPlays,
      filterPlaysOp,
      filterSport,
      filterJoinedAge,
      filterJoinedOp,
      filterActivityAge,
      filterActivityOp,
      sortKey,
      sortDir,
    });
  }, [usersSearch, hideOptions, usersPerPage, filterRole, filterVerified, filterOnboarded, filterPlays, filterPlaysOp, filterSport, filterJoinedAge, filterJoinedOp, filterActivityAge, filterActivityOp, sortKey, sortDir]);

  // Restore the users-table scroll position once after users load.
  useEffect(() => {
    if (hasRestoredScrollRef.current) return;
    if (usersLoading) return;
    if (!usersScrollRef.current) return;
    if (users.length === 0) return;
    const saved = readUsersViewState().usersScrollTop;
    if (typeof saved === "number" && saved > 0) {
      usersScrollRef.current.scrollTop = saved;
    }
    hasRestoredScrollRef.current = true;
  }, [usersLoading, users.length]);

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
      if (hideOptions.has("verified") && u.email_verified_at) return false;
      if (hideOptions.has("unverified") && !u.email_verified_at) return false;
      if (hideOptions.has("beta_tester") && u.is_beta_tester) return false;
      if (hideOptions.has("standard") && !u.is_beta_tester) return false;
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
      if (filterJoinedAge) {
        const ageMs = TIME_AGE_MS[filterJoinedAge];
        const userAgeMs = Date.now() - new Date(u.created_at).getTime();
        if (!matchesOp(userAgeMs, filterJoinedOp, ageMs)) return false;
      }
      if (filterActivityAge) {
        const ageMs = TIME_AGE_MS[filterActivityAge];
        const userAgeMs = Date.now() - new Date(u.updated_at || u.created_at).getTime();
        if (!matchesOp(userAgeMs, filterActivityOp, ageMs)) return false;
      }
      if (filterSport) {
        const hasSport = (u.memberships || []).some((m) => m.sport?.toLowerCase().includes(filterSport.toLowerCase()));
        if (!hasSport) return false;
      }
      return true;
    });
  }, [users, normalizedUsersSearch, hideOptions, filterRole, filterVerified, filterOnboarded, filterPlays, filterPlaysOp, filterSport, filterJoinedAge, filterJoinedOp, filterActivityAge, filterActivityOp]);

  // Map of teamId → number of users in that team (across the full user list, not just filtered).
  const teamSizesById = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      (u.memberships || []).forEach((m) => {
        if (!m.teamId) return;
        map.set(m.teamId, (map.get(m.teamId) || 0) + 1);
      });
    });
    return map;
  }, [users]);

  const sortedFilteredUsers = useMemo(() => {
    if (!sortKey) return filteredUsers;
    const dir = sortDir === "desc" ? -1 : 1;
    /** Extract the primary (highest-priority) membership for a user. */
    const primaryMembership = (u) => getSortedMemberships(u.memberships || [])[0];

    // "Team size" groups users by their primary team and orders teams by member count.
    // Primary: team size (dir-controlled). Secondary: team name (stable, A-Z). Tertiary: user name.
    if (sortKey === "teamSize") {
      return [...filteredUsers].sort((a, b) => {
        const am = primaryMembership(a);
        const bm = primaryMembership(b);
        const aSize = am?.teamId ? (teamSizesById.get(am.teamId) || 0) : 0;
        const bSize = bm?.teamId ? (teamSizesById.get(bm.teamId) || 0) : 0;
        if (aSize !== bSize) return (aSize - bSize) * dir;
        const aTeam = (am?.teamName || "").toLowerCase();
        const bTeam = (bm?.teamName || "").toLowerCase();
        if (aTeam !== bTeam) return aTeam < bTeam ? -1 : 1;
        const an = (a.name || "").toLowerCase();
        const bn = (b.name || "").toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }

    const getValue = (u) => {
      switch (sortKey) {
        case "plays":  return u.plays_created ?? 0;
        case "name":   return (u.name || "").toLowerCase();
        case "sport":  return (primaryMembership(u)?.sport || "").toLowerCase();
        case "joined": return new Date(u.created_at || 0).getTime();
        case "team":   return (primaryMembership(u)?.teamName || "").toLowerCase();
        default:       return 0;
      }
    };
    const isNumeric = sortKey === "plays" || sortKey === "joined";
    return [...filteredUsers].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (isNumeric) return (av - bv) * dir;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredUsers, sortKey, sortDir, teamSizesById]);

  const activeFilterCount = [filterRole, filterVerified, filterOnboarded, filterPlays, filterSport, filterJoinedAge, filterActivityAge].filter(Boolean).length;
  const filteredUserStats = useMemo(() => ({
    verified: filteredUsers.filter((u) => u.email_verified_at).length,
    beta: filteredUsers.filter((u) => u.is_beta_tester).length,
    pending: filteredUsers.filter((u) => !u.onboarded_at).length,
    coaching: filteredUsers.filter((u) => u.can_view_activity).length,
  }), [filteredUsers]);

  const userTableColumns = useMemo(() => [
    {
      key: "user",
      label: "User",
      width: "25%",
      render: (u) => {
        const memberships = getSortedMemberships(u.memberships);
        const hasCoachingRole = Boolean(u.can_view_activity);
        return (
          <div className="flex items-start gap-3">
            <Avatar name={u.name || u.email} size="md" />
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOpenUserActivity(u.id); }}
                className="block truncate text-sm font-semibold transition-colors w-full p-0 text-left"
                style={{ color: "var(--adm-text)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--adm-accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--adm-text)"; }}
              >
                {u.name}
              </button>
              <p className="mt-1 text-xs truncate" style={{ color: "var(--adm-muted)" }}>
                {memberships.length > 0 ? `${memberships.length} ${memberships.length === 1 ? "team role" : "team roles"}` : "No team memberships"}
              </p>
              {!u.onboarded_at && (
                <div className="mt-2 flex gap-1 overflow-hidden">
                  <Badge status="warning">Needs onboarding</Badge>
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "email",
      label: "Email",
      width: "25%",
      render: (u) => (
        <div className="truncate text-xs leading-relaxed" style={{ color: "var(--adm-text2)" }}>{u.email}</div>
      ),
    },
    {
      key: "teams",
      label: "Teams",
      width: "25%",
      render: (u) => {
        const memberships = getSortedMemberships(u.memberships);
        if (memberships.length === 0) return <span style={{ color: "var(--adm-muted)" }}>—</span>;
        return (
          <div className="flex gap-1 overflow-hidden">
            {memberships.slice(0, 1).map((m) => (
              <Badge key={`${u.id}-${m.teamId}-${m.role}`} className="truncate">
                {m.teamName} <span className="ml-1 shrink-0 opacity-60">{formatRole(m.role)}</span>
              </Badge>
            ))}
            {memberships.length > 1 && (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap" style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-muted)" }}>
                +{memberships.length - 1}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "plays",
      label: "Plays",
      width: "64px",
      align: "center",
      render: (u) => {
        const memberships = getSortedMemberships(u.memberships);
        const isPlayerOnly = memberships.length > 0 && memberships.every((m) => m.role === "player");
        if (isPlayerOnly) return <span className="text-xs" style={{ color: "var(--adm-muted)" }}>—</span>;
        return (
          <Badge status="info">{u.plays_created ?? 0}</Badge>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      width: "96px",
      render: (u) => (
        <div className="flex flex-col gap-1">
          <Badge status={u.email_verified_at ? "resolved" : undefined}>
            {u.email_verified_at ? "Verified" : "Unverified"}
          </Badge>
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleBetaTester(u); }}
            title={u.is_beta_tester ? "Remove beta tester" : "Make beta tester"}
            className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-opacity hover:opacity-80"
            style={u.is_beta_tester
              ? { backgroundColor: "var(--adm-badge-purple-bg)", borderColor: "transparent", color: "var(--adm-badge-purple-text)" }
              : { backgroundColor: "var(--adm-surface3)", borderColor: "var(--adm-border)", color: "var(--adm-muted)" }}
          >
            {u.is_beta_tester ? "Beta" : "Standard"}
          </button>
        </div>
      ),
    },
    {
      key: "joined",
      label: "Joined",
      width: "80px",
      render: (u) => <span className="text-xs" style={{ color: "var(--adm-text2)" }}>{formatAdminDate(u.created_at)}</span>,
    },
    {
      key: "roles",
      label: "Roles",
      width: "112px",
      render: (u) => {
        const memberships = getSortedMemberships(u.memberships);
        const uniqueRoles = Array.from(new Set(memberships.map((m) => m.role)));
        if (uniqueRoles.length === 0) return <span className="text-xs" style={{ color: "var(--adm-muted)" }}>—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {uniqueRoles.map((role) => (
              <span key={role} className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap" style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)" }}>
                {formatRole(role)}
              </span>
            ))}
          </div>
        );
      },
    },
  ], [handleOpenUserActivity, handleToggleBetaTester]);

  /** Copy filtered user emails to clipboard in the given separator format. */
  function handleCopyEmails(format) {
    const sep = format === "outlook" ? "; " : ", ";
    const text = sortedFilteredUsers.map((u) => u.email).join(sep);
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
    setFilterSport("");
    setFilterJoinedAge("");
    setFilterJoinedOp("<");
    setFilterActivityAge("");
    setFilterActivityOp("<");
    setHideOptions(new Set(["demo"]));
    setSortKey("");
    setSortDir("asc");
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
        <AdminShell sidebar={false}>
          <div
            className="flex min-h-full items-start justify-center px-4 md:items-center md:px-6"
            style={{
              minHeight: "var(--app-viewport-height)",
              paddingTop: "max(2rem, env(safe-area-inset-top))",
              paddingBottom: "calc(2rem + env(safe-area-inset-bottom) + var(--app-keyboard-inset))",
            }}
          >
            <Spinner size={24} />
          </div>
        </AdminShell>
      );
    }
    return (
      <AdminShell sidebar={false}>
        <div
          className="flex min-h-full items-start justify-center px-4 md:items-center md:px-6"
          style={{
            minHeight: "var(--app-viewport-height)",
            paddingTop: "max(2rem, env(safe-area-inset-top))",
            paddingBottom: "calc(2rem + env(safe-area-inset-bottom) + var(--app-keyboard-inset))",
            scrollPaddingBottom: "calc(8rem + var(--app-keyboard-inset))",
          }}
        >
          <Card className="w-full max-w-sm" style={{ boxShadow: "var(--adm-shadow)" }}>
          <div className="mb-6 text-center">
            <p className="font-Manrope text-sm font-normal" style={{ color: "var(--adm-text)" }}>Admin Panel</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--adm-muted)" }}>Restricted access</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              autoFocus
            />
            {loginError && <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{loginError}</p>}
            <Button variant="primary" type="submit" disabled={logging || !password} className="w-full justify-center py-2.5">
              {logging ? "Authenticating…" : "Sign in"}
            </Button>
          </form>
          </Card>
        </div>
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
      <ConfirmDialog
        open={confirmModal.open}
        title={confirmModal.message}
        description={confirmModal.subtitle}
        confirmLabel={confirmModal.confirmLabel}
        tone={confirmModal.danger ? "danger" : "default"}
        onConfirm={handleConfirmOk}
        onCancel={handleConfirmCancel}
      />

      {/* Danger Mode elevation modal — Step 1: password */}
      <Modal open={elevateModal && elevateStep === "password"} onClose={handleElevateCancel} title="Danger Mode Required" width="max-w-sm" hideClose>
        <p className="mb-4 text-xs" style={{ color: "var(--adm-danger)" }}>
          Re-enter your admin password. A verification code will be sent to your security email.
        </p>
        <form onSubmit={handleElevateRequestCode} className="flex flex-col gap-3">
          <Input
            type="password"
            value={elevatePassword}
            onChange={(e) => setElevatePassword(e.target.value)}
            placeholder="Admin password"
            autoFocus
          />
          {elevateError && <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{elevateError}</p>}
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={handleElevateCancel} className="flex-1 justify-center">Cancel</Button>
            <Button variant="danger" type="submit" disabled={elevating || !elevatePassword} className="flex-1 justify-center">
              {elevating ? "Sending…" : "Send Code"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Danger Mode elevation modal — Step 2: OTP code */}
      <Modal open={elevateModal && elevateStep === "code"} onClose={handleElevateCancel} title="Check Your Email" width="max-w-sm" hideClose>
        <p className="mb-1 text-xs" style={{ color: "var(--adm-text2)" }}>
          A 6-digit verification code was sent to:
        </p>
        <p className="mb-4 text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{elevateMaskedEmail}</p>
        <form onSubmit={handleElevateConfirmCode} className="flex flex-col gap-3">
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={elevateCode}
            onChange={(e) => setElevateCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            autoFocus
          />
          {elevateError && <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{elevateError}</p>}
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={() => { setElevateStep("password"); setElevateCode(""); setElevateError(""); }} className="flex-1 justify-center">Back</Button>
            <Button variant="danger" type="submit" disabled={elevating || elevateCode.length !== 6} className="flex-1 justify-center">
              {elevating ? "Verifying…" : "Unlock"}
            </Button>
          </div>
        </form>
      </Modal>

      <AdminHeader
        title="Dashboard"
        actions={
          <>
            {dangerMinsDisplay && (
              <span className="animate-pulse rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>
                Danger · {dangerMinsDisplay}
              </span>
            )}
            <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={anyLoading}>
              {anyLoading ? <Spinner size={12} /> : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>Logout</Button>
          </>
        }
      />
      <AdminPage className="space-y-10">
        {/* Analytics dashboard */}
        <section>
          <Section title="Analytics" className="mb-4" />
          <AnalyticsDashboard session={session} />
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => navigate(adminPath(basePath, "/one-page"))}>
              View One Pager
            </Button>
          </div>
        </section>

        {/* USERS TABLE */}
        <section id="users" style={{ scrollMarginTop: "4rem" }}>
          <Section
            title="Users Table"
            actions={
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>Create Account</Button>
            }
          >
          {usersError && (
            <div className="mb-3 rounded-[var(--adm-radius-sm)] px-4 py-2 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{usersError}</div>
          )}

          {/* Users table */}
          <Card padding={false} className="overflow-hidden" style={{ border: "none" }}>
            <div
              className="px-4 py-4 sm:px-5"
              style={{
                background: "linear-gradient(180deg, var(--adm-surface2) 0%, var(--adm-surface) 100%)",
              }}
            >
              <div className="flex flex-col gap-3">
              {/* Row 1: search + hide + copy */}
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <SearchInput
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  onClear={() => setUsersSearch("")}
                  placeholder="Search by name, email, or team"
                  className="min-w-[240px] flex-1"
                />
                <Badge
                  status={filteredUsers.length !== users.length ? "info" : undefined}
                  dot
                >
                  {filteredUsers.length === users.length ? "Full directory" : "Filtered view"}
                </Badge>
                <div className="relative shrink-0" ref={hideDropdownRef}>
                  <Button variant="secondary" size="sm" onClick={() => setHideDropdownOpen((o) => !o)}>
                    Hide {hideOptions.size > 0 && <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none" style={{ backgroundColor: "var(--adm-accent)" }}>{hideOptions.size}</span>}
                  </Button>
                  {hideDropdownOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-[var(--adm-radius)] py-1 shadow-xl" style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border2)" }}>
                      {[
                        { key: "demo", label: "Demo accounts" },
                        { key: "player", label: "Players" },
                        { key: "assistant_coach", label: "Assistant coaches" },
                        { key: "coach", label: "Coaches" },
                        { key: "owner", label: "Owners" },
                        { key: "verified", label: "Verified" },
                        { key: "unverified", label: "Unverified" },
                        { key: "beta_tester", label: "Beta testers" },
                        { key: "standard", label: "Standard" },
                      ].map(({ key, label }) => (
                        <div key={key} className="px-3 py-1.5">
                          <Checkbox checked={hideOptions.has(key)} onChange={() => toggleHideOption(key)} label={label} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 xl:ml-auto xl:justify-end">
                  <Button variant="secondary" size="sm" onClick={() => handleCopyEmails("outlook")} title="Semicolon-separated emails">
                    {emailCopied === "outlook" ? "Copied!" : "Copy · Outlook"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleCopyEmails("gmail")} title="Comma-separated emails">
                    {emailCopied === "gmail" ? "Copied!" : "Copy · Gmail"}
                  </Button>
                </div>
              </div>
              {/* Row 2: filters */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-36">
                  <option value="">All roles</option>
                  <option value="owner">Owner</option>
                  <option value="coach">Coach</option>
                  <option value="assistant_coach">Asst. Coach</option>
                  <option value="player">Player</option>
                </Select>
                <Select value={filterVerified} onChange={(e) => setFilterVerified(e.target.value)} className="w-36">
                  <option value="">Any verified</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </Select>
                <Select value={filterOnboarded} onChange={(e) => setFilterOnboarded(e.target.value)} className="w-36">
                  <option value="">Any onboarded</option>
                  <option value="yes">Onboarded</option>
                  <option value="no">Not onboarded</option>
                </Select>
                <div className="flex items-center gap-1">
                  <Select value={filterPlaysOp} onChange={(e) => setFilterPlaysOp(e.target.value)} className="w-14">
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="=">=</option>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    value={filterPlays}
                    onChange={(e) => setFilterPlays(e.target.value)}
                    placeholder="# plays"
                    className="w-24"
                  />
                </div>
                <Select value={filterSport} onChange={(e) => setFilterSport(e.target.value)} className="w-36">
                  <option value="">All sports</option>
                  <option value="rugby">Rugby</option>
                  <option value="football">Football</option>
                  <option value="lacrosse">Lacrosse</option>
                  <option value="womens lacrosse">Women's Lacrosse</option>
                  <option value="basketball">Basketball</option>
                  <option value="soccer">Soccer</option>
                  <option value="field hockey">Field Hockey</option>
                  <option value="ice hockey">Ice Hockey</option>
                </Select>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--adm-muted)" }}>Joined</span>
                  <Select value={filterJoinedOp} onChange={(e) => setFilterJoinedOp(e.target.value)} className="w-14">
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="=">=</option>
                  </Select>
                  <Select value={filterJoinedAge} onChange={(e) => setFilterJoinedAge(e.target.value)} className="w-28">
                    <option value="">Any time</option>
                    {TIME_AGE_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--adm-muted)" }}>Active</span>
                  <Select value={filterActivityOp} onChange={(e) => setFilterActivityOp(e.target.value)} className="w-14">
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="=">=</option>
                  </Select>
                  <Select value={filterActivityAge} onChange={(e) => setFilterActivityAge(e.target.value)} className="w-28">
                    <option value="">Any time</option>
                    {TIME_AGE_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--adm-muted)" }}>Sort</span>
                  <Select
                    value={sortKey}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSortKey(next);
                      // "Team size" reads most naturally largest-team-first; default to desc.
                      if (next === "teamSize") setSortDir("desc");
                    }}
                    className="w-40"
                  >
                    <option value="">None</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="team">Team (group by team)</option>
                    <option value="teamSize">Team size</option>
                    <option value="sport">Sport</option>
                    <option value="plays">Plays</option>
                    <option value="joined">Joined</option>
                  </Select>
                  <button
                    type="button"
                    onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                    disabled={!sortKey}
                    title={sortDir === "asc" ? "Ascending" : "Descending"}
                    className="rounded-[var(--adm-radius)] px-2 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-text2)", border: "1px solid var(--adm-border)" }}
                  >
                    {sortDir === "asc" ? "↑" : "↓"}
                  </button>
                </div>
                {(activeFilterCount > 0 || sortKey) && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-[var(--adm-radius)] px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}
                  >
                    Reset filters
                  </button>
                )}
              </div>
              </div>
            </div>
            <div className="px-4 py-2 text-[11px] sm:hidden" style={{ backgroundColor: "var(--adm-surface)", color: "var(--adm-muted)", borderTop: "1px solid var(--adm-border)", borderBottom: "1px solid var(--adm-border)" }}>
              Swipe sideways to view all columns.
            </div>
            <div
              ref={usersScrollRef}
              onScroll={(e) => patchUsersViewState({ usersScrollTop: e.currentTarget.scrollTop })}
              className="hide-scroll overflow-auto"
              style={{ maxHeight: `${usersTableMaxHeight}px`, backgroundColor: "var(--adm-bg)" }}
            >
              <DataTable
                columns={userTableColumns}
                data={sortedFilteredUsers}
                keyField="id"
                stickyHeader
                minWidth="980px"
                loading={usersLoading}
                empty={
                  <EmptyState
                    title={users.length === 0 ? "No users found" : "No users match your search"}
                    subtitle={users.length === 0 ? "Users will appear here once accounts exist." : "Try a different search term."}
                  />
                }
                onRowClick={(u) => handleOpenUserActivity(u.id)}
              />
            </div>
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ backgroundColor: "var(--adm-surface)" }}>
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
                <Select value={usersPerPage} onChange={(e) => setUsersPerPage(Number(e.target.value))} className="w-24">
                  {USER_PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </label>
              <span className="text-[11px] sm:hidden" style={{ color: "var(--adm-muted)" }}>
                Horizontal scroll keeps the full table usable on mobile.
              </span>
            </div>
          </Card>
          </Section>
        </section>

        {/* TESTS */}
        <section id="tests" style={{ scrollMarginTop: "4rem" }}>
          <Section
            title="Tests"
            subtitle={allSuites ? `${totalTestCount} tests across ${SUITE_NAMES.length} suites` : "Loading suites…"}
            actions={
              <Button variant="secondary" size="sm" onClick={runTests} disabled={testRunning || enabledSuites.size === 0}>
                {testRunning ? <><Spinner size={12} />Running…</> : <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" /></svg>
                  {enabledSuites.size === SUITE_NAMES.length ? "Run All" : `Run ${selectedTestCount}`}
                </>}
              </Button>
            }
          >
            {/* Result summary */}
            {testResults && (
              <Card padding={false} className="flex items-center gap-4 px-5 py-3">
                <div className="flex items-center gap-2 font-Manrope text-sm font-normal" style={{ color: testStats.failed === 0 ? "var(--adm-success)" : "var(--adm-danger)" }}>
                  {testStats.failed === 0
                    ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  }
                  {testStats.failed === 0 ? "All Passing" : `${testStats.failed} Failing`}
                </div>
                <span className="text-xs" style={{ color: "var(--adm-muted)" }}>{testStats.passed}/{testStats.total} passed</span>
                {testStats.failed > 0 && failedTestsReport && (
                  <Button variant="danger" size="sm" onClick={() => copyToClipboard(failedTestsReport, "all-failed-tests")}>
                    {copied === "all-failed-tests" ? "Copied!" : "Copy Failed"}
                  </Button>
                )}
                <span className="ml-auto font-mono text-xs" style={{ color: "var(--adm-muted)" }}>{testTotalMs.toFixed(0)}ms</span>
              </Card>
            )}

            {/* Suite cards */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
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
                      backgroundColor: checked ? "color-mix(in srgb, var(--adm-color-purple) 6%, transparent)" : "var(--adm-surface)",
                      border: checked ? "1px solid color-mix(in srgb, var(--adm-color-purple) 30%, transparent)" : "1px solid var(--adm-border)",
                      opacity: checked ? 1 : 0.55,
                    }}
                    onMouseEnter={(e) => { if (!checked) e.currentTarget.style.opacity = "0.75"; }}
                    onMouseLeave={(e) => { if (!checked) e.currentTarget.style.opacity = "0.55"; }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-Manrope text-xs font-normal leading-tight" style={{ color: "var(--adm-text)" }}>{name}</span>
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded transition" style={{ backgroundColor: checked ? "color-mix(in srgb, var(--adm-color-purple) 30%, transparent)" : "transparent", border: checked ? "1px solid var(--adm-badge-purple-text)" : "1px solid var(--adm-border2)" }}>
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
                    <Card key={suite.name} padding={false} className="overflow-hidden">
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
                                    <pre className="rounded-[var(--adm-radius-sm)] px-4 py-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap" style={{ backgroundColor: "var(--adm-danger-dim)", border: "1px solid color-mix(in srgb, var(--adm-danger) 20%, transparent)", color: "var(--adm-color-red-soft)" }}>{r.error}</pre>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </Section>
        </section>

        {/* ERROR REPORTS */}
        <section id="errors" style={{ scrollMarginTop: "4rem" }}>
          <Section
            title="Error Reports"
            subtitle={errorTotal > 0 ? `${errorTotal} reports` : "No reports"}
            actions={errors.length > 0 && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => copyToClipboard(errors.map(formatReportText).join("\n\n---\n\n"), "all-errors")}>
                  {copied === "all-errors" ? "Copied!" : "Copy All"}
                </Button>
                <Button variant="danger" size="sm" onClick={handleClearErrors}>Clear All</Button>
              </div>
            )}
          >
            {errorsError && <div className="rounded-[var(--adm-radius-sm)] px-4 py-2 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{errorsError}</div>}
            {errorsLoading && errors.length === 0 && <EmptyState title="Loading…" icon={<Spinner />} />}
            {!errorsLoading && errors.length === 0 && (
              <EmptyState
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
                    <Card key={r.id} padding={false} className="overflow-hidden">
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
                          <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                            {[["Page", r.page_url || "—"], ["User ID", r.user_id || "anonymous"], ["Device", `${device.platform || "—"}${device.isMobile ? " (mobile)" : " (desktop)"}${device.standalone ? " [PWA]" : ""}`], ["Session", `${r.session_id?.slice(0, 12) || "—"}…`]].map(([k, v]) => (
                              <div key={k}><span style={{ color: "var(--adm-muted)" }}>{k}:</span> <span style={{ color: "var(--adm-text2)" }}>{v}</span></div>
                            ))}
                          </div>
                          {r.extra && <div className="mt-3"><p className="mb-1 text-[10px] font-normal uppercase tracking-wider" style={{ color: "var(--adm-muted)" }}>Extra</p><pre className="overflow-x-auto rounded-[var(--adm-radius-sm)] p-2 text-[11px]" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text2)" }}>{JSON.stringify(r.extra, null, 2)}</pre></div>}
                          {r.error_stack && <div className="mt-3"><p className="mb-1 text-[10px] font-normal uppercase tracking-wider" style={{ color: "var(--adm-muted)" }}>Stack</p><pre className="hide-scroll max-h-40 overflow-auto rounded-[var(--adm-radius-sm)] p-2 text-[11px] leading-relaxed" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-color-red-soft)" }}>{r.error_stack}</pre></div>}
                          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-[10px]" style={{ color: "var(--adm-muted)" }}>{new Date(r.created_at).toLocaleString()}</span>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); copyToClipboard(r.error_message + "\n" + (r.error_stack || ""), r.id); }}>{copied === r.id ? "Copied!" : "Copy"}</Button>
                              <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteError(r.id); }}>Delete</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </Section>
        </section>

        {/* REPORTED ISSUES */}
        <section id="reported-issues" style={{ scrollMarginTop: "4rem" }}>
          <Section title="Reported Issues" subtitle={userIssueTotal > 0 ? `${userIssueTotal} open` : "None"}>
            {userIssuesError && <div className="rounded-[var(--adm-radius-sm)] px-4 py-2 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{userIssuesError}</div>}
            {userIssuesLoading && userIssues.length === 0 && <EmptyState title="Loading…" icon={<Spinner />} />}
            {!userIssuesLoading && userIssues.length === 0 && <EmptyState title="No reported issues" subtitle="Issues submitted by beta testers will appear here" />}
            {userIssues.length > 0 && (
              <div className="hide-scroll max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {userIssues.map((issue) => {
                  const isExpanded = expandedIssue === issue.id;
                  const meta = issueStatusMeta(issue.status);
                  return (
                    <Card key={issue.id} padding={false} className="overflow-hidden">
                      <button onClick={() => setExpandedIssue(isExpanded ? null : issue.id)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-opacity hover:opacity-90">
                        <Badge status={meta.status} className="mt-0.5 shrink-0 uppercase">{meta.label}</Badge>
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
                              <Select value={issue.status} onChange={(e) => handleIssueStatusChange(issue, e.target.value)}>
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px]" style={{ color: "var(--adm-muted)" }}>{new Date(issue.created_at).toLocaleString()}</span>
                              <Button variant="danger" size="sm" onClick={() => handleDeleteIssue(issue.id)}>Delete</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </Section>
        </section>

        {/* ADMIN SETTINGS */}
        <section id="admin-settings" style={{ scrollMarginTop: "4rem" }}>
          <Section title="Admin Settings" subtitle="Security configuration">
            <Card>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Danger Mode security email</p>
                <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
                  When set, activating Danger Mode requires a verification code sent to this email in addition to the admin password.
                </p>
              </div>
              <div className="mt-4">
                {!securityEmailEditing ? (
                  <div className="flex items-center gap-3">
                    {securityEmailConfigured ? (
                      <>
                        <Badge status="resolved">Configured</Badge>
                        <span className="text-sm font-mono" style={{ color: "var(--adm-text2)" }}>{securityEmail}</span>
                      </>
                    ) : (
                      <Badge status={undefined}>Not set</Badge>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => { setSecurityEmailEditing(true); setSecurityEmailInput(""); setSecurityEmailCode(""); setSecurityEmailStep("input"); setSecurityEmailError(""); setSecurityEmailSuccess(""); }}>
                      {securityEmailConfigured ? "Change" : "Set Email"}
                    </Button>
                  </div>
                ) : securityEmailStep === "input" ? (
                  <form onSubmit={handleSaveSecurityEmail} className="flex flex-col gap-3 max-w-sm">
                    <Input
                      type="email"
                      value={securityEmailInput}
                      onChange={(e) => setSecurityEmailInput(e.target.value)}
                      placeholder="security@example.com"
                      autoFocus
                    />
                    {securityEmailError && <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{securityEmailError}</p>}
                    <div className="flex gap-2">
                      <Button variant="secondary" type="button" size="sm" onClick={() => { setSecurityEmailEditing(false); setSecurityEmailStep("input"); setSecurityEmailError(""); }}>Cancel</Button>
                      <Button variant="primary" type="submit" size="sm" disabled={securityEmailSaving || !securityEmailInput}>
                        {securityEmailSaving ? "Sending…" : "Save"}
                      </Button>
                      {securityEmailConfigured && (
                        <Button variant="danger" type="button" size="sm" disabled={securityEmailSaving} onClick={async () => {
                          setSecurityEmailError("");
                          setSecurityEmailSuccess("");
                          setSecurityEmailSaving(true);
                          try {
                            const data = await adminFetch("/admin/settings/security-email", { method: "PUT", body: { email: "" } });
                            if (data.codeSent) {
                              setSecurityEmailMasked(data.maskedEmail || "");
                              setSecurityEmailInput("");
                              setSecurityEmailCode("");
                              setSecurityEmailStep("code");
                            } else {
                              setSecurityEmail("");
                              setSecurityEmailConfigured(false);
                              setSecurityEmailEditing(false);
                              setSecurityEmailStep("input");
                              setSecurityEmailSuccess("Security email cleared.");
                              setTimeout(() => setSecurityEmailSuccess(""), 3000);
                            }
                          } catch (err) {
                            setSecurityEmailError(err.message || "Failed to clear");
                          } finally {
                            setSecurityEmailSaving(false);
                          }
                        }}>
                          Clear
                        </Button>
                      )}
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmSecurityEmailCode} className="flex flex-col gap-3 max-w-sm">
                    <p className="text-sm" style={{ color: "var(--adm-muted)" }}>
                      A verification code was sent to {securityEmailMasked}. Enter it to confirm the change.
                    </p>
                    <Input
                      type="text"
                      value={securityEmailCode}
                      onChange={(e) => setSecurityEmailCode(e.target.value)}
                      placeholder="6-digit code"
                      autoFocus
                    />
                    {securityEmailError && <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{securityEmailError}</p>}
                    <div className="flex gap-2">
                      <Button variant="secondary" type="button" size="sm" onClick={() => { setSecurityEmailEditing(false); setSecurityEmailStep("input"); setSecurityEmailError(""); }}>Cancel</Button>
                      <Button variant="primary" type="submit" size="sm" disabled={securityEmailSaving || !securityEmailCode}>
                        {securityEmailSaving ? "Verifying…" : "Confirm"}
                      </Button>
                    </div>
                  </form>
                )}
                {securityEmailSuccess && <p className="mt-2 text-xs" style={{ color: "var(--adm-success, #22c55e)" }}>{securityEmailSuccess}</p>}
              </div>
            </Card>
          </Section>
        </section>

        {/* RECENT ACTIVITY */}
        <RecentActivitySection session={session} />

        <div className="h-6" />
      </AdminPage>

      {/* Create Account Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Account">
        <p className="mb-4 text-xs" style={{ color: "var(--adm-muted)" }}>No email verification required</p>
        <form onSubmit={handleCreateAccount} className="flex flex-col gap-3">
          <Input type="text" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name *" required />
          <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email address *" required />
          <Input type="text" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} placeholder="Password * (min 6 chars)" required minLength={6} />
          <div className="pt-3" style={{ borderTop: "1px solid var(--adm-border)" }}>
            <p className="mb-2.5 text-xs" style={{ color: "var(--adm-muted)" }}>Optional — create a team (auto-onboards user)</p>
            <div className="flex gap-2">
              <Input className="flex-1" type="text" value={createForm.teamName} onChange={(e) => setCreateForm((f) => ({ ...f, teamName: e.target.value }))} placeholder="Team name" />
              <Input className="w-28" type="text" value={createForm.sport} onChange={(e) => setCreateForm((f) => ({ ...f, sport: e.target.value }))} placeholder="Sport" />
            </div>
          </div>
          {usersError && <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{usersError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={creating}>{creating ? "Creating…" : "Create Account"}</Button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}
