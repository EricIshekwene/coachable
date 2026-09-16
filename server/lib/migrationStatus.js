/**
 * Migration-status cache — V1's read-only view of "which teams have moved to V2".
 *
 * V1 polls V2's internal endpoint on a fixed interval and holds the answer in
 * memory. NOTHING on a user request path ever makes an HTTP call to V2, so a
 * slow or dead V2 can never make V1 slow.
 *
 * Failure policy — FAIL TO LAST-KNOWN-GOOD, NEVER TO OPEN:
 *   A failed poll (network error, timeout, non-200, bad shape, unrecognised
 *   contractVersion) leaves the previous successful snapshot completely
 *   untouched. A team that is `v2_live` never flips back to `v1_only` because
 *   V2 was unreachable. Only when NO successful fetch has ever happened does
 *   the cache answer `v1_only` for everything — and callers can detect that
 *   case explicitly via `hasEverLoaded()`.
 *
 * Identity boundary:
 *   The V2 payload deliberately carries no member user ids, so V2 staff
 *   identity never leaks into V1. User -> team resolution is done LOCALLY
 *   against V1's own `team_memberships` table via `getUserTeams()`.
 *
 * Env vars (neither is set by this module; both are read at poll time):
 *   V2_MIGRATION_CRON_SECRET - V2's CRON_SECRET. Required. Never logged.
 *   V2_BASE_URL              - defaults to https://beta.coachableplays.com
 *
 * Importing this module does NOT start polling. `startMigrationStatusPolling()`
 * must be called explicitly (server/index.js does it at boot).
 *
 * See MIGRATION_STATUS_CACHE.md in this folder.
 */

// ── Constants ────────────────────────────────────────────────────────────────

/** How often the snapshot is refreshed from V2. */
export const POLL_INTERVAL_MS = 60_000;

/** Hard ceiling on a single poll's HTTP request, so a hung V2 can't pile up. */
export const FETCH_TIMEOUT_MS = 10_000;

/** A snapshot older than this is considered stale and is logged loudly. */
export const STALENESS_THRESHOLD_MS = 15 * 60 * 1000;

/** Throttle for the repeated "snapshot is stale" error so it can't flood logs. */
const STALE_LOG_INTERVAL_MS = 10 * 60 * 1000;

/** Throttle for the repeated "secret missing" error. */
const MISSING_SECRET_LOG_INTERVAL_MS = 10 * 60 * 1000;

/** The only contract version this build understands. Anything else is refused. */
export const SUPPORTED_CONTRACT_VERSION = 1;

/** Production V2 origin. Never default to the bare apex — that is V1 itself. */
export const DEFAULT_V2_BASE_URL = "https://beta.coachableplays.com";

/** Path of V2's internal status endpoint. */
export const MIGRATION_STATUS_PATH = "/api/internal/migration-status";

/** The three legal team statuses. */
export const MIGRATION_STATUSES = ["v1_only", "migrating", "v2_live"];

/** The answer for a team V2 has never heard of (and for "never loaded"). */
export const DEFAULT_STATUS = "v1_only";

/** Log prefix so these lines are greppable in Railway logs. */
const LOG_PREFIX = "[migration-status]";

// ── In-memory state ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} TeamStatusRow
 * @property {string} teamId
 * @property {string} teamName
 * @property {'v1_only'|'migrating'|'v2_live'} status
 * @property {string|null} previousStatus
 * @property {string|null} rolledBackAt
 * @property {string|null} updatedAt
 */

/**
 * @typedef {Object} Snapshot
 * @property {number} contractVersion
 * @property {string|null} generatedAt
 * @property {{v1_only: number, migrating: number, v2_live: number, total: number}} summary
 * @property {Map<string, TeamStatusRow>} byTeamId
 * @property {TeamStatusRow[]} teams
 */

/** @type {Snapshot|null} - null means NO successful fetch has ever happened. */
let snapshot = null;

/** @type {number|null} - Date.now() of the last successful refresh. */
let lastSuccessAt = null;

/** @type {ReturnType<typeof setInterval>|null} */
let pollTimer = null;

let lastStaleLogAt = 0;
let lastMissingSecretLogAt = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Absolute URL of V2's migration-status endpoint.
 * Reads V2_BASE_URL at call time so a rehearsal can point at a stub.
 * @returns {string}
 */
function statusUrl() {
  const base = (process.env.V2_BASE_URL || DEFAULT_V2_BASE_URL).replace(/\/+$/, "");
  return `${base}${MIGRATION_STATUS_PATH}`;
}

