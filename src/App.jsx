import "./index.css";
import Sidebar from "./components/Sidebar";
import { useState, useEffect, useRef } from "react";
import ControlPill from "./components/ControlPill";
import RightPanel from "./components/RightPanel";
import AdvancedSettings from "./components/AdvancedSettings";
import whiteBall from "./assets/objects/balls/white_ball.png";
import RugbyField from "./assets/objects/Field Vectors/rugby_field.png";
import DraggableBackground from "./components/wrappers/DraggableBackground";


function App() {
  const [color, setColor] = useState("#561ecb");
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [logControlPillState, setLogControlPillState] = useState(true);

  // Draggable rugby field state
  const fieldBoundsRef = useRef(null);
  const [fieldPosition, setFieldPosition] = useState({ x: 300, y: 300 });

  // ControlPill state tracking
  const [timePercent, setTimePercent] = useState(0);
  const [keyframes, setKeyframes] = useState([]);
  const [speedMultiplier, setSpeedMultiplier] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedKeyframe, setSelectedKeyframe] = useState(null);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);

  // Log state every 10 seconds
  useEffect(() => {
    const logState = () => {
      if (!logControlPillState) return;
      const state = {
        timePercent: timePercent.toFixed(2),
        keyframes: keyframes,
        speedMultiplier: speedMultiplier,
        isPlaying: isPlaying,
        selectedKeyframe: selectedKeyframe,
        autoplayEnabled: autoplayEnabled,
        timestamp: new Date().toLocaleTimeString(),
      };

      console.log("=== ControlPill State (every 10s) ===");
      console.log("Time Percent:", state.timePercent + "%");
      console.log("Keyframes:", state.keyframes.length > 0 ? state.keyframes : "[]");
      console.log("Speed Multiplier:", state.speedMultiplier);
      console.log("Is Playing:", state.isPlaying);
      console.log("Selected Keyframe:", state.selectedKeyframe ?? "null");
      console.log("Autoplay Enabled:", state.autoplayEnabled);
      console.log("Timestamp:", state.timestamp);
      console.log("=====================================");
    };

    // Log immediately on mount
    logState();

    // Set up interval to log every 10 seconds
    const interval = setInterval(logState, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [timePercent, keyframes, speedMultiplier, isPlaying, selectedKeyframe, autoplayEnabled]);

  return (
    <>

      <div
        ref={fieldBoundsRef}
        className="w-full h-screen bg-BrandBlack flex flex-row justify-between relative overflow-hidden"
      >



        <Sidebar />
        <div className="flex-1 bg-BrandGreen flex items-center justify-center">

          {/* Rugby Field */}
          <DraggableBackground
            id="rugby-field"
            position={fieldPosition}
            onPositionChange={(_, nextPos) => setFieldPosition(nextPos)}
            boundsRef={fieldBoundsRef}
          >
            <img
              src={RugbyField}
              alt="rugby field"
              className="select-none max-w-none"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
            {/* Player */}
            <div className="z-30 absolute top-1/2 left-1/2 aspect-square w-[30px] bg-red-500 border-[2px] border-BrandBlack rounded-full">

            </div>
            {/*ball*/}
            <img src={whiteBall} alt="white ball" className="absolute top-1/2 left-1/2 w-[10px] z-30" />
          </DraggableBackground>

        </div>
        <ControlPill
          onTimePercentChange={setTimePercent}
          onKeyframesChange={setKeyframes}
          onSpeedChange={setSpeedMultiplier}
          onPlayStateChange={setIsPlaying}
          onSelectedKeyframeChange={setSelectedKeyframe}
          onAutoplayChange={setAutoplayEnabled}
        />

        <RightPanel onOpenAdvancedSettings={() => setShowAdvancedSettings(true)} />
        {showAdvancedSettings && (
          <AdvancedSettings onClose={() => setShowAdvancedSettings(false)} />
        )}
      </div>
    </>
  );
}
export default App;
