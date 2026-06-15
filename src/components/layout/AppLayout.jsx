import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarNavItem } from "../../design-system/components";
import { useAuth } from "../../context/AuthContext";
import darkLogo from "../../assets/logos/White_Coachable_Logo.png";
import lightLogo from "../../assets/logos/coachable_Logo.png";
import { FiBookOpen, FiUsers, FiUser, FiLogOut, FiSettings, FiEye, FiX, FiFlag, FiPlay, FiGrid, FiBell } from "react-icons/fi";
import useThemeColor from "../../utils/useThemeColor";
import TeamSwitcher from "../TeamSwitcher";
import NotificationBell from "../NotificationBell";
import { NotificationsProvider } from "../../context/NotificationsContext";
import { useFlag } from "../../context/FeatureFlagContext";
import {
  fetchPublishedPlaybookSections,
  filterPublishedPlaybookSectionsForSport,
} from "../../utils/playbookSectionsApi";

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

const PLAYBOOKS_ROUTE = "/app/playbooks";

export default function AppLayout() {
  const { user, logout, playerViewMode, setPlayerViewMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isPersonal = user?.isPersonalTeam;
  const baseNav = isPersonal ? BASE_SOLO_NAV : BASE_TEAM_NAV;
  const [isLight, setIsLight] = useState(document.documentElement.getAttribute("data-theme") === "light");
  const [hasPlaybookSections, setHasPlaybookSections] = useState(true);
  const notificationsEnabled = useFlag("in_app_notifications");

  const navItems = (user?.isBetaTester
    ? [...baseNav, { to: "/app/report-issue", icon: FiFlag, label: "Report Issue" }]
    : baseNav
  )
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

  /** Footer content: user avatar + logout button. */
  function AppSidebarFooter() {
    return (
      <div>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: "var(--ui-accent-muted)", color: "var(--ui-accent)" }}>
            {user?.name?.[0] || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold" style={{ color: "var(--ui-text)" }}>{user?.name || "Guest"}</p>
            <p className="truncate text-[10px]" style={{ color: "var(--ui-text-subtle)" }}>{isPersonal ? "solo" : playerViewMode ? "player" : (user?.role || "")}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-semibold transition hover:text-red-400"
          style={{ color: "var(--ui-text-muted)" }}
        >
          <FiLogOut className="shrink-0" />
          Log out
        </button>
      </div>
    );
  }

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

      <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          width="md"
          header={
            <>
              <Link to="/app" className="flex items-center gap-3">
                <img src={isLight ? lightLogo : darkLogo} alt="Coachable" className="h-7 w-7" />
                <span className="font-Manrope text-sm font-semibold tracking-tight" style={{ color: "var(--ui-text)" }}>Coachable</span>
              </Link>
              {notificationsEnabled && <NotificationBell />}
            </>
          }
          footer={<AppSidebarFooter />}
        >
          <TeamSwitcher />
          {navItems.map((navItem) => {
            const NavIcon = navItem.icon;
            return (
              <SidebarNavItem
                key={navItem.to}
                label={navItem.label}
                icon={<NavIcon className="text-base" />}
                href={navItem.to}
                active={location.pathname.startsWith(navItem.to)}
              />
            );
          })}
        </Sidebar>
      </div>

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
