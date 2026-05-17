import { useState, useEffect, useCallback, useRef } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { FiEdit2, FiPlus, FiTrash2, FiEye, FiEyeOff, FiCopy } from "react-icons/fi";
import PlayPreviewCard from "../components/PlayPreviewCard";
import ConfirmModal from "../components/subcomponents/ConfirmModal";
import { useAdmin } from "../admin/AdminContext";
import { adminPath } from "../admin/adminNav";
import { adminFetchOptions, readAdminSession } from "../admin/adminTransport";
import { AdminShell, AdminHeader, AdminPage, AdminBtn, AdminInput, AdminModal, AdminEmptyState, AdminSpinner } from "../admin/components";
import { prefabToPreviewPlayData } from "../utils/sportPrefabPresets";
import {
  isAdminElevated,
  getAdminElevatedUntil,
  setAdminElevated,
  clearAdminElevated,
} from "../utils/adminElevation";

const SESSION_KEY = "coachable_admin_session";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Fetch all prefab presets for a specific sport.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @returns {Promise<Object[]>} Array of preset objects
 */
async function fetchPresetsForSport(session, sport) {
  const res = await fetch(
    `${API_URL}/admin/sport-prefab-presets/${encodeURIComponent(sport)}`,
    adminFetchOptions()
  );
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error("Failed to load prefab presets");
  return (await res.json()).presets || [];
}

/**
 * Delete a sport prefab preset via the admin API. Requires elevated session.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @param {string} id - Preset UUID
 */
async function deletePreset(session, sport, id) {
  const res = await fetch(
    `${API_URL}/admin/sport-prefab-presets/${encodeURIComponent(sport)}/${id}`,
    adminFetchOptions({ method: "DELETE" })
  );
  if (!res.ok) throw new Error("Failed to delete prefab preset");
}

/**
 * Persist a new display order for all prefab presets of a sport.
 * Sends the full ordered array of IDs; server assigns sort_order = index.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @param {string[]} ids - Preset UUIDs in desired display order
 */
async function reorderPresets(session, sport, ids) {
  const res = await fetch(
    `${API_URL}/admin/sport-prefab-presets/${encodeURIComponent(sport)}/reorder`,
    adminFetchOptions({
      method: "POST",
      body: JSON.stringify({ ids }),
    })
  );
  if (!res.ok) throw new Error("Failed to reorder prefab presets");
}

/**
 * Toggle the hidden/published state of a prefab preset.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @param {string} id - Preset UUID
 * @param {boolean} isHidden - New hidden state
 * @returns {Promise<Object>} Updated preset object
 */
async function togglePresetVisibility(session, sport, id, isHidden) {
  const res = await fetch(
    `${API_URL}/admin/sport-prefab-presets/${encodeURIComponent(sport)}/${id}`,
    adminFetchOptions({
      method: "PATCH",
      body: JSON.stringify({ isHidden }),
    })
  );
  if (!res.ok) throw new Error("Failed to update prefab preset visibility");
  return (await res.json()).preset;
}

/**
 * Rename a prefab preset. Same PATCH endpoint as visibility/data updates —
 * only the `name` field is sent.
 * @param {string} sport - Sport name
 * @param {string} id - Preset UUID
 * @param {string} name - New name (trimmed)
 * @returns {Promise<Object>} Updated preset object
 */
async function renamePreset(sport, id, name) {
  const res = await fetch(
    `${API_URL}/admin/sport-prefab-presets/${encodeURIComponent(sport)}/${id}`,
    adminFetchOptions({
      method: "PATCH",
      body: JSON.stringify({ name }),
    })
  );
  if (!res.ok) throw new Error("Failed to rename prefab preset");
  return (await res.json()).preset;
}

/**
 * Duplicate a prefab preset. Server assigns a new id and the next sort_order.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @param {string} name - Original preset name (prefixed with "Copy of ")
 * @param {Object} prefabData - Prefab payload to duplicate
 * @returns {Promise<Object>} Newly created preset object
 */
