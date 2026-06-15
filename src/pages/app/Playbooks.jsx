import { Alert, Badge, BrowseTile, Button, Card, Checkbox, Chip, EmptyState, Input, Popover, SearchInput, Spinner, Tabs } from "../../design-system/components";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/api";
import {
  fetchPublishedPlaybookSections,
  filterPublishedPlaybookSectionsForSport,
} from "../../api/playbookSectionsApi";
import PlayPickerCard from "../../components/PlayPickerCard";
import {
  FiBookOpen,
  FiChevronDown,
  FiChevronLeft,
  FiCheck,
  FiFilter,
  FiPlus,
  FiSearch,
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
        <PlayPickerCard
          key={play.id}
          play={play}
          added={copiedIds.has(play.id)}
          onAdd={isCoach ? () => onCopyPlay(play) : undefined}
          onClick={() => onPreview(play)}
        />
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
  const filterBtnRef = useRef(null);

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
        <div className="border-b border-[color:var(--ui-border)] px-6 py-4">
          <Button variant="ghost"
            onClick={onBack}
            className="mb-1 flex items-center gap-1.5 text-xs text-[color:var(--ui-text-muted)] transition hover:text-[color:var(--ui-text)]"
          >
            <FiChevronLeft className="text-xs" /> All Playbooks
          </Button>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-Manrope text-lg font-bold" style={{ color: "var(--ui-text)" }}>{section?.name || "Playbook"}</h2>
              <p className="text-xs" style={{ color: "var(--ui-text-subtle)" }}>
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
          <div className="border-b border-[color:var(--ui-border)] px-6 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onClear={() => setSearch("")}
                placeholder="Search plays by title or tag..."
                className="flex-1"
              />

              <div>
                <Button variant="primary"
                  ref={filterBtnRef}
                  type="button"
                  onClick={() => setFiltersOpen((prev) => !prev)}
                  className={`flex min-w-[148px] items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                    filtersOpen || activeTags.length > 0
                      ? "border-BrandOrange/50 bg-BrandOrange/10 text-BrandOrange"
                      : "border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] text-[color:var(--ui-text-muted)] hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text)]"
                  }`}
                >
                  <FiFilter className="text-sm" />
                  Filter
                  {activeTags.length > 0 && (
                    <Badge size="xs">{activeTags.length}</Badge>
                  )}
                  <FiChevronDown className={`text-sm transition ${filtersOpen ? "rotate-180" : ""}`} />
                </Button>

                <Popover
                  open={filtersOpen}
                  anchorRef={filterBtnRef}
                  onClose={() => setFiltersOpen(false)}
                  placement="bottom-end"
                  size="md"
                >
                  <div className="p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--ui-text-subtle)" }}>
                        Section Tags
                      </p>
                      <Button variant="ghost"
                        type="button"
                        onClick={clearTagFilters}
                        disabled={activeTags.length === 0}
                        className="text-xs font-semibold text-[color:var(--ui-text-muted)] transition hover:text-BrandOrange disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Clear all
                      </Button>
                    </div>

                    {sectionTags.length === 0 ? (
                      <p className="rounded-xl border border-[color:var(--ui-border)] px-3 py-4 text-sm" style={{ backgroundColor: "var(--ui-surface-2)", color: "var(--ui-text-subtle)" }}>
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
                                  ? "border-BrandOrange/40 bg-BrandOrange/10 text-[color:var(--ui-text)]"
                                  : "border-transparent bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)] hover:border-[color:var(--ui-border)] hover:text-[color:var(--ui-text)]"
                              }`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Popover>
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
        <h1 className="font-Manrope text-xl font-bold" style={{ color: "var(--ui-text)" }}>Playbook Library</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ui-text-muted)" }}>
          {teamSport
            ? `Browse ${teamSport} play collections. Add plays to your team's playbook with one click.`
            : "Browse play collections. Add plays to your team's playbook with one click."
          }
        </p>
      </div>

      {/* Tab selector — sits between header and content, below the nav */}
      <div className="mb-6 border-b border-[color:var(--ui-border)] pt-4">
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
              color="var(--ui-accent)"
              icon={<FiBookOpen />}
              title={section.name}
              description={section.description}
              count={section.playCount}
              countLabel={section.playCount === 1 ? "play" : "plays"}
              onClick={() => navigate(`/app/playbooks/${section.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
