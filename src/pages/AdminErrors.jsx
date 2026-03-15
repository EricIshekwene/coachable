/**
 * Admin error reports dashboard. Shows error reports submitted by client-side
 * error reporter, with device info, component, action, and stack traces.
 *
 * @module AdminErrors
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logos/full_Coachable_logo.png";

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
  const [session] = useState(() => localStorage.getItem(SESSION_KEY) || "");
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(0);
  const [copied, setCopied] = useState(null); // "all" | report id | null
  const pageSize = 30;

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
    if (!window.confirm("Clear ALL error reports? This cannot be undone.")) return;
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
      <div className="flex h-screen items-center justify-center bg-BrandBlack font-DmSans">
        <div className="text-center">
          <p className="mb-4 text-BrandGray">Admin session required</p>
          <Link to="/admin" className="text-sm text-BrandOrange hover:underline">
            Go to Admin Login
          </Link>
        </div>
      </div>
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
    <div className="min-h-screen bg-BrandBlack font-DmSans text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-BrandGray2/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Coachable" className="h-5 opacity-70" />
          <span className="rounded bg-BrandOrange/20 px-2 py-0.5 text-xs font-semibold text-BrandOrange">
            ADMIN
          </span>
          <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
            ERROR REPORTS
          </span>
        </div>
        <Link
          to="/admin"
          className="rounded-lg border border-BrandGray2/40 px-3 py-1.5 text-xs text-BrandGray transition hover:border-BrandGray hover:text-white"
        >
          Back to Admin
        </Link>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-Manrope text-xl font-bold">Error Reports</h2>
            <p className="text-sm text-BrandGray">{total} total report{total !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(0); }}
              className="rounded-lg border border-BrandGray2/40 bg-BrandBlack px-3 py-1.5 text-xs text-white outline-none focus:border-BrandOrange"
            >
              <option value="">All components</option>
              <option value="videoExport">Video Export</option>
              <option value="global">Global (uncaught)</option>
            </select>
            <button
              onClick={fetchReports}
              disabled={loading}
              className="rounded-lg border border-BrandGray2/40 px-3 py-1.5 text-xs text-BrandGray transition hover:border-BrandGray hover:text-white disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={handleCopyAll}
              disabled={reports.length === 0}
              className="rounded-lg border border-BrandGray2/40 px-3 py-1.5 text-xs text-BrandGray transition hover:border-BrandGray hover:text-white disabled:opacity-30"
            >
              {copied === "all" ? "Copied!" : "Copy All"}
            </button>
            <button
              onClick={handleClearAll}
              className="rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-600/30"
            >
              Clear All
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-600/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Reports list */}
        {reports.length === 0 && !loading ? (
          <div className="rounded-xl border border-BrandGray2/20 px-8 py-16 text-center">
            <p className="text-lg text-BrandGray2">No error reports</p>
            <p className="mt-1 text-sm text-BrandGray2/60">Errors from users will appear here</p>
          </div>
        ) : (
          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {reports.map((r) => {
              const isExpanded = expanded === r.id;
              const device = r.device_info || {};
              const title = deriveTitle(r);
              return (
                <div
                  key={r.id}
                  className="overflow-hidden rounded-xl border border-BrandGray2/20 transition hover:border-BrandGray2/40"
                >
                  {/* Summary row */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : r.id)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left"
                  >
                    {/* Component badge */}
                    <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      r.component === "videoExport"
                        ? "bg-purple-500/20 text-purple-400"
                        : r.component === "global"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-BrandGray2/20 text-BrandGray"
                    }`}>
                      {r.component || "unknown"}
                    </span>

                    {/* Title + error message */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-BrandOrange">
                        {title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-BrandGray">
                        {r.error_message}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-BrandGray">
                        <span>{parseDevice(r.user_agent)}</span>
                        {device.screenWidth && (
                          <span>{device.screenWidth}x{device.screenHeight} @{device.pixelRatio}x</span>
                        )}
                        {r.action && <span className="text-BrandGray2">action: {r.action}</span>}
                        <span>{formatTime(r.created_at)}</span>
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <span className="mt-1 shrink-0 text-xs text-BrandGray2">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-BrandGray2/10 bg-[#1e2228]/50 px-4 py-3">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div>
                          <span className="text-BrandGray2">Page:</span>{" "}
                          <span className="text-BrandGray">{r.page_url || "—"}</span>
                        </div>
                        <div>
                          <span className="text-BrandGray2">User ID:</span>{" "}
                          <span className="font-mono text-BrandGray">{r.user_id || "anonymous"}</span>
                        </div>
                        <div>
                          <span className="text-BrandGray2">Session:</span>{" "}
                          <span className="font-mono text-BrandGray">{r.session_id?.slice(0, 12) || "—"}...</span>
                        </div>
                        <div>
                          <span className="text-BrandGray2">Device:</span>{" "}
                          <span className="text-BrandGray">
                            {device.platform || "—"} {device.isMobile ? "(mobile)" : "(desktop)"}
                            {device.standalone ? " [PWA]" : ""}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-BrandGray2">User Agent:</span>{" "}
                          <span className="break-all text-BrandGray2/70">{r.user_agent || "—"}</span>
                        </div>
                      </div>

                      {/* Extra data */}
                      {r.extra && (
                        <div className="mt-3">
                          <p className="mb-1 text-[10px] font-semibold uppercase text-BrandGray2">Extra Context</p>
                          <pre className="overflow-x-auto rounded-lg bg-BrandBlack p-2 text-[11px] text-BrandGray">
                            {JSON.stringify(r.extra, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Stack trace */}
                      {r.error_stack && (
                        <div className="mt-3">
                          <p className="mb-1 text-[10px] font-semibold uppercase text-BrandGray2">Stack Trace</p>
                          <pre className="max-h-48 overflow-auto rounded-lg bg-BrandBlack p-2 text-[11px] text-red-400/80">
                            {r.error_stack}
                          </pre>
                        </div>
                      )}

                      {/* Timestamp + actions */}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] text-BrandGray2">
                          {new Date(r.created_at).toLocaleString()}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopyOne(r); }}
                            className="rounded px-2 py-1 text-xs text-BrandGray transition hover:bg-BrandGray2/20 hover:text-white"
                          >
                            {copied === r.id ? "Copied!" : "Copy Error"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-BrandGray2/40 px-3 py-1.5 text-xs text-BrandGray transition hover:text-white disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-xs text-BrandGray">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-BrandGray2/40 px-3 py-1.5 text-xs text-BrandGray transition hover:text-white disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
