import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchSharedPlay, copySharedPlay } from "../utils/apiPlays";
import PlayPreviewCard from "../components/PlayPreviewCard";
import useThemeColor from "../utils/useThemeColor";
import { FiLoader, FiClock, FiTag, FiPlus, FiExternalLink, FiCheck, FiUser, FiChevronDown, FiX } from "react-icons/fi";
import darkLogo from "../assets/logos/White_Full_Coachable.png";
import lightLogo from "../assets/logos/full_Coachable_logo.png";

/**
 * Formats an ISO timestamp as a human-readable relative time string.
 * @param {string} isoString
 * @returns {string}
 */
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

const COACH_ROLES = ["owner", "coach", "assistant_coach"];
const ROLE_LABELS = { owner: "Owner", coach: "Coach", assistant_coach: "Asst. Coach", player: "Player" };

/**
 * Public page for a shared play link (/shared/:token).
 * No auth required; shows extra UI when logged in as a coach.
 */
export default function SharedPlay() {
  const { token } = useParams();
  const { user, allTeams, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [play, setPlay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(() => user?.teamId ?? null);
  const dropdownRef = useRef(null);

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

  // Initialize selectedTeamId once auth resolves (handles async auth load)
  useEffect(() => {
    if (user && !selectedTeamId) setSelectedTeamId(user.teamId);
  }, [user]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchSharedPlay(token)
      .then((p) => setPlay(p))
      .catch((err) => setError(err?.message || "Play not found"))
      .finally(() => setLoading(false));
  }, [token]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const playSport = (play?.sport || "").toLowerCase();
  const coachEligibleTeams = (allTeams || []).filter(
    (t) => COACH_ROLES.includes(t.role) && (!playSport || (t.sport || "").toLowerCase() === playSport)
  );

  const selectedTeam =
    coachEligibleTeams.find((t) => t.teamId === selectedTeamId) ??
    coachEligibleTeams[0] ??
    null;

  /**
   * Switches the "viewing as" team without copying anything.
   * @param {string} teamId
   */
  const handleTeamSelect = (teamId) => {
    setSelectedTeamId(teamId);
    setDropdownOpen(false);
  };

  /**
   * Copies the shared play into the given team's playbook.
   * @param {string} teamId
   */
  const copyToTeam = async (teamId) => {
    setCopying(true);
    setCopyError(null);
    try {
      await copySharedPlay(token, teamId);
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

  const isCoach = user && COACH_ROLES.includes(user.role);

  return (
    <div className="app-themed min-h-screen overflow-y-auto bg-BrandBlack text-BrandText font-DmSans touch-scroll" style={{ position: 'fixed', inset: 0, overscrollBehavior: 'none' }}>
      {/* Top bar */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12">
        <Link to="/">
          <img src={logo} alt="Coachable" className="block h-9 w-auto object-contain md:h-10" />
        </Link>
        {user ? (
          <div className="flex items-center gap-4">
            <Link
              to="/app/plays"
              className="rounded-lg border border-BrandGray2/30 px-4 py-2 text-sm font-semibold text-BrandGray transition hover:border-BrandOrange/50 hover:text-BrandOrange"
            >
              Go to App
            </Link>
            {isCoach ? (
              /* Team picker dropdown — always visible for coaches, never gated on copied */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2.5 rounded-lg border border-BrandGray2/20 px-3 py-1.5 transition hover:border-BrandGray2/40"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-BrandOrange/20">
                    <FiUser className="text-xs text-BrandOrange" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-BrandText leading-tight">{user.name}</p>
                    {selectedTeam && (
                      <p className="text-[10px] text-BrandGray2 leading-tight">{selectedTeam.teamName}</p>
                    )}
                  </div>
                  <FiChevronDown className={`text-xs text-BrandGray2 transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-BrandGray2/20 bg-BrandBlack shadow-[0_12px_32px_-8px_rgba(0,0,0,0.9)]">
                    <div className="flex items-center justify-between border-b border-BrandGray2/10 px-3 py-2">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-BrandGray2">Viewing as</span>
                      <button type="button" onClick={() => setDropdownOpen(false)} className="rounded p-0.5 text-BrandGray2 hover:text-BrandText">
                        <FiX className="text-xs" />
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {coachEligibleTeams.map((t) => (
                        <button
                          key={t.teamId}
                          type="button"
                          onClick={() => handleTeamSelect(t.teamId)}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-BrandBlack2/60"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-BrandOrange/15 text-[10px] font-bold text-BrandOrange">
                            {t.isPersonal ? <FiUser className="text-xs" /> : (t.teamName?.[0] || "?")}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-BrandText">
                              {t.isPersonal ? (t.teamName || "Personal Workspace") : t.teamName}
                            </p>
                            <p className="text-[10px] text-BrandGray2">
                              {t.isPersonal ? "solo" : ROLE_LABELS[t.role] || t.role}
                            </p>
                          </div>
                          {t.teamId === selectedTeam?.teamId && <FiCheck className="shrink-0 text-xs text-BrandOrange" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Non-coach logged-in user: plain profile link, no dropdown */
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
            )}
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
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              to={`/shared/${token}/view`}
              className="flex items-center gap-2 rounded-lg border border-BrandGray2/30 px-4 py-2 text-sm font-semibold text-BrandGray transition hover:border-BrandOrange/50 hover:text-BrandOrange"
            >
              <FiExternalLink className="text-sm" />
              View in Slate
            </Link>
            {isCoach && !copied && (
              <button
                onClick={() => copyToTeam(selectedTeam?.teamId)}
                disabled={copying || !selectedTeam}
                className="flex items-center gap-2 rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {copying ? <FiLoader className="animate-spin text-sm" /> : <FiPlus className="text-sm" />}
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
                onClick={() => navigate(`/login?returnTo=${encodeURIComponent(`/shared/${token}`)}`)}
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
                to={`/login?returnTo=${encodeURIComponent(`/shared/${token}`)}`}
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
