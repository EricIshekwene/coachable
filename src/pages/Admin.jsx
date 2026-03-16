import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiFetch } from "../utils/api";
import logo from "../assets/logos/full_Coachable_logo.png";
import ConfirmModal from "../components/subcomponents/ConfirmModal";

const SESSION_KEY = "coachable_admin_session";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── Test suite registry (names/descriptions only — suites loaded lazily) ──
const SUITE_NAMES = ["Drawing Geometry", "Interpolation", "Import / Export", "Animation Schema", "Routes"];
const SUITE_DESCRIPTIONS = {
  "Drawing Geometry": "Bounds, hit-testing, resize/rotate math",
  "Interpolation": "Player positions between keyframes",
  "Import / Export": "Play file serialization round-trip",
  "Animation Schema": "Keyframe sorting, track normalization",
  "Routes": "Route component render validation",
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
  // ── Auth ──
  const [session, setSession] = useState(() => localStorage.getItem(SESSION_KEY) || "");
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

  // ── Confirm modal ──
  const [confirmModal, setConfirmModal] = useState({ open: false });
  const confirmResolveRef = useRef(null);

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
        localStorage.removeItem(SESSION_KEY);
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
      localStorage.setItem(SESSION_KEY, data.session);
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
    localStorage.removeItem(SESSION_KEY);
    setSession("");
    setUsers([]);
  };

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

  // ── Platform Plays ──
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

  const handleDeletePlatformPlay = async (id, title) => {
    const ok = await openConfirm({ message: `Delete play "${title}"?`, subtitle: "This cannot be undone.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      await adminFetch(`/admin/plays/${id}`, { method: "DELETE" });
      setPlatformPlays((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setPlaysError(err.message);
    }
  };

  const handleToggleFeatured = async (play) => {
    try {
      const updated = await adminFetch(`/admin/plays/${play.id}`, {
        method: "PATCH",
        body: { isFeatured: !play.isFeatured },
      });
      setPlatformPlays((prev) => prev.map((p) => (p.id === play.id ? updated.play : p)));
    } catch (err) {
      setPlaysError(err.message);
    }
  };

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
  }, [fetchUsers, fetchErrors, fetchPlatformPlays]);

  // ── Initial load ──
  useEffect(() => {
    if (authed) {
      fetchUsers();
      fetchErrors();
      fetchPlatformPlays();
    }
  }, [authed, fetchUsers, fetchErrors, fetchPlatformPlays]);

  // ── Derived stats ──
  const verifiedCount = users.filter((u) => u.email_verified_at).length;
  const notOnboardedCount = users.filter((u) => !u.onboarded_at).length;

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
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 border-b border-white/6 bg-[#13151a]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Coachable" className="h-5 opacity-70" />
            <span className="rounded bg-BrandOrange/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-BrandOrange">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={usersLoading || errorsLoading}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/8 disabled:opacity-40"
            >
              <svg
                className={`h-3.5 w-3.5 ${usersLoading || errorsLoading ? "animate-spin" : ""}`}
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Total Users" value={users.length} />
          <StatCard label="Verified" value={verifiedCount} color="text-green-400" />
          <StatCard label="Not Onboarded" value={notOnboardedCount} color={notOnboardedCount > 0 ? "text-yellow-400" : "text-BrandGray2"} />
          <StatCard label="Error Reports" value={errorTotal} color={errorTotal > 0 ? "text-red-400" : "text-BrandGray2"} />
          <StatCard label="Featured Plays" value={platformPlays.filter((p) => p.isFeatured).length} color="text-BrandOrange" />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            USERS SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader title="Users" badge={`${users.length}`} badgeColor="bg-white/6 text-BrandGray">
            <button
              onClick={handleDeleteAll}
              className="rounded-lg bg-red-600/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-600/20"
            >
              Delete All Users
            </button>
          </SectionHeader>

          {/* Big create account button */}
          <button
            onClick={() => setShowCreate(true)}
            className="mb-4 flex w-full items-center gap-4 rounded-xl border border-dashed border-BrandOrange/30 bg-BrandOrange/5 px-5 py-4 text-left transition hover:border-BrandOrange/60 hover:bg-BrandOrange/10 active:scale-[0.99]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-BrandOrange/20">
              <svg className="h-6 w-6 text-BrandOrange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <p className="font-Manrope text-sm font-bold text-white">Create Account</p>
              <p className="mt-0.5 text-xs text-BrandGray">Add a new user — no email verification required</p>
            </div>
            <svg className="ml-auto h-4 w-4 text-BrandGray2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {usersError && (
            <div className="mb-3 rounded-lg bg-red-600/10 px-4 py-2 text-sm text-red-400">{usersError}</div>
          )}

          {/* Users table */}
          <div className="overflow-hidden rounded-xl border border-white/6">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/6 bg-[#1e2228]">
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-BrandGray">Name</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-BrandGray">Email</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-BrandGray">Team</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-BrandGray">Verified</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-BrandGray">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {usersLoading && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-BrandGray2">Loading...</td>
                  </tr>
                )}
                {!usersLoading && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-BrandGray2">No users found</td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-b border-white/4 transition hover:bg-white/2 ${!u.onboarded_at ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium">
                      {u.name}
                      {!u.onboarded_at && (
                        <span className="ml-2 rounded bg-yellow-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-yellow-400">
                          Not onboarded
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-BrandGray">{u.email}</td>
                    <td className="px-4 py-3 text-BrandGray">
                      {u.team_name ? (
                        <span>{u.team_name} <span className="text-xs text-BrandGray2">({u.role})</span></span>
                      ) : (
                        <span className="text-BrandGray2">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.email_verified_at ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Yes
                        </span>
                      ) : (
                        <span className="text-BrandGray2">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-BrandGray2">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="rounded px-2 py-1 text-xs text-red-400/70 transition hover:bg-red-600/15 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            PLATFORM PLAYS SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader title="Platform Plays" badge={`${platformPlays.length}`} badgeColor="bg-BrandOrange/15 text-BrandOrange">
            <button
              onClick={() => window.open(`/admin/plays/new/edit`, "_self")}
              className="flex items-center gap-1.5 rounded-lg bg-BrandOrange/20 px-3 py-1.5 text-xs font-semibold text-BrandOrange transition hover:bg-BrandOrange/30"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Play
            </button>
          </SectionHeader>

          {playsError && (
            <div className="mb-3 rounded-lg bg-red-600/10 px-4 py-2 text-sm text-red-400">{playsError}</div>
          )}

          {playsLoading && platformPlays.length === 0 && (
            <div className="rounded-xl border border-white/6 px-6 py-10 text-center text-xs text-BrandGray2">Loading...</div>
          )}

          {!playsLoading && platformPlays.length === 0 && (
            <div className="rounded-xl border border-white/6 bg-[#1e2228] px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-BrandOrange/10">
                <svg className="h-5 w-5 text-BrandOrange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-BrandGray">No platform plays yet</p>
              <p className="mt-0.5 text-xs text-BrandGray2">Create plays to feature on the landing page for coaches</p>
            </div>
          )}

          {platformPlays.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-white/6">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/6 bg-[#1e2228]">
                    <th className="px-4 py-2.5 text-xs font-semibold text-BrandGray2">Title</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-BrandGray2">Sport</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-BrandGray2">Tags</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-BrandGray2">Featured</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-BrandGray2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {platformPlays.map((play) => (
                    <tr key={play.id} className="border-b border-white/4 last:border-0 hover:bg-white/2">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {play.thumbnail ? (
                            <img src={play.thumbnail} alt="" className="h-8 w-12 rounded object-cover opacity-80" />
                          ) : (
                            <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded bg-white/6">
                              <svg className="h-4 w-4 text-BrandGray2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">{play.title}</p>
                            {play.description && (
                              <p className="mt-0.5 max-w-xs truncate text-xs text-BrandGray2">{play.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-BrandGray">{play.sport || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(play.tags || []).map((tag) => (
                            <span key={tag} className="rounded bg-white/6 px-1.5 py-0.5 text-[10px] text-BrandGray2">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleFeatured(play)}
                          className={`rounded-full px-3 py-1 text-[10px] font-semibold transition ${
                            play.isFeatured
                              ? "bg-BrandOrange/20 text-BrandOrange hover:bg-BrandOrange/30"
                              : "bg-white/6 text-BrandGray2 hover:bg-white/10"
                          }`}
                        >
                          {play.isFeatured ? "Featured" : "Hidden"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => window.open(`/admin/plays/${play.id}/edit`, "_self")}
                            className="rounded px-2 py-1 text-xs text-BrandGray transition hover:bg-white/6 hover:text-white"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePlatformPlay(play.id, play.title)}
                            className="rounded px-2 py-1 text-xs text-red-400 transition hover:bg-red-600/20"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Open Platform Plays app */}
          <div className="mt-4">
            <button
              onClick={() => window.open("/admin/app", "_self")}
              className="flex w-full items-center gap-4 rounded-xl border border-dashed border-BrandOrange/30 bg-BrandOrange/5 px-5 py-4 text-left transition hover:border-BrandOrange/60 hover:bg-BrandOrange/10 active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-BrandOrange/20">
                <svg className="h-6 w-6 text-BrandOrange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                </svg>
              </div>
              <div>
                <p className="font-Manrope text-sm font-bold text-white">Open Platform Plays App</p>
                <p className="mt-0.5 text-xs text-BrandGray">Manage plays with full card preview — create, edit, feature</p>
              </div>
              <svg className="ml-auto h-4 w-4 text-BrandGray2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            TESTS SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <section>
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
        <section>
          <SectionHeader title="Error Reports" badge={errorTotal > 0 ? `${errorTotal}` : "None"} badgeColor={errorTotal > 0 ? "bg-red-500/15 text-red-400" : "bg-white/6 text-BrandGray2"}>
            {errors.length > 0 && (
              <button
                onClick={handleClearErrors}
                className="rounded-lg bg-red-600/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-600/20"
              >
                Clear All
              </button>
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
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 rounded-xl">
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
                        r.component === "videoExport"
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
                            <pre className="max-h-40 overflow-auto rounded-lg bg-BrandBlack/50 p-2 text-[11px] leading-relaxed text-red-400/80">{r.error_stack}</pre>
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
