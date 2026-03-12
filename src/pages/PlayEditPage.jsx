import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMessagePopup } from "../components/messaging/useMessagePopup";
import MessagePopup from "../components/MessagePopup/MessagePopup";
import Slate from "../features/slate/Slate";
import MobileViewOnlyGate from "../components/MobileViewOnlyGate";
import { loadAppPlays, updateAppPlay } from "../utils/appPlaysStorage";
import {
  log as logPersistence,
  summarizePlayData,
} from "../utils/playPersistenceDebugLogger";

export default function PlayEditPage() {
  const { playId } = useParams();
  const navigate = useNavigate();
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  const [ready, setReady] = useState(false);

  const existingPlay = useMemo(() => {
    const plays = loadAppPlays();
    const play = plays.find((p) => p.id === playId) || null;
    logPersistence("PlayEditPage existingPlay resolved", {
      playId,
      found: Boolean(play),
      title: play?.title || null,
      summary: summarizePlayData(play?.playData),
    });
    return play;
  }, [playId]);

  const handlePlayDataChange = useCallback(
    (playData, playName, options = {}) => {
      const source = options?.source || "unspecified";
      const plays = loadAppPlays();
      const play = plays.find((p) => p.id === playId);
      if (!play) {
        logPersistence("PlayEditPage onPlayDataChange skipped missingPlay", {
          playId,
          source,
          title: playName || null,
          summary: summarizePlayData(playData),
        });
        return;
      }
      logPersistence("PlayEditPage onPlayDataChange start", {
        playId,
        source,
        nextTitle: playName || "Untitled",
        summary: summarizePlayData(playData),
      });
      updateAppPlay(playId, {
        playData,
        title: playName || "Untitled",
        updatedAt: new Date().toISOString(),
      });
      logPersistence("PlayEditPage onPlayDataChange complete", {
        playId,
        source,
      });
    },
    [playId]
  );

  const handleNavigateHome = useCallback(() => {
    navigate("/app/plays");
  }, [navigate]);

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
