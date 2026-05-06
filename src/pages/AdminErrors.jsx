/**
 * Admin error reports dashboard. Shows error reports submitted by client-side
 * error reporter, with device info, component, action, and stack traces.
 *
 * @module AdminErrors
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import ConfirmModal from "../components/subcomponents/ConfirmModal";
import { useAdmin } from "../admin/AdminContext";
import { adminPath } from "../admin/adminNav";
import {
  AdminShell, AdminHeader, AdminPage, AdminCard, AdminSection,
  AdminBtn, AdminSelect, AdminBadge, AdminEmptyState, AdminSpinner,
} from "../admin/components";

const SESSION_KEY = "coachable_admin_session";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Parse a user agent string into a human-readable device description.
 * @param {string} ua - The user agent string
 * @returns {string}
 */
function parseDevice(ua) {
  if (!ua) return "Unknown";
  if (/iPhone/.test(ua)) return "iPhone (Safari)";
  if (/iPad/.test(ua)) return "iPad (Safari)";
  if (/Android.*Mobile/.test(ua)) return "Android Phone";
  if (/Android/.test(ua)) return "Android Tablet";
  if (/Macintosh/.test(ua)) return "Mac Desktop";
  if (/Windows/.test(ua)) return "Windows Desktop";
  if (/Linux/.test(ua)) return "Linux Desktop";
  return ua.slice(0, 50);
}

/**
 * Format a timestamp into a compact, readable string.
 * @param {string} ts - ISO timestamp
 * @returns {string}
 */
function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

/**
 * Derive a short, human-readable title from an error report.
 * Maps known components/actions/messages to friendly labels.
 * @param {Object} r - Error report object
 * @returns {string}
 */
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

  // Video export failures
  if (component === "videoexport" || action.includes("export")) {
    if (msg.includes("encoding") || msg.includes("encoder")) return "Video Export — Encoding Failed";
    if (msg.includes("muxer") || msg.includes("finalize") || msg.includes("colorspace")) return "Video Export — MP4 Muxer Crash";
    if (msg.includes("resolution") || msg.includes("dimension")) return "Video Export — Resolution Error";
    if (msg.includes("mediarecorder")) return "Video Export — MediaRecorder Fallback Failed";
    return "Video Export Fail";
  }
  // Global uncaught errors
  if (component === "global") {
    if (action === "unhandledrejection") return "Unhandled Promise Rejection";
    if (msg.includes("network") || msg.includes("fetch")) return "Network Error";
    if (msg.includes("syntax")) return "Syntax Error";
    if (msg.includes("type")) return "Type Error";
    return "Uncaught Error";
  }
  // Fallback: capitalize component or use generic
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
  if (r.extra) lines.push(`Extra: ${JSON.stringify(r.extra)}`);
  if (r.error_stack) lines.push(`Stack:\n${r.error_stack}`);
  return lines.join("\n");
}

