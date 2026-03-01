import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MessagePopup from "./components/MessagePopup/MessagePopup";
import Slate from "./features/slate/Slate";
import { useMessagePopup } from "./components/messaging/useMessagePopup";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Plays from "./pages/app/Plays";
import PlayNew from "./pages/app/PlayNew";
import PlayView from "./pages/app/PlayView";
import PlayEdit from "./pages/app/PlayEdit";
import Team from "./pages/app/Team";
import Profile from "./pages/app/Profile";

function SlateRoot() {
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  return (
    <div className="w-full h-screen bg-BrandBlack flex flex-row justify-between relative overflow-hidden">
      <MessagePopup
        message={messagePopup.message}
        subtitle={messagePopup.subtitle}
        visible={messagePopup.visible}
        type={messagePopup.type}
        onClose={hideMessage}
      />
      <Slate onShowMessage={showMessage} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SlateRoot />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/app/plays" element={<Plays />} />
        <Route path="/app/plays/new" element={<PlayNew />} />
        <Route path="/app/plays/:playId" element={<PlayView />} />
        <Route path="/app/plays/:playId/edit" element={<PlayEdit />} />
        <Route path="/app/team" element={<Team />} />
        <Route path="/app/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
