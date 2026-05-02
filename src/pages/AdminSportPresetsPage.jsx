import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiEdit2, FiPlus, FiTrash2, FiLogOut, FiEye, FiEyeOff } from "react-icons/fi";
import PlayPreviewCard from "../components/PlayPreviewCard";
import ConfirmModal from "../components/subcomponents/ConfirmModal";
import {
  isAdminElevated,
  getAdminElevatedUntil,
  setAdminElevated,
  clearAdminElevated,
} from "../utils/adminElevation";

const SESSION_KEY = "coachable_admin_session";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Fetch all presets for a specific sport.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @returns {Promise<Object[]>} Array of preset objects
 */
async function fetchPresetsForSport(session, sport) {
  const res = await fetch(
    `${API_URL}/admin/sport-presets/${encodeURIComponent(sport)}`,
    { headers: { "x-admin-session": session } }
  );
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error("Failed to load presets");
  return (await res.json()).presets || [];
}

/**
 * Delete a sport preset via the admin API. Requires elevated session.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @param {string} id - Preset UUID
 */
async function deletePreset(session, sport, id) {
  const res = await fetch(
    `${API_URL}/admin/sport-presets/${encodeURIComponent(sport)}/${id}`,
    { method: "DELETE", headers: { "x-admin-session": session } }
  );
  if (!res.ok) throw new Error("Failed to delete preset");
}

/**
 * Persist a new display order for all presets of a sport.
 * Sends the full ordered array of IDs; server assigns sort_order = index.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @param {string[]} ids - Preset UUIDs in desired display order
 */
async function reorderPresets(session, sport, ids) {
  const res = await fetch(
    `${API_URL}/admin/sport-presets/${encodeURIComponent(sport)}/reorder`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-session": session },
      body: JSON.stringify({ ids }),
    }
  );
  if (!res.ok) throw new Error("Failed to reorder presets");
}

/**
 * Toggle the hidden/published state of a sport preset.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @param {string} id - Preset UUID
 * @param {boolean} isHidden - New hidden state
 * @returns {Promise<Object>} Updated preset object
 */
