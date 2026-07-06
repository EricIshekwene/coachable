import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiLoader } from "react-icons/fi";
import { adminApi } from "../admin/adminTransport";
import PlayPreviewCard from "../components/PlayPreviewCard";
import useThemeColor from "../utils/useThemeColor";
import coachablePlaysLogo from "../assets/logos/coachableplays-lockup-white.png";
import coachableLogo from "../assets/logos/White_Full_Coachable.png";

export default function AdminPlayAdView() {
  const { playId } = useParams();
  const navigate = useNavigate();
  const [play, setPlay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useThemeColor("#050505");

  useEffect(() => {
    if (!playId) return;
    let cancelled = false;
    adminApi(`/admin/plays/${playId}`)
      .then((data) => {
        if (!cancelled) setPlay(data.play || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load play");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playId]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black text-white">
        <FiLoader className="animate-spin text-3xl text-BrandOrange" />
      </div>
    );
  }

  if (error || !play) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-center text-white">
        <h1 className="font-Manrope text-xl font-bold">Play not found</h1>
        <p className="mt-2 max-w-xs text-sm text-white/60">{error || "This admin play could not be loaded."}</p>
        <button
          type="button"
          onClick={() => navigate("/admin/app")}
          className="mt-6 rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Back to Plays
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-black text-white">
      <section className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center gap-3 px-3 py-[calc(48px+env(safe-area-inset-top))] pb-[calc(48px+env(safe-area-inset-bottom))]">
        <header className="flex shrink-0 justify-center">
          <img
            src={coachablePlaysLogo}
            alt="Coachable Plays"
            className="h-auto w-[min(96vw,410px)] object-contain"
            draggable="false"
          />
        </header>

        <div className="min-h-0">
          <div className="w-full overflow-hidden rounded-xl border border-white/15 bg-[#101010] shadow-2xl shadow-black">
            <PlayPreviewCard
                playData={play.playData}
                autoplay="always"
                shape="wide"
                cameraMode="fit-distribution"
                background="field"
                paddingPx={10}
                minSpanPx={190}
              />
          </div>
        </div>

        <footer className="flex shrink-0 flex-col items-center gap-3">
          <img
            src={coachableLogo}
            alt="Coachable"
            className="h-auto w-[min(54vw,220px)] object-contain opacity-90"
            draggable="false"
          />
          <p className="font-DmSans text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
            Coachableplay.com
          </p>
        </footer>
      </section>
    </main>
  );
}
