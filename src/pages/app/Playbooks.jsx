import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";
import PlayPreviewCard from "../../components/PlayPreviewCard";
import { FiBookOpen, FiChevronLeft, FiLayout, FiPlus, FiCheck } from "react-icons/fi";

// ── API helpers ─────────────────────────���────────────────────���───────────────

/**
 * Fetch all published playbook sections with play counts.
 * @returns {Promise<Object[]>} Array of section objects
 */
async function fetchSections() {
  const data = await apiFetch("/playbook-sections");
  return data.sections || [];
}

/**
 * Fetch a single published playbook section with its plays.
 * @param {string} id - Section ID
 * @returns {Promise<{ section: Object, plays: Object[] }>}
 */
async function fetchSectionDetail(id) {
  return await apiFetch(`/playbook-sections/${id}`);
}

/**
 * Copy a single platform play to the authenticated coach's team playbook.
 * @param {string} sectionId - Section the play belongs to (used for the copy endpoint)
 * @param {string} playId - Play ID to copy
 */
async function copySinglePlay(playId) {
  return await apiFetch(`/platform-plays/${playId}/copy`, { method: "POST" });
}

/**
 * Copy all plays in a section to the authenticated coach's team playbook.
 * @param {string} sectionId - Playbook section ID
 * @param {string|null} folderId - Optional target folder in team playbook
 */
async function copySectionToTeam(sectionId, folderId = null) {
  return await apiFetch(`/playbook-sections/${sectionId}/copy`, {
    method: "POST",
    body: { folderId },
  });
}

// ── Components ───────────────────────────────────────────────────────────────

/**
 * A card for a single playbook section shown in the browse grid.
 * @param {Object} props
 * @param {Object} props.section - Section data
 * @param {Function} props.onClick - Called when card is clicked
 */
function SectionCard({ section, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-BrandGray2/20 bg-BrandBlack2 text-left transition hover:border-BrandOrange/40 hover:shadow-lg hover:shadow-BrandOrange/5"
    >
      {/* Cover area */}
      <div className="flex h-28 items-center justify-center bg-BrandOrange/5">
        <FiBookOpen className="text-4xl text-BrandOrange/40 transition group-hover:text-BrandOrange/70" />
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-Manrope text-sm font-bold text-BrandText">{section.name}</h3>
          {section.sport && (
            <span className="shrink-0 rounded-full bg-BrandOrange/10 px-2 py-0.5 text-[10px] font-semibold text-BrandOrange">
              {section.sport}
            </span>
          )}
        </div>
        {section.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-BrandGray">
            {section.description}
          </p>
        )}
        <p className="mt-auto pt-3 text-xs text-BrandGray2">
          {section.playCount} {section.playCount === 1 ? "play" : "plays"}
        </p>
      </div>
    </button>
  );
}

/**
 * Full detail view for a selected playbook section — shows all plays
 * with options to copy individual plays or the whole section.
 * @param {Object} props
 * @param {Object} props.section - Section summary object
 * @param {Function} props.onBack - Called to go back to the section list
 * @param {boolean} props.isCoach - Whether the user has a coach/owner role
 */
