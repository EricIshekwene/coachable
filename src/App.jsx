import "./index.css";
import WideSidebar from "./components/WideSidebar";
import { useState, useEffect, useRef, useCallback } from "react";
import ControlPill from "./components/controlPill/ControlPill";
import RightPanel from "./components/RightPanel";
import AdvancedSettings from "./components/AdvancedSettings";
import CanvasRoot from "./canvas/CanvasRoot";
import MessagePopup from "./components/MessagePopup/MessagePopup";
import PlayerEditPanel from "./components/rightPanel/PlayerEditPanel";

const KEYFRAME_TOLERANCE = 4;
const LOOP_SECONDS = 30;

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
    logging: {
      slate: false,
      controlPill: false,
      canvas: false,
      sidebar: false,
    },
  };

  const [advancedSettings, setAdvancedSettings] = useState(DEFAULT_ADVANCED_SETTINGS);
  const logging = advancedSettings?.logging ?? {};
  const logEvent = (scope, action, payload) => {
    if (!logging?.[scope]) return;
    const stamp = new Date().toISOString();
    if (payload !== undefined) {
      console.log(`[${stamp}] ${scope}: ${action}`, payload);
      return;
    }
    console.log(`[${stamp}] ${scope}: ${action}`);
  };

  // Message popup state
  const [messagePopup, setMessagePopup] = useState({
    visible: false,
    message: "",
    subtitle: "",
    type: "standard",
  });

  // Method to show message popup
  const showMessage = useCallback(
    (message, subtitle = "", type = "standard", duration = 3000) => {
      setMessagePopup({
        visible: true,
        message,
        subtitle,
        type,
      });
    },
    []
  );

  const hideMessage = useCallback(() => {
    setMessagePopup((prev) => ({ ...prev, visible: false }));
  }, []);

  // RightPanel / Canvas shared state
  const [playName, setPlayName] = useState("Name");
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [fieldRotation, setFieldRotation] = useState(0);
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
  const [fieldHistoryPast, setFieldHistoryPast] = useState([]);
  const [fieldHistoryFuture, setFieldHistoryFuture] = useState([]);
  const isFieldRestoringRef = useRef(false);
  const pendingKeyframeUpdateRef = useRef(false);
  const pendingKeyframeTimeRef = useRef(null);
  const isItemDraggingRef = useRef(false);

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
    const nextZoom = pct / 100;
    if (Math.abs((camera.zoom || 1) - nextZoom) < 0.0001) return;
    pushFieldHistory();
    setCamera((prev) => ({ ...prev, zoom: nextZoom }));
  };
  const zoomIn = () => setZoomPercent(zoomPercent + 5);
  const zoomOut = () => setZoomPercent(zoomPercent - 5);

  // Field actions (placeholder callbacks for now)
  const onRotateLeft = () => {
    if (fieldRotation === -90) return;
    pushFieldHistory();
    setFieldRotation(-90);
  };
  const onRotateCenter = () => {
    if (fieldRotation === 180) return;
    pushFieldHistory();
    setFieldRotation(180);
  };
  const onRotateRight = () => {
    if (fieldRotation === 90) return;
    pushFieldHistory();
    setFieldRotation(90);
  };
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

  const snapshotField = () => ({
    camera: { ...camera },
    fieldRotation,
  });

  const applyField = (snapshot) => {
    if (!snapshot) return;
    isFieldRestoringRef.current = true;
    setCamera(snapshot.camera || { x: 0, y: 0, zoom: 1 });
    setFieldRotation(snapshot.fieldRotation ?? 0);
    isFieldRestoringRef.current = false;
  };

  const pushFieldHistory = () => {
    if (isFieldRestoringRef.current) return;
    setFieldHistoryPast((prev) => [...prev, snapshotField()]);
    setFieldHistoryFuture([]);
  };

  const pushHistory = () => {
    if (isRestoringRef.current) return;
    markKeyframeSnapshotPending();
    setHistoryPast((prev) => [...prev, snapshotSlate()]);
    setHistoryFuture([]);
  };

  const onUndo = () => {
    logEvent("slate", "undo");
    setHistoryPast((prev) => {
      if (prev.length === 0) return prev;
      const nextPast = prev.slice(0, -1);
      const previous = prev[prev.length - 1];
      setHistoryFuture((future) => [...future, snapshotSlate()]);
      applySlate(previous);
      return nextPast;
    });
  };

  const onFieldUndo = () => {
    setFieldHistoryPast((prev) => {
      if (prev.length === 0) return prev;
      const nextPast = prev.slice(0, -1);
      const previous = prev[prev.length - 1];
      setFieldHistoryFuture((future) => [...future, snapshotField()]);
      applyField(previous);
      return nextPast;
    });
  };

  const onFieldRedo = () => {
    setFieldHistoryFuture((prev) => {
      if (prev.length === 0) return prev;
      const nextFuture = prev.slice(0, -1);
      const next = prev[prev.length - 1];
      setFieldHistoryPast((past) => [...past, snapshotField()]);
      applyField(next);
      return nextFuture;
    });
  };

  const onRedo = () => {
    logEvent("slate", "redo");
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
    logEvent("slate", "reset");
    isRestoringRef.current = true;
    setPlayersById(INITIAL_PLAYERS_BY_ID);
    setRepresentedPlayerIds(["player-1"]);
    setBall(INITIAL_BALL);
    setSelectedPlayerIds([]);
    setSelectedItemIds([]);
    setHistoryPast([]);
    setHistoryFuture([]);
    setCamera({ x: 0, y: 0, zoom: 1 });
    setFieldRotation(0);
    setFieldHistoryPast([]);
    setFieldHistoryFuture([]);
    isRestoringRef.current = false;
  };

  const onSaveToPlaybook = () => { };
  const onDownload = () => { };

  const handleToolChange = useCallback((tool) => {
    if (tool === "hand" || tool === "select" || tool === "addPlayer" || tool === "color") {
      setCanvasTool((prev) => (prev === tool ? prev : tool));
    }
  }, []);

  const handlePlayerColorChange = (hex) => {
    setCurrentPlayerColor(hex);
  };

  const handleSelectedPlayersColorChange = (hex, ids) => {
    const targetIds = Array.isArray(ids) && ids.length ? ids : selectedPlayerIds;
    if (!targetIds?.length) return;
    pushHistory();
    setPlayersById((prev) => {
      const next = { ...prev };
      targetIds.forEach((id) => {
        if (!next[id]) return;
        next[id] = { ...next[id], color: hex };
      });
      return next;
    });
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

    const newPlayer = {
      id: newId,
      x: basePosition.x,
      y: basePosition.y,
      number: nextNumber,
      name: nextName,
      assignment: nextAssignment,
      color: colorKey,
    };

    setPlayersById((prev) => ({
      ...prev,
      [newId]: newPlayer,
    }));
    setRepresentedPlayerIds((prev) => [...prev, newId]);
    setSelectedPlayerIds([newId]);
    setSelectedItemIds([newId]);
    logEvent("slate", "addPlayer", { id: newId, player: newPlayer });

    // Ensure the new player exists in all keyframe snapshots for consistent counts.
    setKeyframeSnapshots((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((kf) => {
        const snapshot = next[kf];
        const existingPlayers = snapshot?.playersById ?? {};
        const existingRep = snapshot?.representedPlayerIds ?? [];
        if (existingPlayers[newId]) return;
        next[kf] = {
          ...snapshot,
          playersById: {
            ...existingPlayers,
            [newId]: { ...newPlayer },
          },
          representedPlayerIds: existingRep.includes(newId)
            ? existingRep
            : [...existingRep, newId],
        };
      });
      return next;
    });
  };

  const handleCanvasAddPlayer = ({ x, y }) => {
    const colorKey = currentPlayerColor || allPlayersDisplay.color || DEFAULT_PLAYER_COLOR;
    logEvent("slate", "canvasAddPlayer", { x, y, color: colorKey });
    handleAddPlayer({
      color: colorKey,
      position: { x, y },
    });
  };

  const handleEditPlayer = (id) => {
    const player = playersById?.[id];
    if (!player) return;
    logEvent("slate", "editPlayerOpen", { id });
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
    logEvent("slate", "editPlayerSave", { id: editId, draft: playerEditor.draft });
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
    logEvent("slate", "deletePlayer", { id });
    setPlayersById((prev) => {
      if (!prev?.[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRepresentedPlayerIds((prev) => prev.filter((playerId) => playerId !== id));
    setSelectedPlayerIds((prev) => (prev || []).filter((playerId) => playerId !== id));
    setSelectedItemIds((prev) => (prev || []).filter((itemId) => itemId !== id));
    setKeyframeSnapshots((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((kf) => {
        const snapshot = next[kf];
        if (!snapshot?.playersById?.[id] && !(snapshot?.representedPlayerIds || []).includes(id)) {
          return;
        }
        const nextPlayers = { ...(snapshot.playersById || {}) };
        delete nextPlayers[id];
        next[kf] = {
          ...snapshot,
          playersById: nextPlayers,
          representedPlayerIds: (snapshot.representedPlayerIds || []).filter(
            (playerId) => playerId !== id
          ),
        };
      });
      return next;
    });
    if (playerEditor.open && playerEditor.id === id) {
      handleCloseEditPlayer();
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedPlayerIds?.length) return;
    pushHistory();
    logEvent("slate", "deleteSelected", { ids: selectedPlayerIds });
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
    setKeyframeSnapshots((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((kf) => {
        const snapshot = next[kf];
        if (!snapshot) return;
        let changed = false;
        const nextPlayers = { ...(snapshot.playersById || {}) };
        selectedPlayerIds.forEach((id) => {
          if (nextPlayers[id]) {
            delete nextPlayers[id];
            changed = true;
          }
        });
        const nextRepresented = (snapshot.representedPlayerIds || []).filter((playerId) => {
          const shouldKeep = !selectedPlayerIds.includes(playerId);
          if (!shouldKeep) changed = true;
          return shouldKeep;
        });
        if (!changed) return;
        next[kf] = {
          ...snapshot,
          playersById: nextPlayers,
          representedPlayerIds: nextRepresented,
        };
      });
      return next;
    });
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

  const handleItemDragStart = (id) => {
    pushHistory();
    isItemDraggingRef.current = true;
    logEvent("slate", "dragStart", { id });
  };

  const handleItemDragEnd = (id) => {
    isItemDraggingRef.current = false;
    logEvent("slate", "dragEnd", { id });
    const targetKeyframe = findEditTargetKeyframe(timePercent, latestKeyframesRef.current);
    if (targetKeyframe !== null && targetKeyframe !== undefined) {
      setKeyframeSnapshots((prev) => ({
        ...prev,
        [targetKeyframe]: snapshotSlateState(),
      }));
    }
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
  const selectedPlayers = (selectedPlayerIds || [])
    .map((id) => playersById?.[id])
    .filter(Boolean);

  const handleItemChange = (id, next, meta) => {
    markKeyframeSnapshotPending();
    if (meta?.delta) {
      logEvent("slate", "itemMove", { id, delta: meta.delta });
    }
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
  const [keyframeSignal, setKeyframeSignal] = useState(0);
  const [keyframeSnapshots, setKeyframeSnapshots] = useState(() => ({}));
  const playRafId = useRef(null);
  const playLastTsRef = useRef(null);
  const isPlayingRef = useRef(false);
  const prevKeyframesRef = useRef([]);
  const latestKeyframesRef = useRef([]);
  const latestKeyframeSnapshotsRef = useRef({});
  const pendingKeyframeSnapshotsRef = useRef(new Set());
  const lastAppliedKeyframeRef = useRef(null);

  const snapshotSlateState = () => ({
    playersById: Object.fromEntries(
      Object.entries(playersById || {}).map(([id, player]) => [id, { ...player }])
    ),
    representedPlayerIds: [...(representedPlayerIds || [])],
    ball: { ...(ball || INITIAL_BALL) },
  });

  const findNearestKeyframeAtTime = (timeValue, frames) => {
    let nearest = null;
    let nearestDistance = Infinity;
    (frames || []).forEach((kf) => {
      const distance = Math.abs(kf - timeValue);
      if (distance < KEYFRAME_TOLERANCE && distance < nearestDistance) {
        nearest = kf;
        nearestDistance = distance;
      }
    });
    return nearest;
  };

  const findEditTargetKeyframe = (timeValue, frames) => {
    const sorted = [...(frames || [])].sort((a, b) => a - b);
    if (sorted.length === 0) return null;
    const nearest = findNearestKeyframeAtTime(timeValue, sorted);
    if (nearest !== null && nearest !== undefined) return nearest;
    if (sorted.length === 1) return sorted[0];
    if (timeValue >= sorted[sorted.length - 1]) return sorted[sorted.length - 1];
    if (timeValue <= sorted[0]) return sorted[0];
    return null;
  };

  const markKeyframeSnapshotPending = () => {
    const keyframeAtTime = findEditTargetKeyframe(timePercent, keyframes);
    if (!keyframeAtTime) return;
    pendingKeyframeUpdateRef.current = true;
    pendingKeyframeTimeRef.current = keyframeAtTime;
  };

  const handleTimePercentChange = (next) => {
    const clamped = clamp(Number(next) || 0, 0, 100);
    setTimePercent((prev) => (Object.is(prev, clamped) ? prev : clamped));
    if (isPlayingRef.current) {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      if (playRafId.current) cancelAnimationFrame(playRafId.current);
      playRafId.current = null;
      playLastTsRef.current = null;
      return;
    }

    const tick = (ts) => {
      if (!isPlayingRef.current) return;
      if (playLastTsRef.current == null) playLastTsRef.current = ts;
      const dt = (ts - playLastTsRef.current) / 1000;
      playLastTsRef.current = ts;

      const speed = (0.25 + (speedMultiplier / 100) * 3.75) * 3;
      const delta = (dt / LOOP_SECONDS) * 100 * speed;
      let shouldStop = false;

      setTimePercent((prev) => {
        let next = prev + delta;
        if (next >= 100) {
          if (autoplayEnabled) {
            next = next % 100;
          } else {
            next = 100;
            shouldStop = true;
          }
        }
        if (next <= 0) next = 0;
        return next;
      });

      if (shouldStop) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        return;
      }

      playRafId.current = requestAnimationFrame(tick);
    };

    playRafId.current = requestAnimationFrame(tick);

    return () => {
      if (playRafId.current) cancelAnimationFrame(playRafId.current);
      playRafId.current = null;
      playLastTsRef.current = null;
    };
  }, [isPlaying, speedMultiplier, autoplayEnabled]);

  const requestAddKeyframe = useCallback(() => {
    setKeyframeSignal((prev) => prev + 1);
  }, []);

  const handleKeyframeAddAttempt = useCallback(
    (payload) => {
      logEvent("controlPill", "keyframeAddAttempt", payload);
      if (payload?.added) return;
      if (payload?.reason === "max") {
        showMessage(
          "Keyframe limit reached",
          `Max ${payload.maxKeyframes ?? 30} keyframes`,
          "error"
        );
        return;
      }
      if (payload?.reason === "too-close") {
        showMessage(
          "Keyframe already nearby",
          "Selected the existing keyframe instead",
          "standard",
          2000
        );
      }
    },
    [logEvent, showMessage]
  );

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
    if (!logging?.controlPill) return;
    logEvent("controlPill", "keyframesChange", { keyframes });
  }, [keyframes, logging?.controlPill]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setSelectedPlayerIds([]);
      setSelectedItemIds([]);
      setSelectedKeyframe(null);
      setCanvasTool("select");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    latestKeyframesRef.current = keyframes;
    const prevKeyframes = prevKeyframesRef.current || [];
    const added = keyframes.filter((kf) => !prevKeyframes.includes(kf));
    const removed = prevKeyframes.filter((kf) => !keyframes.includes(kf));

    if (removed.length) {
      setKeyframeSnapshots((prev) => {
        const next = { ...prev };
        removed.forEach((kf) => {
          delete next[kf];
        });
        return next;
      });
    }

    if (added.length) {
      added.forEach((kf) => pendingKeyframeSnapshotsRef.current.add(kf));
    }

    prevKeyframesRef.current = keyframes;
  }, [keyframes]);

  useEffect(() => {
    latestKeyframeSnapshotsRef.current = keyframeSnapshots;
  }, [keyframeSnapshots]);

  useEffect(() => {
    if (pendingKeyframeSnapshotsRef.current.size === 0) return;
    const pending = Array.from(pendingKeyframeSnapshotsRef.current);
    pendingKeyframeSnapshotsRef.current.clear();
    setKeyframeSnapshots((prev) => {
      const next = { ...prev };
      pending.forEach((kf) => {
        next[kf] = snapshotSlateState();
      });
      return next;
    });
  }, [playersById, representedPlayerIds, ball, keyframes]);

  useEffect(() => {
    const frames = latestKeyframesRef.current;
    if (!frames || frames.length === 0) return;
    const nearest = findNearestKeyframeAtTime(timePercent, frames);
    const shouldSeedSingle = frames.length === 1;
    const target =
      nearest !== null && nearest !== undefined
        ? nearest
        : shouldSeedSingle
          ? frames[0]
          : null;
    if (target === null || target === undefined) return;
    if (latestKeyframeSnapshotsRef.current[target]) return;
    setKeyframeSnapshots((prev) => ({
      ...prev,
      [target]: snapshotSlateState(),
    }));
  }, [timePercent]);

  useEffect(() => {
    if (!pendingKeyframeUpdateRef.current) return;
    const keyframeAtTime = pendingKeyframeTimeRef.current;
    if (keyframeAtTime === null || keyframeAtTime === undefined) return;
    pendingKeyframeUpdateRef.current = false;
    pendingKeyframeTimeRef.current = null;
    setKeyframeSnapshots((prev) => ({
      ...prev,
      [keyframeAtTime]: snapshotSlateState(),
    }));
  }, [playersById, representedPlayerIds, ball]);

  const lerp = (from, to, t) => from + (to - from) * t;

  const buildInterpolatedSlate = (timeValue, frames, snapshots) => {
    const availableKeyframes = (frames || [])
      .filter((kf) => snapshots[kf])
      .sort((a, b) => a - b);

    if (availableKeyframes.length === 0) return null;

    if (timeValue <= availableKeyframes[0]) {
      return snapshots[availableKeyframes[0]];
    }
    if (timeValue >= availableKeyframes[availableKeyframes.length - 1]) {
      return snapshots[availableKeyframes[availableKeyframes.length - 1]];
    }

    let prevKeyframe = availableKeyframes[0];
    let nextKeyframe = availableKeyframes[availableKeyframes.length - 1];
    for (let i = 0; i < availableKeyframes.length - 1; i += 1) {
      const current = availableKeyframes[i];
      const next = availableKeyframes[i + 1];
      if (timeValue >= current && timeValue <= next) {
        prevKeyframe = current;
        nextKeyframe = next;
        break;
      }
    }

    if (prevKeyframe === nextKeyframe) {
      return snapshots[prevKeyframe];
    }

    const prevSnapshot = snapshots[prevKeyframe];
    const nextSnapshot = snapshots[nextKeyframe];
    if (!prevSnapshot || !nextSnapshot) return null;

    const t = (timeValue - prevKeyframe) / (nextKeyframe - prevKeyframe);
    const prevPlayers = prevSnapshot.playersById || {};
    const nextPlayers = nextSnapshot.playersById || {};
    const allPlayerIds = new Set([
      ...Object.keys(prevPlayers),
      ...Object.keys(nextPlayers),
    ]);

    const interpolatedPlayers = {};
    allPlayerIds.forEach((id) => {
      const prevPlayer = prevPlayers[id];
      const nextPlayer = nextPlayers[id];
      if (prevPlayer && nextPlayer) {
        interpolatedPlayers[id] = {
          ...prevPlayer,
          ...nextPlayer,
          x: lerp(prevPlayer.x ?? 0, nextPlayer.x ?? 0, t),
          y: lerp(prevPlayer.y ?? 0, nextPlayer.y ?? 0, t),
        };
        return;
      }
      interpolatedPlayers[id] = { ...(prevPlayer || nextPlayer) };
    });

    const prevBall = prevSnapshot.ball || INITIAL_BALL;
    const nextBall = nextSnapshot.ball || INITIAL_BALL;
    const interpolatedBall = {
      ...prevBall,
      ...nextBall,
      x: lerp(prevBall.x ?? 0, nextBall.x ?? 0, t),
      y: lerp(prevBall.y ?? 0, nextBall.y ?? 0, t),
    };

    const represented =
      t <= 0.5
        ? [...(prevSnapshot.representedPlayerIds || [])]
        : [...(nextSnapshot.representedPlayerIds || [])];

    return {
      playersById: interpolatedPlayers,
      representedPlayerIds: represented,
      ball: interpolatedBall,
    };
  };

  useEffect(() => {
    if (isItemDraggingRef.current) return;
    const interpolatedSlate = buildInterpolatedSlate(
      timePercent,
      latestKeyframesRef.current,
      latestKeyframeSnapshotsRef.current
    );
    if (!interpolatedSlate) return;
    applySlate(interpolatedSlate);
  }, [timePercent]);

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
          onToolChange={handleToolChange}
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
            fieldRotation={fieldRotation}
            onPanStart={pushFieldHistory}
            onItemChange={handleItemChange}
            onItemDragStart={handleItemDragStart}
            onItemDragEnd={handleItemDragEnd}
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
          onTimePercentChange={handleTimePercentChange}
          onKeyframesChange={setKeyframes}
          onSpeedChange={setSpeedMultiplier}
          onPlayStateChange={setIsPlaying}
          onSelectedKeyframeChange={setSelectedKeyframe}
          onAutoplayChange={setAutoplayEnabled}
          externalTimePercent={timePercent}
          externalIsPlaying={isPlaying}
          externalSpeed={speedMultiplier}
          externalSelectedKeyframe={selectedKeyframe}
          externalAutoplayEnabled={autoplayEnabled}
          addKeyframeSignal={keyframeSignal}
          onRequestAddKeyframe={requestAddKeyframe}
          onKeyframeAddAttempt={handleKeyframeAddAttempt}
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
          onFieldUndo={onFieldUndo}
          onFieldRedo={onFieldRedo}
          onReset={onReset}
          playersById={playersById}
          representedPlayerIds={representedPlayerIds}
          selectedPlayerIds={selectedPlayerIds}
          selectedPlayers={selectedPlayers}
          onSelectPlayer={handleSelectPlayer}
          onEditPlayer={handleEditPlayer}
          onDeletePlayer={handleDeletePlayer}
          allPlayersDisplay={allPlayersDisplay}
          onAllPlayersDisplayChange={setAllPlayersDisplay}
          onSelectedPlayersColorChange={handleSelectedPlayersColorChange}
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
