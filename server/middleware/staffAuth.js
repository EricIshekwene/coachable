/**
 * staffAuth.js
 *
 * Authentication + permission middleware for the scoped staff-admin tier.
 * See STAFF_ADMIN_PLAN.md for the full design.
 *
 * Auth modes recognised here:
 *   - "legacy_admin" — the shared-password admin session (resolved via
 *     hasValidAdminSession from routes/admin.js). Treated as owner-equivalent.
 *   - "owner_jwt"   — a regular user JWT whose userId matches OWNER_USER_ID.
 *   - "staff"       — a regular user JWT whose userId has an accepted,
 *                     non-revoked row in staff_admins.
 *
 * Owner-equivalent actors (legacy_admin, owner_jwt) get `isOwner: true` and
 * `permissions: null`, which is a sentinel meaning "skip permission checks."
 * Staff actors carry the JSONB permissions blob from the DB.
 */

import pool from "../db/pool.js";
import { readSessionToken, verifySessionToken } from "./auth.js";
import { hasValidAdminSession } from "../routes/admin.js";

/**
 * Read the configured owner user id from env. Returns null if unset.
 * Reading lazily (per-call) rather than caching at module load so that
 * tests can override `process.env.OWNER_USER_ID` without re-importing.
 * @returns {string | null}
 */
export function getOwnerUserId() {
  const v = process.env.OWNER_USER_ID;
  return v && v.trim() ? v.trim() : null;
}

/**
 * Is the given user id the configured owner?
 * False if OWNER_USER_ID is unset, or if userId is falsy.
 * @param {string | null | undefined} userId
 * @returns {boolean}
 */
export function isOwner(userId) {
  if (!userId) return false;
  const owner = getOwnerUserId();
  return !!owner && owner === userId;
}

/**
 * Identify the actor on a request without throwing. Returns the actor
 * descriptor or null if no recognised auth is present. Does NOT check
 * staff_admins membership — that's the job of `requireAdminOrStaff` in PR 2.
 *
 * @param {import('express').Request} req
 * @returns {null | { authMode: "legacy_admin" | "owner_jwt", userId: string | null, isOwner: true }}
 */
export function resolveOwnerActor(req) {
  if (hasValidAdminSession(req)) {
    return {
      authMode: "legacy_admin",
      userId: getOwnerUserId(),
      isOwner: true,
    };
  }
  const token = readSessionToken(req);
  const userId = verifySessionToken(token);
  if (userId && isOwner(userId)) {
    return { authMode: "owner_jwt", userId, isOwner: true };
  }
  return null;
}

/**
 * Express middleware: accepts the request only if the actor is the owner —
 * either via the legacy admin password session or a regular user JWT whose
 * id matches OWNER_USER_ID. Attaches `req.actor` for downstream audit logging.
 *
 * Responses:
 *   - 503 if OWNER_USER_ID env var is not configured (and no legacy admin
 *     session is present). This makes mis-deployment loud rather than silent.
 *   - 401 if no valid auth is presented.
 *
 * @type {import('express').RequestHandler}
 */
export function requireOwnerOrLegacyAdmin(req, res, next) {
  // Legacy admin path bypasses the OWNER_USER_ID requirement (it's the
  // break-glass: works even if OWNER_USER_ID is unset).
  if (hasValidAdminSession(req)) {
    req.actor = {
      authMode: "legacy_admin",
      userId: getOwnerUserId(),
      isOwner: true,
    };
    return next();
  }

  if (!getOwnerUserId()) {
    return res.status(503).json({
      error: "Owner not configured. Set OWNER_USER_ID env var.",
    });
  }

  const token = readSessionToken(req);
  const userId = verifySessionToken(token);
  if (userId && isOwner(userId)) {
    req.actor = { authMode: "owner_jwt", userId, isOwner: true };
    return next();
  }

  return res.status(401).json({ error: "Owner authentication required" });
}

// ── Permission resolution helpers ────────────────────────────────────────────

/**
 * Walk a dotted path into a permissions JSON blob.
 * Returns `undefined` if any segment is missing.
 * @param {object | null | undefined} perms
 * @param {string} path - e.g. "users.viewEmails"
 * @returns {unknown}
 */
export function getPermissionAtPath(perms, path) {
  if (!perms || typeof perms !== "object") return undefined;
  const segments = path.split(".");
  let cursor = perms;
  for (const seg of segments) {
    if (cursor == null || typeof cursor !== "object") return undefined;
    cursor = cursor[seg];
  }
  return cursor;
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function clonePermissionValue(value) {
  if (Array.isArray(value)) return value.map(clonePermissionValue);
  if (isPlainObject(value)) {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = clonePermissionValue(child);
    }
    return out;
  }
  return value;
}

