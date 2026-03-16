import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PlayPreviewCard from "../components/PlayPreviewCard";
import useThemeColor from "../utils/useThemeColor";
import { FiTag, FiLoader, FiExternalLink } from "react-icons/fi";
import darkLogo from "../assets/logos/White_Full_Coachable.png";
import lightLogo from "../assets/logos/full_Coachable_logo.png";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Public view page for a single platform play.
 * Accessible at /platform-play/:playId with no authentication required.
 * Used as the destination for shareable links generated in the admin plays section.
 * @returns {JSX.Element}
 */
export default function PlatformPlayView() {
  const { playId } = useParams();

  const [play, setPlay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default to light theme for public/landing visitors
  const [isLight] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (!saved) return true;
    if (saved === "system") return !window.matchMedia("(prefers-color-scheme: dark)").matches;
    return saved === "light";
  });

  const resolvedBg = isLight ? "#ffffff" : "#121212";
  const logo = isLight ? lightLogo : darkLogo;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isLight ? "light" : "dark");
    document.body.style.backgroundColor = resolvedBg;
    return () => { document.body.style.backgroundColor = ""; };
  }, [isLight, resolvedBg]);

  useThemeColor(resolvedBg);

  useEffect(() => {
    if (!playId) return;
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/platform-plays/${playId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Play not found" : "Failed to load play");
        return res.json();
      })
      .then((data) => setPlay(data.play))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [playId]);

  const textPrimary = isLight ? "text-gray-900" : "text-white";
  const textSecondary = isLight ? "text-gray-500" : "text-white/50";
  const borderColor = isLight ? "border-gray-100" : "border-white/8";
  const cardBg = isLight ? "bg-gray-50" : "bg-white/4";
  const tagBg = isLight ? "bg-gray-100 text-gray-600" : "bg-white/8 text-white/60";

  return (
    <div
      className={`min-h-screen font-DmSans ${isLight ? "bg-white text-gray-900" : "bg-[#121212] text-white"}`}
    >
      {/* Header */}
      <div className={`border-b ${borderColor} px-6 py-4`}>
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="opacity-80 transition hover:opacity-100">
            <img src={logo} alt="Coachable" className="h-6" />
          </Link>
          <Link
            to="/signup"
            className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110"
          >
            <FiExternalLink className="text-xs" />
            Try Coachable
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <FiLoader className={`h-6 w-6 animate-spin ${textSecondary}`} />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className={`font-Manrope text-lg font-bold ${textPrimary}`}>Play not found</p>
            <p className={`mt-2 text-sm ${textSecondary}`}>
              This play may have been removed or the link is invalid.
            </p>
            <Link
              to="/"
              className="mt-6 rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Back to home
            </Link>
          </div>
        )}

        {/* Play */}
        {!loading && play && (
          <div>
            {/* Title + meta */}
            <div className="mb-6">
              {play.sport && (
                <span className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${tagBg}`}>
                  {play.sport}
                </span>
              )}
              <h1 className={`font-Manrope text-2xl font-bold ${textPrimary}`}>{play.title}</h1>
              {play.description && (
                <p className={`mt-2 text-sm leading-relaxed ${textSecondary}`}>{play.description}</p>
              )}
              {play.tags?.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <FiTag className={`text-xs ${textSecondary}`} />
                  {play.tags.map((tag) => (
                    <span key={tag} className={`rounded-full px-2 py-0.5 text-xs ${tagBg}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Canvas preview */}
            <div className={`overflow-hidden rounded-2xl border ${borderColor} ${cardBg}`}>
              <PlayPreviewCard
                playData={play.playData}
                autoplay="always"
                shape="landscape"
                cameraMode="fit-distribution"
                background="field"
                paddingPx={32}
                minSpanPx={120}
                showHoverHint={false}
              />
            </div>

            {/* CTA */}
            <div className={`mt-8 rounded-xl border ${borderColor} ${cardBg} p-6 text-center`}>
              <p className={`font-Manrope text-base font-bold ${textPrimary}`}>
                Build plays like this with Coachable
              </p>
              <p className={`mt-1 text-sm ${textSecondary}`}>
                Design, animate, and share plays with your team — free to get started.
              </p>
              <Link
                to="/signup"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-BrandOrange px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Get started free
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
