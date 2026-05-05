import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiEdit2, FiPlus, FiTrash2, FiEye, FiEyeOff, FiCopy } from "react-icons/fi";
import PlayPreviewCard from "../components/PlayPreviewCard";
import ConfirmModal from "../components/subcomponents/ConfirmModal";
import { useAdmin } from "../admin/AdminContext";
import { adminPath } from "../admin/adminNav";
import { AdminShell, AdminHeader, AdminPage, AdminBtn, AdminInput, AdminModal, AdminEmptyState, AdminSpinner } from "../admin/components";
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
 * Create a duplicate of a preset with "Copy of " prepended to its name.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @param {string} name - Original preset name
 * @param {Object} playData - Play data to duplicate
 * @returns {Promise<Object>} Newly created preset object
 */
async function duplicatePreset(session, sport, name, playData) {
  const res = await fetch(
    `${API_URL}/admin/sport-presets/${encodeURIComponent(sport)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-session": session },
      body: JSON.stringify({ name: `Copy of ${name}`, playData }),
    }
  );
  if (!res.ok) throw new Error("Failed to duplicate preset");
  return (await res.json()).preset;
}

/**
 * Per-sport preset list page. Shows all presets for a sport with edit/delete/create actions.
 * Supports drag-and-drop reordering. Accessible at /admin/presets/:sport.
 */
export default function AdminSportPresetsPage() {
  const { basePath } = useAdmin();
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
  const [duplicatingId, setDuplicatingId] = useState(null);
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
    if (!session) navigate(adminPath(basePath, ""), { replace: true });
  }, [session, navigate, basePath]);

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

  /**
   * Duplicate a preset and append the copy at the end of the list.
   * @param {Object} preset - The preset to duplicate
   */
  const handleDuplicate = async (preset) => {
    if (duplicatingId) return;
    setDuplicatingId(preset.id);
    try {
      const copy = await duplicatePreset(session, decodedSport, preset.name, preset.playData);
      setPresets((prev) => [...prev, copy]);
    } catch {
      setError("Failed to duplicate preset.");
    } finally {
      setDuplicatingId(null);
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
    navigate(adminPath(basePath, ""), { replace: true });
  };

  const dangerMinsDisplay = (() => {
    if (!elevatedUntil) return null;
    const secs = Math.max(0, Math.ceil((elevatedUntil - Date.now()) / 1000));
    const mins = Math.floor(secs / 60);
    const s = String(secs % 60).padStart(2, "0");
    return `${mins}:${s}`;
  })();

  return (
    <AdminShell>
      {confirmModal && (
        <ConfirmModal
          open
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => { confirmModal.resolve(true); setConfirmModal(null); }}
          onCancel={() => { confirmModal.resolve(false); setConfirmModal(null); }}
        />
      )}

      <AdminModal open={elevateModal} onClose={() => { setElevateModal(false); elevateResolveRef.current?.(false); }} title="Danger Mode">
        <p className="mb-4 text-sm" style={{ color: "var(--adm-muted)" }}>Enter admin password to enable destructive actions for 10 minutes.</p>
        <AdminInput
          type="password"
          value={elevatePassword}
          onChange={(e) => setElevatePassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleElevate()}
          placeholder="Password"
          autoFocus
          className="mb-3"
        />
        {elevateError && <p className="mb-3 text-xs" style={{ color: "var(--adm-danger)" }}>{elevateError}</p>}
        <div className="flex gap-2">
          <AdminBtn variant="danger" className="flex-1" onClick={handleElevate} disabled={elevating}>
            {elevating ? "Verifying..." : "Enable Danger Mode"}
          </AdminBtn>
          <AdminBtn variant="secondary" onClick={() => { setElevateModal(false); elevateResolveRef.current?.(false); }}>Cancel</AdminBtn>
        </div>
      </AdminModal>

      <AdminHeader
        title={`${decodedSport} Presets`}
        backLabel="Sport Presets"
        backTo={adminPath(basePath, "/app")}
        actions={
          <div className="flex items-center gap-2">
            {dangerMinsDisplay && (
              <span className="animate-pulse rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>
                ⚠ Danger · {dangerMinsDisplay}
              </span>
            )}
            <AdminBtn variant="primary" size="sm" onClick={() => navigate(`${adminPath(basePath, "/presets")}/${encodeURIComponent(decodedSport)}/new/edit`)}>
              <FiPlus className="mr-1 inline" /> New Preset
            </AdminBtn>
          </div>
        }
      />

      <AdminPage>
        <p className="mb-6 text-xs" style={{ color: "var(--adm-muted)" }}>
          These presets appear as starting-canvas options for {decodedSport} users. Drag cards to reorder.
        </p>

        {error && (
          <div className="mb-6 rounded-[var(--adm-radius-sm)] px-4 py-3 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24"><AdminSpinner size={32} /></div>
        ) : presets.length === 0 ? (
          <AdminEmptyState
            title={`No presets for ${decodedSport}`}
            subtitle="Create the first preset to give users a starting canvas"
            action={
              <AdminBtn variant="primary" onClick={() => navigate(`${adminPath(basePath, "/presets")}/${encodeURIComponent(decodedSport)}/new/edit`)}>
                <FiPlus className="mr-1 inline" /> Create First Preset
              </AdminBtn>
            }
          />
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
                  className="group flex cursor-grab select-none flex-col gap-2 rounded-[var(--adm-radius)] p-3 transition-all duration-150 active:cursor-grabbing"
                  style={{
                    backgroundColor: "var(--adm-surface2)",
                    border: isOver
                      ? "1px solid var(--adm-accent)"
                      : "1px solid var(--adm-border)",
                    opacity: isDragging ? 0.4 : 1,
                    transform: isOver ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  <div className="overflow-hidden rounded-[var(--adm-radius-sm)]" style={{ height: 110 }}>
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

                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{preset.name}</p>
                    {preset.isHidden ? (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-muted)" }}>Hidden</span>
                    ) : (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ backgroundColor: "var(--adm-badge-green-bg)", color: "var(--adm-success)" }}>Published</span>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => navigate(`${adminPath(basePath, "/presets")}/${encodeURIComponent(decodedSport)}/${preset.id}/edit`)}
                      className="flex flex-1 items-center justify-center gap-1 rounded py-1.5 text-xs transition"
                      style={{ border: "1px solid var(--adm-border)", color: "var(--adm-muted)" }}
                    >
                      <FiEdit2 className="text-[10px]" /> Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(preset)}
                      disabled={duplicatingId === preset.id}
                      className="flex items-center justify-center rounded px-2 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ border: "1px solid var(--adm-border)", color: "var(--adm-muted)" }}
                      title="Duplicate"
                    >
                      {duplicatingId === preset.id ? <AdminSpinner size={12} /> : <FiCopy className="text-[10px]" />}
                    </button>
                    <button
                      onClick={() => handleToggleVisibility(preset)}
                      disabled={togglingId === preset.id}
                      className="flex items-center justify-center rounded px-2 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ border: "1px solid var(--adm-border)", color: "var(--adm-muted)" }}
                      title={preset.isHidden ? "Publish" : "Hide"}
                    >
                      {togglingId === preset.id ? <AdminSpinner size={12} /> : preset.isHidden ? <FiEye className="text-[10px]" /> : <FiEyeOff className="text-[10px]" />}
                    </button>
                    <button
                      onClick={() => handleDelete(preset)}
                      disabled={deletingId === preset.id}
                      className="flex items-center justify-center rounded px-2 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ border: "1px solid var(--adm-border)", color: "var(--adm-danger)" }}
                      title="Delete"
                    >
                      {deletingId === preset.id ? <AdminSpinner size={12} /> : <FiTrash2 className="text-[10px]" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminPage>
    </AdminShell>
  );
}
