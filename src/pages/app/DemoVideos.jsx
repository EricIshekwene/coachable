/**
 * How To page — searchable FAQs and tutorial videos.
 * FAQs are hardcoded with embedded keywords for search.
 * Videos are fetched from the API and use their admin-managed keyword list.
 * A single search bar filters both simultaneously.
 *
 * @module DemoVideos
 */
import { useState, useEffect, useMemo } from "react";
import { FiPlay, FiClock, FiSearch, FiX, FiChevronDown } from "react-icons/fi";
import { apiFetch } from "../../utils/api";

// ── Hardcoded FAQ data (keywords embedded for search, not shown to user) ──────

const HOW_TO_FAQS = [
  {
    q: "How do I change a player's tag and name?",
    a: "Click any player on the canvas to select them, then use the right-hand panel to edit their number (tag) and name. Changes save immediately and apply across all keyframes.",
    keywords: "rename player name tag number jersey label assign edit change update",
  },
  {
    q: "How do I animate player movement?",
    a: "Drag players to their starting positions, then press the + button in the timeline at the bottom to set a keyframe. Move players to their next positions and add another keyframe. Hit Play to preview the full animation.",
    keywords: "animate animation movement motion path route drag keyframe play preview",
  },
  {
    q: "How do I use keyframes?",
    a: "Keyframes are snapshots of player positions at a point in time. Add one at any point in the timeline using the + button, then drag players to where they should be at that moment. Coachable smoothly interpolates positions between keyframes automatically.",
    keywords: "keyframe timeline timing snapshot interpolate scrub position add remove delete",
  },
  {
    q: "How do I change player sizes?",
    a: "Select one or more players on the canvas, then use the Size control in the right panel. You can also resize directly by dragging the corner handles of a selected player.",
    keywords: "player size resize scale big small larger smaller handles adjust",
  },
  {
    q: "How do I add opposition players?",
    a: "In the left sidebar, change the player color to a different team color before placing new players. You can also select existing players and change their color in the right panel to designate them as the opposing team.",
    keywords: "opposition opponent enemy defense attack color team other side blue red add",
  },
  {
    q: "How do I draw diagrams and routes?",
    a: "Select the Draw tool from the canvas toolbar. Choose between free-draw, arrow, or line modes. Click and drag on the field to draw routes, blocks, and zone diagrams. Use arrows to show player movement paths.",
    keywords: "draw diagram route arrow line path zone block freehand sketch drawing shape",
  },
  {
    q: "How do I enter view only mode?",
    a: "View only (Player View) mode lets you preview how a play looks to your players. Toggle it from the Settings page in the app sidebar. In this mode editing is disabled so you see exactly what players see.",
    keywords: "view only player view preview read only lock disable edit mode toggle",
  },
  {
    q: "How do I edit the field orientation?",
    a: "Open the settings panel on the right side of the play editor. Use the Rotate Field control to flip the field horizontally or rotate it to match your preferred attacking direction.",
    keywords: "field orientation rotate flip direction attacking defending horizontal vertical landscape portrait",
  },
  {
    q: "How do I use Prefabs?",
    a: "Prefabs are saved groups of players and drawings you can reuse across plays. Select elements on the canvas, then save them as a Prefab from the right-click menu. Find your prefabs in the left sidebar to drag into any play.",
    keywords: "prefab template formation save group reuse preset drop drag formation package",
  },
  {
    q: "How do I create a new play?",
    a: "From your Plays page, click New Play. Give it a title, choose your sport, and you'll land in the editor where you can place players, draw routes, and add keyframe animations straight away.",
    keywords: "create new play start begin blank fresh formation add build",
  },
  {
    q: "How do I share a play with my team?",
    a: "Open any play and click the Share button. You can generate a view-only link that anyone on your roster can open in a browser — no login required for viewing.",
    keywords: "share link team player view send invite access roster public link",
  },
  {
    q: "How do I undo a mistake?",
    a: "Press Ctrl+Z (or Cmd+Z on Mac) to undo your last action. Use Ctrl+Shift+Z to redo. Undo history is maintained throughout your session.",
    keywords: "undo redo mistake ctrl z history revert back previous",
  },
];

