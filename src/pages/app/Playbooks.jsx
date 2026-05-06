import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";
import {
  fetchPublishedPlaybookSections,
  filterPublishedPlaybookSectionsForSport,
} from "../../utils/playbookSectionsApi";
import PlayPreviewCard from "../../components/PlayPreviewCard";
import {
  FiChevronRight,
  FiBookOpen,
  FiChevronDown,
  FiChevronLeft,
  FiCheck,
  FiFilter,
  FiLayout,
  FiPlus,
  FiSearch,
  FiTag,
  FiX,
} from "react-icons/fi";

// ── API helpers ───────────────────────────────────────────────────────────────

/**
 * Fetch a single published playbook section with its plays (includes playData).
 * @param {string} id
 * @returns {Promise<{ section: Object, plays: Object[] }>}
 */
async function fetchSectionDetail(id) {
  return await apiFetch(`/playbook-sections/${id}`);
}

/**
 * Copy a single platform play to the authenticated coach's team playbook.
 * @param {string} playId
 */
async function copySinglePlay(playId) {
  return await apiFetch(`/platform-plays/${playId}/copy`, { method: "POST" });
}

/**
 * Copy all plays in a playbook section to the authenticated coach's team playbook.
 * @param {string} sectionId
 */
async function copySectionToTeam(sectionId) {
  return await apiFetch(`/playbook-sections/${sectionId}/copy`, { method: "POST" });
}

function normalizeFilterValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getSectionTags(plays) {
  const tagsByKey = new Map();

  plays.forEach((play) => {
    (play.tags || []).forEach((tag) => {
      const cleanedTag = String(tag || "").trim();
      const key = normalizeFilterValue(cleanedTag);
      if (!key || tagsByKey.has(key)) return;
      tagsByKey.set(key, cleanedTag);
    });
  });

  return [...tagsByKey.values()].sort((a, b) => a.localeCompare(b));
}

function filterSectionPlays(plays, searchValue, activeTags) {
  const searchTerm = normalizeFilterValue(searchValue);
  const normalizedActiveTags = activeTags.map(normalizeFilterValue).filter(Boolean);

  return plays.filter((play) => {
    const title = normalizeFilterValue(play.title);
    const playTags = (play.tags || []).map(normalizeFilterValue).filter(Boolean);
    const matchesSearch = !searchTerm
      || title.includes(searchTerm)
      || playTags.some((tag) => tag.includes(searchTerm));
    const matchesTags = normalizedActiveTags.every((tag) => playTags.includes(tag));
    return matchesSearch && matchesTags;
  });
}

// ── Play grid ─────────────────────────────────────────────────────────────────

/**
 * Renders the play grid for a section.
 * @param {Object} props
 * @param {Object[]} props.plays
 * @param {boolean} props.isCoach
 * @param {Set<string>} props.copiedIds
 * @param {Function} props.onCopyPlay
 * @param {Function} props.onPreview
 */
