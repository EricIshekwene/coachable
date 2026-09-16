/**
 * V1 -> V2 migration routes.
 *
 * User-facing:
 *   GET /migration/me — per-team migration status for the authenticated user
 *
 * READ-ONLY BY DESIGN. This router never calls V2 and never writes anything:
 * it reads the in-memory snapshot held by `server/lib/migrationStatus.js`,
 * which is the only thing in V1 that talks to V2.
 *
 * It is deliberately a GET so the cutover write-lock middleware (which blocks
 * mutating requests once a team has moved) can never block it.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getSnapshotMeta, getUserTeamStatuses } from "../lib/migrationStatus.js";

const router = Router();

/**
 * GET /migration/me
 *
 * Returns every team the authenticated user belongs to in V1, with that
 * team's migration status, plus whether the status cache has ever loaded.
 *
 * `hasEverLoaded: false` means V1 has never successfully heard from V2, so
 * every `status` in `teams` is the 'v1_only' default rather than a fact.
 * Clients MUST treat that case as "show nothing different" — see
 * `src/context/MigrationStatusContext.jsx`.
 *
 * Response: { hasEverLoaded: boolean, fresh: boolean,
 *             teams: Array<{ teamId, teamName, status }> }
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const teams = await getUserTeamStatuses(req.userId);
    const snapshot = getSnapshotMeta();
    // A last-known-good snapshot remains useful to V1's server-side
    // availability checks, but is never safe for client-side migration UI or
    // the convenience redirect. Make that distinction explicit at this trust
    // boundary instead of asking browser code to infer cache age.
    res.json({
      hasEverLoaded: snapshot.hasEverLoaded,
      fresh: snapshot.hasEverLoaded && !snapshot.isStale,
      teams,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