/**
 * Deep-merge a role permission blob with a per-person override blob.
 * Objects merge recursively. Arrays and scalars replace the base value.
 * This lets a role define the default access while the staff row or invite
 * can explicitly add or remove permissions on top.
 *
 * @param {object | null | undefined} rolePermissions
 * @param {object | null | undefined} overrides
 * @returns {object}
 */
export function mergeStaffPermissions(rolePermissions, overrides) {
  const base = isPlainObject(rolePermissions) ? clonePermissionValue(rolePermissions) : {};
  if (!isPlainObject(overrides)) return base;
  for (const [key, value] of Object.entries(overrides)) {
    if (isPlainObject(value) && isPlainObject(base[key])) {
      base[key] = mergeStaffPermissions(base[key], value);
    } else if (isPlainObject(value)) {
      base[key] = clonePermissionValue(value);
    } else if (Array.isArray(value)) {
      base[key] = value.map(clonePermissionValue);
    } else {
      base[key] = value;
    }
  }
  return base;
}

/**
 * Check whether the actor has a boolean permission.
 * Owner short-circuits to true.
 * @param {{ isOwner: boolean, permissions: object | null }} actor
 * @param {string} path
 * @returns {boolean}
 */
export function actorHasPerm(actor, path) {
  if (!actor) return false;
  if (actor.isOwner) return true;
  return getPermissionAtPath(actor.permissions, path) === true;
}

/**
 * Check whether the actor has access to a sport for a sport-scoped permission.
 * The permission value can be an array of sport keys, or the string "*".
 * Owner short-circuits to true.
 * @param {{ isOwner: boolean, permissions: object | null }} actor
 * @param {string} permPath - e.g. "plays.sportScope"
 * @param {string} sport
 * @returns {boolean}
 */
export function actorHasSportScope(actor, permPath, sport) {
  if (!actor) return false;
  if (actor.isOwner) return true;
  const scope = getPermissionAtPath(actor.permissions, permPath);
  if (scope === "*") return true;
  if (!Array.isArray(scope)) return false;
  // Case-insensitive: DB stores capitalized sport names ("Rugby"); UI
  // grants lowercase ("rugby"). Normalize both sides before comparing.
  const target = String(sport ?? "").trim().toLowerCase();
  if (!target) return false;
  return scope.some((s) => String(s ?? "").trim().toLowerCase() === target);
}

// ── Actor resolution (full: legacy_admin | owner_jwt | staff) ────────────────

/**
 * Look up the active staff_admins row for a given userId, or null.
 * "Active" = accepted_at IS NOT NULL AND revoked_at IS NULL.
 * @param {string} userId
 * @returns {Promise<{
 *   roleId: string | null,
 *   roleName: string | null,
 *   roleDescription: string | null,
 *   rolePermissions: object,
 *   permissionOverrides: object,
 *   permissions: object,
 * } | null>}
 */
async function loadActiveStaffRow(userId) {
  const { rows } = await pool.query(
    `SELECT
       sa.role_id,
       sa.permissions,
       sar.name AS role_name,
       sar.description AS role_description,
       sar.permissions AS role_permissions
      FROM staff_admins sa
      LEFT JOIN staff_admin_roles sar ON sar.id = sa.role_id
     WHERE sa.user_id = $1 AND sa.accepted_at IS NOT NULL AND sa.revoked_at IS NULL`,
    [userId]
  );
  if (!rows.length) return null;
  const overrides = isPlainObject(rows[0].permissions) ? rows[0].permissions : {};
  const rolePermissions = isPlainObject(rows[0].role_permissions) ? rows[0].role_permissions : {};
  return {
    roleId: rows[0].role_id || null,
    roleName: rows[0].role_name || null,
    roleDescription: rows[0].role_description || null,
    rolePermissions,
    permissionOverrides: overrides,
    permissions: mergeStaffPermissions(rolePermissions, overrides),
  };
}

/**
 * Resolve the actor purely from the JWT path — used by `/staff/session` so
 * that a stale admin session header (left over from a same-browser /admin
 * login) cannot make a staff JWT look like the owner. Returns null if no
 * recognised JWT actor is present.
 *
 * @param {import('express').Request} req
 * @returns {Promise<null | {
 *   authMode: "owner_jwt" | "staff",
 *   userId: string,
 *   isOwner: boolean,
 *   permissions: object | null
 * }>}
 */
export async function resolveJwtActor(req) {
  const token = readSessionToken(req);
  const userId = verifySessionToken(token);
  if (!userId) return null;
  if (isOwner(userId)) {
    return { authMode: "owner_jwt", userId, isOwner: true, permissions: null };
  }
  const staffRow = await loadActiveStaffRow(userId);
  if (!staffRow) return null;
  return {
    authMode: "staff",
    userId,
    isOwner: false,
    roleId: staffRow.roleId,
    roleName: staffRow.roleName,
    roleDescription: staffRow.roleDescription,
    rolePermissions: staffRow.rolePermissions,
    permissionOverrides: staffRow.permissionOverrides,
    permissions: staffRow.permissions,
  };
}

