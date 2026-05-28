/**
 * Lightweight input validation helpers. Used by route handlers to enforce
 * type, length, and format on user-supplied fields. Throws `ValidationError`
 * (HTTP 400) on failure so the existing error middleware can serialize it.
 *
 * Conventions:
 *   - "string" helpers trim by default; pass `{ trim: false }` to disable.
 *   - Pass `field` so the error tells the client which input was bad.
 *   - Functions throw on invalid input. Optional-* variants return undefined
 *     when the value is null/undefined/empty.
 *
 * Field length constants live at the top of this file. Bumping a limit means
 * editing the constant in one place and (if the column is a TEXT-with-CHECK)
 * the schema CHECK.
 */

export const LIMITS = {
  NAME: 80,                  // user / team / play / folder display name
  EMAIL: 254,                // RFC 5321 SMTP path limit
  PASSWORD_MIN: 6,
  PASSWORD_MAX: 256,         // bcrypt truncates at 72 bytes; allow long input but cap
  TITLE: 200,                // play title, folder name, broadcast subject
  TAG: 40,                   // play tag label
  SHORT_TEXT: 200,           // generic short field (assignment, position, etc.)
  MEDIUM_TEXT: 2000,         // descriptions, summaries
  LONG_TEXT: 10000,          // issue reports, broadcast bodies
  URL: 2048,                 // standard URL cap
  CODE: 12,                  // 6-digit verification codes, invite codes
  ENUM_KEY: 64,              // role names, sport keys, etc.
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URL_RE = /^https?:\/\/[^\s]+$/i;
const SLUG_RE = /^[a-z0-9][a-z0-9-_]*$/i;

export class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "ValidationError";
    this.status = 400;
    this.field = field;
  }
}

function fail(field, message) {
  throw new ValidationError(field, `${field}: ${message}`);
}

/**
 * Returns a trimmed string after enforcing length bounds.
 * @param {unknown} value
 * @param {{ field: string, max?: number, min?: number, trim?: boolean }} opts
 */
export function requireString(value, { field, max = LIMITS.SHORT_TEXT, min = 1, trim = true }) {
  if (typeof value !== "string") fail(field, "must be a string");
  const v = trim ? value.trim() : value;
  if (v.length < min) fail(field, `must be at least ${min} character${min === 1 ? "" : "s"}`);
  if (v.length > max) fail(field, `must be at most ${max} characters`);
  return v;
}

/** Same as requireString but returns undefined for null/undefined/empty. */
export function optionalString(value, { field, max = LIMITS.SHORT_TEXT, trim = true } = {}) {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") fail(field, "must be a string");
  const v = trim ? value.trim() : value;
  if (v.length === 0) return undefined;
  if (v.length > max) fail(field, `must be at most ${max} characters`);
  return v;
}

/**
 * Returns a normalized (lowercased, trimmed) email after format + length check.
 */
export function requireEmail(value, { field = "email" } = {}) {
  if (typeof value !== "string") fail(field, "must be a string");
  const v = value.trim().toLowerCase();
  if (v.length === 0) fail(field, "is required");
  if (v.length > LIMITS.EMAIL) fail(field, `must be at most ${LIMITS.EMAIL} characters`);
  if (!EMAIL_RE.test(v)) fail(field, "is not a valid email");
  return v;
}

export function optionalEmail(value, opts = {}) {
  if (value === null || value === undefined || value === "") return undefined;
  return requireEmail(value, opts);
}

/**
 * Enforces password length bounds. Does NOT inspect content (allow anything
 * the user wants inside the bounds; bcrypt handles hashing).
 */
export function requirePassword(value, { field = "password" } = {}) {
  if (typeof value !== "string") fail(field, "must be a string");
  if (value.length < LIMITS.PASSWORD_MIN) fail(field, `must be at least ${LIMITS.PASSWORD_MIN} characters`);
  if (value.length > LIMITS.PASSWORD_MAX) fail(field, `must be at most ${LIMITS.PASSWORD_MAX} characters`);
  return value;
}

/** Throws unless value is a syntactically valid UUID v1–v5. */
export function requireUuid(value, { field }) {
  if (typeof value !== "string" || !UUID_RE.test(value)) fail(field, "must be a valid id");
  return value;
}

export function optionalUuid(value, { field }) {
  if (value === null || value === undefined || value === "") return undefined;
  return requireUuid(value, { field });
}

/** Throws unless value is one of the allowed enum entries. */
export function requireEnum(value, allowed, { field }) {
  if (!allowed.includes(value)) fail(field, `must be one of: ${allowed.join(", ")}`);
  return value;
}

export function optionalEnum(value, allowed, { field }) {
  if (value === null || value === undefined || value === "") return undefined;
  return requireEnum(value, allowed, { field });
}

/**
 * Coerces to an integer within bounds. Accepts numeric strings.
 */
export function requireInt(value, { field, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER }) {
  const n = typeof value === "number" ? value : Number.parseInt(value, 10);
  if (!Number.isInteger(n)) fail(field, "must be an integer");
  if (n < min) fail(field, `must be >= ${min}`);
  if (n > max) fail(field, `must be <= ${max}`);
  return n;
}

export function optionalInt(value, opts) {
  if (value === null || value === undefined || value === "") return undefined;
  return requireInt(value, opts);
}

/** Throws unless value is a boolean (true/false). */
export function requireBoolean(value, { field }) {
  if (typeof value !== "boolean") fail(field, "must be true or false");
  return value;
}

export function optionalBoolean(value, opts) {
  if (value === null || value === undefined) return undefined;
  return requireBoolean(value, opts);
}

/** Returns trimmed URL after http(s) + length check. */
export function requireUrl(value, { field, max = LIMITS.URL }) {
  if (typeof value !== "string") fail(field, "must be a string");
  const v = value.trim();
  if (v.length === 0) fail(field, "is required");
  if (v.length > max) fail(field, `must be at most ${max} characters`);
  if (!URL_RE.test(v)) fail(field, "must be a valid http(s) URL");
  return v;
}

export function optionalUrl(value, opts) {
  if (value === null || value === undefined || value === "") return undefined;
  return requireUrl(value, opts);
}

/** Throws unless value is an array bounded by maxItems. */
export function requireArray(value, { field, max = 1000, min = 0 }) {
  if (!Array.isArray(value)) fail(field, "must be an array");
  if (value.length < min) fail(field, `must have at least ${min} items`);
  if (value.length > max) fail(field, `must have at most ${max} items`);
  return value;
}

/** Returns a trimmed slug (a–z, 0–9, dash, underscore). */
export function requireSlug(value, { field, max = LIMITS.ENUM_KEY }) {
  if (typeof value !== "string") fail(field, "must be a string");
  const v = value.trim();
  if (v.length === 0) fail(field, "is required");
  if (v.length > max) fail(field, `must be at most ${max} characters`);
  if (!SLUG_RE.test(v)) fail(field, "may only contain letters, numbers, dash, and underscore");
  return v;
}

/** Returns a digit-only string of fixed length (e.g. for OTP codes). */
export function requireCode(value, { field = "code", length = 6 } = {}) {
  if (typeof value !== "string") fail(field, "must be a string");
  const v = value.trim();
  if (v.length !== length || !/^\d+$/.test(v)) fail(field, `must be a ${length}-digit code`);
  return v;
}