function SectionDetail({ section, onBack, isCoach }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedIds, setCopiedIds] = useState(new Set());
  const [copyingAll, setCopyingAll] = useState(false);
  const [allCopied, setAllCopied] = useState(false);
  const [previewPlay, setPreviewPlay] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchSectionDetail(section.id)
      .then(setDetail)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [section.id]);

  /** Copy a single play to the team playbook. */
  const handleCopyPlay = async (play) => {
    try {
      await copySinglePlay(play.id);
      setCopiedIds((prev) => new Set([...prev, play.id]));
    } catch (err) {
      setError(err.message);
    }
  };

  /** Copy all plays in this section to the team playbook. */
  const handleCopyAll = async () => {
    setCopyingAll(true);
    try {
      const result = await copySectionToTeam(section.id);
      const ids = new Set((result.plays || []).map((p) => p.id));
      // Mark all current plays as copied
      setCopiedIds(new Set(detail?.plays?.map((p) => p.id) || []));
      setAllCopied(true);
      void ids; // result used for side effect only
    } catch (err) {
      setError(err.message);
    } finally {
      setCopyingAll(false);
    }
  };

  return (
    <div className="overflow-y-auto">
      {/* Back button + heading */}
      <div className="sticky top-0 z-10 border-b border-BrandGray2/20 bg-BrandBlack/95 px-6 py-4 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="mb-1 flex items-center gap-1.5 text-xs text-BrandGray transition hover:text-BrandText"
        >
          <FiChevronLeft className="text-xs" /> All Playbooks
        </button>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-Manrope text-lg font-bold text-BrandText">{section.name}</h2>
            <p className="text-xs text-BrandGray2">
              {section.playCount} {section.playCount === 1 ? "play" : "plays"}
              {section.sport && ` · ${section.sport}`}
            </p>
          </div>
          {isCoach && detail?.plays?.length > 0 && (
            <button
              onClick={handleCopyAll}
              disabled={copyingAll || allCopied}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
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

      <div className="px-6 py-6">
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange" />
          </div>
        ) : detail?.plays?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FiBookOpen className="mb-3 text-3xl text-BrandGray2" />
            <p className="font-semibold text-BrandText">No plays in this section yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {detail?.plays?.map((play) => (
              <div
                key={play.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-BrandGray2/20 bg-BrandBlack2 transition hover:border-BrandGray2/40"
              >
                {/* Preview — click to expand */}
                <button
                  onClick={() => setPreviewPlay(play)}
                  className="relative block w-full text-left"
                >
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
                  {play.sport && (
                    <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
                      {play.sport}
                    </span>
                  )}
                </button>

                {/* Info + actions */}
                <div className="flex flex-1 flex-col p-4">
                  <h4 className="font-Manrope text-sm font-bold text-BrandText">{play.title}</h4>
                  {play.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-BrandGray">
                      {play.description}
                    </p>
                  )}
                  {play.tags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {play.tags.map((tag) => (
                        <span key={tag} className="rounded bg-BrandGray2/15 px-1.5 py-0.5 text-[10px] text-BrandGray2">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {isCoach && (
                    <button
                      onClick={() => handleCopyPlay(play)}
                      disabled={copiedIds.has(play.id)}
                      className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition disabled:opacity-70 ${
                        copiedIds.has(play.id)
                          ? "bg-green-500/10 text-green-400"
                          : "bg-BrandOrange/10 text-BrandOrange hover:bg-BrandOrange/20"
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
              <div>
                <h3 className="font-Manrope text-sm font-bold text-white">{previewPlay.title}</h3>
                {previewPlay.sport && (
                  <p className="text-xs text-BrandGray2">{previewPlay.sport}</p>
                )}
              </div>
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

// ── Main page ──────────────────────────���──────────────────────────────────────

/**
 * Playbooks page — displays all published admin-curated playbook sections.
 * Coaches can browse sections, preview plays, and copy plays or entire sections
 * to their team playbook.
 */
export default function Playbooks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCoach = user?.role === "coach" || user?.role === "owner" || user?.role === "assistant_coach";

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSection, setSelectedSection] = useState(null);
  const [sportFilter, setSportFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSections();
      setSections(data);
    } catch (err) {
      if (err.status === 401) {
        navigate("/login", { replace: true });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const sports = [...new Set(sections.map((s) => s.sport).filter(Boolean))];
  const visibleSections = sportFilter
    ? sections.filter((s) => s.sport === sportFilter)
    : sections;

  if (selectedSection) {
    return (
      <SectionDetail
        section={selectedSection}
        onBack={() => setSelectedSection(null)}
        isCoach={isCoach}
      />
    );
  }

  return (
    <div className="overflow-y-auto px-6 py-8">
      {/* Heading */}
      <div className="mb-6">
        <h1 className="font-Manrope text-xl font-bold text-BrandText">Playbook Library</h1>
        <p className="mt-1 text-sm text-BrandGray">
          Browse curated play collections. Add plays to your team&apos;s playbook with one click.
        </p>
      </div>

      {/* Sport filter */}
      {sports.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => setSportFilter("")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              !sportFilter
                ? "bg-BrandOrange text-white"
                : "bg-BrandGray2/15 text-BrandGray hover:text-BrandText"
            }`}
          >
            All
          </button>
          {sports.map((sport) => (
            <button
              key={sport}
              onClick={() => setSportFilter(sport)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                sportFilter === sport
                  ? "bg-BrandOrange text-white"
                  : "bg-BrandGray2/15 text-BrandGray hover:text-BrandText"
              }`}
            >
              {sport}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange" />
        </div>
      ) : visibleSections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-BrandGray2/20 py-20 text-center">
          <FiBookOpen className="mb-4 text-4xl text-BrandGray2" />
          <p className="font-Manrope font-semibold text-BrandText">No playbook sections yet</p>
          <p className="mt-1 text-sm text-BrandGray">Check back soon — your admin will add collections here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              onClick={() => setSelectedSection(section)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
