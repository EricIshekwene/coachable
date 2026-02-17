import React, { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Group, Circle, Text, Image as KonvaImage, Rect } from "react-konva";
import Konva from "konva";
import BoardViewport from "./BoardViewport";
import RugbyField from "../assets/objects/Field Vectors/Rugby_Field.png";

const useImage = (src) => {
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!src) {
      setImage(null);
      setStatus("error");
      return;
    }
    const img = new window.Image();
    img.src = src;
    const handleLoad = () => {
      setImage(img);
      setStatus("loaded");
    };
    const handleError = () => {
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

export default function KonvaCanvasRoot({
  tool = "hand",
  camera,
  setCamera,
  items,
  isPlaying = false,
  liveSnapshotRef,
  fieldRotation = 0,
  onPanStart,
  onItemChange,
  onItemDragStart,
  onItemDragEnd,
  onCanvasAddPlayer,
  onMarqueeSelect,
  selectedPlayerIds,
  selectedItemIds,
  onSelectItem,
  allPlayersDisplay,
  advancedSettings,
}) {
  const viewportRef = useRef(null);
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const itemsLayerRef = useRef(null);
  const guidesLayerRef = useRef(null);
  const itemNodeRefs = useRef(new Map());
  const itemPositionsRef = useRef(new Map());
  const drawRafRef = useRef(null);
  const dragSessionRef = useRef(null);
  const draggingIdsRef = useRef(new Set());
  const suppressClickRef = useRef(new Set());
  const lastAppliedSnapshotRef = useRef(null);
  const panRef = useRef({
    active: false,
    pointerId: null,
    last: { x: 0, y: 0 },
  });

  const [size, setSize] = useState({ width: 1, height: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [marquee, setMarquee] = useState(null);
  const [isHoveringItem, setIsHoveringItem] = useState(false);
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

  const ballImageSrc = new URL("../assets/objects/balls/white_ball.png", import.meta.url).href;
  const fieldImage = useImage(showMarkings ? RugbyField : null);
  const ballImage = useImage(ballImageSrc);
  const ballImageElement = ballImage.image;

  const scheduleDraw = () => {
    if (drawRafRef.current) return;
    drawRafRef.current = requestAnimationFrame(() => {
      drawRafRef.current = null;
      itemsLayerRef.current?.batchDraw?.();
    });
  };

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

  useEffect(() => {
    return () => {
      if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
    };
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

  const fieldBounds = useMemo(() => {
    if (!fieldImage.image) return null;
    const width = fieldImage.image.width || 0;
    const height = fieldImage.image.height || 0;
    return {
      centerX: 0,
      centerY: 0,
      left: -width / 2,
      right: width / 2,
      top: -height / 2,
      bottom: height / 2,
    };
  }, [fieldImage.image]);

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
        })
      );
    });

    layer.batchDraw();
  };

  const getLineGuideStops = (skipIds = new Set()) => {
    const centerScreenWorld = toWorldCoords({ x: size.width / 2, y: size.height / 2 });
    const vertical = [0, centerScreenWorld.x];
    const horizontal = [0, centerScreenWorld.y];

    if (fieldBounds) {
      vertical.push(fieldBounds.centerX);
      horizontal.push(fieldBounds.centerY);
    }

    itemPositionsRef.current.forEach((pos, id) => {
      if (skipIds.has(id)) return;
      if (!pos) return;
      vertical.push(pos.x);
      horizontal.push(pos.y);
    });

    return {
      vertical: [...new Set(vertical)],
      horizontal: [...new Set(horizontal)],
    };
  };

  const getObjectSnappingEdges = (node) => {
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
    const nextIds = new Set();
    items.forEach((item) => {
      if (!item?.id) return;
      nextIds.add(item.id);
      const existing = itemPositionsRef.current.get(item.id);
      if (!existing || existing.x !== item.x || existing.y !== item.y) {
        itemPositionsRef.current.set(item.id, { x: item.x, y: item.y });
      }
      const node = itemNodeRefs.current.get(item.id);
      if (node && !draggingIdsRef.current.has(item.id)) {
        node.position({ x: item.x, y: item.y });
      }
    });

    Array.from(itemPositionsRef.current.keys()).forEach((id) => {
      if (!nextIds.has(id)) {
        itemPositionsRef.current.delete(id);
        itemNodeRefs.current.delete(id);
      }
    });

    scheduleDraw();
  }, [items]);

  useEffect(() => {
    const snapshot = liveSnapshotRef?.current;
    if (!snapshot || dragSessionRef.current) return;
    if (snapshot === lastAppliedSnapshotRef.current) return;

    Object.entries(snapshot.playersById || {}).forEach(([id, player]) => {
      if (!id || !player) return;
      const next = { x: player.x ?? 0, y: player.y ?? 0 };
      const curr = itemPositionsRef.current.get(id);
      if (curr && curr.x === next.x && curr.y === next.y) return;
      itemPositionsRef.current.set(id, next);
      const node = itemNodeRefs.current.get(id);
      if (node) node.position(next);
    });

    if (snapshot.ball?.id) {
      const id = snapshot.ball.id;
      const next = { x: snapshot.ball.x ?? 0, y: snapshot.ball.y ?? 0 };
      const curr = itemPositionsRef.current.get(id);
      if (!curr || curr.x !== next.x || curr.y !== next.y) {
        itemPositionsRef.current.set(id, next);
        const node = itemNodeRefs.current.get(id);
        if (node) node.position(next);
      }
    }

    lastAppliedSnapshotRef.current = snapshot;
    scheduleDraw();
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (!marqueeRef.current.active) return;
        marqueeRef.current.active = false;
        setMarquee(null);
        clearGuides();
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

    if (isAddTool && !isMiddleMouse) {
      if (!isPrimaryButton) return;
      const pointer = stage?.getPointerPosition?.();
      if (!pointer) return;
      const world = toWorldCoords(pointer);
      onCanvasAddPlayer?.({ x: world.x, y: world.y, source: tool });
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

    if (!isMiddleMouse && tool !== "hand") return;
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
        const itemLeft = itemX - itemRadius;
        const itemRight = itemX + itemRadius;
        const itemTop = itemY - itemRadius;
        const itemBottom = itemY + itemRadius;
        return !(itemRight < x1 || itemLeft > x2 || itemBottom < y1 || itemTop > y2);
      };

      const selected = items
        .filter((item) => item?.type === "player" || item?.type === "ball")
        .filter((item) => {
          const itemRadius = item.type === "ball" ? ballSizePx / 2 : radius;
          const pos = itemPositionsRef.current.get(item.id) || { x: item.x, y: item.y };
          return intersects(pos.x, pos.y, itemRadius);
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

  const resolveDragIds = (id) => {
    const selected = Array.isArray(selectedItemIds) ? selectedItemIds : [];
    if (selected.includes(id)) {
      return selected.filter((itemId) => itemNodeRefs.current.has(itemId));
    }
    return [id];
  };

  const handleItemDragStart = (item) => () => {
    const ids = resolveDragIds(item.id);
    if (!ids.length) return;

    const startPositions = new Map();
    ids.forEach((id) => {
      const node = itemNodeRefs.current.get(id);
      const fallback = itemPositionsRef.current.get(id) || { x: 0, y: 0 };
      const pos = node ? { x: node.x(), y: node.y() } : fallback;
      startPositions.set(id, pos);
      itemPositionsRef.current.set(id, pos);
      draggingIdsRef.current.add(id);
    });

    dragSessionRef.current = {
      activeId: item.id,
      ids,
      moved: false,
      startPositions,
    };

    clearGuides();
    setIsHoveringItem(false);
    onItemDragStart?.(item.id, { ids });
  };

  const handleItemDragMove = (item) => (e) => {
    const session = dragSessionRef.current;
    if (!session) return;

    const node = e.target;
    let nextX = node.x();
    let nextY = node.y();

    const shouldSnap =
      tool === "select" &&
      !marqueeRef.current.active &&
      !panRef.current.active &&
      session.ids.length <= 8;

    if (shouldSnap) {
      const skipIds = new Set(session.ids);
      const lineGuideStops = getLineGuideStops(skipIds);
      const itemBounds = getObjectSnappingEdges(node);
      const guides = getGuides(lineGuideStops, itemBounds, guidelineOffsetWorld);
      if (guides.length) {
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

    const currentActive = itemPositionsRef.current.get(session.activeId) || { x: item.x, y: item.y };
    const deltaX = nextX - currentActive.x;
    const deltaY = nextY - currentActive.y;

    if (Math.abs(deltaX) < 1e-6 && Math.abs(deltaY) < 1e-6) return;

    session.ids.forEach((id) => {
      const curr = itemPositionsRef.current.get(id) || { x: 0, y: 0 };
      const next = { x: curr.x + deltaX, y: curr.y + deltaY };
      itemPositionsRef.current.set(id, next);
      const groupNode = itemNodeRefs.current.get(id);
      if (groupNode) groupNode.position(next);
    });

    session.moved = true;
    scheduleDraw();
  };

  const handleItemDragEnd = (item) => () => {
    const session = dragSessionRef.current;
    const ids = session?.ids || [item.id];
    const positions = {};
    ids.forEach((id) => {
      const pos = itemPositionsRef.current.get(id);
      if (!pos) return;
      positions[id] = { x: pos.x, y: pos.y };
    });

    if (session?.moved) {
      ids.forEach((id) => suppressClickRef.current.add(id));
      setTimeout(() => {
        ids.forEach((id) => suppressClickRef.current.delete(id));
      }, 0);
    }

    dragSessionRef.current = null;
    ids.forEach((id) => draggingIdsRef.current.delete(id));
    clearGuides();
    scheduleDraw();
    setIsHoveringItem(false);
    onItemDragEnd?.(item.id, { ids, positions, moved: Boolean(session?.moved) });
  };

  const handleItemClick = (item) => (e) => {
    if (draggingIdsRef.current.has(item.id)) return;
    if (suppressClickRef.current.has(item.id)) {
      suppressClickRef.current.delete(item.id);
      e.cancelBubble = true;
      return;
    }
    const modifierKey = isModifierPressed(e?.evt);
    const mode = modifierKey ? "toggle" : "replace";
    onSelectItem?.(item.id, item.type, { mode });
    e.cancelBubble = true;
  };

  const isMarqueeActive = Boolean(marquee);
  const interactionEnabled = !isPlaying;
  const isDragging = draggingIdsRef.current.size > 0;
  const baseCursor =
    tool === "hand"
      ? "grab"
      : tool === "addPlayer" || tool === "color"
        ? "copy"
        : "default";
  const hoverAllowed = !isMarqueeActive && !isPanning && !isDragging;
  const derivedCursor =
    isPanning || isDragging
      ? "grabbing"
      : interactionEnabled && hoverAllowed && isHoveringItem
        ? "pointer"
        : baseCursor;

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
          <Layer listening={false} hitGraphEnabled={false}>
            <Group x={worldOrigin.x} y={worldOrigin.y} scaleX={worldOrigin.scale} scaleY={worldOrigin.scale}>
              {fieldImage.image && (
                <KonvaImage
                  image={fieldImage.image}
                  x={0}
                  y={0}
                  offsetX={fieldImage.image.width / 2}
                  offsetY={fieldImage.image.height / 2}
                  rotation={fieldRotation}
                  listening={false}
                  perfectDrawEnabled={false}
                />
              )}
            </Group>
          </Layer>

          <Layer ref={itemsLayerRef} listening={interactionEnabled} hitGraphEnabled={interactionEnabled}>
            <Group x={worldOrigin.x} y={worldOrigin.y} scaleX={worldOrigin.scale} scaleY={worldOrigin.scale}>
              {items.map((item) => {
                const isSelected =
                  item.type === "player"
                    ? selectedPlayerIds?.includes(item.id)
                    : selectedItemIds?.includes(item.id);
                const draggable = tool === "select" && item.draggable !== false && !isMarqueeActive;

                if (item.type === "ball") {
                  return (
                    <Group
                      key={item.id}
                      ref={(node) => {
                        if (node) itemNodeRefs.current.set(item.id, node);
                        else itemNodeRefs.current.delete(item.id);
                      }}
                      x={item.x}
                      y={item.y}
                      draggable={interactionEnabled && draggable}
                      listening={interactionEnabled}
                      onMouseEnter={() => {
                        if (!interactionEnabled || !draggable || !hoverAllowed) return;
                        setIsHoveringItem(true);
                      }}
                      onMouseLeave={() => {
                        if (!interactionEnabled || !draggable) return;
                        setIsHoveringItem(false);
                      }}
                      onDragStart={handleItemDragStart(item)}
                      onDragMove={handleItemDragMove(item)}
                      onDragEnd={handleItemDragEnd(item)}
                      onClick={handleItemClick(item)}
                      onTap={handleItemClick(item)}
                      onMouseDown={(evt) => {
                        evt.cancelBubble = true;
                      }}
                      onTouchStart={(evt) => {
                        evt.cancelBubble = true;
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
                            perfectDrawEnabled={false}
                          />
                        );
                      })() : null}
                      {isSelected && (
                        <Circle
                          radius={ballSizePx / 2 + 2}
                          stroke="#FF7A18"
                          strokeWidth={2}
                          listening={false}
                          perfectDrawEnabled={false}
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
                    ref={(node) => {
                      if (node) itemNodeRefs.current.set(item.id, node);
                      else itemNodeRefs.current.delete(item.id);
                    }}
                    x={item.x}
                    y={item.y}
                    draggable={interactionEnabled && draggable}
                    listening={interactionEnabled}
                    onMouseEnter={() => {
                      if (!interactionEnabled || !draggable || !hoverAllowed) return;
                      setIsHoveringItem(true);
                    }}
                    onMouseLeave={() => {
                      if (!interactionEnabled || !draggable) return;
                      setIsHoveringItem(false);
                    }}
                    onDragStart={handleItemDragStart(item)}
                    onDragMove={handleItemDragMove(item)}
                    onDragEnd={handleItemDragEnd(item)}
                    onClick={handleItemClick(item)}
                    onTap={handleItemClick(item)}
                    onMouseDown={(evt) => {
                      evt.cancelBubble = true;
                    }}
                    onTouchStart={(evt) => {
                      evt.cancelBubble = true;
                    }}
                  >
                    <Circle
                      radius={radius}
                      fill={color}
                      stroke={isSelected ? "#FF7A18" : "#111827"}
                      strokeWidth={isSelected ? 3 : 2}
                      perfectDrawEnabled={false}
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
                        perfectDrawEnabled={false}
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
                        perfectDrawEnabled={false}
                      />
                    )}
                  </Group>
                );
              })}
            </Group>
          </Layer>

          <Layer listening={false} name="guidesLayer" ref={guidesLayerRef} />

          <Layer listening={false} hitGraphEnabled={false}>
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
            </Group>
          </Layer>
        </Stage>
      </div>
    </BoardViewport>
  );
}
