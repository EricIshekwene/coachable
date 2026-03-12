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

/** Delete a custom prefab by id. Returns updated array. */
export function deleteCustomPrefab(id) {
  const current = loadCustomPrefabs();
  const updated = current.filter((p) => p.id !== id);
  saveCustomPrefabs(updated);
  return updated;
}
