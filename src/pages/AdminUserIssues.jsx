/**
 * Admin page for viewing and managing user-reported issues from beta testers.
 * Supports pagination, status updates, and deletion.
 *
 * @module AdminUserIssues
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logos/full_Coachable_logo.png";
import ConfirmModal from "../components/subcomponents/ConfirmModal";

const SESSION_KEY = "coachable_admin_session";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const PAGE_SIZE = 30;

/**
 * Format a timestamp as a relative or absolute human-readable string.
 * @param {string} ts - ISO timestamp
 * @returns {string}
 */
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

/** Map a status value to display label and color classes. */
function statusMeta(status) {
  switch (status) {
    case "open":
      return { label: "Open", className: "bg-blue-500/20 text-blue-400" };
    case "in_progress":
      return { label: "In Progress", className: "bg-yellow-500/20 text-yellow-400" };
    case "resolved":
      return { label: "Resolved", className: "bg-green-500/20 text-green-400" };
    default:
      return { label: status, className: "bg-BrandGray2/20 text-BrandGray" };
  }
}

/**
 * Admin dashboard for user-reported issues submitted by beta testers.
 */
export default function AdminUserIssues() {
  const [session] = useState(() => localStorage.getItem(SESSION_KEY) || "");
  const [issues, setIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(0);

  const [confirmModal, setConfirmModal] = useState({ open: false });
  const confirmResolveRef = useRef(null);

  const authed = Boolean(session);

  /** Open a confirmation modal and return a promise resolving to true/false. */
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

  /** Fetch a page of issues from the admin API. */
  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      const res = await fetch(`${API_URL}/admin/user-issues?${params}`, {
        headers: { "x-admin-session": session },
      });
      if (!res.ok) throw new Error("Failed to fetch issues");
      const data = await res.json();
      setIssues(data.issues || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session, page]);

  useEffect(() => {
    if (authed) fetchIssues();
  }, [authed, fetchIssues]);

  /** Update the status of a single issue. */
  const handleStatusChange = async (issue, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/admin/user-issues/${issue.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-session": session,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setIssues((prev) =>
        prev.map((i) => (i.id === issue.id ? { ...i, status: newStatus } : i))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  /** Delete a single issue after confirmation. */
  const handleDelete = async (id) => {
    const ok = await openConfirm({
      message: "Delete this issue report?",
      subtitle: "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await fetch(`${API_URL}/admin/user-issues/${id}`, {
        method: "DELETE",
        headers: { "x-admin-session": session },
      });
      setIssues((prev) => prev.filter((i) => i.id !== id));
      setTotal((t) => t - 1);
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="hide-scroll bg-BrandBlack font-DmSans text-white" style={{ height: "100dvh", overflowY: "auto" }}>
      <ConfirmModal
        open={confirmModal.open}
        message={confirmModal.message}
        subtitle={confirmModal.subtitle}
        confirmLabel={confirmModal.confirmLabel}
        danger={confirmModal.danger}
        onConfirm={handleConfirmOk}
        onCancel={handleConfirmCancel}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-BrandGray2/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Coachable" className="h-5 opacity-70" />
          <span className="rounded bg-BrandOrange/20 px-2 py-0.5 text-xs font-semibold text-BrandOrange">
            ADMIN
          </span>
          <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-400">
            REPORTED ISSUES
          </span>
        </div>
        <Link
          to="/admin"
          className="rounded-lg border border-BrandGray2/40 px-3 py-1.5 text-xs text-BrandGray transition hover:border-BrandGray hover:text-white"
        >
          Back to Admin
        </Link>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-Manrope text-xl font-bold">User-Reported Issues</h2>
            <p className="text-sm text-BrandGray">{total} total issue{total !== 1 ? "s" : ""} from beta testers</p>
          </div>
          <button
            onClick={fetchIssues}
            disabled={loading}
            className="rounded-lg border border-BrandGray2/40 px-3 py-1.5 text-xs text-BrandGray transition hover:border-BrandGray hover:text-white disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-600/10 px-4 py-2 text-sm text-red-400">{error}</div>
        )}

        {issues.length === 0 && !loading ? (
          <div className="rounded-xl border border-BrandGray2/20 px-8 py-16 text-center">
            <p className="text-lg text-BrandGray2">No reported issues</p>
            <p className="mt-1 text-sm text-BrandGray2/60">Issues submitted by beta testers will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => {
              const isExpanded = expanded === issue.id;
              const meta = statusMeta(issue.status);
              return (
                <div
                  key={issue.id}
                  className="overflow-hidden rounded-xl border border-BrandGray2/20 transition hover:border-BrandGray2/40"
                >
                  {/* Summary row */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : issue.id)}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
                  >
                    <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${meta.className}`}>
                      {meta.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{issue.title}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-BrandGray2">
                        <span>{issue.user_name || "Unknown"}</span>
                        {issue.user_email && <span>{issue.user_email}</span>}
                        <span>{formatTime(issue.created_at)}</span>
                      </div>
                    </div>
                    <span className="mt-1 shrink-0 text-xs text-BrandGray2">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-BrandGray2/10 bg-[#1e2228]/50 px-4 py-4">
                      <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-BrandGray">
                        {issue.description}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase text-BrandGray2">Status:</span>
                          <select
                            value={issue.status}
                            onChange={(e) => handleStatusChange(issue, e.target.value)}
                            className="rounded-lg border border-BrandGray2/30 bg-BrandBlack px-2 py-1 text-xs text-white outline-none focus:border-BrandOrange"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-BrandGray2">
                            {new Date(issue.created_at).toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleDelete(issue.id)}
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