export default function AdminErrors() {
  const { basePath } = useAdmin();
  const [session] = useState(() => sessionStorage.getItem(SESSION_KEY) || "");
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(0);
  const [copied, setCopied] = useState(null); // "all" | report id | null
  const pageSize = 30;

  const [confirmModal, setConfirmModal] = useState({ open: false });
  const confirmResolveRef = useRef(null);

  /** Open a custom confirmation modal and return a promise resolving to true/false. */
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

  const authed = Boolean(session);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
      });
      if (filter) params.set("component", filter);

      const res = await fetch(`${API_URL}/error-reports?${params}`, {
        headers: { "x-admin-session": session },
      });
      if (!res.ok) throw new Error("Failed to fetch error reports");
      const data = await res.json();
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session, page, filter]);

  useEffect(() => {
    if (authed) fetchReports();
  }, [authed, fetchReports]);

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/error-reports/${id}`, {
        method: "DELETE",
        headers: { "x-admin-session": session },
      });
      setReports((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClearAll = async () => {
    const ok = await openConfirm({ message: "Clear ALL error reports?", subtitle: "This cannot be undone.", confirmLabel: "Clear All", danger: true });
    if (!ok) return;
    try {
      await fetch(`${API_URL}/error-reports`, {
        method: "DELETE",
        headers: { "x-admin-session": session },
      });
      setReports([]);
      setTotal(0);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!authed) {
    return (
      <AdminShell className="flex items-center justify-center">
        <AdminCard>
          <p className="mb-3 text-sm" style={{ color: "var(--adm-muted)" }}>Admin session required</p>
          <Link to={adminPath(basePath, "")} className="text-sm transition-opacity hover:opacity-70" style={{ color: "var(--adm-accent)" }}>Go to Admin Login</Link>
        </AdminCard>
      </AdminShell>
    );
  }

  /** Copy text to clipboard and flash a "copied" indicator. */
  const copyToClipboard = useCallback((text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  }, []);

  /** Copy all visible reports as text. */
  const handleCopyAll = useCallback(() => {
    const text = reports.map((r) => formatReportText(r)).join("\n\n---\n\n");
    copyToClipboard(text, "all");
  }, [reports, copyToClipboard]);

  /** Copy a single report as text. */
  const handleCopyOne = useCallback((r) => {
    copyToClipboard(formatReportText(r), r.id);
  }, [copyToClipboard]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AdminShell>
      <ConfirmModal open={confirmModal.open} message={confirmModal.message} subtitle={confirmModal.subtitle} confirmLabel={confirmModal.confirmLabel} danger={confirmModal.danger} onConfirm={handleConfirmOk} onCancel={handleConfirmCancel} />
      <AdminHeader
        title="Error Reports"
        backLabel="Dashboard"
        backTo={adminPath(basePath, "")}
        actions={
          <div className="flex gap-2">
            <AdminBtn variant="secondary" size="sm" onClick={handleCopyAll} disabled={reports.length === 0}>{copied === "all" ? "Copied!" : "Copy All"}</AdminBtn>
            <AdminBtn variant="danger" size="sm" onClick={handleClearAll}>Clear All</AdminBtn>
          </div>
        }
      />
      <AdminPage>
        <AdminSection
          title="Error Reports"
          subtitle={`${total} total report${total !== 1 ? "s" : ""}`}
          actions={
            <div className="flex gap-2">
              <AdminSelect value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }}>
                <option value="">All components</option>
                <option value="api">API / Backend</option>
                <option value="videoExport">Video Export</option>
                <option value="global">Global (uncaught)</option>
              </AdminSelect>
              <AdminBtn variant="secondary" size="sm" onClick={fetchReports} disabled={loading}>{loading ? <AdminSpinner size={12} /> : "Refresh"}</AdminBtn>
            </div>
          }
        >
          {error && <div className="rounded-[var(--adm-radius-sm)] px-4 py-2 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{error}</div>}

          {reports.length === 0 && !loading
            ? <AdminEmptyState title="No error reports" subtitle="Errors from users will appear here" />
            : loading && reports.length === 0
            ? <AdminEmptyState title="Loading…" icon={<AdminSpinner />} />
            : (
              <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                {reports.map((r) => {
                  const isExpanded = expanded === r.id;
                  const device = r.device_info || {};
                  const title = deriveTitle(r);
                  const compStyle = r.component === "api" ? { bg: "var(--adm-accent-dim)", color: "var(--adm-accent)" }
                    : r.component === "videoExport" ? { bg: "var(--adm-badge-purple-bg)", color: "var(--adm-badge-purple-text)" }
                    : r.component === "global" ? { bg: "var(--adm-danger-dim)", color: "var(--adm-danger)" }
                    : { bg: "var(--adm-surface3)", color: "var(--adm-muted)" };
                  return (
                    <AdminCard key={r.id} padding={false} className="overflow-hidden">
                      <button onClick={() => setExpanded(isExpanded ? null : r.id)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-opacity hover:opacity-90">
                        <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={compStyle}>{r.component || "unknown"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold" style={{ color: "var(--adm-accent)" }}>{title}</p>
                          <p className="mt-0.5 truncate text-xs" style={{ color: "var(--adm-text2)" }}>{r.error_message}</p>
                          <div className="mt-1 flex flex-wrap gap-x-3 text-[11px]" style={{ color: "var(--adm-muted)" }}>
                            <span>{parseDevice(r.user_agent)}</span>
                            {device.screenWidth && <span>{device.screenWidth}×{device.screenHeight}</span>}
                            {r.action && <span>action: {r.action}</span>}
                            <span>{formatTime(r.created_at)}</span>
                          </div>
                        </div>
                        <svg className={`mt-1 h-3.5 w-3.5 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ color: "var(--adm-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {isExpanded && (
                        <div className="px-4 py-3" style={{ borderTop: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface2)" }}>
                          <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                            {[["Page", r.page_url || "—"], ["User ID", r.user_id || "anonymous"], ["Session", `${r.session_id?.slice(0, 12) || "—"}…`], ["Device", `${device.platform || "—"} ${device.isMobile ? "(mobile)" : "(desktop)"}${device.standalone ? " [PWA]" : ""}`]].map(([k, v]) => (
                              <div key={k}><span style={{ color: "var(--adm-muted)" }}>{k}:</span> <span style={{ color: "var(--adm-text2)" }}>{v}</span></div>
                            ))}
                          </div>
                          {r.extra && <div className="mt-3"><p className="mb-1 text-[10px] font-semibold uppercase" style={{ color: "var(--adm-muted)" }}>Extra</p><pre className="overflow-x-auto rounded-[var(--adm-radius-sm)] p-2 text-[11px]" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text2)" }}>{JSON.stringify(r.extra, null, 2)}</pre></div>}
                          {r.error_stack && <div className="mt-3"><p className="mb-1 text-[10px] font-semibold uppercase" style={{ color: "var(--adm-muted)" }}>Stack</p><pre className="max-h-48 overflow-auto rounded-[var(--adm-radius-sm)] p-2 text-[11px]" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-color-red-soft)" }}>{r.error_stack}</pre></div>}
                          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-[10px]" style={{ color: "var(--adm-muted)" }}>{new Date(r.created_at).toLocaleString()}</span>
                            <div className="flex flex-wrap gap-2">
                              <AdminBtn variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleCopyOne(r); }}>{copied === r.id ? "Copied!" : "Copy"}</AdminBtn>
                              <AdminBtn variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}>Delete</AdminBtn>
                            </div>
                          </div>
                        </div>
                      )}
                    </AdminCard>
                  );
                })}
              </div>
            )
          }

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <AdminBtn variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</AdminBtn>
              <span className="text-xs" style={{ color: "var(--adm-muted)" }}>Page {page + 1} of {totalPages}</span>
              <AdminBtn variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</AdminBtn>
            </div>
          )}
        </AdminSection>
      </AdminPage>
    </AdminShell>
  );
}