/**
 * Resolve the actor for `requireAdminOrStaff`. Returns null if no recognised
 * auth is present (caller emits 401).
 * @param {import('express').Request} req
 * @returns {Promise<null | {
 *   authMode: "legacy_admin" | "owner_jwt" | "staff",
 *   userId: string | null,
 *   isOwner: boolean,
 *   permissions: object | null
 * }>}
 */
export async function resolveActor(req) {
  if (hasValidAdminSession(req)) {
    return {
      authMode: "legacy_admin",
      userId: getOwnerUserId(),
      isOwner: true,
      permissions: null,
    };
  }
  const token = readSessionToken(req);
  const userId = verifySessionToken(token);
  if (!userId) return null;

  if (isOwner(userId)) {
    return { authMode: "owner_jwt", userId, isOwner: true, permissions: null };
  }

  const staffRow = await loadActiveStaffRow(userId);
  if (!staffRow) return null;
  return {
    authMode: "staff",
    userId,
    isOwner: false,
    roleId: staffRow.roleId,
    roleName: staffRow.roleName,
    roleDescription: staffRow.roleDescription,
    rolePermissions: staffRow.rolePermissions,
    permissionOverrides: staffRow.permissionOverrides,
    permissions: staffRow.permissions,
  };
}

/**
 * Express middleware: accepts legacy admin sessions, owner JWTs, and staff
 * JWTs (with an active staff_admins row). Attaches `req.actor`.
 *
 * 401 if no recognised auth is present.
 *
 * @type {import('express').RequestHandler}
 */
export async function requireAdminOrStaff(req, res, next) {
  try {
    const actor = await resolveActor(req);
    if (!actor) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.actor = actor;
    next();
  } catch (err) {
    next(err);
  }
}

// ── Permission gates ─────────────────────────────────────────────────────────

/**
 * Factory: middleware that requires the actor has a specific boolean permission.
 * Must be mounted AFTER `requireAdminOrStaff`. Owner short-circuits.
 *
 * @param {string} path - dotted permission key, e.g. "users.viewTable"
 * @returns {import('express').RequestHandler}
 */
export function requirePerm(path) {
  return function permGate(req, res, next) {
    if (!req.actor) {
      return res.status(500).json({ error: "Permission check before auth" });
    }
    if (actorHasPerm(req.actor, path)) return next();
    return res
      .status(403)
      .json({ error: "Forbidden", missingPermission: path });
  };
}

/**
 * Returns true if the actor created the given resource (compares
 * `createdBy` against the actor's user id). Owner short-circuits.
 *
 * @param {{ isOwner: boolean, userId: string | null }} actor
 * @param {string | null | undefined} createdBy
 * @returns {boolean}
 */
export function actorOwnsResource(actor, createdBy) {
  if (!actor) return false;
  if (actor.isOwner) return true;
  if (!createdBy || !actor.userId) return false;
  return createdBy === actor.userId;
}

/**
 * Returns true if the actor may modify the resource — either because they
 * created it (always allowed), they are the owner, or they hold the
 * specified permission for editing/deleting others' resources.
 *
 * @param {{ isOwner: boolean, userId: string | null, permissions: object | null }} actor
 * @param {string | null | undefined} createdBy
 * @param {string} permPath
 */
export function actorCanModify(actor, createdBy, permPath) {
  if (!actor) return false;
  if (actor.isOwner) return true;
  if (actorOwnsResource(actor, createdBy)) return true;
  return actorHasPerm(actor, permPath);
}

/**
 * Factory: middleware that requires the actor has at least one of the listed
 * permissions. Useful for endpoints that accept multiple kinds of edits
 * (e.g. PATCH /admin/plays/:id which can rename, retag, or edit content —
 * the route handler then validates per-field).
 *
 * @param {string[]} paths
 * @returns {import('express').RequestHandler}
 */
export function requireAnyPerm(paths) {
  return function anyPermGate(req, res, next) {
    if (!req.actor) {
      return res.status(500).json({ error: "Permission check before auth" });
    }
    if (req.actor.isOwner) return next();
    for (const p of paths) {
      if (actorHasPerm(req.actor, p)) return next();
    }
    return res
      .status(403)
      .json({ error: "Forbidden", missingAnyOf: paths });
  };
}

