import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchSharedFolder, copySharedFolder } from "../utils/apiFolders";
import PlayPreviewCard from "../components/PlayPreviewCard";
import useThemeColor from "../utils/useThemeColor";
import { FiLoader, FiClock, FiTag, FiPlus, FiExternalLink, FiCheck, FiUser, FiFolder } from "react-icons/fi";
import darkLogo from "../assets/logos/White_Full_Coachable.png";
import lightLogo from "../assets/logos/full_Coachable_logo.png";

function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export default function SharedFolder() {
  const { token } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [folder, setFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(null);
  const [selectedPlay, setSelectedPlay] = useState(null);

  // Theme: use user's saved preference, default to light for visitors
  const [isLight, setIsLight] = useState(() => {
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
    if (!token) return;
    setLoading(true);
    fetchSharedFolder(token)
      .then((f) => setFolder(f))
      .catch((err) => setError(err?.message || "Folder not found"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAddToPlaybook = async () => {
    if (!user) {
      navigate(`/login?returnTo=${encodeURIComponent(`/shared/folder/${token}`)}`);
      return;
    }
    setCopying(true);
    setCopyError(null);
    try {
      await copySharedFolder(token);
      setCopied(true);
    } catch (err) {
      setCopyError(err?.message || "Failed to add folder");
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

  if (error || !folder) {
    return (
      <div className="app-themed flex min-h-screen flex-col items-center justify-center bg-BrandBlack text-BrandText">
        <h1 className="font-Manrope text-xl font-bold">Folder not found</h1>
        <p className="mt-2 text-sm text-BrandGray">
          {error || "This share link may have expired or been revoked."}
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
  const plays = folder.plays || [];

  return (
    <div className="app-themed min-h-screen overflow-y-auto bg-BrandBlack text-BrandText font-DmSans touch-scroll" style={{ position: 'fixed', inset: 0, overscrollBehavior: 'none' }}>
      {/* Top bar */}
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

      {/* Folder content */}
      <div className="mx-auto max-w-5xl px-6 py-8 pb-40 md:px-10 md:py-12 md:pb-32">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-xs text-BrandGray2">
              Shared from <span className="text-BrandGray">{folder.teamName}</span>
            </p>
            <div className="flex items-center gap-2">
              <FiFolder className="text-BrandOrange text-lg" />
              <h1 className="font-Manrope text-2xl font-bold tracking-tight">
                {folder.name}
              </h1>
            </div>
            <p className="mt-2 text-xs text-BrandGray2">
              {plays.length} {plays.length === 1 ? "play" : "plays"}
            </p>
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
            <p className="mt-1 text-sm text-BrandGray">Sign up to add this folder to your playbook and start building plays.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link
                to={`/login?returnTo=${encodeURIComponent(`/shared/folder/${token}`)}`}
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

        {/* Plays grid */}
        {plays.length === 0 ? (
          <div className="mt-12 text-center text-sm text-BrandGray2">
            This folder has no plays yet.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plays.map((play) => (
              <div
                key={play.id}
                className={`rounded-xl border transition cursor-pointer ${
                  selectedPlay === play.id
                    ? "border-BrandOrange bg-BrandBlack2/50"
                    : "border-BrandGray2/15 bg-BrandBlack2/20 hover:border-BrandGray2/30"
                }`}
                onClick={() => setSelectedPlay(selectedPlay === play.id ? null : play.id)}
              >
                <div className="p-3">
                  <PlayPreviewCard
                    playData={play.playData}
                    autoplay="hover"
                    shape="landscape"
                    cameraMode="fit-distribution"
                    background="field"
                    paddingPx={20}
                    minSpanPx={100}
                  />
                </div>
                <div className="px-3 pb-3">
                  <p className="font-DmSans text-sm font-semibold text-BrandText truncate">
                    {play.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-BrandGray2">
                    <FiClock className="text-[9px]" />
                    {formatRelativeTime(play.updatedAt || play.createdAt)}
                  </div>
                  {play.tags && play.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {play.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 rounded bg-BrandGray2/15 px-1.5 py-0.5 text-[9px] text-BrandGray"
                        >
                          <FiTag className="text-[8px]" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
