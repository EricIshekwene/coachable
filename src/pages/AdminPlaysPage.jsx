import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logos/full_Coachable_logo.png";
import { FiPlus, FiEdit2, FiTrash2, FiStar, FiLogOut } from "react-icons/fi";
import PlayPreviewCard from "../components/PlayPreviewCard";

const SESSION_KEY = "coachable_admin_session";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── API helpers ──────────────────────────────────────────────────────────────

/**
 * Fetch all platform plays via the admin API.
 * @param {string} session - Admin session token
 * @returns {Promise<Object[]>} Array of platform play objects
 */
async function fetchAllPlays(session) {
  const res = await fetch(`${API_URL}/admin/plays`, {
    headers: { "x-admin-session": session },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  const data = await res.json();
  return data.plays || [];
}

/**
 * Delete a platform play via the admin API.
 * @param {string} session - Admin session token
 * @param {string} id - Platform play ID
 */
async function deletePlay(session, id) {
  const res = await fetch(`${API_URL}/admin/plays/${id}`, {
    method: "DELETE",
    headers: { "x-admin-session": session },
  });
  if (!res.ok) throw new Error("Failed to delete play");
}

/**
 * Toggle the featured status of a platform play.
 * @param {string} session - Admin session token
 * @param {string} id - Platform play ID
 * @param {boolean} isFeatured - New featured value
 * @returns {Promise<Object>} Updated play object
 */
async function toggleFeatured(session, id, isFeatured) {
  const res = await fetch(`${API_URL}/admin/plays/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-admin-session": session,
    },
    body: JSON.stringify({ isFeatured }),
  });
  if (!res.ok) throw new Error("Failed to update play");
  const data = await res.json();
  return data.play;
}

// ── Subcomponents ────────────────────────────────────────────────────────────

/** A single platform play card. */
function PlayCard({ play, onEdit, onDelete, onToggleFeatured }) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggleFeatured(play);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-white/8 bg-[#1e2228] transition hover:border-white/16">
      {/* Preview */}
      <div className="relative">
        <PlayPreviewCard
          playData={play.playData}
          autoplay="hover"
          shape="landscape"
          cameraMode="fit-distribution"
          background="field"
          paddingPx={20}
          minSpanPx={100}
          showHoverHint={false}
        />

        {/* Featured badge */}
        {play.isFeatured && (
          <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-BrandOrange/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <FiStar className="text-[9px]" />
            Featured
          </span>
        )}

        {/* Sport badge */}
        {play.sport && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
            {play.sport}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-Manrope text-sm font-bold text-white">{play.title}</h3>
        {play.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-BrandGray">
            {play.description}
          </p>
        )}

        {/* Tags */}
        {play.tags?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {play.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-white/6 px-1.5 py-0.5 text-[10px] text-BrandGray2"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => onEdit(play)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/4 py-2 text-xs font-semibold text-white transition hover:bg-white/8"
          >
            <FiEdit2 className="text-xs" />
            Edit
          </button>

          <button
            onClick={handleToggle}
            disabled={toggling}
            title={play.isFeatured ? "Remove from landing page" : "Show on landing page"}
            className={`flex items-center justify-center rounded-lg border px-2.5 py-2 text-xs transition ${
              play.isFeatured
                ? "border-BrandOrange/40 bg-BrandOrange/15 text-BrandOrange hover:bg-BrandOrange/25"
                : "border-white/10 bg-white/4 text-BrandGray2 hover:text-white"
            } disabled:opacity-50`}
          >
            <FiStar className="text-sm" />
          </button>

          <button
            onClick={() => onDelete(play)}
            title="Delete play"
            className="flex items-center justify-center rounded-lg border border-white/10 bg-white/4 px-2.5 py-2 text-xs text-red-400 transition hover:border-red-500/30 hover:bg-red-500/10"
          >
            <FiTrash2 className="text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

/**
 * Admin plays manager page — accessible at /admin/app.
 * Lists all platform plays with create/edit/delete/feature controls.
 * Redirects to /admin if not authenticated.
 */
export default function AdminPlaysPage() {
  const navigate = useNavigate();
  const session = localStorage.getItem(SESSION_KEY) || "";

  const [plays, setPlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Redirect to admin login if no session
  useEffect(() => {
    if (!session) {
      navigate("/admin", { replace: true });
    }
  }, [session, navigate]);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchAllPlays(session);
      setPlays(data);
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        localStorage.removeItem(SESSION_KEY);
        navigate("/admin", { replace: true });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [session, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = () => {
    fetch(`${API_URL}/admin/logout`, {
      method: "POST",
      headers: { "x-admin-session": session },
    }).catch(() => {});
    localStorage.removeItem(SESSION_KEY);
    navigate("/admin", { replace: true });
  };

  const handleEdit = (play) => {
    navigate(`/admin/plays/${play.id}/edit`);
  };

  const handleNew = () => {
    navigate("/admin/plays/new/edit");
  };

  const handleDelete = async (play) => {
    if (!window.confirm(`Delete "${play.title}"? This cannot be undone.`)) return;
    try {
      await deletePlay(session, play.id);
      setPlays((prev) => prev.filter((p) => p.id !== play.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleFeatured = async (play) => {
    try {
      const updated = await toggleFeatured(session, play.id, !play.isFeatured);
      setPlays((prev) => prev.map((p) => (p.id === play.id ? updated : p)));
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = plays.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.sport?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const featuredCount = plays.filter((p) => p.isFeatured).length;

  return (
    <div className="min-h-screen bg-[#13151a] font-DmSans text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/6 bg-[#13151a]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3.5">
          {/* Logo + admin badge */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin")} className="inline-flex opacity-70 hover:opacity-100 transition">
              <img src={logo} alt="Coachable" className="h-5" />
            </button>
            <span className="rounded bg-BrandOrange/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-BrandOrange">
              Admin
            </span>
          </div>

          <h1 className="font-Manrope text-sm font-bold text-white/80">Platform Plays</h1>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-BrandGray2">
            <span>{plays.length} total</span>
            {featuredCount > 0 && (
              <span className="text-BrandOrange">{featuredCount} featured</span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleNew}
              className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
            >
              <FiPlus />
              New Play
            </button>
            <button
              onClick={() => navigate("/admin")}
              className="rounded-lg border border-white/8 px-3.5 py-2 text-xs text-BrandGray transition hover:border-white/20 hover:text-white"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              title="Log out"
              className="flex items-center gap-1.5 rounded-lg border border-white/6 px-3 py-2 text-xs text-BrandGray transition hover:border-white/20 hover:text-white"
            >
              <FiLogOut />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Search */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-BrandGray2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plays..."
              className="w-full rounded-lg border border-white/8 bg-[#1e2228] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-BrandGray2 focus:border-BrandOrange/50"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-BrandGray2 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-600/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/6 bg-[#1e2228] py-20 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-BrandOrange/10">
              <svg
                className="h-6 w-6 text-BrandOrange"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                />
              </svg>
            </div>
            <p className="font-Manrope text-sm font-semibold text-white">
              {search ? "No plays match your search" : "No platform plays yet"}
            </p>
            <p className="mt-1 text-xs text-BrandGray2">
              {search
                ? "Try a different search term"
                : "Create your first play to feature on the landing page"}
            </p>
            {!search && (
              <button
                onClick={handleNew}
                className="mt-5 flex items-center gap-2 rounded-lg bg-BrandOrange px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
              >
                <FiPlus />
                New Play
              </button>
            )}
          </div>
        )}

        {/* Play grid */}
        {!loading && filtered.length > 0 && (
          <>
            {/* Featured section */}
            {filtered.some((p) => p.isFeatured) && (
              <div className="mb-8">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-BrandOrange/70">
                  Featured on landing page
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered
                    .filter((p) => p.isFeatured)
                    .map((play) => (
                      <PlayCard
                        key={play.id}
                        play={play}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleFeatured={handleToggleFeatured}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Unfeatured section */}
            {filtered.some((p) => !p.isFeatured) && (
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-BrandGray2">
                  {filtered.some((p) => p.isFeatured) ? "Not featured" : "All plays"}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered
                    .filter((p) => !p.isFeatured)
                    .map((play) => (
                      <PlayCard
                        key={play.id}
                        play={play}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleFeatured={handleToggleFeatured}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
