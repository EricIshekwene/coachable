import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMessagePopup } from "../components/messaging/useMessagePopup";
import MessagePopup from "../components/MessagePopup/MessagePopup";
import Slate from "../features/slate/Slate";
import MobileViewOnlyGate from "../components/MobileViewOnlyGate";
import { useAuth } from "../context/AuthContext";
import { fetchPlay, updatePlay } from "../utils/apiPlays";
import useThemeColor from "../utils/useThemeColor";

const LS_PREFIX = "coachable_play_";

/**
 * Reads cached play data from localStorage for crash recovery.
 * Returns the cached payload if it's newer than the server version, otherwise null.
 * @param {string} playId - The play ID
 * @param {Object|null} serverPlay - The play fetched from the server
 * @returns {{ playData: Object, playName: string } | null}
 */
function recoverFromLocalStorage(playId, serverPlay) {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${playId}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.playData || !cached?.savedAt) return null;
    // If no server play exists, use local cache
    if (!serverPlay) return cached;
    // Compare timestamps — prefer local if newer than server updated_at
    const serverUpdated = serverPlay.updated_at ? new Date(serverPlay.updated_at).getTime() : 0;
    if (cached.savedAt > serverUpdated) return cached;
    return null;
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
 * Play editor page — loads play from server, passes localStorage-first autosave
 * to Slate, and flushes to DB on page unload / visibility change.
 */
export default function PlayEditPage() {
  const { playId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const teamId = user?.teamId;
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  const [ready, setReady] = useState(false);
  const [existingPlay, setExistingPlay] = useState(null);
  const [loadingPlay, setLoadingPlay] = useState(true);
  const [recoveredData, setRecoveredData] = useState(undefined); // undefined = not checked yet
  const flushRef = useRef(null);
  useThemeColor("#121212");

  // Load play from server, then check localStorage for recovery
  useEffect(() => {
    if (!teamId || !playId) { setLoadingPlay(false); return; }
    setLoadingPlay(true);
    fetchPlay(teamId, playId)
      .then((p) => {
        setExistingPlay(p);
        const recovered = recoverFromLocalStorage(playId, p);
        setRecoveredData(recovered);
      })
      .catch(() => {
        setExistingPlay(null);
        const recovered = recoverFromLocalStorage(playId, null);
        setRecoveredData(recovered);
      })
      .finally(() => setLoadingPlay(false));
  }, [teamId, playId]);

  /**
   * Called by Slate's flushToDatabase to persist play data to the server.
   * Only invoked on page unload / visibility change — not on every keystroke.
   */
  const handlePlayDataChange = useCallback(
    (playData, playName) => {
      if (!teamId || !playId) return;
      updatePlay(teamId, playId, {
        playData,
        title: playName || "Untitled",
      })
        .then(() => clearLocalStorageCache(playId))
        .catch(() => {});
    },
    [teamId, playId]
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
    // Flush to DB before navigating away
    flushRef.current?.();
    navigate("/app/plays");
  }, [navigate]);

  if (loadingPlay) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#121212]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-[3px] border-[#FF7A18]/30 border-t-[#FF7A18] animate-spin" />
          <p className="text-sm font-DmSans text-[#9AA0A6]">Loading editor...</p>
        </div>
      </div>
    );
  }

  // Determine initial data — prefer recovered localStorage data over server
  const initialPlayData = recoveredData?.playData ?? existingPlay?.playData ?? null;
  const initialPlayName = recoveredData?.playName ?? existingPlay?.title;

  return (
    <div className="w-full bg-[#121212] flex flex-row justify-between relative overflow-hidden" style={{ height: "100dvh" }}>
      {/* Loading overlay */}
      <div
        className="absolute inset-0 z-[100] flex items-center justify-center bg-[#121212] transition-opacity duration-500"
        style={{ opacity: ready ? 0 : 1, pointerEvents: ready ? "none" : "auto" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-[3px] border-[#FF7A18]/30 border-t-[#FF7A18] animate-spin" />
          <p className="text-sm font-DmSans text-[#9AA0A6]">Loading editor...</p>
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

      <MobileViewOnlyGate>
        <Slate
          playId={playId}
          onShowMessage={showMessage}
          initialPlayName={initialPlayName}
          initialPlayData={initialPlayData}
          onPlayDataChange={handlePlayDataChange}
          flushRef={flushRef}
          onNavigateHome={handleNavigateHome}
          onReady={() => setReady(true)}
        />
      </MobileViewOnlyGate>
    </div>
  );
}
