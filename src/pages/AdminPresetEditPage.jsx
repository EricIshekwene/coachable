import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Slate from "../features/slate/Slate";
import MessagePopup from "../components/MessagePopup/MessagePopup";
import { useMessagePopup } from "../components/messaging/useMessagePopup";
import { useAdmin } from "../admin/AdminContext";
import useThemeColor from "../utils/useThemeColor";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const SESSION_KEY = "coachable_admin_session";
const LS_PREFIX = "coachable_preset_";

/**
 * Fetch a single sport preset by ID.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @param {string} id - Preset UUID
 * @returns {Promise<Object|null>} Preset object or null if not found
 */
async function adminFetchPreset(session, sport, id) {
  const res = await fetch(
    `${API_URL}/admin/sport-presets/${encodeURIComponent(sport)}/${id}`,
    { headers: { "x-admin-session": session } }
  );
  if (!res.ok) return null;
  return (await res.json()).preset ?? null;
}

/**
 * Create a new preset for a sport.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @param {string} name - Preset display name
 * @param {Object} playData - Full play data object
 * @returns {Promise<Object>} Created preset object
 */
async function adminCreatePreset(session, sport, name, playData) {
  const res = await fetch(
    `${API_URL}/admin/sport-presets/${encodeURIComponent(sport)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-session": session },
      body: JSON.stringify({ name, playData }),
    }
  );
  if (!res.ok) throw new Error("Failed to create preset");
  return (await res.json()).preset;
}

/**
 * Update an existing sport preset.
 * @param {string} session - Admin session token
 * @param {string} sport - Sport name
 * @param {string} id - Preset UUID
 * @param {string} name - Preset display name
 * @param {Object} playData - Full play data object
 * @returns {Promise<Object>} Updated preset object
 */
async function adminUpdatePreset(session, sport, id, name, playData) {
  const res = await fetch(
    `${API_URL}/admin/sport-presets/${encodeURIComponent(sport)}/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-session": session },
      body: JSON.stringify({ name, playData }),
    }
  );
  if (!res.ok) throw new Error("Failed to save preset");
  return (await res.json()).preset;
}

/**
 * Read cached preset data from localStorage for crash recovery.
 * @param {string} cacheKey - localStorage key suffix
 * @returns {{ playData: Object, playName: string, savedAt: number } | null}
 */
function recoverFromLocalStorage(cacheKey) {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.playData || !cached?.savedAt) return null;
    return cached;
  } catch {
    return null;
  }
}

/** Clear localStorage crash-recovery cache for a key. */
function clearLocalStorageCache(cacheKey) {
  try { localStorage.removeItem(`${LS_PREFIX}${cacheKey}`); } catch { /* ignore */ }
}

/**
 * Admin preset editor — wraps the Slate editor to create or update a named sport preset.
 * URL: /admin/presets/:sport/new/edit  (create)
 * URL: /admin/presets/:sport/:presetId/edit  (edit existing)
 */
export default function AdminPresetEditPage() {
  const { sport, presetId } = useParams();
  const navigate = useNavigate();
  const { theme } = useAdmin();
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  const [ready, setReady] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState(() => presetId !== "new" && !!sessionStorage.getItem(SESSION_KEY));
  const [existingPreset, setExistingPreset] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // Tracks the persisted UUID (null until first save for new presets)
  const [persistedId, setPersistedId] = useState(presetId === "new" ? null : presetId);
  const flushRef = useRef(null);

  useThemeColor(theme === "light" ? "#f3f6fb" : "#121212");

  const session = sessionStorage.getItem(SESSION_KEY);
  const decodedSport = decodeURIComponent(sport);
  const isNew = presetId === "new";
  const cacheKey = isNew ? `${decodedSport}-new` : `${decodedSport}-${presetId}`;

  // Load existing preset on mount (skip for new)
  useEffect(() => {
    if (isNew || !session) return;
    setLoadingPreset(true);
    adminFetchPreset(session, decodedSport, presetId)
      .then((preset) => {
        if (preset) {
          setExistingPreset(preset);
        } else {
          setLoadFailed(true);
        }
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoadingPreset(false));
  }, [isNew, decodedSport, presetId, session]);

  /**
   * Called by Slate on every auto-save tick.
   * Creates the preset on first save, then patches on subsequent saves.
   * Mirrors the AdminPlayEditPage create-then-patch pattern.
   * @param {Object} playData - Current play canvas state
   * @param {string} playName - Current play title (used as preset name)
   */
  const handlePlayDataChange = useCallback(
    async (playData, playName) => {
      if (!session) return;
      // Never overwrite an existing preset that failed to load — the editor
      // would be showing default data and would destroy the real preset.
      if (!isNew && loadFailed) return;
      const name = playName?.trim() || decodedSport;
      try {
        if (!persistedId) {
          // First save — create the preset
          const created = await adminCreatePreset(session, decodedSport, name, playData);
          const newId = created.id;
          // Migrate localStorage key from "new" to real UUID
          try {
            const draft = localStorage.getItem(`${LS_PREFIX}${decodedSport}-new`);
            if (draft) {
              localStorage.setItem(`${LS_PREFIX}${decodedSport}-${newId}`, draft);
              localStorage.removeItem(`${LS_PREFIX}${decodedSport}-new`);
            }
          } catch { /* ignore */ }
          setPersistedId(newId);
          clearLocalStorageCache(`${decodedSport}-${newId}`);
        } else {
          // Subsequent saves — update
          await adminUpdatePreset(session, decodedSport, persistedId, name, playData);
          clearLocalStorageCache(`${decodedSport}-${persistedId}`);
        }
      } catch {
        showMessage("Failed to save preset", "", "error");
      }
    },
    [session, decodedSport, persistedId, showMessage, isNew, loadFailed]
  );

  /** Flush and navigate back to the sport's preset list. */
  const handleNavigateHome = useCallback(async () => {
    await flushRef.current?.();
    navigate(`/admin/presets/${encodeURIComponent(decodedSport)}`);
  }, [navigate, decodedSport]);

  // Flush on page unload and tab hide
  useEffect(() => {
    const flush = () => flushRef.current?.();
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

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
        <p className="text-sm font-DmSans" style={{ color: "var(--adm-danger)" }}>Could not load preset — it may have been deleted or the ID is invalid.</p>
        <button
          onClick={() => navigate(`/admin/presets/${encodeURIComponent(decodedSport)}`)}
          className="rounded-lg border px-4 py-2 text-xs font-semibold transition hover:opacity-85"
          style={{
            borderColor: "var(--adm-border2)",
            backgroundColor: "var(--adm-surface)",
            color: "var(--adm-text2)",
          }}
        >
          ← Back to {decodedSport} presets
        </button>
      </div>
    );
  }

  const recovered = recoverFromLocalStorage(cacheKey);
  const initialPlayData = recovered?.playData ?? existingPreset?.playData ?? null;
  const initialPlayName = recovered?.playName ?? existingPreset?.name ?? "Untitled";
  const effectivePlayId = persistedId ? `preset-${persistedId}` : `preset-${decodedSport}-new`;

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

      <Slate
        playId={effectivePlayId}
        onShowMessage={showMessage}
        initialPlayName={initialPlayName}
        initialPlayData={initialPlayData}
        onPlayDataChange={handlePlayDataChange}
        flushRef={flushRef}
        testVariant
        onNavigateHome={handleNavigateHome}
        onReady={() => setReady(true)}
        adminMode
        sport={decodedSport.toLowerCase()}
      />
    </div>
  );
}
