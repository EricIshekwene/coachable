import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Slate from "../features/slate/Slate";
import { fetchSharedPlay } from "../utils/apiPlays";
import useThemeColor from "../utils/useThemeColor";

export default function SharedPlayView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [play, setPlay] = useState(location.state?.play || null);
  const [loading, setLoading] = useState(!location.state?.play);

  useEffect(() => {
    if (play) return; // play passed via router state (e.g. from shared folder)
    if (!token) { setLoading(false); return; }
    setLoading(true);
    fetchSharedPlay(token)
      .then((p) => setPlay(p))
      .catch(() => setPlay(null))
      .finally(() => setLoading(false));
  }, [token]);

  const fieldColor = play?.playData?.pitch?.pitchColor || "#4FA85D";
  useThemeColor(fieldColor);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#121212]">
        <div className="h-10 w-10 rounded-full border-[3px] border-[#FF7A18]/30 border-t-[#FF7A18] animate-spin" />
      </div>
    );
  }

  if (!play) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#121212] text-white">
        <h1 className="font-Manrope text-xl font-bold tracking-tight">Play not found</h1>
        <p className="mt-2 text-sm text-[#9AA0A6]">This share link may have expired or been revoked.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 rounded-lg bg-[#FF7A18] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#121212] flex flex-row justify-between relative overflow-hidden" style={{ height: "100dvh" }}>
      <div
        className="absolute inset-0 z-[100] flex items-center justify-center bg-[#121212] transition-opacity duration-500"
        style={{ opacity: ready ? 0 : 1, pointerEvents: ready ? "none" : "auto" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-[3px] border-[#FF7A18]/30 border-t-[#FF7A18] animate-spin" />
          <p className="text-sm font-DmSans text-[#9AA0A6]">Loading play...</p>
        </div>
      </div>

      <Slate
        viewOnly
        initialPlayName={play.title}
        initialPlayData={play.playData || null}
        onNavigateHome={() => navigate(location.state?.backTo || `/shared/${token}`)}
        onReady={() => setReady(true)}
      />
    </div>
  );
}
