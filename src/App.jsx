import { useEffect } from "react";
import { installGlobalErrorHandlers } from "./utils/errorReporter";
import "./index.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Slate from "./features/slate/Slate";
import SlateRecord from "./features/slate/SlateRecord";
import MessagePopup from "./components/MessagePopup/MessagePopup";
import { useMessagePopup } from "./components/messaging/useMessagePopup";
import useThemeColor from "./utils/useThemeColor";
import { AppMessageProvider } from "./context/AppMessageContext";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import AdminTests from "./pages/AdminTests";
import AdminErrors from "./pages/AdminErrors";
import AdminPlayEditPage from "./pages/AdminPlayEditPage";
import AdminPlaysPage from "./pages/AdminPlaysPage";
import AdminUserActivity from "./pages/AdminUserActivity";
import AdminUserIssues from "./pages/AdminUserIssues";
import AdminMobileView from "./pages/AdminMobileView";
import AdminDemoVideos from "./pages/AdminDemoVideos";
import AppLayout from "./layouts/AppLayout";
import Plays from "./pages/app/Plays";
import PlayNew from "./pages/app/PlayNew";
import PlayView from "./pages/app/PlayView";
import PlayEditPage from "./pages/PlayEditPage";
import PlayViewOnlyPage from "./pages/PlayViewOnlyPage";
import Team from "./pages/app/Team";
import Profile from "./pages/app/Profile";
import ProfileEmailVerification from "./pages/app/ProfileEmailVerification";
import Settings from "./pages/app/Settings";
import ReportIssue from "./pages/app/ReportIssue";
import Playbooks from "./pages/app/Playbooks";
import DemoVideos from "./pages/app/DemoVideos";
import MobileViewOnlyGate from "./components/MobileViewOnlyGate";
import SharedPlay from "./pages/SharedPlay";
import SharedPlayView from "./pages/SharedPlayView";
import SharedFolder from "./pages/SharedFolder";
import PlatformPlayView from "./pages/PlatformPlayView";
import SportPickerPage from "./pages/SportPickerPage";
import NotFound from "./pages/NotFound";
import NoTeam from "./pages/NoTeam";
import Resources from "./pages/Resources";
import Enterprise from "./pages/Enterprise";

const SPORT_HOME_ROUTES = {
  rugby: "/rugby",
  soccer: "/soccer",
  football: "/football",
  lacrosse: "/lacrosse",
  basketball: "/basketball",
  "field hockey": "/field-hockey",
  "ice hockey": "/ice-hockey",
};

export function SlateRoot({ adminMode = false, sport = null }) {
  const navigate = useNavigate();
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  useThemeColor("#121212");

  const navigateHome = adminMode
    ? undefined
    : () => navigate(SPORT_HOME_ROUTES[String(sport ?? "").toLowerCase()] ?? "/home");

  return (
    <div
      className="w-full bg-BrandBlack flex flex-row justify-between relative overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <MessagePopup
        message={messagePopup.message}
        subtitle={messagePopup.subtitle}
        visible={messagePopup.visible}
        type={messagePopup.type}
        autoHideDuration={messagePopup.autoHideDuration}
        onClose={hideMessage}
      />
      <MobileViewOnlyGate>
        <Slate
          onShowMessage={showMessage}
          adminMode={adminMode}
          sport={sport}
          onNavigateHome={navigateHome}
        />
      </MobileViewOnlyGate>
    </div>
  );
}

/**
 * Admin-only wrapper for the record-mode slate.
 * Accessible only at /admin/record (guarded by RequireAdminSession).
 */
export function SlateRecordRoot() {
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  useThemeColor("#121212");
  return (
    <div
      className="w-full bg-BrandBlack flex flex-row justify-between relative overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <MessagePopup
        message={messagePopup.message}
        subtitle={messagePopup.subtitle}
        visible={messagePopup.visible}
        type={messagePopup.type}
        autoHideDuration={messagePopup.autoHideDuration}
        onClose={hideMessage}
      />
      <MobileViewOnlyGate>
        <SlateRecord
          onShowMessage={showMessage}
          adminMode
        />
      </MobileViewOnlyGate>
    </div>
  );
}

/** Reads the :sport param from the URL and passes it to SlateRoot. */
export function SlateWithSportParam({ adminMode = false }) {
  const { sport } = useParams();
  return <SlateRoot adminMode={adminMode} sport={sport} />;
}

/** Guards admin sub-routes that lack their own session check (e.g. /admin/slate). */
export function RequireAdminSession({ children }) {
  const session = sessionStorage.getItem("coachable_admin_session");
  if (!session) return <Navigate to="/admin" replace />;
  return children;
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-BrandBlack">
        <div className="h-10 w-10 rounded-full border-[3px] border-BrandOrange/30 border-t-BrandOrange animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (sessionStorage.getItem("coachable_logging_out") === "1") {
      sessionStorage.removeItem("coachable_logging_out");
      return <Navigate to="/" replace />;
    }
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return children;
}

export function RequireOnboarded({ children }) {
  const { user, allTeams } = useAuth();
  if (user && !user.onboarded) return <Navigate to="/onboarding" replace />;
  // Onboarded but somehow lost all memberships — safety net
  if (user && user.onboarded && allTeams.length === 0) return <Navigate to="/no-team" replace />;
  return children;
}

