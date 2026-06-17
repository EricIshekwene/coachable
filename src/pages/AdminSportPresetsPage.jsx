import { useState, useEffect, useCallback, useRef } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { FiEdit2, FiPlus, FiTrash2, FiEye, FiEyeOff, FiCopy, FiDownload, FiUpload } from "react-icons/fi";
import PlayPreviewCard from "../components/PlayPreviewCard";
import ConfirmModal from "../components/subcomponents/ConfirmModal";
import { useAdmin } from "../admin/AdminContext";
import { adminPath } from "../admin/adminNav";
import { adminFetchOptions, readAdminSession } from "../admin/adminTransport";
import { AdminShell, AdminHeader, AdminPage, AdminBtn, AdminEmptyState, AdminSpinner } from "../admin/components";
import DangerModeModal from "../admin/components/DangerModeModal";
import { useDangerMode } from "../admin/hooks/useDangerMode";
import {
  buildSportPresetBundle,
  parseSportPresetBundle,
  supportsSportPresetBundles,
} from "../utils/sportPresetBundles";

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
    adminFetchOptions()
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
    adminFetchOptions({ method: "DELETE" })
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
    adminFetchOptions({
      method: "POST",
      body: JSON.stringify({ ids }),
    })
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
    adminFetchOptions({
      method: "PATCH",
      body: JSON.stringify({ isHidden }),
    })
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
    adminFetchOptions({
      method: "POST",
      body: JSON.stringify({ name: `Copy of ${name}`, playData }),
    })
  );
  if (!res.ok) throw new Error("Failed to duplicate preset");
  return (await res.json()).preset;
}

async function createPreset(session, sport, name, playData) {
  const res = await fetch(
    `${API_URL}/admin/sport-presets/${encodeURIComponent(sport)}`,
    adminFetchOptions({
      method: "POST",
      body: JSON.stringify({ name, playData }),
    })
  );
  if (!res.ok) throw new Error("Failed to create preset");
  return (await res.json()).preset;
}

/**
 * Per-sport preset list page. Shows all presets for a sport with edit/delete/create actions.
 * Supports drag-and-drop reordering. Accessible at /admin/presets/:sport.
 */
