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
import logo from "../assets/logos/full_Coachable_logo.png";
import ConfirmModal from "../components/subcomponents/ConfirmModal";
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

  return (
    <div className="hide-scroll bg-BrandBlack font-DmSans text-white" style={{ height: "100dvh", overflowY: "auto" }}>
      {/* Confirm modal */}
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
      {dangerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleDangerSubmit}
            className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-[#1a1a1a] p-6 shadow-2xl"
          >
            <h2 className="mb-1 font-Manrope text-base font-bold text-red-400">Danger Mode Required</h2>
            <p className="mb-4 text-sm text-BrandGray">Re-enter your admin password to unlock destructive actions for 10 minutes.</p>
            <input
              type="password"
              autoFocus
              value={dangerPassword}
              onChange={(e) => setDangerPassword(e.target.value)}
              placeholder="Admin password"
              className="mb-3 w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack px-3 py-2 text-sm text-white outline-none focus:border-red-400"
            />
            {dangerError && <p className="mb-3 text-xs text-red-400">{dangerError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDangerCancel}
                className="flex-1 rounded-lg border border-BrandGray2/30 py-2 text-sm text-BrandGray transition hover:border-BrandGray"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dangerLoading || !dangerPassword}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {dangerLoading ? "Verifying..." : "Unlock Danger Mode"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-BrandGray2/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Coachable" className="h-5 opacity-70" />
          <span className="rounded bg-BrandOrange/20 px-2 py-0.5 text-xs font-semibold text-BrandOrange">ADMIN</span>
          <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400">DEMO VIDEOS</span>
        </div>
        <Link
          to="/admin"
          className="rounded-lg border border-BrandGray2/40 px-3 py-1.5 text-xs text-BrandGray transition hover:border-BrandGray hover:text-white"
        >
          Back to Admin
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Title row */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-Manrope text-xl font-bold">Demo Videos</h2>
            <p className="text-sm text-BrandGray">{videos.length} video{videos.length !== 1 ? "s" : ""} · drag to reorder</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadVideos}
              disabled={loading}
              className="rounded-lg border border-BrandGray2/40 px-3 py-1.5 text-xs text-BrandGray transition hover:border-BrandGray hover:text-white disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              onClick={() => { setShowAdd((s) => !s); setAddForm(BLANK_FORM); }}
              className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
            >
              <FiPlus /> Add Video
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-600/10 px-4 py-2 text-sm text-red-400">{error}</div>
        )}

        {/* Add form */}
        {showAdd && (
          <form
            onSubmit={handleAdd}
            className="mb-4 rounded-xl border border-BrandOrange/30 bg-BrandOrange/5 p-4"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-BrandOrange">New Video</p>
            <div className="mb-3">
              <label className="mb-1 block text-xs text-BrandGray">Title *</label>
              <input
                autoFocus
                value={addForm.title}
                onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="How to animate movement"
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack px-3 py-2 text-sm text-white outline-none focus:border-BrandOrange"
              />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs text-BrandGray">YouTube URL</label>
              <input
                value={addForm.youtubeUrl}
                onChange={(e) => setAddForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
                placeholder="https://youtu.be/... or paste video ID"
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack px-3 py-2 text-sm text-white outline-none focus:border-BrandOrange"
              />
              {addForm.youtubeUrl && !extractYouTubeId(addForm.youtubeUrl) && (
                <p className="mt-1 text-xs text-red-400">Could not parse YouTube ID from this URL</p>
              )}
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs text-BrandGray">Search Keywords <span className="text-BrandGray2">(comma-separated)</span></label>
              <textarea
                value={addForm.keywords}
                onChange={(e) => setAddForm((f) => ({ ...f, keywords: e.target.value }))}
                placeholder="player tag, name, rename, label, number, jersey, assign, edit player..."
                rows={3}
                className="w-full resize-y rounded-lg border border-BrandGray2/30 bg-BrandBlack px-3 py-2 text-sm text-white outline-none focus:border-BrandOrange"
              />
              <p className="mt-1 text-[11px] text-BrandGray2">Users searching for any of these words will find this video</p>
            </div>
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAddForm((f) => ({ ...f, done: !f.done }))}
                className={`flex h-5 w-5 items-center justify-center rounded border text-xs transition ${
                  addForm.done
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-BrandGray2/50 text-transparent"
                }`}
              >
                <FiCheck />
              </button>
              <span className="text-sm text-BrandGray">Video recorded / ready</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-lg border border-BrandGray2/40 px-4 py-1.5 text-sm text-BrandGray transition hover:border-BrandGray"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addSaving || !addForm.title.trim()}
                className="rounded-lg bg-BrandOrange px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {addSaving ? "Saving…" : "Add Video"}
              </button>
            </div>
          </form>
        )}

        {/* Preview modal */}
        {previewId && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewId(null)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={buildEmbedUrl(previewId)}
                  className="absolute inset-0 h-full w-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title="Video preview"
                />
              </div>
              <div className="flex justify-end border-t border-BrandGray2/20 bg-[#1a1a1a] px-4 py-2">
                <button
                  onClick={() => setPreviewId(null)}
                  className="text-xs text-BrandGray transition hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video list */}
        {videos.length === 0 && !loading ? (
          <div className="rounded-xl border border-BrandGray2/20 px-8 py-16 text-center">
            <p className="text-lg text-BrandGray2">No videos yet</p>
            <p className="mt-1 text-sm text-BrandGray2/60">Click "Add Video" to create your first entry</p>
          </div>
        ) : (
          <div className="space-y-2">
            {videos.map((video, index) => {
              const isEditing = editingId === video.id;
              const ytId = extractYouTubeId(video.youtubeUrl);

              return (
                <div
                  key={video.id}
                  className="overflow-hidden rounded-xl border border-BrandGray2/20 transition hover:border-BrandGray2/40"
                >
                  {isEditing ? (
                    /* Edit form */
                    <div className="p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-BrandOrange">Editing</p>
                      <div className="mb-3">
                        <label className="mb-1 block text-xs text-BrandGray">Title *</label>
                        <input
                          autoFocus
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack px-3 py-2 text-sm text-white outline-none focus:border-BrandOrange"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="mb-1 block text-xs text-BrandGray">YouTube URL</label>
                        <input
                          value={editForm.youtubeUrl}
                          onChange={(e) => setEditForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
                          placeholder="https://youtu.be/... or paste video ID"
                          className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack px-3 py-2 text-sm text-white outline-none focus:border-BrandOrange"
                        />
                        {editForm.youtubeUrl && !extractYouTubeId(editForm.youtubeUrl) && (
                          <p className="mt-1 text-xs text-red-400">Could not parse YouTube ID from this URL</p>
                        )}
                      </div>
                      <div className="mb-3">
                        <label className="mb-1 block text-xs text-BrandGray">Search Keywords <span className="text-BrandGray2">(comma-separated)</span></label>
                        <textarea
                          value={editForm.keywords}
                          onChange={(e) => setEditForm((f) => ({ ...f, keywords: e.target.value }))}
                          placeholder="player tag, name, rename, label, number, jersey, assign, edit player..."
                          rows={3}
                          className="w-full resize-y rounded-lg border border-BrandGray2/30 bg-BrandBlack px-3 py-2 text-sm text-white outline-none focus:border-BrandOrange"
                        />
                        <p className="mt-1 text-[11px] text-BrandGray2">Users searching for any of these words will find this video</p>
                      </div>
                      <div className="mb-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditForm((f) => ({ ...f, done: !f.done }))}
                          className={`flex h-5 w-5 items-center justify-center rounded border text-xs transition ${
                            editForm.done
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-BrandGray2/50 text-transparent"
                          }`}
                        >
                          <FiCheck />
                        </button>
                        <span className="text-sm text-BrandGray">Video recorded / ready</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={cancelEdit}
                          className="rounded-lg border border-BrandGray2/40 px-3 py-1.5 text-sm text-BrandGray transition hover:border-BrandGray"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(video.id)}
                          disabled={editSaving || !editForm.title.trim()}
                          className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                        >
                          <FiCheck className="text-xs" />
                          {editSaving ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Row view */
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Reorder */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMove(index, -1)}
                          disabled={index === 0}
                          className="rounded p-0.5 text-BrandGray2 transition hover:text-white disabled:opacity-20"
                          title="Move up"
                        >
                          <FiChevronUp className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleMove(index, 1)}
                          disabled={index === videos.length - 1}
                          className="rounded p-0.5 text-BrandGray2 transition hover:text-white disabled:opacity-20"
                          title="Move down"
                        >
                          <FiChevronDown className="text-xs" />
                        </button>
                      </div>

                      {/* Done checkbox */}
                      <button
                        onClick={() => handleToggleDone(video)}
                        title={video.done ? "Mark as not done" : "Mark as done"}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition ${
                          video.done
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-BrandGray2/50 text-transparent hover:border-BrandGray2"
                        }`}
                      >
                        <FiCheck />
                      </button>

                      {/* Title + URL */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{video.title}</p>
                        {video.youtubeUrl ? (
                          <p className="truncate text-[11px] text-BrandGray2">{video.youtubeUrl}</p>
                        ) : (
                          <p className="text-[11px] text-BrandGray2/50 italic">No URL — coming soon</p>
                        )}
                      </div>

                      {/* Preview thumbnail */}
                      {ytId && (
                        <button
                          onClick={() => setPreviewId(ytId)}
                          className="shrink-0 overflow-hidden rounded-md border border-BrandGray2/20 transition hover:border-BrandOrange"
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
                        <button
                          onClick={() => startEdit(video)}
                          className="rounded-lg p-2 text-BrandGray2 transition hover:bg-BrandGray2/10 hover:text-white"
                          title="Edit"
                        >
                          <FiEdit2 className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDelete(video)}
                          className="rounded-lg p-2 text-BrandGray2 transition hover:bg-red-600/20 hover:text-red-400"
                          title="Delete"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
