import { Alert, Badge, Button, Card, Checkbox, Chip, EmptyState, Input, Spinner, Tabs } from "../../design-system/components";
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
      <EmptyState icon={<FiBookOpen />} title="No plays in this section yet" />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plays.map((play) => (
        <Card
          key={play.id}
          padding="none"
          interactive
          onClick={() => onPreview(play)}
          className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-BrandGray2/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),rgba(24,26,31,0.96)] transition hover:border-BrandOrange/25 hover:shadow-[0_18px_50px_rgba(0,0,0,0.24)]"
        >
          <div className="relative block w-full text-left">
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
                <Badge className="pointer-events-none absolute right-5 top-5 backdrop-blur-sm" size="xs">
                  {play.tags.length} tag{play.tags.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>

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
                  <Chip key={tag} leadingIcon={<FiTag className="text-[8px]" />}>{tag}</Chip>
                ))}
              </div>
            )}

            {isCoach && (
              <Button variant="primary"
                onClick={(e) => { e.stopPropagation(); onCopyPlay(play); }}
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
              </Button>
            )}
          </div>
        </Card>
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
          <Button variant="ghost"
            onClick={onBack}
            className="mb-1 flex items-center gap-1.5 text-xs text-BrandGray transition hover:text-BrandText"
          >
            <FiChevronLeft className="text-xs" /> All Playbooks
          </Button>
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
              <Button variant="primary"
                onClick={handleCopyAll}
                disabled={copyingAll || allCopied}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                  allCopied
                    ? "bg-green-500/15 text-green-400"
                    : "bg-BrandOrange text-white hover:brightness-110 active:scale-[0.97]"
                }`}
              >
                {copyingAll ? (
                  <Spinner size="sm" tone="default" label="Adding playbook" />
                ) : allCopied ? (
                  <FiCheck />
                ) : (
                  <FiPlus />
                )}
                {allCopied ? "Added to Playbook" : "Add All to Playbook"}
              </Button>
            )}
          </div>
        </div>

        {plays.length > 0 && (
          <div className="border-b border-BrandGray2/15 px-6 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-BrandGray2" />
                <Input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search plays by title or tag..."
                  className="w-full rounded-xl border border-BrandGray2/25 bg-BrandBlack2 py-2.5 pl-10 pr-10 text-sm text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2/40 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
                />
                {search && (
                  <Button variant="ghost"
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-BrandGray2 transition hover:bg-BrandBlack hover:text-BrandText"
                    aria-label="Clear search"
                  >
                    <FiX className="text-sm" />
                  </Button>
                )}
              </div>

              <div ref={filtersRef} className="relative">
                <Button variant="primary"
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
                    <Badge size="xs">{activeTags.length}</Badge>
                  )}
                  <FiChevronDown className={`text-sm transition ${filtersOpen ? "rotate-180" : ""}`} />
                </Button>

                {filtersOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-20 w-[280px] rounded-2xl border border-BrandGray2/20 bg-BrandBlack p-3 shadow-2xl shadow-black/30">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-BrandGray2">
                        Section Tags
                      </p>
                      <Button variant="ghost"
                        type="button"
                        onClick={clearTagFilters}
                        disabled={activeTags.length === 0}
                        className="text-xs font-semibold text-BrandGray transition hover:text-BrandOrange disabled:cursor-not-allowed disabled:text-BrandGray2/50"
                      >
                        Clear all
                      </Button>
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
                            <Checkbox
                              key={tag}
                              label={tag}
                              checked={isActive}
                              onChange={() => toggleTagFilter(tag)}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                                isActive
                                  ? "border-BrandOrange/40 bg-BrandOrange/10 text-BrandText"
                                  : "border-transparent bg-BrandBlack2/60 text-BrandGray hover:border-BrandGray2/20 hover:text-BrandText"
                              }`}
                            />
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
          <Alert className="mb-4" tone="error" title="Could not load playbook">{error}</Alert>
        )}
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" label="Loading playbook" />
          </div>
        ) : (
          <PlayGrid
            plays={filteredPlays}
            isCoach={isCoach}
            copiedIds={copiedIds}
            onCopyPlay={handleCopyPlay}
            onPreview={(play) =>
              navigate(`/app/plays/${play.id}`, {
                state: {
                  play,
                  backTo: `/app/playbooks/${sectionId}`,
                  backLabel: "Back to Playbook",
                },
              })
            }
          />
        )}
      </div>


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
    <Card
      as="button"
      type="button"
      padding="none"
      interactive
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
    </Card>
  );
}

// ── Tab selector ──────────────────────────────────────────────────────────────

/**
 * Platform / Community tab switcher with orange underline + glow on the active tab.
 * @param {{ activeTab: string, onChange: Function }} props
 */
function PlaybookTabs({ activeTab, onChange, hasCommunity }) {
  return (
    <Tabs
      variant="underline"
      value={activeTab}
      onChange={onChange}
      items={[
        { value: "platform", label: "Platform" },
        ...(hasCommunity ? [{ value: "community", label: "Community" }] : []),
      ]}
    />
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

/**
 * Playbooks page — shows admin-curated (Platform) and community-submitted (Community)
 * playbook sections for the team's sport. Coaches can browse, preview, and add plays.
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
  const [activeTab, setActiveTab] = useState("platform");

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

  // Split into platform (default/curated) and community sections
  const platformSections = sections.filter((s) => s.isDefault);
  const communitySections = sections.filter((s) => !s.isDefault);
  const visibleSections = activeTab === "platform" ? platformSections : communitySections;

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
    <div className="overflow-y-auto min-h-full px-6 py-8">
      <div className="mb-2">
        <h1 className="font-Manrope text-xl font-bold text-BrandText">Playbook Library</h1>
        <p className="mt-1 text-sm text-BrandGray">
          {teamSport
            ? `Browse ${teamSport} play collections. Add plays to your team's playbook with one click.`
            : "Browse play collections. Add plays to your team's playbook with one click."
          }
        </p>
      </div>

      {/* Tab selector — sits between header and content, below the nav */}
      <div className="mb-6 border-b border-BrandGray2/15 pt-4">
        <PlaybookTabs activeTab={activeTab} onChange={setActiveTab} hasCommunity={communitySections.length > 0} />
      </div>

      {error && (
        <Alert className="mb-4" tone="error" title="Could not load playbooks">{error}</Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" label="Loading playbooks" />
        </div>
      ) : visibleSections.length === 0 ? (
        <EmptyState
          icon={<FiBookOpen />}
          title={activeTab === "community" ? "No community plays yet" : "No playbooks yet"}
          description={activeTab === "community"
            ? "Plays posted to the community will appear here once published."
            : "Check back soon - collections for your sport will appear here once published."}
          contained
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSections.map((section) => (
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
