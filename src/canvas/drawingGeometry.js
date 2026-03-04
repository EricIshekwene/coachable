/**
 * Pure geometry utilities for the drawing editor.
 * No React dependencies — all functions are stateless and easily testable.
 */

// ─── Point-to-Segment Distance ──────────────────────────────────────────────

/**
 * Distance from point (px, py) to line segment (ax, ay)-(bx, by).
 */
export function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

// ─── Bounds ─────────────────────────────────────────────────────────────────

/**
 * Compute axis-aligned bounding box for a drawing, with optional strokeWidth padding.
 * Returns { x, y, width, height }.
 */
export function getDrawingWorldBounds(d) {
  if (d.type === "text") {
    const fontSize = d.fontSize || 18;
    const w = (d.text?.length || 1) * fontSize * 0.6;
    const h = fontSize * 1.3;
    return { x: d.x, y: d.y - h, width: w, height: h };
  }
  if (d.type === "shape") {
    if (d.shapeType === "custom" && d.points?.length >= 4) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < d.points.length; i += 2) {
        if (d.points[i] < minX) minX = d.points[i];
        if (d.points[i] > maxX) maxX = d.points[i];
        if (d.points[i + 1] < minY) minY = d.points[i + 1];
        if (d.points[i + 1] > maxY) maxY = d.points[i + 1];
      }
      const pad = (d.strokeWidth || 2) / 2;
      return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
    }
    const pad = (d.strokeWidth || 2) / 2;
    return {
      x: (d.x || 0) - pad,
      y: (d.y || 0) - pad,
      width: (d.width || 0) + pad * 2,
      height: (d.height || 0) + pad * 2,
    };
  }
  // stroke or arrow
  const pts = d.points;
  if (!pts || pts.length < 2) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    if (pts[i] < minX) minX = pts[i];
    if (pts[i] > maxX) maxX = pts[i];
    if (pts[i + 1] < minY) minY = pts[i + 1];
    if (pts[i + 1] > maxY) maxY = pts[i + 1];
  }
  const pad = (d.strokeWidth || 3) / 2;
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

// Backward-compatible alias
export const getDrawingBounds = getDrawingWorldBounds;

/**
 * Union bounding box of selected drawings. Returns { x, y, width, height } or null.
 */
