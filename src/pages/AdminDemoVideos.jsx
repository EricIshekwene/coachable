/**
 * Admin page for managing demo/tutorial videos shown on the Videos page.
 * Supports creating, editing, reordering, and deleting video entries.
 * Deletion requires Danger Mode (elevated admin session).
 *
 * @module AdminDemoVideos
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiChevronUp, FiChevronDown } from "react-icons/fi";
import ConfirmModal from "../components/subcomponents/ConfirmModal";
import { useAdmin } from "../admin/AdminContext";
import { adminPath } from "../admin/adminNav";
import {
  AdminShell, AdminHeader, AdminPage, AdminCard, AdminSection,
  AdminBtn, AdminInput, AdminModal, AdminEmptyState, AdminSpinner,
} from "../admin/components";
import {
  isAdminElevated,
  setAdminElevated,
} from "../utils/adminElevation";

const SESSION_KEY = "coachable_admin_session";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Extract the YouTube video ID from a URL or bare ID string.
 * Supports watch?v=, youtu.be/, and embed/ formats.
 * @param {string} input - YouTube URL or video ID
 * @returns {string|null} Video ID or null if not parseable
 */
function extractYouTubeId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  // Already a bare ID (no slashes or dots)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("?")[0];
    if (url.searchParams.has("v")) return url.searchParams.get("v");
    const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return embedMatch[1];
  } catch {
    // not a valid URL — return null
  }
  return null;
}

/**
 * Build a YouTube embed URL from a video ID.
 * @param {string} id - YouTube video ID
 * @returns {string}
 */
function buildEmbedUrl(id) {
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}

// ── API helpers ───────────────────────────────────────────────────────────────

/**
 * Fetch all demo videos from the admin API.
 * @param {string} session - Admin session token
 * @returns {Promise<Object[]>}
 */
