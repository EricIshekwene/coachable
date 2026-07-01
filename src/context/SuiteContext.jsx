/* eslint-disable react-refresh/only-export-components */
/**
 * Suite feature context.
 *
 * Fetches the enabled Team Suite features for the current team from
 * GET /teams/:teamId/suite/features. Re-fetches when the active team changes.
 *
 * Provides useSuiteFeature(name) → boolean for gating routes and nav items.
 * Fails silently — if the request errors, all features default to false.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

const SUITE_FEATURES = ["roster", "practice_plans", "install_calendar", "game_plans", "assignments"];

/** @type {React.Context<Record<string, boolean>>} */
const SuiteContext = createContext({});

/**
 * Provides resolved suite features to the component tree.
 * Re-fetches when teamId changes (team switch).
 *
 * @param {{ children: React.ReactNode, teamId: string|null }} props
 */
export function SuiteProvider({ children, teamId }) {
  const [features, setFeatures] = useState({});

  const fetchFeatures = useCallback(async () => {
    if (!teamId) {
      setFeatures({});
      return;
    }
    try {
      const data = await apiFetch(`/teams/${teamId}/suite/features`);
      setFeatures(data.features || {});
    } catch {
      // Fail closed — features hidden rather than broken
      const defaultOff = {};
      for (const f of SUITE_FEATURES) defaultOff[f] = false;
      setFeatures(defaultOff);
    }
  }, [teamId]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  return (
    <SuiteContext.Provider value={features}>
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
  return useContext(SuiteContext)[name] ?? false;
}

/** Access the full suite features map. */
export function useSuiteFeatures() {
  return useContext(SuiteContext);
}
