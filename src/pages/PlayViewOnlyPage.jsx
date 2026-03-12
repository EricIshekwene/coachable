import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Slate from "../features/slate/Slate";
import { loadAppPlays } from "../utils/appPlaysStorage";
import useThemeColor from "../utils/useThemeColor";

export default function PlayViewOnlyPage() {
  const { playId } = useParams();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  const existingPlay = useMemo(() => {
    const plays = loadAppPlays();
    return plays.find((p) => p.id === playId) || null;
  }, [playId]);

  const fieldColor = existingPlay?.playData?.pitch?.pitchColor || "#4FA85D";
  useThemeColor(fieldColor);

  if (!existingPlay) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8 md:px-10 md:py-12">
        <button
          onClick={() => navigate("/app/plays")}
          className="mb-8 flex items-center gap-2 text-sm text-BrandGray transition hover:text-BrandText"
        >
          Back to Playbook
        </button>
        <h1 className="font-Manrope text-xl font-bold tracking-tight">Play not found</h1>
        <p className="mt-2 text-sm text-BrandGray">The play you're looking for doesn't exist.</p>
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
        playId={playId}
        viewOnly
        initialPlayName={existingPlay?.title}
        initialPlayData={existingPlay?.playData || null}
        onNavigateHome={() => navigate("/app/plays")}
        onReady={() => setReady(true)}
      />
    </div>
  );
}
