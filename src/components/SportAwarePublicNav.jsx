import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logos/White_Full_Coachable.png";
import { filterPublishedPlaybookSectionsForSport } from "../api/playbookSectionsApi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SPORT_LABELS = {
  rugby: "Rugby",
  football: "Football",
  lacrosse: "Lacrosse",
  basketball: "Basketball",
  soccer: "Soccer",
  "field-hockey": "Field Hockey",
  "ice-hockey": "Ice Hockey",
  "womens-lacrosse": "Women's Lacrosse",
};

/**
 * Builds a nav link href, appending ?sport= when a sport slug is active.
 * @param {string} path - Base path (e.g. "/resources")
 * @param {string|null} sportSlug - URL-safe sport slug (e.g. "rugby")
 * @returns {string}
 */
function sportHref(path, sportSlug) {
  return sportSlug ? `${path}?sport=${sportSlug}` : path;
}

/**
 * Shared top navigation bar for dark public-facing pages.
 * Preserves sport context across Enterprise, Resources, and Playbooks pages
 * by appending ?sport={slug} to nav links when a sport is active.
 *
 * @param {Object} props
 * @param {string|null} props.sport - Raw sport string (e.g. "rugby", "field hockey"). May be null.
 * @param {'enterprise'|'resources'|'playbooks'|null} props.activePage - Highlights the current page link.
 */
export default function SportAwarePublicNav({ sport = null, activePage = null }) {
  const [hasPlaybooks, setHasPlaybooks] = useState(false);

  // Convert "field hockey" → "field-hockey" for URLs
  const sportSlug = sport ? sport.replace(/ /g, "-") : null;
  // Convert slug back for API lookup ("field-hockey" → "field hockey")
  const sportApiKey = sportSlug ? sportSlug.replace(/-/g, " ") : null;

  useEffect(() => {
    if (!sport) {
      setHasPlaybooks(false);
      return;
    }
    fetch(`${API_URL}/playbook-sections`)
      .then((r) => r.json())
      .then((data) => {
        const matching = filterPublishedPlaybookSectionsForSport(data.sections || [], sportApiKey);
        setHasPlaybooks(matching.length > 0);
      })
      .catch(() => {});
  }, [sport, sportApiKey]);

  const homeHref = sportSlug ? `/${sportSlug}` : "/home";

  const linkClass = (page) =>
    `text-sm transition ${
      activePage === page
        ? "font-semibold text-white"
        : "text-BrandGray hover:text-white"
    }`;

  return (
    <nav className="fixed top-0 w-full z-50 bg-BrandBlack/70 backdrop-blur-xl border-b border-BrandGray2/10">
      <div className="flex items-center px-6 h-16 md:px-12 lg:px-20 max-w-7xl mx-auto">
        {/* Logo — links back to sport home or /home */}
        <div className="flex flex-1 items-center">
          <Link to={homeHref}>
            <img src={logo} alt="Coachable" className="block h-7 w-auto object-contain md:h-8" />
          </Link>
        </div>

        {/* Center nav links */}
        <div className="hidden flex-1 items-center justify-center gap-8 md:flex">
          <Link to={sportHref("/enterprise", sportSlug)} className={linkClass("enterprise")}>
            Enterprise
          </Link>
          <Link to="/slate" className={linkClass(null)}>
            Product
          </Link>
          <Link to={sportHref("/resources", sportSlug)} className={linkClass("resources")}>
            Resources
          </Link>
          {hasPlaybooks && sportSlug && (
            <Link to={`/${sportSlug}/playbooks`} className={linkClass("playbooks")}>
              Playbooks
            </Link>
          )}
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
  );
}
