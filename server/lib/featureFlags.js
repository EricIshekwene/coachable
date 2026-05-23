/**
 * Feature flag evaluation engine.
 *
 * Resolves which flags are enabled for a given authenticated user.
 * All rules on a flag must match (AND semantics). An empty rules array
 * means the flag is on for everyone (when globally enabled).
 *
 * Rule types:
 *   sport              - user must be on a team whose sport matches one of the values
 *   team_role          - user must hold one of the specified roles on any team
 *   user_type          - "onboarded" | "registered"
 *   rollout_percentage - sticky hash(userId:flagName) % 100 < value
 *   geolocation        - IP-based country + optional state/region filter
 */

import crypto from "crypto";
import geoip from "geoip-lite";
import pool from "../db/pool.js";

/**
 * Deterministically bucket a user into 0-99 for a given flag.
 * Uses SHA-256 so the same user always lands in the same bucket for each flag.
 * @param {string} userId
 * @param {string} flagName
 * @returns {number} integer in [0, 99]
 */
function stickySample(userId, flagName) {
  const hash = crypto
    .createHash("sha256")
    .update(`${userId}:${flagName}`)
    .digest("hex");
  return parseInt(hash.slice(0, 8), 16) % 100;
}

/**
 * Build the user context object needed for rule evaluation.
 * @param {string} userId
 * @param {string|null} ip - client IP address
 * @returns {Promise<{roles: string[], sports: string[], userType: string, country: string|null, region: string|null}>}
 */
async function buildUserContext(userId, ip) {
  const [membershipRes, userRes] = await Promise.all([
    pool.query(
      `SELECT DISTINCT tm.role, t.sport
         FROM team_memberships tm
         JOIN teams t ON t.id = tm.team_id
        WHERE tm.user_id = $1 AND t.deleted_at IS NULL`,
      [userId]
    ),
    pool.query(`SELECT onboarded_at FROM users WHERE id = $1`, [userId]),
  ]);

  const roles = [...new Set(membershipRes.rows.map((r) => r.role).filter(Boolean))];
  const sports = [...new Set(membershipRes.rows.map((r) => r.sport).filter(Boolean))];

  const user = userRes.rows[0];
  const userType = user?.onboarded_at ? "onboarded" : "registered";

  // Strip port and IPv6 loopback so geoip-lite can parse the address
  const rawIp = (ip || "")
    .replace(/^::ffff:/, "")
    .replace(/:\d+$/, "")
    .split(",")[0]
    .trim();

  const geo = geoip.lookup(rawIp) || {};

  return {
    roles,
    sports,
    userType,
    country: geo.country || null,
    region: geo.region || null,
  };
}

/**
 * Evaluate a single rule against the user context.
 * @param {object} rule
 * @param {object} ctx - from buildUserContext
 * @param {string} userId
 * @param {string} flagName
 * @returns {boolean}
 */
function evaluateRule(rule, ctx, userId, flagName) {
  switch (rule.type) {
    case "sport":
      return Array.isArray(rule.values) && rule.values.some((v) => ctx.sports.includes(v));

    case "team_role":
      return Array.isArray(rule.roles) && rule.roles.some((r) => ctx.roles.includes(r));

    case "user_type":
      return Array.isArray(rule.values) && rule.values.includes(ctx.userType);

    case "rollout_percentage": {
      const pct = typeof rule.value === "number" ? rule.value : 0;
      return stickySample(userId, flagName) < pct;
    }

    case "geolocation": {
      const countries = rule.countries || [];
      const states = rule.states || [];
      const countryOk = countries.length === 0 || countries.includes(ctx.country);
      const stateOk = states.length === 0 || states.includes(ctx.region);
      return countryOk && stateOk;
    }

    default:
      // Unknown rule type — fail closed (deny)
      return false;
  }
}

/**
 * Resolve all feature flags for an authenticated user.
 * Returns a plain object mapping flag name → boolean.
 * Unauthenticated callers (userId = null) receive all flags as false.
 *
 * @param {string|null} userId
 * @param {string|null} ip - client IP, used for geolocation rules
 * @returns {Promise<Record<string, boolean>>}
 */
export async function resolveFlags(userId, ip) {
  const { rows: flags } = await pool.query(
    `SELECT id, name, enabled, rules FROM feature_flags ORDER BY name`
  );

  if (!userId) {
    return Object.fromEntries(flags.map((f) => [f.name, false]));
  }

  const ctx = await buildUserContext(userId, ip);

  const result = {};
  for (const flag of flags) {
    if (!flag.enabled) {
      result[flag.name] = false;
      continue;
    }
    const rules = Array.isArray(flag.rules) ? flag.rules : [];
    if (rules.length === 0) {
      // No targeting rules → flag is on for every authenticated user
      result[flag.name] = true;
    } else {
      result[flag.name] = rules.every((rule) =>
        evaluateRule(rule, ctx, userId, flag.name)
      );
    }
  }

  return result;
}

/**
 * Resolve a single named flag for a user. Convenience wrapper.
 * @param {string} flagName
 * @param {string|null} userId
 * @param {string|null} ip
 * @returns {Promise<boolean>}
 */
export async function resolveFlag(flagName, userId, ip) {
  const flags = await resolveFlags(userId, ip);
  return flags[flagName] ?? false;
}
