/* eslint-disable react-refresh/only-export-components */
/**
 * Migration status context.
 *
 * Fetches GET /migration/me once per logged-in user (same shape as
 * FeatureFlagContext) and exposes each of the user's teams with its V1->V2
 * migration status.
 *
 * FAILS OPEN, ALWAYS. If the request errors, times out, or the server says the
 * status cache has never loaded, this context reports `ready: false` and an
 * empty team list — every consumer then renders exactly what V1 renders today.
 * There is no loading gate here: children render immediately while the fetch
 * is in flight, so a slow or dead endpoint can never trap a coach behind a
 * spinner or a blank screen.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import { isMovedTeam, shouldShowMovedInterstitial } from "../utils/migrationDestination";

/**
 * @typedef {Object} MigrationStatusValue
 * @property {boolean} ready            true only when a successful response said the cache has loaded
 * @property {Array<{teamId: string, teamName: string, status: string}>} teams
 * @property {Array<{teamId: string, teamName: string, status: string}>} movedTeams
 * @property {Array<{teamId: string, teamName: string, status: string}>} stayingTeams
 */

/** @type {MigrationStatusValue} */
const EMPTY = { ready: false, teams: [], movedTeams: [], stayingTeams: [] };

const MigrationStatusContext = createContext(EMPTY);

/**
 * Provides migration status for the current user's teams.
 * Re-fetches when `userId` changes (login / account switch).
 *
 * @param {{ children: React.ReactNode, userId: string|null }} props
 */
export function MigrationStatusProvider({ children, userId }) {
  const [value, setValue] = useState(EMPTY);

  const fetchStatus = useCallback(async () => {
    if (!userId) {
      setValue(EMPTY);
      return;
    }
    try {
      const data = await apiFetch("/migration/me");
      const teams = Array.isArray(data?.teams) ? data.teams : [];
      // hasEverLoaded === false means V1 has never heard from V2, so every
      // status is a default rather than a fact. Treat it as "no information".
      if (!data?.hasEverLoaded) {
        setValue(EMPTY);
        return;
      }
      setValue({
        ready: true,
        teams,
        movedTeams: teams.filter(isMovedTeam),
        stayingTeams: teams.filter((t) => !isMovedTeam(t)),
      });
    } catch {
      // Fail open — behave exactly like V1 does today.
      setValue(EMPTY);
    }
  }, [userId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <MigrationStatusContext.Provider value={value}>
      {children}
    </MigrationStatusContext.Provider>
  );
}

/**
 * Full migration status for the current user's teams.
 * @returns {MigrationStatusValue}
 */
export function useMigrationStatus() {
  return useContext(MigrationStatusContext);
}

/**
 * Whether the full moved-account interstitial should replace the app for the
 * given active team.
 *
 * True when we have real data AND either every team the coach belongs to has
 * moved, or the team they are currently working in has moved. A coach with an
 * unmoved team is never locked out: they switch teams from the interstitial.
 *
 * @param {string|null|undefined} activeTeamId - user.teamId, the selected team
 * @returns {boolean}
 */
export function useShowMigrationInterstitial(activeTeamId) {
  const status = useMigrationStatus();
  return shouldShowMovedInterstitial(status, activeTeamId);
}
