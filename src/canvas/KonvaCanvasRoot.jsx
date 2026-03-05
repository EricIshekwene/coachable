import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Group, Circle, Text, Image as KonvaImage, Rect, Line, Arrow, Ellipse } from "react-konva";
import Konva from "konva";
import BoardViewport from "./BoardViewport";
import { useCanvasDrawing } from "./hooks/useCanvasDrawing";
import { useDrawingSelection } from "./hooks/useDrawingSelection";
import {
  getDrawingWorldBounds,
  getTrianglePoints,
  getResizeHandles,
  hitTestHandle,
  computeResizedBounds,
  HANDLE_CURSORS,
} from "./drawingGeometry";
import { log as logKeyToolDebug } from "./keyboardToolDebugLogger";
import RugbyField from "../assets/objects/Field Vectors/Rugby_Field.png";

/** Loads an HTML Image from a URL and tracks loading status. */
const useImage = (src) => {
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!src) {
      setImage(null);
      setStatus("error");
      return;
    }
    console.log(`[useImage] loading ${src}`);
    const img = new window.Image();
    img.src = src;
    const handleLoad = () => {
      console.log(`[useImage] loaded ${src}`);
      setImage(img);
      setStatus("loaded");
    };
    const handleError = () => {
      console.log(`[useImage] error ${src}`);
      setImage(null);
      setStatus("error");
    };
    img.addEventListener("load", handleLoad);
    img.addEventListener("error", handleError);
    return () => {
      img.removeEventListener("load", handleLoad);
      img.removeEventListener("error", handleError);
    };
  }, [src]);

  return { image, status };
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const isModifierPressed = (evt) => Boolean(evt?.shiftKey || evt?.ctrlKey || evt?.metaKey);
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.1;
const WHEEL_PAN_FACTOR = 1;
const GUIDELINE_OFFSET = 5;
const SCREENSHOT_HANDLE_SIZE_PX = 10;
const SCREENSHOT_HANDLE_HIT_PADDING_PX = 16;

/**
 * Main Konva canvas component. Renders the Stage with field image, player/ball items,
 * pan/zoom, marquee selection, drag-with-snapping, and guideline layer.
 * Exposes an imperative animation renderer via `animationRendererRef` for direct
 * Konva node manipulation during playback (bypassing React state for performance).
 */
