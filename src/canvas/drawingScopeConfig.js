/**
 * Drawing-scope configuration. Replaces the ad-hoc `drawingModeSnap` /
 * `drawingMode` booleans that previously decided how canvas drawing behaved.
 *
 * Each scope describes the capability matrix for one drawing system:
 * - `ANNOTATION_DRAW_SCOPE`: pure overlay drawings (text, shapes, free strokes,
 *   arrows). Never snap to entities, never carry step metadata.
 * - `MOTION_DRAW_SCOPE`: entity-attached motion paths. Always snap to a player
 *   or ball (or the tip of the previous step), always carry step metadata.
 *
 * Hooks like `useCanvasDrawing` accept a scope and read this matrix instead of
 * branching on `drawingModeSnap` so the rules cannot drift between annotation
 * and motion contexts.
 *
 * @module canvas/drawingScopeConfig
 */

/** @typedef {"annotation" | "motion"} DrawingScopeName */

/** @typedef {{
 *   name: DrawingScopeName,
 *   allowsSnap: boolean,
 *   allowsContinuation: boolean,
 *   allowsText: boolean,
 *   allowsShape: boolean,
 *   allowsChainErase: boolean,
 *   requiresEntityAttachment: boolean,
 *   subTools: string[],
 * }} DrawingScope */

/** Capability matrix for annotation drawings (regular overlays). */
export const ANNOTATION_DRAW_SCOPE = Object.freeze({
  name: "annotation",
  allowsSnap: false,
  allowsContinuation: false,
  allowsText: true,
  allowsShape: true,
  allowsChainErase: false,
  requiresEntityAttachment: false,
  subTools: ["select", "draw", "arrow", "text", "shape", "erase"],
});

/** Capability matrix for motion drawings (animation-driving paths). */
export const MOTION_DRAW_SCOPE = Object.freeze({
  name: "motion",
  allowsSnap: true,
  allowsContinuation: true,
  allowsText: false,
  allowsShape: false,
  allowsChainErase: true,
  requiresEntityAttachment: true,
  subTools: ["select", "draw", "arrow", "erase"],
});

/**
 * Resolve a scope object from its name. Returns the annotation scope as a safe
 * default rather than throwing — calling code should still pass an explicit
 * value when it knows which scope it's in.
 * @param {DrawingScopeName|DrawingScope} value
 * @returns {DrawingScope}
 */
export function resolveDrawingScope(value) {
  if (value && typeof value === "object" && value.name) return value;
  if (value === "motion") return MOTION_DRAW_SCOPE;
  return ANNOTATION_DRAW_SCOPE;
}

/** @param {DrawingScopeName|DrawingScope} scope */
export function scopeAllowsSnap(scope) {
  return resolveDrawingScope(scope).allowsSnap;
}

/** @param {DrawingScopeName|DrawingScope} scope */
export function scopeAllowsContinuation(scope) {
  return resolveDrawingScope(scope).allowsContinuation;
}

/** @param {DrawingScopeName|DrawingScope} scope */
export function scopeAllowsText(scope) {
  return resolveDrawingScope(scope).allowsText;
}

/** @param {DrawingScopeName|DrawingScope} scope */
export function scopeAllowsShape(scope) {
  return resolveDrawingScope(scope).allowsShape;
}

/** @param {DrawingScopeName|DrawingScope} scope */
export function scopeAllowsChainErase(scope) {
  return resolveDrawingScope(scope).allowsChainErase;
}

/** @param {DrawingScopeName|DrawingScope} scope */
export function scopeRequiresEntityAttachment(scope) {
  return resolveDrawingScope(scope).requiresEntityAttachment;
}

/**
 * Returns true if the given sub-tool is valid within the given scope.
 * Convenient guard for palettes and pointer handlers.
 * @param {DrawingScopeName|DrawingScope} scope
 * @param {string} subTool
 * @returns {boolean}
 */
export function scopeAllowsSubTool(scope, subTool) {
  const resolved = resolveDrawingScope(scope);
  return resolved.subTools.includes(subTool);
}
