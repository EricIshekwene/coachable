/**
 * Admin page for viewing and managing user-reported issues from beta testers.
 * Supports pagination, status updates, and deletion.
 *
 * @module AdminUserIssues
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../../admin/AdminContext";
import { adminPath } from "../../admin/adminNav";
import { adminFetchOptions, readAdminSession } from "../../admin/adminTransport";
import { AdminShell, AdminHeader, AdminPage } from "../../admin/components";
import { Card, Section, Button, Select, Badge, EmptyState, Spinner, ConfirmDialog } from "../../design-system/components";

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

/**
 * Admin dashboard for user-reported issues submitted by beta testers.
 */
export default function AdminUserIssues() {
  const { basePath, hasPerm, isOwner } = useAdmin();
  const [session] = useState(() => readAdminSession() || "");
  const [issues, setIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(0);

  const [confirmModal, setConfirmModal] = useState({ open: false });
  const confirmResolveRef = useRef(null);

  const authed = basePath === "/staff" || Boolean(session);
  const canResolveIssues = isOwner || hasPerm("issues.resolve");

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
        ...adminFetchOptions(),
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
    if (!canResolveIssues) return;
    try {
      const res = await fetch(`${API_URL}/admin/user-issues/${issue.id}`, {
        ...adminFetchOptions({
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        }),
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
    if (!isOwner) return;
    const ok = await openConfirm({
      message: "Delete this issue report?",
      subtitle: "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await fetch(`${API_URL}/admin/user-issues/${id}`, {
        ...adminFetchOptions({ method: "DELETE" }),
      });
      setIssues((prev) => prev.filter((i) => i.id !== id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!authed) {
    return (
      <AdminShell className="flex items-center justify-center">
        <Card>
          <p className="mb-3 text-sm" style={{ color: "var(--adm-muted)" }}>Admin session required</p>
          <Link to={adminPath(basePath, "")} className="text-sm transition-opacity hover:opacity-70" style={{ color: "var(--adm-accent)" }}>Go to Admin Login</Link>
        </Card>
      </AdminShell>
    );
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
      <AdminHeader
        title="Reported Issues"
        backLabel="Dashboard"
        backTo={adminPath(basePath, "")}
        actions={
          <Button variant="secondary" size="sm" onClick={fetchIssues} disabled={loading}>
            {loading ? <Spinner size={12} /> : "Refresh"}
          </Button>
        }
      />
      <AdminPage>
        <Section
          title="User-Reported Issues"
          subtitle={`${total} total issue${total !== 1 ? "s" : ""} from beta testers`}
        >
          {error && (
            <div className="rounded-[var(--adm-radius-sm)] px-4 py-2 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{error}</div>
          )}

          {issues.length === 0 && !loading ? (
            <EmptyState title="No reported issues" subtitle="Issues submitted by beta testers will appear here" />
          ) : (
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {issues.map((issue) => {
                const isExpanded = expanded === issue.id;
                return (
                  <Card key={issue.id} padding={false} className="overflow-hidden">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : issue.id)}
                      className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-opacity hover:opacity-90"
                    >
                      <Badge status={issue.status} className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{issue.title}</p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]" style={{ color: "var(--adm-muted)" }}>
                          <span>{issue.user_name || "Unknown"}</span>
                          {issue.user_email && <span>{issue.user_email}</span>}
                          <span>{formatTime(issue.created_at)}</span>
                        </div>
                      </div>
                      <svg className={`mt-1 h-3.5 w-3.5 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ color: "var(--adm-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {isExpanded && (
                      <div className="px-4 py-4" style={{ borderTop: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface2)" }}>
                        <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--adm-text2)" }}>
                          {issue.description}
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--adm-muted)" }}>Status:</span>
                            {canResolveIssues ? (
                              <Select
                                value={issue.status}
                                onChange={(e) => handleStatusChange(issue, e.target.value)}
                              >
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                              </Select>
                            ) : (
                              <Badge status={issue.status}>{issue.status.replace("_", " ")}</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px]" style={{ color: "var(--adm-muted)" }}>
                              {new Date(issue.created_at).toLocaleString()}
                            </span>
                            {isOwner && (
                              <Button variant="danger" size="sm" onClick={() => handleDelete(issue.id)}>Delete</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
              <span className="text-xs" style={{ color: "var(--adm-muted)" }}>Page {page + 1} of {totalPages}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</Button>
            </div>
          )}
        </Section>
      </AdminPage>
    </AdminShell>
  );
}