function PlayGrid({ plays, isCoach, copiedIds, onCopyPlay, onPreview }) {
  if (plays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FiBookOpen className="mb-3 text-3xl text-BrandGray2" />
        <p className="font-semibold text-BrandText">No plays in this section yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plays.map((play) => (
        <div
          key={play.id}
          className="group flex flex-col overflow-hidden rounded-3xl border border-BrandGray2/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),rgba(24,26,31,0.96)] transition hover:border-BrandOrange/25 hover:shadow-[0_18px_50px_rgba(0,0,0,0.24)]"
        >
          <button
            onClick={() => onPreview(play)}
            className="relative block w-full text-left"
          >
            <div className="border-b border-white/6 bg-BrandBlack/40 p-3">
              {play.playData ? (
                <PlayPreviewCard
                  playData={play.playData}
                  autoplay="hover"
                  shape="landscape"
                  cameraMode="fit-distribution"
                  background="field"
                  paddingPx={20}
                  minSpanPx={100}
                  showHoverHint={false}
                  className="overflow-hidden rounded-2xl"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-BrandGray2/10">
                  <FiLayout className="text-2xl text-BrandGray2/40" />
                </div>
              )}
              {play.tags?.length > 0 && (
                <div className="pointer-events-none absolute right-5 top-5 rounded-full border border-black/10 bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white/85 backdrop-blur-sm">
                  {play.tags.length} tag{play.tags.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </button>

          <div className="flex flex-1 flex-col p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-Manrope text-sm font-bold text-BrandText">{play.title}</h4>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-BrandGray2">
                  Play Preview
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-BrandGray2/20 bg-BrandBlack/35 text-BrandGray transition group-hover:border-BrandOrange/30 group-hover:text-BrandOrange">
                <FiChevronRight className="text-sm" />
              </div>
            </div>
            {play.description && (
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-BrandGray">
                {play.description}
              </p>
            )}
            {play.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {play.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-BrandGray2/15 bg-BrandBlack/35 px-2.5 py-1 text-[10px] text-BrandGray"
                  >
                    <FiTag className="text-[8px]" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {isCoach && (
              <button
                onClick={() => onCopyPlay(play)}
                disabled={copiedIds.has(play.id)}
                className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-semibold transition disabled:opacity-70 ${
                  copiedIds.has(play.id)
                    ? "bg-green-500/10 text-green-400"
                    : "border border-BrandOrange/20 bg-BrandOrange/10 text-BrandOrange hover:bg-BrandOrange/18"
                }`}
              >
                {copiedIds.has(play.id)
                  ? <><FiCheck className="text-xs" /> Added to Playbook</>
                  : <><FiPlus className="text-xs" /> Add to Playbook</>
                }
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Section detail ────────────────────────────────────────────────────────────

/**
 * Detail view for an admin-curated playbook section.
 * @param {Object} props
 * @param {Object} props.section
 * @param {Function} props.onBack
 * @param {boolean} props.isCoach
 */
function SectionDetail({ sectionId, onBack, isCoach }) {
  const navigate = useNavigate();
  const [section, setSection] = useState(null);
  const [plays, setPlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedIds, setCopiedIds] = useState(new Set());
  const [copyingAll, setCopyingAll] = useState(false);
  const [allCopied, setAllCopied] = useState(false);
  const [previewPlay, setPreviewPlay] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchSectionDetail(sectionId)
      .then((data) => {
        setSection(data.section || null);
        setPlays(data.plays || []);
      })
      .catch((err) => {
        if (err.status === 404) {
          navigate("/app/playbooks", { replace: true });
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [navigate, sectionId]);

  const sectionTags = useMemo(() => getSectionTags(plays), [plays]);
  const filteredPlays = useMemo(
    () => filterSectionPlays(plays, search, activeTags),
    [plays, search, activeTags]
  );
  const hasActivePlayFilters = search.trim().length > 0 || activeTags.length > 0;
  const totalPlayCount = loading ? Number(section?.playCount || 0) : plays.length;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!filtersRef.current?.contains(event.target)) {
        setFiltersOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const availableKeys = new Set(sectionTags.map(normalizeFilterValue));
    setActiveTags((prev) => {
      const next = prev.filter((tag) => availableKeys.has(normalizeFilterValue(tag)));
      if (next.length === prev.length && next.every((tag, index) => tag === prev[index])) {
        return prev;
      }
      return next;
    });
  }, [sectionTags]);

  const handleCopyPlay = async (play) => {
    try {
      await copySinglePlay(play.id);
      setCopiedIds((prev) => new Set([...prev, play.id]));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCopyAll = async () => {
    setCopyingAll(true);
    try {
      await copySectionToTeam(sectionId);
      setCopiedIds(new Set(plays.map((p) => p.id)));
      setAllCopied(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setCopyingAll(false);
    }
  };

  const toggleTagFilter = (tag) => {
    setActiveTags((prev) => (
      prev.some((value) => normalizeFilterValue(value) === normalizeFilterValue(tag))
        ? prev.filter((value) => normalizeFilterValue(value) !== normalizeFilterValue(tag))
        : [...prev, tag]
    ));
  };

  const clearTagFilters = () => setActiveTags([]);

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 bg-BrandBlack/95 backdrop-blur-sm">
        <div className="border-b border-BrandGray2/20 px-6 py-4">
          <button
            onClick={onBack}
            className="mb-1 flex items-center gap-1.5 text-xs text-BrandGray transition hover:text-BrandText"
          >
            <FiChevronLeft className="text-xs" /> All Playbooks
          </button>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-Manrope text-lg font-bold text-BrandText">{section?.name || "Playbook"}</h2>
              <p className="text-xs text-BrandGray2">
                {hasActivePlayFilters
                  ? `${filteredPlays.length} of ${totalPlayCount} ${totalPlayCount === 1 ? "play" : "plays"}`
                  : `${totalPlayCount} ${totalPlayCount === 1 ? "play" : "plays"}`}
              </p>
            </div>
            {isCoach && plays.length > 0 && (
              <button
                onClick={handleCopyAll}
                disabled={copyingAll || allCopied}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                  allCopied
                    ? "bg-green-500/15 text-green-400"
                    : "bg-BrandOrange text-white hover:brightness-110 active:scale-[0.97]"
                }`}
              >
                {copyingAll ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : allCopied ? (
                  <FiCheck />
                ) : (
                  <FiPlus />
                )}
                {allCopied ? "Added to Playbook" : "Add All to Playbook"}
              </button>
            )}
          </div>
        </div>

        {plays.length > 0 && (
          <div className="border-b border-BrandGray2/15 px-6 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-BrandGray2" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search plays by title or tag..."
                  className="w-full rounded-xl border border-BrandGray2/25 bg-BrandBlack2 py-2.5 pl-10 pr-10 text-sm text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2/40 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-BrandGray2 transition hover:bg-BrandBlack hover:text-BrandText"
                    aria-label="Clear search"
                  >
                    <FiX className="text-sm" />
                  </button>
                )}
              </div>

              <div ref={filtersRef} className="relative">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((prev) => !prev)}
                  className={`flex min-w-[148px] items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                    filtersOpen || activeTags.length > 0
                      ? "border-BrandOrange/50 bg-BrandOrange/10 text-BrandOrange"
                      : "border-BrandGray2/25 bg-BrandBlack2 text-BrandGray hover:border-BrandGray2/40 hover:text-BrandText"
                  }`}
                >
                  <FiFilter className="text-sm" />
                  Filter
                  {activeTags.length > 0 && (
                    <span className="rounded-full bg-BrandOrange px-2 py-0.5 text-[10px] font-bold leading-none text-white">
                      {activeTags.length}
                    </span>
                  )}
                  <FiChevronDown className={`text-sm transition ${filtersOpen ? "rotate-180" : ""}`} />
                </button>

                {filtersOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-20 w-[280px] rounded-2xl border border-BrandGray2/20 bg-BrandBlack p-3 shadow-2xl shadow-black/30">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-BrandGray2">
                        Section Tags
                      </p>
                      <button
                        type="button"
                        onClick={clearTagFilters}
                        disabled={activeTags.length === 0}
                        className="text-xs font-semibold text-BrandGray transition hover:text-BrandOrange disabled:cursor-not-allowed disabled:text-BrandGray2/50"
                      >
                        Clear all
                      </button>
                    </div>

                    {sectionTags.length === 0 ? (
                      <p className="rounded-xl border border-BrandGray2/15 bg-BrandBlack2/70 px-3 py-4 text-sm text-BrandGray2">
                        No tags in this section yet.
                      </p>
                    ) : (
                      <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                        {sectionTags.map((tag) => {
                          const isActive = activeTags.some(
                            (value) => normalizeFilterValue(value) === normalizeFilterValue(tag)
                          );

                          return (
                            <label
                              key={tag}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                                isActive
                                  ? "border-BrandOrange/40 bg-BrandOrange/10 text-BrandText"
                                  : "border-transparent bg-BrandBlack2/60 text-BrandGray hover:border-BrandGray2/20 hover:text-BrandText"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={() => toggleTagFilter(tag)}
                                className="h-4 w-4 rounded border-BrandGray2/40 bg-BrandBlack2 accent-BrandOrange"
                              />
                              <span className="truncate">{tag}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-6">
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange" />
          </div>
        ) : (
          <PlayGrid
            plays={filteredPlays}
            isCoach={isCoach}
            copiedIds={copiedIds}
            onCopyPlay={handleCopyPlay}
            onPreview={setPreviewPlay}
          />
        )}
      </div>

      {/* Full-screen preview modal */}
      {previewPlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewPlay(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#1a1d24] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
              <h3 className="font-Manrope text-sm font-bold text-white">{previewPlay.title}</h3>
              <button
                onClick={() => setPreviewPlay(null)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-BrandGray2 transition hover:text-white"
              >
                Close
              </button>
            </div>
            <PlayPreviewCard
              playData={previewPlay.playData}
              autoplay="always"
              shape="landscape"
              cameraMode="fit-distribution"
              background="field"
              paddingPx={30}
              minSpanPx={120}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Browse tile ───────────────────────────────────────────────────────────────

/**
 * A single tile in the section browse grid.
 * @param {Object} props
 * @param {string} props.title
 * @param {string|null} props.description
 * @param {number} props.playCount
 * @param {Function} props.onClick
 */
function BrowseTile({ title, description, playCount, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-BrandGray2/20 bg-BrandBlack2 text-left transition hover:border-BrandOrange/40 hover:shadow-lg hover:shadow-BrandOrange/5"
    >
      <div className="flex h-28 items-center justify-center bg-BrandOrange/5">
        <FiBookOpen className="text-4xl text-BrandOrange/40 transition group-hover:text-BrandOrange/70" />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate font-Manrope text-sm font-bold text-BrandText">{title}</h3>
        {description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-BrandGray">{description}</p>
        )}

        <p className="mt-auto pt-3 text-xs text-BrandGray2">
          {playCount} {playCount === 1 ? "play" : "plays"}
        </p>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

/**
 * Playbooks page — shows admin-curated playbook sections for the team's sport.
 * Coaches can click any section tile to see its plays, preview animations,
 * and add plays to their team playbook.
 */
export default function Playbooks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sectionId } = useParams();
  const isCoach = user?.role === "coach" || user?.role === "owner" || user?.role === "assistant_coach";
  const teamSport = user?.sport || "";

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const all = await fetchPublishedPlaybookSections();
      const filtered = filterPublishedPlaybookSectionsForSport(all, teamSport);
      setSections(filtered);
    } catch (err) {
      if (err.status === 401) {
        navigate("/login", { replace: true });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, teamSport]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (sectionId && !loading && !sections.some((section) => section.id === sectionId)) {
      navigate("/app/playbooks", { replace: true });
    }
  }, [loading, navigate, sectionId, sections]);

  if (sectionId) {
    return (
      <SectionDetail
        sectionId={sectionId}
        onBack={() => navigate("/app/playbooks")}
        isCoach={isCoach}
      />
    );
  }

  return (
    <div className="min-h-full px-6 py-8">
      <div className="mb-6">
        <h1 className="font-Manrope text-xl font-bold text-BrandText">Playbook Library</h1>
        <p className="mt-1 text-sm text-BrandGray">
          {teamSport
            ? `Browse curated ${teamSport} play collections. Add plays to your team's playbook with one click.`
            : "Browse curated play collections. Add plays to your team's playbook with one click."
          }
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange" />
        </div>
      ) : sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-BrandGray2/20 py-20 text-center">
          <FiBookOpen className="mb-4 text-4xl text-BrandGray2" />
          <p className="font-Manrope font-semibold text-BrandText">No playbooks yet</p>
          <p className="mt-1 text-sm text-BrandGray">
            Check back soon — collections for your sport will appear here once published.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <BrowseTile
              key={section.id}
              title={section.name}
              description={section.description}
              playCount={section.playCount}
              onClick={() => navigate(`/app/playbooks/${section.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
