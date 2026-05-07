import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logos/White_Full_Coachable.png";
import PlayPreviewCard from "../components/PlayPreviewCard";
import { FiArrowRight, FiChevronRight, FiLayout, FiTag, FiBookOpen } from "react-icons/fi";
import SportAwarePublicNav from "../components/SportAwarePublicNav";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SPORT_LABELS = {
  rugby: "Rugby",
  football: "Football",
  lacrosse: "Lacrosse",
  basketball: "Basketball",
  soccer: "Soccer",
  "field hockey": "Field Hockey",
  "ice hockey": "Ice Hockey",
  "womens lacrosse": "Women's Lacrosse",
};

/**
 * A single play card styled to match the authenticated Playbooks page.
 * @param {Object} props
 * @param {Object} props.play
 */
function PublicPlayCard({ play }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-3xl border border-BrandGray2/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),rgba(24,26,31,0.96)] transition hover:border-BrandOrange/25 hover:shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
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
            <div className="pointer-events-none absolute right-5 top-5 rounded-full border border-black/10 bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white/85 backdrop-blur-sm">
              {play.tags.length} tag{play.tags.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="truncate font-Manrope text-sm font-bold text-BrandText">{play.title}</h4>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-BrandGray2">Play Preview</p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-BrandGray2/20 bg-BrandBlack/35 text-BrandGray transition group-hover:border-BrandOrange/30 group-hover:text-BrandOrange">
            <FiChevronRight className="text-sm" />
          </div>
        </div>
        {play.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-BrandGray">{play.description}</p>
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

        <Link
          to="/signup"
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-BrandOrange/20 bg-BrandOrange/10 py-2.5 text-xs font-semibold text-BrandOrange transition hover:bg-BrandOrange/18"
        >
          Sign up to add this play
        </Link>
      </div>
    </div>
  );
}

/**
 * Platform / Community tab switcher with orange underline + radial glow on the active tab.
 * @param {{ activeTab: string, onChange: Function }} props
 */
