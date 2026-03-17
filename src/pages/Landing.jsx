import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logos/White_Full_Coachable.png";
import { FiArrowRight, FiPlay, FiUsers, FiLayers, FiChevronDown, FiPlus, FiCheck } from "react-icons/fi";
import { createPlay } from "../utils/apiPlays";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const RESOURCES_ITEMS = [
  { label: "FAQs", to: "/faqs" },
  { label: "Contact Us", to: "/contact" },
  { label: "About Us", to: "/about" },
];

export default function Landing() {
  const { user } = useAuth();
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ── Featured plays ──
  const [featuredPlays, setFeaturedPlays] = useState([]);
  const [addingPlay, setAddingPlay] = useState(null); // id of play being added
  const [addedPlay, setAddedPlay] = useState(null);   // id of recently added play

  useEffect(() => {
    fetch(`${API_URL}/platform-plays`)
      .then((r) => r.json())
      .then((data) => setFeaturedPlays(data.plays || []))
      .catch(() => {});
  }, []);

  const handleAddToPlaybook = useCallback(async (play) => {
    if (!user?.teamId) return;
    setAddingPlay(play.id);
    try {
      // Fetch full play data (includes playData field)
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
    <div className="bg-BrandBlack text-white font-DmSans hide-scroll" style={{ height: "100dvh", overflowY: "auto" }}>
      {/* Nav */}
      <nav className="flex items-center px-6 py-4 md:px-12 lg:px-20">
        {/* Left: Logo */}
        <div className="flex flex-1 items-center">
          <img src={logo} alt="Coachable" className="h-10 md:h-12" />
        </div>

        {/* Center nav links */}
        <div className="hidden flex-1 items-center justify-center gap-8 md:flex">
          <Link
            to="/enterprise"
            className="text-sm text-BrandGray transition hover:text-white"
          >
            Enterprise
          </Link>
          <Link
            to="/product"
            className="text-sm text-BrandGray transition hover:text-white"
          >
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

        {/* Right auth buttons */}
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
      </nav>

      {/* Hero */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pt-24 pb-20 text-center md:pt-36 md:pb-28">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-BrandGray2 bg-BrandBlack2 px-4 py-1.5 text-xs text-BrandGray">
          <span className="h-1.5 w-1.5 rounded-full bg-BrandGreen animate-pulse" />
          Now in beta
        </div>
        <h1 className="font-Manrope text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
          Design plays.
          <br />
          <span className="text-BrandOrange">Win games.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-BrandGray md:text-lg">
          The modern playbook platform for coaches and teams. Create, share, and animate plays with a beautiful drag-and-drop editor.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            to="/signup"
            className="group flex items-center gap-2 rounded-xl bg-BrandOrange px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
          >
            Start for free
            <FiArrowRight className="transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-xl border border-BrandGray2 px-6 py-3 text-sm text-BrandGray transition hover:border-BrandGray hover:text-white"
          >
            <FiPlay className="text-xs" />
            See it in action
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-28 md:grid-cols-3 md:px-12">
        {[
          {
            icon: <FiLayers className="text-xl text-BrandOrange" />,
            title: "Drag & Drop Editor",
            desc: "Place players, draw routes, and animate plays on a beautiful canvas.",
          },
          {
            icon: <FiUsers className="text-xl text-BrandOrange" />,
            title: "Team Collaboration",
            desc: "Share your playbook with your team. Players view, coaches create.",
          },
          {
            icon: <FiPlay className="text-xl text-BrandOrange" />,
            title: "Animate & Export",
            desc: "Bring plays to life with keyframe animation and export to share.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="group rounded-xl border border-BrandGray2/50 bg-BrandBlack2/50 p-6 transition hover:border-BrandOrange/30 hover:bg-BrandBlack2"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-BrandOrange/10">
              {f.icon}
            </div>
            <h3 className="mb-2 font-Manrope text-base font-semibold">{f.title}</h3>
            <p className="text-sm leading-relaxed text-BrandGray">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Featured Plays */}
      {featuredPlays.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pb-28 md:px-12">
          <div className="mb-8 text-center">
            <h2 className="font-Manrope text-2xl font-bold md:text-3xl">
              Example Plays
            </h2>
            <p className="mt-3 text-sm text-BrandGray">
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
                  {/* Thumbnail */}
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

                  {/* Info */}
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

                    {/* Add to playbook button — only shown when logged in with a team */}
                    {user?.teamId && (
                      <button
                        onClick={() => handleAddToPlaybook(play)}
                        disabled={isAdding || isAdded}
                        className={`mt-4 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition active:scale-[0.97] disabled:cursor-default ${
                          isAdded
                            ? "bg-green-500/15 text-green-400"
                            : "bg-BrandOrange/15 text-BrandOrange hover:bg-BrandOrange/25"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <FiCheck className="text-sm" />
                            Added to playbook
                          </>
                        ) : isAdding ? (
                          <>
                            <span className="inline-block h-3 w-3 rounded-full border-2 border-BrandOrange/30 border-t-BrandOrange animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <FiPlus className="text-sm" />
                            Add to playbook
                          </>
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
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-BrandGray2/30 py-8 text-center text-xs text-BrandGray2">
        &copy; {new Date().getFullYear()} Coachable. All rights reserved.
      </footer>
    </div>
  );
}
