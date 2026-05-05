import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Fetches all analytics data for the admin dashboard.
 *
 * @param {{ session: string, period: "7d"|"30d"|"90d"|"all" }} options
 * @returns {{ data: Object|null, loading: boolean, error: string, refetch: () => void }}
 */
export function useDashboardAnalytics({ session, period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const fetch_ = useCallback(async () => {
    if (!session) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/admin/analytics?period=${period}`, {
        signal: controller.signal,
        headers: { "x-admin-session": session },
      });
      if (res.status === 401) {
        setError("Session expired. Reload the page.");
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load analytics");
      setData(json);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [session, period]);

  useEffect(() => {
    fetch_();
    return () => abortRef.current?.abort();
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}
