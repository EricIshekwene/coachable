# Backend Code Standards

**Status:** Authoritative source for backend code conventions.  
**Scope:** All Node.js/Express source files. Does not cover API design (routes, response shapes) — that belongs in a separate API standards doc.  
**Coachable-specific rules:** Deferred — this doc is general-first.

---

## 01. File Anatomy

Every file follows this top-to-bottom order, with a blank line between each group:

```
1. Built-in Node modules
2. Third-party modules
3. Local absolute imports
4. Local relative imports
5. Module-level constants
6. Module body (functions, classes, route handlers)
7. Exports
```

```js
// 1. Built-in
import path from 'path';

// 2. Third-party
import express from 'express';
import jwt from 'jsonwebtoken';

// 3. Local absolute
import { db } from '@/db/pool';

// 4. Local relative
import { validateTeamInput } from './validators';

// 5. Constants
const ROUTER = express.Router();
const TOKEN_EXPIRY = '7d';
```

No blank lines within an import group. One blank line between groups.

---

## 02. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Variable / function | camelCase | `fetchTeam`, `teamCount` |
| Class | PascalCase | `AuthService` |
| Module-level constant | UPPER_SNAKE_CASE | `TOKEN_EXPIRY` |
| Route file | kebab-case, plural resource | `teams.js`, `play-templates.js` |
| Middleware file | camelCase, descriptive | `requireAuth.js`, `validateBody.js` |
| Database query function | camelCase verb + noun | `getTeamById`, `insertPlay` |
| Boolean variable | camelCase, `is/has/can` prefix | `isExpired`, `hasAccess` |

---

## 03. Async / Await

- **`async/await` everywhere.** No raw `.then()/.catch()` chains, no callbacks.
- **Never fire-and-forget** — every async call must be awaited or have an explicit error path.
- **Try/catch at the route handler level,** not buried inside helpers. Helpers throw; handlers catch.

```js
// Good — handler owns the catch
async function getTeam(req, res, next) {
  try {
    const team = await fetchTeamById(req.params.id);
    res.json(team);
  } catch (err) {
    next(err);
  }
}

// Avoid — silent swallow
async function getTeam(req, res) {
  const team = await fetchTeamById(req.params.id).catch(() => null);
  res.json(team);
}
```

---

## 04. Route Handler Anatomy

Inside every route handler, order is fixed:

```
1. Extract and validate input (params, body, query)
2. Authorization check
3. Business logic / database calls
4. Send response
```

```js
async function updateTeamName(req, res, next) {
  // 1. Input
  const { id } = req.params;
  const { name } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // 2. Authorization
  if (!req.user.teamIds.includes(id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // 3. Business logic
  try {
    const team = await db.updateTeamName(id, name.trim());

    // 4. Response
    res.json(team);
  } catch (err) {
    next(err);
  }
}
```

Keep handlers thin. If the business logic block grows past ~15 lines, extract it into a service function.

---

## 05. Error Handling

- **Always call `next(err)`** for unhandled errors — never `res.json({ error: ... })` inside a catch unless you're returning a known, intentional client error.
- **Never swallow errors silently** — no empty catch blocks.
- **Throw plain `Error` objects** from helpers and services with a clear message. Do not throw response objects.
- **Operational errors vs programmer errors:** operational errors (bad input, not found, forbidden) get a specific HTTP status and message. Programmer errors (null pointer, unexpected state) propagate to the global error handler.

```js
// Operational error — return a response
if (!team) return res.status(404).json({ error: 'Team not found' });

// Programmer error — let it propagate
const result = await db.insertPlay(payload); // throws on failure
```

---

## 06. SQL and Database Access

- **Parameterized queries only.** Never concatenate user input into a query string.
- **Query functions live in dedicated db/ files,** one file per resource (`db/teams.js`, `db/plays.js`).
- **Name query functions** with a verb: `getTeamById`, `insertPlay`, `updatePlayName`, `deleteTeam`.
- Keep SQL readable — break long queries across lines, align keywords.

```js
// Good
async function getTeamById(id) {
  const { rows } = await pool.query(
    `SELECT id, name, sport, created_at
       FROM teams
      WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

// Never
const result = await pool.query(`SELECT * FROM teams WHERE id = '${id}'`);
```

---

## 07. Constants and Magic Values

- **No inline magic numbers or strings.** Extract to a named constant.
- Module-level constants go above the module body, below imports.
- Constants shared across files go in a dedicated `constants/` or `config/` file.

```js
// Avoid
if (token.length < 32) ...
const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;

// Prefer
const MIN_TOKEN_LENGTH = 32;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
```

---

## 08. What Never Goes in a File

- Commented-out code — delete it, git remembers.
- `console.log` / `console.error` in committed code unless behind an explicit `isDev` guard or part of a structured logger.
- Credentials, secrets, or connection strings — always from environment variables.
- Hardcoded user IDs, team IDs, or any production data values.
- `// TODO` / `// FIXME` comments — file a ticket instead.

