import "./index.css";
import Sidebar from "./components/Sidebar";
import { useState, useEffect } from "react";
import ControlPill from "./components/ControlPill";

function App() {
  const [color, setColor] = useState("#561ecb");

  // positions as percentages from left, scattered for 3 icons
  const keyframePositions = ["20%", "55%", "80%"];

  return (
    <>
      <div className="w-full h-screen bg-BrandGreen flex flex-row">
        <Sidebar />
        <ControlPill keyframePositions={keyframePositions} />
      </div>
    </>
  );
}
export default App;
