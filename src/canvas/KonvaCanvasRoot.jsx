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

export default function KonvaCanvasRoot({
  tool = "hand",
  camera,
  setCamera,
  items,
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
  const guidesLayerRef = useRef(null);
  const dragStateRef = useRef(new Map());
  const draggingIdsRef = useRef(new Set());
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

  const getLineGuideStops = (skipId) => {
    const centerScreenWorld = toWorldCoords({ x: size.width / 2, y: size.height / 2 });

    const vertical = [0, centerScreenWorld.x];
    const horizontal = [0, centerScreenWorld.y];
    if (fieldBounds) {
      vertical.push(fieldBounds.centerX);
      horizontal.push(fieldBounds.centerY);
    }

    items.forEach((item) => {
      if (!item || item.id === skipId) return;
      if (item.type !== "player" && item.type !== "ball") return;
      vertical.push(item.x);
      horizontal.push(item.y);
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
          const itemRadius = item.type === "ball" ? ballRadius : radius;
          return intersects(item.x, item.y, itemRadius);
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
    dragStateRef.current.set(item.id, { x: item.x, y: item.y });
    clearGuides();
    setIsHoveringItem(false);
    onItemDragStart?.(item.id);
  };

  const handleItemDragMove = (item) => (e) => {
    const node = e.target;
    const canSnap = tool === "select" && !marqueeRef.current.active && !panRef.current.active;
    if (canSnap) {
      const lineGuideStops = getLineGuideStops(item.id);
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
    const last = dragStateRef.current.get(item.id) || { x: item.x, y: item.y };
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
    if (draggingIdsRef.current.has(item.id)) return;
    const modifierKey = isModifierPressed(e?.evt);
    const mode = modifierKey ? "toggle" : "replace";
    onSelectItem?.(item.id, item.type, { mode });
    e.cancelBubble = true;
  };

  const isMarqueeActive = Boolean(marquee);

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
      : hoverAllowed && isHoveringItem
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
          <Layer>
            <Group x={worldOrigin.x} y={worldOrigin.y} scaleX={worldOrigin.scale} scaleY={worldOrigin.scale}>
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
                const isSelected =
                  item.type === "player"
                    ? selectedPlayerIds?.includes(item.id)
                    : selectedItemIds?.includes(item.id);
                const draggable = tool === "select" && item.draggable !== false && !isMarqueeActive;

                if (item.type === "ball") {
                  return (
                    <Group
                      key={item.id}
                      x={item.x}
                      y={item.y}
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
                    x={item.x}
                    y={item.y}
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
          <Layer listening={false} name="guidesLayer" ref={guidesLayerRef} />
          <Layer listening={false}>
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
