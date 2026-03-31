import React, { useEffect, useMemo, useRef, useState } from "react";
import { normalizeAnimation, samplePosesAtTime } from "../animation";
import RugbyField from "../assets/objects/Field Vectors/Rugby_Field.png";
import SoccerField from "../assets/objects/Field Vectors/Soccer_Field.png";
import FootballField from "../assets/objects/Field Vectors/Football_Field.png";
import LacrosseField from "../assets/objects/Field Vectors/Lacrosse_Field.png";
import BasketballField from "../assets/objects/Field Vectors/Basketball_Field.png";
import WhiteBall from "../assets/objects/balls/white_ball.png";
import SoccerBall from "../assets/objects/balls/Soccer_ball.png";
import FootballBall from "../assets/objects/balls/Football.png";
import BasketballBall from "../assets/objects/balls/Basketball (4).png";
import RugbyBall from "../assets/objects/balls/Rugby_ball.png";

const FIELD_TYPE_TO_BALL_IMAGE_SRC = {
  Rugby: RugbyBall,
  Soccer: SoccerBall,
  Football: FootballBall,
  Basketball: BasketballBall,
};

const DEFAULT_FIELD_SIZE = { width: 1000, height: 600 };
const DEFAULT_PLAYER_COLOR = "#ef4444";
const DEFAULT_PITCH_COLOR = "#4FA85D";
const DEFAULT_DURATION_MS = 30000;
const DEFAULT_PADDING_PX = 70;
const MIN_CAMERA_SPAN_PX = 220;

const FIELD_TYPE_TO_IMAGE_SRC = {
  Rugby: RugbyField,
  Soccer: SoccerField,
  Football: FootballField,
  Lacrosse: LacrosseField,
  Basketball: BasketballField,
};

const SHAPE_CLASS_BY_VARIANT = {
  square: "aspect-square",
  landscape: "aspect-[16/10]",
  wide: "aspect-[16/9]",
  fill: "",
};

/** Converts flat [x1,y1,x2,y2,...] array to SVG points string. */
const flatPointsToSVGString = (pts) => {
  if (!pts?.length) return "";
  const pairs = [];
  for (let i = 0; i + 1 < pts.length; i += 2) {
    pairs.push(`${pts[i]},${pts[i + 1]}`);
  }
  return pairs.join(" ");
};

/**
 * Computes a filled triangle arrowhead polygon for SVG.
 * @param {number[]} pts - Flat [x1,y1, x2,y2] endpoint array.
 * @param {number} pLen - Pointer length.
 * @param {number} pWidth - Pointer width.
 * @returns {string|null} SVG polygon points string, or null.
 */
const svgArrowHeadPoints = (pts, pLen, pWidth) => {
  if (!pts || pts.length < 4) return null;
  const [x1, y1, x2, y2] = pts;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const halfW = pWidth / 2;
  const bx = x2 - Math.cos(angle) * pLen;
  const by = y2 - Math.sin(angle) * pLen;
  const lx = bx + Math.sin(angle) * halfW;
  const ly = by - Math.cos(angle) * halfW;
  const rx = bx - Math.sin(angle) * halfW;
  const ry = by + Math.cos(angle) * halfW;
  return `${x2},${y2} ${lx},${ly} ${rx},${ry}`;
};

/**
 * Renders a single drawing object as an SVG element.
 * Supports stroke, arrow, text, and shape (rect/ellipse/triangle/custom) types.
 * @param {Object} d - Drawing data object.
 * @param {string|number} key - React key.
 * @returns {React.ReactNode|null}
 */
