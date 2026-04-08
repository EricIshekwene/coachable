const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const TOKEN_KEY = "coachable_token";

/** Persist the JWT so Bearer auth works across origins. */
export function setAuthToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Retrieve the stored JWT. */
export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Wrapper around fetch that authenticates via Bearer token (localStorage)
 * with HttpOnly cookie as fallback for same-origin environments.
 * Throws on non-2xx responses with { status, error } shape.
 */
export async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Handle 204 No Content
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `API error ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