/**
 * Coerce one `summary.*` value into a safe non-negative integer count.
 *
 * The summary only feeds `getSnapshotMeta()` diagnostics — it never decides a
 * team's status — so a malformed/non-numeric value is normalised to 0 rather
 * than rejecting the whole payload and throwing away good per-team data.
 *
 * @param {unknown} value
 * @returns {number}
 */
function countOf(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

/**
 * Validate a raw V2 payload and convert it into a Snapshot.
 *
 * `contractVersion` is checked FIRST — an unrecognised version is refused
 * outright rather than guessed at, because the shape below it may have changed.
 *
 * @param {unknown} payload - parsed JSON body from V2
 * @returns {{ ok: true, snapshot: Snapshot } | { ok: false, reason: string }}
 */
export function parseMigrationStatusPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "payload is not an object" };
  }

  // Contract version FIRST — never inspect the rest of an unknown shape.
  const version = payload.contractVersion;
  if (version !== SUPPORTED_CONTRACT_VERSION) {
    return {
      ok: false,
      reason: `unrecognised contractVersion ${JSON.stringify(version)} (this build understands ${SUPPORTED_CONTRACT_VERSION})`,
    };
  }

  if (!Array.isArray(payload.teams)) {
    return { ok: false, reason: "teams is not an array" };
  }
  const s = payload.summary;
  if (!s || typeof s !== "object") {
    return { ok: false, reason: "summary is missing" };
  }

  const byTeamId = new Map();
  const teams = [];
  for (const row of payload.teams) {
    if (!row || typeof row !== "object") {
      return { ok: false, reason: "teams contains a non-object row" };
    }
    const teamId = row.teamId;
    if (typeof teamId !== "string" || !teamId) {
      return { ok: false, reason: "a team row is missing teamId" };
    }
    if (!MIGRATION_STATUSES.includes(row.status)) {
      return { ok: false, reason: `team row has unknown status ${JSON.stringify(row.status)}` };
    }
    const parsed = {
      teamId,
      teamName: typeof row.teamName === "string" ? row.teamName : "",
      status: row.status,
      previousStatus: row.previousStatus ?? null,
      rolledBackAt: row.rolledBackAt ?? null,
      updatedAt: row.updatedAt ?? null,
    };
    byTeamId.set(teamId, parsed);
    teams.push(parsed);
  }

  return {
    ok: true,
    snapshot: {
      contractVersion: version,
      generatedAt: typeof payload.generatedAt === "string" ? payload.generatedAt : null,
      // V2 zero-fills every state, so these keys are always present; countOf()
      // is belt-and-braces against a malformed or non-numeric summary.
      summary: {
        v1_only: countOf(s.v1_only),
        migrating: countOf(s.migrating),
        v2_live: countOf(s.v2_live),
        total: countOf(s.total),
      },
      byTeamId,
      teams,
    },
  };
}

/**
 * Commit a validated payload as the new snapshot.
 *
 * Exported for tests and for a future admin-triggered manual refresh. A payload
 * that fails validation is REJECTED and the previous snapshot is left intact.
 *
 * @param {unknown} payload - raw parsed JSON from V2
 * @returns {{ ok: boolean, reason?: string }}
 */
export function ingestMigrationStatusPayload(payload) {
  const parsed = parseMigrationStatusPayload(payload);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  snapshot = parsed.snapshot;
  lastSuccessAt = Date.now();
  lastStaleLogAt = 0;
  return { ok: true };
}

/**
 * Log loudly if the snapshot has aged past STALENESS_THRESHOLD_MS.
 * A cache that quietly stopped updating is the failure mode that loses data,
 * so this is console.error, not console.warn. Throttled so it can't flood.
 */
function warnIfStale() {
  if (lastSuccessAt === null) return; // "never loaded" is reported elsewhere
  const ageMs = Date.now() - lastSuccessAt;
  if (ageMs < STALENESS_THRESHOLD_MS) return;
  if (Date.now() - lastStaleLogAt < STALE_LOG_INTERVAL_MS) return;
  lastStaleLogAt = Date.now();
  console.error(
    `${LOG_PREFIX} STALE: snapshot has not refreshed for ${Math.round(ageMs / 1000)}s ` +
      `(threshold ${Math.round(STALENESS_THRESHOLD_MS / 1000)}s). Still serving the last known good data.`
  );
}

/**
 * Staleness check for the read path.
 *
 * `warnIfStale()` is otherwise only reachable from a poll, so an interval that
 * silently stopped firing would never raise the alarm — reads are the only
 * thing still happening in that state. Guarded on an active poll timer: a
 * deliberately stopped poller, or a process that never started one, is not an
 * anomaly worth logging.
 */
function noteStaleOnRead() {
  if (pollTimer === null) return;
  warnIfStale();
}

// ── Polling ──────────────────────────────────────────────────────────────────