const renderSVGDrawing = (d, key) => {
  const opacity = d.opacity ?? 1;

  if (d.type === "stroke") {
    const color = d.color || "#FFFFFF";
    const sw = d.strokeWidth || 3;
    const svgPts = flatPointsToSVGString(d.points);
    if (!svgPts) return null;

    const line = (
      <polyline
        key={key}
        points={svgPts}
        stroke={color}
        strokeWidth={sw}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
    );

    const headType = d.arrowTip ? (d.arrowHeadType || "standard") : "none";
    if (headType === "none" || !d.arrowTip || !d.points || d.points.length < 4) return line;

    // Compute arrowhead from last two points of the stroke
    const n = d.points.length;
    const tipPts = [d.points[n - 4], d.points[n - 3], d.points[n - 2], d.points[n - 1]];
    const pLen = 18, pW = 14;

    if (headType === "chevron") {
      const chevPts = svgArrowHeadPoints(tipPts, pLen, pW);
      if (!chevPts) return line;
      return (
        <g key={key}>
          {line}
          <polyline
            points={`${d.points[n - 4 + 0]},${d.points[n - 4 + 1]} ${d.points[n - 2]},${d.points[n - 1]}`}
            stroke={color}
            strokeWidth={Math.max(sw, 2.5)}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={opacity}
          />
        </g>
      );
    }

    const headPts = svgArrowHeadPoints(tipPts, pLen, pW);
    if (!headPts) return line;
    return (
      <g key={key}>
        {line}
        <polygon points={headPts} fill={color} stroke={color} strokeWidth={1} opacity={opacity} />
      </g>
    );
  }

  if (d.type === "arrow") {
    const color = d.color || "#FFFFFF";
    const sw = d.strokeWidth || 3;
    const pts = d.points || [0, 0, 0, 0];
    const [x1, y1, x2, y2] = pts;
    const headType = d.arrowHeadType || "standard";
    const STYLES = { standard: [10, 8], thin: [12, 4], wide: [8, 14], chevron: [14, 18], none: [0, 0] };
    const [pLen, pW] = STYLES[headType] || STYLES.standard;

    if (headType === "none") {
      return (
        <line key={key} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color} strokeWidth={sw} strokeLinecap="round" opacity={opacity} />
      );
    }

    if (headType === "chevron") {
      const chevPts = svgArrowHeadPoints(pts, pLen, pW);
      return (
        <g key={key} opacity={opacity}>
          <line x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth={sw} strokeLinecap="round" />
          {chevPts && (
            <polyline
              points={chevPts.split(" ").slice(1).join(" ") + ` ${x2},${y2}`}
              stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
          )}
        </g>
      );
    }

    // Standard / thin / wide: filled triangle head
    // Shorten line slightly to avoid overlap with arrowhead
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const x2s = x2 - Math.cos(angle) * pLen;
    const y2s = y2 - Math.sin(angle) * pLen;
    const headPts = svgArrowHeadPoints(pts, pLen, pW);
    return (
      <g key={key} opacity={opacity}>
        <line x1={x1} y1={y1} x2={x2s} y2={y2s}
          stroke={color} strokeWidth={sw} strokeLinecap="round" />
        {headPts && <polygon points={headPts} fill={color} />}
      </g>
    );
  }

  if (d.type === "text") {
    const color = d.color || "#FFFFFF";
    const fontSize = d.fontSize || 18;
    const x = d.x || 0;
    const y = d.y || 0;
    return (
      <text
        key={key}
        x={x}
        y={y + fontSize}
        fill={color}
        fontSize={fontSize}
        fontFamily="DmSans, sans-serif"
        textAnchor={d.align === "center" ? "middle" : d.align === "right" ? "end" : "start"}
        transform={d.rotation ? `rotate(${d.rotation} ${x} ${y})` : undefined}
        opacity={opacity}
      >
        {d.text || ""}
      </text>
    );
  }

  if (d.type === "shape") {
    const fillColor = !d.fill || d.fill === "transparent" ? "none" : d.fill;
    const strokeColor = !d.color || d.color === "transparent" ? "none" : d.color;
    const sw = strokeColor !== "none" ? (d.strokeWidth || 2) : 0;
    const x = d.x || 0, y = d.y || 0, w = d.width || 0, h = d.height || 0;
    const rot = d.rotation || 0;
    const cx = x + w / 2, cy = y + h / 2;
    const transformAttr = rot ? `rotate(${rot} ${cx} ${cy})` : undefined;

    if (d.shapeType === "rect") {
      return (
        <rect key={key} x={x} y={y} width={w} height={h}
          fill={fillColor} stroke={strokeColor} strokeWidth={sw}
          transform={transformAttr} opacity={opacity} />
      );
    }
    if (d.shapeType === "ellipse") {
      return (
        <ellipse key={key} cx={cx} cy={cy} rx={w / 2} ry={h / 2}
          fill={fillColor} stroke={strokeColor} strokeWidth={sw}
          transform={transformAttr} opacity={opacity} />
      );
    }
    if (d.shapeType === "triangle") {
      const triPts = `${cx},${y} ${x},${y + h} ${x + w},${y + h}`;
      return (
        <polygon key={key} points={triPts}
          fill={fillColor} stroke={strokeColor} strokeWidth={sw} strokeLinejoin="round"
          transform={transformAttr} opacity={opacity} />
      );
    }
    if (d.shapeType === "custom" && d.points?.length >= 4) {
      return (
        <polygon key={key} points={flatPointsToSVGString(d.points)}
          fill={fillColor} stroke={strokeColor} strokeWidth={sw} strokeLinejoin="round"
          opacity={opacity} />
      );
    }
  }

  return null;
};

const toFiniteNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const useImageDimensions = (src) => {
  const [size, setSize] = useState(DEFAULT_FIELD_SIZE);
  useEffect(() => {
    if (!src) return;
    const image = new window.Image();
    image.src = src;
    const onLoad = () => {
      const width = Math.max(1, toFiniteNumber(image.naturalWidth, DEFAULT_FIELD_SIZE.width));
      const height = Math.max(1, toFiniteNumber(image.naturalHeight, DEFAULT_FIELD_SIZE.height));
      setSize({ width, height });
    };
    image.addEventListener("load", onLoad);
    return () => image.removeEventListener("load", onLoad);
  }, [src]);
  return size;
};

const boundsFromPoints = (points, fallbackBounds) => {
  if (!points?.length) return fallbackBounds;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  points.forEach((point) => {
    const x = toFiniteNumber(point?.x, 0);
    const y = toFiniteNumber(point?.y, 0);
    if (x < left) left = x;
    if (x > right) right = x;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  });

  if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(top) || !Number.isFinite(bottom)) {
    return fallbackBounds;
  }

  if (left === right) {
    left -= 1;
    right += 1;
  }
  if (top === bottom) {
    top -= 1;
    bottom += 1;
  }

  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
  };
};

const padBounds = (bounds, paddingPx) => {
  const padding = Math.max(0, toFiniteNumber(paddingPx, 0));
  return {
    left: bounds.left - padding,
    right: bounds.right + padding,
    top: bounds.top - padding,
    bottom: bounds.bottom + padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
};

const ensureMinimumSpan = (bounds, minSpan = MIN_CAMERA_SPAN_PX) => {
  const targetMin = Math.max(1, toFiniteNumber(minSpan, MIN_CAMERA_SPAN_PX));
  let left = bounds.left;
  let right = bounds.right;
  let top = bounds.top;
  let bottom = bounds.bottom;
  let width = right - left;
  let height = bottom - top;

  if (width < targetMin) {
    const expand = (targetMin - width) / 2;
    left -= expand;
    right += expand;
    width = targetMin;
  }
  if (height < targetMin) {
    const expand = (targetMin - height) / 2;
    top -= expand;
    bottom += expand;
    height = targetMin;
  }

  return { left, right, top, bottom, width, height };
};

const clampBoundsToField = (bounds, fieldBounds) => {
  const fieldWidth = fieldBounds.width;
  const fieldHeight = fieldBounds.height;
  if (bounds.width >= fieldWidth || bounds.height >= fieldHeight) return fieldBounds;

  let left = bounds.left;
  let top = bounds.top;

  const maxLeft = fieldBounds.right - bounds.width;
  const maxTop = fieldBounds.bottom - bounds.height;
  left = clamp(left, fieldBounds.left, maxLeft);
  top = clamp(top, fieldBounds.top, maxTop);

  return {
    left,
    top,
    right: left + bounds.width,
    bottom: top + bounds.height,
    width: bounds.width,
    height: bounds.height,
  };
};

const fitBoundsToAspect = (bounds, targetAspectRatio) => {
  if (!Number.isFinite(targetAspectRatio) || targetAspectRatio <= 0) return bounds;
  const cx = (bounds.left + bounds.right) / 2;
  const cy = (bounds.top + bounds.bottom) / 2;
  let width = bounds.width;
  let height = bounds.height;
  const currentAspect = width / Math.max(1, height);
  if (currentAspect < targetAspectRatio) {
    width = height * targetAspectRatio;
  } else {
    height = width / targetAspectRatio;
  }
  return {
    left: cx - width / 2,
    right: cx + width / 2,
    top: cy - height / 2,
    bottom: cy + height / 2,
    width,
    height,
  };
};

export default function PlayPreviewCard({
  playData,
  fallbackImageSrc = null,
  autoplay = "always", // "always" | "hover" | "off"
  shape = "landscape", // "square" | "landscape" | "wide"
  cameraMode = "fit-distribution", // "fit-distribution" | "fit-field"
  background = "field", // "field" | "none"
  paddingPx = DEFAULT_PADDING_PX,
  minSpanPx = MIN_CAMERA_SPAN_PX,
  className = "",
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [timeMs, setTimeMs] = useState(0);
  const rafIdRef = useRef(null);
  const lastFrameAtRef = useRef(null);

  const play = playData?.play || null;
  const animation = useMemo(
    () => normalizeAnimation(play?.animation || { durationMs: DEFAULT_DURATION_MS, tracks: {} }),
    [play?.animation]
  );

  const entities = play?.entities || {};
  const drawings = Array.isArray(play?.drawings) ? play.drawings : [];
  const settings = play?.settings || {};
  const pitchSettings = settings?.advancedSettings?.pitch || {};
  const playersSettings = settings?.advancedSettings?.players || {};
  const ballSettings = settings?.advancedSettings?.ball || {};
  const allPlayersDisplay = settings?.allPlayersDisplay || {};
  const canvas = play?.canvas || {};

  const rawPlayersById = entities?.playersById || {};
  const representedIds = Array.isArray(entities?.representedPlayerIds) && entities.representedPlayerIds.length
    ? entities.representedPlayerIds
    : Object.keys(rawPlayersById || {});

  const playersById = useMemo(
    () =>
      Object.fromEntries(
        representedIds
          .map((id) => [id, rawPlayersById?.[id]])
          .filter(([, player]) => Boolean(player))
      ),
    [rawPlayersById, representedIds]
  );

  const ballsById = useMemo(() => {
    if (entities?.ballsById && typeof entities.ballsById === "object") {
      return entities.ballsById;
    }
    if (entities?.ball && typeof entities.ball === "object") {
      const fallbackBallId = String(entities.ball.id || "ball-1");
      return { [fallbackBallId]: entities.ball };
    }
    return {};
  }, [entities]);

  const entityIds = useMemo(
    () => [...Object.keys(playersById), ...Object.keys(ballsById)],
    [playersById, ballsById]
  );

  const fallbackPoses = useMemo(() => {
    const map = {};
    Object.entries(playersById).forEach(([id, player]) => {
      map[id] = { x: toFiniteNumber(player?.x, 0), y: toFiniteNumber(player?.y, 0), r: 0 };
    });
    Object.entries(ballsById).forEach(([id, ball]) => {
      map[id] = { x: toFiniteNumber(ball?.x, 0), y: toFiniteNumber(ball?.y, 0), r: 0 };
    });
    return map;
  }, [playersById, ballsById]);

  const durationMs = Math.max(1, Math.round(toFiniteNumber(animation?.durationMs, DEFAULT_DURATION_MS)));
  const shouldPlay = autoplay === "always" || (autoplay === "hover" && isHovered);
  const displayTimeMs = autoplay === "hover" && !isHovered ? 0 : timeMs;

  const poses = useMemo(
    () => samplePosesAtTime(animation, displayTimeMs, fallbackPoses, entityIds),
    [animation, displayTimeMs, fallbackPoses, entityIds]
  );

  // Reset animation when the play identity changes (not just object reference).
  // Use entity IDs + duration as a stable fingerprint to avoid resetting on every
  // parent re-render that creates a new playData object.
  const playFingerprint = useMemo(() => {
    const ids = entityIds.slice().sort().join(",");
    return `${ids}|${durationMs}`;
  }, [entityIds, durationMs]);

  useEffect(() => {
    setTimeMs(0);
    lastFrameAtRef.current = null;
  }, [playFingerprint]);

  useEffect(() => {
    if (!shouldPlay || autoplay === "off") {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      lastFrameAtRef.current = null;
      return;
    }

    const tick = (stamp) => {
      if (!lastFrameAtRef.current) {
        lastFrameAtRef.current = stamp;
      }
      const deltaMs = Math.max(0, stamp - lastFrameAtRef.current);
      lastFrameAtRef.current = stamp;
      setTimeMs((prev) => (prev + deltaMs * 1.5) % durationMs);
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [autoplay, durationMs, shouldPlay]);

  useEffect(() => () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
  }, []);

  const fieldTypeRaw = pitchSettings?.fieldType ?? "Rugby";
  const fieldType = FIELD_TYPE_TO_IMAGE_SRC[fieldTypeRaw] ? fieldTypeRaw : "Rugby";
  const fieldImageSrc = FIELD_TYPE_TO_IMAGE_SRC[fieldType] || null;
  const fieldImageSize = useImageDimensions(fieldImageSrc);
  const fieldRotation = toFiniteNumber(canvas?.fieldRotation, 0);
  const fieldOpacity = clamp(toFiniteNumber(pitchSettings?.fieldOpacity, 100), 0, 100) / 100;
  const pitchColor = pitchSettings?.pitchColor || DEFAULT_PITCH_COLOR;
  const showMarkings = pitchSettings?.showMarkings !== false;

  const fieldBounds = useMemo(() => {
    const width = Math.max(1, toFiniteNumber(fieldImageSize.width, DEFAULT_FIELD_SIZE.width));
    const height = Math.max(1, toFiniteNumber(fieldImageSize.height, DEFAULT_FIELD_SIZE.height));
    return {
      left: -width / 2,
      right: width / 2,
      top: -height / 2,
      bottom: height / 2,
      width,
      height,
    };
  }, [fieldImageSize.height, fieldImageSize.width]);

  const shapeClass = SHAPE_CLASS_BY_VARIANT[shape] ?? SHAPE_CLASS_BY_VARIANT.landscape;
  const isFill = shape === "fill";
  const targetAspect = shape === "square" ? 1 : shape === "wide" ? 16 / 9 : 16 / 10;

  const viewBounds = useMemo(() => {
    if (cameraMode === "fit-field") {
      return isFill ? fieldBounds : fitBoundsToAspect(fieldBounds, targetAspect);
    }

    const points = [];
    Object.values(fallbackPoses).forEach((pose) => points.push({ x: pose.x, y: pose.y }));
    Object.values(animation?.tracks || {}).forEach((track) => {
      (track?.keyframes || []).forEach((keyframe) => {
        points.push({ x: toFiniteNumber(keyframe?.x, 0), y: toFiniteNumber(keyframe?.y, 0) });
      });
    });
    drawings.forEach((d) => {
      if (d.points?.length >= 2) {
        for (let i = 0; i + 1 < d.points.length; i += 2) {
          points.push({ x: toFiniteNumber(d.points[i], 0), y: toFiniteNumber(d.points[i + 1], 0) });
        }
      } else if (d.x != null && d.y != null) {
        points.push({ x: toFiniteNumber(d.x, 0), y: toFiniteNumber(d.y, 0) });
        if (d.width != null) points.push({ x: toFiniteNumber(d.x + d.width, 0), y: toFiniteNumber(d.y + (d.height || 0), 0) });
      }
    });

    const base = boundsFromPoints(points, fieldBounds);
    const padded = padBounds(base, paddingPx);
    const withMin = ensureMinimumSpan(padded, minSpanPx);
    const withAspect = isFill ? withMin : fitBoundsToAspect(withMin, targetAspect);
    return withAspect;
  }, [animation?.tracks, background, cameraMode, drawings, fallbackPoses, fieldBounds, isFill, minSpanPx, paddingPx, targetAspect]);

  const playerSizePercent = clamp(toFiniteNumber(allPlayersDisplay?.sizePercent, 100), 10, 400);
  const playerBasePx = Math.max(6, toFiniteNumber(playersSettings?.baseSizePx, 30));
  const playerSizePx = Math.max(6, Math.round((playerBasePx * playerSizePercent) / 100));
  const playerRadius = playerSizePx / 2;
  const showNumber = allPlayersDisplay?.showNumber !== false;

  const ballSizePercent = clamp(toFiniteNumber(ballSettings?.sizePercent, 100), 10, 400);
  const ballSizePx = Math.max(6, Math.round((22 * ballSizePercent) / 100));
  const ballRadius = ballSizePx / 2;

  const hasRenderableContent = play && (entityIds.length > 0 || drawings.length > 0);

  const containerStyle = background === "field" ? { backgroundColor: pitchColor } : {};

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-BrandGray2/60 ${shapeClass} ${className}`}
      style={containerStyle}
      onMouseEnter={() => {
        if (autoplay !== "hover") return;
        setTimeMs(0);
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (autoplay !== "hover") return;
        setIsHovered(false);
        setTimeMs(0);
      }}
    >
      {hasRenderableContent ? (
        <svg
          className="h-full w-full"
          viewBox={`${viewBounds.left} ${viewBounds.top} ${viewBounds.width} ${viewBounds.height}`}
          preserveAspectRatio={isFill ? "xMidYMid slice" : "xMidYMid meet"}
          role="img"
          aria-label="Play preview"
        >
          <rect
            x={viewBounds.left}
            y={viewBounds.top}
            width={viewBounds.width}
            height={viewBounds.height}
            fill={background === "field" ? pitchColor : "transparent"}
          />
          {background === "field" && showMarkings && fieldImageSrc ? (
            <image
              href={fieldImageSrc}
              x={fieldBounds.left}
              y={fieldBounds.top}
              width={fieldBounds.width}
              height={fieldBounds.height}
              opacity={fieldOpacity}
              transform={`rotate(${fieldRotation} 0 0)`}
              preserveAspectRatio="none"
            />
          ) : null}

          {drawings.map((d, idx) => renderSVGDrawing(d, d.id || idx))}

          {Object.entries(playersById).map(([id, player]) => {
            const pose = poses?.[id] || fallbackPoses?.[id] || { x: 0, y: 0 };
            const numberText = player?.number ?? "";
            const color = player?.color || allPlayersDisplay?.color || DEFAULT_PLAYER_COLOR;
            return (
              <g key={id} transform={`translate(${pose.x} ${pose.y})`}>
                <circle r={playerRadius} fill={color} stroke="#111827" strokeWidth={2} />
                {showNumber && numberText !== "" ? (
                  <text
                    x={0}
                    y={playerSizePx * 0.13}
                    textAnchor="middle"
                    fontFamily="DmSans"
                    fontSize={Math.max(10, Math.round(playerSizePx * 0.45))}
                    fontWeight="700"
                    fill="#111827"
                  >
                    {String(numberText)}
                  </text>
                ) : null}
              </g>
            );
          })}

          {Object.entries(ballsById).map(([id]) => {
            const pose = poses?.[id] || fallbackPoses?.[id] || { x: 0, y: 0 };
            return (
              <image
                key={id}
                href={FIELD_TYPE_TO_BALL_IMAGE_SRC[fieldType] ?? WhiteBall}
                x={pose.x - ballRadius}
                y={pose.y - ballRadius}
                width={ballSizePx}
                height={ballSizePx}
              />
            );
          })}
        </svg>
      ) : fallbackImageSrc ? (
        <img src={fallbackImageSrc} alt="Play preview" className="h-full w-full object-contain" />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-4 text-center">
          <p className="text-BrandGray text-xs sm:text-sm font-DmSans">No preview available</p>
        </div>
      )}

    </div>
  );
}
