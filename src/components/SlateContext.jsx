import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";

const SlateContext = createContext(null);

let idCounter = 1;
const createId = (prefix) => `${prefix}-${idCounter++}`;

const baseFieldState = {
  rotation: 0,
  zoom: 1,
  showMarkings: true,
  pitchColor: "#6FAF7B",
  pitchSize: "Full Field",
};

const baseDisplayState = {
  showNumber: false,
  showName: false,
};

const createInitialObjects = () => {
  const ballId = createId("ball");
  return [
    {
      id: ballId,
      type: "ball",
      x: 0.5,
      y: 0.5,
      color: "#F8FAFC",
      size: 25,
      label: "Ball",
      number: "",
      visible: true,
    },
  ];
};

const createSnapshot = (state) => ({
  field: {
    rotation: state.field.rotation,
    showMarkings: state.field.showMarkings,
    pitchColor: state.field.pitchColor,
    pitchSize: state.field.pitchSize,
  },
  display: {
    showNumber: state.display.showNumber,
    showName: state.display.showName,
  },
  objects: state.objects.map((obj) => ({
    id: obj.id,
    type: obj.type,
    x: obj.x,
    y: obj.y,
    color: obj.color,
    size: obj.size,
    label: obj.label,
    number: obj.number,
    visible: obj.visible,
  })),
});

const applySnapshotToState = (state, snapshot) => ({
  ...state,
  objects: snapshot.objects.map((obj) => ({ ...obj })),
  field: {
    ...state.field,
    rotation: snapshot.field.rotation,
    showMarkings: snapshot.field.showMarkings,
    pitchColor: snapshot.field.pitchColor,
    pitchSize: snapshot.field.pitchSize,
  },
  display: {
    showNumber: snapshot.display.showNumber,
    showName: snapshot.display.showName,
  },
});

const createInitialState = () => {
  const objects = createInitialObjects();
  const initialState = {
    playName: "Twister",
    objects,
    selectedId: objects[0]?.id ?? null,
    field: { ...baseFieldState },
    display: { ...baseDisplayState },
    defaultPlayerColor: "#ef4444",
    defaultPlayerSize: 100,
    keyframes: [],
    currentKeyframeIndex: 0,
  };

  const firstSnapshot = createSnapshot(initialState);
  return {
    ...initialState,
    keyframes: [
      {
        id: createId("keyframe"),
        snapshot: firstSnapshot,
      },
    ],
    currentKeyframeIndex: 0,
  };
};

const withNewKeyframe = (state) => {
  const snapshot = createSnapshot(state);
  const nextKeyframes = [
    ...state.keyframes,
    { id: createId("keyframe"), snapshot },
  ];
  return {
    ...state,
    keyframes: nextKeyframes,
    currentKeyframeIndex: nextKeyframes.length - 1,
  };
};

const updateObjectById = (objects, id, updater) =>
  objects.map((obj) => (obj.id === id ? updater(obj) : obj));

const slateReducer = (state, action) => {
  switch (action.type) {
    case "SET_PLAY_NAME":
      return { ...state, playName: action.value };
    case "SET_SELECTED":
      return { ...state, selectedId: action.value };
    case "SET_ZOOM":
      return { ...state, field: { ...state.field, zoom: action.value } };
    case "SET_FIELD_ROTATION":
      return withNewKeyframe({
        ...state,
        field: { ...state.field, rotation: action.value },
      });
    case "SET_FIELD_SETTINGS":
      return withNewKeyframe({
        ...state,
        field: { ...state.field, ...action.value },
      });
    case "SET_DISPLAY_SETTINGS":
      return withNewKeyframe({
        ...state,
        display: { ...state.display, ...action.value },
      });
    case "SET_DEFAULT_PLAYER":
      return { ...state, ...action.value };
    case "ADD_PLAYER": {
      const newPlayer = {
        id: createId("player"),
        type: "player",
        x: 0.3,
        y: 0.5,
        color: action.color ?? state.defaultPlayerColor,
        size: action.size ?? state.defaultPlayerSize,
        label: action.label ?? `Player ${state.objects.filter((o) => o.type === "player").length + 1}`,
        number: action.number ?? `${state.objects.filter((o) => o.type === "player").length + 1}`,
        visible: true,
      };
      const nextState = {
        ...state,
        objects: [...state.objects, newPlayer],
        selectedId: newPlayer.id,
      };
      return withNewKeyframe(nextState);
    }
    case "DELETE_PLAYER": {
      const toDelete = state.objects.find((obj) => obj.id === action.id);
      if (!toDelete || toDelete.type !== "player") return state;
      const remaining = state.objects.filter((obj) => obj.id !== action.id);
      const nextState = {
        ...state,
        objects: remaining,
        selectedId: state.selectedId === action.id ? remaining[0]?.id ?? null : state.selectedId,
      };
      return withNewKeyframe(nextState);
    }
    case "UPDATE_OBJECT": {
      const nextState = {
        ...state,
        objects: updateObjectById(state.objects, action.id, (obj) => ({
          ...obj,
          ...action.value,
        })),
      };
      return action.record ? withNewKeyframe(nextState) : nextState;
    }
    case "APPLY_SNAPSHOT": {
      const nextState = applySnapshotToState(state, action.snapshot);
      return {
        ...nextState,
        currentKeyframeIndex: action.index,
      };
    }
    case "ADD_KEYFRAME": {
      const nextState = withNewKeyframe(state);
      return nextState;
    }
    case "DELETE_KEYFRAME": {
      if (state.keyframes.length <= 1) return state;
      const nextKeyframes = state.keyframes.filter((_, idx) => idx !== action.index);
      const nextIndex = Math.min(action.index, nextKeyframes.length - 1);
      const nextState = applySnapshotToState(state, nextKeyframes[nextIndex].snapshot);
      return {
        ...nextState,
        keyframes: nextKeyframes,
        currentKeyframeIndex: nextIndex,
      };
    }
    case "CLEAR_KEYFRAMES": {
      const snapshot = createSnapshot(state);
      return {
        ...state,
        keyframes: [{ id: createId("keyframe"), snapshot }],
        currentKeyframeIndex: 0,
      };
    }
    case "UNDO": {
      const nextIndex = Math.max(0, state.currentKeyframeIndex - 1);
      if (nextIndex === state.currentKeyframeIndex) return state;
      const nextState = applySnapshotToState(state, state.keyframes[nextIndex].snapshot);
      return { ...nextState, currentKeyframeIndex: nextIndex };
    }
    case "REDO": {
      const nextIndex = Math.min(state.keyframes.length - 1, state.currentKeyframeIndex + 1);
      if (nextIndex === state.currentKeyframeIndex) return state;
      const nextState = applySnapshotToState(state, state.keyframes[nextIndex].snapshot);
      return { ...nextState, currentKeyframeIndex: nextIndex };
    }
    case "RESET": {
      const resetState = createInitialState();
      return resetState;
    }
    default:
      return state;
  }
};

