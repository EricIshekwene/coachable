/**
 * Rate-limit presets used across the API. Added 2026-05-27 after a burst
 * of ~70k spam signups exposed the lack of throttling on /auth/signup.
 *
 * Tiers (per IP):
 *   - authLimiter:     auth endpoints (signup/login/forgot/reset/verify) — 10 / 15 min
 *   - emailLimiter:    routes that trigger outbound email — 10 / hour
 *   - mutationLimiter: POST/PUT/PATCH/DELETE — 120 / min
 *   - readLimiter:     GET — 600 / min
 *
 * In-memory store: fine while we run a single Railway replica. Swap to a
 * Redis store if we ever scale horizontally.
 */
import rateLimit from "express-rate-limit";

const DISABLED = process.env.DISABLE_RATE_LIMIT === "true";

function build({ name, windowMs, max, message }) {
  // No custom keyGenerator — the library default already keys on the client IP
  // and handles IPv6 normalization safely (a custom `req.ip` key trips
  // ERR_ERL_KEY_GEN_IPV6 in express-rate-limit v8).
  return rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => DISABLED,
    handler: (req, res /* , next, options */) => {
      console.warn(`[rate-limit:${name}]`, { ip: req.ip, path: req.originalUrl });
      res.status(429).json({ error: message });
    },
  });
}

export const authLimiter = build({
  name: "auth",
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many attempts. Please try again in a few minutes.",
});

export const emailLimiter = build({
  name: "email",
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many requests. Please try again later.",
});

export const mutationLimiter = build({
  name: "mutation",
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many requests. Please slow down.",
});

export const readLimiter = build({
  name: "read",
  windowMs: 60 * 1000,
  max: 600,
  message: "Too many requests. Please slow down.",
});

/**
 * Method-based router: applies readLimiter to GET/HEAD, mutationLimiter to
 * everything else. Mount globally; per-route limiters (auth, email) override
 * this when mounted before the route handler.
 */
export function methodAwareLimiter(req, res, next) {
  if (DISABLED) return next();
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return readLimiter(req, res, next);
  }
  return mutationLimiter(req, res, next);
}
