import { useState, useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import darkLogo from "../assets/logos/White_Coachable_Logo.png";
import lightLogo from "../assets/logos/coachable_Logo.png";
import { FiBookOpen, FiUsers, FiUser, FiLogOut, FiSettings, FiEye, FiX, FiFlag, FiPlay, FiGrid, FiBell, FiList, FiCalendar, FiTarget, FiCheckSquare, FiAlertCircle } from "react-icons/fi";
import useThemeColor from "../utils/useThemeColor";
import TeamSwitcher from "../components/TeamSwitcher";
import NotificationBell from "../components/NotificationBell";
import { NotificationsProvider } from "../context/NotificationsContext";
import { useFlag } from "../context/FeatureFlagContext";
import { SuiteProvider, useSuiteFeatures } from "../context/SuiteContext";
import { useTutorial } from "../context/TutorialContext";
import {
  fetchPublishedPlaybookSections,
  filterPublishedPlaybookSectionsForSport,
} from "../utils/playbookSectionsApi";
import {
  dismissSportBanner,
  isSportBannerDismissed,
  shouldShowSportBanner,
} from "../utils/sportBanner";

const BASE_TEAM_NAV = [
  { to: "/app/plays", icon: FiBookOpen, label: "Plays" },
  { to: "/app/playbooks", icon: FiGrid, label: "Playbooks" },
  { to: "/app/team", icon: FiUsers, label: "Team" },
  { to: "/app/notifications", icon: FiBell, label: "Inbox" },
  { to: "/app/profile", icon: FiUser, label: "Profile" },
  { to: "/app/settings", icon: FiSettings, label: "Settings" },
  { to: "/app/videos", icon: FiPlay, label: "How To" },
];

const BASE_SOLO_NAV = [
  { to: "/app/plays", icon: FiBookOpen, label: "Plays" },
  { to: "/app/playbooks", icon: FiGrid, label: "Playbooks" },
  { to: "/app/notifications", icon: FiBell, label: "Inbox" },
  { to: "/app/profile", icon: FiUser, label: "Profile" },
  { to: "/app/settings", icon: FiSettings, label: "Settings" },
  { to: "/app/videos", icon: FiPlay, label: "How To" },
];

// Suite nav items keyed by feature name.
// "schedule" is a virtual item shown when either practice_plans or install_calendar is enabled.
const SUITE_NAV_ITEMS = [
  { feature: "roster",      to: "/app/suite/roster",      icon: FiList,        label: "Roster" },
  { feature: "schedule",    to: "/app/suite/schedule",    icon: FiCalendar,    label: "Schedule" },
  { feature: "game_plans",  to: "/app/suite/game-plans",  icon: FiTarget,      label: "Game Plans" },
  { feature: "assignments", to: "/app/suite/assignments",  icon: FiCheckSquare, label: "Assignments" },
];

const PLAYBOOKS_ROUTE = "/app/playbooks";

// Auto-launch is intentionally OFF for real coaches until the tour has been
// reviewed and approved for rollout. Until then it's only reachable via the
// admin "Preview Onboarding Tutorial" button, which runs it on a fully mocked
// in-memory session (src/utils/tutorialPreview.js) and lands here with
// ?startTutorial=1. Rolling it out to real coaches needs more than this flag:
// completion persistence (user_preferences column + AuthContext callbacks)
// was reverted with PR #3 and must be rebuilt first, or the tour would
// re-launch on every visit to /app/plays.
const TUTORIAL_AUTO_LAUNCH_FOR_NEW_USERS = false;

/** Inner layout that can consume suite features (must be inside SuiteProvider). */
function AppLayoutInner() {
  const { user, logout, playerViewMode, setPlayerViewMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isPersonal = user?.isPersonalTeam;
  const baseNav = isPersonal ? BASE_SOLO_NAV : BASE_TEAM_NAV;
  const [isLight, setIsLight] = useState(document.documentElement.getAttribute("data-theme") === "light");
  const [hasPlaybookSections, setHasPlaybookSections] = useState(true);
  const notificationsEnabled = useFlag("in_app_notifications");
  const { active: tutorialActive, startTutorial } = useTutorial();
  const autoStartedTutorialRef = useRef(false);

  // Once the tour has been active at all in this mount (auto-launched or
  // force-started via ?startTutorial=1), never auto-launch it again —
  // otherwise exiting could race this effect and immediately restart it.
  useEffect(() => {
    if (tutorialActive) autoStartedTutorialRef.current = true;
  }, [tutorialActive]);

  // Auto-launch the onboarding product tour the first time a coach reaches
  // their plays list. Fires once per mount; tutorialCompleted flips true as
  // soon as the tour starts (see AuthContext.markTutorialComplete via exit/finish).
  // Disabled for real users for now — see TUTORIAL_AUTO_LAUNCH_FOR_NEW_USERS above.
  useEffect(() => {
    if (!TUTORIAL_AUTO_LAUNCH_FOR_NEW_USERS) return;
    if (autoStartedTutorialRef.current) return;
    if (!user || user.tutorialCompleted || tutorialActive) return;
    if (location.pathname !== "/app/plays") return;
    autoStartedTutorialRef.current = true;
    startTutorial();
  }, [user, tutorialActive, location.pathname, startTutorial]);

  // Forced preview trigger — /app/plays?startTutorial=1 starts the tour
  // regardless of tutorialCompleted (used by the admin preview button and
  // available as a manual escape hatch). Strips the param once consumed so
  // a refresh or back-navigation doesn't relaunch it.
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(location.search);
    if (params.get("startTutorial") !== "1") return;
    autoStartedTutorialRef.current = true;
    startTutorial();
    params.delete("startTutorial");
    const nextSearch = params.toString();
    navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" }, { replace: true });
  }, [user, location.pathname, location.search, startTutorial, navigate]);

  // Missing-sport banner — dismissal lives in sessionStorage (per team, so
  // switching to another sportless team shows it again); the counter only
  // forces a re-render after dismissing.
  const [, bumpSportBannerDismissals] = useState(0);

  // Hidden in player view: players can't change the team sport.
  const showSportBanner =
    !playerViewMode &&
    shouldShowSportBanner({
      sport: user?.sport,
      role: user?.role,
      dismissed: isSportBannerDismissed(user?.teamId),
    });

  /** Hide the missing-sport banner for the rest of this session. */
  const handleDismissSportBanner = () => {
    dismissSportBanner(user?.teamId);
    bumpSportBannerDismissals((n) => n + 1);
  };

  // Suite feature flags
  const suiteFeatures = useSuiteFeatures();

  // "schedule" virtual feature = either practice_plans or install_calendar enabled
  const suiteFeatureMap = {
    ...suiteFeatures,
    schedule: suiteFeatures.practice_plans || suiteFeatures.install_calendar,
  };

  const enabledSuiteNav = SUITE_NAV_ITEMS.filter((item) => suiteFeatureMap[item.feature]);

  const navItems = [
    ...(user?.isBetaTester
      ? [...baseNav, { to: "/app/report-issue", icon: FiFlag, label: "Report Issue" }]
      : baseNav),
    ...enabledSuiteNav,
  ]
    .filter((item) => item.to !== PLAYBOOKS_ROUTE || hasPlaybookSections)
    .filter((item) => item.to !== "/app/notifications" || notificationsEnabled);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // iOS Safari overscroll area matches the app shell background
  useThemeColor(isLight ? "#ffffff" : "#121212");

  useEffect(() => {
    let cancelled = false;

    fetchPublishedPlaybookSections()
      .then((sections) => {
        if (cancelled) return;
        const visibleSections = filterPublishedPlaybookSectionsForSport(sections, user?.sport || "");
        setHasPlaybookSections(visibleSections.length > 0);
      })
      .catch(() => {
        if (!cancelled) {
          // Fail open so temporary API issues do not remove navigation.
          setHasPlaybookSections(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.sport, user?.teamId]);

  useEffect(() => {
    if (!hasPlaybookSections && location.pathname === PLAYBOOKS_ROUTE) {
      navigate("/app/plays", { replace: true });
    }
  }, [hasPlaybookSections, location.pathname, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${isActive
      ? "bg-BrandOrange/10 text-BrandOrange font-semibold"
      : "text-BrandGray hover:bg-BrandBlack2 hover:text-BrandText"
    }`;

  const handleExitPlayerView = () => {
    setPlayerViewMode(false);
    navigate("/app/settings");
  };

  return (
    <NotificationsProvider enabled={notificationsEnabled}>
    <div
      className="app-themed flex min-h-0 flex-col bg-BrandBlack font-DmSans text-BrandText"
      style={{ height: "100dvh" }}
    >
      {/* Player View Banner */}
      {playerViewMode && (
        <div className="flex items-center justify-between border-b border-BrandOrange/30 bg-BrandOrange/10 px-4 py-2">
          <div className="flex items-center gap-2">
            <FiEye className="text-sm text-BrandOrange" />
            <span className="text-xs font-semibold text-BrandOrange">Player View</span>
            <span className="text-xs text-BrandGray2">— You're previewing the app as a player sees it</span>
          </div>
          <button
            onClick={handleExitPlayerView}
            className="flex items-center gap-1.5 rounded-md bg-BrandOrange px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
          >
            <FiX className="text-xs" />
            Exit Player View
          </button>
        </div>
      )}

      {/* Missing Sport Banner — owners/coaches on a team with no sport set */}
      {showSportBanner && (
        <div className="flex items-center justify-between gap-3 border-b border-BrandOrange/30 bg-BrandOrange/10 px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <FiAlertCircle className="shrink-0 text-sm text-BrandOrange" />
            <span className="shrink-0 text-xs font-semibold text-BrandOrange">No sport selected</span>
            <span className="truncate text-xs text-BrandGray2">
              — pick your {isPersonal ? "workspace's" : "team's"} sport to get the right field and defaults
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => navigate("/app/select-sport", { state: { from: location.pathname } })}
              className="rounded-md bg-BrandOrange px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
            >
              Select Sport
            </button>
            <button
              onClick={handleDismissSportBanner}
              aria-label="Dismiss sport reminder"
              className="rounded-md p-1.5 text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"
            >
              <FiX className="text-sm" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-BrandGray2/20 md:flex">
        <div className="flex items-center justify-between px-5 py-5">
          <Link to="/app" className="flex items-center gap-3">
            <img src={isLight ? lightLogo : darkLogo} alt="Coachable" className="h-7 w-7" />
            <span className="font-Manrope text-sm font-semibold tracking-tight">Coachable</span>
          </Link>
          {notificationsEnabled && <NotificationBell />}
        </div>

        {/* Team switcher */}
        <TeamSwitcher />

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((navItem) => {
            const NavIcon = navItem.icon;
            return (
              <NavLink key={navItem.to} to={navItem.to} className={linkClass}>
                <NavIcon className="text-base" />
                {navItem.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-BrandGray2/20 px-3 py-4">
          <div className="mb-3 flex items-center gap-3 px-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-BrandOrange/20 text-xs font-bold text-BrandOrange">
              {user?.name?.[0] || "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{user?.name || "Guest"}</p>
              <p className="truncate text-[10px] text-BrandGray2">{isPersonal ? "solo" : playerViewMode ? "player" : (user?.role || "")}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-BrandGray transition hover:bg-BrandBlack2 hover:text-red-400"
          >
            <FiLogOut className="text-base" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-BrandGray2/20 bg-BrandBlack pb-[env(safe-area-inset-bottom)] md:hidden">
        {navItems.map((navItem) => {
          const NavIcon = navItem.icon;
          return (
            <NavLink
              key={navItem.to}
              to={navItem.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-3 text-[10px] transition ${isActive ? "text-BrandOrange" : "text-BrandGray"
                }`
              }
            >
              <NavIcon className="text-lg" />
              {navItem.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="min-h-0 flex-1 touch-scroll overflow-x-hidden overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>
      </div>
    </div>
    </NotificationsProvider>
  );
}

/**
 * AppLayout — wraps AppLayoutInner with SuiteProvider so suite features
 * are available to the sidebar and child routes.
 */
export default function AppLayout() {
  const { user } = useAuth();
  return (
    <SuiteProvider teamId={user?.teamId ?? null}>
      <AppLayoutInner />
    </SuiteProvider>
  );
}
