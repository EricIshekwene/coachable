import "./index.css";
import Sidebar from "./components/Sidebar";
import { useState, useEffect } from "react";
import ControlPill from "./components/ControlPill";
import RightPanel from "./components/RightPanel";
import AdvancedSettings from "./components/AdvancedSettings";
import CanvasRoot from "./canvas/CanvasRoot";


function App() {
  const [color, setColor] = useState("#561ecb");
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [logControlPillState, setLogControlPillState] = useState(false);
  const [canvasTool, setCanvasTool] = useState("hand");

  const DEFAULT_ADVANCED_SETTINGS = {
    pitch: {
      showMarkings: true,
      pitchSize: "Full Field",
      pitchColor: "#4FA85D", // Stadium Grass
    },
    players: {
      // This is the "base" player size in pixels at 100% in the Right Panel.
      // (Right Panel sizePercent scales from this.)
      baseSizePx: 30,
    },
    exportVideo: {
      videoQuality: "1080p",
      watermark: true,
      includeMetadata: true,
    },
    animation: {
      playOnLoad: true,
      speedPercent: 50,
    },
  };

  const [advancedSettings, setAdvancedSettings] = useState(DEFAULT_ADVANCED_SETTINGS);

  // RightPanel / Canvas shared state
  const [playName, setPlayName] = useState("Name");
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [playersById, setPlayersById] = useState(() => ({
    "player-1": {
      id: "player-1",
      x: 300,
      y: 300,
      number: 1,
      name: "John",
      assignment: "Left Wing",
      color: "#ef4444",
    },

  }));
  const [representedPlayerIds, setRepresentedPlayerIds] = useState(() => ["player-1"]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [allPlayersDisplay, setAllPlayersDisplay] = useState(() => ({
    sizePercent: 100,
    color: "#ef4444",
    showNumber: true,
    showName: false,
  }));
  const [ball, setBall] = useState(() => ({ id: "ball-1", x: 300, y: 300 }));

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const zoomPercent = clamp(Math.round((camera.zoom || 1) * 100), 30, 100);

  const setZoomPercent = (nextPercent) => {
    const pct = clamp(Number(nextPercent) || 0, 30, 100);
    setCamera((prev) => ({ ...prev, zoom: pct / 100 }));
  };
  const zoomIn = () => setZoomPercent(zoomPercent + 5);
  const zoomOut = () => setZoomPercent(zoomPercent - 5);

  // Field actions (placeholder callbacks for now)
  const onRotateLeft = () => { };
  const onRotateCenter = () => { };
  const onRotateRight = () => { };
  const onUndo = () => { };
  const onRedo = () => { };
  const onReset = () => { };

  const onSaveToPlaybook = () => { };
  const onDownload = () => { };

  const items = [
    ...Object.values(playersById).map((p) => ({
      id: p.id,
      type: "player",
      x: p.x,
      y: p.y,
      number: p.number,
      name: p.name,
      assignment: p.assignment,
      color: p.color || allPlayersDisplay.color,
    })),
    { id: ball.id, type: "ball", x: ball.x, y: ball.y },
  ];

  const handleItemChange = (id, next) => {
    if (playersById[id]) {
      setPlayersById((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));
      return;
    }
    if (id === ball.id) {
      setBall((prev) => ({ ...prev, ...next }));
    }
  };

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

      <div className="w-full h-screen bg-BrandBlack flex flex-row justify-between relative overflow-hidden">



        <Sidebar
          onToolChange={(tool) => {
            if (tool === "hand" || tool === "select") {
              setCanvasTool(tool);
            }
          }}
        />
        <div className="flex-1 flex">
          <CanvasRoot
            tool={canvasTool}
            camera={camera}
            setCamera={setCamera}
            items={items}
            onItemChange={handleItemChange}
            allPlayersDisplay={allPlayersDisplay}
            advancedSettings={advancedSettings}
          />
        </div>
        <ControlPill
          onTimePercentChange={setTimePercent}
          onKeyframesChange={setKeyframes}
          onSpeedChange={setSpeedMultiplier}
          onPlayStateChange={setIsPlaying}
          onSelectedKeyframeChange={setSelectedKeyframe}
          onAutoplayChange={setAutoplayEnabled}
        />

        <RightPanel
          playName={playName}
          onPlayNameChange={setPlayName}
          zoomPercent={zoomPercent}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomPercentChange={setZoomPercent}
          onRotateLeft={onRotateLeft}
          onRotateCenter={onRotateCenter}
          onRotateRight={onRotateRight}
          onUndo={onUndo}
          onRedo={onRedo}
          onReset={onReset}
          playersById={playersById}
          representedPlayerIds={representedPlayerIds}
          selectedPlayerId={selectedPlayerId}
          onSelectPlayer={setSelectedPlayerId}
          allPlayersDisplay={allPlayersDisplay}
          onAllPlayersDisplayChange={setAllPlayersDisplay}
          advancedSettingsOpen={showAdvancedSettings}
          onOpenAdvancedSettings={() => setShowAdvancedSettings(true)}
          onSaveToPlaybook={onSaveToPlaybook}
          onDownload={onDownload}
        />
        {showAdvancedSettings && (
          <AdvancedSettings
            value={advancedSettings}
            onChange={setAdvancedSettings}
            onReset={() => setAdvancedSettings(DEFAULT_ADVANCED_SETTINGS)}
            onClose={() => setShowAdvancedSettings(false)}
          />
        )}
      </div>
    </>
  );
}
export default App;
