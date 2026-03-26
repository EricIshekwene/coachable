import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logos/White_Full_Coachable.png";
import { FiArrowRight, FiPlay, FiUsers, FiLayers, FiChevronDown, FiPlus, FiCheck } from "react-icons/fi";
import { createPlay } from "../utils/apiPlays";

// Local photography assets
import filmSessionLong from "../assets/pictures/film_session_long.png";
import coachStudyingLong from "../assets/pictures/coach_studying_long.png";
import coachesTogetherLong from "../assets/pictures/coaches_together_long.png";
import oldWhiteboardLong from "../assets/pictures/old_whiteboard_long.png";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const RESOURCES_ITEMS = [
  { label: "FAQs", to: "/faqs" },
  { label: "Contact Us", to: "/contact" },
  { label: "About Us", to: "/about" },
];

const STATS = [
  { value: "98%", label: "Team Retention" },
  { value: "12+", label: "Team Sports Supported" },
  { value: "30%", label: "Of Practice Time Saved" },
];

/**
 * Landing page for unauthenticated users.
 * Displays the hero, bento feature grid, stats, featured plays, and footer.
 */
export default function Landing() {
  const { user } = useAuth();
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [featuredPlays, setFeaturedPlays] = useState([]);
  const [addingPlay, setAddingPlay] = useState(null);
  const [addedPlay, setAddedPlay] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/platform-plays`)
      .then((r) => r.json())
      .then((data) => setFeaturedPlays(data.plays || []))
      .catch(() => {});
  }, []);

  /**
   * Copies a platform play into the current user's team playbook.
   * @param {object} play - The platform play object to add.
   */
  const handleAddToPlaybook = useCallback(async (play) => {
    if (!user?.teamId) return;
    setAddingPlay(play.id);
    try {
      const res = await fetch(`${API_URL}/platform-plays/${play.id}`);
      const data = await res.json();
      await createPlay(user.teamId, {
        title: play.title,
        playData: data.play?.playData || null,
        tags: play.tags || [],
      });
      setAddedPlay(play.id);
      setTimeout(() => setAddedPlay(null), 2500);
    } catch {
      // Silently ignore — user can retry
    } finally {
      setAddingPlay(null);
    }
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setResourcesOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      className="bg-BrandBlack text-white font-DmSans hide-scroll"
      style={{ height: "100dvh", overflowY: "auto" }}
    >
      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-BrandBlack/70 backdrop-blur-xl border-b border-BrandGray2/10">
        <div className="flex items-center px-6 h-16 md:px-12 lg:px-20 max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex flex-1 items-center">
            <img src={logo} alt="Coachable" className="h-7 md:h-8" />
          </div>

          {/* Center links */}
          <div className="hidden flex-1 items-center justify-center gap-8 md:flex">
            <Link to="/enterprise" className="text-sm text-BrandGray transition hover:text-white">
              Enterprise
            </Link>
            <Link to="/product" className="text-sm text-BrandGray transition hover:text-white">
              Product
            </Link>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="flex items-center gap-1 text-sm text-BrandGray transition hover:text-white"
              >
                Resources
                <FiChevronDown className={`text-xs transition ${resourcesOpen ? "rotate-180" : ""}`} />
              </button>
              {resourcesOpen && (
                <div className="absolute left-1/2 top-full z-30 mt-3 w-44 -translate-x-1/2 rounded-lg border border-BrandGray2/30 bg-BrandBlack2 shadow-xl">
                  <div className="py-1">
                    {RESOURCES_ITEMS.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setResourcesOpen(false)}
                        className="block px-4 py-2.5 text-sm text-BrandGray transition hover:bg-BrandOrange/10 hover:text-white"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Auth buttons */}
          <div className="flex flex-1 items-center justify-end gap-3">
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
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background image + overlays */}
        <div className="absolute inset-0 z-0">
          <img
            src={filmSessionLong}
            alt="Coaching film session"
            className="w-full h-full object-cover"
          />
          {/* Left-to-right dark gradient so text stays legible */}
          <div className="absolute inset-0 bg-linear-to-r from-BrandBlack via-BrandBlack/75 to-BrandBlack/20" />
          {/* Subtle bottom vignette */}
          <div className="absolute inset-0 bg-linear-to-t from-BrandBlack via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-20 w-full py-32">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-BrandGray2/40 bg-BrandBlack/50 backdrop-blur-sm px-4 py-1.5 text-xs text-BrandGray">
              <span className="h-1.5 w-1.5 rounded-full bg-BrandGreen animate-pulse" />
              Now in beta
            </div>

            <h1 className="font-Manrope text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6 drop-shadow-2xl">
              Design plays.
              <br />
              <span className="text-BrandOrange">Win games.</span>
            </h1>

            <p className="font-Manrope text-xl md:text-2xl text-white/90 font-medium leading-relaxed mb-4 drop-shadow-lg">
              The modern playbook platform for coaches and teams.
            </p>

            <p className="text-base text-BrandGray mb-10 max-w-lg leading-relaxed">
              Create, share, and animate plays with a beautiful drag-and-drop editor.
              Stop relying on whiteboards — go digital.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-BrandOrange px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-BrandOrange/20 transition hover:brightness-110 active:scale-[0.97]"
              >
                Start for free
                <FiArrowRight className="transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/slate"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-BrandGray2/50 bg-white/5 backdrop-blur-sm px-8 py-4 text-sm text-BrandGray transition hover:border-BrandGray/60 hover:text-white hover:bg-white/10"
              >
                <FiPlay className="text-xs" />
                See it in action
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── Trusted By ── */}
      <section className="py-14 bg-BrandBlack border-y border-BrandGray2/10">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <p className="text-center text-sm uppercase tracking-widest font-semibold text-BrandGray mb-10">
            Trusted by university programs and private coaches alike
          </p>
          {/* Schools — force single line, scroll on very small screens */}
          <div className="flex items-center justify-center gap-8 overflow-x-auto hide-scroll pb-1">
            {["Ohio State", "Penn State", "Queens", "Principia", "Belmont Abbey"].map((school, i) => (
              <span key={school} className="flex items-center gap-8 shrink-0">
                <span className="font-Manrope text-2xl font-bold text-white hover:text-BrandOrange transition-colors whitespace-nowrap">
                  {school}
                </span>
                {i < 4 && <span className="w-1.5 h-1.5 rounded-full bg-BrandOrange/50 shrink-0" />}
              </span>
            ))}
          </div>
          <p className="text-center mt-6 font-Manrope text-2xl font-bold text-BrandGray">& more</p>
        </div>
      </section>

      {/* ── Bento Feature Grid ── */}
      <section className="py-24 bg-BrandBlack">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="mb-16">
            <h2 className="font-Manrope text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Core Capabilities
            </h2>
            <div className="w-16 h-0.5 bg-BrandOrange" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

            {/* Visualize — large landscape card, dark styled */}
            <div className="md:col-span-8 group relative overflow-hidden rounded-2xl min-h-95 flex flex-col justify-between bg-BrandBlack border border-BrandGray2/10">
              {/* Shine sweep */}
              <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/3 blur-2xl pointer-events-none" />
              {/* Orange glow */}
              <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-BrandOrange/8 blur-3xl pointer-events-none" />

              {/* Mock canvas preview */}
              <div className="relative z-10 flex-1 p-8 flex items-center justify-center">
                <div className="w-full max-w-xs aspect-video rounded-xl border border-BrandGray2/30 bg-BrandBlack/60 flex items-center justify-center relative overflow-hidden shadow-2xl">
                  {/* Field lines suggestion */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-BrandGray2" />
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-BrandGray2" />
                    <div className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full border border-BrandGray2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  {/* Player dots */}
                  <div className="absolute top-1/3 left-1/4 w-3 h-3 rounded-full bg-BrandOrange shadow-lg shadow-BrandOrange/40" />
                  <div className="absolute top-1/2 left-1/3 w-3 h-3 rounded-full bg-BrandOrange shadow-lg shadow-BrandOrange/40" />
                  <div className="absolute top-2/3 left-1/4 w-3 h-3 rounded-full bg-BrandOrange shadow-lg shadow-BrandOrange/40" />
                  <div className="absolute top-1/3 left-2/3 w-3 h-3 rounded-full bg-white/60" />
                  <div className="absolute top-1/2 left-3/4 w-3 h-3 rounded-full bg-white/60" />
                  <div className="absolute top-2/3 left-2/3 w-3 h-3 rounded-full bg-white/60" />
                  {/* Arrow suggestion */}
                  <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 200 120">
                    <path d="M 50 40 Q 100 60 140 40" stroke="#FF7A18" strokeWidth="1.5" fill="none" strokeDasharray="4 2" markerEnd="url(#arrowhead)" />
                    <defs>
                      <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                        <path d="M 0 0 L 6 3 L 0 6 z" fill="#FF7A18" />
                      </marker>
                    </defs>
                  </svg>
                </div>
              </div>

              <div className="relative z-10 p-8 pt-0">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-BrandOrange/20">
                  <FiLayers className="text-BrandOrange text-lg" />
                </div>
                <h3 className="font-Manrope text-2xl font-bold mb-2 text-white">Visualize</h3>
                <p className="text-BrandGray max-w-md leading-relaxed">
                  Design plays, strategies, and training plans digitally. Drag-and-drop simplicity with professional results.
                </p>
              </div>
            </div>

            {/* Animate — tall card, dark bg */}
            <div className="md:col-span-4 group relative overflow-hidden rounded-2xl min-h-95 flex flex-col bg-BrandBlack2">
              <img
                src={coachStudyingLong}
                alt="Coach studying plays"
                className="absolute inset-0 w-full h-full object-cover opacity-40 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-BrandBlack/90 via-BrandBlack/60 to-transparent" />
              <div className="relative z-10 p-8 flex flex-col h-full">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-BrandOrange/20">
                  <FiPlay className="text-BrandOrange text-lg" />
                </div>
                <h3 className="font-Manrope text-2xl font-bold mb-2 text-white">Animate</h3>
                <p className="text-BrandGray leading-relaxed">
                  Bring plays to life with keyframe animation. Export and share with your whole team instantly.
                </p>
              </div>
            </div>

            {/* Manage — tall card */}
            <div className="md:col-span-4 group relative overflow-hidden rounded-2xl min-h-95 flex flex-col">
              <img
                src={coachesTogetherLong}
                alt="Coaching staff collaborating"
                className="absolute inset-0 w-full h-full object-cover object-right transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-BrandBlack via-BrandBlack/60 to-BrandBlack/20" />
              <div className="relative z-10 p-8 flex flex-col h-full justify-end">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-BrandOrange/20">
                  <FiUsers className="text-BrandOrange text-lg" />
                </div>
                <h3 className="font-Manrope text-2xl font-bold mb-2 text-white">Manage</h3>
                <p className="text-BrandGray leading-relaxed">
                  Organize rosters, track player progress, and centralize your entire coaching operation.
                </p>
              </div>
            </div>

            {/* Share — large landscape card, dark styled */}
            <div className="md:col-span-8 group relative overflow-hidden rounded-2xl min-h-95 flex flex-col justify-between bg-BrandBlack border border-BrandGray2/10">
              {/* Shine sweep */}
              <div className="absolute -top-32 right-0 w-96 h-96 rounded-full bg-white/3 blur-2xl pointer-events-none" />
              {/* Orange glow */}
              <div className="absolute -bottom-16 right-8 w-72 h-72 rounded-full bg-BrandOrange/8 blur-3xl pointer-events-none" />

              {/* Mock sharing UI */}
              <div className="relative z-10 flex-1 p-8 flex items-center justify-center">
                <div className="w-full max-w-sm space-y-2">
                  {/* Link share row */}
                  <div className="flex items-center gap-3 rounded-xl border border-BrandGray2/30 bg-BrandBlack/60 px-4 py-3">
                    <div className="flex-1 truncate text-xs text-BrandGray font-mono">coachable.app/play/linebacker-blitz</div>
                    <div className="shrink-0 rounded-md bg-BrandOrange/20 px-2.5 py-1 text-[10px] font-semibold text-BrandOrange">Copy</div>
                  </div>
                  {/* Player avatars */}
                  <div className="flex items-center gap-3 rounded-xl border border-BrandGray2/20 bg-BrandBlack/40 px-4 py-3">
                    <div className="flex -space-x-2">
                      {["#FF7A18","#4FA85D","#9AA0A6","#2a2e34"].map((c, i) => (
                        <div key={i} className="w-7 h-7 rounded-full border-2 border-BrandBlack2 flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: c }}>{["JR","KD","MT","+3"][i]}</div>
                      ))}
                    </div>
                    <span className="text-xs text-BrandGray">4 teammates have access</span>
                    <div className="ml-auto w-2 h-2 rounded-full bg-BrandGreen animate-pulse" />
                  </div>
                  {/* Permission row */}
                  <div className="flex items-center justify-between rounded-xl border border-BrandGray2/20 bg-BrandBlack/40 px-4 py-3">
                    <span className="text-xs text-BrandGray">View only</span>
                    <div className="flex gap-1">
                      <div className="rounded-md bg-BrandOrange/20 px-2 py-0.5 text-[10px] text-BrandOrange font-semibold">View</div>
                      <div className="rounded-md bg-BrandGray2/20 px-2 py-0.5 text-[10px] text-BrandGray2">Edit</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 p-8 pt-0">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-BrandOrange/20">
                  <FiUsers className="text-BrandOrange text-lg" />
                </div>
                <h3 className="font-Manrope text-2xl font-bold mb-2 text-white">Share</h3>
                <p className="text-BrandGray max-w-md leading-relaxed">
                  Instant access for players and coaches anywhere, anytime. One link, the whole playbook.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="py-20 bg-BrandBlack2/40 border-y border-BrandGray2/10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <div className="font-Manrope text-4xl md:text-5xl font-bold text-white mb-1">{value}</div>
              <div className="text-xs uppercase tracking-widest font-semibold text-BrandOrange">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Plays ── */}
      {featuredPlays.length > 0 && (
        <section className="py-24 bg-BrandBlack">
          <div className="max-w-5xl mx-auto px-6 md:px-12">
            <div className="mb-10">
              <h2 className="font-Manrope text-3xl font-bold mb-3">Example Plays</h2>
              <p className="text-sm text-BrandGray">
                Explore ready-made plays created by our team. Add any play directly to your playbook.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredPlays.map((play) => {
                const isAdding = addingPlay === play.id;
                const isAdded = addedPlay === play.id;
                return (
                  <div
                    key={play.id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-BrandGray2/40 bg-BrandBlack2/60 transition hover:border-BrandOrange/30"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-[#0e1016]">
                      {play.thumbnail ? (
                        <img
                          src={play.thumbnail}
                          alt={play.title}
                          className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <FiPlay className="text-3xl text-BrandGray2" />
                        </div>
                      )}
                      {play.sport && (
                        <span className="absolute left-3 top-3 rounded-full bg-BrandBlack/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-BrandGray backdrop-blur-sm">
                          {play.sport}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="font-Manrope text-sm font-semibold text-white">{play.title}</h3>
                      {play.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-BrandGray">
                          {play.description}
                        </p>
                      )}
                      {play.tags?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {play.tags.map((tag) => (
                            <span key={tag} className="rounded bg-white/6 px-1.5 py-0.5 text-[10px] text-BrandGray2">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {user?.teamId && (
                        <button
                          onClick={() => handleAddToPlaybook(play)}
                          disabled={isAdding || isAdded}
                          className={`mt-4 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition active:scale-[0.97] disabled:cursor-default ${
                            isAdded
                              ? "bg-BrandGreen/15 text-BrandGreen"
                              : "bg-BrandOrange/15 text-BrandOrange hover:bg-BrandOrange/25"
                          }`}
                        >
                          {isAdded ? (
                            <><FiCheck className="text-sm" />Added to playbook</>
                          ) : isAdding ? (
                            <><span className="inline-block h-3 w-3 rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange animate-spin" />Adding...</>
                          ) : (
                            <><FiPlus className="text-sm" />Add to playbook</>
                          )}
                        </button>
                      )}
                      {!user && (
                        <Link
                          to="/signup"
                          className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-BrandOrange/15 px-4 py-2 text-xs font-semibold text-BrandOrange transition hover:bg-BrandOrange/25"
                        >
                          <FiPlus className="text-sm" />
                          Sign up to use this play
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Closing CTA ── */}
      <section className="relative py-32 overflow-hidden">
        {/* Subtle whiteboard image as muted background */}
        <img
          src={oldWhiteboardLong}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-linear-to-b from-BrandBlack/80 via-BrandBlack/60 to-BrandBlack" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-Manrope text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Ready to elevate <br />
            <span className="text-BrandOrange">your game?</span>
          </h2>
          <p className="text-BrandGray text-lg mb-10 leading-relaxed">
            Join coaches moving from legacy whiteboards to a digital-first playbook platform.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-BrandOrange px-10 py-5 text-base font-semibold text-white shadow-xl shadow-BrandOrange/20 transition hover:brightness-110 active:scale-[0.97]"
          >
            Start Your Free Season
            <FiArrowRight />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-BrandBlack border-t border-BrandGray2/20 py-12 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <img src={logo} alt="Coachable" className="h-7 mb-4" />
            <p className="text-BrandGray text-sm leading-relaxed">
              Elevating the world's most competitive teams through tactical digital innovation.
            </p>
          </div>

          <div>
            <h4 className="font-Manrope text-xs font-bold uppercase tracking-widest text-white mb-5">Product</h4>
            <ul className="space-y-3 text-sm text-BrandGray">
              <li><Link to="/product" className="transition hover:text-white">Features</Link></li>
              <li><Link to="/product" className="transition hover:text-white">Tactical Boards</Link></li>
              <li><Link to="/pricing" className="transition hover:text-white">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-Manrope text-xs font-bold uppercase tracking-widest text-white mb-5">Company</h4>
            <ul className="space-y-3 text-sm text-BrandGray">
              <li><Link to="/privacy" className="transition hover:text-white">Privacy Policy</Link></li>
              <li><Link to="/terms" className="transition hover:text-white">Terms of Service</Link></li>
              <li><Link to="/contact" className="transition hover:text-white">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-Manrope text-xs font-bold uppercase tracking-widest text-white mb-5">Social</h4>
            <ul className="space-y-3 text-sm text-BrandGray">
              <li><a href="#" className="transition hover:text-white">Twitter</a></li>
              <li><a href="#" className="transition hover:text-white">Instagram</a></li>
              <li><a href="#" className="transition hover:text-white">LinkedIn</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-BrandGray2/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-BrandGray2">© {new Date().getFullYear()} Coachable. All rights reserved.</p>
          <a href="#" className="text-xs text-BrandGray2 transition hover:text-BrandOrange">Cookie Settings</a>
        </div>
      </footer>
    </div>
  );
}
