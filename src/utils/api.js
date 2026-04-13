import { reportApiError } from "./errorReporter";

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

function createApiError(message, status = 0, data = null, code = "api_error", cause = null) {
  const error = new Error(message);
  error.status = status;
  error.data = data;
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

/**
 * Wrapper around fetch that authenticates via Bearer token (localStorage)
 * with HttpOnly cookie as fallback for same-origin environments.
 * Throws on non-2xx responses with { status, error } shape.
 */
export async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const method = String(options.method || "GET").toUpperCase();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (cause) {
    reportApiError({
      path,
      method,
      errorMessage: cause?.message || "Network request failed",
      errorStack: cause?.stack || null,
      extra: {
        kind: "network",
      },
    });
    throw createApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      null,
      "network_error",
      cause
    );
  }

  // Handle 204 No Content
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMessage = data.error || `API error ${res.status}`;
    if (res.status >= 500) {
      reportApiError({
        path,
        method,
        status: res.status,
        errorMessage,
        extra: {
          kind: "server",
        },
      });
    }
    throw createApiError(
      errorMessage,
      res.status,
      data,
      res.status >= 500 ? "server_error" : "http_error"
    );
  }

  return data;
}
