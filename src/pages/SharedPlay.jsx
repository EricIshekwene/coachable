import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchSharedPlay, copySharedPlay } from "../utils/apiPlays";
import PlayPreviewCard from "../components/PlayPreviewCard";
import { FiLoader, FiClock, FiTag, FiPlus, FiExternalLink, FiCheck, FiUser } from "react-icons/fi";
import logo from "../assets/logos/White_Full_Coachable.png";

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

export default function SharedPlay() {
  const { token } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [play, setPlay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchSharedPlay(token)
      .then((p) => setPlay(p))
      .catch((err) => setError(err?.message || "Play not found"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAddToPlaybook = async () => {
    if (!user) {
      navigate(`/login?returnTo=${encodeURIComponent(`/shared/${token}`)}`);
      return;
    }
    setCopying(true);
    setCopyError(null);
    try {
      await copySharedPlay(token);
      setCopied(true);
    } catch (err) {
      setCopyError(err?.message || "Failed to add play");
    } finally {
      setCopying(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-BrandBlack">
        <FiLoader className="animate-spin text-3xl text-BrandGray2" />
      </div>
    );
  }

  if (error || !play) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-BrandBlack text-white">
        <h1 className="font-Manrope text-xl font-bold">Play not found</h1>
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

  return (
    <div className="min-h-screen bg-BrandBlack text-white font-DmSans">
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
            <Link to="/login" className="text-sm text-BrandGray transition hover:text-white">
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
      <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs text-BrandGray2">
              Shared from <span className="text-BrandGray">{play.teamName}</span>
            </p>
            <h1 className="font-Manrope text-2xl font-bold tracking-tight">
              {play.title}
            </h1>
            <div className="mt-2 flex items-center gap-3 text-xs text-BrandGray2">
              <span className="flex items-center gap-1.5">
                <FiClock className="text-[10px]" />
                {formatRelativeTime(play.updatedAt || play.createdAt)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={`/shared/${token}/view`}
              className="flex items-center gap-2 rounded-lg border border-BrandGray2/30 px-4 py-2 text-sm font-semibold text-BrandGray transition hover:border-BrandOrange/50 hover:text-BrandOrange"
            >
              <FiExternalLink className="text-sm" />
              View in Slate
            </Link>
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

        {/* Notes */}
        {play.notes && play.notes.trim() && (
          <section className="mt-8 rounded-2xl border border-BrandGray2/20 bg-BrandBlack2/30 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center rounded-full bg-BrandOrange/15 px-3 py-1 text-[11px] font-semibold text-BrandOrange">
                {play.notesAuthorName || "Coach"}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap font-DmSans text-sm leading-6 text-BrandText">
              {play.notes}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
