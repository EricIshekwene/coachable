import "./index.css";
import Sidebar from "./components/Sidebar";
import { useState } from "react";
import ControlPill from "./components/ControlPill";
import RightPanel from "./components/RightPanel";
import AdvancedSettings from "./components/AdvancedSettings";
import { SlateProvider } from "./components/SlateContext";
import SlateBoard from "./components/SlateBoard";

function App() {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  return (
    <SlateProvider>
      <div className="w-full h-screen bg-BrandGreen flex flex-row justify-between relative">
        <Sidebar />
        <SlateBoard />
        <ControlPill />
        <RightPanel onOpenAdvancedSettings={() => setShowAdvancedSettings(true)} />
        {showAdvancedSettings && (
          <AdvancedSettings onClose={() => setShowAdvancedSettings(false)} />
        )}
      </div>
    </SlateProvider>
  );
}
export default App;
