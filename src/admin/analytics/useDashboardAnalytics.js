import { useState, useEffect, useCallback, useRef } from "react";
import { adminFetchOptions, API_URL } from "../adminTransport";

/**
 * Fetches all analytics data for the admin dashboard.
 *
 * The `session` param is accepted for backward compatibility but no longer
 * required — adminFetchOptions() now reads credentials transparently from
 * sessionStorage (legacy admin) and localStorage/cookie (staff JWT).
 *
 * @param {{ session?: string, period: "7d"|"30d"|"90d"|"all" }} options
 * @returns {{ data: Object|null, loading: boolean, error: string, refetch: () => void }}
 */
export function useDashboardAnalytics({ period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const fetch_ = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_URL}/admin/analytics?period=${period}`,
        adminFetchOptions({ signal: controller.signal })
      );
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
  }, [period]);

  useEffect(() => {
    fetch_();
    return () => abortRef.current?.abort();
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}
