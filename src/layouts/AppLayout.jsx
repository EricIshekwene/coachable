import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import darkLogo from "../assets/logos/White_Coachable_Logo.png";
import lightLogo from "../assets/logos/coachable_Logo.png";
import { FiBookOpen, FiUsers, FiUser, FiLogOut, FiSettings, FiEye, FiX, FiFlag } from "react-icons/fi";
import useThemeColor from "../utils/useThemeColor";

const BASE_TEAM_NAV = [
  { to: "/app/plays", icon: FiBookOpen, label: "Plays" },
  { to: "/app/team", icon: FiUsers, label: "Team" },
  { to: "/app/profile", icon: FiUser, label: "Profile" },
  { to: "/app/settings", icon: FiSettings, label: "Settings" },
];

const BASE_SOLO_NAV = [
  { to: "/app/plays", icon: FiBookOpen, label: "Plays" },
  { to: "/app/profile", icon: FiUser, label: "Profile" },
  { to: "/app/settings", icon: FiSettings, label: "Settings" },
];

export default function AppLayout() {
  const { user, logout, playerViewMode, setPlayerViewMode } = useAuth();
  const navigate = useNavigate();
  const isCoachRole = user?.role === "coach" || user?.role === "owner";
  const isPersonal = user?.isPersonalTeam;
  const baseNav = isPersonal ? BASE_SOLO_NAV : BASE_TEAM_NAV;
  const navItems = user?.isBetaTester
    ? [...baseNav, { to: "/app/report-issue", icon: FiFlag, label: "Report Issue" }]
    : baseNav;
  const [isLight, setIsLight] = useState(document.documentElement.getAttribute("data-theme") === "light");

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // iOS Safari overscroll area matches the app shell background
  useThemeColor(isLight ? "#ffffff" : "#121212");

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
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-BrandGray2/20 md:flex">
        <Link to="/app" className="flex items-center gap-3 px-5 py-5">
          <img src={isLight ? lightLogo : darkLogo} alt="Coachable" className="h-7 w-7" />
          <span className="font-Manrope text-sm font-semibold tracking-tight">Coachable</span>
        </Link>

        {/* Team badge */}
        {user?.teamName && !isPersonal && (
          <div className="mx-4 mb-4 rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-BrandGray2">Team</p>
            <p className="text-xs font-semibold truncate">{user.teamName}</p>
          </div>
        )}
        {isPersonal && (
          <div className="mx-4 mb-4 rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-BrandGray2">Solo Mode</p>
            <p className="text-xs text-BrandGray2">Personal workspace</p>
          </div>
        )}

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
  );
}