async function duplicatePreset(session, sport, name, prefabData) {
  const res = await fetch(
    `${API_URL}/admin/sport-prefab-presets/${encodeURIComponent(sport)}`,
    adminFetchOptions({
      method: "POST",
      body: JSON.stringify({ name: `Copy of ${name}`, prefabData }),
    })
  );
  if (!res.ok) throw new Error("Failed to duplicate prefab preset");
  return (await res.json()).preset;
}

/**
 * Per-sport prefab preset list page. Mirrors AdminSportPresetsPage but for
 * the `sport_prefab_presets` table — small reusable player groupings rather
 * than full starting canvases.
 *
 * URL: /admin/prefab-presets/:sport
 */
export default function AdminSportPrefabPresetsPage() {
  const { basePath, hasPerm, hasSportScope, isOwner, sessionLoaded } = useAdmin();
  const { sport } = useParams();
  const navigate = useNavigate();
  const decodedSport = decodeURIComponent(sport);
  const session = readAdminSession() || "";
  const canAccessSport = isOwner || (
    hasPerm("prefabs.manage") &&
    hasSportScope("presets.sportScope", decodedSport)
  );

  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmModal, setConfirmModal] = useState(null);
  const [elevatedUntil, setElevatedUntil] = useState(() => getAdminElevatedUntil());
  const [elevateModal, setElevateModal] = useState(false);
  const [elevatePassword, setElevatePassword] = useState("");
  const [elevateError, setElevateError] = useState("");
  const [elevating, setElevating] = useState(false);
  const [elevateStep, setElevateStep] = useState("password");
  const [elevateCode, setElevateCode] = useState("");
  const [elevateMaskedEmail, setElevateMaskedEmail] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  // Inline rename: which card is currently being edited + the draft value.
  // Empty/whitespace draft on commit is rejected; the row reverts to its prior name.
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
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
    if (!session && basePath === "/admin") navigate(adminPath(basePath, ""), { replace: true });
  }, [session, navigate, basePath]);

  const load = useCallback(async () => {
    if (!session && basePath === "/admin") return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchPresetsForSport(session, decodedSport);
      setPresets(data);
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        sessionStorage.removeItem(SESSION_KEY);
        navigate(basePath === "/staff" ? "/staff/login" : "/admin", { replace: true });
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
      setElevateCode("");
      setElevateError("");
      setElevateStep("password");
      setElevateModal(true);
    });

  const handleElevate = async () => {
    setElevating(true);
    setElevateError("");
    try {
      if (elevateStep === "password") {
        const res = await fetch(`${API_URL}/admin/elevate/request`, {
          method: "POST",
          credentials: "include",
    headers: {"Content-Type": "application/json", "x-admin-session": session },
          body: JSON.stringify({ password: elevatePassword }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Incorrect password.");
        if (data.elevated) {
          setAdminElevated(data.elevatedUntil);
          setElevatedUntil(getAdminElevatedUntil());
          setElevateModal(false);
          elevateResolveRef.current?.(true);
        } else {
          setElevateMaskedEmail(data.maskedEmail || "");
          setElevatePassword("");
          setElevateStep("code");
        }
      } else {
        const res = await fetch(`${API_URL}/admin/elevate/confirm`, {
          method: "POST",
          credentials: "include",
    headers: {"Content-Type": "application/json", "x-admin-session": session },
          body: JSON.stringify({ code: elevateCode }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Invalid code");
        setAdminElevated(data.elevatedUntil);
        setElevatedUntil(getAdminElevatedUntil());
        setElevateModal(false);
        elevateResolveRef.current?.(true);
      }
    } catch (err) {
      setElevateError(err.message || "Request failed.");
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
    if (!isOwner) return;
    if (deletingId) return;
    if (!isAdminElevated()) {
      const elevated = await openElevate();
      if (!elevated) return;
    }
    const confirmed = await openConfirm(
      "Delete Prefab Preset",
      `Delete "${preset.name}"? This cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(preset.id);
    try {
      await deletePreset(session, decodedSport, preset.id);
      setPresets((prev) => prev.filter((p) => p.id !== preset.id));
    } catch {
      setError("Failed to delete prefab preset.");
    } finally {
      setDeletingId(null);
    }
  };

  /** Optimistically toggle is_hidden on a preset and persist to the server. */
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
      setPresets((prev) =>
        prev.map((p) => (p.id === preset.id ? { ...p, isHidden: preset.isHidden } : p))
      );
      setError("Failed to update prefab preset visibility.");
    } finally {
      setTogglingId(null);
    }
  };

  /** Enter inline rename mode for a card. */
  const handleStartRename = (preset) => {
    setRenamingId(preset.id);
    setRenameValue(preset.name || "");
  };

  /** Cancel the inline rename without saving. */
  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  /**
   * Commit the inline rename. Empty/whitespace or unchanged values cancel
   * silently. Optimistic update; reverts on server error.
   */
  const handleCommitRename = async (preset) => {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    setRenameValue("");
    if (!trimmed || trimmed === preset.name) return;
    const previousName = preset.name;
    setPresets((prev) =>
      prev.map((p) => (p.id === preset.id ? { ...p, name: trimmed } : p))
    );
    try {
      await renamePreset(decodedSport, preset.id, trimmed);
    } catch {
      setPresets((prev) =>
        prev.map((p) => (p.id === preset.id ? { ...p, name: previousName } : p))
      );
      setError("Failed to rename prefab preset.");
    }
  };

  /** Duplicate a preset and append the copy at the end of the list. */
  const handleDuplicate = async (preset) => {
    if (duplicatingId) return;
    setDuplicatingId(preset.id);
    try {
      const copy = await duplicatePreset(session, decodedSport, preset.name, preset.prefabData);
      setPresets((prev) => [...prev, copy]);
    } catch {
      setError("Failed to duplicate prefab preset.");
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

    const reordered = [...presets];
    const [item] = reordered.splice(from, 1);
    reordered.splice(to, 0, item);
    setPresets(reordered);
    setDraggedId(null);

    try {
      await reorderPresets(session, decodedSport, reordered.map((p) => p.id));
    } catch {
      setError("Failed to save new order.");
      load();
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const dangerMinsDisplay = (() => {
    if (!elevatedUntil) return null;
    const secs = Math.max(0, Math.ceil((elevatedUntil - Date.now()) / 1000));
    const mins = Math.floor(secs / 60);
    const s = String(secs % 60).padStart(2, "0");
    return `${mins}:${s}`;
  })();

  const editPathBase = `${adminPath(basePath, "/prefab-presets")}/${encodeURIComponent(decodedSport)}`;

  if (basePath === "/staff" && sessionLoaded && !canAccessSport) {
    return <Navigate to={basePath} replace />;
  }

  return (
    <AdminShell sidebar={false}>
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
        {elevateStep === "password" ? (
          <>
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
          </>
        ) : (
          <>
            <p className="mb-4 text-sm" style={{ color: "var(--adm-muted)" }}>A verification code was sent to {elevateMaskedEmail}. Enter it below.</p>
            <AdminInput
              type="text"
              value={elevateCode}
              onChange={(e) => setElevateCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleElevate()}
              placeholder="6-digit code"
              autoFocus
              className="mb-3"
            />
          </>
        )}
        {elevateError && <p className="mb-3 text-xs" style={{ color: "var(--adm-danger)" }}>{elevateError}</p>}
        <div className="flex gap-2">
          <AdminBtn variant="danger" className="flex-1" onClick={handleElevate} disabled={elevating || (elevateStep === "password" ? !elevatePassword : !elevateCode)}>
            {elevating ? "Verifying..." : elevateStep === "password" ? "Enable Danger Mode" : "Confirm Code"}
          </AdminBtn>
          <AdminBtn variant="secondary" onClick={() => { setElevateModal(false); elevateResolveRef.current?.(false); }}>Cancel</AdminBtn>
        </div>
      </AdminModal>

      <AdminHeader
        title={`${decodedSport} Prefab Presets`}
        backLabel="Prefab Presets"
        backTo={`${adminPath(basePath, "/app")}`}
        actions={
          <div className="flex items-center gap-2">
            {dangerMinsDisplay && (
              <span className="animate-pulse rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>
                ⚠ Danger · {dangerMinsDisplay}
              </span>
            )}
            <AdminBtn variant="primary" size="sm" onClick={() => navigate(`${editPathBase}/new/edit`)}>
              <FiPlus className="mr-1 inline" /> New Prefab Preset
            </AdminBtn>
          </div>
        }
      />

      <AdminPage>
        <p className="mb-6 text-xs" style={{ color: "var(--adm-muted)" }}>
          These prefab presets appear in the Slate Prefabs panel for {decodedSport} users. Drag cards to reorder.
        </p>

        {error && (
          <div className="mb-6 rounded-[var(--adm-radius-sm)] px-4 py-3 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24"><AdminSpinner size={32} /></div>
        ) : presets.length === 0 ? (
          <AdminEmptyState
            title={`No prefab presets for ${decodedSport}`}
            subtitle="Create one to give users a reusable player layout in the Slate Prefabs panel"
            action={
              <AdminBtn variant="primary" onClick={() => navigate(`${editPathBase}/new/edit`)}>
                <FiPlus className="mr-1 inline" /> Create First Prefab Preset
              </AdminBtn>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {presets.map((preset) => {
              const isDragging = draggedId === preset.id;
              const isOver = dragOverId === preset.id && !isDragging;
              const playerCount = preset.prefabData?.players?.length ?? 0;
              const hasBall = Boolean(preset.prefabData?.ball);
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
                      playData={prefabToPreviewPlayData(preset.prefabData, decodedSport)}
                      autoplay="off"
                      shape="landscape"
                      cameraMode="fit-distribution"
                      background="field"
                      paddingPx={20}
                      minSpanPx={100}
                      className="h-full w-full"
                    />
                  </div>

                  <div className="flex min-w-0 items-center gap-1.5">
                    {renamingId === preset.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        autoFocus
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleCommitRename(preset)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleCommitRename(preset); }
                          else if (e.key === "Escape") { e.preventDefault(); handleCancelRename(); }
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        className="min-w-0 flex-1 rounded px-1.5 py-0.5 text-sm font-semibold"
                        style={{
                          backgroundColor: "var(--adm-surface)",
                          border: "1px solid var(--adm-accent)",
                          color: "var(--adm-text)",
                          outline: "none",
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleStartRename(preset); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="Click to rename"
                        className="min-w-0 flex-1 truncate text-left text-sm font-semibold transition hover:opacity-70"
                        style={{ color: "var(--adm-text)" }}
                      >
                        {preset.name}
                      </button>
                    )}
                    {preset.isHidden ? (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ backgroundColor: "var(--adm-surface3)", color: "var(--adm-muted)" }}>Hidden</span>
                    ) : (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ backgroundColor: "var(--adm-badge-green-bg)", color: "var(--adm-success)" }}>Published</span>
                    )}
                  </div>

                  <p className="text-[10px]" style={{ color: "var(--adm-muted)" }}>
                    {playerCount} player{playerCount !== 1 ? "s" : ""}{hasBall ? " + ball" : ""}
                  </p>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => navigate(`${editPathBase}/${preset.id}/edit`)}
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
                    {isOwner && (
                      <button
                        onClick={() => handleDelete(preset)}
                        disabled={deletingId === preset.id}
                        className="flex items-center justify-center rounded px-2 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ border: "1px solid var(--adm-border)", color: "var(--adm-danger)" }}
                        title="Delete"
                      >
                        {deletingId === preset.id ? <AdminSpinner size={12} /> : <FiTrash2 className="text-[10px]" />}
                      </button>
                    )}
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
