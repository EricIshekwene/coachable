import { useState, useCallback, useEffect, useRef } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import Slate from "../features/slate/Slate";
import MessagePopup from "../components/MessagePopup/MessagePopup";
import { useMessagePopup } from "../components/messaging/useMessagePopup";
import { useAdmin } from "../admin/AdminContext";
import { adminFetchOptions, readAdminSession } from "../admin/adminTransport";
import useThemeColor from "../utils/useThemeColor";
import { prefabToInitialPlayData } from "../utils/sportPrefabPresets";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const SESSION_KEY = "coachable_admin_session";
/** Debounce window for autosave — long enough to coalesce drag bursts. */
const AUTOSAVE_DELAY_MS = 700;

/**
 * Fetch a single prefab preset by ID.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @param {string} id - Preset UUID
 * @returns {Promise<Object|null>} Preset object or null if not found
 */
async function adminFetchPrefabPreset(session, sport, id) {
  const res = await fetch(
    `${API_URL}/admin/sport-prefab-presets/${encodeURIComponent(sport)}/${id}`,
    adminFetchOptions()
  );
  if (!res.ok) return null;
  return (await res.json()).preset ?? null;
}

/**
 * Create a new prefab preset for a sport.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @param {string} name - Preset display name
 * @param {Object} prefabData - Relative-offset prefab payload
 * @returns {Promise<Object>} Created preset object
 */
async function adminCreatePrefabPreset(session, sport, name, prefabData) {
  const res = await fetch(
    `${API_URL}/admin/sport-prefab-presets/${encodeURIComponent(sport)}`,
    adminFetchOptions({
      method: "POST",
      body: JSON.stringify({ name, prefabData }),
    })
  );
  if (!res.ok) throw new Error("Failed to create prefab preset");
  return (await res.json()).preset;
}

/**
 * Update an existing prefab preset.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @param {string} id - Preset UUID
 * @param {string} name - Preset display name
 * @param {Object} prefabData - Relative-offset prefab payload
 * @returns {Promise<Object>} Updated preset object
 */
async function adminUpdatePrefabPreset(session, sport, id, name, prefabData) {
  const res = await fetch(
    `${API_URL}/admin/sport-prefab-presets/${encodeURIComponent(sport)}/${id}`,
    adminFetchOptions({
      method: "PATCH",
      body: JSON.stringify({ name, prefabData }),
    })
  );
  if (!res.ok) throw new Error("Failed to save prefab preset");
  return (await res.json()).preset;
}

/**
 * Strip Slate's framing fields (id/label/mode/createdAt) down to the
 * persisted shape — players, the full `objects` array (every ball and cone
 * captured from the field, each tagged with its `objectType`), and optional
 * `settings` (player baseSizePx + sizePercent). Server tracks name + id +
 * timestamps separately.
 */
function toPersistedPrefabData(payload) {
  if (!payload) return null;
  return {
    players: payload.players ?? [],
    objects: Array.isArray(payload.objects) ? payload.objects : [],
    ...(payload._settings ? { settings: payload._settings } : {}),
  };
}

/**
 * Admin prefab-preset editor. Autosaves whatever is on the field as the
 * prefab payload — no Save button, no selection step. Every player or ball
 * the admin places, moves, or deletes flows into a debounced PATCH (or POST
 * on first save). Existing presets are reconstructed back onto the canvas
 * so the admin can return and edit them.
 *
 * URL: /admin/prefab-presets/:sport/new/edit  (create)
 * URL: /admin/prefab-presets/:sport/:prefabPresetId/edit  (edit existing)
 */