/**
 * Run one poll against V2. Never throws — every failure path logs and returns.
 *
 * On ANY failure the previous snapshot is left exactly as it was.
 *
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function pollMigrationStatusOnce() {
  const secret = process.env.V2_MIGRATION_CRON_SECRET;
  if (!secret) {
    if (Date.now() - lastMissingSecretLogAt >= MISSING_SECRET_LOG_INTERVAL_MS) {
      lastMissingSecretLogAt = Date.now();
      console.error(
        `${LOG_PREFIX} MISCONFIGURED: environment variable V2_MIGRATION_CRON_SECRET is not set. ` +
          `Migration status CANNOT be fetched from V2; the cache stays in its "never loaded" state ` +
          `and every team reads as "${DEFAULT_STATUS}". Set V2_MIGRATION_CRON_SECRET to V2's CRON_SECRET.`
      );
    }
    // A secret rotated away at runtime must not silence the staleness alarm.
    warnIfStale();
    return { ok: false, reason: "missing V2_MIGRATION_CRON_SECRET" };
  }

  const url = statusUrl();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "x-cron-secret": secret, Accept: "application/json" },
      signal: ac.signal,
    });

    if (res.status === 401 || res.status === 403) {
      // Distinct from "endpoint down" on purpose: a wrong secret must never be
      // mistaken for "all teams are still on v1".
      console.error(
        `${LOG_PREFIX} AUTH FAILURE: V2 rejected the migration-status request with HTTP ${res.status} at ${url}. ` +
          `This is a WRONG/STALE V2_MIGRATION_CRON_SECRET, not an outage. Migration status is NOT being updated.`
      );
      warnIfStale();
      return { ok: false, reason: `auth ${res.status}` };
    }

    if (!res.ok) {
      console.error(
        `${LOG_PREFIX} FETCH FAILED: HTTP ${res.status} from ${url}. Keeping last known good snapshot.`
      );
      warnIfStale();
      return { ok: false, reason: `HTTP ${res.status}` };
    }

    let body;
    try {
      body = await res.json();
    } catch (err) {
      console.error(
        `${LOG_PREFIX} FETCH FAILED: response from ${url} was not valid JSON (${err.message}). Keeping last known good snapshot.`
      );
      warnIfStale();
      return { ok: false, reason: "invalid JSON" };
    }

    const result = ingestMigrationStatusPayload(body);
    if (!result.ok) {
      console.error(
        `${LOG_PREFIX} CONTRACT REJECTED: ${result.reason}. Keeping last known good snapshot — refusing to guess at the shape.`
      );
      warnIfStale();
      return result;
    }
    return { ok: true };
  } catch (err) {
    const reason = err.name === "AbortError" ? `timeout after ${FETCH_TIMEOUT_MS}ms` : err.message;
    console.error(
      `${LOG_PREFIX} FETCH FAILED: ${reason} for ${url}. Keeping last known good snapshot.`
    );
    warnIfStale();
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Start the background poll: one immediate refresh, then every POLL_INTERVAL_MS.
 *
 * Safe to call twice — a second call is a no-op while a timer is already
 * running. Called from server/index.js at boot; importing this module alone
 * starts nothing, so tests can import it freely.
 *
 * @returns {() => void} the same stop function as `stopMigrationStatusPolling`
 */
export function startMigrationStatusPolling() {
  if (pollTimer) return stopMigrationStatusPolling;

  const hasSecret = Boolean(process.env.V2_MIGRATION_CRON_SECRET);
  if (!hasSecret) {
    console.error(
      `${LOG_PREFIX} MISCONFIGURED: environment variable V2_MIGRATION_CRON_SECRET is not set at boot. ` +
        `Migration status CANNOT be fetched from V2. V1 will keep running normally, but the cache stays ` +
        `in its "never loaded" state until the variable is set and the service restarts.`
    );
  }

  const run = () => {
    // Evaluate staleness on the tick itself, not only on a poll failure, so a
    // snapshot that has quietly stopped refreshing is always reported.
    warnIfStale();
    pollMigrationStatusOnce().catch((err) => {
      // pollMigrationStatusOnce never throws, but never let a timer kill boot.
      console.error(`${LOG_PREFIX} poll runner error:`, err.message);
    });
  };

  run(); // immediate first poll at boot
  pollTimer = setInterval(run, POLL_INTERVAL_MS);
  if (typeof pollTimer.unref === "function") pollTimer.unref();
  if (hasSecret) {
    console.log(
      `${LOG_PREFIX} polling ${statusUrl()} every ${POLL_INTERVAL_MS / 1000}s (timeout ${FETCH_TIMEOUT_MS / 1000}s).`
    );
  } else {
    // Never print a reassuring "polling ..." line when no poll can be issued.
    console.error(
      `${LOG_PREFIX} NOT polling ${statusUrl()}: V2_MIGRATION_CRON_SECRET is unset, so every scheduled ` +
        `poll will be skipped and the cache stays in its "never loaded" state.`
    );
  }
  return stopMigrationStatusPolling;
}

