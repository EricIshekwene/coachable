import "./index.css";
import WideSidebar from "./components/WideSidebar";
import { useState, useEffect, useRef } from "react";
import ControlPill from "./components/controlPill/ControlPill";
import RightPanel from "./components/RightPanel";
import AdvancedSettings from "./components/AdvancedSettings";
import CanvasRoot from "./canvas/CanvasRoot";
import MessagePopup from "./components/messagePopup/MessagePopup";
import PlayerEditPanel from "./components/rightPanel/PlayerEditPanel";


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
    },
  };

  const [advancedSettings, setAdvancedSettings] = useState(DEFAULT_ADVANCED_SETTINGS);

  // Message popup state
  const [messagePopup, setMessagePopup] = useState({
    visible: false,
    message: "",
    subtitle: "",
    type: "standard",
  });

  // Method to show message popup
  const showMessage = (message, subtitle = "", type = "standard", duration = 3000) => {
    setMessagePopup({
      visible: true,
      message,
      subtitle,
      type,
    });
  };

  const hideMessage = () => {
    setMessagePopup((prev) => ({ ...prev, visible: false }));
  };

  // RightPanel / Canvas shared state
  const [playName, setPlayName] = useState("Name");
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const DEFAULT_PLAYER_COLOR = "#ef4444";
  const INITIAL_PLAYERS_BY_ID = {
    "player-1": {
      id: "player-1",
      x: 0,
      y: 0,
      number: 1,
      name: "John",
      assignment: "Left Wing",
      color: DEFAULT_PLAYER_COLOR,
    },
  };
  const [playersById, setPlayersById] = useState(() => INITIAL_PLAYERS_BY_ID);
  const [representedPlayerIds, setRepresentedPlayerIds] = useState(() => ["player-1"]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [currentPlayerColor, setCurrentPlayerColor] = useState(DEFAULT_PLAYER_COLOR);
  const [playerEditor, setPlayerEditor] = useState({
    open: false,
    id: null,
    draft: { number: "", name: "", assignment: "" },
  });
  const [allPlayersDisplay, setAllPlayersDisplay] = useState(() => ({
    sizePercent: 100,
    color: DEFAULT_PLAYER_COLOR,
    showNumber: true,
    showName: false,
  }));
  // Default ball present on load; slightly offset so it isn't occluded by a centered player
  const INITIAL_BALL = { id: "ball-1", x: 40, y: 0 };
  const [ball, setBall] = useState(() => INITIAL_BALL);
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);
  const isRestoringRef = useRef(false);

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const zoomPercent = clamp(Math.round((camera.zoom || 1) * 100), 30, 300);

  const normalizeNumber = (value) => {
    const trimmed = String(value ?? "").trim();
    if (trimmed === "") return "";
    const asNumber = Number(trimmed);
    return Number.isNaN(asNumber) ? trimmed : asNumber;
  };

  const getNextPlayerId = (byId) => {
    let maxId = 0;
    Object.keys(byId || {}).forEach((id) => {
      const match = id.match(/player-(\d+)/);
      if (match) {
        const n = Number(match[1]);
        if (!Number.isNaN(n)) maxId = Math.max(maxId, n);
      }
    });
    return `player-${maxId + 1}`;
  };

  const getRandomNearbyPosition = (base) => {
    const jitter = 30;
    const dx = (Math.random() * 2 - 1) * jitter;
    const dy = (Math.random() * 2 - 1) * jitter;
    return { x: (base?.x ?? 0) + dx, y: (base?.y ?? 0) + dy };
  };

  const setZoomPercent = (nextPercent) => {
    const pct = clamp(Number(nextPercent) || 0, 30, 300);
    setCamera((prev) => ({ ...prev, zoom: pct / 100 }));
  };
  const zoomIn = () => setZoomPercent(zoomPercent + 5);
  const zoomOut = () => setZoomPercent(zoomPercent - 5);

  // Field actions (placeholder callbacks for now)
  const onRotateLeft = () => { };
  const onRotateCenter = () => { };
  const onRotateRight = () => { };
  const snapshotSlate = () => ({
    playersById: { ...playersById },
    representedPlayerIds: [...representedPlayerIds],
    ball: { ...ball },
  });

  const applySlate = (snapshot) => {
    if (!snapshot) return;
    isRestoringRef.current = true;
    setPlayersById(snapshot.playersById || {});
    setRepresentedPlayerIds(snapshot.representedPlayerIds || []);
    setBall(snapshot.ball || INITIAL_BALL);
    setSelectedPlayerIds((prev) =>
      (prev || []).filter((playerId) => snapshot.playersById?.[playerId])
    );
    setSelectedItemIds((prev) =>
      (prev || []).filter((itemId) => snapshot.playersById?.[itemId] || itemId === snapshot.ball?.id)
    );
    isRestoringRef.current = false;
  };

  const pushHistory = () => {
    if (isRestoringRef.current) return;
    setHistoryPast((prev) => [...prev, snapshotSlate()]);
    setHistoryFuture([]);
  };

  const onUndo = () => {
    setHistoryPast((prev) => {
      if (prev.length === 0) return prev;
      const nextPast = prev.slice(0, -1);
      const previous = prev[prev.length - 1];
      setHistoryFuture((future) => [...future, snapshotSlate()]);
      applySlate(previous);
      return nextPast;
    });
  };

  const onRedo = () => {
    setHistoryFuture((prev) => {
      if (prev.length === 0) return prev;
      const nextFuture = prev.slice(0, -1);
      const next = prev[prev.length - 1];
      setHistoryPast((past) => [...past, snapshotSlate()]);
      applySlate(next);
      return nextFuture;
    });
  };

  const onReset = () => {
    isRestoringRef.current = true;
    setPlayersById(INITIAL_PLAYERS_BY_ID);
    setRepresentedPlayerIds(["player-1"]);
    setBall(INITIAL_BALL);
    setSelectedPlayerIds([]);
    setSelectedItemIds([]);
    setHistoryPast([]);
    setHistoryFuture([]);
    isRestoringRef.current = false;
  };

  const onSaveToPlaybook = () => { };
  const onDownload = () => { };

  const handlePlayerColorChange = (hex) => {
    setCurrentPlayerColor(hex);
  };

  const resolveNextNumber = (providedNumber) => {
    const trimmed = String(providedNumber ?? "").trim();
    if (trimmed !== "") {
      const normalized = normalizeNumber(trimmed);
      return normalized;
    }
    if (!representedPlayerIds?.length) return 1;
    for (let i = representedPlayerIds.length - 1; i >= 0; i -= 1) {
      const player = playersById?.[representedPlayerIds[i]];
      if (!player) continue;
      const numeric = Number(player.number);
      if (!Number.isNaN(numeric)) return numeric + 1;
    }
    return 1;
  };

  const handleAddPlayer = ({ number, name, assignment, color, position }) => {
    pushHistory();
    const nextName = String(name ?? "").trim();
    const nextAssignment = String(assignment ?? "").trim();
    const colorKey = color || currentPlayerColor || allPlayersDisplay.color || DEFAULT_PLAYER_COLOR;
    const hasInput = String(number ?? "").trim() !== "" || nextName !== "" || nextAssignment !== "";
    const nextNumber = resolveNextNumber(number);
    if (!hasInput && String(nextNumber ?? "").trim() === "") {
      return;
    }

    const lastId = representedPlayerIds?.[representedPlayerIds.length - 1];
    const lastPlayer = lastId ? playersById?.[lastId] : null;
    const basePosition = position ?? getRandomNearbyPosition(lastPlayer || { x: 0, y: 0 });
    const newId = getNextPlayerId(playersById);

    setPlayersById((prev) => ({
      ...prev,
      [newId]: {
        id: newId,
        x: basePosition.x,
        y: basePosition.y,
        number: nextNumber,
        name: nextName,
        assignment: nextAssignment,
        color: colorKey,
      },
    }));
    setRepresentedPlayerIds((prev) => [...prev, newId]);
    setSelectedPlayerIds([newId]);
    setSelectedItemIds([newId]);
  };

  const handleCanvasAddPlayer = ({ x, y }) => {
    const colorKey = currentPlayerColor || allPlayersDisplay.color || DEFAULT_PLAYER_COLOR;
    handleAddPlayer({
      color: colorKey,
      position: { x, y },
    });
  };

  const handleEditPlayer = (id) => {
    const player = playersById?.[id];
    if (!player) return;
    setPlayerEditor({
      open: true,
      id,
      draft: {
        number: player.number ?? "",
        name: player.name ?? "",
        assignment: player.assignment ?? "",
      },
    });
  };

  const handleEditDraftChange = (patch) => {
    setPlayerEditor((prev) => ({
      ...prev,
      draft: { ...prev.draft, ...patch },
    }));
  };

  const handleCloseEditPlayer = () => {
    setPlayerEditor({ open: false, id: null, draft: { number: "", name: "", assignment: "" } });
  };

  const handleSaveEditPlayer = () => {
    const editId = playerEditor.id;
    if (!editId) {
      handleCloseEditPlayer();
      return;
    }
    pushHistory();
    setPlayersById((prev) => {
      const existing = prev?.[editId];
      if (!existing) return prev;
      return {
        ...prev,
        [editId]: {
          ...existing,
          number: normalizeNumber(playerEditor.draft.number),
          name: String(playerEditor.draft.name ?? "").trim(),
          assignment: String(playerEditor.draft.assignment ?? "").trim(),
        },
      };
    });
    handleCloseEditPlayer();
  };

  const handleDeletePlayer = (id) => {
    pushHistory();
    setPlayersById((prev) => {
      if (!prev?.[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRepresentedPlayerIds((prev) => prev.filter((playerId) => playerId !== id));
    setSelectedPlayerIds((prev) => (prev || []).filter((playerId) => playerId !== id));
    setSelectedItemIds((prev) => (prev || []).filter((itemId) => itemId !== id));
    if (playerEditor.open && playerEditor.id === id) {
      handleCloseEditPlayer();
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedPlayerIds?.length) return;
    pushHistory();
    setPlayersById((prev) => {
      const next = { ...prev };
      selectedPlayerIds.forEach((id) => {
        if (next[id]) delete next[id];
      });
      return next;
    });
    setRepresentedPlayerIds((prev) => prev.filter((playerId) => !selectedPlayerIds.includes(playerId)));
    setSelectedPlayerIds([]);
    setSelectedItemIds((prev) => (prev || []).filter((itemId) => !selectedPlayerIds.includes(itemId)));
    if (playerEditor.open && selectedPlayerIds.includes(playerEditor.id)) {
      handleCloseEditPlayer();
    }
  };

  const handleSelectPlayer = (id, { toggle = true } = {}) => {
    handleSelectItem(id, "player", { toggle });
  };

  const handleSelectItem = (id, type, { toggle = true } = {}) => {
    if (!id) return;
    setSelectedItemIds((prev) => {
      const next = prev ? [...prev] : [];
      const index = next.indexOf(id);
      if (toggle) {
        if (index >= 0) {
          next.splice(index, 1);
          return next;
        }
        next.push(id);
        return next;
      }
      if (index >= 0 && next.length === 1) return next;
      return [id];
    });
    if (type === "player") {
      setSelectedPlayerIds((prev) => {
        const next = prev ? [...prev] : [];
        const index = next.indexOf(id);
        if (toggle) {
          if (index >= 0) {
            next.splice(index, 1);
            return next;
          }
          next.push(id);
          return next;
        }
        if (index >= 0 && next.length === 1) return next;
        return [id];
      });
    }
  };

  const handleItemDragStart = () => {
    pushHistory();
  };

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

  const handleItemChange = (id, next, meta) => {
    if (playersById[id]) {
      if (meta?.delta && selectedItemIds?.includes(id) && selectedItemIds.length > 1) {
        const { x: dx = 0, y: dy = 0 } = meta.delta || {};
        setPlayersById((prev) => {
          const updated = { ...prev };
          selectedItemIds.forEach((itemId) => {
            const existing = updated[itemId];
            if (!existing) return;
            updated[itemId] = {
              ...existing,
              x: (existing.x ?? 0) + dx,
              y: (existing.y ?? 0) + dy,
            };
          });
          return updated;
        });
        if (selectedItemIds.includes(ball.id)) {
          setBall((prev) => ({ ...prev, x: (prev.x ?? 0) + dx, y: (prev.y ?? 0) + dy }));
        }
        return;
      }
      setPlayersById((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));
      return;
    }
    if (id === ball.id) {
      if (meta?.delta && selectedItemIds?.includes(id) && selectedItemIds.length > 1) {
        const { x: dx = 0, y: dy = 0 } = meta.delta || {};
        setPlayersById((prev) => {
          const updated = { ...prev };
          selectedItemIds.forEach((itemId) => {
            const existing = updated[itemId];
            if (!existing) return;
            updated[itemId] = {
              ...existing,
              x: (existing.x ?? 0) + dx,
              y: (existing.y ?? 0) + dy,
            };
          });
          return updated;
        });
        setBall((prev) => ({ ...prev, x: (prev.x ?? 0) + dx, y: (prev.y ?? 0) + dy }));
        return;
      }
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setSelectedPlayerIds([]);
      setSelectedItemIds([]);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>

      <div className="w-full h-screen bg-BrandBlack flex flex-row justify-between relative overflow-hidden">


        {/* Message popup */}
        <MessagePopup
          message={messagePopup.message}
          subtitle={messagePopup.subtitle}
          visible={messagePopup.visible}
          type={messagePopup.type}
          onClose={hideMessage}
        />

        {/* Test button for MessagePopup */}
        <button
          onClick={() => {
            const types = ["success", "error", "standard"];
            const messages = [
              { message: "Success!", subtitle: "Operation completed successfully", type: "success" },
              { message: "Error", subtitle: "Something went wrong", type: "error" },
              { message: "Info", subtitle: "This is a standard message", type: "standard" },
            ];
            const random = Math.floor(Math.random() * messages.length);
            const selected = messages[random];
            showMessage(selected.message, selected.subtitle, selected.type);
          }}
          className="absolute hidden top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-BrandOrange text-BrandBlack px-4 py-2 rounded-md font-DmSans font-semibold hover:bg-BrandOrange/90 transition-colors"
        >
          Test Message Popup
        </button>
      
        <WideSidebar
          onToolChange={(tool) => {
            if (tool === "hand" || tool === "select" || tool === "addPlayer" || tool === "color") {
              setCanvasTool(tool);
            }
          }}
          onUndo={onUndo}
          onRedo={onRedo}
          onReset={onReset}
          onAddPlayer={handleAddPlayer}
          onPlayerColorChange={handlePlayerColorChange}
          onDeleteSelected={handleDeleteSelected}
        />
        <div className="flex-1 flex">
          <CanvasRoot
            tool={canvasTool}
            camera={camera}
            setCamera={setCamera}
            items={items}
            onItemChange={handleItemChange}
            onItemDragStart={handleItemDragStart}
            onCanvasAddPlayer={handleCanvasAddPlayer}
            selectedPlayerIds={selectedPlayerIds}
            selectedItemIds={selectedItemIds}
            onSelectItem={handleSelectItem}
            onMarqueeSelect={(ids) => {
              const nextIds = (ids || []).filter((id) => playersById?.[id] || id === ball.id);
              setSelectedItemIds(nextIds);
              setSelectedPlayerIds(nextIds.filter((id) => playersById?.[id]));
            }}
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
          selectedPlayerIds={selectedPlayerIds}
          onSelectPlayer={handleSelectPlayer}
          onEditPlayer={handleEditPlayer}
          onDeletePlayer={handleDeletePlayer}
          allPlayersDisplay={allPlayersDisplay}
          onAllPlayersDisplayChange={setAllPlayersDisplay}
          advancedSettingsOpen={showAdvancedSettings}
          onOpenAdvancedSettings={() => setShowAdvancedSettings(true)}
          onSaveToPlaybook={onSaveToPlaybook}
          onDownload={onDownload}
        />
        <PlayerEditPanel
          isOpen={playerEditor.open}
          player={playerEditor.id ? playersById[playerEditor.id] : null}
          draft={playerEditor.draft}
          onChange={handleEditDraftChange}
          onClose={handleCloseEditPlayer}
          onSave={handleSaveEditPlayer}
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
