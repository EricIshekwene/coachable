import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiChevronDown, FiArrowRight, FiPlay, FiClock } from "react-icons/fi";
import logo from "../assets/logos/White_Full_Coachable.png";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

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

/**
 * Compact video card for the Resources page.
 * @param {Object} props
 * @param {Object} props.video
 * @param {Function} props.onPlay
 */
function ResourceVideoCard({ video, onPlay }) {
  const ytId = extractYouTubeId(video.youtubeUrl);
  const isReady = video.done && ytId;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition ${
        isReady
          ? "cursor-pointer border-BrandGray2/20 hover:border-BrandOrange/60"
          : "cursor-default border-BrandGray2/10 opacity-50"
      }`}
      onClick={() => isReady && onPlay(ytId)}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-[#1a1a1a]">
        {ytId ? (
          <img
            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
            alt={video.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FiClock className="text-2xl text-BrandGray2/30" />
          </div>
        )}
        {isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-BrandOrange shadow-lg">
              <FiPlay className="ml-0.5 text-base text-white" />
            </div>
          </div>
        )}
        {!isReady && (
          <div className="absolute bottom-1.5 left-1.5">
            <span className="rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-BrandGray2">
              Coming Soon
            </span>
          </div>
        )}
      </div>
      <div className="px-3 py-2">
        <p className={`text-xs font-medium leading-snug ${isReady ? "text-white" : "text-BrandGray"}`}>
          {video.title}
        </p>
      </div>
    </div>
  );
}

const FAQ_SECTIONS = [
  {
    category: "Getting Started",
    items: [
      {
        q: "What is Coachable?",
        a: "Coachable is a modern playbook platform built for coaches and teams. It lets you design, animate, and share plays digitally — replacing whiteboards and static PDFs with a live, interactive editor your entire staff and roster can access.",
      },
      {
        q: "Is Coachable free to use?",
        a: "Yes — Coachable is currently free during our beta period. You can sign up, create a team, and start building your playbook at no cost. We'll announce any pricing changes well in advance.",
      },
      {
        q: "What sports does Coachable support?",
        a: "Coachable supports rugby, American football, lacrosse, women's lacrosse, basketball, soccer, field hockey, and ice hockey out of the box. The play designer works for any sport that uses a field or court — our flexible canvas adapts to your sport's layout.",
      },
      {
        q: "Do I need an account to try the play designer?",
        a: 'No account needed to explore. Visit the Play Designer at coachable.app/slate and start drawing plays immediately. Sign up when you\'re ready to save, share, and animate your work.',
      },
    ],
  },
  {
    category: "Using the Platform",
    items: [
      {
        q: "How do I create my first play?",
        a: "After signing up and creating a team, head to your Plays page and click New Play. You'll land in the drag-and-drop editor where you can place players, draw routes, set formations, and add keyframe animations — all in one place.",
      },
      {
        q: "How does play animation work?",
        a: "The editor uses a keyframe-based animation system. Drag players to a position, set a keyframe at that time, move them again, and set another keyframe. Coachable smoothly interpolates the movement between keyframes so your play comes to life as a short animation.",
      },
      {
        q: "How do I share a play with my team?",
        a: "Open any play and click the Share button. You can generate a view-only link that anyone on your roster can open in a browser — no login required for viewing. Coaching staff with accounts can be given edit access.",
      },
      {
        q: "Can players view plays without creating an account?",
        a: "Yes. Any play shared via a public link can be viewed by players in a browser without signing up. They'll see the full animated play, routes, and any notes you've added.",
      },
      {
        q: "Can I export my plays?",
        a: "You can export plays as JSON files for backup or to import into another Coachable account. PNG export for individual frames and PDF playbook export are on our roadmap.",
      },
      {
        q: "How do I organize plays into folders or categories?",
        a: "From your Plays page you can add tags to each play and filter by tag. Folder-style organization is coming in a future update — for now, descriptive tags and clear naming conventions work well for large playbooks.",
      },
    ],
  },
  {
    category: "Teams & Collaboration",
    items: [
      {
        q: "How do I invite my coaching staff?",
        a: "Go to your Team page and share your team join link with your staff. Once they sign up and join your team they'll have access to the full playbook and can create, edit, and animate plays alongside you.",
      },
      {
        q: "Can I be on multiple teams?",
        a: "Yes. Coachable supports multi-team membership. You can switch between teams from the team switcher in the app — useful if you coach multiple programs or work with both a varsity and JV squad.",
      },
      {
        q: "Can multiple coaches edit the same play at the same time?",
        a: "Real-time multiplayer editing is on our roadmap. Currently each play is edited by one person at a time, but all saved changes are immediately visible to everyone on the team.",
      },
      {
        q: "How many players or staff can I add to my team?",
        a: "There is no hard limit during the beta. Add as many players and coaches as your program needs.",
      },
    ],
  },
  {
    category: "Technical & Privacy",
    items: [
      {
        q: "What devices does Coachable work on?",
        a: "Coachable runs in any modern desktop browser (Chrome, Firefox, Safari, Edge). The play designer is optimized for larger screens. A mobile-friendly view mode lets players review plays on phones and tablets.",
      },
      {
        q: "Is my playbook data secure?",
        a: "Yes. All data is stored securely on our servers with encrypted connections (HTTPS). Plays are private by default — only team members you invite can see them unless you deliberately share a public link.",
      },
      {
        q: "Can I delete my account or team data?",
        a: "Absolutely. You can delete individual plays from your playbook at any time. To delete your account or remove all team data, contact us at support@coachable.app and we'll handle it promptly.",
      },
      {
        q: "Does Coachable work offline?",
        a: "The editor requires an internet connection to save and sync plays. We're exploring offline-capable options for future versions, particularly for coaches working in areas with spotty connectivity.",
      },
    ],
  },
];

/**
 * Single accordion FAQ item with animated expand/collapse.
 * @param {string} q - Question text
 * @param {string} a - Answer text
 */
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-BrandGray2/15 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-4 py-5 text-left transition-colors hover:text-white"
      >
        <span className={`font-Manrope text-base font-semibold transition-colors ${open ? "text-white" : "text-BrandGray"}`}>
          {q}
        </span>
        <FiChevronDown
          className={`mt-0.5 shrink-0 text-BrandOrange transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${open ? "max-h-96 pb-5" : "max-h-0"}`}
      >
        <p className="text-sm leading-relaxed text-BrandGray2">{a}</p>
      </div>
    </div>
  );
}

/**
 * Resources / FAQ page.
 * Full-page FAQ organized by category with accordion items and tutorial videos.
 * Matches the Landing page visual language (dark theme, BrandOrange accents).
 */
export default function Resources() {
  const [videos, setVideos] = useState([]);
  const [activeYtId, setActiveYtId] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/demo-videos`)
      .then((r) => r.json())
      .then((data) => setVideos(data.videos || []))
      .catch(() => {});
  }, []);

  const readyVideos = videos.filter((v) => v.done && extractYouTubeId(v.youtubeUrl));

  return (
    <div
      className="bg-BrandBlack text-white font-DmSans"
      style={{ height: "100dvh", overflowY: "auto" }}
    >
      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-BrandBlack/70 backdrop-blur-xl border-b border-BrandGray2/10">
        <div className="flex items-center px-6 h-16 md:px-12 lg:px-20 max-w-7xl mx-auto">
          <div className="flex flex-1 items-center">
            <Link to="/">
              <img src={logo} alt="Coachable" className="h-7 md:h-8" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm text-BrandGray transition hover:text-white"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-36 pb-16 px-6 md:px-12 lg:px-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-BrandGray2/30 bg-white/4 px-4 py-1.5 text-xs text-BrandGray mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-BrandOrange" />
          Resources
        </div>
        <h1 className="font-Manrope text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-5">
          Frequently Asked
          <br />
          <span className="text-BrandOrange">Questions</span>
        </h1>
        <p className="text-BrandGray text-lg leading-relaxed max-w-xl">
          Everything you need to know about Coachable — from getting started to advanced play design.
          Can't find your answer? Reach out and we'll get back to you.
        </p>
      </section>

      {/* ── Video player modal ── */}
      {activeYtId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setActiveYtId(null)}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
              <button onClick={() => setActiveYtId(null)} className="text-xs text-BrandGray transition hover:text-white">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tutorial Videos ── */}
      {readyVideos.length > 0 && (
        <section className="pb-16 px-6 md:px-12 lg:px-20 max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <span className="h-px flex-1 bg-BrandGray2/15" />
            <span className="font-Manrope text-xs font-bold uppercase tracking-widest text-BrandOrange shrink-0">Tutorial Videos</span>
            <span className="h-px flex-1 bg-BrandGray2/15" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {readyVideos.map((video) => (
              <ResourceVideoCard key={video.id} video={video} onPlay={setActiveYtId} />
            ))}
          </div>
        </section>
      )}

      {/* ── FAQ Sections ── */}
      <section className="pb-24 px-6 md:px-12 lg:px-20 max-w-4xl mx-auto">
        <div className="space-y-12">
          {FAQ_SECTIONS.map((section) => (
            <div key={section.category}>
              {/* Section header */}
              <div className="flex items-center gap-4 mb-6">
                <span className="h-px flex-1 bg-BrandGray2/15" />
                <span className="font-Manrope text-xs font-bold uppercase tracking-widest text-BrandOrange shrink-0">
                  {section.category}
                </span>
                <span className="h-px flex-1 bg-BrandGray2/15" />
              </div>

              {/* FAQ items */}
              <div className="rounded-2xl border border-BrandGray2/15 bg-BrandBlack2/40 px-6">
                {section.items.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Still have questions CTA ── */}
      <section className="pb-24 px-6 md:px-12 lg:px-20 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-BrandOrange/20 bg-BrandOrange/5 p-10 text-center">
          <h2 className="font-Manrope text-2xl font-bold mb-3">Still have questions?</h2>
          <p className="text-BrandGray mb-7 text-sm leading-relaxed max-w-md mx-auto">
            We're a small team and we read every message. Drop us a line and we'll reply within one business day.
          </p>
          <a
            href="mailto:support@coachable.app"
            className="inline-flex items-center gap-2 rounded-xl bg-BrandOrange px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-BrandOrange/20 transition hover:brightness-110 active:scale-[0.97]"
          >
            Contact Us
            <FiArrowRight />
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-BrandGray2/20 py-8 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-BrandGray2">© {new Date().getFullYear()} Coachable. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-BrandGray2">
            <Link to="/privacy" className="transition hover:text-BrandOrange">Privacy Policy</Link>
            <Link to="/terms" className="transition hover:text-BrandOrange">Terms of Service</Link>
            <Link to="/" className="transition hover:text-BrandOrange">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