/**
 * Stop the background poll. Used for clean shutdown and by tests.
 * Does NOT clear the snapshot.
 */
export function stopMigrationStatusPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/**
 * Drop the cache back to its "never loaded" state. Test-only helper.
 * Do not call this from request paths — it would flip every team to v1_only.
 */
export function resetMigrationStatusCache() {
  snapshot = null;
  lastSuccessAt = null;
  lastStaleLogAt = 0;
  lastMissingSecretLogAt = 0;
}

// ── Internal read API (this is what Tasks 2 and 3 call) ──────────────────────

/**
 * Whether a successful fetch has EVER happened in this process.
 *
 * Callers that must distinguish "V2 says this team is still on v1" from
 * "we have never managed to ask V2" MUST check this — `getTeamStatus()`
 * returns 'v1_only' in both cases.
 *
 * @returns {boolean}
 */
export function hasEverLoaded() {
  return snapshot !== null;
}

/**
 * Status of a single team. Synchronous, memory-only, never hits the network.
 * A team absent from the snapshot (and any team while the cache has never
 * loaded) is 'v1_only'.
 *
 * @param {string} teamId
 * @returns {'v1_only'|'migrating'|'v2_live'}
 */
export function getTeamStatus(teamId) {
  noteStaleOnRead();
  if (!snapshot || !teamId) return DEFAULT_STATUS;
  return snapshot.byTeamId.get(teamId)?.status || DEFAULT_STATUS;
}

/**
 * Return a status only when this process holds a current, contract-validated
 * row for the requested team. This deliberately does not reuse getTeamStatus:
 * its v1_only default is appropriate for ordinary availability routing but is
 * unsafe for admission decisions.
 *
 * @param {string} teamId
 * @returns {'v1_only'|'migrating'|'v2_live'|null}
 */
export function getFreshValidatedTeamStatus(teamId) {
  noteStaleOnRead();
  if (!snapshot || lastSuccessAt === null || Date.now() - lastSuccessAt >= STALENESS_THRESHOLD_MS) return null;
  return snapshot.byTeamId.get(teamId)?.status ?? null;
}

/**
 * Every team the user belongs to in V1, with its migration status.
 *
 * Team membership and team names come from V1's OWN `team_memberships` /
 * `teams` tables (via `getUserTeams`) — never from the V2 payload, which
 * carries no user ids by design.
 *
 * Lets a partially-migrated coach be shown exactly which team moved and which
 * did not.
 *
 * @param {string} userId
 * @returns {Promise<Array<{teamId: string, teamName: string, status: 'v1_only'|'migrating'|'v2_live'}>>}
 */
export async function getUserTeamStatuses(userId) {
  if (!userId) return [];
  // Lazy import keeps this module importable (and testable) without pulling in
  // the pg pool — same pattern as middleware/auth.js requireTeamRole.
  const { getUserTeams } = await import("./userTeams.js");
  const teams = await getUserTeams(userId);
  return teams.map((t) => ({
    teamId: t.teamId,
    teamName: t.teamName,
    status: getTeamStatus(t.teamId),
  }));
}

/**
 * Whether ANY team the user belongs to has fully moved to V2.
 *
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function userHasV2LiveTeam(userId) {
  const statuses = await getUserTeamStatuses(userId);
  return statuses.some((t) => t.status === "v2_live");
}

/**
 * Diagnostic metadata about the cache itself. Contains NO secret and no user
 * ids — safe to log or expose on an admin surface.
 *
 * @returns {{
 *   hasEverLoaded: boolean,
 *   lastSuccessAt: string|null,
 *   ageMs: number|null,
 *   isStale: boolean,
 *   summary: {v1_only: number, migrating: number, v2_live: number, total: number}|null,
 *   contractVersion: number|null
 * }}
 */
export function getSnapshotMeta() {
  noteStaleOnRead();
  const ageMs = lastSuccessAt === null ? null : Date.now() - lastSuccessAt;
  return {
    hasEverLoaded: snapshot !== null,
    lastSuccessAt: lastSuccessAt === null ? null : new Date(lastSuccessAt).toISOString(),
    ageMs,
    // Never loaded counts as stale: it is definitively not fresh data.
    isStale: ageMs === null ? true : ageMs >= STALENESS_THRESHOLD_MS,
    summary: snapshot ? { ...snapshot.summary } : null,
    contractVersion: snapshot ? snapshot.contractVersion : null,
  };
}