export default function AdminPrefabPresetEditPage() {
  const { sport, prefabPresetId } = useParams();
  const navigate = useNavigate();
  const { theme, basePath, hasPerm, hasSportScope, isOwner, sessionLoaded } = useAdmin();
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  const [ready, setReady] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState(() => prefabPresetId !== "new");
  const [existingPreset, setExistingPreset] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [persistedId, setPersistedId] = useState(prefabPresetId === "new" ? null : prefabPresetId);
  // "idle" before any save attempt; "saving" mid-flight; "saved" after success;
  // "error" if the last write failed. Visible to the admin as a small pill.
  const [saveStatus, setSaveStatus] = useState("idle");

  // The last payload+name dispatched by Slate's autosave callback. Refs so
  // the debounced timer can read fresh values without re-creating itself.
  const pendingPayloadRef = useRef(null);
  const pendingNameRef = useRef("");
  const debounceTimerRef = useRef(null);
  // JSON of the last successfully persisted prefabData (or initial load).
  // Skips redundant PATCHes when the autosave callback re-fires with an
  // unchanged payload — e.g. on initial mount in edit mode.
  const lastSavedJsonRef = useRef(null);
  // Snapshot of persistedId for the async flush so the closure stays correct
  // across renames between POST and PATCH.
  const persistedIdRef = useRef(persistedId);
  useEffect(() => { persistedIdRef.current = persistedId; }, [persistedId]);

  useThemeColor(theme === "light" ? "#ffffff" : "#121212");

  const session = readAdminSession();
  const decodedSport = decodeURIComponent(sport);
  const isNew = prefabPresetId === "new";
  const canAccessEditor = isOwner || (
    hasPerm("prefabs.manage") &&
    hasSportScope("presets.sportScope", decodedSport)
  );

  // Load existing preset on mount (skip for new)
  useEffect(() => {
    if (isNew || (!session && basePath === "/admin")) return;
    setLoadingPreset(true);
    adminFetchPrefabPreset(session, decodedSport, prefabPresetId)
      .then((preset) => {
        if (preset) {
          setExistingPreset(preset);
          // Seed the baseline so the first autosave call (with the same loaded
          // data) is a no-op and we don't write a redundant PATCH on mount.
          // Must mirror toPersistedPrefabData exactly, including settings.
          // Legacy presets may have `ball` instead of `objects`; normalize
          // those to the new shape on read so the baseline JSON matches what
          // a fresh extractFieldPrefabPayload run will produce.
          const loadedObjects = Array.isArray(preset.prefabData?.objects)
            ? preset.prefabData.objects
            : preset.prefabData?.ball
              ? [{ ...preset.prefabData.ball, objectType: "ball" }]
              : [];
          // Baseline includes the name so renames trigger a PATCH even when
          // no entities changed. Without this, typing a new name in Slate
          // would never persist — the prefabData JSON stays identical.
          lastSavedJsonRef.current = JSON.stringify({
            name: (preset.name || "").trim() || "Prefab",
            players: preset.prefabData?.players ?? [],
            objects: loadedObjects,
            ...(preset.prefabData?.settings ? { settings: preset.prefabData.settings } : {}),
          });
          setSaveStatus("saved");
        } else {
          setLoadFailed(true);
        }
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoadingPreset(false));
  }, [isNew, decodedSport, prefabPresetId, session, basePath]);

  if (basePath === "/staff" && sessionLoaded && !canAccessEditor) {
    return <Navigate to={basePath} replace />;
  }

  /**
   * Flush whatever is pending to the server. Skips when:
   *   - the payload is null (field is empty — nothing to save)
   *   - the prefabData JSON is identical to the last successful save
   *   - we're loading or the load failed
   */
  const flushSave = useCallback(async () => {
    if (!session && basePath === "/admin") return;
    if (!isNew && loadFailed) return;
    const payload = pendingPayloadRef.current;
    const prefabData = toPersistedPrefabData(payload);
    if (!prefabData) return; // empty field — nothing to write
    const name = (pendingNameRef.current || "").trim() || "Prefab";
    // Dedup key includes the NAME so renames inside Slate flow through to a
    // PATCH even when entities are unchanged. Without the name in the key,
    // typing a new title in Slate's right-panel name editor would silently
    // do nothing (same prefabData JSON → no write).
    const json = JSON.stringify({ name, ...prefabData });
    if (json === lastSavedJsonRef.current) return;
    setSaveStatus("saving");
    try {
      if (!persistedIdRef.current) {
        const created = await adminCreatePrefabPreset(session, decodedSport, name, prefabData);
        setPersistedId(created.id);
        persistedIdRef.current = created.id;
      } else {
        await adminUpdatePrefabPreset(session, decodedSport, persistedIdRef.current, name, prefabData);
      }
      lastSavedJsonRef.current = json;
      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("error");
      showMessage("Autosave failed", err.message || "Will retry on next change.", "error");
    }
  }, [session, isNew, loadFailed, decodedSport, showMessage, basePath]);

  /**
   * Called by Slate every time the field state changes. We capture the
   * payload + name in refs and (re)start the debounce timer; the actual
   * write happens in flushSave when the timer fires.
   */
  const handlePrefabPresetChange = useCallback((payload, name) => {
    pendingPayloadRef.current = payload;
    pendingNameRef.current = name;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      flushSave();
    }, AUTOSAVE_DELAY_MS);
  }, [flushSave]);

  // Flush any pending save on page unload / tab hide so the last edit isn't lost.
  useEffect(() => {
    const flush = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      flushSave();
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [flushSave]);

  /** Flush any pending save before navigating away. */
  const handleNavigateHome = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await flushSave();
    const listPath = `${basePath || "/admin"}/prefab-presets/${encodeURIComponent(decodedSport)}`;
    navigate(listPath);
  }, [navigate, decodedSport, basePath, flushSave]);

  if (loadingPreset) {
    return (
      <div
        data-admin-theme={theme}
        className="flex h-screen w-full items-center justify-center"
        style={{ backgroundColor: "var(--adm-bg)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-[3px]"
            style={{ borderColor: "var(--adm-border2)", borderTopColor: "var(--adm-accent)" }}
          />
          <p className="text-sm font-DmSans" style={{ color: "var(--adm-text2)" }}>Loading editor...</p>
        </div>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div
        data-admin-theme={theme}
        className="flex h-screen w-full flex-col items-center justify-center gap-4"
        style={{ backgroundColor: "var(--adm-bg)" }}
      >
        <p className="text-sm font-DmSans" style={{ color: "var(--adm-danger)" }}>Could not load prefab preset — it may have been deleted or the ID is invalid.</p>
        <button
          onClick={handleNavigateHome}
          className="rounded-lg border px-4 py-2 text-xs font-semibold transition hover:opacity-85"
          style={{
            borderColor: "var(--adm-border2)",
            backgroundColor: "var(--adm-surface)",
            color: "var(--adm-text2)",
          }}
        >
          ← Back to {decodedSport} prefab presets
        </button>
      </div>
    );
  }

  // New: empty canvas. Edit: reconstruct from saved prefabData so admin can tweak.
  const initialPlayData = !isNew && existingPreset
    ? prefabToInitialPlayData(existingPreset.prefabData, decodedSport)
    : null;
  const initialPlayName = existingPreset?.name ?? "Prefab";
  const effectivePlayId = persistedId
    ? `prefab-preset-${persistedId}`
    : `prefab-preset-${decodedSport}-new`;

  // ── Status pill content ──────────────────────────────────────────────────
  const statusLabel = {
    idle: isNew ? "Drop players to start" : "Editing",
    saving: "Saving…",
    saved: persistedId ? "Saved" : "Saved",
    error: "Save failed",
  }[saveStatus];
  const statusColor = saveStatus === "error" ? "var(--adm-danger)" : "var(--adm-muted)";

  return (
    <div
      data-admin-theme={theme}
      className="relative flex h-full w-full flex-row justify-between overflow-hidden"
      style={{ height: "100dvh", backgroundColor: "var(--adm-bg)" }}
    >
      {/* Loading overlay */}
      <div
        className="absolute inset-0 z-100 flex items-center justify-center transition-opacity duration-500"
        style={{ opacity: ready ? 0 : 1, pointerEvents: ready ? "none" : "auto", backgroundColor: "var(--adm-bg)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-[3px]"
            style={{ borderColor: "var(--adm-border2)", borderTopColor: "var(--adm-accent)" }}
          />
          <p className="text-sm font-DmSans" style={{ color: "var(--adm-text2)" }}>Loading editor...</p>
        </div>
      </div>

      <MessagePopup
        message={messagePopup.message}
        subtitle={messagePopup.subtitle}
        visible={messagePopup.visible}
        type={messagePopup.type}
        autoHideDuration={messagePopup.autoHideDuration}
        onClose={hideMessage}
      />

      {/* Floating autosave status pill */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-200 flex items-center gap-2 rounded-full px-4 py-1.5 shadow-lg"
        style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)" }}
      >
        <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--adm-muted)" }}>
          {isNew && !persistedId ? "New Prefab Preset" : "Prefab Preset"}
        </span>
        <span className="text-[11px]" style={{ color: "var(--adm-muted)" }}>·</span>
        <span className="text-[11px]" style={{ color: statusColor }}>
          {statusLabel}
        </span>
      </div>

      <Slate
        playId={effectivePlayId}
        onShowMessage={showMessage}
        initialPlayName={initialPlayName}
        initialPlayData={initialPlayData}
        onPrefabPresetChange={handlePrefabPresetChange}
        testVariant
        onNavigateHome={handleNavigateHome}
        onReady={() => setReady(true)}
        adminMode
        sport={decodedSport.toLowerCase()}
      />
    </div>
  );
}
