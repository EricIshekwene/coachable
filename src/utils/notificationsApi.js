import { apiFetch } from "./api";

/**
 * Client wrappers for the user-facing in-app notification endpoints.
 * All calls authenticate via the shared apiFetch (Bearer token + cookie).
 */

/**
 * Fetch the current user's notifications, newest first.
 * @param {Object} [options] - passed through to apiFetch (e.g. skipNetworkErrorReport)
 */
export function fetchNotifications(options) {
  return apiFetch("/notifications", options);
}

/** Fetch the unread notification count for the bell badge. */
export function fetchUnreadCount() {
  return apiFetch("/notifications/unread-count");
}

/** Mark a single notification as read. */
export function markNotificationRead(id) {
  return apiFetch(`/notifications/${id}/read`, { method: "POST" });
}

/** Mark every notification as read. */
export function markAllNotificationsRead() {
  return apiFetch("/notifications/read-all", { method: "POST" });
}

/**
 * Submit answers to a notification's embedded question blocks.
 * @param {string} id notification id
 * @param {Record<string, unknown>} answers map of questionId → answer
 */
export function submitNotificationResponse(id, answers) {
  return apiFetch(`/notifications/${id}/respond`, { method: "POST", body: { answers } });
}