// ── YouTube helpers ───────────────────────────────────────────────────────────

/**
 * Extract the YouTube video ID from a URL or bare ID string.
 * @param {string|null} input
 * @returns {string|null}
 */
function extractYouTubeId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("?")[0];
    if (url.searchParams.has("v")) return url.searchParams.get("v");
    const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return embedMatch[1];
  } catch { /* not a URL */ }
  return null;
}

/** @param {string} id */
function buildEmbedUrl(id) {
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&autoplay=1`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * Accordion FAQ item with optional linked video button.
 * @param {Object} props
 * @param {string} props.q
 * @param {string} props.a
 * @param {Object|null} props.linkedVideo
 * @param {Function} props.onPlayVideo
 */
function FAQItem({ q, a, linkedVideo, onPlayVideo }) {
  const [open, setOpen] = useState(false);
  const ytId = linkedVideo ? extractYouTubeId(linkedVideo.youtubeUrl) : null;
  const videoReady = linkedVideo?.done && ytId;

  return (
    <div className="border-b border-BrandGray2/15 last:border-b-0">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-start justify-between gap-4 py-4 text-left"
      >
        <span className={`text-sm font-semibold leading-snug transition-colors ${open ? "text-BrandText" : "text-BrandGray"}`}>
          {q}
        </span>
        <FiChevronDown className={`mt-0.5 shrink-0 text-BrandOrange transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? "max-h-72 pb-4" : "max-h-0"}`}>
        <p className="text-sm leading-relaxed text-BrandGray2">{a}</p>
        {videoReady && (
          <button
            onClick={() => onPlayVideo(ytId)}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-BrandOrange transition hover:underline"
          >
            <FiPlay className="text-[11px]" />
            Watch video
          </button>
        )}
        {linkedVideo && !videoReady && (
          <p className="mt-2 text-xs italic text-BrandGray2/60">Video coming soon</p>
        )}
      </div>
    </div>
  );
}

/**
 * Single video card.
 * @param {Object} props
 * @param {Object} props.video
 * @param {Function} props.onPlay
 */
function VideoCard({ video, onPlay }) {
  const ytId = extractYouTubeId(video.youtubeUrl);
  const isReady = video.done && ytId;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition ${
        isReady
          ? "cursor-pointer border-BrandGray2/20 hover:border-BrandOrange/60"
          : "cursor-default border-BrandGray2/10 opacity-60"
      }`}
      onClick={() => isReady && onPlay(ytId)}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-BrandBlack2">
        {ytId ? (
          <img
            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
            alt={video.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FiClock className="text-3xl text-BrandGray2/30" />
          </div>
        )}
        {isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-BrandOrange shadow-lg">
              <FiPlay className="ml-0.5 text-xl text-white" />
            </div>
          </div>
        )}
        {!isReady && (
          <div className="absolute bottom-2 left-2">
            <span className="rounded-full bg-BrandBlack/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-BrandGray2 backdrop-blur-sm">
              Coming Soon
            </span>
          </div>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className={`text-sm font-medium leading-snug ${isReady ? "text-BrandText" : "text-BrandGray"}`}>
          {video.title}
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * How To page — searchable FAQs and tutorial videos.
 */
export default function DemoVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeYtId, setActiveYtId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/demo-videos")
      .then((data) => setVideos(data.videos || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Match each FAQ to its corresponding video by title word overlap
  const faqsWithVideos = useMemo(() => {
    return HOW_TO_FAQS.map((faq) => {
      const faqWords = faq.q.toLowerCase().split(/\W+/).filter(Boolean);
      const linked = videos.find((v) => {
        const titleWords = v.title.toLowerCase().split(/\W+/).filter(Boolean);
        const overlap = titleWords.filter((w) => faqWords.includes(w) && w.length > 3);
        return overlap.length >= 2;
      });
      return { ...faq, linkedVideo: linked || null };
    });
  }, [videos]);

  const q = search.trim().toLowerCase();

  const filteredFaqs = useMemo(() => {
    if (!q) return faqsWithVideos;
    return faqsWithVideos.filter((faq) => {
      const haystack = [faq.q, faq.a, faq.keywords].join(" ").toLowerCase();
      return q.split(/\s+/).every((word) => haystack.includes(word));
    });
  }, [faqsWithVideos, q]);

  const filteredVideos = useMemo(() => {
    if (!q) return videos;
    return videos.filter((v) => {
      const haystack = [v.title, v.keywords].join(" ").toLowerCase();
      return q.split(/\s+/).every((word) => haystack.includes(word));
    });
  }, [videos, q]);

  const readyVideos = filteredVideos.filter((v) => v.done && extractYouTubeId(v.youtubeUrl));
  const comingSoonVideos = filteredVideos.filter((v) => !v.done || !extractYouTubeId(v.youtubeUrl));
  const hasAnyResults = filteredFaqs.length > 0 || filteredVideos.length > 0;

  return (
    <div className="overflow-y-auto px-4 py-6 sm:px-6 sm:py-8" style={{ minHeight: "100%" }}>
      {/* Video player modal */}
      {activeYtId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setActiveYtId(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={buildEmbedUrl(activeYtId)}
                className="absolute inset-0 h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title="Tutorial video"
              />
            </div>
            <div className="flex justify-end border-t border-BrandGray2/20 bg-[#1a1a1a] px-4 py-2">
              <button onClick={() => setActiveYtId(null)} className="text-xs text-BrandGray transition hover:text-white">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <h1 className="font-Manrope text-2xl font-bold">How To</h1>
        <p className="mt-1 text-sm text-BrandGray">Guides and videos to help you get the most out of Coachable</p>
      </div>

      {/* Search */}
      <div className="relative mb-8 max-w-md">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-BrandGray2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search guides and videos…"
          className="w-full rounded-xl border border-BrandGray2/20 bg-BrandBlack2 py-2.5 pl-9 pr-9 text-sm text-BrandText outline-none transition focus:border-BrandOrange placeholder:text-BrandGray2"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-BrandGray2 transition hover:text-BrandText"
          >
            <FiX className="text-sm" />
          </button>
        )}
      </div>

      {/* No results */}
      {!loading && search && !hasAnyResults && (
        <div className="rounded-xl border border-BrandGray2/10 py-12 text-center">
          <p className="text-BrandGray2">Nothing matched "<span className="text-BrandText">{search}</span>"</p>
          <button onClick={() => setSearch("")} className="mt-2 text-sm text-BrandOrange hover:underline">
            Clear search
          </button>
        </div>
      )}

      {/* Videos */}
      {loading && (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-600/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {!loading && !search && videos.length === 0 && (
        <div className="rounded-xl border border-BrandGray2/10 py-12 text-center">
          <p className="text-BrandGray2">No videos yet — check back soon</p>
        </div>
      )}

      {!loading && readyVideos.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-BrandGray2">Tutorial Videos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {readyVideos.map((video) => (
              <VideoCard key={video.id} video={video} onPlay={setActiveYtId} />
            ))}
          </div>
        </section>
      )}

      {!loading && comingSoonVideos.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-BrandGray2">Coming Soon</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {comingSoonVideos.map((video) => (
              <VideoCard key={video.id} video={video} onPlay={setActiveYtId} />
            ))}
          </div>
        </section>
      )}

      {/* FAQs */}
      {filteredFaqs.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-BrandGray2">Quick Answers</h2>
          <div className="rounded-2xl border border-BrandGray2/15 bg-BrandBlack2/40 px-5">
            {filteredFaqs.map((faq) => (
              <FAQItem
                key={faq.q}
                q={faq.q}
                a={faq.a}
                linkedVideo={faq.linkedVideo}
                onPlayVideo={setActiveYtId}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