export const interpolateSnapshots = (snapshotA, snapshotB, t) => {
  if (!snapshotA || !snapshotB) return snapshotA || snapshotB;
  const objectsById = new Map(snapshotB.objects.map((obj) => [obj.id, obj]));
  const mergedObjects = snapshotA.objects.map((obj) => {
    const next = objectsById.get(obj.id);
    if (!next) return { ...obj };
    return {
      ...obj,
      x: obj.x + (next.x - obj.x) * t,
      y: obj.y + (next.y - obj.y) * t,
    };
  });

  snapshotB.objects.forEach((obj) => {
    if (!snapshotA.objects.find((entry) => entry.id === obj.id)) {
      mergedObjects.push({ ...obj });
    }
  });

  return {
    field: snapshotA.field,
    display: snapshotA.display,
    objects: mergedObjects,
  };
};

export const SlateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(slateReducer, undefined, createInitialState);
  const [playback, setPlayback] = useState({
    isPlaying: false,
    speedMultiplier: 50,
    timePercent: 0,
    autoplayEnabled: true,
  });

  const rafId = useRef(null);
  const lastTs = useRef(null);

  useEffect(() => {
    if (!playback.isPlaying) {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = null;
      lastTs.current = null;
      return undefined;
    }

    const LOOP_SECONDS = 30;

    const tick = (ts) => {
      if (lastTs.current == null) lastTs.current = ts;
      const dt = (ts - lastTs.current) / 1000;
      lastTs.current = ts;

      const speed = (0.25 + (playback.speedMultiplier / 100) * 3.75) * 3;

      setPlayback((prev) => {
        const nextPercent = prev.timePercent + (dt / LOOP_SECONDS) * 100 * speed;
        if (nextPercent >= 100) {
          if (!prev.autoplayEnabled) {
            return { ...prev, isPlaying: false, timePercent: 0 };
          }
          return { ...prev, timePercent: nextPercent - 100 };
        }
        return { ...prev, timePercent: nextPercent };
      });

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = null;
      lastTs.current = null;
    };
  }, [playback.isPlaying, playback.speedMultiplier, playback.autoplayEnabled]);

  const value = useMemo(() => ({
    state,
    dispatch,
    playback,
    setPlayback,
  }), [state, playback]);

  return <SlateContext.Provider value={value}>{children}</SlateContext.Provider>;
};

export const useSlate = () => {
  const context = useContext(SlateContext);
  if (!context) {
    throw new Error("useSlate must be used within a SlateProvider");
  }
  return context;
};

export const exportPlayJson = (state) => {
  const snapshots = state.keyframes.map((frame) => frame.snapshot);
  return {
    version: 1,
    meta: {
      name: state.playName,
    },
    field: {
      rotation: state.field.rotation,
      pitchColor: state.field.pitchColor,
      pitchSize: state.field.pitchSize,
      showMarkings: state.field.showMarkings,
    },
    objects: state.objects.map((obj) => ({
      id: obj.id,
      type: obj.type,
      color: obj.color,
      size: obj.size,
      label: obj.label,
      number: obj.number,
      visible: obj.visible,
    })),
    keyframes: snapshots.map((snapshot, index) => ({
      id: state.keyframes[index]?.id ?? `keyframe-${index + 1}`,
      field: snapshot.field,
      display: snapshot.display,
      objects: snapshot.objects,
    })),
  };
};