export default function AdminSportPresetsPage() {
  const { basePath, hasPerm, hasSportScope, isOwner, sessionLoaded } = useAdmin();
  const { sport } = useParams();
  const navigate = useNavigate();
  const decodedSport = decodeURIComponent(sport);
  const session = readAdminSession() || "";
  const canAccessSport = isOwner || (
    hasSportScope("presets.sportScope", decodedSport) &&
    (hasPerm("presets.create") || hasPerm("presets.edit"))
  );
  const canCreatePresets = isOwner || hasPerm("presets.create");
  const canEditPresets = isOwner || hasPerm("presets.edit");
  const canUsePresetBundles = supportsSportPresetBundles(decodedSport);

  const { dangerMode, setPassword: setDangerPassword, setCode: setDangerCode, ensureElevated, handleSubmit: handleDangerSubmit, handleCancel: handleDangerCancel } = useDangerMode();

  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmModal, setConfirmModal] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const importInputRef = useRef(null);

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
  }, [session, decodedSport, navigate, basePath]);

  useEffect(() => { load(); }, [load]);

  const handleDownloadBundle = useCallback(() => {
    try {
      const bundle = buildSportPresetBundle(decodedSport, presets);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeSport = decodedSport.trim().toLowerCase().replace(/\s+/g, "-");
      link.href = url;
      link.download = `${safeSport}-presets-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setError("");
      setNotice(`Downloaded ${presets.length} preset${presets.length === 1 ? "" : "s"} as JSON.`);
    } catch {
      setNotice("");
      setError("Failed to download preset JSON.");
    }
  }, [decodedSport, presets]);

  const handleImportFileChange = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setNotice("");

    let importedCount = 0;
    try {
      const text = await file.text();
      const bundle = parseSportPresetBundle(text, decodedSport);

      for (const preset of bundle.presets) {
        const created = await createPreset(session, decodedSport, preset.name, preset.playData);
        if (preset.isHidden === false) {
          await togglePresetVisibility(session, decodedSport, created.id, false);
        }
        importedCount += 1;
      }

      await load();
      setNotice(`Imported ${importedCount} preset${importedCount === 1 ? "" : "s"} from ${file.name}.`);
    } catch (err) {
      await load();
      if (importedCount > 0) {
        setNotice(`Imported ${importedCount} preset${importedCount === 1 ? "" : "s"} before the import stopped.`);
      }
      setError(err?.message || "Failed to import presets.");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }, [decodedSport, load, session]);

  /** Open confirmation modal and return promise resolving to boolean. */
  const openConfirm = (title, message) =>
    new Promise((resolve) => {
      setConfirmModal({ title, message, resolve });
    });

  const handleDelete = async (preset) => {
    if (!isOwner) return;
    if (deletingId) return;
    const confirmed = await openConfirm(
      "Delete Preset",
      `Delete "${preset.name}"? This cannot be undone.`
    );
    if (!confirmed) return;
    const elevated = await ensureElevated();
    if (!elevated) return;
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
    if (!canEditPresets) return;
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
    if (!canCreatePresets) return;
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

  // Drag-and-drop handlers

  const handleDragStart = (e, id) => {
    if (!canEditPresets) return;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, id) => {
    if (!canEditPresets) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragOverId) setDragOverId(id);
  };

  const handleDrop = async (e, targetId) => {
    if (!canEditPresets) return;
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

  // End drag-and-drop handlers


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
      <DangerModeModal
        dangerMode={dangerMode}
        setPassword={setDangerPassword}
        setCode={setDangerCode}
        onSubmit={handleDangerSubmit}
        onCancel={handleDangerCancel}
      />



      <AdminHeader
        title={`${decodedSport} Presets`}
        backLabel="Sport Presets"
        backTo={adminPath(basePath, "/app")}
        actions={
          <div className="flex items-center gap-2">
            {canUsePresetBundles && (
              <>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleImportFileChange}
                />
                <AdminBtn
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadBundle}
                  disabled={loading || importing}
                  title={`Download all ${decodedSport} presets as JSON`}
                >
                  <FiDownload className="text-[11px]" /> Download Play Data
                </AdminBtn>
                {canCreatePresets && (
                  <AdminBtn
                    variant="secondary"
                    size="sm"
                    onClick={() => importInputRef.current?.click()}
                    disabled={loading || importing}
                    title={`Import ${decodedSport} presets from JSON`}
                  >
                    {importing ? <AdminSpinner size={12} /> : <FiUpload className="text-[11px]" />}
                    {importing ? "Importing..." : "Import Presets"}
                  </AdminBtn>
                )}
              </>
            )}
            {canCreatePresets && (
              <AdminBtn variant="primary" size="sm" onClick={() => navigate(`${adminPath(basePath, "/presets")}/${encodeURIComponent(decodedSport)}/new/edit`)}>
                <FiPlus className="mr-1 inline" /> New Preset
              </AdminBtn>
            )}
          </div>
        }
      />

      <AdminPage>
        <p className="mb-6 text-xs" style={{ color: "var(--adm-muted)" }}>
          These presets appear as starting-canvas options for {decodedSport} users. Drag cards to reorder.
        </p>

        {canUsePresetBundles && (
          <div className="mb-6 rounded-[var(--adm-radius-sm)] px-4 py-3 text-sm" style={{ backgroundColor: "var(--adm-surface2)", color: "var(--adm-text2)", border: "1px solid var(--adm-border)" }}>
            Download exports every current preset on this page into one JSON bundle. Import accepts that same bundle or a plain array of preset entries with Slate `playData`.
          </div>
        )}

        {notice && (
          <div className="mb-6 rounded-[var(--adm-radius-sm)] px-4 py-3 text-sm" style={{ backgroundColor: "var(--adm-badge-green-bg)", color: "var(--adm-success)" }}>{notice}</div>
        )}

        {error && (
          <div className="mb-6 rounded-[var(--adm-radius-sm)] px-4 py-3 text-sm" style={{ backgroundColor: "var(--adm-danger-dim)", color: "var(--adm-danger)" }}>{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24"><AdminSpinner size={32} /></div>
        ) : presets.length === 0 ? (
          <AdminEmptyState
            title={`No presets for ${decodedSport}`}
            subtitle="Create the first preset to give users a starting canvas"
            action={canCreatePresets ? (
              <AdminBtn variant="primary" onClick={() => navigate(`${adminPath(basePath, "/presets")}/${encodeURIComponent(decodedSport)}/new/edit`)}>
                <FiPlus className="mr-1 inline" /> Create First Preset
              </AdminBtn>
            ) : undefined}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {presets.map((preset) => {
              const isDragging = draggedId === preset.id;
              const isOver = dragOverId === preset.id && !isDragging;
              return (
                <div
                  key={preset.id}
                  draggable={canEditPresets}
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
                    {canEditPresets && (
                      <button
                        onClick={() => navigate(`${adminPath(basePath, "/presets")}/${encodeURIComponent(decodedSport)}/${preset.id}/edit`)}
                        className="flex flex-1 items-center justify-center gap-1 rounded py-1.5 text-xs transition"
                        style={{ border: "1px solid var(--adm-border)", color: "var(--adm-muted)" }}
                      >
                        <FiEdit2 className="text-[10px]" /> Edit
                      </button>
                    )}
                    {canCreatePresets && (
                      <button
                        onClick={() => handleDuplicate(preset)}
                        disabled={duplicatingId === preset.id}
                        className="flex items-center justify-center rounded px-2 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ border: "1px solid var(--adm-border)", color: "var(--adm-muted)" }}
                        title="Duplicate"
                      >
                        {duplicatingId === preset.id ? <AdminSpinner size={12} /> : <FiCopy className="text-[10px]" />}
                      </button>
                    )}
                    {canEditPresets && (
                      <button
                        onClick={() => handleToggleVisibility(preset)}
                        disabled={togglingId === preset.id}
                        className="flex items-center justify-center rounded px-2 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ border: "1px solid var(--adm-border)", color: "var(--adm-muted)" }}
                        title={preset.isHidden ? "Publish" : "Hide"}
                      >
                        {togglingId === preset.id ? <AdminSpinner size={12} /> : preset.isHidden ? <FiEye className="text-[10px]" /> : <FiEyeOff className="text-[10px]" />}
                      </button>
                    )}
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
