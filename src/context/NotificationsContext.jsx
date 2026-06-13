import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  submitNotificationResponse,
} from "../utils/notificationsApi";

const NotificationsContext = createContext(null);

const POLL_INTERVAL_MS = 60_000;

/**
 * Provides the authenticated user's in-app notifications to the app shell.
 * Keeps the bell badge and the notifications page in sync from one source,
 * and polls in the background so new sends appear without a refresh.
 *
 * When `enabled` is false (in_app_notifications feature flag is off), the
 * provider renders children but skips all fetching and exposes empty state.
 *
 * @param {{ children: React.ReactNode, enabled?: boolean }} props
 */
export function NotificationsProvider({ children, enabled = true }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    let lastErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1500));
        if (!mountedRef.current) return;
      }
      try {
        const data = await fetchNotifications();
        if (!mountedRef.current) return;
        setNotifications(data.notifications || []);
        setError("");
        setLoading(false);
        return;
      } catch (err) {
        lastErr = err;
        if (!mountedRef.current) return;
      }
    }
    setError(lastErr?.message || "Could not load notifications");
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    mountedRef.current = true;
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [refresh, enabled]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications]
  );

  const markRead = useCallback(async (id) => {
    // Optimistic: flip read state immediately, then persist.
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n))
    );
    try {
      await markNotificationRead(id);
    } catch {
      refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    try {
      await markAllNotificationsRead();
    } catch {
      refresh();
    }
  }, [refresh]);

  const respond = useCallback(async (id, answers) => {
    await submitNotificationResponse(id, answers);
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, respondedAt: now, readAt: n.readAt || now } : n
      )
    );
  }, []);

  const value = useMemo(
    () => ({ notifications, loading, error, unreadCount, refresh, markRead, markAllRead, respond }),
    [notifications, loading, error, unreadCount, refresh, markRead, markAllRead, respond]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

/** Access the notifications store. Must be used within a NotificationsProvider. */
export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationsProvider");
  return ctx;
}
