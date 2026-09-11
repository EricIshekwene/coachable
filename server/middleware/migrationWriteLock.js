/**
 * Migration write lock — refuses V1 writes for teams that have moved to V2.
 *
 * During the V1 -> V2 cutover a team's data is copied to V2 and V2 becomes the
 * source of truth. A write that lands in V1 AFTER that copy has run is silently
 * lost: nobody sees an error, the coach believes the change saved, and it never
 * appears in V2. This middleware makes that write fail loudly instead.
 *
 * DESIGN RULES (all of these are deliberate — read before changing anything):
 *
 * 1. READS ARE NEVER BLOCKED. Only POST/PUT/PATCH/DELETE are considered.
 *    GET/HEAD/OPTIONS always pass. A coach mid-session keeps full access to
 *    whatever they are looking at; this is an intentional grace period.
 *
 * 2. 409 CONFLICT, never 403 and never a redirect. 403 reads as a permissions
 *    bug and sends coaches to support; a redirect breaks non-browser clients.
 *    The body always carries the stable machine code `TEAM_MIGRATED_TO_V2` so
 *    the frontend interstitial can detect this without string-matching.
 *
 * 3. FAIL OPEN, ALWAYS. If the migration-status cache has never successfully
 *    loaded (`hasEverLoaded() === false`) every write is ALLOWED, and any
 *    exception anywhere in this middleware also falls through to `next()`.
 *    Locking every paying coach out because a poll failed on boot is far worse
 *    than the data loss this prevents.
 *
 * 4. ZERO COST AND ZERO BEHAVIOUR CHANGE BEFORE THE CUTOVER. While the snapshot
 *    reports no team in a locked state, the middleware exits on a synchronous
 *    in-memory check with no database query and no observable difference.
 *
 * See MIGRATION_WRITE_LOCK.md in this folder.
 */

import {
  getTeamStatus,
  getUserTeamStatuses,
  getSnapshotMeta,
  hasEverLoaded,
} from "../lib/migrationStatus.js";
import { readSessionToken, verifySessionToken } from "./auth.js";

// ── Constants ────────────────────────────────────────────────────────────────

/** HTTP methods this middleware inspects. Everything else passes untouched. */
export const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Statuses that make a V1 write unsafe.
 *
 * `migrating` IS LOCKED, deliberately: a team mid-copy is the single most
 * dangerous window there is — a write that lands after its rows were copied is
 * silently lost forever, whereas a refused write is fully recoverable because
 * the coach sees the error and can redo it in V2.
 */
export const LOCKED_STATUSES = new Set(["v2_live", "migrating"]);

/** Stable machine-readable code on every blocked response. Do not change. */
export const MIGRATED_ERROR_CODE = "TEAM_MIGRATED_TO_V2";

/** HTTP status for a blocked write. 409 Conflict — see design rule 2. */
export const MIGRATED_HTTP_STATUS = 409;

/** Where a migrated coach should go. Shown in the message and in the body. */
export const V2_APP_URL = "https://beta.coachableplays.com";

/**
 * Paths that stay writable even for a fully migrated coach.
 *
 * Matched as whole path SEGMENTS against the start of the request path, so
 * "/admin" matches "/admin/plays" but never "/administrators".
 *
 * Every entry is a route that, if blocked, would trap a coach OUTSIDE the app
 * with no way to reach the message telling them where to go. Err toward adding
 * entries here — a false exemption costs one stale row, a false block costs a
 * paying customer their login.
 */
export const EXEMPT_PATH_PREFIXES = [
  // --- Auth / session. If these are blocked a migrated coach cannot even log
  // in to be told that their team moved. Covers login, logout, signup,
  // forgot-password and reset-password.
  "/auth",

  // --- Email verification send/verify. Blocking it strands an unverified user
  // at the verification gate with no way through.
  "/verification",

  // --- Account/profile level, not team data: name, preferences, change-email.
  // A coach must always be able to fix their own account.
  "/users",

  // --- Account provisioning for a BRAND-NEW team. A team created right now
  // cannot already have been migrated, so there is nothing to lose. Note that
  // /onboarding/join-team is deliberately NOT exempt: joining a team that has
  // already moved is exactly the write we want to refuse.
  "/onboarding/create-team",
  "/onboarding/solo",

  // --- Telemetry. V1 must keep collecting client errors through the cutover,
  // and a migrated coach reporting "I cannot get in" must be able to send it.
  "/error-reports",
  "/user-issues",

  // --- Notification read-marking. No team content; blocking it leaves a
  // permanently un-clearable notification bell.
  "/notifications",

  // --- Staff/admin console (also covers /admin/outreach and /admin/team-suite).
  // Staff must keep operating V1 through the cutover, INCLUDING the lever that
  // rolls a team back off V2. Blocking this would remove the rollback path.
  "/admin",

  // --- Staff invite acceptance. Staff onboarding, not coach team data.
  "/staff",

  // --- Feature-flag kill-switch surface. Must stay operable at all times.
  "/flags",

  // --- Liveness probe. GET-only today, exempt so it can never be gated.
  "/health",
];

