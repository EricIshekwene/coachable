# Security Hardening Audit

**Reviewed:** June 2026  
**Scope:** v1 server (`server/`) and frontend (`src/`) — all gaps that must be addressed in v2 from day one  
**Method:** Full code read of `server/middleware/auth.js`, `server/middleware/rateLimit.js`, `server/index.js`, `server/routes/auth.js`, `server/routes/errorReports.js`, `server/routes/plays.js`, `server/lib/validate.js`, and `src/utils/api.js`; cross-referenced against `v2/engineering/audits/api-review.md`

---

## Summary Table

| # | Gap | Severity | Fix |
|---|---|---|---|
| 1 | JWT in localStorage — XSS-accessible | **High** | Cookie-only auth in v2 |
| 2 | `POST /error-reports` — unauthenticated, no rate limit | **High** | Add `requireAuth` + `mutationLimiter` |
| 3 | Auth is opt-in per route, not default-deny | **High** | Architectural: enforce in middleware chain |
| 4 | Rate limit store is in-memory — resets on crash/restart | **Medium** | Redis store before horizontal scaling |
| 5 | `playData` JSONB written with no validation | **Medium** | Schema version + size check |
| 6 | Bulk `playIds` not validated as UUIDs | **Medium** | `requireUuid` on each element |
| 7 | Path params (`teamId`, `id`) not explicitly UUID-validated | **Low** | `requireUuid` on params before DB call |
| 8 | npm audit: 10 high + 1 critical (dev deps) | **Low** | `npm audit fix` before v2 ships |
| 9 | `POST /auth/logout` has no `requireAuth` | **Low** | Add `requireAuth` |

Items already resolved in v1 and confirmed not gaps:
- `CORS_ORIGINS` — wired correctly in `server/index.js:46–48`
- Auth rate limiting — all auth routes have `authLimiter` (10/15min) and/or `emailLimiter` (10/hr)

---

## Gap 1 — JWT in localStorage (XSS-accessible)

**Severity: High**

### What v1 does

`src/utils/api.js:8` writes the JWT to `localStorage.setItem("coachable_token", token)` on every login and signup. Every `apiFetch` call reads it back and sends it as `Authorization: Bearer <token>`.

Simultaneously, `server/middleware/auth.js:17` sets an `httpOnly` cookie (`coachable_session`) on every login/signup, and `src/utils/api.js:46` sends `credentials: "include"` on every request, so the cookie also arrives at the server.

`requireAuth` accepts either. Both paths are live at the same time.

### Why this is a problem

`localStorage` is readable by any JavaScript running on the page. An XSS payload — even a tiny one from a third-party script, a misconfigured CSP, or a DOM injection bug — can steal the token and make authenticated API calls from any other origin. The httpOnly cookie is immune to this because the browser never exposes it to JavaScript.

### Fix for v2

Go **cookie-only**. The httpOnly cookie infrastructure is already built on the server side.

1. Remove `setAuthToken`, `getAuthToken`, and the `TOKEN_KEY` localStorage constant from `src/utils/api.js`.
2. Remove `Authorization: Bearer` header construction from `apiFetch`. Keep `credentials: "include"`.
3. Stop returning `{ token }` in login/signup response bodies — the cookie is sufficient.
4. `requireAuth` on the server already reads the cookie; no server changes needed.
5. Update `v2/CLAUDE.md` auth section (currently says "JWT stored in localStorage as `coachable_token`" — this is stale after the fix).

**Bonus:** once localStorage is gone, logout is complete — calling `POST /auth/logout` clears the httpOnly cookie server-side and there is no client-side token to clean up.

---

## Gap 2 — `POST /error-reports` is unauthenticated with no rate limit

**Severity: High**

### What v1 does

`server/routes/errorReports.js:11`:

```js
router.post("/", async (req, res, next) => { ... })
```

No `requireAuth`. No rate limiter. Writes directly to the `error_reports` table. The body is char-sliced but the volume is uncapped — any anonymous caller can flood the table with a tight loop.

The read (`GET /error-reports`) and delete routes are correctly guarded by `requireAdminOrStaff`, but the write route is open.

