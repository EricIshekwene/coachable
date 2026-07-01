/* eslint-disable react-refresh/only-export-components */
/**
 * Suite feature context.
 *
 * Fetches the enabled Team Suite features for the current team from
 * GET /teams/:teamId/suite/features. Re-fetches when the active team changes.
 *
 * Provides useSuiteFeature(name) → boolean for gating routes and nav items.
 * Provides useSuiteLoading() → boolean so gates can show a spinner instead of
 * redirecting before the fetch settles.
 * Fails silently — if the request errors, all features default to false.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

const SUITE_FEATURES = ["roster", "practice_plans", "install_calendar", "game_plans", "assignments"];

/** @type {React.Context<{ features: Record<string, boolean>, loading: boolean }>} */
const SuiteContext = createContext({ features: {}, loading: true });

/**
 * Provides resolved suite features to the component tree.
 * Re-fetches when teamId changes (team switch).
 *
 * @param {{ children: React.ReactNode, teamId: string|null }} props
 */
export function SuiteProvider({ children, teamId }) {
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchFeatures = useCallback(async () => {
    if (!teamId) {
      setFeatures({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch(`/teams/${teamId}/suite/features`);
      setFeatures(data.features || {});
    } catch {
      // Fail closed — features hidden rather than broken
      const defaultOff = {};
      for (const f of SUITE_FEATURES) defaultOff[f] = false;
      setFeatures(defaultOff);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  return (
    <SuiteContext.Provider value={{ features, loading }}>
      {children}
    </SuiteContext.Provider>
  );
}

/**
 * Returns whether the named Team Suite feature is enabled for the current team.
 * Defaults to false if unknown or not yet loaded.
 *
 * @param {string} name - one of: roster, practice_plans, install_calendar, game_plans, assignments
 * @returns {boolean}
 */
export function useSuiteFeature(name) {
  return useContext(SuiteContext).features[name] ?? false;
}

/** Access the full suite features map. */
export function useSuiteFeatures() {
  return useContext(SuiteContext).features;
}

/** Returns true while the initial feature fetch is in flight. */
export function useSuiteLoading() {
  return useContext(SuiteContext).loading;
}
