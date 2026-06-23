# Ops Setup — Coachable v2

Covers error monitoring (4.1), structured logging (4.2), health check (4.3), and uptime monitoring (4.4).

Sections are added as each TODO item is grilled and decided.

---

## Error monitoring

_TODO 4.1 — not yet planned._

---

## Structured logging

### Library

**pino** + **pino-http**.

pino is the standard for structured JSON logging in Node. pino-http is a one-liner Express middleware that auto-logs every request/response with timing. No hand-rolled middleware — pino handles async context, serializer safety, and redaction natively.

Install:
```bash
npm install pino pino-http
```

Wire in `server/index.js` before any route mounts:
```js
import pino from 'pino';
import pinoHttp from 'pino-http';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: [
    'req.headers.authorization',
    'req.body.password',
    'req.body.currentPassword',
    'req.body.newPassword',
    'req.body.token',
    'req.body.content',
    'req.body.keyframes',
  ],
});

app.use(pinoHttp({ logger }));
```

For child loggers inside a request (DB layer, lib functions), pass the request-scoped logger via `req.log`:
```js
req.log.info({ playId }, 'play fetched');
```

### Fields on every log line

pino-http emits these automatically on every request:

| Field | Source | Notes |
|---|---|---|
| `level` | pino | `info`, `warn`, `error` |
| `time` | pino | Unix timestamp in ms |
| `requestId` | pino-http | Auto-generated UUID; uses `x-request-id` header if present |
| `req.method` | pino-http | `GET`, `POST`, etc. |
| `req.url` | pino-http | Raw path, e.g. `/api/plays` |
| `res.statusCode` | pino-http | Response status |
| `responseTime` | pino-http | ms to complete |

Add these in auth middleware after JWT decode:
| Field | Set by | Notes |
|---|---|---|
| `userId` | `server/middleware/auth.js` | `req.log = req.log.child({ userId: req.user.id })` |
| `teamId` | `server/middleware/auth.js` | Add when team context is resolved |

**Omitted intentionally:** `ip`, `userAgent`, `hostname` — privacy noise with no debugging value at this scale.

### Fields that must never be logged

pino redacts these automatically via the `redact` config above. Never add them manually either.

| Field | Reason |
|---|---|
| `req.headers.authorization` | Raw JWT — log access → user impersonation |
| `req.body.password` / `currentPassword` / `newPassword` | Plaintext credential fields on auth routes |
| `req.body.token` | Password reset tokens, invite tokens |
| `req.body.content` | Play canvas JSONB — large blob, exposes IP |
| `req.body.keyframes` | Same as `content` |

Never enable `serializers.req.body` in pino-http — that would log the entire request body wholesale.

### Log drain

**No drain for v2.**

Railway's log view supports plain-text search only — it cannot filter on JSON fields. Structured JSON still pays off:
- Each line is valid JSON, easy to `jq`-filter locally via `railway logs | jq 'select(.res.statusCode >= 500)'`
- Consistent format from day one means wiring a drain later (Axiom, BetterStack) requires zero code changes

Revisit if the need to query across logs becomes a real operational pain point.

### LOG_LEVEL env var

Add `LOG_LEVEL` to `.env.example` with default `info`. Set to `debug` locally when needed. Never set `debug` in production — it logs internal pino internals and inflates log volume.

| Environment | Value |
|---|---|
| Local dev | `debug` (optional) or `info` |
| Railway dev | `info` |
| Railway prod | `info` |

`environment.md` must be updated to include `LOG_LEVEL` in the Variable Reference table.

---

## Health check

### Endpoint

`GET /api/health`

Returns HTTP 200 when the server is live and the DB pool is accepting queries. Returns HTTP 503 when the DB is unreachable.

### What is checked

**DB connectivity — yes.** The handler runs `SELECT 1` against the connection pool. A process-alive check alone is not enough — the server can be running and still be completely non-functional if the pool is exhausted or the connection string is wrong. DB is the only hard dependency worth checking here.