/** Matches a Postgres UUID, which is what every V1 team id is. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Log prefix so these lines are greppable in Railway logs. */
const LOG_PREFIX = "[migration-write-lock]";

// ── Pure helpers (exported for tests) ────────────────────────────────────────

/**
 * Strip query string and hash off a request URL, leaving the pathname.
 *
 * @param {string} url - `req.originalUrl` or `req.url`
 * @returns {string}
 */
export function pathnameOf(url) {
  if (typeof url !== "string" || !url) return "/";
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/**
 * Whether a path is on the exemption allow-list.
 *
 * Segment-aware: a prefix only matches when the next character is "/" or the
 * path ends there, so "/admin" never matches "/administrators".
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export function isExemptPath(pathname) {
  const p = pathnameOf(pathname);
  return EXEMPT_PATH_PREFIXES.some((prefix) => {
    if (!p.startsWith(prefix)) return false;
    const next = p.charAt(prefix.length);
    return next === "" || next === "/";
  });
}

/**
 * Pull the team id out of a request path, or null if the path is not
 * team-scoped.
 *
 * This middleware runs BEFORE the route mounts, so `req.params` is empty and
 * the id has to be read off the raw path. Three separate routers (teams.js,
 * plays.js, folders.js) plus suite.js all mount on "/teams", and every one of
 * their team-scoped paths has the shape "/teams/<uuid>/...". The UUID check is
 * what keeps "/teams/join", "/teams/create" and "/teams/create-personal" out.
 *
 * @param {string} pathname
 * @returns {string | null}
 */
export function extractTeamIdFromPath(pathname) {
  const segments = pathnameOf(pathname).split("/").filter(Boolean);
  if (segments[0] !== "teams") return null;
  const candidate = segments[1];
  return candidate && UUID_RE.test(candidate) ? candidate : null;
}

/**
 * Pull the team id out of a parsed request body, or null.
 *
 * Four routes name their target team only in the body — the copy-into-my-team
 * endpoints in platformPlays.js, playbookSections.js and shared.js (x2), all of
 * which read `req.body.teamId`.
 *
 * @param {unknown} body - `req.body` (already parsed by express.json)
 * @returns {string | null}
 */
export function extractTeamIdFromBody(body) {
  if (!body || typeof body !== "object") return null;
  const candidate = body.teamId;
  return typeof candidate === "string" && UUID_RE.test(candidate) ? candidate : null;
}

/**
 * Human-readable refusal message naming V2 as the place to go.
 *
 * @param {'v2_live'|'migrating'} status
 * @param {string} [teamName] - included when we know which team it was
 * @returns {string}
 */
export function buildBlockedMessage(status, teamName) {
  const who = teamName ? `"${teamName}"` : "This team";
  if (status === "migrating") {
    return (
      `${who} is being moved to the new Coachable right now, so changes can no longer be saved here. ` +
      `Any change made here would be lost. Please continue at ${V2_APP_URL} — you can still view everything on this page.`
    );
  }
  return (
    `${who} has moved to the new Coachable. Changes can no longer be saved here — please make them at ${V2_APP_URL}. ` +
    `You can still view everything on this page.`
  );
}

/**
 * Build the 409 JSON body. `code` is the SAME for both locked statuses so the
 * frontend interstitial only ever has to check one value; `status` carries the
 * nuance for the wording.
 *
 * @param {Object} args
 * @param {'v2_live'|'migrating'} args.status
 * @param {string|null} [args.teamId]
 * @param {string} [args.teamName]
 * @param {Array<{teamId: string, teamName: string, status: string}>} [args.teams]
 * @returns {Object}
 */
export function buildBlockedBody({ status, teamId = null, teamName, teams }) {
  const body = {
    error: buildBlockedMessage(status, teamName),
    code: MIGRATED_ERROR_CODE,
    status,
    v2Url: V2_APP_URL,
  };
  if (teamId) body.teamId = teamId;
  if (teams) body.teams = teams;
  return body;
}

/**
 * Whether the snapshot currently contains any team in a locked state.
 *
 * Pure in-memory read. While this is false — which is the entire pre-cutover
 * period — the middleware exits immediately and does nothing at all: no DB
 * query, no token verification, no behaviour change for anyone.
 *
 * @returns {boolean}
 */
function anyTeamLocked() {
  const { summary } = getSnapshotMeta();
  if (!summary) return false;
  return summary.v2_live > 0 || summary.migrating > 0;
}

// ── Middleware ───────────────────────────────────────────────────────────────

/**
 * Express middleware. Mount ONCE globally, after the body parsers and before
 * the route mounts (server/index.js). V1 has no "/api" prefix, so mutating
 * paths are top-level and a single global registration is the narrowest layer
 * that still covers all 24 route mounts.
 *
 * Never throws and never 500s a request: every failure path calls `next()`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function migrationWriteLock(req, res, next) {
  try {
    // 1. Reads are never blocked — GET/HEAD/OPTIONS and anything exotic pass.
    if (!MUTATING_METHODS.has(String(req.method || "").toUpperCase())) {
      return next();
    }

    // 2. FAIL OPEN: we have never successfully heard from V2, so we genuinely
    //    do not know anything. Allow every write rather than lock out the
    //    entire paying customer base over a failed poll.
    if (!hasEverLoaded()) return next();

    // 3. Nothing is locked yet — exit on a pure in-memory check, no DB.
    if (!anyTeamLocked()) return next();

    const pathname = pathnameOf(req.originalUrl || req.url || "/");

    // 4. Allow-listed routes stay writable no matter what.
    if (isExemptPath(pathname)) return next();

    // 5. Attributable to one specific team? That answer is synchronous and
    //    cannot throw, so it costs nothing.
    const teamId = extractTeamIdFromPath(pathname) || extractTeamIdFromBody(req.body);
    if (teamId) {
      const status = getTeamStatus(teamId);
      if (!LOCKED_STATUSES.has(status)) return next();
      console.warn(`${LOG_PREFIX} blocked ${req.method} ${pathname} (team ${teamId} is ${status})`);
      return res.status(MIGRATED_HTTP_STATUS).json(buildBlockedBody({ status, teamId }));
    }

    // 6. Not attributable to a team. Fall back to the user's memberships,
    //    resolved from V1's OWN team_memberships table (the V2 payload carries
    //    no user ids by design). Block only if EVERY team they belong to is
    //    locked — a partially migrated coach must keep using their unmoved
    //    team. 26 users belong to more than one team.
    const userId = verifySessionToken(readSessionToken(req));
    // No identifiable user: the route's own requireAuth will handle it.
    if (!userId) return next();

    return resolveByMembership(userId, req, res, next);
  } catch (err) {
    // FAIL OPEN. A bug in this middleware must never cost a coach their write.
    console.error(`${LOG_PREFIX} internal error, allowing request through:`, err?.message);
    return next();
  }
}

/**
 * Membership fallback for a write that names no team.
 *
 * Blocks only when the user has at least one team AND every one of them is in
 * a locked status. A user with zero teams is ALLOWED — "every team is locked"
 * is vacuously true for an empty list, and blocking a brand-new account with no
 * team yet would trap them in onboarding.
 *
 * @param {string} userId
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
async function resolveByMembership(userId, req, res, next) {
  let teams;
  try {
    teams = await getUserTeamStatuses(userId);
  } catch (err) {
    // FAIL OPEN — a database hiccup must not lock anyone out.
    console.error(`${LOG_PREFIX} membership lookup failed, allowing request through:`, err?.message);
    return next();
  }

  try {
    if (!teams.length) return next();
    if (!teams.every((t) => LOCKED_STATUSES.has(t.status))) return next();

    // Report the most severe status present so the wording is right.
    const status = teams.some((t) => t.status === "v2_live") ? "v2_live" : "migrating";
    const pathname = pathnameOf(req.originalUrl || req.url || "/");
    console.warn(
      `${LOG_PREFIX} blocked ${req.method} ${pathname} (all ${teams.length} of the user's teams are locked)`
    );
    return res
      .status(MIGRATED_HTTP_STATUS)
      .json(buildBlockedBody({ status, teams }));
  } catch (err) {
    console.error(`${LOG_PREFIX} internal error after membership lookup, allowing through:`, err?.message);
    return next();
  }
}

export default migrationWriteLock;
