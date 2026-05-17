const STORAGE_KEY = "coachable-custom-prefabs";

/** Load custom prefabs from localStorage. Returns [] on error. */
export function loadCustomPrefabs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Save array of custom prefabs to localStorage. */
export function saveCustomPrefabs(prefabs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefabs));
}

/**
 * Build a custom prefab from selected players and optionally the ball.
 * Computes centroid and stores each item as offset from center.
 * @param {string} label - User-provided name
 * @param {Object[]} players - Array of player objects {x, y, number, name, assignment, color}
 * @param {Object|null} ball - Ball object {x, y} or null
 * @returns {Object} prefab object with relative offsets
 */
export function buildCustomPrefab(label, players, ball = null) {
  // Include ball in centroid calculation if present
  const allPoints = [...players, ...(ball ? [ball] : [])];
  const cx = allPoints.reduce((s, p) => s + (p.x ?? 0), 0) / allPoints.length;
  const cy = allPoints.reduce((s, p) => s + (p.y ?? 0), 0) / allPoints.length;

  const result = {
    id: `custom-${Date.now()}`,
    label,
    mode: "custom",
    players: players.map((p) => ({
      dx: (p.x ?? 0) - cx,
      dy: (p.y ?? 0) - cy,
      number: p.number,
      name: p.name ?? "",
      assignment: p.assignment ?? "",
      color: p.color ?? "#ef4444",
    })),
    createdAt: new Date().toISOString(),
  };

  if (ball) {
    result.ball = {
      dx: (ball.x ?? 0) - cx,
      dy: (ball.y ?? 0) - cy,
    };
  }

  return result;
}

/**
 * Build a prefab-PRESET payload (admin-curated published prefab). Differences
 * from `buildCustomPrefab`:
 *   1. Anchors on the PLAYER centroid (not the combined centroid of
 *      players+ball). Click-to-place lands the player group centered on
 *      the cursor; balls/cones land at their saved offsets relative to the
 *      players. This matches user intuition — they click where they want
 *      the players, the rest comes along.
 *   2. Captures ALL field objects (every ball and cone in `ballsById`) into
 *      a single `objects` array, each tagged with its `objectType`. The
 *      legacy `ball` field is omitted — placement code reads `objects`.
 *   3. If the field has no players, the helper falls back to anchoring on
 *      the object centroid so a "just cones" prefab still places sanely.
 *
 * @param {string} label - Display name
 * @param {Object[]} players - `[{ x, y, number, name, color, ... }]`
 * @param {Object[]} objects - `[{ x, y, objectType: "ball"|"cone", hidden? }]`
 * @returns {Object|null} Prefab payload, or null if nothing to save
 */
export function buildPrefabPresetPayload(label, players, objects = []) {
  const playerList = Array.isArray(players) ? players : [];
  const objectList = Array.isArray(objects) ? objects : [];
  // Anchor on players when any exist; otherwise on the objects themselves.
  // Without an anchor there's nothing to relativize against and the prefab
  // would be useless to place.
  const anchorPoints = playerList.length > 0 ? playerList : objectList;
  if (anchorPoints.length === 0) return null;
  const cx = anchorPoints.reduce((s, p) => s + (p.x ?? 0), 0) / anchorPoints.length;
  const cy = anchorPoints.reduce((s, p) => s + (p.y ?? 0), 0) / anchorPoints.length;
  return {
    id: `custom-${Date.now()}`,
    label,
    mode: "custom",
    players: playerList.map((p) => ({
      dx: (p.x ?? 0) - cx,
      dy: (p.y ?? 0) - cy,
      number: p.number,
      name: p.name ?? "",
      assignment: p.assignment ?? "",
      color: p.color ?? "#ef4444",
    })),
    objects: objectList.map((o) => ({
      dx: (o.x ?? 0) - cx,
      dy: (o.y ?? 0) - cy,
      objectType: o.objectType === "cone" ? "cone" : "ball",
      ...(o.hidden ? { hidden: true } : {}),
    })),
    createdAt: new Date().toISOString(),
  };
}

/** Delete a custom prefab by id. Returns updated array. */
export function deleteCustomPrefab(id) {
  const current = loadCustomPrefabs();
  const updated = current.filter((p) => p.id !== id);
  saveCustomPrefabs(updated);
  return updated;
}
