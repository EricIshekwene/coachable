import { apiFetch } from "./api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const ADMIN_SESSION_KEY = "coachable_admin_session";

/** Returns the admin session token from sessionStorage, or null. */
function getAdminSession() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY);
}

/**
 * Fetch all prefabs for the current context.
 * @param {boolean} adminMode - If true, use admin API with session auth.
 * @returns {Promise<Object[]>} Array of prefab objects.
 */
export async function fetchPrefabs(adminMode = false) {
  if (adminMode) {
    const session = getAdminSession();
    if (!session) return [];
    const res = await fetch(`${API_URL}/admin/prefabs`, {
      headers: { "x-admin-session": session },
    });
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
    const session = getAdminSession();
    if (!session) return null;
    const res = await fetch(`${API_URL}/admin/prefabs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-session": session,
      },
      body: JSON.stringify({ label, prefab_data: rest }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.prefab || null;
  }
  try {
    const data = await apiFetch("/prefabs", {
      method: "POST",
      body: JSON.stringify({ label, prefab_data: rest }),
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
    const session = getAdminSession();
    if (!session) return false;
    const res = await fetch(`${API_URL}/admin/prefabs/${id}`, {
      method: "DELETE",
      headers: { "x-admin-session": session },
    });
    return res.ok;
  }
  try {
    await apiFetch(`/prefabs/${id}`, { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}
