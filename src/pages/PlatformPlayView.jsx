import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { copyPlatformPlay } from "../utils/apiPlays";
import PlayPreviewCard from "../components/PlayPreviewCard";
import useThemeColor from "../utils/useThemeColor";
import { FiLoader, FiTag, FiPlus, FiExternalLink, FiCheck, FiUser } from "react-icons/fi";
import darkLogo from "../assets/logos/White_Full_Coachable.png";
import lightLogo from "../assets/logos/full_Coachable_logo.png";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Public view page for a single platform play.
 * Accessible at /platform-play/:playId with no authentication required.
 * When logged in as a coach, shows "Add to Playbook" button matching
 * the SharedPlay page layout.
 * @returns {JSX.Element}
 */
export default function PlatformPlayView() {
  const { playId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [play, setPlay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(null);

  // Theme: use user's saved preference, default to light for visitors
  const [isLight] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (!saved) return true;
    if (saved === "system") return !window.matchMedia("(prefers-color-scheme: dark)").matches;
    return saved === "light";
  });

  const resolvedBg = isLight ? "#ffffff" : "#121212";

  useEffect(() => {
    const resolved = isLight ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", resolved);
    document.body.style.backgroundColor = resolvedBg;
    return () => { document.body.style.backgroundColor = ""; };
  }, [isLight, resolvedBg]);

  useThemeColor(resolvedBg);

  const logo = isLight ? lightLogo : darkLogo;

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

  /**
   * Copies the platform play into the logged-in coach's playbook.
   * Redirects to login if not authenticated.
   */
  const handleAddToPlaybook = async () => {
    if (!user) {
      navigate(`/login?returnTo=${encodeURIComponent(`/platform-play/${playId}`)}`);
      return;
    }
    setCopying(true);
    setCopyError(null);
    try {
      await copyPlatformPlay(playId);
      setCopied(true);
    } catch (err) {
      setCopyError(err?.message || "Failed to add play");
    } finally {
      setCopying(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="app-themed flex min-h-screen items-center justify-center bg-BrandBlack">
        <FiLoader className="animate-spin text-3xl text-BrandGray2" />
      </div>
    );
  }

  if (error || !play) {
    return (
      <div className="app-themed flex min-h-screen flex-col items-center justify-center bg-BrandBlack text-BrandText">
        <h1 className="font-Manrope text-xl font-bold">Play not found</h1>
        <p className="mt-2 text-sm text-BrandGray">
          {error || "This play may have been removed or the link is invalid."}
        </p>
        <Link
          to="/"
          className="mt-6 rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Go Home
        </Link>
      </div>
    );
  }

  const isCoach = user && ["owner", "coach", "assistant_coach"].includes(user.role);

  return (
    <div className="app-themed min-h-screen overflow-y-auto bg-BrandBlack text-BrandText font-DmSans touch-scroll" style={{ position: "fixed", inset: 0, overscrollBehavior: "none" }}>
      {/* Top bar — matches SharedPlay nav */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12">
        <Link to="/">
          <img src={logo} alt="Coachable" className="h-9 md:h-10" />
        </Link>
        {user ? (
          <div className="flex items-center gap-4">
            <Link
              to="/app/plays"
              className="rounded-lg border border-BrandGray2/30 px-4 py-2 text-sm font-semibold text-BrandGray transition hover:border-BrandOrange/50 hover:text-BrandOrange"
            >
              Go to App
            </Link>
            <Link to="/app/profile" className="flex items-center gap-2.5 rounded-lg border border-BrandGray2/20 px-3 py-1.5 transition hover:border-BrandGray2/40">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-BrandOrange/20">
                <FiUser className="text-xs text-BrandOrange" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-BrandText leading-tight">{user.name}</p>
                {user.teamName && (
                  <p className="text-[10px] text-BrandGray2 leading-tight">{user.teamName}</p>
                )}
              </div>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-BrandGray transition hover:text-BrandText">
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Sign Up
            </Link>
          </div>
        )}
      </nav>

      {/* Play content */}
      <div className="mx-auto max-w-4xl px-6 py-8 pb-40 md:px-10 md:py-12 md:pb-32">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {play.sport && (
              <span className="mb-2 inline-block rounded-full bg-BrandGray2/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-BrandGray">
                {play.sport}
              </span>
            )}
            <h1 className="font-Manrope text-2xl font-bold tracking-tight">
              {play.title}
            </h1>
            {play.description && (
              <p className="mt-2 text-sm leading-relaxed text-BrandGray">
                {play.description}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {isCoach && !copied && (
              <button
                onClick={handleAddToPlaybook}
                disabled={copying}
                className="flex items-center gap-2 rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {copying ? (
                  <FiLoader className="animate-spin text-sm" />
                ) : (
                  <FiPlus className="text-sm" />
                )}
                {copying ? "Adding..." : "Add to Playbook"}
              </button>
            )}
            {copied && (
              <button
                onClick={() => navigate("/app/plays")}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                <FiCheck className="text-sm" />
                Added — View Playbook
              </button>
            )}
            {!user && (
              <button
                onClick={handleAddToPlaybook}
                className="flex items-center gap-2 rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                <FiPlus className="text-sm" />
                Add to Playbook
              </button>
            )}
          </div>
        </div>

        {copyError && (
          <p className="mt-3 text-sm text-red-400">{copyError}</p>
        )}

        {/* Not logged in CTA */}
        {!user && (
          <div className="mt-6 rounded-2xl border border-BrandGray2/20 bg-BrandBlack2/30 p-6 text-center">
            <p className="font-Manrope text-lg font-bold text-BrandText">Get started with Coachable!</p>
            <p className="mt-1 text-sm text-BrandGray">Sign up to add this play to your playbook and start building plays.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link
                to={`/login?returnTo=${encodeURIComponent(`/platform-play/${playId}`)}`}
                className="rounded-lg border border-BrandGray2/30 px-4 py-2 text-sm font-semibold text-BrandGray transition hover:border-BrandOrange/50 hover:text-BrandOrange"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}

        {/* Play preview */}
        <div className="mt-8 mb-4">
          <PlayPreviewCard
            playData={play.playData}
            autoplay="always"
            shape="wide"
            cameraMode="fit-distribution"
            background="field"
            paddingPx={30}
            minSpanPx={150}
          />
        </div>

        {/* Tags */}
        {play.tags && play.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {play.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-BrandGray2/20 px-2.5 py-1 text-xs text-BrandGray"
              >
                <FiTag className="text-[10px]" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
