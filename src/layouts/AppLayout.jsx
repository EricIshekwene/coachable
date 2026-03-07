import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import darkLogo from "../assets/logos/White_Coachable_Logo.png";
import lightLogo from "../assets/logos/coachable_Logo.png";
import { FiBookOpen, FiUsers, FiUser, FiLogOut, FiSettings } from "react-icons/fi";

const navItems = [
  { to: "/app/plays", icon: FiBookOpen, label: "Plays" },
  { to: "/app/team", icon: FiUsers, label: "Team" },
  { to: "/app/profile", icon: FiUser, label: "Profile" },
  { to: "/app/settings", icon: FiSettings, label: "Settings" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLight, setIsLight] = useState(document.documentElement.getAttribute("data-theme") === "light");

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${isActive
      ? "bg-BrandOrange/10 text-BrandOrange font-semibold"
      : "text-BrandGray hover:bg-BrandBlack2 hover:text-BrandText"
    }`;

  return (
    <div className="app-themed flex h-screen bg-BrandBlack font-DmSans text-BrandText">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-BrandGray2/20 md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <img src={isLight ? lightLogo : darkLogo} alt="Coachable" className="h-7 w-7" />
          <span className="font-Manrope text-sm font-semibold tracking-tight">Coachable</span>
        </div>

        {/* Team badge */}
        {user?.teamName && (
          <div className="mx-4 mb-4 rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-BrandGray2">Team</p>
            <p className="text-xs font-semibold truncate">{user.teamName}</p>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon className="text-base" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-BrandGray2/20 px-3 py-4">
          <div className="mb-3 flex items-center gap-3 px-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-BrandOrange/20 text-xs font-bold text-BrandOrange">
              {user?.name?.[0] || "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{user?.name || "Guest"}</p>
              <p className="truncate text-[10px] text-BrandGray2">{user?.role || ""}</p>
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-BrandGray2/20 bg-BrandBlack md:hidden">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-3 text-[10px] transition ${isActive ? "text-BrandOrange" : "text-BrandGray"
              }`
            }
          >
            <Icon className="text-lg" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
