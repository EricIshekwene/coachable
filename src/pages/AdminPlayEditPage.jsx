import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Slate from "../features/slate/Slate";
import MessagePopup from "../components/MessagePopup/MessagePopup";
import { useMessagePopup } from "../components/messaging/useMessagePopup";
import useThemeColor from "../utils/useThemeColor";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const SESSION_KEY = "coachable_admin_session";
const LS_PREFIX = "coachable_play_";

/**
 * Fetches a platform play from the admin API.
 * @param {string} session - Admin session token
 * @param {string} id - Platform play ID
 * @returns {Promise<Object>} Play object
 */
async function adminFetchPlay(session, id) {
  const res = await fetch(`${API_URL}/admin/plays/${id}`, {
    headers: { "x-admin-session": session },
  });
  if (!res.ok) throw new Error("Failed to load play");
  const data = await res.json();
  return data.play;
}

/**
 * Creates a new platform play via the admin API.
 * @param {string} session - Admin session token
 * @param {Object} payload - Play fields (title, playData, thumbnail)
 * @returns {Promise<Object>} Created play object
 */
async function adminCreatePlay(session, payload) {
  const res = await fetch(`${API_URL}/admin/plays`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-session": session,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create play");
  const data = await res.json();
  return data.play;
}

/**
 * Updates an existing platform play via the admin API.
 * @param {string} session - Admin session token
 * @param {string} id - Platform play ID
 * @param {Object} payload - Fields to update
 * @returns {Promise<Object>} Updated play object
 */
async function adminUpdatePlay(session, id, payload) {
  const res = await fetch(`${API_URL}/admin/plays/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-admin-session": session,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save play");
  const data = await res.json();
  return data.play;
}

/**
 * Reads cached play data from localStorage for crash recovery.
 * @param {string} playId - The play ID
 * @returns {{ playData: Object, playName: string } | null}
 */
function recoverFromLocalStorage(playId) {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${playId}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.playData || !cached?.savedAt) return null;
    return cached;
  } catch {
    return null;
  }
}

/**
 * Clears the localStorage cache for a given play ID.
 * @param {string} playId
 */
function clearLocalStorageCache(playId) {
  try {
    localStorage.removeItem(`${LS_PREFIX}${playId}`);
  } catch { /* ignore */ }
}

/**
 * Admin play editor page — wraps the Slate editor with platform-play save/load.
 * Accessible at /admin/plays/:playId/edit where playId is a UUID or "new".
 * Uses localStorage-first autosave and flushes to DB on unload/visibility change.
 */
export default function AdminPlayEditPage() {
  const { playId } = useParams();
  const navigate = useNavigate();
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  const [ready, setReady] = useState(false);
  const [loadingPlay, setLoadingPlay] = useState(true);
  const [existingPlay, setExistingPlay] = useState(null);
  const [recoveredData, setRecoveredData] = useState(undefined);
  // Track the persisted play ID (may differ from URL param when "new" → created)
  const persistedIdRef = useRef(playId === "new" ? null : playId);
  const flushRef = useRef(null);
  const isNew = playId === "new";

  useThemeColor("#121212");

  const session = localStorage.getItem(SESSION_KEY);

  // Load play data if editing an existing play
  useEffect(() => {
    if (isNew) {
      setLoadingPlay(false);
      return;
    }
    if (!session) { setLoadingPlay(false); return; }
    setLoadingPlay(true);
    adminFetchPlay(session, playId)
      .then((p) => {
        setExistingPlay(p);
        const recovered = recoverFromLocalStorage(playId);
        if (recovered && recovered.savedAt > new Date(p.updated_at || 0).getTime()) {
          setRecoveredData(recovered);
        }
      })
      .catch(() => {
        setExistingPlay(null);
        setRecoveredData(recoverFromLocalStorage(playId));
      })
      .finally(() => setLoadingPlay(false));
  }, [playId, isNew, session]);

  /**
   * Called by Slate's flushToDatabase to persist play data to the server.
   * Creates the play on first flush, then patches on subsequent flushes.
   */
  const handlePlayDataChange = useCallback(
    async (playData, playName) => {
      if (!session) return;
      try {
        const title = playName?.trim() || "Untitled";
        if (!persistedIdRef.current) {
          // First save — create the play
          const created = await adminCreatePlay(session, { title, playData });
          persistedIdRef.current = created.id;
        } else {
          // Subsequent saves — update
          await adminUpdatePlay(session, persistedIdRef.current, { title, playData });
        }
        if (persistedIdRef.current) clearLocalStorageCache(persistedIdRef.current);
      } catch {
        showMessage("Failed to save play", "", "error");
      }
    },
    [session, showMessage]
  );

  /** Handle thumbnail saves separately (called by Slate export/screenshot). */
  const handleThumbnailSave = useCallback(
    async (thumbnail) => {
      if (!session || !persistedIdRef.current) return;
      try {
        await adminUpdatePlay(session, persistedIdRef.current, { thumbnail });
      } catch {
        // Non-critical — silently ignore thumbnail save failures
      }
    },
    [session]
  );

  // Flush to DB on page unload and visibility change
  useEffect(() => {
    const flush = () => flushRef.current?.();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleNavigateHome = useCallback(() => {
    flushRef.current?.();
    navigate("/admin/app");
  }, [navigate]);

  if (loadingPlay) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-BrandBlack">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-[3px] border-BrandOrange/30 border-t-BrandOrange animate-spin" />
          <p className="text-sm font-DmSans text-BrandGray">Loading editor...</p>
        </div>
      </div>
    );
  }

  const effectivePlayId = persistedIdRef.current || "new";
  const initialPlayData = recoveredData?.playData ?? existingPlay?.playData ?? null;
  const initialPlayName = recoveredData?.playName ?? existingPlay?.title;

  return (
    <div
      className="w-full bg-BrandBlack flex flex-row justify-between relative overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* Loading overlay */}
      <div
        className="absolute inset-0 z-100 flex items-center justify-center bg-BrandBlack transition-opacity duration-500"
        style={{ opacity: ready ? 0 : 1, pointerEvents: ready ? "none" : "auto" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-[3px] border-BrandOrange/30 border-t-BrandOrange animate-spin" />
          <p className="text-sm font-DmSans text-BrandGray">Loading editor...</p>
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
        onThumbnailSave={handleThumbnailSave}
        onNavigateHome={handleNavigateHome}
        onReady={() => setReady(true)}
        adminMode
      />
    </div>
  );
}