### Fix for v2

Add `requireAuth` and `mutationLimiter` (already defined in `rateLimit.js`):

```js
router.post("/", requireAuth, mutationLimiter, async (req, res, next) => { ... })
```

Error reports are submitted by logged-in users after a client error. There is no legitimate use case for anonymous submission.

---

## Gap 3 — Auth is opt-in per route, not default-deny

**Severity: High**

### What v1 does

Every route handler that requires authentication must explicitly mount `requireAuth` as middleware. A route that accidentally omits it is silently wide open — the server will happily serve it with no authentication.

This is the pattern that produced Gap 2 (`POST /error-reports`) and is flagged in `api-review.md` (Infrastructure > Middleware Problems): "Auth is per-route, not default-deny."

### Fix for v2

Two complementary mitigations:

**1. Default-deny middleware block.** Mount a catch-all `requireAuth` at the top of the route stack, then explicitly opt routes out as needed:

```js
// Opt-out list — explicitly public
const PUBLIC_PATHS = new Set([
  "GET /auth/config",
  "POST /auth/login",
  "POST /auth/signup",
  "POST /auth/logout",
  "POST /auth/forgot-password",
  "POST /auth/reset-password",
  "GET /health",
  "GET /shared/plays/*",
  // ...etc
]);

app.use((req, res, next) => {
  const key = `${req.method} ${req.route?.path ?? req.path}`;
  if (PUBLIC_PATHS.has(key)) return next();
  return requireAuth(req, res, next);
});
```

Alternatively, mount `requireAuth` at the router level for each protected route group and explicitly annotate public routes.

**2. Snyk / ESLint scan (already planned in `security-and-code-quality.md`).** `eslint-plugin-security` and Snyk Code both detect routes that call `pool.query` without upstream auth middleware. Wire these before v2 routes are written.

---

## Gap 4 — Rate limit store is in-memory

**Severity: Medium**

### What v1 does

`server/middleware/rateLimit.js` uses the default `express-rate-limit` in-memory store. The comment on line 11 already acknowledges this:

> In-memory store: fine while we run a single Railway replica. Swap to a Redis store if we ever scale horizontally.

A Railway crash or restart resets all counters — the worst case is a crash during a spam burst (which is exactly what happened in May 2026 with 70k spam signups, per the comment at the top of `rateLimit.js`).

### Fix for v2

Add Redis via Railway's Redis plugin and wire `rate-limit-redis` (or `ioredis`) as the store when `REDIS_URL` is set:

```js
import { RedisStore } from "rate-limit-redis";
const store = process.env.REDIS_URL ? new RedisStore({ client: redisClient }) : undefined;
```

This is already the right answer and is implied by the existing code comment. Do not defer past v2 launch.

---

## Gap 5 — `playData` JSONB written with no validation

**Severity: Medium**

### What v1 does

`server/routes/plays.js` on `PATCH /:teamId/plays/:id`:

```js
const playData = req.body?.playData;
// ...
if (playData !== undefined) {
  values.push(playData);
}
```

`playData` is arbitrary JSON straight into the JSONB column. A malformed canvas object can corrupt a play with no error response. There is no schema version field.

This is also flagged in `api-review.md` (Layer 2, Problem 3).

### Fix for v2

Two requirements:

1. **Schema version field.** Every `playData` object must have a top-level `v: number` field. Reject writes that omit it or use an unknown version. This enables safe forward migration as the canvas format evolves.

2. **Size guard.** The global `express.json({ limit: "10mb" })` and `bodyBoundsCheck` both exempt `/teams/` paths. Add an explicit size cap on `playData` within the route (e.g., reject if `JSON.stringify(playData).length > 500_000`).

---

## Gap 6 — Bulk `playIds` not validated as UUIDs

**Severity: Medium**

### What v1 does

`POST /:teamId/plays/bulk/delete`, `POST /:teamId/plays/bulk/move`, `POST /:teamId/plays/bulk/tags` all do:

```js
requireArray(req.body.playIds, { field: "playIds", max: 500 });
```

`requireArray` checks the array length but does not validate the format of individual elements. Non-UUID strings flow through to the DB query and generate a PostgreSQL error instead of a clean 400. Flagged in `api-review.md` (Layer 2, Problem 5).

