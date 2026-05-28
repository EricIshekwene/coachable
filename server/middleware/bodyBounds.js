/**
 * Global guard against absurdly large body fields. Express's `json({ limit })`
 * caps the whole payload, but a single 9 MB string field still slips through.
 * This middleware walks the parsed body and rejects if any string exceeds
 * MAX_STRING_BYTES, any array exceeds MAX_ARRAY_LEN, or the structure exceeds
 * MAX_DEPTH. Catches the "one giant field" class of abuse without forcing
 * every route to validate every field by hand.
 */

const MAX_STRING_BYTES = 64 * 1024;  // 64 KB per individual string
const MAX_ARRAY_LEN = 10_000;
const MAX_OBJECT_KEYS = 500;
const MAX_DEPTH = 12;

// Some routes legitimately carry larger payloads (playData blobs, broadcast
// HTML bodies, base64 thumbnails). They bypass the per-string cap.
const PATH_PREFIX_EXEMPTIONS = [
  "/teams/",                  // play data, thumbnails
  "/platform-plays",          // play data
  "/admin/email",             // broadcast HTML bodies
  "/admin/notifications",     // notification bodies
  "/admin/plays",             // admin play data
  "/admin/prefab-presets",    // prefab payloads
  "/admin/presets",           // sport preset payloads
  "/sport-presets",           // sport preset payloads
  "/sport-prefab-presets",
  "/prefabs",
  "/playbook-sections",
  "/page-sections",
  "/demo-videos",             // GIF/video data
  "/error-reports",           // already slice-truncates internally
];

function isExempt(req) {
  const url = req.originalUrl || req.url || "";
  for (const p of PATH_PREFIX_EXEMPTIONS) {
    if (url.startsWith(p)) return true;
  }
  return false;
}

function walk(value, depth) {
  if (depth > MAX_DEPTH) {
    return "request body is nested too deeply";
  }
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    if (Buffer.byteLength(value, "utf8") > MAX_STRING_BYTES) {
      return `a string field exceeds the ${MAX_STRING_BYTES}-byte limit`;
    }
    return null;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_LEN) {
      return `an array field exceeds ${MAX_ARRAY_LEN} items`;
    }
    for (const item of value) {
      const err = walk(item, depth + 1);
      if (err) return err;
    }
    return null;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length > MAX_OBJECT_KEYS) {
      return `an object field has more than ${MAX_OBJECT_KEYS} keys`;
    }
    for (const k of keys) {
      const err = walk(value[k], depth + 1);
      if (err) return err;
    }
    return null;
  }
  return null;
}

/**
 * Express middleware. Skips paths in PATH_PREFIX_EXEMPTIONS so legitimate
 * large payloads (play data, broadcast bodies) still work.
 */
export function bodyBoundsCheck(req, res, next) {
  if (!req.body || typeof req.body !== "object") return next();
  if (isExempt(req)) return next();
  const err = walk(req.body, 0);
  if (err) {
    return res.status(400).json({ error: `Invalid request body: ${err}` });
  }
  next();
}
