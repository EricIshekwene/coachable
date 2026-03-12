import { useMemo, useRef, useState } from "react";

/** Default red color used for new players. */
export const DEFAULT_PLAYER_COLOR = "#ef4444";

/** Initial players-by-id map containing a single default player. */
export const INITIAL_PLAYERS_BY_ID = {
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

/** Initial ball object with default position. */
export const INITIAL_BALL = { id: "ball-1", x: 40, y: 0, objectType: "ball" };
export const INITIAL_BALLS_BY_ID = { [INITIAL_BALL.id]: { ...INITIAL_BALL } };

const EMPTY_EDITOR = {
  open: false,
  id: null,
  draft: { number: "", name: "", assignment: "" },
};

const DEFAULT_ALL_PLAYERS_DISPLAY = {
  sizePercent: 100,
  color: DEFAULT_PLAYER_COLOR,
  showNumber: true,
  showName: false,
};

const normalizeNumber = (value) => {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return "";
  const asNumber = Number(trimmed);
  return Number.isNaN(asNumber) ? trimmed : asNumber;
};

export const getNextPlayerId = (byId) => {
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

export const getNextBallId = (byId) => {
  let maxId = 0;
  Object.keys(byId || {}).forEach((id) => {
    const match = id.match(/ball-(\d+)/);
    if (match) {
      const n = Number(match[1]);
      if (!Number.isNaN(n)) maxId = Math.max(maxId, n);
    }
  });
  return `ball-${maxId + 1}`;
};

const toFiniteNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeObjectType = (value) => (value === "cone" ? "cone" : "ball");

const normalizeBall = (id, value) => ({
  id: String(value?.id || id || INITIAL_BALL.id),
  x: toFiniteNumber(value?.x, 0),
  y: toFiniteNumber(value?.y, 0),
  objectType: normalizeObjectType(value?.objectType),
});

const cloneBallsById = (byId) =>
  Object.fromEntries(
    Object.entries(byId || {}).map(([id, value]) => {
      const normalized = normalizeBall(id, value);
      return [normalized.id, normalized];
    })
  );

const getPrimaryBallId = (byId) => Object.keys(byId || {})[0] || null;

const normalizeRepresentedPlayerIds = (playersById, representedPlayerIds) => {
  const playerIds = Object.keys(playersById || {});
  const provided = Array.isArray(representedPlayerIds)
    ? representedPlayerIds.filter((id) => typeof id === "string" && Boolean(playersById?.[id]))
    : [];
  return Array.from(new Set([...provided, ...playerIds]));
};

const normalizeBallsSnapshot = ({ ballsById, ball } = {}) => {
  const normalizedById = cloneBallsById(ballsById);
  if (Object.keys(normalizedById).length) {
    return normalizedById;
  }
  if (ball && typeof ball === "object") {
    const normalized = normalizeBall(ball.id || INITIAL_BALL.id, ball);
    return { [normalized.id]: normalized };
  }
  return cloneBallsById(INITIAL_BALLS_BY_ID);
};

const getRandomNearbyPosition = (base) => {
  const jitter = 30;
  const dx = (Math.random() * 2 - 1) * jitter;
  const dy = (Math.random() * 2 - 1) * jitter;
  return { x: (base?.x ?? 0) + dx, y: (base?.y ?? 0) + dy };
};

/**
 * Manages all slate entity state: players, balls, selection, drag, and editing.
 * Provides CRUD handlers, snapshot/restore helpers, and multi-select support.
 * @param {Object} params
 * @param {React.MutableRefObject} params.historyApiRef - Ref to history API for undo/redo push.
 * @param {Function} params.logEvent - Scoped logging callback.
 * @returns {Object} Entity state, setters, snapshot/restore helpers, and event handlers.
 */
export function useSlateEntities({ historyApiRef, logEvent }) {
  const [playersById, setPlayersById] = useState(() => INITIAL_PLAYERS_BY_ID);
  const [representedPlayerIds, setRepresentedPlayerIds] = useState(() => ["player-1"]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [currentPlayerColor, setCurrentPlayerColor] = useState(DEFAULT_PLAYER_COLOR);
  const [playerEditor, setPlayerEditor] = useState(EMPTY_EDITOR);
  const [allPlayersDisplay, setAllPlayersDisplay] = useState(() => DEFAULT_ALL_PLAYERS_DISPLAY);
  const [ballsById, setBallsById] = useState(() => cloneBallsById(INITIAL_BALLS_BY_ID));

  const isRestoringRef = useRef(false);
  const isItemDraggingRef = useRef(false);

  const ballIds = useMemo(() => Object.keys(ballsById || {}), [ballsById]);
  const primaryBallId = useMemo(() => getPrimaryBallId(ballsById), [ballsById]);
  const primaryBall = useMemo(() => {
    if (primaryBallId && ballsById?.[primaryBallId]) return ballsById[primaryBallId];
    return INITIAL_BALL;
  }, [ballsById, primaryBallId]);

  const setBall = (updater) => {
    setBallsById((prev) => {
      const next = cloneBallsById(prev);
      const targetId = getPrimaryBallId(next) || INITIAL_BALL.id;
      const base = next[targetId] || normalizeBall(targetId, INITIAL_BALL);
      const resolved = typeof updater === "function" ? updater(base) : updater;
      if (!resolved || typeof resolved !== "object") return next;
      const normalized = normalizeBall(resolved.id || targetId, { ...base, ...resolved });
      if (normalized.id !== targetId) delete next[targetId];
      next[normalized.id] = normalized;
      return next;
    });
  };

  const snapshotSlate = () => ({
    playersById: { ...playersById },
    representedPlayerIds: [...representedPlayerIds],
    ball: { ...primaryBall },
    ballsById: cloneBallsById(ballsById),
  });

  const snapshotSlateState = () => ({
    playersById: Object.fromEntries(
      Object.entries(playersById || {}).map(([id, player]) => [id, { ...player }])
    ),
    representedPlayerIds: [...(representedPlayerIds || [])],
    ball: { ...primaryBall },
    ballsById: cloneBallsById(ballsById),
  });

  const applySlate = (snapshot) => {
    if (!snapshot) return;
    const nextBallsById = normalizeBallsSnapshot(snapshot);
    const nextPlayers = snapshot.playersById || {};
    const nextRepresented = normalizeRepresentedPlayerIds(
      nextPlayers,
      snapshot.representedPlayerIds
    );
    isRestoringRef.current = true;
    setPlayersById(nextPlayers);
    setRepresentedPlayerIds(nextRepresented);
    setBallsById(nextBallsById);
    setSelectedPlayerIds((prev) => (prev || []).filter((playerId) => nextPlayers?.[playerId]));
    setSelectedItemIds((prev) =>
      (prev || []).filter((itemId) => nextPlayers?.[itemId] || nextBallsById?.[itemId])
    );
    isRestoringRef.current = false;
  };

  const resolveNextNumber = (providedNumber) => {
    const trimmed = String(providedNumber ?? "").trim();
    if (trimmed !== "") {
      return normalizeNumber(trimmed);
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

  const handlePlayerColorChange = (hex) => {
    setCurrentPlayerColor(hex);
  };

  const handleSelectedPlayersColorChange = (hex, ids) => {
    const targetIds = Array.isArray(ids) && ids.length ? ids : selectedPlayerIds;
    if (!targetIds?.length) return;
    historyApiRef.current?.pushHistory?.();
    setPlayersById((prev) => {
      const next = { ...prev };
      targetIds.forEach((id) => {
        if (!next[id]) return;
        next[id] = { ...next[id], color: hex };
      });
      return next;
    });
  };

  const handleAddPlayer = ({ number, name, assignment, color, position }) => {
    historyApiRef.current?.pushHistory?.();
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
    logEvent?.("slate", "addPlayer", { id: newId, player: newPlayer });

  };

  const handleCanvasAddPlayer = ({ x, y }) => {
    const colorKey = currentPlayerColor || allPlayersDisplay.color || DEFAULT_PLAYER_COLOR;
    logEvent?.("slate", "canvasAddPlayer", { x, y, color: colorKey });
    handleAddPlayer({
      color: colorKey,
      position: { x, y },
    });
  };

  const handleEditPlayer = (id) => {
    const player = playersById?.[id];
    if (!player) return;
    logEvent?.("slate", "editPlayerOpen", { id });
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
    setPlayerEditor(EMPTY_EDITOR);
  };

  const handleSaveEditPlayer = () => {
    const editId = playerEditor.id;
    if (!editId) {
      handleCloseEditPlayer();
      return;
    }
    historyApiRef.current?.pushHistory?.();
    logEvent?.("slate", "editPlayerSave", { id: editId, draft: playerEditor.draft });
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
    historyApiRef.current?.pushHistory?.();
    logEvent?.("slate", "deletePlayer", { id });
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

  const handleDeleteBall = (id) => {
    const allBallIds = Object.keys(ballsById || {});
    if (allBallIds.length <= 1) return; // must keep at least one ball
    if (!ballsById?.[id]) return;
    historyApiRef.current?.pushHistory?.();
    logEvent?.("slate", "deleteBall", { id });
    setBallsById((prev) => {
      const next = cloneBallsById(prev);
      delete next[id];
      return next;
    });
    setSelectedItemIds((prev) => (prev || []).filter((itemId) => itemId !== id));
  };

  const handleDeleteSelected = () => {
    const selectedBallIds = (selectedItemIds || []).filter((itemId) => ballsById?.[itemId]);
    const allBallIds = Object.keys(ballsById || {});
    const canDeleteAllSelectedBalls = selectedBallIds.length < allBallIds.length;
    const ballIdsToDelete = canDeleteAllSelectedBalls
      ? selectedBallIds
      : selectedBallIds.slice(1);
    if (!selectedPlayerIds?.length && !ballIdsToDelete.length) return;
    historyApiRef.current?.pushHistory?.();
    logEvent?.("slate", "deleteSelected", {
      playerIds: selectedPlayerIds,
      ballIds: ballIdsToDelete,
    });
    setPlayersById((prev) => {
      const next = { ...prev };
      selectedPlayerIds.forEach((id) => {
        if (next[id]) delete next[id];
      });
      return next;
    });
    if (ballIdsToDelete.length) {
      setBallsById((prev) => {
        const next = cloneBallsById(prev);
        ballIdsToDelete.forEach((id) => {
          if (next[id]) delete next[id];
        });
        return next;
      });
    }
    setRepresentedPlayerIds((prev) => prev.filter((playerId) => !selectedPlayerIds.includes(playerId)));
    setSelectedPlayerIds([]);
    setSelectedItemIds((prev) =>
      (prev || []).filter((itemId) => !selectedPlayerIds.includes(itemId) && !ballIdsToDelete.includes(itemId))
    );
    if (playerEditor.open && selectedPlayerIds.includes(playerEditor.id)) {
      handleCloseEditPlayer();
    }
  };

  const handleSelectItem = (id, type, { mode = "toggle" } = {}) => {
    if (mode === "clear") {
      setSelectedItemIds([]);
      setSelectedPlayerIds([]);
      return;
    }
    if (!id) return;
    setSelectedItemIds((prev) => {
      const next = prev ? [...prev] : [];
      const index = next.indexOf(id);
      if (mode === "toggle") {
        if (index >= 0) {
          next.splice(index, 1);
          return next;
        }
        next.push(id);
        return next;
      }
      return [id];
    });
    if (type === "player") {
      setSelectedPlayerIds((prev) => {
        const next = prev ? [...prev] : [];
        const index = next.indexOf(id);
        if (mode === "toggle") {
          if (index >= 0) {
            next.splice(index, 1);
            return next;
          }
          next.push(id);
          return next;
        }
        return [id];
      });
      return;
    }
    if (mode !== "toggle") {
      setSelectedPlayerIds([]);
    }
  };

  const handleSelectPlayer = (id, { mode = "toggle" } = {}) => {
    handleSelectItem(id, "player", { mode });
  };

  const handleItemDragStart = (id) => {
    historyApiRef.current?.pushHistory?.();
    isItemDraggingRef.current = true;
    logEvent?.("slate", "dragStart", { id });
  };

  const handleItemDragEnd = (id) => {
    isItemDraggingRef.current = false;
    logEvent?.("slate", "dragEnd", { id });
  };

  const moveItemsByDelta = (itemIds, dx, dy) => {
    if (!Array.isArray(itemIds) || !itemIds.length) return;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    if (dx === 0 && dy === 0) return;

    setPlayersById((prev) => {
      const updated = { ...prev };
      let changed = false;
      itemIds.forEach((itemId) => {
        const existing = updated[itemId];
        if (!existing) return;
        changed = true;
        updated[itemId] = {
          ...existing,
          x: (existing.x ?? 0) + dx,
          y: (existing.y ?? 0) + dy,
        };
      });
      return changed ? updated : prev;
    });

    setBallsById((prev) => {
      const updated = cloneBallsById(prev);
      let changed = false;
      itemIds.forEach((itemId) => {
        const existing = updated[itemId];
        if (!existing) return;
        changed = true;
        updated[itemId] = {
          ...existing,
          x: (existing.x ?? 0) + dx,
          y: (existing.y ?? 0) + dy,
        };
      });
      return changed ? updated : prev;
    });
  };

  const handleMoveSelectedItemsByDelta = (dx, dy, { pushHistory = true, source = "unknown" } = {}) => {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return [];
    if (dx === 0 && dy === 0) return [];

    const targetItemIds = (selectedItemIds || []).filter(
      (itemId) => Boolean(playersById?.[itemId]) || Boolean(ballsById?.[itemId])
    );
    if (!targetItemIds.length) return [];

    if (pushHistory) {
      historyApiRef.current?.pushHistory?.();
    }

    moveItemsByDelta(targetItemIds, dx, dy);

    logEvent?.("slate", "itemsMove", {
      itemIds: targetItemIds,
      delta: { x: dx, y: dy },
      source,
    });

    return targetItemIds;
  };

  const handleItemChange = (id, next, meta) => {
    if (meta?.delta) {
      logEvent?.("slate", "itemMove", { id, delta: meta.delta });
    }
    if (playersById[id]) {
      if (meta?.delta && selectedItemIds?.includes(id) && selectedItemIds.length > 1) {
        const { x: dx = 0, y: dy = 0 } = meta.delta || {};
        moveItemsByDelta(selectedItemIds, dx, dy);
        return;
      }
      setPlayersById((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));
      return;
    }
    if (ballsById[id]) {
      if (meta?.delta && selectedItemIds?.includes(id) && selectedItemIds.length > 1) {
        const { x: dx = 0, y: dy = 0 } = meta.delta || {};
        moveItemsByDelta(selectedItemIds, dx, dy);
        return;
      }
      setBallsById((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          ...next,
          id,
        },
      }));
    }
  };

  const onMarqueeSelect = (ids, { mode = "replace" } = {}) => {
    const nextIds = (ids || []).filter((id) => playersById?.[id] || ballsById?.[id]);
    if (mode === "add") {
      setSelectedItemIds((prev) => Array.from(new Set([...(prev || []), ...nextIds])));
      setSelectedPlayerIds((prev) =>
        Array.from(new Set([...(prev || []), ...nextIds.filter((id) => playersById?.[id])]))
      );
      return;
    }
    setSelectedItemIds(nextIds);
    setSelectedPlayerIds(nextIds.filter((id) => playersById?.[id]));
  };

  const handleAddBall = ({
    x = 0,
    y = 0,
    id,
    select = true,
    source = "manual",
    objectType = "ball",
  } = {}) => {
    let created = null;
    setBallsById((prev) => {
      const next = cloneBallsById(prev);
      const requestedId =
        typeof id === "string" && id.trim() !== "" && !next[id] ? id.trim() : null;
      const nextId = requestedId || getNextBallId(next);
      created = normalizeBall(nextId, { x, y, objectType });
      next[created.id] = created;
      return next;
    });
    if (select && created?.id) {
      setSelectedPlayerIds([]);
      setSelectedItemIds([created.id]);
    }
    logEvent?.("slate", "addBall", {
      id: created?.id ?? null,
      x: created?.x ?? 0,
      y: created?.y ?? 0,
      objectType: created?.objectType ?? "ball",
      source,
    });
    return created;
  };

  const loadEntitiesState = ({ nextPlayers, nextRepresented, nextBall, nextBallsById }) => {
    const normalizedBallsById = normalizeBallsSnapshot({
      ballsById: nextBallsById,
      ball: nextBall,
    });
    const normalizedPlayersById = nextPlayers || {};
    const normalizedRepresented = normalizeRepresentedPlayerIds(
      normalizedPlayersById,
      nextRepresented
    );
    isRestoringRef.current = true;
    setPlayersById(normalizedPlayersById);
    setRepresentedPlayerIds(normalizedRepresented);
    setBallsById(normalizedBallsById);
    setSelectedPlayerIds([]);
    setSelectedItemIds([]);
    setPlayerEditor(EMPTY_EDITOR);
    isRestoringRef.current = false;
  };

  const resetSlateEntities = () => {
    isRestoringRef.current = true;
    setPlayersById(INITIAL_PLAYERS_BY_ID);
    setRepresentedPlayerIds(["player-1"]);
    setBallsById(cloneBallsById(INITIAL_BALLS_BY_ID));
    setSelectedPlayerIds([]);
    setSelectedItemIds([]);
    setPlayerEditor(EMPTY_EDITOR);
    isRestoringRef.current = false;
  };

  const items = useMemo(
    () => [
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
      ...Object.values(ballsById || {}).map((ball) => ({
        id: ball.id,
        type: "ball",
        x: ball.x,
        y: ball.y,
        objectType: normalizeObjectType(ball.objectType),
      })),
    ],
    [playersById, allPlayersDisplay.color, ballsById]
  );

  const selectedPlayers = useMemo(
    () => (selectedPlayerIds || []).map((id) => playersById?.[id]).filter(Boolean),
    [selectedPlayerIds, playersById]
  );

  return {
    playersById,
    setPlayersById,
    representedPlayerIds,
    setRepresentedPlayerIds,
    selectedPlayerIds,
    setSelectedPlayerIds,
    selectedItemIds,
    setSelectedItemIds,
    currentPlayerColor,
    setCurrentPlayerColor,
    playerEditor,
    setPlayerEditor,
    allPlayersDisplay,
    setAllPlayersDisplay,
    ball: primaryBall,
    setBall,
    ballIds,
    ballsById,
    setBallsById,
    items,
    selectedPlayers,
    isRestoringRef,
    isItemDraggingRef,
    snapshotSlate,
    snapshotSlateState,
    applySlate,
    handlePlayerColorChange,
    handleSelectedPlayersColorChange,
    handleAddPlayer,
    handleCanvasAddPlayer,
    handleEditPlayer,
    handleEditDraftChange,
    handleCloseEditPlayer,
    handleSaveEditPlayer,
    handleDeletePlayer,
    handleDeleteSelected,
    handleAddBall,
    handleDeleteBall,
    handleSelectPlayer,
    handleSelectItem,
    handleItemDragStart,
    handleItemDragEnd,
    handleItemChange,
    handleMoveSelectedItemsByDelta,
    onMarqueeSelect,
    loadEntitiesState,
    resetSlateEntities,
  };
}

export default useSlateEntities;