function PlaybookTabs({ activeTab, onChange, hasCommunity }) {
  const tabs = [
    { key: "platform", label: "Platform" },
    ...(hasCommunity ? [{ key: "community", label: "Community" }] : []),
  ];
  return (
    <div className="flex items-end gap-6">
      {tabs.map(({ key, label }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="relative pb-2.5 text-sm font-semibold transition-colors"
          >
            <span className={isActive ? "text-BrandOrange" : "text-BrandGray hover:text-white"}>
              {label}
            </span>
            {isActive && (
              <>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-BrandOrange" />
                <span
                  className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
                  style={{
                    width: "120%",
                    height: "32px",
                    background: "radial-gradient(ellipse at 50% 100%, rgba(255,122,24,0.28) 0%, transparent 70%)",
                  }}
                />
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Public-facing playbooks page for a specific sport.
 * Shows platform (curated) and community-submitted plays via a tab switcher.
 * Prompts unauthenticated visitors to create an account to access all plays.
 *
 * @param {Object} props
 * @param {string} props.sport - Sport slug used to look up the correct label and fetch plays (e.g. "rugby").
 */
export default function PublicPlaybooksPage({ sport }) {
  const [plays, setPlays] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showGate, setShowGate] = useState(false);
  const [activeTab, setActiveTab] = useState("platform");
  const [hasCommunity, setHasCommunity] = useState(false);
  const scrollContainerRef = useRef(null);
  const gateSentinelRef = useRef(null);

  const sportLabel = SPORT_LABELS[sport] ?? sport;
  const sportSlug = sport.replace(/ /g, "-");

  // Check once whether any community plays exist for this sport
  useEffect(() => {
    fetch(`${API_URL}/playbook-sections/sport/${encodeURIComponent(sportSlug)}/plays?limit=1&type=community`)
      .then((r) => r.json())
      .then((data) => setHasCommunity((data.total ?? 0) > 0))
      .catch(() => {});
  }, [sportSlug]);

  useEffect(() => {
    setLoading(true);
    setPlays([]);
    fetch(`${API_URL}/playbook-sections/sport/${encodeURIComponent(sportSlug)}/plays?limit=9&type=${activeTab}`)
      .then((r) => r.json())
      .then((data) => {
        setPlays(data.plays || []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sportSlug, activeTab]);

  const hasMore = total > plays.length;

  useEffect(() => {
    if (!hasMore || loading) {
      setShowGate(false);
      return undefined;
    }

    const root = scrollContainerRef.current;
    const sentinel = gateSentinelRef.current;

    if (!root || !sentinel || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowGate(entry.isIntersecting);
      },
      {
        root,
        threshold: 0.98,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  return (
    <div
      ref={scrollContainerRef}
      className="bg-BrandBlack text-white font-DmSans"
      style={{ height: "100dvh", overflowY: "auto" }}
    >
      {/* Nav */}
      <SportAwarePublicNav sport={sport} activePage="playbooks" />

      {/* Header */}
      <div className="pt-32 pb-12 px-6 md:px-12 lg:px-20 max-w-7xl mx-auto">
        <p className="text-xs uppercase tracking-widest font-semibold text-BrandOrange mb-3">
          {sportLabel}
        </p>
        <h1 className="font-Manrope text-4xl md:text-5xl font-bold tracking-tight mb-4">
          {sportLabel} Playbooks
        </h1>
        <p className="text-BrandGray text-base max-w-xl leading-relaxed">
          Ready-made plays designed by our coaching team. Sign up to save any play directly to your team's playbook.
        </p>
      </div>

      {/* Tab selector */}
      <div className="px-6 md:px-12 lg:px-20 max-w-7xl mx-auto">
        <div className="border-b border-BrandGray2/15 mb-8">
          <PlaybookTabs activeTab={activeTab} onChange={setActiveTab} hasCommunity={hasCommunity} />
        </div>
      </div>

      {/* Play grid */}
      <div className={`px-6 md:px-12 lg:px-20 max-w-7xl mx-auto ${hasMore ? "pb-48 md:pb-56" : "pb-16"}`}>
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="h-10 w-10 rounded-full border-[3px] border-BrandOrange/30 border-t-BrandOrange animate-spin" />
          </div>
        ) : plays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <FiBookOpen className="mb-4 text-4xl text-BrandGray2" />
            <p className="font-Manrope font-semibold text-white mb-2">
              {activeTab === "community" ? "No community plays yet" : "No plays yet"}
            </p>
            <p className="text-sm text-BrandGray">
              {activeTab === "community"
                ? "Community-submitted plays will appear here once published."
                : `Check back soon — we're adding new ${sportLabel} content regularly.`}
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plays.map((play) => (
                <PublicPlayCard key={play.id} play={play} />
              ))}
            </div>
          </div>
        )}

        {/* Sign-up nudge even when all plays are shown */}
        {!hasMore && !loading && plays.length > 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <p className="text-BrandGray text-sm mb-4">
              Want to save these plays and animate them for your team?
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-BrandOrange px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-BrandOrange/20 transition hover:brightness-110 active:scale-[0.97]"
            >
              Create a free account
              <FiArrowRight />
            </Link>
          </div>
        )}

        {hasMore && <div ref={gateSentinelRef} className="h-px w-full" aria-hidden="true" />}
      </div>

      {hasMore && (
        <div
          className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 transition duration-300 ${
            showGate ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute inset-x-0 bottom-0 h-[26rem] bg-gradient-to-t from-BrandBlack via-BrandBlack/96 via-50% to-transparent" />
          <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center px-10 pb-8 pt-24 text-center">
            <div className="pointer-events-auto">
              <img
                src={logo}
                alt="Coachable"
                className="mx-auto mb-5 h-8 w-auto opacity-95 md:h-9"
              />
              <h2 className="font-Manrope text-2xl font-bold text-white md:text-3xl">
                Sign up to view {total - plays.length} more {sportLabel} plays
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-BrandGray md:text-base">
                Unlock the full playbook library, animate every play, and save them directly to your team's account.
              </p>
              <Link
                to="/signup"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-BrandOrange px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-BrandOrange/20 transition hover:brightness-110 active:scale-[0.97]"
              >
                Create a free account
                <FiArrowRight />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