function KonvaCanvasRoot({
  tool = "select",
  camera,
  setCamera,
  items,
  fieldRotation = 0,
  onPanStart,
  onItemChange,
  onItemDragStart,
  onItemDragEnd,
  onCanvasAddPlayer,
  onCanvasPlacePrefab,
  onMarqueeSelect,
  selectedPlayerIds,
  selectedItemIds,
  onSelectItem,
  allPlayersDisplay,
  advancedSettings,
  animationRendererRef,
  onAnimationRendererReady,
  drawings = [],
  drawSubTool,
  drawColor,
  drawOpacity = 1,
  drawStrokeWidth,
  drawTension,
  drawFontSize,
  drawTextAlign,
  drawArrowHeadType,
  eraserSize = 10,
  drawShapeType = "rect",
  drawShapeStrokeColor = "#FFFFFF",
  drawShapeFill = "transparent",
  onAddDrawing,
  onRemoveDrawing,
  onRemoveMultipleDrawings,
  onUpdateDrawing,
  selectedDrawingIds = [],
  onSelectedDrawingIdsChange,
  onUpdateMultipleDrawingsNoHistory,
  historyApiRef,
  drawingSelectionRef,
  textEditing,
  onTextEditingChange,
  drawingHookRef,
  onDrawSubToolChange,
  screenshotMode = false,
  screenshotRegion,
  onScreenshotRegionChange,
  screenshotApiRef,
}) {
  const viewportRef = useRef(null);
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const guidesLayerRef = useRef(null);
  const itemsLayerRef = useRef(null);
  const itemNodeMapRef = useRef(new Map());
  const poseOverridesRef = useRef({});
  const dragStateRef = useRef(new Map());
  const draggingIdsRef = useRef(new Set());
  const panRef = useRef({
    active: false,
    pointerId: null,
    last: { x: 0, y: 0 },
  });
  const screenshotDragRef = useRef(null); // { type, startWorld, startBounds?, handlePosition? }
  const overlayLayerRef = useRef(null);

  const [size, setSize] = useState({ width: 1, height: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [marquee, setMarquee] = useState(null);
  const [isHoveringItem, setIsHoveringItem] = useState(false);
  const [eraserCursorWorld, setEraserCursorWorld] = useState(null);
  const marqueeRef = useRef({
    active: false,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    shiftKey: false,
  });

  const pitch = advancedSettings?.pitch ?? {};
  const players = advancedSettings?.players ?? {};
  const ball = advancedSettings?.ball ?? {};

  const pitchColor = pitch.pitchColor ?? undefined;
  const showMarkings = pitch.showMarkings ?? true;
  const playerBaseSizePx = players.baseSizePx ?? 30;
  const playerDisplay = allPlayersDisplay || {};
  const playerSizePercent = clamp(Number(playerDisplay.sizePercent ?? 100), 10, 400);
  const playerBasePx = Math.max(6, Number(playerBaseSizePx) || 30);
  const playerSizePx = Math.max(6, Math.round((playerBasePx * playerSizePercent) / 100));
  const playerRadius = playerSizePx / 2;
  const showNumber = playerDisplay.showNumber ?? true;
  const showName = playerDisplay.showName ?? false;
  const ballSizePercent = clamp(Number(ball.sizePercent ?? 100), 10, 400);
  const baseBallSizePx = 22;
  const ballSizePx = Math.max(6, Math.round((baseBallSizePx * ballSizePercent) / 100));
  const ballRadius = ballSizePx / 2;

  const ballImageSrc = new URL("../assets/objects/balls/white_ball.png", import.meta.url).href;
  const fieldImage = useImage(showMarkings ? RugbyField : null);
  const ballImage = useImage(ballImageSrc);
  const ballImageElement = ballImage.image;

  useEffect(() => {
    if (!containerRef.current) return;
    const node = containerRef.current;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      });
    };
    updateSize();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateSize());
      observer.observe(node);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const worldOrigin = useMemo(() => {
    const zoom = camera?.zoom || 1;
    return {
      x: size.width / 2 + (camera?.x || 0),
      y: size.height / 2 + (camera?.y || 0),
      scale: zoom,
    };
  }, [camera?.x, camera?.y, camera?.zoom, size.width, size.height]);
  const guidelineOffsetWorld = GUIDELINE_OFFSET / Math.max(0.0001, worldOrigin.scale);
  const screenshotHandleSize = SCREENSHOT_HANDLE_SIZE_PX / Math.max(0.0001, worldOrigin.scale);
  const screenshotHandleHitPadding = SCREENSHOT_HANDLE_HIT_PADDING_PX / Math.max(0.0001, worldOrigin.scale);

  const fieldBounds = useMemo(() => {
    if (!fieldImage.image) return null;
    const width = fieldImage.image.width || 0;
    const height = fieldImage.image.height || 0;
    return {
      left: -width / 2,
      right: width / 2,
      top: -height / 2,
      bottom: height / 2,
      centerX: 0,
      centerY: 0,
    };
  }, [fieldImage.image]);

  const screenshotHandles = useMemo(() => {
    if (!screenshotRegion || screenshotRegion.width <= 0 || screenshotRegion.height <= 0) return [];
    return getResizeHandles(screenshotRegion, screenshotHandleSize, 0);
  }, [screenshotRegion, screenshotHandleSize]);

  const toWorldCoords = (screen) => {
    const zoom = camera?.zoom || 1;
    return {
      x: (screen.x - size.width / 2 - (camera?.x || 0)) / zoom,
      y: (screen.y - size.height / 2 - (camera?.y || 0)) / zoom,
    };
  };

  const clearGuides = () => {
    const layer = guidesLayerRef.current;
    if (!layer) return;
    layer.destroyChildren();
    layer.batchDraw();
  };

  const drawGuides = (guides) => {
    const layer = guidesLayerRef.current;
    if (!layer) return;
    layer.destroyChildren();
    if (!guides?.length) {
      layer.batchDraw();
      return;
    }

    guides.forEach((guide) => {
      const isVertical = guide.orientation === "V";
      const screenCoord =
        guide.lineGuide * worldOrigin.scale + (isVertical ? worldOrigin.x : worldOrigin.y);
      const points = isVertical
        ? [screenCoord, 0, screenCoord, size.height]
        : [0, screenCoord, size.width, screenCoord];

      layer.add(
        new Konva.Line({
          points,
          stroke: "#FF7A18",
          strokeWidth: 1,
          dash: [4, 4],
          listening: false,
        }),
      );
    });

    layer.batchDraw();
  };

  const canvasDrawing = useCanvasDrawing({
    tool,
    subTool: drawSubTool,
    stageRef,
    toWorldCoords,
    drawings,
    drawColor,
    drawOpacity,
    drawStrokeWidth,
    drawTension,
    drawFontSize,
    drawTextAlign,
    drawArrowHeadType,
    eraserSize,
    drawShapeType,
    drawShapeStrokeColor,
    drawShapeFill,
    onAddDrawing,
    onRemoveDrawing,
    onRemoveMultipleDrawings,
    textEditing,
    onTextEditingChange,
    onSelectedDrawingIdsChange,
    onDrawSubToolChange,
    fieldBounds,
    drawGuides,
    clearGuides,
    guidelineOffsetWorld,
  });

  const drawingSelection = useDrawingSelection({
    drawings,
    toWorldCoords,
    stageRef,
    selectedDrawingIds,
    onSelectedDrawingIdsChange,
    onUpdateMultipleNoHistory: onUpdateMultipleDrawingsNoHistory,
    historyApiRef,
    zoom: camera?.zoom || 1,
    fieldBounds,
    drawGuides,
    clearGuides,
    guidelineOffsetWorld,
  });

  // Expose selection hook to parent via ref (for cancelGesture on Escape)
  useEffect(() => {
    if (!drawingSelectionRef) return;
    drawingSelectionRef.current = {
      cancelGesture: drawingSelection.cancelGesture,
    };
  });

  // Expose drawing hook API to parent via ref
  useEffect(() => {
    if (!drawingHookRef) return;
    drawingHookRef.current = {
      commitText: canvasDrawing.commitText,
      cancelText: canvasDrawing.cancelText,
      commitCustomShape: canvasDrawing.commitCustomShape,
      cancelCustomShape: canvasDrawing.cancelCustomShape,
    };
  });

  const getRenderedPose = useCallback((item) => {
    const override = poseOverridesRef.current[item.id];
    if (!override) return item;
    return {
      ...item,
      x: override.x ?? item.x,
      y: override.y ?? item.y,
      r: override.r ?? item.r,
    };
  }, []);

  const setItemNodeRef = useCallback((itemId, node) => {
    if (!itemId) return;
    if (!node) {
      itemNodeMapRef.current.delete(itemId);
      return;
    }
    itemNodeMapRef.current.set(itemId, node);
  }, []);

  const applyPoseMapToNodes = useCallback((poseMap = {}, options = {}) => {
    if (!poseMap || typeof poseMap !== "object") return;
    const flush = Boolean(options?.flush);
    Object.entries(poseMap).forEach(([itemId, pose]) => {
      if (!itemId || !pose) return;
      poseOverridesRef.current[itemId] = {
        ...(poseOverridesRef.current[itemId] || {}),
        x: pose.x,
        y: pose.y,
        ...(pose.r !== undefined ? { r: pose.r } : {}),
      };
      const node = itemNodeMapRef.current.get(itemId);
      if (!node || node.isDragging?.()) return;
      if (Number.isFinite(pose.x) && Number.isFinite(pose.y)) {
        node.position({ x: pose.x, y: pose.y });
      }
      if (Number.isFinite(pose.r)) {
        node.rotation(pose.r);
      }
    });
    const itemsLayer = itemsLayerRef.current;
    if (flush) {
      itemsLayer?.draw?.();
      stageRef.current?.draw?.();
      return;
    }
    itemsLayer?.batchDraw?.();
  }, []);

  useEffect(() => {
    if (!animationRendererRef) return undefined;
    const api = {
      setPoses: (poses, options) => applyPoseMapToNodes(poses, options),
      clearPoses: (options = {}) => {
        const flush = Boolean(options?.flush);
        poseOverridesRef.current = {};
        if (flush) {
          itemsLayerRef.current?.draw?.();
          stageRef.current?.draw?.();
          return;
        }
        itemsLayerRef.current?.batchDraw?.();
      },
      getCurrentPose: (itemId) => {
        const override = poseOverridesRef.current[itemId];
        if (override) return { ...override };
        const node = itemNodeMapRef.current.get(itemId);
        if (!node) return null;
        return { x: node.x(), y: node.y(), r: node.rotation() };
      },
    };
    animationRendererRef.current = api;
    onAnimationRendererReady?.(api);
    return () => {
      if (animationRendererRef.current === api) {
        animationRendererRef.current = null;
      }
    };
  }, [animationRendererRef, applyPoseMapToNodes, onAnimationRendererReady]);

  // Screenshot capture API
  useEffect(() => {
    if (!screenshotApiRef) return;
    const hideOverlays = () => {
      const stage = stageRef.current;
      const overlay = overlayLayerRef.current;
      const guides = guidesLayerRef.current;
      if (overlay) { overlay.visible(false); }
      if (guides) { guides.visible(false); }
      if (stage) stage.draw();
    };

    const showOverlays = () => {
      const stage = stageRef.current;
      const overlay = overlayLayerRef.current;
      const guides = guidesLayerRef.current;
      if (overlay) { overlay.visible(true); }
      if (guides) { guides.visible(true); }
      if (stage) stage.draw();
    };

    const worldToScreen = (worldRect) => {
      const scale = worldOrigin.scale;
      return {
        x: worldOrigin.x + worldRect.x * scale,
        y: worldOrigin.y + worldRect.y * scale,
        width: worldRect.width * scale,
        height: worldRect.height * scale,
      };
    };

    screenshotApiRef.current = {
      captureRegion: (worldRect, { pixelRatio = 2 } = {}) => {
        const stage = stageRef.current;
        if (!stage) return null;
        const scale = worldOrigin.scale;

        // Inset by the screenshot border stroke width so the green rect isn't captured
        const inset = 3 / scale;
        const insetRect = {
          x: worldRect.x + inset,
          y: worldRect.y + inset,
          width: Math.max(1, worldRect.width - inset * 2),
          height: Math.max(1, worldRect.height - inset * 2),
        };

        hideOverlays();
        const dataUrl = stage.toDataURL({ ...worldToScreen(insetRect), pixelRatio });
        showOverlays();
        return dataUrl;
      },

      /** Returns a Canvas element for the given world rect (faster than dataURL for video). */
      captureFrameCanvas: (worldRect, { pixelRatio = 2, flush = false } = {}) => {
        const stage = stageRef.current;
        if (!stage) return null;
        if (flush) stage.draw();
        return stage.toCanvas({ ...worldToScreen(worldRect), pixelRatio });
      },

      /** Returns world-space bounds of the field image as {x, y, width, height}. */
      getFieldWorldBounds: () => {
        if (!fieldBounds) return null;
        return {
          x: fieldBounds.left,
          y: fieldBounds.top,
          width: fieldBounds.right - fieldBounds.left,
          height: fieldBounds.bottom - fieldBounds.top,
        };
      },

      hideOverlays,
      showOverlays,
      flushRender: () => {
        const stage = stageRef.current;
        if (stage) stage.draw();
      },
    };
    return () => {
      if (screenshotApiRef.current) screenshotApiRef.current = null;
    };
  }, [screenshotApiRef, worldOrigin, fieldBounds]);

  useEffect(() => {
    if (!screenshotMode) {
      screenshotDragRef.current = null;
    }
    const layer = guidesLayerRef.current;
    if (!layer) return;
    layer.destroyChildren();
    layer.batchDraw();
  }, [screenshotMode]);

  const getLineGuideStops = (skipIdsInput) => {
    const skipIds =
      skipIdsInput instanceof Set
        ? skipIdsInput
        : new Set(skipIdsInput ? [skipIdsInput] : []);
    const centerScreenWorld = toWorldCoords({ x: size.width / 2, y: size.height / 2 });

    const vertical = [0, centerScreenWorld.x];
    const horizontal = [0, centerScreenWorld.y];
    if (fieldBounds) {
      vertical.push(fieldBounds.centerX);
      horizontal.push(fieldBounds.centerY);
    }

    items.forEach((item) => {
      if (!item || skipIds.has(item.id)) return;
      if (item.type !== "player" && item.type !== "ball") return;
      const rendered = getRenderedPose(item);
      vertical.push(rendered.x);
      horizontal.push(rendered.y);
    });

    return {
      vertical: [...new Set(vertical)],
      horizontal: [...new Set(horizontal)],
    };
  };

  const getObjectSnappingEdges = (item, node) => {
    const x = node.x();
    const y = node.y();

    return {
      vertical: [{ guide: x, offset: 0, snap: "center" }],
      horizontal: [{ guide: y, offset: 0, snap: "center" }],
    };
  };

  const getGuides = (lineGuideStops, itemBounds, offsetWorld) => {
    const result = [];

    let closestV = null;
    lineGuideStops.vertical.forEach((lineGuide) => {
      itemBounds.vertical.forEach((itemBound) => {
        const diff = Math.abs(lineGuide - itemBound.guide);
        if (diff > offsetWorld) return;
        if (!closestV || diff < closestV.diff) {
          closestV = {
            lineGuide,
            diff,
            offset: itemBound.offset,
            snap: itemBound.snap,
          };
        }
      });
    });

    let closestH = null;
    lineGuideStops.horizontal.forEach((lineGuide) => {
      itemBounds.horizontal.forEach((itemBound) => {
        const diff = Math.abs(lineGuide - itemBound.guide);
        if (diff > offsetWorld) return;
        if (!closestH || diff < closestH.diff) {
          closestH = {
            lineGuide,
            diff,
            offset: itemBound.offset,
            snap: itemBound.snap,
          };
        }
      });
    });

    if (closestV) {
      result.push({
        orientation: "V",
        lineGuide: closestV.lineGuide,
        offset: closestV.offset,
        snap: closestV.snap,
      });
    }
    if (closestH) {
      result.push({
        orientation: "H",
        lineGuide: closestH.lineGuide,
        offset: closestH.offset,
        snap: closestH.snap,
      });
    }

    return result;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        const marqueeActive = Boolean(marqueeRef.current.active);
        logKeyToolDebug(`canvas keydown Escape marqueeActive=${marqueeActive}`);
        if (!marqueeActive) return;
        marqueeRef.current.active = false;
        setMarquee(null);
        clearGuides();
        logKeyToolDebug("canvas escape action=clearMarquee");
        return;
      }

      const isZoomModifier = e.ctrlKey || e.metaKey;
      if (!isZoomModifier) return;

      const isZoomIn = e.key === "+" || e.key === "=" || e.code === "NumpadAdd";
      const isZoomOut = e.key === "-" || e.key === "_" || e.code === "NumpadSubtract";
      if (!isZoomIn && !isZoomOut) return;

      e.preventDefault();
      const direction = isZoomIn ? 1 : -1;
      setCamera((prev) => {
        const currentZoom = prev?.zoom || 1;
        const nextZoom = clamp(currentZoom + direction * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX);
        if (nextZoom === currentZoom) return prev;
        return { ...prev, zoom: nextZoom };
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setCamera]);

  const handleStageWheel = (e) => {
    const evt = e.evt;
    if (!evt) return;
    evt.preventDefault();

    const isZoomModifier = evt.ctrlKey || evt.metaKey;
    if (isZoomModifier) {
      const direction = evt.deltaY < 0 ? 1 : -1;
      setCamera((prev) => {
        const currentZoom = prev?.zoom || 1;
        const nextZoom = clamp(currentZoom + direction * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX);
        if (nextZoom === currentZoom) return prev;
        return { ...prev, zoom: nextZoom };
      });
      return;
    }

    setCamera((prev) => ({
      ...prev,
      y: (prev?.y || 0) - evt.deltaY * WHEEL_PAN_FACTOR,
    }));
  };

  const handleStagePointerDown = (e) => {
    const evt = e.evt;
    const isMiddleMouse = evt?.button === 1;
    const isPrimaryButton = evt?.button === 0 || evt?.button === undefined;
    const isAddTool = tool === "addPlayer" || tool === "color";
    const stage = stageRef.current;
    const target = e.target;

    // Screenshot region selection — takes priority over everything
    if (screenshotMode && isPrimaryButton && !isMiddleMouse) {
      const pointer = stage?.getPointerPosition?.();
      if (pointer) {
        const world = toWorldCoords(pointer);
        const hasRegion = screenshotRegion && screenshotRegion.width > 0 && screenshotRegion.height > 0;
        if (hasRegion) {
          const hitHandle = hitTestHandle(screenshotHandles, world, screenshotHandleHitPadding);
          if (hitHandle) {
            screenshotDragRef.current = {
              type: "resize",
              handlePosition: hitHandle,
              startWorld: { ...world },
              startBounds: { ...screenshotRegion },
            };
            return;
          }
        }
        screenshotDragRef.current = { type: "draw", startWorld: { ...world } };
        onScreenshotRegionChange?.(null);
        clearGuides();
      }
      return;
    }

    // Drawing tools — handle before pan/select/add
    if (tool === "pen" && !isMiddleMouse && isPrimaryButton) {
      // Select sub-tool routes to the selection hook
      if (drawSubTool === "select") {
        const handled = drawingSelection.handleSelectPointerDown(e);
        if (handled) return;
      } else {
        const handled = canvasDrawing.handlePointerDown(e);
        if (handled) return;
      }
    }

    if (isAddTool && !isMiddleMouse) {
      if (!isPrimaryButton) return;
      const pointer = stage?.getPointerPosition?.();
      if (!pointer) return;
      const world = toWorldCoords(pointer);
      onCanvasAddPlayer?.({ x: world.x, y: world.y, source: tool });
      return;
    }

    if (tool === "prefab" && !isMiddleMouse && isPrimaryButton) {
      const pointer = stage?.getPointerPosition?.();
      if (!pointer) return;
      const world = toWorldCoords(pointer);
      onCanvasPlacePrefab?.({ x: world.x, y: world.y });
      return;
    }

    if (tool === "select" && isPrimaryButton && target === stage) {
      if (panRef.current.active) return;
      setIsHoveringItem(false);
      const pointer = stage?.getPointerPosition?.();
      if (!pointer) return;
      const world = toWorldCoords(pointer);
      marqueeRef.current = {
        active: true,
        start: world,
        end: world,
        shiftKey: isModifierPressed(evt),
      };
      setMarquee({ x: world.x, y: world.y, width: 0, height: 0 });
      clearGuides();
      return;
    }

    if (!isMiddleMouse && tool !== "hand") {
      return;
    }

    if (target !== stage) return;

    panRef.current.active = true;
    panRef.current.pointerId = evt?.pointerId ?? "mouse";
    panRef.current.last = { x: evt?.clientX ?? 0, y: evt?.clientY ?? 0 };
    setIsPanning(true);
    setIsHoveringItem(false);
    onPanStart?.();
    if (isMiddleMouse) evt?.preventDefault?.();
  };

  const handleStagePointerMove = (e) => {
    if (screenshotMode && containerRef.current) {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition?.();
      if (pointer) {
        const world = toWorldCoords(pointer);
        let nextCursor = "crosshair";
        const drag = screenshotDragRef.current;
        if (drag?.type === "resize") {
          nextCursor = HANDLE_CURSORS[drag.handlePosition] || "crosshair";
        } else if (screenshotHandles.length > 0) {
          const hitHandle = hitTestHandle(screenshotHandles, world, screenshotHandleHitPadding);
          if (hitHandle) {
            nextCursor = HANDLE_CURSORS[hitHandle] || "crosshair";
          }
        }
        containerRef.current.style.cursor = nextCursor;
      }
    }

    // Screenshot region drag
    if (screenshotMode && screenshotDragRef.current) {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition?.();
      if (pointer) {
        const drag = screenshotDragRef.current;
        const world = toWorldCoords(pointer);

        if (drag.type === "resize" && drag.startBounds && drag.handlePosition) {
          const handlePosition = drag.handlePosition;
          const startBounds = drag.startBounds;
          const dragDelta = {
            dx: world.x - drag.startWorld.x,
            dy: world.y - drag.startWorld.y,
          };
          const resized = computeResizedBounds(handlePosition, startBounds, dragDelta);
          let snapped = { ...resized };

          if (fieldBounds && guidelineOffsetWorld) {
            const vStops = [0, fieldBounds.left, fieldBounds.right, fieldBounds.centerX];
            const hStops = [0, fieldBounds.top, fieldBounds.bottom, fieldBounds.centerY];
            const guides = [];

            const canResizeWest = handlePosition.includes("w");
            const canResizeEast = handlePosition.includes("e");
            const canResizeNorth = handlePosition.includes("n");
            const canResizeSouth = handlePosition.includes("s");

            if (canResizeWest || canResizeEast) {
              const vEdges = canResizeWest
                ? [
                    { guide: snapped.x, snap: "left" },
                    { guide: snapped.x + snapped.width / 2, snap: "center" },
                  ]
                : [
                    { guide: snapped.x + snapped.width, snap: "right" },
                    { guide: snapped.x + snapped.width / 2, snap: "center" },
                  ];

              let closestV = null;
              vStops.forEach((stop) => {
                vEdges.forEach((edge) => {
                  const diff = Math.abs(stop - edge.guide);
                  if (diff <= guidelineOffsetWorld && (!closestV || diff < closestV.diff)) {
                    closestV = { lineGuide: stop, diff, snap: edge.snap };
                  }
                });
              });

              if (closestV) {
                const leftFixed = startBounds.x;
                const rightFixed = startBounds.x + startBounds.width;
                if (canResizeWest) {
                  if (closestV.snap === "left") {
                    snapped.x = closestV.lineGuide;
                    snapped.width = rightFixed - snapped.x;
                  } else {
                    snapped.x = closestV.lineGuide * 2 - rightFixed;
                    snapped.width = rightFixed - snapped.x;
                  }
                } else if (canResizeEast) {
                  if (closestV.snap === "right") {
                    snapped.width = closestV.lineGuide - leftFixed;
                    snapped.x = leftFixed;
                  } else {
                    const right = closestV.lineGuide * 2 - leftFixed;
                    snapped.width = right - leftFixed;
                    snapped.x = leftFixed;
                  }
                }
                guides.push({ orientation: "V", lineGuide: closestV.lineGuide, offset: 0, snap: closestV.snap });
              }
            }

            if (canResizeNorth || canResizeSouth) {
              const hEdges = canResizeNorth
                ? [
                    { guide: snapped.y, snap: "top" },
                    { guide: snapped.y + snapped.height / 2, snap: "center" },
                  ]
                : [
                    { guide: snapped.y + snapped.height, snap: "bottom" },
                    { guide: snapped.y + snapped.height / 2, snap: "center" },
                  ];

              let closestH = null;
              hStops.forEach((stop) => {
                hEdges.forEach((edge) => {
                  const diff = Math.abs(stop - edge.guide);
                  if (diff <= guidelineOffsetWorld && (!closestH || diff < closestH.diff)) {
                    closestH = { lineGuide: stop, diff, snap: edge.snap };
                  }
                });
              });

              if (closestH) {
                const topFixed = startBounds.y;
                const bottomFixed = startBounds.y + startBounds.height;
                if (canResizeNorth) {
                  if (closestH.snap === "top") {
                    snapped.y = closestH.lineGuide;
                    snapped.height = bottomFixed - snapped.y;
                  } else {
                    snapped.y = closestH.lineGuide * 2 - bottomFixed;
                    snapped.height = bottomFixed - snapped.y;
                  }
                } else if (canResizeSouth) {
                  if (closestH.snap === "bottom") {
                    snapped.height = closestH.lineGuide - topFixed;
                    snapped.y = topFixed;
                  } else {
                    const bottom = closestH.lineGuide * 2 - topFixed;
                    snapped.height = bottom - topFixed;
                    snapped.y = topFixed;
                  }
                }
                guides.push({ orientation: "H", lineGuide: closestH.lineGuide, offset: 0, snap: closestH.snap });
              }
            }

            const MIN_SIZE = 4;
            if (canResizeWest) {
              if (snapped.width < MIN_SIZE) {
                const rightFixed = startBounds.x + startBounds.width;
                snapped.width = MIN_SIZE;
                snapped.x = rightFixed - MIN_SIZE;
              }
            } else if (canResizeEast) {
              if (snapped.width < MIN_SIZE) {
                snapped.width = MIN_SIZE;
                snapped.x = startBounds.x;
              }
            }

            if (canResizeNorth) {
              if (snapped.height < MIN_SIZE) {
                const bottomFixed = startBounds.y + startBounds.height;
                snapped.height = MIN_SIZE;
                snapped.y = bottomFixed - MIN_SIZE;
              }
            } else if (canResizeSouth) {
              if (snapped.height < MIN_SIZE) {
                snapped.height = MIN_SIZE;
                snapped.y = startBounds.y;
              }
            }

            if (guides.length) {
              drawGuides(guides);
            } else {
              clearGuides();
            }
          } else {
            clearGuides();
          }

          onScreenshotRegionChange?.(snapped);
          return;
        }

        const start = drag.startWorld;
        let endX = world.x;
        let endY = world.y;

        if (fieldBounds && guidelineOffsetWorld) {
          const startX = start.x;
          const startY = start.y;
          const tentBounds = {
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: Math.abs(endX - startX),
            height: Math.abs(endY - startY),
          };
          const cx = tentBounds.x + tentBounds.width / 2;
          const cy = tentBounds.y + tentBounds.height / 2;
          const vStops = [0, fieldBounds.left, fieldBounds.right, fieldBounds.centerX];
          const hStops = [0, fieldBounds.top, fieldBounds.bottom, fieldBounds.centerY];
          const vEdges = [
            { guide: tentBounds.x, offset: tentBounds.x - cx, snap: "left" },
            { guide: cx, offset: 0, snap: "center" },
            { guide: tentBounds.x + tentBounds.width, offset: tentBounds.x + tentBounds.width - cx, snap: "right" },
          ];
          const hEdges = [
            { guide: tentBounds.y, offset: tentBounds.y - cy, snap: "top" },
            { guide: cy, offset: 0, snap: "center" },
            { guide: tentBounds.y + tentBounds.height, offset: tentBounds.y + tentBounds.height - cy, snap: "bottom" },
          ];

          let closestV = null;
          vStops.forEach((stop) => {
            vEdges.forEach((edge) => {
              const diff = Math.abs(stop - edge.guide);
              if (diff <= guidelineOffsetWorld && (!closestV || diff < closestV.diff)) {
                closestV = { lineGuide: stop, diff, offset: edge.offset, snap: edge.snap };
              }
            });
          });

          let closestH = null;
          hStops.forEach((stop) => {
            hEdges.forEach((edge) => {
              const diff = Math.abs(stop - edge.guide);
              if (diff <= guidelineOffsetWorld && (!closestH || diff < closestH.diff)) {
                closestH = { lineGuide: stop, diff, offset: edge.offset, snap: edge.snap };
              }
            });
          });

          const guides = [];
          if (closestV) {
            const snapTarget = closestV.lineGuide;
            const edgeSnap = closestV.snap;
            if (edgeSnap === "left" || edgeSnap === "right") {
              endX = world.x + (snapTarget - (edgeSnap === "left" ? Math.min(startX, world.x) : Math.max(startX, world.x)));
            } else {
              const mid = (startX + endX) / 2;
              endX += (snapTarget - mid);
            }
            guides.push({ orientation: "V", lineGuide: snapTarget, offset: closestV.offset, snap: closestV.snap });
          }

          if (closestH) {
            const snapTarget = closestH.lineGuide;
            const edgeSnap = closestH.snap;
            if (edgeSnap === "top" || edgeSnap === "bottom") {
              endY = world.y + (snapTarget - (edgeSnap === "top" ? Math.min(startY, world.y) : Math.max(startY, world.y)));
            } else {
              const mid = (startY + endY) / 2;
              endY += (snapTarget - mid);
            }
            guides.push({ orientation: "H", lineGuide: snapTarget, offset: closestH.offset, snap: closestH.snap });
          }

          if (guides.length) {
            drawGuides(guides);
          } else {
            clearGuides();
          }
        } else {
          clearGuides();
        }

        onScreenshotRegionChange?.({
          x: Math.min(start.x, endX),
          y: Math.min(start.y, endY),
          width: Math.abs(endX - start.x),
          height: Math.abs(endY - start.y),
        });
      }
      return;
    }

    // Track eraser cursor position
    if (tool === "pen" && drawSubTool === "erase") {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition?.();
      if (pointer) {
        setEraserCursorWorld(toWorldCoords(pointer));
      }
    } else if (eraserCursorWorld) {
      setEraserCursorWorld(null);
    }

    // Imperatively update cursor for drawing selection handles
    if (!screenshotMode && tool === "pen" && drawSubTool === "select" && containerRef.current) {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition?.();
      if (pointer) {
        const world = toWorldCoords(pointer);
        const selCur = drawingSelection.getSelectionCursor(world);
        if (selCur) {
          containerRef.current.style.cursor = selCur;
        } else {
          containerRef.current.style.cursor = "default";
        }
      }
    }

    // Drawing tools — handle before marquee/pan
    if (tool === "pen") {
      if (drawSubTool === "select") {
        const handled = drawingSelection.handleSelectPointerMove(e);
        if (handled) return;
      } else {
        const handled = canvasDrawing.handlePointerMove(e);
        if (handled) return;
      }
    }

    if (marqueeRef.current.active) {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition?.();
      if (!pointer) return;
      const world = toWorldCoords(pointer);
      marqueeRef.current.end = world;
      const start = marqueeRef.current.start;
      const x = Math.min(start.x, world.x);
      const y = Math.min(start.y, world.y);
      const width = Math.abs(world.x - start.x);
      const height = Math.abs(world.y - start.y);
      setMarquee({ x, y, width, height });
      return;
    }
    if (!panRef.current.active) return;
    const evt = e.evt;
    if (panRef.current.pointerId !== (evt?.pointerId ?? "mouse")) return;
    const dx = (evt?.clientX ?? 0) - panRef.current.last.x;
    const dy = (evt?.clientY ?? 0) - panRef.current.last.y;
    panRef.current.last = { x: evt?.clientX ?? 0, y: evt?.clientY ?? 0 };
    setCamera((prev) => ({ ...prev, x: (prev?.x || 0) + dx, y: (prev?.y || 0) + dy }));
  };

  const handleStagePointerUp = (e) => {
    // Screenshot region commit
    if (screenshotMode && screenshotDragRef.current) {
      screenshotDragRef.current = null;
      clearGuides();
      return;
    }

    // Drawing tools
    if (tool === "pen") {
      if (drawSubTool === "select") {
        const handled = drawingSelection.handleSelectPointerUp(e);
        if (handled) return;
      } else {
        const handled = canvasDrawing.handlePointerUp(e);
        if (handled) return;
      }
    }

    if (marqueeRef.current.active) {
      const start = marqueeRef.current.start;
      const end = marqueeRef.current.end;
      const modifierKey = marqueeRef.current.shiftKey;
      marqueeRef.current.active = false;
      setMarquee(null);

      const x1 = Math.min(start.x, end.x);
      const y1 = Math.min(start.y, end.y);
      const x2 = Math.max(start.x, end.x);
      const y2 = Math.max(start.y, end.y);

      const DRAG_THRESHOLD = 3;
      if (Math.abs(x2 - x1) < DRAG_THRESHOLD && Math.abs(y2 - y1) < DRAG_THRESHOLD) {
        if (tool === "select" && !modifierKey) {
          onSelectItem?.(null, null, { mode: "clear" });
        }
        return;
      }

      const radius = playerRadius;

      const intersects = (itemX, itemY, itemRadius) => {
        // Intersects rule: select if item's square bounds intersect marquee rect.
        const itemLeft = itemX - itemRadius;
        const itemRight = itemX + itemRadius;
        const itemTop = itemY - itemRadius;
        const itemBottom = itemY + itemRadius;
        return !(itemRight < x1 || itemLeft > x2 || itemBottom < y1 || itemTop > y2);
      };

      const selected = items
        .filter((item) => item?.type === "player" || item?.type === "ball")
        .filter((item) => {
          const rendered = getRenderedPose(item);
          const itemRadius = item.type === "ball" ? ballRadius : radius;
          return intersects(rendered.x, rendered.y, itemRadius);
        })
        .map((item) => item.id);

      onMarqueeSelect?.(selected, { mode: modifierKey ? "add" : "replace" });
      return;
    }
    if (!panRef.current.active) return;
    const evt = e.evt;
    if (panRef.current.pointerId !== (evt?.pointerId ?? "mouse")) return;
    panRef.current.active = false;
    panRef.current.pointerId = null;
    setIsPanning(false);
    setIsHoveringItem(false);
  };

  const handleItemDragStart = (item) => () => {
    draggingIdsRef.current.add(item.id);
    const node = itemNodeMapRef.current.get(item.id);
    if (node) {
      dragStateRef.current.set(item.id, { x: node.x(), y: node.y() });
    } else {
      const rendered = getRenderedPose(item);
      dragStateRef.current.set(item.id, { x: rendered.x, y: rendered.y });
    }
    clearGuides();
    setIsHoveringItem(false);
    onItemDragStart?.(item.id);
  };

  const handleItemDragMove = (item) => (e) => {
    const node = e.target;
    const canSnap = tool === "select" && !marqueeRef.current.active && !panRef.current.active;
    if (canSnap) {
      const isMultiSelectDrag =
        selectedItemIds?.length > 1 && selectedItemIds.includes(item.id);
      const excludedSnapIds = isMultiSelectDrag
        ? new Set(selectedItemIds)
        : new Set([item.id]);
      const lineGuideStops = getLineGuideStops(excludedSnapIds);
      const itemBounds = getObjectSnappingEdges(item, node);
      const guides = getGuides(lineGuideStops, itemBounds, guidelineOffsetWorld);
      if (guides.length) {
        let nextX = node.x();
        let nextY = node.y();
        guides.forEach((guide) => {
          if (guide.orientation === "V") nextX = guide.lineGuide + guide.offset;
          if (guide.orientation === "H") nextY = guide.lineGuide + guide.offset;
        });
        node.position({ x: nextX, y: nextY });
        drawGuides(guides);
      } else {
        clearGuides();
      }
    } else {
      clearGuides();
    }

    const next = { x: node.x(), y: node.y() };
    poseOverridesRef.current[item.id] = {
      ...(poseOverridesRef.current[item.id] || {}),
      x: next.x,
      y: next.y,
      r: node.rotation(),
    };
    const rendered = getRenderedPose(item);
    const last = dragStateRef.current.get(item.id) || { x: rendered.x, y: rendered.y };
    const delta = { x: next.x - last.x, y: next.y - last.y };
    dragStateRef.current.set(item.id, next);
    onItemChange?.(item.id, next, { delta });
  };

  const handleItemDragEnd = (item) => () => {
    draggingIdsRef.current.add(item.id);
    dragStateRef.current.delete(item.id);
    clearGuides();
    onItemDragEnd?.(item.id);
    setTimeout(() => draggingIdsRef.current.delete(item.id), 0);
    setIsHoveringItem(false);
  };

  const handleItemClick = (item) => (e) => {
    if (tool !== "select") return;
    if (draggingIdsRef.current.has(item.id)) return;
    const modifierKey = isModifierPressed(e?.evt);
    const mode = modifierKey ? "toggle" : "replace";
    onSelectItem?.(item.id, item.type, { mode });
    e.cancelBubble = true;
  };

  const isMarqueeActive = Boolean(marquee);

  const isDragging = draggingIdsRef.current.size > 0;

  const drawCursor =
    drawSubTool === "select" ? "default" : drawSubTool === "text" ? "text" : drawSubTool === "erase" ? "crosshair" : "crosshair";
  const baseCursor =
    tool === "hand"
      ? "grab"
      : tool === "pen"
        ? drawCursor
        : tool === "addPlayer" || tool === "color"
          ? "copy"
          : "default";
  const hoverAllowed = !isMarqueeActive && !isPanning && !isDragging;
  const derivedCursor =
    screenshotMode
      ? "crosshair"
      : isPanning || isDragging
        ? "grabbing"
        : hoverAllowed && isHoveringItem
          ? "pointer"
          : baseCursor;

  const ARROW_HEAD_STYLES = {
    standard: { pointerLength: 10, pointerWidth: 8 },
    thin: { pointerLength: 12, pointerWidth: 4 },
    wide: { pointerLength: 8, pointerWidth: 14 },
    chevron: { pointerLength: 14, pointerWidth: 18 },
    none: { pointerLength: 0, pointerWidth: 0 },
  };

  const erasingIds = canvasDrawing.erasingIds;

  const renderDrawingNode = (d, key) => {
    const isErasing = erasingIds && erasingIds.has(d.id);
    const drawingOpacity = d.opacity == null ? 1 : d.opacity;
    const opacity = isErasing ? Math.min(0.3, drawingOpacity) : drawingOpacity;

    if (d.type === "stroke") {
      return (
        <Line
          key={key}
          points={d.points}
          stroke={d.color || "#FFFFFF"}
          strokeWidth={d.strokeWidth || 3}
          lineCap="round"
          lineJoin="round"
          tension={d.tension ?? 0.3}
          opacity={opacity}
          listening={false}
        />
      );
    }
    if (d.type === "arrow") {
      const headStyle = ARROW_HEAD_STYLES[d.arrowHeadType] || ARROW_HEAD_STYLES.standard;
      return (
        <Arrow
          key={key}
          points={d.points}
          stroke={d.color || "#FFFFFF"}
          fill={d.color || "#FFFFFF"}
          strokeWidth={d.strokeWidth || 3}
          pointerLength={headStyle.pointerLength}
          pointerWidth={headStyle.pointerWidth}
          lineCap="round"
          lineJoin="round"
          opacity={opacity}
          listening={false}
        />
      );
    }
    if (d.type === "text") {
      const isTextSelected = selectedDrawingIds.includes(d.id);
      return (
        <React.Fragment key={key}>
          <Text
            x={d.x}
            y={d.y}
            rotation={d.rotation || 0}
            text={d.text || ""}
            fill={d.color || "#FFFFFF"}
            fontSize={d.fontSize || 18}
            fontFamily="DmSans"
            align={d.align || "left"}
            width={d.width || undefined}
            wrap={d.width ? "word" : "none"}
            padding={d.width ? 4 : 0}
            opacity={opacity}
            listening={false}
          />
          {isTextSelected && (() => {
            const b = getDrawingWorldBounds(d);
            const sw = 1 / (camera?.zoom || 1);
            return (
              <Rect
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                stroke="#FF7A18"
                strokeWidth={sw}
                dash={[3, 2]}
                listening={false}
              />
            );
          })()}
        </React.Fragment>
      );
    }
    if (d.type === "shape") {
      const fillColor = d.fill === "transparent" ? undefined : (d.fill || undefined);
      const strokeColor = d.color === "transparent" ? undefined : (d.color || "#FFFFFF");
      const sw = strokeColor ? (d.strokeWidth || 2) : 0;

      if (d.shapeType === "rect") {
        return (
          <Rect
            key={key}
            x={d.x}
            y={d.y}
            width={d.width || 0}
            height={d.height || 0}
            rotation={d.rotation || 0}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={sw}
            opacity={opacity}
            listening={false}
          />
        );
      }
      if (d.shapeType === "ellipse") {
        return (
          <Ellipse
            key={key}
            x={(d.x || 0) + (d.width || 0) / 2}
            y={(d.y || 0) + (d.height || 0) / 2}
            radiusX={(d.width || 0) / 2}
            radiusY={(d.height || 0) / 2}
            rotation={d.rotation || 0}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={sw}
            opacity={opacity}
            listening={false}
          />
        );
      }
      if (d.shapeType === "triangle") {
        const triPts = getTrianglePoints(d);
        return (
          <Line
            key={key}
            points={triPts}
            closed
            rotation={d.rotation || 0}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={sw}
            lineJoin="round"
            opacity={opacity}
            listening={false}
          />
        );
      }
      if (d.shapeType === "custom" && d.points?.length >= 4) {
        return (
          <Line
            key={key}
            points={d.points}
            closed
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={sw}
            lineJoin="round"
            opacity={opacity}
            listening={false}
          />
        );
      }
      return null;
    }
    return null;
  };

  return (
    <BoardViewport
      ref={viewportRef}
      className="bg-BrandGreen"
      style={pitchColor ? { backgroundColor: pitchColor } : undefined}
    >
      <div ref={containerRef} className="absolute inset-0" style={{ cursor: derivedCursor }}>
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          onMouseDown={handleStagePointerDown}
          onMouseMove={handleStagePointerMove}
          onMouseUp={handleStagePointerUp}
          onTouchStart={handleStagePointerDown}
          onTouchMove={handleStagePointerMove}
          onTouchEnd={handleStagePointerUp}
          onWheel={handleStageWheel}
        >
          <Layer ref={itemsLayerRef}>
            <Group x={worldOrigin.x} y={worldOrigin.y} scaleX={worldOrigin.scale} scaleY={worldOrigin.scale}>
              {/* Background fill in world coordinates so exports always capture the pitch color */}
              <Rect
                x={-5000}
                y={-5000}
                width={10000}
                height={10000}
                fill={pitchColor || "#4FA85D"}
                listening={false}
              />
              {fieldImage.image && (
                // Rotation model: rotate only the field image so world coordinates stay axis-aligned.
                // This keeps dragging, marquee selection, and timeline/keyframes intuitive and unrotated.
                <KonvaImage
                  image={fieldImage.image}
                  x={0}
                  y={0}
                  offsetX={fieldImage.image.width / 2}
                  offsetY={fieldImage.image.height / 2}
                  rotation={fieldRotation}
                  listening={false}
                />
              )}
              {items.map((item) => {
                const renderedItem = getRenderedPose(item);
                const isSelected =
                  item.type === "player"
                    ? selectedPlayerIds?.includes(item.id)
                    : selectedItemIds?.includes(item.id);
                const draggable = tool === "select" && item.draggable !== false && !isMarqueeActive;

                if (item.type === "ball") {
                  return (
                    <Group
                      key={item.id}
                      ref={(node) => setItemNodeRef(item.id, node)}
                      x={renderedItem.x}
                      y={renderedItem.y}
                      rotation={renderedItem.r || 0}
                      draggable={draggable}
                      onMouseEnter={() => {
                        if (!draggable || !hoverAllowed) return;
                        setIsHoveringItem(true);
                      }}
                      onMouseLeave={() => {
                        if (!draggable) return;
                        setIsHoveringItem(false);
                      }}
                      onDragStart={handleItemDragStart(item)}
                      onDragMove={handleItemDragMove(item)}
                      onDragEnd={handleItemDragEnd(item)}
                      onClick={handleItemClick(item)}
                      onTap={handleItemClick(item)}
                      onMouseDown={(e) => {
                        e.cancelBubble = true;
                      }}
                      onTouchStart={(e) => {
                        e.cancelBubble = true;
                      }}
                    >
                      {ballImageElement ? (() => {
                        const naturalMax = Math.max(ballImageElement.width || 1, ballImageElement.height || 1);
                        const scale = ballSizePx / naturalMax;
                        const width = ballImageElement.width * scale;
                        const height = ballImageElement.height * scale;
                        return (
                          <KonvaImage
                            image={ballImageElement}
                            x={0}
                            y={0}
                            width={width}
                            height={height}
                            offsetX={width / 2}
                            offsetY={height / 2}
                            shadowColor="black"
                            shadowOpacity={0.25}
                            shadowBlur={2}
                          />
                        );
                      })() : null}
                      {isSelected && (
                        <Circle
                          radius={ballSizePx / 2 + 2}
                          stroke="#FF7A18"
                          strokeWidth={2}
                          listening={false}
                        />
                      )}
                    </Group>
                  );
                }

                const sizePx = playerSizePx;
                const radius = playerRadius;
                const numberText = item.number ?? "";
                const nameText = item.name ?? "";
                const color = item.color || playerDisplay.color || "#ef4444";

                return (
                  <Group
                    key={item.id}
                    ref={(node) => setItemNodeRef(item.id, node)}
                    x={renderedItem.x}
                    y={renderedItem.y}
                    rotation={renderedItem.r || 0}
                    draggable={draggable}
                    onMouseEnter={() => {
                      if (!draggable || !hoverAllowed) return;
                      setIsHoveringItem(true);
                    }}
                    onMouseLeave={() => {
                      if (!draggable) return;
                      setIsHoveringItem(false);
                    }}
                    onDragStart={handleItemDragStart(item)}
                    onDragMove={handleItemDragMove(item)}
                    onDragEnd={handleItemDragEnd(item)}
                    onClick={handleItemClick(item)}
                    onTap={handleItemClick(item)}
                    onMouseDown={(e) => {
                      e.cancelBubble = true;
                    }}
                    onTouchStart={(e) => {
                      e.cancelBubble = true;
                    }}
                  >
                    <Circle
                      radius={radius}
                      fill={color}
                      stroke={isSelected ? "#FF7A18" : "#111827"}
                      strokeWidth={isSelected ? 3 : 2}
                    />
                    {showNumber && numberText !== "" && (
                      <Text
                        text={String(numberText)}
                        width={sizePx}
                        height={sizePx}
                        offsetX={radius}
                        offsetY={radius}
                        align="center"
                        verticalAlign="middle"
                        fontFamily="DmSans"
                        fontStyle="bold"
                        fontSize={Math.max(10, Math.round(sizePx * 0.45))}
                        fill="#111827"
                        listening={false}
                      />
                    )}
                    {showName && nameText !== "" && (
                      <Text
                        text={String(nameText)}
                        y={radius + 6}
                        width={sizePx}
                        offsetX={radius}
                        align="center"
                        fontFamily="DmSans"
                        fontStyle="bold"
                        fontSize={Math.max(9, Math.round(sizePx * 0.32))}
                        fill="#111827"
                        listening={false}
                      />
                    )}
                  </Group>
                );
              })}
            </Group>
          </Layer>
          <Layer listening={false} name="drawingsLayer">
            <Group x={worldOrigin.x} y={worldOrigin.y} scaleX={worldOrigin.scale} scaleY={worldOrigin.scale}>
              {drawings.map((d) => renderDrawingNode(d, d.id))}
              {canvasDrawing.activeDrawing && renderDrawingNode(canvasDrawing.activeDrawing, "active-preview")}
              {/* Custom shape preview line (from last point to cursor) */}
              {canvasDrawing.customPreviewLine && (() => {
                const pl = canvasDrawing.customPreviewLine;
                return (
                  <Line
                    points={[pl.x1, pl.y1, pl.x2, pl.y2]}
                    stroke="#FF7A18"
                    strokeWidth={1 / (camera?.zoom || 1)}
                    dash={[4, 3]}
                    listening={false}
                  />
                );
              })()}
              {/* Multi-selection bounds box */}
              {drawingSelection.selectionBounds && selectedDrawingIds.length > 0 && (() => {
                const sb = drawingSelection.selectionBounds;
                const pad = 4 / (camera?.zoom || 1);
                const sw = 1.5 / (camera?.zoom || 1);
                return (
                  <React.Fragment>
                    <Rect
                      x={sb.x - pad}
                      y={sb.y - pad}
                      width={sb.width + pad * 2}
                      height={sb.height + pad * 2}
                      stroke="#FF7A18"
                      strokeWidth={sw}
                      dash={[4, 3]}
                      listening={false}
                    />
                    {/* Resize handles */}
                    {drawingSelection.handles.map((h) => (
                      <Rect
                        key={h.position}
                        x={h.x}
                        y={h.y}
                        width={h.width}
                        height={h.height}
                        fill="#FFFFFF"
                        stroke="#FF7A18"
                        strokeWidth={1 / (camera?.zoom || 1)}
                        listening={false}
                      />
                    ))}
                    {/* Rotate handle */}
                    {drawingSelection.rotateHandlePos && (() => {
                      const rh = drawingSelection.rotateHandlePos;
                      const r = 5 / (camera?.zoom || 1);
                      const lineTop = sb.y - pad;
                      return (
                        <React.Fragment>
                          <Line
                            points={[rh.x, lineTop, rh.x, rh.y + r]}
                            stroke="#FF7A18"
                            strokeWidth={1 / (camera?.zoom || 1)}
                            listening={false}
                          />
                          <Circle
                            x={rh.x}
                            y={rh.y}
                            radius={r}
                            fill="#FFFFFF"
                            stroke="#FF7A18"
                            strokeWidth={1 / (camera?.zoom || 1)}
                            listening={false}
                          />
                        </React.Fragment>
                      );
                    })()}
                  </React.Fragment>
                );
              })()}
              {/* Arrow endpoint handles (single arrow selected) */}
              {selectedDrawingIds.length === 1 && (() => {
                const selD = drawings.find((d) => d.id === selectedDrawingIds[0]);
                if (!selD || selD.type !== "arrow" || !selD.points || selD.points.length < 4) return null;
                const r = 5 / (camera?.zoom || 1);
                const sw = 1.5 / (camera?.zoom || 1);
                return (
                  <React.Fragment>
                    <Circle
                      x={selD.points[0]}
                      y={selD.points[1]}
                      radius={r}
                      fill="#FF7A18"
                      stroke="#FFFFFF"
                      strokeWidth={sw}
                      listening={false}
                    />
                    <Circle
                      x={selD.points[2]}
                      y={selD.points[3]}
                      radius={r}
                      fill="#FF7A18"
                      stroke="#FFFFFF"
                      strokeWidth={sw}
                      listening={false}
                    />
                  </React.Fragment>
                );
              })()}
              {/* Drawing marquee (pen+select mode) */}
              {drawingSelection.drawingMarquee && (
                <Rect
                  x={drawingSelection.drawingMarquee.x}
                  y={drawingSelection.drawingMarquee.y}
                  width={drawingSelection.drawingMarquee.width}
                  height={drawingSelection.drawingMarquee.height}
                  fill="rgba(255, 122, 24, 0.15)"
                  stroke="#FF7A18"
                  strokeWidth={1.5 / (camera?.zoom || 1)}
                  dash={[6, 3]}
                  listening={false}
                />
              )}
              {/* Eraser cursor circle */}
              {eraserCursorWorld && drawSubTool === "erase" && tool === "pen" && (
                <Circle
                  x={eraserCursorWorld.x}
                  y={eraserCursorWorld.y}
                  radius={eraserSize / 2}
                  fill="transparent"
                  stroke="#FFFFFF"
                  strokeWidth={1 / (camera?.zoom || 1)}
                  dash={[3, 2]}
                  listening={false}
                />
              )}
            </Group>
          </Layer>
          <Layer listening={false} name="guidesLayer" ref={guidesLayerRef} />
          <Layer listening={false} ref={overlayLayerRef}>
            <Group x={worldOrigin.x} y={worldOrigin.y} scaleX={worldOrigin.scale} scaleY={worldOrigin.scale}>
              {marquee && (
                <Rect
                  x={marquee.x}
                  y={marquee.y}
                  width={marquee.width}
                  height={marquee.height}
                  fill="rgba(255, 122, 24, 0.15)"
                  stroke="#FF7A18"
                  strokeWidth={1.5}
                  listening={false}
                />
              )}
              {screenshotMode && screenshotRegion && screenshotRegion.width > 0 && screenshotRegion.height > 0 && (
                <React.Fragment>
                  <Rect
                    x={screenshotRegion.x}
                    y={screenshotRegion.y}
                    width={screenshotRegion.width}
                    height={screenshotRegion.height}
                    fill="rgba(255, 255, 255, 0.08)"
                    stroke="#22c55e"
                    strokeWidth={2 / (camera?.zoom || 1)}
                    dash={[6, 4]}
                    listening={false}
                  />
                  {screenshotHandles.map((h) => (
                    <Rect
                      key={`screenshot-handle-${h.position}`}
                      x={h.x}
                      y={h.y}
                      width={h.width}
                      height={h.height}
                      fill="#FFFFFF"
                      stroke="#22c55e"
                      strokeWidth={1 / (camera?.zoom || 1)}
                      listening={false}
                    />
                  ))}
                </React.Fragment>
              )}
            </Group>
          </Layer>
        </Stage>
      </div>
    </BoardViewport>
  );
}

export default React.memo(KonvaCanvasRoot);