/**
 * Factory: middleware that requires the actor's sport-scoped permission
 * includes the sport resolved from the request. Must be mounted AFTER
 * `requireAdminOrStaff`. Owner short-circuits.
 *
 * @param {string} permPath - e.g. "plays.sportScope"
 * @param {(req: import('express').Request) => string | Promise<string | null>} [resolveSport]
 *   - Optional resolver. Defaults to reading `req.params.sport`.
 * @returns {import('express').RequestHandler}
 */
export function requireSportScope(
  permPath,
  resolveSport = (req) => req.params?.sport
) {
  return async function sportScopeGate(req, res, next) {
    try {
      if (!req.actor) {
        return res.status(500).json({ error: "Permission check before auth" });
      }
      if (req.actor.isOwner) return next();
      const sport = await resolveSport(req);
      if (!sport) {
        return res.status(400).json({ error: "Could not resolve sport" });
      }
      if (actorHasSportScope(req.actor, permPath, sport)) return next();
      return res.status(403).json({
        error: "Forbidden",
        missingSportScope: permPath,
        sport,
      });
    } catch (err) {
      next(err);
    }
  };
}

// ── Response redaction ───────────────────────────────────────────────────────

/**
 * Default mask helpers. The fieldMap entry's `mask` field selects one of
 * these, or a custom function `(value, row, fieldName) => maskedValue`.
 */
function getDefaultMasks() {
  return {
    email: (value) => {
      if (!value || typeof value !== "string") return value;
      const [local, domain] = value.split("@");
      if (!domain || !local) return "[redacted]";
      return `${local[0] || "a"}*****@${domain}`;
    },
    username: () => "Hidden user",
    remove: () => null,
  };
}

function resolveMask(maskSpec) {
  const defaultMasks = getDefaultMasks();
  if (typeof maskSpec === "function") return maskSpec;
  if (typeof maskSpec === "string" && defaultMasks[maskSpec]) {
    return defaultMasks[maskSpec];
  }
  return () => "[redacted]";
}

/**
 * Factory: response transformer that masks fields whose permission the
 * actor doesn't have. Owner skips redaction. Walks the JSON payload at the
 * top level (object or array of objects). Nested object trees are not
 * traversed — pass an explicit map for nested paths in a future iteration
 * if we need it.
 *
 * @example
 *   router.get("/users",
 *     requireAdminOrStaff,
 *     requirePerm("users.viewTable"),
 *     redactByPerm({
 *       email:    { perm: "users.viewEmails",    mask: "email" },
 *       username: { perm: "users.viewUsernames", mask: "username" },
 *     }),
 *     handler);
 *
 * @param {Record<string, { perm: string, mask?: string | Function }>} fieldMap
 * @returns {import('express').RequestHandler}
 */
export function redactByPerm(fieldMap) {
  const entries = Object.entries(fieldMap).map(([field, spec]) => ({
    field,
    perm: spec.perm,
    mask: resolveMask(spec.mask),
  }));

  return function redactMiddleware(req, res, next) {
    if (!req.actor || req.actor.isOwner) return next();

    const denied = entries.filter((e) => !actorHasPerm(req.actor, e.perm));
    if (!denied.length) return next();

    const originalJson = res.json.bind(res);
    res.json = function patchedJson(payload) {
      const apply = (row) => {
        if (!row || typeof row !== "object") return row;
        for (const { field, mask } of denied) {
          if (Object.prototype.hasOwnProperty.call(row, field)) {
            row[field] = mask(row[field], row, field);
          }
        }
        for (const value of Object.values(row)) {
          if (Array.isArray(value)) {
            value.forEach(apply);
          } else if (value && typeof value === "object") {
            apply(value);
          }
        }
        return row;
      };
      if (Array.isArray(payload)) payload.forEach(apply);
      else apply(payload);
      return originalJson(payload);
    };

    next();
  };
}

// ── Audit log ────────────────────────────────────────────────────────────────

/**
 * Insert a mutation row into admin_audit_log. Never throws — audit failures
 * are logged to stderr but do not block the request. Call from inside route
 * handlers after the mutation succeeds (and ideally after `res.json`).
 *
 * @param {import('express').Request} req - must have `req.actor` set
 * @param {string} action - e.g. "play.delete", "user.editStatus"
 * @param {{ targetType?: string, targetId?: string, metadata?: object }} [opts]
 * @returns {Promise<void>}
 */
export async function writeAudit(req, action, opts = {}) {
  const actor = req?.actor;
  if (!actor) {
    console.error("writeAudit called without req.actor; action:", action);
    return;
  }
  try {
    await pool.query(
      `INSERT INTO admin_audit_log
        (actor_auth_mode, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        actor.authMode,
        actor.userId,
        action,
        opts.targetType ?? null,
        opts.targetId != null ? String(opts.targetId) : null,
        opts.metadata ?? {},
      ]
    );
  } catch (err) {
    console.error("writeAudit failed:", err.message, { action });
  }
}
