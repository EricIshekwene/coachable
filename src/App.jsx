import { useEffect } from "react";
import "./index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Slate from "./features/slate/Slate";
import MessagePopup from "./components/MessagePopup/MessagePopup";
import { useMessagePopup } from "./components/messaging/useMessagePopup";
import useThemeColor from "./utils/useThemeColor";
import { AppMessageProvider } from "./context/AppMessageContext";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
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

function SlateRoot() {
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  useThemeColor("#121212");
  return (
    <div className="w-full bg-BrandBlack flex flex-row justify-between relative overflow-hidden" style={{ height: "100dvh" }}>
      <MessagePopup
        message={messagePopup.message}
        subtitle={messagePopup.subtitle}
        visible={messagePopup.visible}
        type={messagePopup.type}
        autoHideDuration={messagePopup.autoHideDuration}
        onClose={hideMessage}
      />
      <MobileViewOnlyGate>
        <Slate onShowMessage={showMessage} />
      </MobileViewOnlyGate>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Standalone slate editor */}
      <Route path="/slate" element={<SlateRoot />} />

      {/* Full-screen play editor (outside AppLayout — no nav chrome) */}
      <Route path="/app/plays/:playId/edit" element={<PlayEditPage />} />
      <Route path="/app/plays/:playId/view" element={<PlayViewOnlyPage />} />

      {/* App shell */}
      <Route path="/app" element={<AppLayout />}>
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
    const saved = localStorage.getItem("theme") || "dark";
    const resolved = saved === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : saved;
    document.documentElement.setAttribute("data-theme", resolved);
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
