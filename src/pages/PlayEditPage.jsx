import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMessagePopup } from "../components/messaging/useMessagePopup";
import MessagePopup from "../components/MessagePopup/MessagePopup";
import Slate from "../features/slate/Slate";
import MobileViewOnlyGate from "../components/MobileViewOnlyGate";
import { useAuth } from "../context/AuthContext";
import { fetchPlay, updatePlay } from "../utils/apiPlays";
import useThemeColor from "../utils/useThemeColor";

export default function PlayEditPage() {
  const { playId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const teamId = user?.teamId;
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  const [ready, setReady] = useState(false);
  const [existingPlay, setExistingPlay] = useState(null);
  const [loadingPlay, setLoadingPlay] = useState(true);
  useThemeColor("#121212");

  useEffect(() => {
    if (!teamId || !playId) { setLoadingPlay(false); return; }
    setLoadingPlay(true);
    fetchPlay(teamId, playId)
      .then((p) => setExistingPlay(p))
      .catch(() => setExistingPlay(null))
      .finally(() => setLoadingPlay(false));
  }, [teamId, playId]);

  const handlePlayDataChange = useCallback(
    (playData, playName) => {
      if (!teamId || !playId) return;
      updatePlay(teamId, playId, {
        playData,
        title: playName || "Untitled",
      }).catch(() => {});
    },
    [teamId, playId]
  );

  const handleNavigateHome = useCallback(() => {
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
          initialPlayName={existingPlay?.title}
          initialPlayData={existingPlay?.playData || null}
          onPlayDataChange={handlePlayDataChange}
          onNavigateHome={handleNavigateHome}
          onReady={() => setReady(true)}
        />
      </MobileViewOnlyGate>
    </div>
  );
}
