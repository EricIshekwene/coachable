import { useEffect, useState } from "react";
import { installGlobalErrorHandlers } from "./utils/errorReporter";
import "./index.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Slate from "./features/slate/Slate";
import MessagePopup from "./components/MessagePopup/MessagePopup";
import { useMessagePopup } from "./components/messaging/useMessagePopup";
import useThemeColor from "./utils/useThemeColor";
import { AppMessageProvider } from "./context/AppMessageContext";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import VerifyEmail from "./pages/VerifyEmail";
import Admin from "./pages/Admin";
import AdminTests from "./pages/AdminTests";
import AdminErrors from "./pages/AdminErrors";
import AdminPlayEditPage from "./pages/AdminPlayEditPage";
import AdminPlaysPage from "./pages/AdminPlaysPage";
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
import MobileViewOnlyGate from "./components/MobileViewOnlyGate";
import SharedPlay from "./pages/SharedPlay";
import SharedPlayView from "./pages/SharedPlayView";
import SharedFolder from "./pages/SharedFolder";

function SlateRoot({ adminMode = false }) {
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  const [slateTheme, setSlateTheme] = useState("dark");
  const handleSlateThemeToggle = () => setSlateTheme(t => t === "dark" ? "light" : "dark");
  useThemeColor(slateTheme === "light" ? "#f8f9fa" : "#121212");
  return (
    <div
      className="w-full bg-BrandBlack flex flex-row justify-between relative overflow-hidden"
      style={{ height: "100dvh" }}
      data-slate-theme={slateTheme}
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
          slateTheme={slateTheme}
          onSlateThemeToggle={handleSlateThemeToggle}
        />
      </MobileViewOnlyGate>
    </div>
  );
}

function RequireAuth({ children }) {
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
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return children;
}

function RequireOnboarded({ children }) {
  const { user } = useAuth();
  if (user && !user.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

function LandingGate() {
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

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingGate />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/tests" element={<AdminTests />} />
      <Route path="/admin/errors" element={<AdminErrors />} />
      <Route path="/shared/:token" element={<SharedPlay />} />
      <Route path="/shared/:token/view" element={<SharedPlayView />} />
      <Route path="/shared/folder/:token" element={<SharedFolder />} />
      <Route path="/shared/folder/:token/play/:playId" element={<SharedPlayView />} />
      <Route path="/verify-email" element={<RequireAuth><VerifyEmail /></RequireAuth>} />
      <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />

      {/* Standalone slate editor (no auth required) */}
      <Route path="/slate" element={<SlateRoot />} />
      <Route path="/admin/slate" element={<SlateRoot adminMode />} />
      <Route path="/admin/app" element={<AdminPlaysPage />} />
      <Route path="/admin/plays/:playId/edit" element={<AdminPlayEditPage />} />

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
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
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