async function fetchVideos(session) {
  const res = await fetch(`${API_URL}/demo-videos`, {
    headers: { "x-admin-session": session },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  const data = await res.json();
  return data.videos || [];
}

/**
 * Create a new demo video.
 * @param {string} session
 * @param {Object} body - { title, youtubeUrl, done, sortOrder }
 * @returns {Promise<Object>} Created video
 */
async function createVideo(session, body) {
  const res = await fetch(`${API_URL}/demo-videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create");
  return data.video;
}

/**
 * Update an existing demo video.
 * @param {string} session
 * @param {string} id
 * @param {Object} body - Partial update fields
 * @returns {Promise<Object>} Updated video
 */
async function updateVideo(session, id, body) {
  const res = await fetch(`${API_URL}/demo-videos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-session": session },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update");
  return data.video;
}

/**
 * Delete a demo video (requires elevated session).
 * @param {string} session
 * @param {string} id
 */
async function deleteVideo(session, id) {
  const res = await fetch(`${API_URL}/demo-videos/${id}`, {
    method: "DELETE",
    headers: { "x-admin-session": session },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete");
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const BLANK_FORM = { title: "", youtubeUrl: "", keywords: "", done: false };

/**
 * Admin page for managing demo tutorial videos.
 */
export default function AdminDemoVideos() {
  const { basePath } = useAdmin();
  const [session] = useState(() => sessionStorage.getItem(SESSION_KEY) || "");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(BLANK_FORM);
  const [addSaving, setAddSaving] = useState(false);

  // Edit state: editingId -> form values
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(BLANK_FORM);
  const [editSaving, setEditSaving] = useState(false);

  // Preview
  const [previewId, setPreviewId] = useState(null);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState({ open: false });
  const confirmResolveRef = useRef(null);

  // Danger Mode
  const [dangerModal, setDangerModal] = useState(false);
  const [dangerPassword, setDangerPassword] = useState("");
  const [dangerError, setDangerError] = useState("");
  const [dangerLoading, setDangerLoading] = useState(false);
  const dangerResolveRef = useRef(null);

  const authed = Boolean(session);

  // ── Confirm modal ──

  /** Open a generic confirmation modal. Returns a promise resolving to true/false. */
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

  // ── Danger Mode ──

  /** Prompt for Danger Mode if not already elevated. Returns a promise resolving to true/false. */
  const ensureElevated = useCallback(() => {
    if (isAdminElevated()) return Promise.resolve(true);
    return new Promise((resolve) => {
      dangerResolveRef.current = resolve;
      setDangerPassword("");
      setDangerError("");
      setDangerModal(true);
    });
  }, []);

  const handleDangerSubmit = async (e) => {
    e.preventDefault();
    setDangerLoading(true);
    setDangerError("");
    try {
      const res = await fetch(`${API_URL}/admin/elevate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-session": session },
        body: JSON.stringify({ password: dangerPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wrong password");
      setAdminElevated(data.elevatedUntil);
      setDangerModal(false);
      dangerResolveRef.current?.(true);
    } catch (err) {
      setDangerError(err.message);
    } finally {
      setDangerLoading(false);
    }
  };

  const handleDangerCancel = () => {
    setDangerModal(false);
    dangerResolveRef.current?.(false);
  };

  // ── Load ──

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const vids = await fetchVideos(session);
      setVideos(vids);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (authed) loadVideos();
  }, [authed, loadVideos]);

  // ── Add ──

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.title.trim()) return;
    setAddSaving(true);
    setError("");
    try {
      const video = await createVideo(session, {
        title: addForm.title.trim(),
        youtubeUrl: addForm.youtubeUrl.trim() || null,
        keywords: addForm.keywords.trim(),
        done: addForm.done,
        sortOrder: videos.length,
      });
      setVideos((prev) => [...prev, video]);
      setAddForm(BLANK_FORM);
      setShowAdd(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddSaving(false);
    }
  };

  // ── Edit ──

  const startEdit = (video) => {
    setEditingId(video.id);
    setEditForm({ title: video.title, youtubeUrl: video.youtubeUrl || "", keywords: video.keywords || "", done: video.done });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(BLANK_FORM);
  };

  const handleSaveEdit = async (id) => {
    if (!editForm.title.trim()) return;
    setEditSaving(true);
    setError("");
    try {
      const updated = await updateVideo(session, id, {
        title: editForm.title.trim(),
        youtubeUrl: editForm.youtubeUrl.trim() || null,
        keywords: editForm.keywords.trim(),
        done: editForm.done,
      });
      setVideos((prev) => prev.map((v) => (v.id === id ? updated : v)));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  // ── Toggle done (quick action) ──

  const handleToggleDone = async (video) => {
    try {
      const updated = await updateVideo(session, video.id, { done: !video.done });
      setVideos((prev) => prev.map((v) => (v.id === video.id ? updated : v)));
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Reorder ──

  /**
   * Move a video up or down in the list and persist sort_order to the server.
   * @param {number} index - Current index in the videos array
   * @param {number} direction - -1 for up, +1 for down
   */
  const handleMove = async (index, direction) => {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= videos.length) return;

    const newVideos = [...videos];
    [newVideos[index], newVideos[swapIndex]] = [newVideos[swapIndex], newVideos[index]];

    // Assign sequential sort_order values
    const updates = newVideos.map((v, i) => ({ id: v.id, sortOrder: i }));
    setVideos(newVideos.map((v, i) => ({ ...v, sortOrder: i })));

    try {
      await Promise.all(updates.map(({ id, sortOrder }) => updateVideo(session, id, { sortOrder })));
    } catch (err) {
      setError(err.message);
      loadVideos(); // re-sync on failure
    }
  };

  // ── Delete ──

  const handleDelete = async (video) => {
    const ok = await openConfirm({
      message: `Delete "${video.title}"?`,
      subtitle: "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    const elevated = await ensureElevated();
    if (!elevated) return;

    setError("");
    try {
      await deleteVideo(session, video.id);
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
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

      {/* Danger Mode modal */}
      <AdminModal open={dangerModal} onClose={handleDangerCancel} title="Danger Mode Required">
        <p className="mb-4 text-sm" style={{ color: "var(--adm-muted)" }}>Re-enter your admin password to unlock destructive actions for 10 minutes.</p>
        <form onSubmit={handleDangerSubmit}>
          <AdminInput
            type="password"
            autoFocus
            value={dangerPassword}
            onChange={(e) => setDangerPassword(e.target.value)}
            placeholder="Admin password"
            className="mb-3"
          />
          {dangerError && <p className="mb-3 text-xs" style={{ color: "var(--adm-danger)" }}>{dangerError}</p>}
          <div className="flex gap-2">
            <AdminBtn type="button" variant="secondary" className="flex-1" onClick={handleDangerCancel}>Cancel</AdminBtn>
            <AdminBtn type="submit" variant="danger" className="flex-1" disabled={dangerLoading || !dangerPassword}>
              {dangerLoading ? "Verifying..." : "Unlock Danger Mode"}
            </AdminBtn>
          </div>
        </form>
      </AdminModal>

      {/* Preview modal */}
      <AdminModal open={Boolean(previewId)} onClose={() => setPreviewId(null)}>
        {previewId && (
          <div className="overflow-hidden rounded-[var(--adm-radius)]" style={{ width: "min(640px, 90vw)" }}>
            <div className="relative" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={buildEmbedUrl(previewId)}
                className="absolute inset-0 h-full w-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Video preview"
              />
            </div>
          </div>
        )}
      </AdminModal>

      <AdminHeader
        title="Demo Videos"
        backLabel="Dashboard"
        backTo={adminPath(basePath, "")}
        actions={
          <div className="flex gap-2">
            <AdminBtn variant="secondary" size="sm" onClick={loadVideos} disabled={loading}>
              {loading ? <AdminSpinner size={12} /> : "Refresh"}
            </AdminBtn>
            <AdminBtn variant="primary" size="sm" onClick={() => { setShowAdd((s) => !s); setAddForm(BLANK_FORM); }}>
              <FiPlus className="mr-1 inline" /> Add Video
            </AdminBtn>
          </div>
        }
      />
      <AdminPage>
        <AdminSection
          title="Demo Videos"
          subtitle={`${videos.length} video${videos.length !== 1 ? "s" : ""} · use arrows to reorder`}
        >
          {error && (
            <div className="rounded-[var(--adm-radius-sm)] px-4 py-2 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{error}</div>
          )}

          {/* Add form */}
          {showAdd && (
            <AdminCard>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--adm-accent)" }}>New Video</p>
              <form onSubmit={handleAdd} className="space-y-3">
                <AdminInput
                  label="Title *"
                  autoFocus
                  value={addForm.title}
                  onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="How to animate movement"
                />
                <div>
                  <AdminInput
                    label="YouTube URL"
                    value={addForm.youtubeUrl}
                    onChange={(e) => setAddForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
                    placeholder="https://youtu.be/... or paste video ID"
                  />
                  {addForm.youtubeUrl && !extractYouTubeId(addForm.youtubeUrl) && (
                    <p className="mt-1 text-xs" style={{ color: "var(--adm-danger)" }}>Could not parse YouTube ID from this URL</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "var(--adm-muted)" }}>
                    Search Keywords <span style={{ color: "var(--adm-muted)", opacity: 0.6 }}>(comma-separated)</span>
                  </label>
                  <textarea
                    value={addForm.keywords}
                    onChange={(e) => setAddForm((f) => ({ ...f, keywords: e.target.value }))}
                    placeholder="player tag, name, rename, label..."
                    rows={2}
                    className="w-full resize-y px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)", borderRadius: "var(--adm-radius-sm)", color: "var(--adm-text)" }}
                  />
                  <p className="mt-1 text-[11px]" style={{ color: "var(--adm-muted)" }}>Users searching for any of these words will find this video</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAddForm((f) => ({ ...f, done: !f.done }))}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition"
                    style={addForm.done ? { borderColor: "#22c55e", backgroundColor: "#22c55e", color: "#fff" } : { borderColor: "var(--adm-border2)", color: "transparent" }}
                  >
                    <FiCheck />
                  </button>
                  <span className="text-sm" style={{ color: "var(--adm-text2)" }}>Video recorded / ready</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <AdminBtn type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</AdminBtn>
                  <AdminBtn type="submit" variant="primary" disabled={addSaving || !addForm.title.trim()}>
                    {addSaving ? "Saving…" : "Add Video"}
                  </AdminBtn>
                </div>
              </form>
            </AdminCard>
          )}

          {/* Video list */}
          {videos.length === 0 && !loading ? (
            <AdminEmptyState title="No videos yet" subtitle='Click "Add Video" to create your first entry' />
          ) : (
            <div className="space-y-2">
              {videos.map((video, index) => {
                const isEditing = editingId === video.id;
                const ytId = extractYouTubeId(video.youtubeUrl);

                return (
                  <AdminCard key={video.id} padding={false} className="overflow-hidden">
                    {isEditing ? (
                      <div className="p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--adm-accent)" }}>Editing</p>
                        <div className="space-y-3">
                          <AdminInput
                            label="Title *"
                            autoFocus
                            value={editForm.title}
                            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          />
                          <div>
                            <AdminInput
                              label="YouTube URL"
                              value={editForm.youtubeUrl}
                              onChange={(e) => setEditForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
                              placeholder="https://youtu.be/... or paste video ID"
                            />
                            {editForm.youtubeUrl && !extractYouTubeId(editForm.youtubeUrl) && (
                              <p className="mt-1 text-xs" style={{ color: "var(--adm-danger)" }}>Could not parse YouTube ID from this URL</p>
                            )}
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--adm-muted)" }}>Search Keywords</label>
                            <textarea
                              value={editForm.keywords}
                              onChange={(e) => setEditForm((f) => ({ ...f, keywords: e.target.value }))}
                              placeholder="player tag, name, rename..."
                              rows={2}
                              className="w-full resize-y px-3 py-2 text-sm outline-none"
                              style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)", borderRadius: "var(--adm-radius-sm)", color: "var(--adm-text)" }}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditForm((f) => ({ ...f, done: !f.done }))}
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition"
                              style={editForm.done ? { borderColor: "#22c55e", backgroundColor: "#22c55e", color: "#fff" } : { borderColor: "var(--adm-border2)", color: "transparent" }}
                            >
                              <FiCheck />
                            </button>
                            <span className="text-sm" style={{ color: "var(--adm-text2)" }}>Video recorded / ready</span>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <AdminBtn variant="secondary" onClick={cancelEdit}>Cancel</AdminBtn>
                            <AdminBtn variant="primary" onClick={() => handleSaveEdit(video.id)} disabled={editSaving || !editForm.title.trim()}>
                              <FiCheck className="mr-1 inline text-xs" />
                              {editSaving ? "Saving…" : "Save"}
                            </AdminBtn>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Reorder arrows */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMove(index, -1)}
                            disabled={index === 0}
                            className="rounded p-0.5 transition-opacity disabled:opacity-20"
                            style={{ color: "var(--adm-muted)" }}
                            title="Move up"
                          >
                            <FiChevronUp className="text-xs" />
                          </button>
                          <button
                            onClick={() => handleMove(index, 1)}
                            disabled={index === videos.length - 1}
                            className="rounded p-0.5 transition-opacity disabled:opacity-20"
                            style={{ color: "var(--adm-muted)" }}
                            title="Move down"
                          >
                            <FiChevronDown className="text-xs" />
                          </button>
                        </div>

                        {/* Done toggle */}
                        <button
                          onClick={() => handleToggleDone(video)}
                          title={video.done ? "Mark as not done" : "Mark as done"}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition"
                          style={video.done ? { borderColor: "#22c55e", backgroundColor: "#22c55e", color: "#fff" } : { borderColor: "var(--adm-border2)", color: "transparent" }}
                        >
                          <FiCheck />
                        </button>

                        {/* Title + URL */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium" style={{ color: "var(--adm-text)" }}>{video.title}</p>
                          {video.youtubeUrl ? (
                            <p className="truncate text-[11px]" style={{ color: "var(--adm-muted)" }}>{video.youtubeUrl}</p>
                          ) : (
                            <p className="text-[11px] italic" style={{ color: "var(--adm-muted)", opacity: 0.5 }}>No URL — coming soon</p>
                          )}
                        </div>

                        {/* Preview thumbnail */}
                        {ytId && (
                          <button
                            onClick={() => setPreviewId(ytId)}
                            className="shrink-0 overflow-hidden rounded-md transition"
                            style={{ border: "1px solid var(--adm-border)" }}
                            title="Preview video"
                          >
                            <img
                              src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                              alt="thumbnail"
                              className="h-9 w-16 object-cover"
                            />
                          </button>
                        )}

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-1">
                          <AdminBtn variant="ghost" size="sm" onClick={() => startEdit(video)} title="Edit">
                            <FiEdit2 className="text-sm" />
                          </AdminBtn>
                          <AdminBtn variant="danger" size="sm" onClick={() => handleDelete(video)} title="Delete">
                            <FiTrash2 className="text-sm" />
                          </AdminBtn>
                        </div>
                      </div>
                    )}
                  </AdminCard>
                );
              })}
            </div>
          )}
        </AdminSection>
      </AdminPage>
    </AdminShell>
  );
}
