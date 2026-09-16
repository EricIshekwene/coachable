/* eslint-disable react-refresh/only-export-components */
/**
 * Migration status context.
 *
 * Fetches GET /migration/me for the logged-in user (same shape as
 * FeatureFlagContext) and exposes each of the user's teams with its V1->V2
 * migration status. It then refreshes in the background on the same cadence
 * NotificationsContext uses (60s, skipped while the tab is hidden or the
 * device is offline, plus one refresh on visibilitychange) so a coach whose
 * team is flipped to v2_live mid-session finds out without reloading.
 *
 * FAILS OPEN, ALWAYS. If the request errors, times out, or the server says the
 * status cache has never loaded or is stale, this context reports `ready: false` and an
 * empty team list — every consumer then renders exactly what V1 renders today.
 * There is no loading gate here: children render immediately while the fetch
 * is in flight, so a slow or dead endpoint can never trap a coach behind a
 * spinner or a blank screen. A failed refresh clears the routing signal: V1
 * remains usable, but a stale answer can never send a coach to beta.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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
const EMPTY = { ready: false, fresh: false, snapshotGeneration: null, teams: [], movedTeams: [], stayingTeams: [] };

function snapshotGeneration(teams) {
  return teams
    .map((team) => `${team?.teamId || ""}:${team?.status || ""}`)
    .sort()
    .join("|");
}

const MigrationStatusContext = createContext(EMPTY);

/**
 * How often the status is re-checked in the background. Matches
 * NotificationsContext's POLL_INTERVAL_MS — V1's existing polling cadence.
 */
const POLL_INTERVAL_MS = 60_000;

/**
 * Provides migration status for the current user's teams.
 * Re-fetches when `userId` changes (login / account switch) and refreshes
 * quietly in the background while the tab is open.
 *
 * @param {{ children: React.ReactNode, userId: string|null }} props
 */
export function MigrationStatusProvider({ children, userId }) {
  const [value, setValue] = useState(EMPTY);
  const mountedRef = useRef(true);

  /**
   * Read GET /migration/me and publish the result.
   *
   * Any failed or unloaded response clears the routing signal while leaving
   * the V1 UI usable.
   */
  const fetchStatus = useCallback(async () => {
    if (!userId) {
      setValue(EMPTY);
      return;
    }
    try {
      const data = await apiFetch("/migration/me");
      if (!mountedRef.current) return;
      const teams = Array.isArray(data?.teams) ? data.teams : [];
      // The server is the cache's trust boundary. Last-known-good data is
      // intentionally retained for V1's server-side availability behavior,
      // but it must never drive browser migration UI or a V1 -> V2 redirect.
      // Strictly require an explicit fresh:true; omitted/malformed responses
      // fail open exactly like an unloaded cache.
      if (!data?.hasEverLoaded || data?.fresh !== true) {
        setValue(EMPTY);
        return;
      }
      setValue({
        ready: true,
        // The server supplied an explicitly fresh cache signal. Failed,
        // unloaded, stale, or malformed responses must never reuse it.
        fresh: true,
        snapshotGeneration: typeof data?.snapshotGeneration === "string" && data.snapshotGeneration
          ? data.snapshotGeneration
          : snapshotGeneration(teams),
        teams,
        movedTeams: teams.filter(isMovedTeam),
        stayingTeams: teams.filter((t) => !isMovedTeam(t)),
      });
    } catch {
      // Fail open — behave exactly like V1 does today.
      if (!mountedRef.current) return;
      setValue(EMPTY);
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    // A non-refresh fetch resets to EMPTY on any failure, so a new user never
    // keeps looking at the previous user's answer.
    fetchStatus();
    if (!userId) {
      return () => {
        mountedRef.current = false;
      };
    }
    // Skip ticks while the tab is hidden or the device is offline, the same
    // guards NotificationsContext uses, so a sleeping laptop does not fire a
    // doomed request the moment it wakes.
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      fetchStatus({ isRefresh: true });
    }, POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchStatus({ isRefresh: true });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchStatus, userId]);

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