### Fix for v2

Add per-element UUID validation after `requireArray`:

```js
const playIds = requireArray(req.body.playIds, { field: "playIds", max: 500 });
playIds.forEach((id, i) => requireUuid(id, { field: `playIds[${i}]` }));
```

---

## Gap 7 — Route path params not explicitly UUID-validated

**Severity: Low**

### What v1 does

Route params like `:teamId`, `:id`, `:userId` are passed directly to DB queries without being validated as UUIDs first. `requireTeamRole` implicitly validates `teamId` by doing a DB lookup, but a malformed param generates a PostgreSQL `invalid_text_representation` error that leaks internal error information instead of a clean 400.

### Fix for v2

Add explicit UUID validation at the top of every route handler that reads from `req.params`:

```js
const teamId = requireUuid(req.params.teamId, { field: "teamId" });
const playId = requireUuid(req.params.id, { field: "id" });
```

`requireUuid` is already in `server/lib/validate.js`. Apply it consistently as part of the route handler order: **Input → Auth → Logic → Response** (already mandated in `v2/CLAUDE.md`).

---

## Gap 8 — npm audit: 10 high + 1 critical in dev dependencies

**Severity: Low (dev deps only)**

### What v1 has

Running `npm audit --audit-level=high` from the project root returns:

- **1 critical** — `vitest >=4.0.0 <4.1.0`: Vitest UI server allows arbitrary file read and execution (GHSA-5xrq-8626-4rwp)
- **10 high** — various `vite` and `yaml` transitive dependencies

All 11 are **dev/frontend dependencies**. None are production server dependencies. The Railway-deployed server does not include `node_modules` from the root `package.json`.

`npm audit fix` resolves all of them.

### Fix for v2

Run `npm audit fix` before v2 ships. Wire `npm audit --audit-level=high` into the pre-push Husky hook (already specified in `security-and-code-quality.md`) so this never silently accumulates again.

---

## Gap 9 — `POST /auth/logout` has no `requireAuth`

**Severity: Low**

### What v1 does

`server/routes/auth.js:132`:

```js
router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
```

Any unauthenticated request returns 200 and clears a cookie that doesn't exist. Flagged in `api-review.md` (Layer 1, Problem 5) as "harmless in practice but semantically wrong."

### Fix for v2

Add `requireAuth`:

```js
router.post("/logout", requireAuth, (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
```

Once Gap 1 is fixed (cookie-only), logout clears the httpOnly cookie and there is nothing else to clean up client-side.

---

## Enforcement Rules for v2

These belong in `v2/engineering/backend-code-standards.md` as mandatory enforcement rules:

1. **Every route handler that is not on the explicit public list must have `requireAuth` in its middleware chain.** No exceptions, no "we'll add it later."
2. **Every `req.params.id` / `req.params.teamId` / any UUID param must be run through `requireUuid` before the first DB call.**
3. **Every array body field that will be used in a DB query must have per-element type validation — `requireArray` alone is not sufficient.**
4. **`playData` writes must include a `v` version field check. Reject unknown versions.**
5. **No JWT in localStorage.** Auth tokens live in httpOnly cookies only.
6. **`npm audit --audit-level=high` must pass clean before any push.** Wired in Husky pre-push hook.

---

## Cross-Reference Notes

**References:**
- `v2/engineering/audits/api-review.md` — source for Layer 2 Problem 3 (playData), Problem 5 (bulk UUID), and Layer 4 middleware gaps
- `v2/engineering/planning/infrastructure/security-and-code-quality.md` — Snyk, ESLint plugins, Husky pre-push hook; those tools enforce patterns, this doc captures architectural gaps
- `v2/engineering/backend-code-standards.md` — enforcement rules from this doc belong there as a mandatory section

**Not covered here (out of scope for this audit):**
- CSP headers — no `Content-Security-Policy` is set in v1; should be added in v2 via `helmet`
- SQL injection — parameterized queries are used consistently throughout v1; no gaps found
- HTTPS enforcement — handled by Railway; not an application-layer concern