export function getSelectionBounds(drawings, selectedIds) {
  if (!selectedIds || selectedIds.length === 0) return null;
  const idSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let count = 0;
  for (const d of drawings) {
    if (!idSet.has(d.id)) continue;
    const b = getDrawingWorldBounds(d);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
    count++;
  }
  if (count === 0) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ─── Rect Intersection ──────────────────────────────────────────────────────

/**
 * AABB overlap test. Both rects are { x, y, width, height }.
 */
export function rectsIntersect(a, b) {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

// ─── Hit Testing ────────────────────────────────────────────────────────────

/**
 * Hit-test drawings at a world-space point. Returns topmost hit id or null.
 * Uses precise segment distance for stroke/arrow, AABB for text.
 */
export function hitTestDrawings(drawings, worldPoint, tolerance = 10, skipIds) {
  for (let i = drawings.length - 1; i >= 0; i--) {
    const d = drawings[i];
    if (skipIds && skipIds.has(d.id)) continue;
    if (d.type === "stroke") {
      for (let j = 0; j < d.points.length - 2; j += 2) {
        const dist = pointToSegmentDist(
          worldPoint.x, worldPoint.y,
          d.points[j], d.points[j + 1],
          d.points[j + 2], d.points[j + 3]
        );
        if (dist < tolerance + (d.strokeWidth || 3) / 2) return d.id;
      }
    } else if (d.type === "arrow") {
      const pts = d.points;
      if (pts && pts.length >= 4) {
        const dist = pointToSegmentDist(
          worldPoint.x, worldPoint.y,
          pts[0], pts[1], pts[2], pts[3]
        );
        if (dist < tolerance + (d.strokeWidth || 3) / 2) return d.id;
      }
    } else if (d.type === "text") {
      const b = getDrawingWorldBounds(d);
      if (
        worldPoint.x >= b.x - tolerance &&
        worldPoint.x <= b.x + b.width + tolerance &&
        worldPoint.y >= b.y - tolerance &&
        worldPoint.y <= b.y + b.height + tolerance
      ) {
        return d.id;
      }
    } else if (d.type === "shape") {
      if (d.shapeType === "ellipse") {
        const cx = (d.x || 0) + (d.width || 0) / 2;
        const cy = (d.y || 0) + (d.height || 0) / 2;
        const rx = (d.width || 0) / 2 + tolerance;
        const ry = (d.height || 0) / 2 + tolerance;
        if (rx > 0 && ry > 0) {
          const nx = (worldPoint.x - cx) / rx;
          const ny = (worldPoint.y - cy) / ry;
          if (nx * nx + ny * ny <= 1) return d.id;
        }
      } else if (d.shapeType === "custom" && d.points?.length >= 6) {
        if (pointInPolygon(worldPoint.x, worldPoint.y, d.points, tolerance)) return d.id;
      } else if (d.shapeType === "triangle") {
        const triPts = getTrianglePoints(d);
        if (pointInPolygon(worldPoint.x, worldPoint.y, triPts, tolerance)) return d.id;
      } else {
        // rect
        const b = getDrawingWorldBounds(d);
        if (
          worldPoint.x >= b.x - tolerance &&
          worldPoint.x <= b.x + b.width + tolerance &&
          worldPoint.y >= b.y - tolerance &&
          worldPoint.y <= b.y + b.height + tolerance
        ) {
          return d.id;
        }
      }
    }
  }
  return null;
}

// ─── Resize Handles ─────────────────────────────────────────────────────────

export const HANDLE_POSITIONS = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export const HANDLE_CURSORS = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

/**
 * Returns 8 handle descriptors for a selection bounds rect.
 * handleSize is in world-space (typically 8 / zoom for constant screen px).
 */
export function getResizeHandles(bounds, handleSize, padding = 0) {
  if (!bounds) return [];
  const hs = handleSize / 2;
  const { x, y, width, height } = bounds;
  // Use padded bounds so handles sit centered on the selection outline
  const px = x - padding;
  const py = y - padding;
  const pw = width + padding * 2;
  const ph = height + padding * 2;
  const cx = px + pw / 2;
  const cy = py + ph / 2;
  const r = px + pw;
  const b = py + ph;

  return [
    { position: "nw", x: px - hs, y: py - hs, width: handleSize, height: handleSize, cursor: HANDLE_CURSORS.nw },
    { position: "n",  x: cx - hs, y: py - hs, width: handleSize, height: handleSize, cursor: HANDLE_CURSORS.n },
    { position: "ne", x: r - hs, y: py - hs, width: handleSize, height: handleSize, cursor: HANDLE_CURSORS.ne },
    { position: "e",  x: r - hs, y: cy - hs, width: handleSize, height: handleSize, cursor: HANDLE_CURSORS.e },
    { position: "se", x: r - hs, y: b - hs, width: handleSize, height: handleSize, cursor: HANDLE_CURSORS.se },
    { position: "s",  x: cx - hs, y: b - hs, width: handleSize, height: handleSize, cursor: HANDLE_CURSORS.s },
    { position: "sw", x: px - hs, y: b - hs, width: handleSize, height: handleSize, cursor: HANDLE_CURSORS.sw },
    { position: "w",  x: px - hs, y: cy - hs, width: handleSize, height: handleSize, cursor: HANDLE_CURSORS.w },
  ];
}

/**
 * Hit-test resize handles. Returns handle position string or null.
 * `padding` expands the interactive area around each handle in world-space.
 */
export function hitTestHandle(handles, worldPoint, padding = 0) {
  for (const h of handles) {
    if (
      worldPoint.x >= h.x - padding &&
      worldPoint.x <= h.x + h.width + padding &&
      worldPoint.y >= h.y - padding &&
      worldPoint.y <= h.y + h.height + padding
    ) {
      return h.position;
    }
  }
  return null;
}

// ─── Rotate Handle ──────────────────────────────────────────────────────────

/**
 * Position of the rotate handle (circle above top-center of bounds).
 */
export function getRotateHandlePosition(bounds, zoom) {
  if (!bounds) return null;
  const gap = 24 / (zoom || 1);
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y - gap,
  };
}

/**
 * Hit-test the rotate handle. Returns true if within radius.
 */
export function hitTestRotateHandle(handlePos, worldPoint, zoom) {
  if (!handlePos) return false;
  const radius = 7 / (zoom || 1);
  const dx = worldPoint.x - handlePos.x;
  const dy = worldPoint.y - handlePos.y;
  return dx * dx + dy * dy <= radius * radius;
}

// ─── Transform: Resize ──────────────────────────────────────────────────────

/**
 * Get the anchor point (opposite corner/edge) for a resize handle position.
 */
function getResizeAnchor(bounds, handlePos) {
  const { x, y, width, height } = bounds;
  const r = x + width;
  const b = y + height;
  const cx = x + width / 2;
  const cy = y + height / 2;
  switch (handlePos) {
    case "nw": return { x: r, y: b };
    case "n":  return { x: cx, y: b };
    case "ne": return { x: x, y: b };
    case "e":  return { x: x, y: cy };
    case "se": return { x: x, y: y };
    case "s":  return { x: cx, y: y };
    case "sw": return { x: r, y: y };
    case "w":  return { x: r, y: cy };
    default:   return { x: cx, y: cy };
  }
}

/**
 * Compute new bounds from a handle drag.
 * handlePos: 'nw'|'n'|..., startBounds, dragDelta: { dx, dy }
 * options: { shiftKey (aspect lock), altKey (center resize) }
 */
export function computeResizedBounds(handlePos, startBounds, dragDelta, options = {}) {
  const { shiftKey = false, altKey = false } = options;
  let { x, y, width, height } = startBounds;
  const dx = dragDelta.dx;
  const dy = dragDelta.dy;

  // Apply drag to the appropriate edges
  switch (handlePos) {
    case "nw": x += dx; y += dy; width -= dx; height -= dy; break;
    case "n":  y += dy; height -= dy; break;
    case "ne": width += dx; y += dy; height -= dy; break;
    case "e":  width += dx; break;
    case "se": width += dx; height += dy; break;
    case "s":  height += dy; break;
    case "sw": x += dx; width -= dx; height += dy; break;
    case "w":  x += dx; width -= dx; break;
  }

  // Enforce minimum size
  const MIN_SIZE = 4;
  if (width < MIN_SIZE) {
    if (handlePos.includes("w")) x -= (MIN_SIZE - width);
    width = MIN_SIZE;
  }
  if (height < MIN_SIZE) {
    if (handlePos.includes("n")) y -= (MIN_SIZE - height);
    height = MIN_SIZE;
  }

  // Aspect ratio lock (shift)
  if (shiftKey && startBounds.width > 0 && startBounds.height > 0) {
    const aspect = startBounds.width / startBounds.height;
    const isCorner = ["nw", "ne", "se", "sw"].includes(handlePos);
    if (isCorner) {
      const widthFromHeight = height * aspect;
      const heightFromWidth = width / aspect;
      if (Math.abs(width - widthFromHeight) < Math.abs(height - heightFromWidth)) {
        const oldWidth = width;
        width = widthFromHeight;
        if (handlePos.includes("w")) x -= (width - oldWidth);
      } else {
        const oldHeight = height;
        height = heightFromWidth;
        if (handlePos.includes("n")) y -= (height - oldHeight);
      }
    }
  }

  // Center resize (alt) — resize symmetrically about the original center
  if (altKey) {
    const oCx = startBounds.x + startBounds.width / 2;
    const oCy = startBounds.y + startBounds.height / 2;
    const halfW = width / 2;
    const halfH = height / 2;
    x = oCx - halfW;
    y = oCy - halfH;
  }

  return { x, y, width, height };
}

// ─── Transform: Apply ───────────────────────────────────────────────────────

/**
 * Translate selected drawings by (dx, dy).
 * Returns Map<id, changes>.
 */
export function applyTranslation(drawingsSnapshot, selectedIds, dx, dy) {
  const idSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  const result = new Map();
  for (const d of drawingsSnapshot) {
    if (!idSet.has(d.id)) continue;
    if (d.type === "text") {
      result.set(d.id, { x: d.x + dx, y: d.y + dy });
    } else if (d.type === "shape") {
      const changes = { x: (d.x || 0) + dx, y: (d.y || 0) + dy };
      if (d.shapeType === "custom" && d.points) {
        const newPoints = [];
        for (let i = 0; i < d.points.length; i += 2) {
          newPoints.push(d.points[i] + dx, d.points[i + 1] + dy);
        }
        changes.points = newPoints;
      }
      result.set(d.id, changes);
    } else {
      const newPoints = [];
      for (let i = 0; i < d.points.length; i += 2) {
        newPoints.push(d.points[i] + dx, d.points[i + 1] + dy);
      }
      result.set(d.id, { points: newPoints });
    }
  }
  return result;
}

/**
 * Scale selected drawings from oldBounds to newBounds.
 * Uses the anchor (opposite corner of the handle) for proportional scaling.
 * Returns Map<id, changes>.
 */
export function applyResize(drawingsSnapshot, selectedIds, oldBounds, newBounds) {
  const idSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  const result = new Map();

  const scaleX = oldBounds.width > 0 ? newBounds.width / oldBounds.width : 1;
  const scaleY = oldBounds.height > 0 ? newBounds.height / oldBounds.height : 1;

  for (const d of drawingsSnapshot) {
    if (!idSet.has(d.id)) continue;
    if (d.type === "text") {
      const newX = newBounds.x + (d.x - oldBounds.x) * scaleX;
      const newY = newBounds.y + (d.y - oldBounds.y) * scaleY;
      const newFontSize = Math.max(8, Math.round((d.fontSize || 18) * Math.min(scaleX, scaleY)));
      result.set(d.id, { x: newX, y: newY, fontSize: newFontSize });
    } else if (d.type === "shape") {
      const newX = newBounds.x + ((d.x || 0) - oldBounds.x) * scaleX;
      const newY = newBounds.y + ((d.y || 0) - oldBounds.y) * scaleY;
      const changes = { x: newX, y: newY, width: (d.width || 0) * scaleX, height: (d.height || 0) * scaleY };
      if (d.shapeType === "custom" && d.points) {
        const newPoints = [];
        for (let i = 0; i < d.points.length; i += 2) {
          newPoints.push(
            newBounds.x + (d.points[i] - oldBounds.x) * scaleX,
            newBounds.y + (d.points[i + 1] - oldBounds.y) * scaleY
          );
        }
        changes.points = newPoints;
      }
      if (d.strokeWidth) {
        changes.strokeWidth = Math.max(1, d.strokeWidth * Math.min(scaleX, scaleY));
      }
      result.set(d.id, changes);
    } else {
      const newPoints = [];
      for (let i = 0; i < d.points.length; i += 2) {
        newPoints.push(
          newBounds.x + (d.points[i] - oldBounds.x) * scaleX,
          newBounds.y + (d.points[i + 1] - oldBounds.y) * scaleY
        );
      }
      const changes = { points: newPoints };
      if (d.strokeWidth) {
        changes.strokeWidth = Math.max(1, d.strokeWidth * Math.min(scaleX, scaleY));
      }
      result.set(d.id, changes);
    }
  }
  return result;
}

/**
 * Rotate selected drawings about center by angleDelta (radians).
 * Returns Map<id, changes>.
 */
export function applyRotation(drawingsSnapshot, selectedIds, center, angleDelta) {
  const idSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  const result = new Map();
  const cos = Math.cos(angleDelta);
  const sin = Math.sin(angleDelta);

  const rotatePoint = (px, py) => {
    const dx = px - center.x;
    const dy = py - center.y;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  };

  for (const d of drawingsSnapshot) {
    if (!idSet.has(d.id)) continue;
    if (d.type === "text") {
      const rotated = rotatePoint(d.x, d.y);
      const angleDeg = (d.rotation || 0) + (angleDelta * 180) / Math.PI;
      result.set(d.id, { x: rotated.x, y: rotated.y, rotation: angleDeg });
    } else if (d.type === "shape") {
      const rotated = rotatePoint(d.x || 0, d.y || 0);
      const angleDeg = (d.rotation || 0) + (angleDelta * 180) / Math.PI;
      const changes = { x: rotated.x, y: rotated.y, rotation: angleDeg };
      if (d.shapeType === "custom" && d.points) {
        const newPoints = [];
        for (let i = 0; i < d.points.length; i += 2) {
          const rp = rotatePoint(d.points[i], d.points[i + 1]);
          newPoints.push(rp.x, rp.y);
        }
        changes.points = newPoints;
      }
      result.set(d.id, changes);
    } else {
      const newPoints = [];
      for (let i = 0; i < d.points.length; i += 2) {
        const rotated = rotatePoint(d.points[i], d.points[i + 1]);
        newPoints.push(rotated.x, rotated.y);
      }
      result.set(d.id, { points: newPoints });
    }
  }
  return result;
}

// ─── Shape Helpers ─────────────────────────────────────────────────────────

/**
 * Get triangle vertices from a bounding-box shape drawing.
 * Returns flat [x1,y1, x2,y2, x3,y3] array: top-center, bottom-left, bottom-right.
 */
export function getTrianglePoints(d) {
  const x = d.x || 0, y = d.y || 0, w = d.width || 0, h = d.height || 0;
  return [x + w / 2, y, x, y + h, x + w, y + h];
}

/**
 * Point-in-polygon test (ray casting). Points is flat [x1,y1, x2,y2, ...].
 * tolerance adds a buffer around edges.
 */
export function pointInPolygon(px, py, points, tolerance = 0) {
  // First check bounding box with tolerance
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    if (points[i] < minX) minX = points[i];
    if (points[i] > maxX) maxX = points[i];
    if (points[i + 1] < minY) minY = points[i + 1];
    if (points[i + 1] > maxY) maxY = points[i + 1];
  }
  if (px < minX - tolerance || px > maxX + tolerance || py < minY - tolerance || py > maxY + tolerance) {
    return false;
  }
  // Ray casting
  const n = points.length / 2;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = points[i * 2], yi = points[i * 2 + 1];
    const xj = points[j * 2], yj = points[j * 2 + 1];
    // Check edge proximity for tolerance
    if (tolerance > 0) {
      const dist = pointToSegmentDist(px, py, xi, yi, xj, yj);
      if (dist <= tolerance) return true;
    }
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ─── Arrow Endpoint Handles ────────────────────────────────────────────────

/**
 * Returns 2 handle descriptors for the start and end points of an arrow drawing.
 */
export function getArrowEndpointHandles(drawing, handleSize) {
  if (!drawing || drawing.type !== "arrow" || !drawing.points || drawing.points.length < 4) {
    return [];
  }
  const hs = handleSize / 2;
  return [
    { position: "start", x: drawing.points[0] - hs, y: drawing.points[1] - hs, width: handleSize, height: handleSize },
    { position: "end", x: drawing.points[2] - hs, y: drawing.points[3] - hs, width: handleSize, height: handleSize },
  ];
}

/**
 * Hit-test arrow endpoint handles. Returns "start" | "end" | null.
 */
export function hitTestEndpointHandle(handles, worldPoint) {
  for (const h of handles) {
    if (
      worldPoint.x >= h.x &&
      worldPoint.x <= h.x + h.width &&
      worldPoint.y >= h.y &&
      worldPoint.y <= h.y + h.height
    ) {
      return h.position;
    }
  }
  return null;
}