**R2 connectivity — no.** R2 is not checked. If R2 is down, core app functionality (plays, editing, rosters) still works — only GIF export and thumbnail rendering are affected. Including R2 would create false-positive health check failures (R2 blip during deploy rolls back a good build). R2 errors surface through Sentry when an actual export attempt fails.

### Response body

**On success (200):**

```json
{
  "status": "ok",
  "uptime": 432.7,
  "version": "1.0.0",
  "db": "ok",
  "dbLatencyMs": 3
}
```

| Field | Source | Purpose |
|---|---|---|
| `status` | hardcoded `"ok"` | Quick machine-readable signal |
| `uptime` | `process.uptime()` | Reveals unexpected restarts at a glance |
| `version` | `package.json` `version` field | Confirms which build is actually live |
| `db` | result of `SELECT 1` | Explicit per-dependency status |
| `dbLatencyMs` | time to complete `SELECT 1` | Canary for DB performance degradation |

**On failure (503):**

```json
{
  "status": "error",
  "db": "error"
}
```

### Railway configuration

Railway calls the health check endpoint at deploy time — not continuously. It confirms the new build is alive before routing traffic to it. If the endpoint does not return 200 within the timeout, the deploy is marked failed and the previous deployment stays active.

Configure on both `coachable-v2-dev` and `coachable-v2-prod`:

| Setting | Value |
|---|---|
| **Path** | Service Settings → Deploy → Healthcheck Path → `/api/health` |
| **Timeout** | 300 seconds (Railway default — leave as-is) |

Railway uses `healthcheck.railway.app` as the origin when pinging the endpoint. This is not a continuous liveness probe — for ongoing uptime monitoring see the uptime section (TODO 4.4).

### Implementation notes

The handler lives in `server/routes/health.js` and is mounted before auth middleware — the endpoint must be public (no JWT required).

Query the DB pool directly; do not go through any ORM or query builder. The check should be as thin as possible:

```js
await pool.query('SELECT 1');
```

Measure latency by recording `Date.now()` before and after the query.

---

## Uptime monitoring

### Tool

**UptimeRobot** (free tier).

50 monitors, 5-minute check intervals, email alerts — all free forever. No payment required, no trial expiry. Fits comfortably within the $30/month infrastructure budget.

Sign up at uptimerobot.com and create a free account.

### What to monitor

**Endpoint:** `GET /api/health`

Do not monitor the landing page — it can be served from cache or CDN even if the Node server is completely dead. `/api/health` hits the actual server process and runs a `SELECT 1` against the DB pool, so a 200 response confirms the server is alive and the database is reachable. That is the failure mode worth catching.

Monitor both services:

| Monitor name | URL |
|---|---|
| `coachable-v2-prod /api/health` | `https://<prod-domain>/api/health` |
| `coachable-v2-dev /api/health` | `https://<dev-domain>/api/health` |

### Check interval

**5 minutes** (UptimeRobot free tier maximum). Combined with near-instant email delivery, worst-case time-to-know is ~5–6 minutes from the moment the server stops responding.

### Alert routing

**Email only.** Alert goes to the primary account email (`ishekwene.1@osu.edu`). No SMS — unnecessary complexity and cost at this scale.

UptimeRobot sends:
- **Down alert** — immediately when the check fails (server does not return 200)
- **Up alert** — when the server recovers

### Setup steps

1. Create a free UptimeRobot account at uptimerobot.com
2. Add monitor → type: **HTTP(s)** → URL: `https://<prod-domain>/api/health`
3. Set friendly name: `coachable-v2-prod`
4. Check interval: **5 minutes**
5. Alert contacts: add your email address
6. Repeat for `coachable-v2-dev`

### Relationship to Railway health check

Railway's health check (configured in TODO 4.3) runs only at deploy time — it confirms a new build is alive before routing traffic. It does not run continuously after deploy. UptimeRobot is the continuous liveness probe that catches post-deploy outages, DB connection drops, and process crashes.
