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
 * Build a custom prefab from selected players.
 * Computes centroid and stores each player as offset from center.
 * @param {string} label - User-provided name
 * @param {Object[]} players - Array of player objects {x, y, number, name, assignment, color}
 * @returns {Object} prefab object with relative offsets
 */
export function buildCustomPrefab(label, players) {
  const cx = players.reduce((s, p) => s + (p.x ?? 0), 0) / players.length;
  const cy = players.reduce((s, p) => s + (p.y ?? 0), 0) / players.length;

  return {
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
}

/** Delete a custom prefab by id. Returns updated array. */
export function deleteCustomPrefab(id) {
  const current = loadCustomPrefabs();
  const updated = current.filter((p) => p.id !== id);
  saveCustomPrefabs(updated);
  return updated;
}