async function togglePresetVisibility(session, sport, id, isHidden) {
  const res = await fetch(
    `${API_URL}/admin/sport-presets/${encodeURIComponent(sport)}/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-session": session },
      body: JSON.stringify({ isHidden }),
    }
  );
  if (!res.ok) throw new Error("Failed to update preset visibility");
  return (await res.json()).preset;
}

/**
 * Per-sport preset list page. Shows all presets for a sport with edit/delete/create actions.
 * Supports drag-and-drop reordering. Accessible at /admin/presets/:sport.
 */
export default function AdminSportPresetsPage() {
  const { sport } = useParams();
  const navigate = useNavigate();
  const decodedSport = decodeURIComponent(sport);
  const session = sessionStorage.getItem(SESSION_KEY) || "";

  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmModal, setConfirmModal] = useState(null);
  const [elevatedUntil, setElevatedUntil] = useState(() => getAdminElevatedUntil());
  const [elevateModal, setElevateModal] = useState(false);
  const [elevatePassword, setElevatePassword] = useState("");
  const [elevateError, setElevateError] = useState("");
  const [elevating, setElevating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const elevateResolveRef = useRef(null);

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

  useEffect(() => {
    if (!session) navigate("/admin", { replace: true });
  }, [session, navigate]);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchPresetsForSport(session, decodedSport);
      setPresets(data);
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        sessionStorage.removeItem(SESSION_KEY);
        navigate("/admin", { replace: true });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [session, decodedSport, navigate]);

  useEffect(() => { load(); }, [load]);

  /** Prompt for Danger Mode elevation, resolve with boolean. */
  const openElevate = () =>
    new Promise((resolve) => {
      elevateResolveRef.current = resolve;
      setElevatePassword("");
      setElevateError("");
      setElevateModal(true);
    });

  const handleElevate = async () => {
    setElevating(true);
    setElevateError("");
    try {
      const res = await fetch(`${API_URL}/admin/elevate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-session": session },
        body: JSON.stringify({ password: elevatePassword }),
      });
      if (!res.ok) { setElevateError("Incorrect password."); return; }
      const data = await res.json();
      setAdminElevated(data.elevatedUntil);
      setElevatedUntil(getAdminElevatedUntil());
      setElevateModal(false);
      elevateResolveRef.current?.(true);
    } catch {
      setElevateError("Request failed.");
    } finally {
      setElevating(false);
    }
  };

  /** Open confirmation modal and return promise resolving to boolean. */
  const openConfirm = (title, message) =>
    new Promise((resolve) => {
      setConfirmModal({ title, message, resolve });
    });

  const handleDelete = async (preset) => {
    if (deletingId) return;
    if (!isAdminElevated()) {
      const elevated = await openElevate();
      if (!elevated) return;
    }
    const confirmed = await openConfirm(
      "Delete Preset",
      `Delete "${preset.name}"? This cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(preset.id);
    try {
      await deletePreset(session, decodedSport, preset.id);
      setPresets((prev) => prev.filter((p) => p.id !== preset.id));
    } catch {
      setError("Failed to delete preset.");
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Optimistically toggle is_hidden on a preset and persist to the server.
   * @param {Object} preset - The preset to toggle
   */
  const handleToggleVisibility = async (preset) => {
    if (togglingId) return;
    const newHidden = !preset.isHidden;
    setTogglingId(preset.id);
    setPresets((prev) =>
      prev.map((p) => (p.id === preset.id ? { ...p, isHidden: newHidden } : p))
    );
    try {
      await togglePresetVisibility(session, decodedSport, preset.id, newHidden);
    } catch {
      // Roll back optimistic update on failure
      setPresets((prev) =>
        prev.map((p) => (p.id === preset.id ? { ...p, isHidden: preset.isHidden } : p))
      );
      setError("Failed to update preset visibility.");
    } finally {
      setTogglingId(null);
    }
  };

  // ── Drag-and-drop handlers ────────────────────────────────────────────────

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragOverId) setDragOverId(id);
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) { setDraggedId(null); return; }

    const from = presets.findIndex((p) => p.id === draggedId);
    const to = presets.findIndex((p) => p.id === targetId);
    if (from === -1 || to === -1) { setDraggedId(null); return; }

    // Optimistically reorder in UI, then persist
    const reordered = [...presets];
    const [item] = reordered.splice(from, 1);
    reordered.splice(to, 0, item);
    setPresets(reordered);
    setDraggedId(null);

    try {
      await reorderPresets(session, decodedSport, reordered.map((p) => p.id));
    } catch {
      setError("Failed to save new order.");
      load(); // rollback to server state
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  // ─────────────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    navigate("/admin", { replace: true });
  };

  const dangerMinsDisplay = (() => {
    if (!elevatedUntil) return null;
    const secs = Math.max(0, Math.ceil((elevatedUntil - Date.now()) / 1000));
    const mins = Math.floor(secs / 60);
    const s = String(secs % 60).padStart(2, "0");
    return `${mins}:${s}`;
  })();

  return (
    <div className="min-h-screen overflow-y-auto bg-[#111318] text-white">
      {/* Confirm modal */}
      {confirmModal && (
        <ConfirmModal
          open
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => { confirmModal.resolve(true); setConfirmModal(null); }}
          onCancel={() => { confirmModal.resolve(false); setConfirmModal(null); }}
        />
      )}

      {/* Elevate modal */}
      {elevateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-80 rounded-xl border border-white/10 bg-[#1a1d22] p-6">
            <p className="mb-1 font-Manrope text-sm font-bold text-white">Danger Mode</p>
            <p className="mb-4 text-xs text-BrandGray2">Enter admin password to enable destructive actions for 10 minutes.</p>
            <input
              type="password"
              value={elevatePassword}
              onChange={(e) => setElevatePassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleElevate()}
              placeholder="Password"
              className="mb-3 w-full rounded-lg border border-white/10 bg-BrandBlack px-3 py-2 text-sm text-white outline-none focus:border-BrandOrange"
              autoFocus
            />
            {elevateError && <p className="mb-3 text-xs text-red-400">{elevateError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleElevate}
                disabled={elevating}
                className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {elevating ? "Verifying..." : "Enable Danger Mode"}
              </button>
              <button
                onClick={() => { setElevateModal(false); elevateResolveRef.current?.(false); }}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-BrandGray transition hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/6 bg-[#111318]/95 px-6 py-3.5 backdrop-blur-sm">
        <button
          onClick={() => navigate("/admin/app", { state: { tab: "presets" } })}
          className="flex items-center gap-1.5 text-xs text-BrandGray transition hover:text-white"
        >
          <FiArrowLeft /> Sport Presets
        </button>
        <span className="text-BrandGray2">/</span>
        <span className="font-Manrope text-sm font-bold text-white">{decodedSport}</span>
        {dangerMinsDisplay && (
          <span className="animate-pulse rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">
            ⚠ Danger Mode · {dangerMinsDisplay}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => navigate(`/admin/presets/${encodeURIComponent(decodedSport)}/new/edit`)}
            className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
          >
            <FiPlus /> New Preset
          </button>
          <button
            onClick={handleLogout}
            title="Log out"
            className="flex items-center gap-1.5 rounded-lg border border-white/6 px-3 py-2 text-xs text-BrandGray transition hover:border-white/20 hover:text-white"
          >
            <FiLogOut />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="font-Manrope text-lg font-bold text-white">{decodedSport} Presets</h1>
          <p className="mt-1 text-xs text-BrandGray2">
            These presets appear as starting-canvas options for {decodedSport} users when they create a new play.
            Drag cards to reorder.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-600/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange" />
          </div>
        ) : presets.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-white/10 py-20 text-center">
            <p className="text-sm text-BrandGray2">No presets yet for {decodedSport}.</p>
            <button
              onClick={() => navigate(`/admin/presets/${encodeURIComponent(decodedSport)}/new/edit`)}
              className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <FiPlus /> Create First Preset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {presets.map((preset) => {
              const isDragging = draggedId === preset.id;
              const isOver = dragOverId === preset.id && !isDragging;
              return (
                <div
                  key={preset.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, preset.id)}
                  onDragOver={(e) => handleDragOver(e, preset.id)}
                  onDrop={(e) => handleDrop(e, preset.id)}
                  onDragEnd={handleDragEnd}
                  className={[
                    "group flex flex-col gap-2 rounded-xl border bg-[#1a1d22] p-3 transition-all duration-150",
                    "cursor-grab active:cursor-grabbing select-none",
                    isDragging ? "opacity-40 border-white/8" : "",
                    isOver
                      ? "border-BrandOrange/60 scale-[1.02] shadow-lg shadow-BrandOrange/10"
                      : "border-white/8 hover:border-white/16",
                  ].filter(Boolean).join(" ")}
                >
                  {/* Preview */}
                  <div className="overflow-hidden rounded-lg" style={{ height: 110 }}>
                    <PlayPreviewCard
                      playData={preset.playData}
                      autoplay="hover"
                      shape="landscape"
                      cameraMode="fit-distribution"
                      background="field"
                      paddingPx={20}
                      minSpanPx={100}
                      className="h-full w-full"
                    />
                  </div>

                  {/* Name + status badge */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="truncate font-DmSans text-sm font-semibold text-white">{preset.name}</p>
                    {preset.isHidden ? (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-white/8 text-BrandGray2">
                        Hidden
                      </span>
                    ) : (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-green-500/15 text-green-400">
                        Published
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => navigate(`/admin/presets/${encodeURIComponent(decodedSport)}/${preset.id}/edit`)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/8 py-1.5 text-xs text-BrandGray transition hover:border-BrandOrange/40 hover:text-BrandOrange"
                    >
                      <FiEdit2 className="text-[10px]" /> Edit
                    </button>
                    <button
                      onClick={() => handleToggleVisibility(preset)}
                      disabled={togglingId === preset.id}
                      className={[
                        "flex items-center justify-center rounded-lg border px-2 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40",
                        preset.isHidden
                          ? "border-white/8 text-BrandGray hover:border-green-500/40 hover:text-green-400"
                          : "border-white/8 text-BrandGray hover:border-yellow-500/40 hover:text-yellow-400",
                      ].join(" ")}
                      title={preset.isHidden ? "Publish preset" : "Hide preset"}
                    >
                      {togglingId === preset.id ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-BrandGray/40 border-t-BrandGray" />
                      ) : preset.isHidden ? (
                        <FiEye className="text-[10px]" />
                      ) : (
                        <FiEyeOff className="text-[10px]" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(preset)}
                      disabled={deletingId === preset.id}
                      className="flex items-center justify-center rounded-lg border border-white/8 px-2 py-1.5 text-xs text-BrandGray transition hover:border-red-500/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Delete preset"
                    >
                      {deletingId === preset.id ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-red-400/40 border-t-red-400" />
                      ) : (
                        <FiTrash2 className="text-[10px]" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
