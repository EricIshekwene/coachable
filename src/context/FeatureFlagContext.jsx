/* eslint-disable react-refresh/only-export-components */
/**
 * Feature flag context.
 *
 * Fetches resolved flags from GET /flags/me once per session (after login).
 * Provides useFlag(name) → boolean for gating feature rendering.
 *
 * Fails silently — if the request errors, all flags default to false so
 * features are hidden rather than broken for the user.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/api";

/** @type {React.Context<Record<string, boolean>>} */
const FeatureFlagContext = createContext({});

/**
 * Provides resolved feature flags to the component tree.
 * Re-fetches when `userId` changes (login / account switch).
 *
 * @param {{ children: React.ReactNode, userId: string|null }} props
 */
export function FeatureFlagProvider({ children, userId }) {
  const [flags, setFlags] = useState({});

  const fetchFlags = useCallback(async () => {
    if (!userId) {
      setFlags({});
      return;
    }
    try {
      const data = await apiFetch("/flags/me");
      setFlags(data.flags || {});
    } catch {
      // Fail closed — no flags means features are hidden, not broken
      setFlags({});
    }
  }, [userId]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * Returns whether the named feature flag is enabled for the current user.
 * Defaults to false if the flag is unknown or flags haven't loaded yet.
 *
 * @param {string} name - flag name, e.g. "in_app_notifications"
 * @returns {boolean}
 */
export function useFlag(name) {
  return useContext(FeatureFlagContext)[name] ?? false;
}

/** Access the full flags map (e.g. for debugging). */
export function useAllFlags() {
  return useContext(FeatureFlagContext);
}