---

## 09. Exports

- **Named exports** from all modules — no `module.exports = function ...` default-style patterns when using ESM.
- Export the router as a named export from route files: `export { ROUTER as teamsRouter }`.
- One primary concern per file — if a file exports more than 4–5 things, split it.

---

## 10. Comments

Only write a comment when the **why** is non-obvious. Never describe what the code does.

```js
// Correct: explains a non-obvious security constraint
// Expire old sessions first to prevent token reuse during the rotation window
await invalidateUserSessions(userId);
const token = await issueToken(userId);

// Wrong: restates the code
// invalidate sessions then issue token
await invalidateUserSessions(userId);
const token = await issueToken(userId);
```

---

## 11. Testing

All backend code must follow the testing standards defined in `server-testing-standards.md`.

**Location:** `v2/engineering/planning/testing/server-testing-standards.md`

For the full standard — test structure, what to test per route, database interaction patterns, and CI integration — read that doc directly.

---

## 12. Input Validation and Error Responses

### Server-side validation

All inputs must be validated on the server regardless of what the client sent. Client-side validation is a UX layer — it is not a trust boundary. Treat every incoming request as potentially malformed.

- Validate at the top of the route handler before any auth check or database call.
- Check presence, type, length, and format for every field the route uses.
- If validation fails, respond immediately with `400` and a structured error body — do not proceed further.

```js
async function createTeam(req, res, next) {
  const { name, sport } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', field: 'name', message: 'Name is required' });
  }
  if (name.length > 64) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', field: 'name', message: 'Name must be 64 characters or fewer' });
  }
  if (!VALID_SPORTS.includes(sport)) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', field: 'sport', message: 'Invalid sport' });
  }

  // validation passed — proceed
}
```

---

### Status codes

Always return the status code that accurately describes what happened. The frontend maps codes to user-facing messages — it can only do this correctly if the code is accurate.

| Situation | Status |
|---|---|
| Invalid or missing input | `400 Bad Request` |
| Missing or invalid auth token | `401 Unauthorized` |
| Valid auth, insufficient permission | `403 Forbidden` |
| Resource not found | `404 Not Found` |
| Conflict with existing data (e.g. duplicate name) | `409 Conflict` |
| Semantically invalid input that passed format checks | `422 Unprocessable Entity` |
| Unexpected server error | `500 Internal Server Error` |

Never send `200` for an error. Never send `500` for a client mistake.

---

### Error response shape

Every error response follows the same JSON shape so the frontend can handle it consistently:

```json
{
  "code": "TEAM_NAME_TAKEN",
  "field": "name",
  "message": "A team with this name already exists"
}
```

- `code` — a stable machine-readable string the frontend maps to a user-facing alias. Use SCREAMING_SNAKE_CASE. Never change a code value once it is in use — the frontend depends on it.
- `field` — the input field responsible, if applicable. Omit for errors not tied to a specific field.
- `message` — a developer-readable description. This is for logs and debugging, not for display in the UI.

Never include stack traces, SQL errors, file paths, or internal service details in a response body.

---

### Logging

Log enough context at the server level that any error can be diagnosed without reproducing it:

- Route and HTTP method
- A safe summary of the input (never log passwords, tokens, or PII)
- User ID or session ID if the request is authenticated
- The full error object including stack trace — to the server log, never to the response

```js
console.error('[POST /teams] createTeam failed', {
  userId: req.user?.id,
  input: { name: req.body.name, sport: req.body.sport },
  error: err.message,
  stack: err.stack,
});
```

---

## Quick Reference

| Rule | Decision |
|---|---|
| Async style | `async/await` only — no `.then()` chains, no callbacks |
| Error propagation | Helpers throw; route handlers catch and call `next(err)` |
| Silent catch | Never |
| SQL | Parameterized queries only — never string interpolation |
| Query functions | Live in `db/` files, named with a verb |
| Route handler order | Input → auth → logic → response |
| Module-level constants | UPPER_SNAKE_CASE |
| Secrets / credentials | Environment variables only |
| `console.log` | Never in committed code |
| Commented-out code | Delete it |
| Comment style | Why only, never what |
| File naming — routes | kebab-case plural resource |
| File naming — middleware | camelCase descriptive |
| Default exports | Avoid — use named exports |
| Server-side validation | Always validate — client validation is not a trust boundary |
| Status codes | Always accurate — never `200` for errors, never `500` for client mistakes |
| Error response shape | `{ code, field?, message }` — stable `code` string, no internal details |
| Logging | Route + safe input summary + user ID + full error/stack to server log |

---

## Cross-Reference Notes

**References:** `engineering/planning/testing/server-testing-standards.md`

No inconsistencies.
