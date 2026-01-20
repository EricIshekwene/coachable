import "./index.css";
import Sidebar from "./components/Sidebar";
import { useState, useEffect } from "react";
import ControlPill from "./components/ControlPill";
import RightPanel from "./components/RightPanel";
import AdvancedSettings from "./components/AdvancedSettings";
function App() {
  const [color, setColor] = useState("#561ecb");
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);


  return (
    <>
      <div className="w-full h-screen bg-BrandGreen flex flex-row justify-between relative">
        <Sidebar />
        <ControlPill />
        <RightPanel onOpenAdvancedSettings={() => setShowAdvancedSettings(true)} />
        {showAdvancedSettings && (
          <AdvancedSettings onClose={() => setShowAdvancedSettings(false)} />
        )}
      </div>
    </>
  );
}
export default App;
