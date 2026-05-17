import { apiFetch } from "./api";
import { adminFetchOptions, API_URL } from "../admin/adminTransport";

/**
 * Fetch all prefabs for the current context.
 * @param {boolean} adminMode - If true, use admin API (legacy session OR staff JWT).
 * @returns {Promise<Object[]>} Array of prefab objects.
 */
export async function fetchPrefabs(adminMode = false) {
  if (adminMode) {
    const res = await fetch(`${API_URL}/admin/prefabs`, adminFetchOptions());
    if (!res.ok) return [];
    const data = await res.json();
    return data.prefabs || [];
  }
  try {
    const data = await apiFetch("/prefabs");
    return data.prefabs || [];
  } catch {
    return [];
  }
}

/**
 * Save a new prefab to the server.
 * @param {Object} prefab - The prefab object (built by buildCustomPrefab).
 * @param {boolean} adminMode - If true, use admin API.
 * @returns {Promise<Object|null>} The saved prefab with server-assigned id, or null on error.
 */
export async function savePrefabToServer(prefab, adminMode = false) {
  const { label, ...rest } = prefab;
  if (adminMode) {
    const res = await fetch(`${API_URL}/admin/prefabs`, adminFetchOptions({
      method: "POST",
      body: JSON.stringify({ label, prefab_data: rest }),
    }));
    if (!res.ok) return null;
    const data = await res.json();
    return data.prefab || null;
  }
  try {
    const data = await apiFetch("/prefabs", {
      method: "POST",
      body: { label, prefab_data: rest },
    });
    return data.prefab || null;
  } catch {
    return null;
  }
}

/**
 * Delete a prefab from the server by its ID.
 * @param {string} id - The prefab's UUID.
 * @param {boolean} adminMode - If true, use admin API.
 * @returns {Promise<boolean>} True if deleted successfully.
 */
export async function deletePrefabFromServer(id, adminMode = false) {
  if (adminMode) {
    const res = await fetch(`${API_URL}/admin/prefabs/${id}`, adminFetchOptions({
      method: "DELETE",
    }));
    return res.ok;
  }
  try {
    await apiFetch(`/prefabs/${id}`, { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch all published prefab presets for a sport. These are admin-curated
 * reusable player groupings that all users of the sport can drop into a play
 * from the Slate Prefabs panel.
 *
 * Returns an empty array if the sport is missing/blank, the request fails,
 * or the user is unauthenticated (the endpoint requires a logged-in session).
 *
 * @param {string} sport - Sport name (case-insensitive on the server)
 * @returns {Promise<Object[]>} Array of `{ id, name, prefabData }` records
 */
export async function fetchSportPrefabPresets(sport) {
  const trimmed = String(sport ?? "").trim();
  if (!trimmed) return [];
  try {
    const data = await apiFetch(`/sport-prefab-presets/${encodeURIComponent(trimmed)}`);
    return data.presets || [];
  } catch {
    return [];
  }
}