/** Prevent already-onboarded users from revisiting onboarding. */
export function RequireNotOnboarded({ children }) {
  const { user } = useAuth();
  if (user?.onboarded) return <Navigate to="/app/plays" replace />;
  return children;
}

export function LandingGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-BrandBlack">
        <div className="h-10 w-10 rounded-full border-[3px] border-BrandOrange/30 border-t-BrandOrange animate-spin" />
      </div>
    );
  }

  if (user?.onboarded) return <Navigate to="/app" replace />;
  if (user && !user.onboarded) return <Navigate to="/onboarding" replace />;

  return <Landing />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingGate />} />
      <Route path="/home" element={<Landing />} />
      <Route path="/rugby" element={<Landing sport="rugby" />} />
      <Route path="/football" element={<Landing sport="football" />} />
      <Route path="/lacrosse" element={<Landing sport="lacrosse" />} />
      <Route path="/basketball" element={<Landing sport="basketball" />} />
      <Route path="/soccer" element={<Landing sport="soccer" />} />
      <Route path="/field-hockey" element={<Landing sport="field hockey" />} />
      <Route path="/ice-hockey" element={<Landing sport="ice hockey" />} />
      <Route path="/resources" element={<Resources />} />
      <Route path="/enterprise" element={<Enterprise />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/tests" element={<RequireAdminSession><AdminTests /></RequireAdminSession>} />
      <Route path="/admin/errors" element={<RequireAdminSession><AdminErrors /></RequireAdminSession>} />
      <Route path="/platform-play/:playId" element={<PlatformPlayView />} />
      <Route path="/shared/:token" element={<SharedPlay />} />
      <Route path="/shared/:token/view" element={<SharedPlayView />} />
      <Route path="/shared/folder/:token" element={<SharedFolder />} />
      <Route path="/shared/folder/:token/play/:playId" element={<SharedPlayView />} />
      <Route path="/verify-email" element={<RequireAuth><VerifyEmail /></RequireAuth>} />
      <Route path="/onboarding" element={<RequireAuth><RequireNotOnboarded><Onboarding /></RequireNotOnboarded></RequireAuth>} />
      <Route path="/no-team" element={<RequireAuth><NoTeam /></RequireAuth>} />

      {/* Standalone slate editor (no auth required) */}
      <Route path="/slate" element={<SportPickerPage />} />
      <Route path="/slate/:sport" element={<SlateWithSportParam />} />
      <Route path="/admin/slate" element={<RequireAdminSession><SlateRoot adminMode /></RequireAdminSession>} />
      <Route path="/admin/record" element={<RequireAdminSession><SlateRecordRoot /></RequireAdminSession>} />
      <Route path="/admin/app" element={<RequireAdminSession><AdminPlaysPage /></RequireAdminSession>} />
      <Route path="/admin/plays/:playId/edit" element={<RequireAdminSession><AdminPlayEditPage /></RequireAdminSession>} />
      <Route path="/admin/users/:userId" element={<RequireAdminSession><AdminUserActivity /></RequireAdminSession>} />
      <Route path="/admin/user-issues" element={<RequireAdminSession><AdminUserIssues /></RequireAdminSession>} />
      <Route path="/admin/mobile-view" element={<RequireAdminSession><AdminMobileView /></RequireAdminSession>} />
      <Route path="/admin/demo-videos" element={<RequireAdminSession><AdminDemoVideos /></RequireAdminSession>} />

      {/* Full-screen play editor (outside AppLayout — no nav chrome) */}
      <Route path="/app/plays/:playId/edit" element={<RequireAuth><RequireOnboarded><PlayEditPage /></RequireOnboarded></RequireAuth>} />
      <Route path="/app/plays/:playId/view" element={<RequireAuth><RequireOnboarded><PlayViewOnlyPage /></RequireOnboarded></RequireAuth>} />

      {/* App shell */}
      <Route path="/app" element={<RequireAuth><RequireOnboarded><AppLayout /></RequireOnboarded></RequireAuth>}>
        <Route index element={<Navigate to="plays" replace />} />
        <Route path="plays" element={<Plays />} />
        <Route path="plays/new" element={<PlayNew />} />
        <Route path="plays/:playId" element={<PlayView />} />
        <Route path="team" element={<Team />} />
        <Route path="profile" element={<Profile />} />
        <Route path="profile/verify-email" element={<ProfileEmailVerification />} />
        <Route path="settings" element={<Settings />} />
        <Route path="report-issue" element={<ReportIssue />} />
        <Route path="playbooks" element={<Playbooks />} />
        <Route path="videos" element={<DemoVideos />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function ThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem("theme") || "light";
    const resolved = saved === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : saved;
    document.documentElement.setAttribute("data-theme", resolved);
    installGlobalErrorHandlers();
  }, []);
  return null;
}

function App() {
  const appMessage = useMessagePopup();

  return (
    <BrowserRouter>
      <ThemeInit />
      <AuthProvider>
        <AppMessageProvider
          value={{
            showMessage: appMessage.showMessage,
            hideMessage: appMessage.hideMessage,
          }}
        >
          <MessagePopup
            message={appMessage.messagePopup.message}
            subtitle={appMessage.messagePopup.subtitle}
            visible={appMessage.messagePopup.visible}
            type={appMessage.messagePopup.type}
            autoHideDuration={appMessage.messagePopup.autoHideDuration}
            onClose={appMessage.hideMessage}
          />
          <AppRoutes />
        </AppMessageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
