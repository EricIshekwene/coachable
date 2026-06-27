# v2 TODO — Upgrade Initiative List

v2 is a complete rebuild in a new repo. Both `server/` and `src/` are
written from scratch. The only thing ported from v1 is the Slate canvas
editor. The v1 repo stays live and untouched as prod until v2 is ready
to cut over.

Each item is a major workstream. Work top to bottom. Items within a group
can run in parallel; groups generally depend on the ones above them.

Each item contains a `/grill-me` prompt. Paste the entire prompt block
into a new Claude session. The questions listed are a starting point —
Claude should ask as many additional questions as needed until the doc
can be written without any open questions remaining.

---

## Status key

```
✅ Done       — initiative complete, doc exists, decisions made
⚠️  In progress — started, core decisions made, execution underway
❌ Not started
```

---

## Group 1 — Foundation

Everything downstream assumes these exist.

### 1.1 — Design token and color system ✅

Deciding the complete token set every component and page will reference.
Token decisions are documented in `design/color-semantics.md` and
`design/general-formatting-standards.md`. The `--ui-*` semantic layer is
the standard; Brand primitives stay in `@theme` as reference only.

**Done looks like:** `docs/v2/design/color-semantics.md` exists in the new repo
and `src/index.css` has the complete `--ui-*` token set matching it. No `BrandX`
classes used directly in components — only `--ui-*` vars.

---

### 1.2 — Initialize new repo ✅

Creating the new repo and establishing the starting structure. The v1 repo
is untouched — this is a fresh GitHub repo for Coachable v2.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Confirm `v2/engineering/planning/architecture/proposed-file-structure.md` is fully actionable, then fill any gaps so the repo can be scaffolded from it without open questions.

**Background:** Coachable v2 is a complete rebuild in a new GitHub repo. `src/` and `server/` are built from scratch. Only `src/slate/` is ported from v1. The file structure doc describes the target layout, but we need to confirm every setup decision is captured — root config files, package managers, entry points, and monorepo structure.

**Related docs:**
- `v2/engineering/planning/architecture/proposed-file-structure.md` — target layout for the new repo
- `v2/engineering/planning/infrastructure/security-and-code-quality.md` — CI config files that must exist from day one
- `v2/v2.md` — confirms only `src/slate/` is ported, docs move to `docs/v2/`

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until you have everything required to update the doc with zero open questions remaining. Then update `v2/engineering/planning/architecture/proposed-file-structure.md`.

1. Root `package.json` handles frontend (Vite/React) and `server/package.json` handles Node — is that the split, or is there a workspace setup?
2. Are there any config files from v1 (`eslint.config.js`, `tailwind.config.js`, `vite.config.js`) that carry over unchanged, or are all rebuilt fresh?
3. What's the Node version target for v2 server — same as v1 or upgrading?
4. Are there any v1 `src/` utilities outside of `src/slate/` that should be copied wholesale rather than rebuilt?
5. Is there anything in the v1 `package.json` that should explicitly NOT carry over to v2?
```

**Done looks like:** New repo exists on GitHub. `src/slate/` is present and working. `src/ui/index.js` barrel exists. All other folders scaffolded but empty. `App.jsx` and `main.jsx` scaffolded with lazy imports. Server runs with `node server/index.js` and returns a health check on `/api/health`.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 1.3 — CI/CD pipeline ✅

Wiring pre-push hooks (Husky), GitHub Actions (lint + test on every push),
Dependabot, Secret Scanning, and Snyk. Plan is finalized in
`v2/engineering/planning/infrastructure/security-and-code-quality.md`.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Confirm all open decisions in `v2/engineering/planning/infrastructure/security-and-code-quality.md` are resolved, then add an ordered setup checklist so CI can be wired in one sitting.

**Background:** Coachable v2 is built in a new GitHub repo. The CI plan is largely documented in `security-and-code-quality.md` but some execution steps require one-time setup (Railway secrets, GitHub settings) that aren't yet captured as a step-by-step guide.

**Related docs:**
- `v2/engineering/planning/infrastructure/security-and-code-quality.md` — full CI plan: Husky, GitHub Actions, Dependabot, Secret Scanning, Snyk, ESLint plugins
- `v2/environment.md` — env vars including `CI_ADMIN_HASH` (must exist before CI is wired)

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until you have everything required to write a complete, actionable setup checklist. Then add it to `v2/engineering/planning/infrastructure/security-and-code-quality.md`.

1. Has `npm test` ever passed cleanly in the v1 repo? Husky pre-push requires a green test suite before it can be wired — what's the starting state?
2. Does the server have its own `package.json`, or is it a single root install?
3. Is the `ADMIN_HASH` value already set in Railway, or does it need to be generated fresh for v2?
4. Snyk requires connecting the GitHub repo at snyk.io — has that account been created, or is this a first-time signup?
5. Are there any ESLint plugins already installed in v1 that carry over, or is the ESLint config rebuilt from scratch in v2?
```

**Done looks like:** Husky installed, `.husky/pre-push` committed, `.github/workflows/ci.yml` committed, `.github/dependabot.yml` committed, Secret Scanning enabled in GitHub settings, Snyk wired as GitHub Action, ESLint plugins added to config.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 1.4 — Environment and secrets management ✅

Defining and documenting how secrets move between dev, production, and any
future staging environment.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/environment.md`

**Background:** Coachable v2 is a complete rebuild in a new GitHub repo. Both `server/` and `src/` are built from scratch. The goal of this doc is to enumerate every env var the server needs, which environment it belongs to, and how to rotate it — so a new contributor can get from zero to a running local server in under 30 minutes.

**Related docs:**
- `v2/engineering/planning/infrastructure/security-and-code-quality.md` — references `CI_ADMIN_HASH`, `JWT_SECRET`, `DATABASE_URL` as CI secrets
- `v2/v2.md` — confirms v2 uses two Railway environments: `coachable-v2-dev` and `coachable-v2-prod`, each with its own PostgreSQL DB

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until you have a complete env var inventory with no gaps. Then write `v2/environment.md`.

1. What env vars are set in the Railway production dashboard right now? List them all if you can.
2. Is there a `.env.example` in the repo, or is the full var list tribal knowledge?
3. If `JWT_SECRET` is rotated, every logged-in user gets signed out immediately. Is that acceptable, or do you want a grace period with two valid secrets?
4. R2 credentials — does dev use the real production bucket, or a separate dev bucket?
5. `RESEND_API_KEY` — does dev send real emails, or is there a separate dev key?
6. Walk me through how a new developer gets from zero to a running local server today.
```

**Done looks like:** `v2/environment.md` documents every env var, which environment it belongs to, and how to rotate it. A new contributor can get the app running locally in under 30 minutes by following it.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 1.5 — CLAUDE.md and docs index ✅

Writing `CLAUDE.md` as an AI navigation index for the new repo.
Creating `docs/INDEX.md` as a master table of every doc with a one-line description.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/CLAUDE.md` — the template for the root `CLAUDE.md` in the new repo.

**Background:** In the v2 new repo, `CLAUDE.md` sits at the root and tells Claude (and any AI assistant) where every domain of the codebase lives. A cold Claude session that reads only `CLAUDE.md` should be able to navigate the repo confidently without asking where things are. This is the single most important doc for AI-assisted development.

**Related docs:**
- `v2/engineering/planning/architecture/proposed-file-structure.md` — the file structure `CLAUDE.md` will describe
- `v2/engineering/planning/infrastructure/security-and-code-quality.md` — §AI-friendliness section contains a draft `CLAUDE.md` example to build from
- `v2/engineering/backend-code-standards.md` and `v2/engineering/frontend-code-standards.md` — code rules CLAUDE.md should either include or reference

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until you have everything required to write a complete CLAUDE.md. Then write `v2/CLAUDE.md`.

1. If a cold Claude session reads only CLAUDE.md, what are the 5 most critical things it needs to know to be immediately useful — auth system location, route location, play editor boundary, etc.?
2. Should CLAUDE.md include code rules inline (JSDoc requirement, test co-location) or just point to `docs/v2/engineering/` docs?
3. Should `docs/INDEX.md` be grouped by domain (design, engineering, features) or flat alphabetical?
4. Are there any hard "never do this" rules important enough to put in CLAUDE.md itself — e.g. "never import from src/slate/ outside of src/slate/"?
```

**Done looks like:** `CLAUDE.md` exists at the root of the new repo and tells an AI assistant where every domain of the codebase lives and how the auth system works in under one page. `docs/INDEX.md` exists and lists every doc with a one-line description.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 1.6 — Railway setup for v2 repo ✅

Connecting the new repo to Railway so builds are automatic and the app
runs in a hosted environment during development.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/engineering/planning/infrastructure/railway-setup.md`

**Background:** Coachable v2 is a new GitHub repo with a new Railway project — completely separate from the v1 `resplendent-inspiration` project. The new project needs two services (`coachable-v2-dev` and `coachable-v2-prod`) each with their own PostgreSQL DB. The v1 Railway project stays live until cutover. This doc captures every Railway configuration decision so the setup can be done in one sitting.

**Related docs:**
- `v2/environment.md` — all env vars that must be set in Railway after services are created
- `v2/v2.md` — confirms two Railway environments for v2, v1 stays live until cutover
- `v2/engineering/planning/infrastructure/security-and-code-quality.md` — CI auto-deploys from Railway on push to `main`

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until you have every Railway configuration decision locked. Then write `v2/engineering/planning/infrastructure/railway-setup.md`.

1. What's the Railway plan — Hobby or Pro? Does it support multiple services in one project?
2. Should `coachable-v2-dev` auto-deploy on every push to `main`, or only after CI passes?
3. The server in v1 uses `RAILWAY_ROOT_DIRECTORY=server` — does v2 keep the same monorepo structure where the server root differs from the repo root?
4. What domain/subdomain should `coachable-v2-dev` use — a `.railway.app` URL is fine, or does it need a custom domain from day one?
5. Is the cutover plan a DNS switch (point coachableplays.com at the new prod service) or something else?
```

**Done looks like:** `coachable-v2-dev` Railway service is live, auto-deploys on push to `main`, and serves the app at a `.railway.app` URL. PostgreSQL service is connected. All env vars documented in `v2/environment.md` (TODO 1.4).

> **Once complete:** Update the heading emoji to ✅ Done.

---

## Group 2 — Database

### 2.1 — Migration system formalization ✅

The current `schema.sql` is 942 lines of mixed `CREATE TABLE` and `ALTER TABLE`
with safe-re-run guards.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write the migrations section of `v2/database.md`

**Background:** Coachable v2 rebuilds the database from scratch with a clean schema — `schema.sql` from v1 is reference only, not run directly. Before writing any schema code, we need a decision on migration strategy: single idempotent file (like v1) or numbered migration files. This section documents that decision and the exact process for applying a migration in production.

**Related docs:**
- `v2/engineering/audits/api-review.md` — schema recommendations from the audit
- `v2/engineering/planning/infrastructure/security-and-code-quality.md` — CI runs `node server/db/migrate.js` as a step; migrate.js must work headlessly

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the migration strategy and production procedure are fully decided. Then write the migrations section of `v2/database.md`.

1. Has `schema.sql` in v1 ever been run more than once on the production database? Are the `IF NOT EXISTS` guards actually complete for every `ALTER TABLE`, or are some bare?
2. If a new column needs to be added right now, what's the exact process — edit `schema.sql` and run the whole file, or add a one-off `ALTER` statement?
3. What would happen if `schema.sql` ran on a database that already had the full schema — would it error, no-op, or silently corrupt something?
4. For v2: keep the single-file idempotent approach with stricter discipline, or switch to numbered migration files (`001_initial.sql`, `002_add_folders.sql`) with a migrations tracking table?
```

**Done looks like:** `v2/database.md` has a migrations section documenting the chosen approach (single-file vs numbered), how to add a migration, and the exact procedure for running one in production.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 2.2 — Database backup and recovery strategy ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write the backup and recovery section of `v2/database.md`

**Background:** Coachable v2 uses a new PostgreSQL database on Railway (separate from v1). Before the v2 DB has any real user data, we need a documented backup and recovery strategy — so if something goes wrong we know exactly what to do and have already tested it.

**Related docs:**
- `v2/engineering/planning/infrastructure/railway-setup.md` — Railway plan and DB service configuration
- `v2/database.md` — this section goes in the same doc as migrations (2.1) and schema (2.4)

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the backup and recovery process is fully documented. Then write the backup section of `v2/database.md`.

1. What Railway plan is v2 on — does it include automated PostgreSQL backups? If yes, what's the retention window?
2. Has a restore ever been tested? If the DB was corrupted right now, what would the recovery process be?
3. What's the acceptable data loss window — losing the last hour of coach edits, the last 24 hours, more?
4. Are there tables where data loss would be catastrophic vs recoverable (e.g. user accounts vs play thumbnail cache)?
```

**Done looks like:** `v2/database.md` has a backup section that answers all of the above. A recovery has been tested at least once.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 2.3 — Index and query performance audit ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/engineering/audits/query-performance.md`

**Background:** Coachable v2 rebuilds the schema from scratch. Before writing the new schema, we need to identify the most critical query patterns from v1 and ensure the v2 schema has the right indexes from day one — not retrofitted later. This audit captures those patterns and the index decisions.

**Related docs:**
- `v2/engineering/audits/api-review.md` — lists the routes and their DB query patterns
- `v2/database.md` — index decisions belong in the schema from initial creation

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the critical query patterns and index decisions are fully captured. Then write `v2/engineering/audits/query-performance.md`.

1. The plays query does `WHERE team_id = $1 AND archived_at IS NULL ORDER BY updated_at DESC` — is there a compound index on `(team_id, archived_at, updated_at)` or just individual column indexes?
2. The notifications query joins `notification_recipients` on `user_id` — does that column have an index?
3. Have you seen any slow page loads in production that could be query-related?
4. Is `EXPLAIN ANALYZE` something you've run on the production DB, or only locally?
5. What are the three most-read queries by frequency (e.g. plays list on every page load, `/auth/me` on every session)?
```

**Done looks like:** `v2/engineering/audits/query-performance.md` documents the three most critical query patterns, their current `EXPLAIN ANALYZE` plans, and the index changes needed. Ready to execute.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 2.4 — Schema documentation ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write the schema section of `v2/database.md`

**Background:** Coachable v2 rebuilds the database schema from scratch — no stacked `ALTER TABLE` statements, no `IF NOT EXISTS` guards on columns that already exist. This section documents what every table stores, what it references, and what the important constraints mean, so the v2 schema can be written correctly the first time.

**Related docs:**
- `v2/engineering/audits/api-review.md` — lists every table and its role in the system
- `v2/database.md` — same doc as migrations (2.1) and backup (2.2)
- `v2/engineering/audits/query-performance.md` — index decisions that feed back into the schema

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until every table is fully documented. Then write the schema section of `v2/database.md`.

1. How many tables are there total? List them all.
2. Which tables have relationships that aren't obvious from the column names alone?
3. Are there invariants not enforced by DB constraints — e.g. "a team must have exactly one owner" or "a play can only be in one folder at a time"?
4. The `notifications` table has a `blocks` column — is that JSONB? What's the shape of a block object?
5. Are there any tables from v1 that should NOT exist in v2 (deprecated, replaced by something else)?
```

**Done looks like:** `v2/database.md` has a table-by-table description: what each table stores, what it references, and what the important constraints mean.

> **Once complete:** Update the heading emoji to ✅ Done.

---

## Group 3 — Backend

### 3.1 — Server integration test suite ✅

Writing the full server-side test suite with Vitest + Supertest against a
real test database. Plan is in `v2/engineering/planning/testing/test-suite-plan.md`.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Verify `v2/engineering/planning/testing/test-suite-plan.md` is complete for the new repo, then fill any gaps — specifically around the test DB setup and seed strategy that weren't resolved when the plan was written.

**Background:** Coachable v2 has no existing test infrastructure. The test-suite-plan.md was written when we were still on the v1 repo. Now that v2 is a new repo from scratch, some assumptions may need revisiting — particularly around how `server/db/migrate.js` works and what the seed strategy is.

**Related docs:**
- `v2/engineering/planning/testing/test-suite-plan.md` — the full plan; some gaps in the Phase 1 section
- `v2/engineering/planning/testing/server-testing-standards.md` — naming and structure conventions
- `v2/database.md` — migration approach (needed before CI can run tests against a fresh schema)

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until every gap in the test plan is resolved. Then update `v2/engineering/planning/testing/test-suite-plan.md`.

1. Does `server/db/migrate.js` exist in v2 and work headlessly — takes `DATABASE_URL` from env, no prompts?
2. Seed data strategy — hard-coded fixture objects in `tests/helpers/seed.js`, or does each test bootstrap state by hitting the actual signup/create-team routes?
3. Is there a test DB running locally right now, or does this need to be set up from scratch?
4. For the first integration tests (auth routes: login, signup, reset) — do those already exist, or is that the first thing to write?
```

**Done looks like:** `server/tests/` exists in the new repo with `helpers/requestAs.js`, `helpers/seed.js`, and `helpers/assertions.js`. Integration tests for the highest-blast-radius routes (auth, plays, teams) are passing in CI.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 3.2 — API contract and error model ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/engineering/planning/api-standards.md`

**Background:** Coachable v2 rebuilds all API client code from scratch. v1 has inconsistent function naming (`fetchPlays`, `apiDeletePlay`, `apiToggleFavorite`), no standard error contract, and inconsistent error handling — some routes swallow failures silently. v2 starts clean, so the contract must be decided before any client API code is written.

**Related docs:**
- `v2/engineering/audits/api-review.md` — full audit of current API surface and naming inconsistencies
- `v2/engineering/backend-code-standards.md` — server-side conventions; api-standards.md covers the client side
- `v2/engineering/frontend-code-standards.md` — references this doc for how `apiFetch` works

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the full API contract is locked. Then write `v2/engineering/planning/api-standards.md`.

1. `apiFetch` throws on non-2xx — does that mean every call site needs a try/catch? Or should the wrapper return `{ data, error }` so call sites don't need try/catch?
2. Function naming: REST verb prefix (`getPlays`, `deletePlay`) or resource prefix (`playsGet`, `playsDelete`) or something else?
3. When an API call fails, where does the user see it — toast, inline error, or nothing? Who is responsible: the API function, the hook, or the component?
4. For optimistic updates (e.g. toggling favorite) — if the server call fails, does the UI roll back, or does it stay in the wrong state?
5. Auth expiry: if a token expires mid-session and the next fetch returns 401, what happens — redirect to login, or show a "session expired" modal?
```

**Done looks like:** `v2/engineering/planning/api-standards.md` covers the error contract, client function naming convention, auth expiry handling, and optimistic update pattern.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 3.3 — Security hardening ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/engineering/audits/security-hardening.md`

**Background:** Coachable v2 rebuilds the server from scratch. Before writing any route code, we need a security checklist — known gaps from v1 that must be addressed in v2 from day one, not retrofitted. This audit captures every security gap and specifies the fix.

**Related docs:**
- `v2/engineering/audits/api-review.md` — full route audit; flags missing auth guards and unprotected routes
- `v2/engineering/backend-code-standards.md` — server code standards; security requirements belong here as enforcement rules
- `v2/engineering/planning/infrastructure/security-and-code-quality.md` — Snyk + ESLint plugins catch patterns, but this doc captures architectural gaps

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until every security gap is identified and its fix is specified. Then write `v2/engineering/audits/security-hardening.md`.

1. `CORS_ORIGINS` env var — is it actually wired in `server/index.js` right now, or defined but not used?
2. Auth routes (login, signup, forgot-password, reset-password) — is there any rate limiting on them currently?
3. JWT is in localStorage — XSS-accessible. Is that a known accepted tradeoff, or something to address in v2?
4. `server/lib/validate.js` has `requireString`, `optionalString`, etc. — are those used on every route that accepts user input, or do some routes let `req.body.x` flow directly into a query?
5. `npm audit --audit-level=high` — any known high/critical vulnerabilities in v1 right now?
6. Are there any routes in v1 that are missing `requireAuth` middleware but shouldn't be public?
```

**Done looks like:** `v2/engineering/audits/security-hardening.md` documents every security gap found — missing auth guards, unprotected routes, rate limiting gaps, CORS/CSP configuration — and specifies the fix for each. Ready to execute.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 3.4 — Route-level JSDoc pass ✅

Every route handler in the new repo gets JSDoc covering auth requirement,
request body, and return shape. Format is specified in `v2/engineering/backend-code-standards.md`.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Confirm the JSDoc format in `v2/engineering/backend-code-standards.md` is complete and covers all necessary cases, then add any missing examples or edge-case guidance.

**Background:** Coachable v2 is built for AI-assisted development — Claude reads JSDoc on route handlers to understand auth requirements without tracing middleware. The format must be consistent from day one so Claude can navigate the server confidently. The format is already partially documented in `backend-code-standards.md` but may have gaps.

**Related docs:**
- `v2/engineering/backend-code-standards.md` — the JSDoc format is specified here; this grill verifies and extends it
- `v2/engineering/planning/infrastructure/security-and-code-quality.md` — §AI-friendliness explains why JSDoc matters

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the JSDoc spec is unambiguous and covers every edge case. Then update `v2/engineering/backend-code-standards.md`.

1. Some routes in v1 (`notifications.js`) already have JSDoc but others don't — is the format in `backend-code-standards.md` based on those examples, or is it a new spec?
2. What's the minimum JSDoc to be useful — just auth requirement and return shape, or also request body schema?
3. Routes that are intentionally public (shared play view, platform plays) — should those explicitly say `@auth none` so it's obvious they're not accidentally missing auth?
4. Should JSDoc go on the `router.get(...)` call or on a named handler function above it?
```

**Done looks like:** Every route handler in `server/routes/` in the new repo has JSDoc covering auth requirement, request body, and return shape, per the format specified in `v2/engineering/backend-code-standards.md`.

> **Once complete:** Update the heading emoji to ✅ Done.

---

## Group 4 — Production readiness

### 4.1 — Error monitoring ✅

The server has only `console.log`. `errorReporter.js` sends client errors to
the admin backend but there is no external aggregation or alerting.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write the error monitoring section of `v2/engineering/planning/infrastructure/ops-setup.md`

**Background:** Coachable v2 has no external error monitoring. The server uses only `console.log` and client errors go to `errorReporter.js` which stores them in the DB but doesn't alert. For v2, we need a real monitoring setup before the first user hits the app — not retrofitted after an incident.

**Related docs:**
- `v2/engineering/planning/infrastructure/security-and-code-quality.md` — budget constraint: under $30/month total
- `v2/engineering/planning/infrastructure/ops-setup.md` — this section goes in the same doc as logging (4.2), health check (4.3), and uptime (4.4); read it first to see what's already there

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the monitoring setup is fully decided. Then write the error monitoring section of `v2/engineering/planning/infrastructure/ops-setup.md`.

1. Is Sentry the call, or is something else on the table? What's the budget for this specifically?
2. The custom `errorReporter.js` sends to `/api/error-reports` and stores in the DB — keep it and augment with Sentry, or replace entirely?
3. Should client errors and server errors go to the same Sentry project or separate ones?
4. What's the alert threshold — every unhandled error, or only when the error rate spikes above some baseline?
```

**Done looks like:** `v2/engineering/planning/infrastructure/ops-setup.md` has an error monitoring section: tool decision, Sentry project structure, and alert thresholds. All decisions made. Ready to execute.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 4.2 — Structured logging ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write the logging section of `v2/engineering/planning/infrastructure/ops-setup.md`

**Background:** The v1 server logs with `console.log` only. v2 needs structured JSON logging from day one so logs are queryable. The decision is pino vs hand-rolled JSON middleware, and what fields go on every log line. The output of this session is a new section in `v2/engineering/planning/infrastructure/ops-setup.md` — not any code.

**Related docs:**
- `v2/engineering/planning/infrastructure/ops-setup.md` — same doc as error monitoring (4.1), health check (4.3), uptime (4.4); read it fully first
- `v2/environment.md` — `LOG_LEVEL` may need to be an env var
- `v2/engineering/backend-code-standards.md` — server code conventions the logging approach must align with

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the logging approach is fully decided with no open questions. Then write the logging section of `v2/engineering/planning/infrastructure/ops-setup.md`.

1. Is pino the right choice, or is a hand-rolled JSON middleware sufficient at this scale?
2. What fields need to be on every log line — request ID, user ID, route, status, response time?
3. Are there fields that must never be logged — tokens, passwords, raw play data?
4. Does Railway's log view support filtering on JSON fields, or do logs need to go to an external drain for structured queries to be useful?
5. Should `LOG_LEVEL` be an env var, or is `info` always the right level in prod?
6. How should the logger be imported across the codebase — singleton module, or passed as a dependency?
```

**Done looks like:** `v2/engineering/planning/infrastructure/ops-setup.md` has a logging section: tool decision, required fields on every log line, and the explicit list of fields that must never be logged. Ready to execute.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 4.3 — Health check endpoint ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write the health check section of `v2/engineering/planning/infrastructure/ops-setup.md`

**Background:** Coachable v2 needs a `GET /api/health` endpoint from day one — it's part of the initial server scaffold (TODO 1.2). This section decides exactly what the endpoint checks and how Railway is configured to use it.

**Related docs:**
- `v2/engineering/planning/infrastructure/railway-setup.md` — Railway health check path must be configured in the service settings
- `v2/engineering/planning/infrastructure/ops-setup.md` — same doc as error monitoring, logging, uptime; read it first

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until every health check decision is made. Then write the health check section of `v2/engineering/planning/infrastructure/ops-setup.md`.

1. Does Railway expect a specific health check path by default, or can `/api/health` be freely configured in Railway settings?
2. Should the health check verify the DB pool is accepting queries, or just that the process is alive?
3. Should R2 connectivity be checked, or just the DB?
4. What should the response body look like — `{ status: "ok" }`, or include uptime, version, and DB latency?
```

**Done looks like:** `v2/engineering/planning/infrastructure/ops-setup.md` has a health check section covering what the endpoint verifies and Railway configuration steps. `GET /api/health` exists in the new server.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 4.4 — Uptime monitoring ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write the uptime monitoring section of `v2/engineering/planning/infrastructure/ops-setup.md`

**Background:** Coachable v2 needs to know within minutes if the app goes down. Railway logs and alerts are not enough — a separate uptime monitor pings the health check endpoint and sends an alert if it stops responding.

**Related docs:**
- `v2/engineering/planning/infrastructure/ops-setup.md` — same doc as error monitoring, logging, health check; read it first
- `v2/engineering/planning/infrastructure/security-and-code-quality.md` — budget constraint under $30/month

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the uptime monitoring is fully decided. Then write the uptime section of `v2/engineering/planning/infrastructure/ops-setup.md`.

1. Should alerts go to email, SMS, or both? What's the acceptable time-to-know — 1 minute of downtime, 5 minutes?
2. BetterStack, UptimeRobot, or Checkly — preference, or just whatever has the best free tier?
3. Should the uptime monitor hit the health check endpoint (`/api/health`) or the landing page?
```

**Done looks like:** `v2/engineering/planning/infrastructure/ops-setup.md` has an uptime monitoring section: tool decision, check interval, and alert routing. Ready to execute.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 4.5 — Frontend performance baseline ❌

The v2 bundle starts fresh — no MUI, `@ffmpeg/core` lazy-loaded only when
needed. This item captures the v2 baseline before any optimization work.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/engineering/audits/performance-baseline.md`

**Background:** Coachable v2 starts without MUI — the single biggest bundle weight from v1. `@ffmpeg/core` is lazy-loaded only when the GIF export modal opens. Before any optimization work, we need to capture the starting baseline (Lighthouse scores + Vite bundle output) so we know what the clean rebuild actually buys. The output of this session is `v2/engineering/audits/performance-baseline.md` — not any code.

**Related docs:**
- `v2/engineering/audits/landing-performance-diagnosis.md` — v1 landing page diagnosis; read it to understand what we're improving on
- `v2/engineering/frontend-code-standards.md` — all pages are lazy-loaded from day one, which affects bundle size

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until you have everything needed to write the baseline. Then write `v2/engineering/audits/performance-baseline.md`.

1. Has a Lighthouse run ever been done on the main app route (not landing page) in v1? What's the current LCP on a cold load?
2. What's the acceptable LCP target for v2 — under 2.5s, 3s, something else?
3. Is `@ffmpeg/core` currently loaded eagerly on page load or only when the GIF export modal opens?
4. What does `npm run build` show as the top heaviest chunks in v1?
5. Are there any other heavy dependencies in v1 besides MUI and ffmpeg that need to be accounted for?
6. Is there a Core Web Vitals target for CLS and TBT in addition to LCP?
```

**Done looks like:** `v2/engineering/audits/performance-baseline.md` captures Lighthouse results (LCP, CLS, TBT) and Vite bundle output for the new repo as the pre-optimization baseline.

> **Once complete:** Update the heading emoji to ✅ Done.

---

## Group 5 — Platform

### 5.1 — Billing and monetization ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/billing.md`

**Background:** Coachable v2 is pre-revenue. The billing decision — whether to include Stripe in v2 at all, what the tiers would be, which features are gated — needs to be documented as an intentional choice before any v2 code is written. If billing is out of scope for v2, that decision belongs in the doc too.

**Related docs:**
- `v2/v2.md` — overall v2 scope; billing may or may not be in scope
- `v2/engineering/planning/feature-flags.md` — if features are gated, flags are the mechanism

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the billing scope and model are fully decided. Then write `v2/billing.md`.

1. Is there a timeline for monetization, or is this intentionally deferred until user count reaches a threshold?
2. If a pricing model were designed today, what would the tiers be — free for individuals, paid for teams? Per seat or flat team price?
3. Which features would be gated — mobile editor, GIF export, playbook sections, team size limits?
4. Stripe subscriptions vs one-time payment — recurring SaaS or something else?
5. If billing is not in v2, what's the placeholder plan — honor system, waitlist, or just ship free?
```

**Done looks like:** Either "not in v2" is documented as an intentional decision, or `v2/billing.md` describes the Stripe integration plan before any code is written.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 5.2 — Email deliverability ✅ Done

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/engineering/audits/email-deliverability.md`

**Background:** Coachable sends transactional email via Resend — verification codes, password resets, team invites. If these land in spam, users churn at signup. This audit checks DNS configuration and inbox placement before v2 launch so any deliverability gaps are fixed before they affect real users.

**Related docs:**
- `v2/environment.md` — `RESEND_API_KEY` and sending domain
- `v2/engineering/planning/features/notification-delivery.md` — notification emails are in scope here too

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the deliverability audit is complete. Then write `v2/engineering/audits/email-deliverability.md`.

1. What domain does Resend send from — `coachableplays.com` or a subdomain? Are SPF, DKIM, and DMARC records configured on that domain right now?
2. Has anyone tested whether signup verification emails land in the inbox or spam on Gmail, Yahoo, and Apple Mail?
3. Are there any user reports of not receiving verification or invite emails?
4. What's the "from" name and address for transactional emails — `Coachable <no-reply@coachableplays.com>` or something else?
```

**Done looks like:** `v2/engineering/audits/email-deliverability.md` records the DNS configuration, mxtoolbox results, and inbox test results per provider. Ready to execute.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 5.3 — Storage and media lifecycle ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/engineering/planning/features/media-lifecycle.md`

**Background:** Coachable uses Cloudflare R2 for storing exported GIFs, videos, and images. There's currently no cleanup mechanism — exports accumulate indefinitely and deleted plays don't remove their exports. v2 needs a lifecycle policy before users generate significant storage.

**Related docs:**
- `v2/environment.md` — R2 credentials and bucket configuration
- `v2/engineering/audits/api-review.md` — R2 upload helper and export flow

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the lifecycle policy is fully decided. Then write `v2/engineering/planning/features/media-lifecycle.md`.

1. When a play is deleted, what happens to any GIF or video exports generated from it — do they stay in R2 indefinitely?
2. Is there a max file size enforced server-side for R2 uploads, or can a user export a 500MB video with no limit?
3. How many active teams are there and roughly how many exports have been generated — is R2 cost already noticeable?
4. Should exports be ephemeral (TTL-deleted after 24 hours) or persistent (tied to the play, deleted when the play is deleted)?
5. Is there an R2 lifecycle rule already configured, or is cleanup manual/nonexistent?
```

**Done looks like:** `v2/engineering/planning/features/media-lifecycle.md` documents the TTL decision, size limit, cleanup approach, and R2 cost baseline. Ready to execute.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 5.4 — Real-time and notification delivery ✅

Notifications are fetched on demand, capped at 100. There is no push mechanism.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/engineering/planning/features/notification-delivery.md`

**Background:** Coachable notifications are fetch-on-demand only — no real-time push. A player assigned a new play finds out the next time they open the app. For v2, we need to decide: keep polling, add SSE, or something else. The decision drives architecture in `NotificationsContext` and the server.

**Related docs:**
- `v2/engineering/planning/state-management.md` — `NotificationsContext` is one of the shared contexts that needs a state management decision
- `v2/engineering/audits/api-review.md` — current notifications route and `priority` column on the notifications table

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the delivery approach and all edge cases are fully decided. Then write `v2/engineering/planning/features/notification-delivery.md`.

1. What's the acceptable delay — a player needs to know within how long that a new play was assigned? Seconds, minutes, next open?
2. How many concurrent logged-in users are there at peak? That determines whether polling or SSE makes sense.
3. The `notifications` table has a `priority` column — should high-priority deliver faster, or is priority only for display order?
4. If polling: what interval — 30 seconds, 60 seconds? Does it happen on every page or only the notification bell?
5. Is there any interest in web push notifications (browser-level, works when the app is closed)?
```

**Done looks like:** `v2/engineering/planning/features/notification-delivery.md` documents the chosen approach (polling vs SSE), the interval, and how priority affects delivery. Ready to execute.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 5.5 — SEO for public pages ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/engineering/planning/features/seo-plan.md`

**Background:** Coachable has public pages — SharedPlay, SharedFolder, PlatformPlayView, Landing, Enterprise, PublicPlaybooks — that could appear in search results or social preview cards. v2 should have correct `<meta>` tags, OG cards, and a sitemap from day one rather than bolted on later.

**Related docs:**
- `v2/design/public-pages.md` — layout and CTA decisions for public pages
- `v2/engineering/planning/routing.md` — which routes are public vs auth-gated

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the full SEO plan is decided. Then write `v2/engineering/planning/features/seo-plan.md`.

1. Which pages need SEO treatment — SharedPlay, SharedFolder, PlatformPlayView, Landing, Enterprise, PublicPlaybooks? Which are actually indexable vs auth-gated?
2. Is there a `/sitemap.xml` right now? Are canonical URLs set on any page?
3. When a coach shares a play link, what should the OG preview card show — play title, sport, a thumbnail?
4. Does a shared play have a stable canonical URL or does it vary by share token?
5. Is the site client-rendered only? OG tags need to be in the initial HTML for social crawlers — is that handled today?
```

**Done looks like:** `v2/engineering/planning/features/seo-plan.md` documents which pages are covered, OG tag specs, and the sitemap approach. Ready to execute.

> **Once complete:** Update the heading emoji to ✅ Done.

---

## Group 6 — Component library (src/ui/)

Building the shared component layer at `src/ui/` from scratch. Every component is written new against the component specs — no code is extracted or ported from the v1 codebase. The v1 `design-system-unification` branch (`v2/engineering/audits/design-system-unification-attempt.md`) produced a solid component list and `--ui-*` token vocabulary worth referencing, but the implementations themselves start fresh.

### 6.1 — Component prop convention ✅ Done

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/design/component-specs.md` — the prop convention section plus full specs for Button, Input, Modal, and Toast.

**Background:** Coachable v2 builds `src/ui/` from scratch. Before writing a single component, the prop conventions need to be locked — otherwise components built at different times will have inconsistent APIs that are painful to refactor. This is the first of four sessions that together complete `component-specs.md`: conventions (6.1), primitives (6.2), display components (6.3), layout (6.4).

**Related docs:**
- `v2/design/color-semantics.md` — `--ui-*` token set that all components reference
- `v2/design/general-formatting-standards.md` — spacing grid, type scale, focus rings
- `v2/engineering/frontend-code-standards.md` — component file conventions and import paths
- `v2/engineering/audits/design-system-unification-attempt.md` — component list and token vocabulary from the v1 attempt

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until every convention and component API is fully locked. Then write `v2/design/component-specs.md`.

1. Should all `src/ui/` components accept a `className` prop for one-off styling, or does that create escape-hatch inconsistency?
2. Size values — `sm`/`md`/`lg`, numeric px, or Tailwind size names?
3. How are loading states handled on Button — a `loading` boolean that shows a spinner inside the button, or a wrapper?
4. Variant naming for Button: `primary`/`secondary`/`ghost`/`destructive` — are those the four, or are there others?
5. `AppMessageContext` handles toasts today. Does `Toast` in `src/ui/` replace that context entirely, or is Toast a display component and the context stays for managing the queue?
```

**Done looks like:** `v2/design/component-specs.md` covers the prop convention and specs Button, Input, Modal, and Toast with variant tables and examples.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 6.2 — Build primitives in src/ui/ ❌

Button, Input, Modal, Toast, and any other primitives defined in `v2/design/component-specs.md`.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Add primitive component implementation specs to `v2/design/component-specs.md` — enough detail that each component can be built without follow-up questions.

**Background:** 6.1 defined the prop conventions and API for Button, Input, Modal, Toast. This session fills in any implementation decisions not yet captured — portals, focus management, animation, accessibility — so the specs are buildable. The output is an updated `v2/design/component-specs.md` only. No code is written in this session.

**Related docs:**
- `v2/design/component-specs.md` — prop conventions and variant tables from 6.1; read it fully first, then add implementation notes
- `v2/design/accessibility-standards.md` — focus trap, ARIA labels, keyboard patterns that must be satisfied
- `v2/design/general-formatting-standards.md` — motion and animation budget (150–300ms, transform + opacity only)

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until every primitive has enough implementation detail that a developer can build it without asking anything. Then update `v2/design/component-specs.md`.

1. Should `Modal` use a React portal (`createPortal`) to escape stacking context issues?
2. Does `Modal` need a focus trap, or is that handled by `accessibility-standards.md`'s recommendations?
3. `Toast` — should it auto-dismiss after a timeout, or stay until dismissed? What's the default timeout?
4. `Input` — should it handle error state inline (red border + message below) or is that the form's responsibility?
5. Are there any additional primitives needed beyond Button, Input, Modal, Toast — e.g. Checkbox, Select, Spinner, Textarea, Radio?
6. For `Select` (if needed) — native `<select>` or a custom dropdown? Native is more accessible but harder to style.
7. Does `Spinner` stand alone as a component, or is it always embedded inside `Button` and other loaders?
8. Should there be a `Tooltip` primitive, or is that deferred?
```

**Done looks like:** Button, Input, Modal, Toast, and the other primitives defined in `v2/design/component-specs.md` exist in `src/ui/` in the new repo. Each is registered in `src/admin/pages/AdminDesignSystem.jsx`.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 6.3 — Build display and domain components in src/ui/ ❌

PlayCard, NotificationItem, StatCard, TeamMemberCard, FolderCard, EmptyState, AvatarGroup, TagPill, and other display components used across more than one page.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Add display and domain component specs to `v2/design/component-specs.md` — a complete inventory with prop APIs, state variants, and interaction behavior for every component used across two or more pages.

**Background:** Display components are the domain-specific layer above primitives. Getting the prop API wrong here causes refactors across every page that uses them. Before writing a single component, the full inventory needs to be locked, each component's data shape and interactive states need to be decided, and the relationship between these components and the API data shapes needs to be explicit. The output of this session is an updated `v2/design/component-specs.md` only — no code.

**Related docs:**
- `v2/design/component-specs.md` — prop conventions from 6.1 and primitive specs from 6.2; read it fully first, then add display specs
- `v2/engineering/audits/api-review.md` — data shapes returned by the API (plays, notifications, teams, folders, etc.) that feed into component props; read this too
- `v2/design/general-formatting-standards.md` — spacing, type scale, and motion budget all display components must follow
- `v2/design/accessibility-standards.md` — interactive display components (cards with actions) must pass keyboard and ARIA requirements

The questions below are a starting point. This component layer is large — ask me as many additional questions as needed, going component by component, until every display component has a complete prop API, a full list of visual states, and clear interaction behavior. Do not stop at the listed questions. Then update `v2/design/component-specs.md`.

1. **PlayCard surfaces.** What surfaces use PlayCard — app plays list, admin content view, platform browse, shared folder? Does it need different display modes for each surface, or is one flexible component enough?
2. **PlayCard data shape.** Does PlayCard receive a full play object or just display fields (title, thumbnail, sport, updated_at)? What happens when `thumbnail_url` is null — placeholder icon, skeleton, sport-colored background?
3. **PlayCard states.** What visual states are needed — default, hover, selected (bulk ops), archived, favorited, hidden-from-players? How are action menus triggered?
4. **PlayCard actions.** What actions can appear in the menu — rename, duplicate, move to folder, share, archive, delete, toggle favorite, hide from players? Does the set vary by role?
5. **NotificationItem blocks.** The `notifications.blocks` column is JSONB. What block types exist — text, question, multiple-choice? Is the block renderer part of `NotificationItem` or a separate `BlockRenderer`?
6. **NotificationItem states.** Does it show unread vs read differently? Is there an inline "respond" action, or does responding navigate elsewhere?
7. **FolderCard / PlaybookCard.** Are folders and playbooks the same component or two different ones? What data does each show and what actions appear in the menu?
8. **TeamMemberCard.** Where is it used? What does it show and what actions does it have?
9. **AvatarGroup.** Is there a component that shows overlapping user avatars? What's the max before it collapses to "+N"?
10. **EmptyState.** Is there a shared empty state component? What does it contain — illustration, heading, subtext, CTA? Is the CTA always present?
11. **TagPill / FilterChip.** What are its states — default, active/selected, removable?
12. **StatCard.** What data does it show — label, number, trend indicator? Does it link anywhere?
13. **SectionCard.** Used for platform playbook sections. How does it differ from FolderCard?
14. **SearchResult.** Is there a unified search result component, or does each resource type render differently?
15. **What else.** Walk me through each page in the app and tell me if there's a display component used there that isn't covered above.
```

**Done looks like:** PlayCard, NotificationItem, FolderCard, TeamMemberCard, AvatarGroup, EmptyState, TagPill, StatCard, and all other shared display components are specced in `v2/design/component-specs.md` and exist in `src/ui/`. Each is registered in `src/admin/pages/AdminDesignSystem.jsx`.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 6.4 — Build layout and shell components ❌

Sidebar, Header, PageShell — the structural chrome components.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Add layout and shell component specs to `v2/design/component-specs.md`

**Background:** The shell components define how every authenticated page is structured. Getting the composition model wrong causes rework across every page. These specs must be locked before any pages are built. The output is an updated `v2/design/component-specs.md` only — no code.

**Related docs:**
- `v2/design/component-specs.md` — primitive and display specs from 6.1–6.3; read it fully first, then add layout specs
- `v2/engineering/planning/routing.md` — which routes share the app shell vs have their own layout (e.g. auth pages, shared/public pages)
- `v2/design/mobile/mobile-formatting-standards.md` — how the shell behaves on mobile
- `v2/design/desktop/desktop-formatting-standards.md` — how the shell behaves on desktop

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until every structural decision is locked and the layout components can be built without ambiguity. Then update `v2/design/component-specs.md`.

1. Does `Sidebar` compose nav items as children or accept them as a prop array?
2. Does the admin share `PageShell` with the app, or does it have its own layout wrapper?
3. `PageShell` — does it include sidebar + header together, or are they composed by the consumer?
4. How does the mobile layout differ from desktop — does `PageShell` handle the responsive switch, or does the consumer choose?
5. On mobile, does the sidebar become a drawer, a bottom nav bar, or something else?
6. Does the header show the team name / team switcher? Where does that live — header or sidebar?
7. Should the notification bell live in the header or the sidebar?
8. Are there pages that use `PageShell` but need to suppress the sidebar (e.g. play editor goes full-screen)?
9. Is there a breadcrumb component, or is that handled inline per page?
```

**Done looks like:** Sidebar, Header, and PageShell exist in `src/ui/` and are registered in `src/admin/pages/AdminDesignSystem.jsx`.

> **Once complete:** Update the heading emoji to ✅ Done.

---

## Group 7 — Frontend architecture

### 7.1 — Confirm no MUI in v2 ❌

v2 does not include MUI — the new `src/ui/` component library replaces it
entirely. This item confirms MUI was never added and captures the bundle
baseline without it.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Add a MUI removal and bundle baseline section to `v2/engineering/audits/performance-baseline.md`

**Background:** MUI is the single heaviest dependency in v1. v2 explicitly excludes it. This session documents what MUI was providing so `src/ui/` replacements cover the gaps, and captures the v2 bundle baseline without MUI as a reference point. The output is an updated `v2/engineering/audits/performance-baseline.md` — no code.

**Related docs:**
- `v2/engineering/audits/performance-baseline.md` — overall performance baseline; read it fully first, then add the MUI section
- `v2/design/component-specs.md` — `src/ui/` replaces MUI; spec coverage must account for MUI's features
- `v2/engineering/audits/design-system-unification-attempt.md` — previous attempt to remove MUI; read the lessons learned section first

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the MUI gap analysis and bundle baseline are fully captured. Then update `v2/engineering/audits/performance-baseline.md`.

1. What MUI components were actually used in v1 — just basics (Button, TextField, Modal) or anything more complex like DataGrid, DatePicker, Autocomplete?
2. Is there anything MUI provided with complex built-in accessibility behavior (focus trap, ARIA) that needs to be rebuilt in `src/ui/`?
3. Are there any dependencies in v1 that transitively pull in MUI that also need to be excluded?
4. What does `vite-bundle-visualizer` show as MUI's share of the v1 bundle?
5. Is there any MUI theming (custom theme object, `ThemeProvider`) that carried business logic — brand colors, custom breakpoints — that needs to migrate to CSS tokens?
```

**Done looks like:** `v2/engineering/audits/performance-baseline.md` has a MUI removal section covering: which MUI components were used in v1, what `src/ui/` components replace them, any accessibility gaps that need to be rebuilt (focus trap, ARIA), whether MUI theming carried business logic that must migrate to CSS tokens, and the v2 bundle baseline (Vite build output) without MUI recorded as the starting reference point.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 7.2 — Routing v2 ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/engineering/planning/routing.md`

**Background:** Coachable v2 rebuilds `App.jsx` from scratch with lazy imports for all pages from day one. The routing doc needs to capture the full v2 route tree — which routes are public, which require auth, which require team membership, and how admin routes are structured — so `App.jsx` can be written correctly the first time without gaps. The output is `v2/engineering/planning/routing.md` — no code.

**Related docs:**
- `v2/engineering/audits/routing-and-flash-diagnosis.md` — v1 routing problems this doc must solve; read it first
- `v2/engineering/planning/permissions.md` — route guards depend on the permission model
- `v2/engineering/frontend-code-standards.md` — lazy import convention and App.jsx structure

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the full route tree is mapped with no ambiguity. Then write `v2/engineering/planning/routing.md`.

1. Should `App.jsx` stay as a single file with all routes, or split into feature routers (app router, admin router, auth router)?
2. How does `returnTo` work — is there a query param on the login redirect that brings the user back after auth? Where is it set and consumed?
3. Are there route guards beyond `requireAuth` — e.g. blocking unverified users or users who haven't completed onboarding?
4. Should admin routes have a separate layout wrapper (`AdminShell`) or share the app shell?
5. List all the routes in the app — every path and what it renders. Public first, then auth-gated, then admin.
6. Are there any routes that require specific roles — e.g. admin routes gated to `staff` or `owner`?
7. How is the active team resolved on page load — from the URL, from localStorage, or from the server?
8. If a user has no team yet (fresh signup who skipped onboarding), what route do they land on?
```

**Done looks like:** `v2/engineering/planning/routing.md` documents the full v2 route tree — every route path, its public/auth/role requirements, how route guards work, and how the active team is resolved on load.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 7.3 — State management decision and implementation ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/engineering/planning/state-management.md`

**Background:** Coachable v2 is built from scratch. The state management decision — React Query for server state, Zustand for shared client state, or Context + useState — must be made before pages are built. The wrong decision means refactoring everything once the pattern breaks down under complexity. The output is `v2/engineering/planning/state-management.md` — no code.

**Related docs:**
- `v2/engineering/frontend-code-standards.md` — component and hook conventions; read it first
- `v2/engineering/planning/permissions.md` — `usePermissions()` is shared state that might live in Context or Zustand
- `v2/engineering/planning/features/notification-delivery.md` — `NotificationsContext` is one of the shared contexts

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the state management architecture is fully resolved with no open decisions. Then write `v2/engineering/planning/state-management.md`.

1. In `Plays.jsx`, what's actually server state (plays list, folders list) vs local UI state (menu open, rename input)? Walk me through what the 30+ `useState` calls are actually doing.
2. Is there any data that needs to be shared across pages today — e.g. does the notification badge in the sidebar need to sync with `NotificationsContext`?
3. React Query vs SWR for server state — any preference? Main value is caching, automatic refetch, and built-in loading/error states.
4. If React Query handles the plays list, does the optimistic update on favorite toggle become a React Query mutation or stay manual?
5. What contexts exist in v1 today — list them all (`AuthContext`, `NotificationsContext`, `AppMessageContext`, `FeatureFlagContext`, any others)?
6. Should `AuthContext` stay as a custom Context, or does it also become a React Query query (`useQuery(['me'], getMe)`)?
7. Is Zustand on the table, or is it React Query + Context only?
```

**Done looks like:** `v2/engineering/planning/state-management.md` documents the chosen approach for both server state and shared client state, with a reference pattern for each category showing how a developer implements it without open questions.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 7.4 — Permission abstraction ✅ Done

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/engineering/planning/permissions.md`

**Background:** Coachable v2 has four roles (owner, coach, assistant_coach, player) with overlapping permissions, plus `playerViewMode` that temporarily restricts a coach's view, plus `assistantPermissions` that can override a coach's defaults. This needs a clear model before `usePermissions()` is written — otherwise the hook will be a mess of ternaries. The output is `v2/engineering/planning/permissions.md` — no code.

**Related docs:**
- `v2/engineering/frontend-code-standards.md` — `usePermissions()` hook convention; read it first
- `v2/engineering/audits/api-review.md` — `requireTeamRole` middleware shows server-side permission enforcement; read it to understand the current role model
- `v2/engineering/planning/routing.md` — route guards depend on the permission model

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the full permission matrix is mapped with no edge cases left open. Then write `v2/engineering/planning/permissions.md`.

1. What are all the permission flags that need to exist — `canCreatePlay`, `canEditPlay`, `canDeletePlay`, `canManageRoster`, `canSendInvites`, `canViewAdmin`, `canViewTrash` — what else?
2. Should `usePermissions()` fold `assistantPermissions` in directly, or is there a separate path for assistant coach permissions?
3. `playerViewMode` overrides role — should `usePermissions()` take that into account internally, or is it the caller's job to check?
4. Are there team-level settings that affect permissions, or is it purely role-based?
5. Walk me through a concrete example: an assistant coach with `canEditPlay: false` in their `assistantPermissions` tries to open the play editor. What happens at each layer (route guard, component, API)?
6. Can a player ever have elevated permissions — e.g. a player who is also a student coach?
7. Should `usePermissions()` return a flat object of booleans, or a more structured object grouped by domain (plays, roster, admin)?
```

**Done looks like:** `v2/engineering/planning/permissions.md` documents all permission flags, the role matrix, and how `assistantPermissions` and `playerViewMode` are handled. The `usePermissions()` hook API, return shape, and usage convention are fully specified so a developer can implement it without open questions.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 7.5 — Error boundaries ✅ Done

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Add an error boundary spec to `v2/engineering/frontend-code-standards.md`

**Background:** Coachable v2 needs error boundaries on every route from day one — a crash in one page shouldn't take down the whole app. The decision is what the boundary shows, whether it reports to monitoring (4.1), and whether boundaries are per-route or nested within pages too. The output is an updated `v2/engineering/frontend-code-standards.md` — no code.

**Related docs:**
- `v2/engineering/frontend-code-standards.md` — the error boundary spec and usage convention go here; read it fully first
- `v2/engineering/planning/infrastructure/ops-setup.md` — error monitoring (4.1); boundary should report to it
- `v2/engineering/planning/routing.md` — every route in App.jsx gets wrapped

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the boundary behavior is fully specced with no gaps. Then update `v2/engineering/frontend-code-standards.md`.

1. Should the boundary show a retry button, a "go home" link, or both?
2. The boundary needs to report to monitoring (TODO 4.1). Should it be written now with a no-op report function, or should 4.1 be done first?
3. Should there be nested boundaries (per section of a page) or one per route?
4. Should `src/ui/ErrorBoundary.jsx` be a class component (required by React) or is there a library wrapping it (like `react-error-boundary`)?
5. What should the fallback UI look like — matches the app shell (sidebar still visible), or a full blank page with just the error message?
6. In development, should the boundary show the raw error stack, or always show the user-facing fallback?
```

**Done looks like:** `v2/engineering/frontend-code-standards.md` has an error boundary section covering: what the fallback UI shows, whether it reports to monitoring, placement (per-route vs nested), library choice, and dev vs prod behavior. A developer can implement `ErrorBoundary` and wire it in `App.jsx` without follow-up questions.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 7.6 — isMobile JS check elimination ✅ Done

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Add a breakpoint hook convention to `v2/engineering/frontend-code-standards.md`

**Background:** Coachable v1 has `window.matchMedia` calls scattered across page components. v2 centralizes all breakpoint detection in a single `useBreakpoint()` hook. This session captures the decision — what the hook returns, where it lives, and which behaviors should be CSS-only vs JS-gated. The output is an updated `v2/engineering/frontend-code-standards.md` — no code.

**Related docs:**
- `v2/engineering/frontend-code-standards.md` — the `useBreakpoint` convention goes here; read it fully first
- `v2/engineering/planning/features/mobile-slate-plan.md` — mobile editor uses `isMobile` detection; must go through the hook
- `v2/design/mobile/mobile-formatting-standards.md` — the breakpoint value for "mobile" may already be specified here

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the hook contract is fully decided. Then update `v2/engineering/frontend-code-standards.md`.

1. Which behaviors gated on `isMobile` today can become CSS-only (hiding a button, changing layout), vs which truly require JS (disabling canvas interaction)?
2. Should `useBreakpoint()` return a single `isMobile` boolean or a more general breakpoint value (`sm`/`md`/`lg`)?
3. Should `useBreakpoint()` use SSR-safe defaults, or is this a client-only app where that doesn't matter?
4. Is there a standard breakpoint value for "mobile" — 768px, 640px, something else?
5. Should the hook debounce resize events, or is immediate response acceptable?
```

**Done looks like:** `v2/engineering/frontend-code-standards.md` has a breakpoint hook section covering: hook name and file path, what it returns (`isMobile` boolean vs breakpoint enum), the canonical breakpoint value, debounce decision, SSR safety, and which behaviors must go through the hook vs CSS-only. A developer can implement `useBreakpoint` without follow-up questions.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 7.7 — Feature flag integration ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/engineering/planning/feature-flags.md`

**Background:** Coachable v2 has a feature flag system (`FeatureFlagContext`, `/api/flags`) that controls which features are on for which users. In v2 this needs to be rebuilt cleanly — how flags are loaded, how they're consumed in components, how they're toggled in the admin, and what the developer convention is for marking flagged code. The output is `v2/engineering/planning/feature-flags.md` — no code.

**Related docs:**
- `v2/engineering/audits/api-review.md` — current flags route and `featureFlags.js` lib; read it for the current flag model
- `v2/engineering/planning/state-management.md` — `FeatureFlagContext` is one of the shared contexts; read it if complete

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the full flag system is designed with no open questions. Then write `v2/engineering/planning/feature-flags.md`.

1. How are flags loaded today — does `FeatureFlagContext` fetch `/api/flags` on mount? Are they re-fetched on navigation or only once per session?
2. Should `AdminFlagGate` generalize into `src/ui/FlagGate.jsx` that works everywhere, or is the inline `useFeatureFlags()` pattern preferred?
3. Can a flag be toggled in the admin and take effect without a page refresh, or does the user need to reload?
4. What's the rule for how a developer reading a component knows it's behind a flag — a comment, a JSDoc note, a wrapper component?
5. Are flags per-user, per-team, or global? Can a flag be on for some users and off for others?
6. What flags exist in v1 today — list them all and what each gates.
7. Should flag keys be typed constants (a TypeScript enum or string union) to prevent typos?
```

**Done looks like:** `v2/engineering/planning/feature-flags.md` documents the flag loading pattern, developer convention for marking flagged components, flag key typing strategy, and the full list of current flags and what each gates. A developer can implement the feature flag context and `FlagGate` component without open questions.

> **Once complete:** Update the heading emoji to ✅ Done.

---

## Group 8 — UI testing

### 8.1 — Establish Vitest config and write first tests ✅

The v2 new repo starts with no existing UI tests. Build the test infrastructure
from scratch as one of the first commits.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Add a Vitest setup section to `v2/engineering/planning/testing/test-suite-plan.md` — the exact config decisions needed to write `vitest.config.js` and `vitest.server.config.js` from scratch.

**Background:** Coachable v2 has no test infrastructure. `test-suite-plan.md` covers what to test but the exact Vitest config decisions (mock strategy, environment, path aliases) aren't fully captured. This session fills in the config gaps so the first test infrastructure commit can be made without follow-up questions. The output is an updated `v2/engineering/planning/testing/test-suite-plan.md` — no code.

**Related docs:**
- `v2/engineering/planning/testing/test-suite-plan.md` — the full test plan; read it fully first
- `v2/engineering/planning/testing/ui-testing-standards.md` — role-based test patterns that depend on the `renderAs` helper
- `v2/engineering/planning/state-management.md` — the state management choice (7.3) affects what needs to be mocked in tests

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the Vitest config is fully specced with no ambiguity. Then update `v2/engineering/planning/testing/test-suite-plan.md`.

1. Mock strategy for API calls in UI tests — MSW (intercept at network level) or `vi.mock` the api module?
2. `assistant_coach` is a role with `assistantPermissions` that differ from regular coaches — does it need its own fixture in `src/tests/fixtures/`, or share the coach fixture with permission overrides?
3. Should `vitest.config.js` use the same path aliases as `vite.config.js` (e.g. `@` → `src/`)?
4. Should `src/tests/renderAs.js` return a React Testing Library `render` result, or a custom wrapper that also provides routing context?
5. Does `renderAs` need to wrap components in React Query's `QueryClientProvider`, or is that mocked out?
6. Should `jsdom` or `happy-dom` be used as the test environment?
```

**Done looks like:** `v2/engineering/planning/testing/test-suite-plan.md` has a Vitest setup section covering: mock strategy (MSW vs `vi.mock`), test environment (`jsdom` vs `happy-dom`), path alias config, `renderAs` helper return shape, `QueryClientProvider` strategy, and the `assistant_coach` fixture approach. A developer can write `vitest.config.js`, `vitest.server.config.js`, and all shared test helpers without follow-up questions.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 8.2 — Role-based UI test suite ✅

Full role-based test suite per `v2/engineering/planning/testing/ui-testing-standards.md`.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Verify `v2/engineering/planning/testing/ui-testing-standards.md` is complete and covers all cases needed to build the full role-based test suite. Fill any gaps.

**Background:** Coachable v2 needs role-based UI tests co-located with every page. The `ui-testing-standards.md` doc describes the pattern but may have gaps around edge cases — what to assert, how to handle async data, how to test permission-gated UI elements. The output is an updated `v2/engineering/planning/testing/ui-testing-standards.md` — no code.

**Related docs:**
- `v2/engineering/planning/testing/ui-testing-standards.md` — the standards doc; read it fully first before asking questions
- `v2/engineering/planning/testing/test-suite-plan.md` — overall test plan; role tests are Phase 3
- `v2/engineering/planning/permissions.md` — permission model the tests validate

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the standards doc has no gaps and every edge case is handled. Then update `v2/engineering/planning/testing/ui-testing-standards.md`.

1. Does `renderAs(role)` exist anywhere yet, or does it need to be written from scratch per the standards doc?
2. For a page with async data loading — what should role tests do while data is loading? Await the loaded state, or test the loading skeleton too?
3. `assistant_coach` permissions can vary per team — how does a role test capture that variability without writing one test per permission combination?
4. Should role tests mock the API responses or use MSW handlers — and is that decision captured in the standards doc?
5. Should there be a standard assertion helper for "this element should not exist in the DOM" vs "this element should be disabled" for hidden role-gated UI?
6. Are flow tests (multi-step user interactions like creating a play) covered in the standards, or only role snapshot tests?
```

**Done looks like:** `v2/engineering/planning/testing/ui-testing-standards.md` covers async data loading strategy, `assistant_coach` permission variability, API mock approach in role tests, hidden-vs-disabled assertion helpers, and flow test conventions. A developer can write role tests for any page without consulting anything outside this doc.

> **Once complete:** Update the heading emoji to ✅ Done.

---

## Group 9 — Core product

### 9.1 — Slate UX standards ✅ Done

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/design/slate/slate-ux-standards.md`

**Background:** Coachable v2 ports `src/slate/` directly from v1 — it's the one piece of code that doesn't get rebuilt. But several UX decisions inside Slate are undocumented or inconsistent. This doc captures all editor UX decisions so anyone working in Slate (or building on top of it) has a single reference for intended behavior. The output is `v2/design/slate/slate-ux-standards.md` — no code.

**Related docs:**
- `v2/engineering/planning/features/mobile-slate-plan.md` — mobile gesture model; read it first, slate-ux-standards.md must be consistent with it
- `v2/design/general-formatting-standards.md` — motion and animation budget applies to Slate transitions too

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until every editor UX decision is documented and there are no ambiguities. Then write `v2/design/slate/slate-ux-standards.md`.

1. The draw tool has multiple modes (pen, arrow, shape, eraser). Is the state machine mutually exclusive — can a player be selected at the same time draw mode is active?
2. Field orientation: some sports are vertical (basketball), some horizontal (football). Is orientation decided per-sport, or can a coach rotate within the editor?
3. When a coach adds a keyframe, what gets captured — all player positions, or only players that moved since the last keyframe?
4. Undo/redo scope: does undo go back one atomic action (move one player) or one gesture (a full drag)?
5. On mobile, what's the gesture for "select player" vs "pan canvas" vs "start drawing" — is that already decided and in `mobile-slate-plan.md`?
6. What's the maximum number of players, drawings, and keyframes the editor is designed to handle before performance degrades?
7. When an animation plays, can the coach pause it mid-frame and scrub? Or is it play/stop only?
8. Are there any UX behaviors in v1's Slate that are known bugs or that you'd want to change in v2?
```

**Done looks like:** `v2/design/slate/slate-ux-standards.md` exists and covers all editor UX decisions — draw tool state machine, field orientation, keyframe capture scope, undo/redo scope, and mobile gesture model.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 9.2 — Mobile editor launch ⚠️

In the new repo, mobile editing is wired correctly from the start — no
`MobileViewOnlyGate` to remove. Blocked on 9.1 confirming the mobile editor
UX is ready for users. Wiring plan is in
`v2/engineering/planning/features/mobile-slate-plan.md`.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Verify `v2/engineering/planning/features/mobile-slate-plan.md` is complete and the testing checklist captures everything needed to sign off on mobile editing for coach users.

**Background:** The mobile Slate editor is feature-complete in v1 (admin-only). In the new repo it will be wired for all coach users from the start. The wiring plan doc is complete, but the sign-off checklist and sport-specific gaps may need updating before this can be marked done. The output is an updated `v2/engineering/planning/features/mobile-slate-plan.md` — no code.

**Related docs:**
- `v2/engineering/planning/features/mobile-slate-plan.md` — the full wiring plan and testing checklist; read it fully first
- `v2/design/slate/slate-ux-standards.md` — UX standards the mobile editor must conform to (complete 9.1 first)

**Before asking any question, check if the answer is already in the codebase or a related doc listed above. Only ask questions about future design decisions that require the user's input — not questions about how the app currently works.**

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the checklist is complete and every gap is addressed. Then update `v2/engineering/planning/features/mobile-slate-plan.md`.

1. Which sports have been tested end-to-end on mobile and confirmed working — football, basketball, soccer, lacrosse?
2. Is `mobileLayout` accepted as a prop by `Slate.jsx` right now, or does that need to be added in the new repo?
3. Does `onNavigateHome` flush autosave before navigating — has the flush-on-back path been tested?
4. Are there any known mobile bugs or crashes that aren't yet in the testing checklist?
```

**Done looks like:** `v2/engineering/planning/features/mobile-slate-plan.md` has a complete testing checklist covering all 9 supported sports, the flush-on-back path, all known mobile bugs, and the sport-specific gaps originally left open. Every checklist item has an unambiguous pass/fail criterion. Ready to execute in the new repo.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 9.3 — PlayerViewMode UX ✅

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/design/player-view-mode.md`

**Background:** Coachable has a `playerViewMode` that lets a coach see the app as a player would — hiding coach-only UI. In v2 this needs to be designed properly from the start: what exactly is hidden, how does the coach toggle it, and does it persist. The output is `v2/design/player-view-mode.md` — no code.

**Related docs:**
- `v2/engineering/planning/permissions.md` — `playerViewMode` interacts with the permission model; complete 7.4 first if possible
- `v2/design/general-formatting-standards.md` — any persistent indicator (banner, badge) must follow the formatting standards
- `v2/engineering/audits/api-review.md` — `player_view_mode` is stored in `user_preferences` table; read it for the current implementation

**Before asking any question, check if the answer is already in the codebase or a related doc listed above. Only ask questions about future design decisions that require the user's input — not questions about how the app currently works.**

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the full PlayerViewMode behavior is specified with no ambiguity. Then write `v2/design/player-view-mode.md`.

1. How does a coach toggle `playerViewMode` — is there a UI button, or is it only accessible via dev tools today?
2. What should be hidden in playerViewMode — just coach action buttons, or also UI chrome that reveals coach-only info like `hiddenFromPlayers` badges?
3. Does `playerViewMode` persist across page navigation and refreshes, or is it session-only?
4. Should a coach in playerViewMode see a persistent indicator (banner, badge in nav) so they don't forget they're in it?
5. Should `playerViewMode` affect what the API returns, or only what the frontend renders?
6. Can a coach enter playerViewMode while on the play editor, or only from the plays list?
```

**Done looks like:** `v2/design/player-view-mode.md` documents what is hidden in playerViewMode, the indicator spec, toggle placement, and persistence behavior. Ready to execute.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 9.4 — Shared and public page redesign ✅ Done

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/design/public-pages.md`

**Background:** Coachable has public pages that non-logged-in users can see — SharedPlay, SharedFolder, PlatformPlayView, and the marketing pages. In v2 these need proper design decisions: layout, CTAs, expired-link handling, and whether the play viewer is full-editor or static. The output is `v2/design/public-pages.md` — no code.

**Related docs:**
- `v2/engineering/planning/features/seo-plan.md` — OG tags and sitemap for public pages; complete 5.5 first if possible
- `v2/engineering/planning/routing.md` — which routes are public; complete 7.2 first if possible
- `v2/design/general-formatting-standards.md` — formatting standards apply to public pages too

**Before asking any question, check if the answer is already in the codebase or a related doc listed above. Only ask questions about future design decisions that require the user's input — not questions about how the app currently works.**

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until all public page decisions are made with no open questions. Then write `v2/design/public-pages.md`.

1. Are SharedPlay, SharedFolder, and PlatformPlayView currently dark or light theme? Is that a deliberate decision?
2. What should happen when a share link expires — a specific error page, or generic 404?
3. Should there be a "Get Coachable" CTA on shared pages for viewers without an account? If yes, where — banner, floating button?
4. Is a shared play a full read-only editor (can scrub animation, see keyframes) or a static animated preview only?
5. Should a logged-in user viewing a shared play see any difference from an anonymous viewer?
6. For PlatformPlayView — is this a single play from the platform library, and can any logged-in user copy it to their team?
7. Does SharedFolder show a list of plays with individual play cards, or does it open directly to the first play?
```

**Done looks like:** `v2/design/public-pages.md` covers SharedPlay, SharedFolder, and PlatformPlayView: layout, CTA placement, expired-link error state, and editor mode. Ready to execute.

> **Once complete:** Update the heading emoji to ✅ Done.

---

## Group 10 — Documentation hygiene (parallel with everything else)

### 10.1 — Enforce docs-in-docs/ convention ✅ Done

In the v2 new repo there is no scattered markdown to migrate — `server/` and
`src/` are built from scratch. The convention must be established from day one.

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Add a docs convention section to `v2/v2.md` as a standing rule for the new repo.

**Background:** v2 builds `server/` and `src/` from scratch, so there's no existing scattered markdown to migrate. But the convention must be documented so it's enforced from the first commit — otherwise feature docs and investigation writeups end up back inside `server/routes/` and `src/` again. The output is an updated `v2/v2.md` — no code.

**Related docs:**
- `v2/v2.md` — overall v2 principles; the convention goes here as a standing rule; read it fully first
- `v2/engineering/planning/infrastructure/security-and-code-quality.md` — CLAUDE.md and docs/INDEX.md are part of the AI-friendliness strategy that depends on this convention

**Before asking any question, check if the answer is already in the codebase or a related doc listed above. Only ask questions about future design decisions that require the user's input — not questions about how the app currently works.**

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the convention is fully decided and the rule is unambiguous. Then update `v2/v2.md`.

1. Are Slate's internal docs (`src/slate/MOBILE_EDITOR.md`, etc.) exempt from the docs-in-docs/ rule, or do those move to `docs/` too?
2. Who is responsible for updating `docs/INDEX.md` — the developer adding the doc, or a review step?
3. Are fix notes and investigation writeups ever kept as files, or always committed to git messages only?
4. Is `CLAUDE.md` at the repo root exempt (it's a navigation index, not a feature doc)?
5. Should there be a linter or CI check that fails if a `.md` file is found inside `src/` or `server/`?
```

**Done looks like:** `v2/v2.md` has a standing docs convention rule covering: which directories `.md` files are banned from, what is exempt (if anything), who maintains `docs/INDEX.md`, and whether CI will enforce the rule. `docs/INDEX.md` has an entry for every existing v2 doc.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 10.2 — Admin design standards ❌

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/design/admin-standards.md`

**Background:** Coachable's admin is internal-only — only you and staff use it. In v2 it's built from scratch alongside the app. Without a decision on whether admin follows the same design standards as the app, admin pages will be inconsistently styled and hard to maintain. The output is `v2/design/admin-standards.md` — no code.

**Related docs:**
- `v2/design/general-formatting-standards.md` — shared standards admin may or may not fully follow; read it first
- `v2/design/color-semantics.md` — `--ui-*` tokens admin surfaces should or shouldn't use
- `v2/design/component-specs.md` — whether admin uses `src/ui/` components or its own

**Before asking any question, check if the answer is already in the codebase or a related doc listed above. Only ask questions about future design decisions that require the user's input — not questions about how the app currently works.**

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until every admin design decision is made. Then write `v2/design/admin-standards.md`.

1. Should the admin match the dark app aesthetic, or is a lighter admin UI acceptable since it's internal-only?
2. Who uses the admin — just you, or are there other staff members who log in? That affects how polished it needs to be.
3. Should admin pages follow the same 4px grid and typography scale from `general-formatting-standards.md`, or does admin get looser standards?
4. Does admin use components from `src/ui/`, or does it have its own component set?
5. Is there an admin-specific CSS file (`admin.css`) in v1 — should that pattern carry over, or does admin use the same `index.css` token layer?
6. Does the admin design system page (`AdminDesignSystem.jsx`) stay in v2, or is it replaced by something else?
```

**Done looks like:** `v2/design/admin-standards.md` documents whether admin matches the app or has its own rules, the grid and typography decisions, and which `--ui-*` tokens admin surfaces use.

> **Once complete:** Update the heading emoji to ✅ Done.

---

## Group 11 — Page design specs

Components and architecture are decided in Groups 6–9. This group locks the design of each authenticated page — layout, content, empty states, and interactions — so pages can be built without open questions. Each session produces one `v2/design/pages/` doc.

### 11.1 — Plays page design spec ❌

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/design/pages/plays-page.md`

**Background:** The plays list is the core page of Coachable — it's what every coach sees after login. In v2 it is built from scratch. Before writing any code for this page, every layout, interaction, and edge-case decision needs to be documented so the build is mechanical. The output is `v2/design/pages/plays-page.md` — no code.

**Related docs:**
- `v2/design/component-specs.md` — PlayCard, FolderCard, EmptyState, TagPill specs; read it first
- `v2/engineering/planning/permissions.md` — which actions are available per role
- `v2/design/general-formatting-standards.md` — spacing, type scale, motion budget
- `v2/design/mobile/mobile-formatting-standards.md` — mobile layout decisions

**Before asking any question, check if the answer is already in the codebase or a related doc listed above. Only ask questions about future design decisions that require the user's input — not questions about how the app currently works.**

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the plays page is fully specced with no open layout, interaction, or edge-case questions. Then write `v2/design/pages/plays-page.md`.

1. Layout: is the plays list a grid of cards, a vertical list, or does the coach toggle between the two? What's the default?
2. How are folders shown — above plays in a separate section, inline mixed with plays, or via a sidebar/breadcrumb tree?
3. What's in the top bar — search, sort dropdown, filter by tag, new play button? What's the exact order and grouping?
4. Sort options: what can the coach sort by — last edited, name, date created, sport? What's the default sort?
5. What does empty state look like when there are no plays yet — what does the CTA say and where does it go?
6. What does empty state look like when a search returns no results?
7. Are there bulk actions — select multiple plays to move, archive, or delete at once? How does selection work?
8. When a play is "hidden from players," how is that indicated on the PlayCard?
9. What actions are in the PlayCard action menu — and does the list differ by role?
10. How is drag-to-folder handled on desktop? Is drag-and-drop supported, or move-via-menu only?
11. Does the new play button open inline (name input appears in the list) or navigate to a modal or new page?
12. Is there pagination, infinite scroll, or does the full list load at once?
```

**Done looks like:** `v2/design/pages/plays-page.md` documents the full layout, interactions, empty states, and role differences. Ready to build.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 11.2 — Playbooks and folders page design spec ❌

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/design/pages/playbooks-page.md`

**Background:** Coachable has both folders (private play organization) and playbooks (shareable, structured collections). In v2 the distinction needs to be clear in the UI and documented before building. The output is `v2/design/pages/playbooks-page.md` — no code.

**Related docs:**
- `v2/design/component-specs.md` — FolderCard, PlayCard, EmptyState specs; read it first
- `v2/engineering/audits/api-review.md` — `folders.js` and `playbookSections.js` routes show the current data model
- `v2/design/general-formatting-standards.md` — spacing, type scale, motion budget

**Before asking any question, check if the answer is already in the codebase or a related doc listed above. Only ask questions about future design decisions that require the user's input — not questions about how the app currently works.**

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the full folder and playbook experience is specced. Then write `v2/design/pages/playbooks-page.md`.

1. Is there a separate "Playbooks" page, or are playbooks sections within the main plays page?
2. What's the difference between a folder and a playbook from the user's perspective — is a playbook just a shareable folder?
3. Can folders be nested (folders inside folders), or is it one level only?
4. What does the inside of a folder look like — same plays list layout, or a different view?
5. Playbook sections: what's a section within a playbook — a labeled group of plays?
6. Can a coach reorder plays within a playbook? Can they reorder sections?
7. What's the sharing model for playbooks — anyone with the link, or invite-only?
8. What does a playbook's cover or title card look like — custom image, or auto-generated from the plays inside?
9. Can a play exist in multiple folders, or only one at a time?
```

**Done looks like:** `v2/design/pages/playbooks-page.md` documents the folder/playbook distinction, page layout, navigation model, and sharing interactions. Ready to build.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 11.3 — Onboarding flow design ❌

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/design/pages/onboarding-flow.md`

**Background:** New users go through onboarding to create or join a team and select their sport before they can use the app. In v2 this is built from scratch and must be designed deliberately — the onboarding drop-off rate directly affects activation. The output is `v2/design/pages/onboarding-flow.md` — no code.

**Related docs:**
- `v2/engineering/audits/api-review.md` — `onboarding.js` route covers create-team, join-team, and solo paths; read it for the current logic
- `v2/design/general-formatting-standards.md` — spacing, type scale, motion budget
- `v2/engineering/planning/routing.md` — onboarding routes and guards

**Before asking any question, check if the answer is already in the codebase or a related doc listed above. Only ask questions about future design decisions that require the user's input — not questions about how the app currently works.**

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until every onboarding path and step is fully decided. Then write `v2/design/pages/onboarding-flow.md`.

1. What are the distinct paths through onboarding — create a new team, join an existing team via invite code, or solo (no team)?
2. How many steps does the create-team path have — name, sport, invite members, or more?
3. Can a user skip any step (e.g., skip inviting members and do it later)?
4. Where does sport selection happen — during team creation, or as a first-play-creation step?
5. If a user was invited via email before signing up, does their onboarding differ — do they skip team creation entirely?
6. After onboarding completes, where does the user land — the empty plays page, a demo play, a "what next" prompt?
7. Is there a progress indicator showing which step the user is on?
8. Is email verification required before onboarding, or can the user onboard and verify later?
9. If a user navigates away mid-onboarding, is their progress saved, or do they start over?
```

**Done looks like:** `v2/design/pages/onboarding-flow.md` documents every onboarding path, each step's content, skip logic, and the post-onboarding landing state. Ready to build.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 11.4 — Player experience pages design ❌

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/design/pages/player-experience.md`

**Background:** Players have a fundamentally different experience from coaches — they can't create or edit plays, they receive assignments, and they respond to notifications. In v2 the player-facing UI needs to be designed explicitly before building, since the player role drives a significant share of DAU. The output is `v2/design/pages/player-experience.md` — no code.

**Related docs:**
- `v2/engineering/planning/permissions.md` — what players can and cannot do
- `v2/design/component-specs.md` — NotificationItem, PlayCard (read-only), EmptyState specs
- `v2/engineering/planning/features/notification-delivery.md` — how players receive notifications

**Before asking any question, check if the answer is already in the codebase or a related doc listed above. Only ask questions about future design decisions that require the user's input — not questions about how the app currently works.**

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until the full player experience is specced with no open questions. Then write `v2/design/pages/player-experience.md`.

1. What does a player see on their home/feed page — a list of assigned plays, notifications, a dashboard?
2. Can a player see all team plays, or only ones explicitly assigned to them?
3. When a player opens a play, do they see the full animation editor (read-only) or a simpler playback view?
4. Can a player respond to a play assignment — mark it as watched, answer a question, leave a comment?
5. Do players have a notifications tab, or are notifications surfaced inline on the home feed?
6. Can players see who else is on the team (roster view), or only their own profile?
7. What does empty state look like for a new player who hasn't been assigned any plays yet?
8. Can a player change their own profile — name, avatar, password? Or is account management coach-only?
9. Is the player experience meaningfully different on mobile vs desktop, or is it the same layout?
```

**Done looks like:** `v2/design/pages/player-experience.md` documents the player home page, play viewer, notification experience, and what actions players can and cannot take. Ready to build.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 11.5 — Settings pages design ❌

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/design/pages/settings-pages.md`

**Background:** Coachable has user settings (profile, email, password) and team settings (name, sport, roster, invite links). In v2 these need to be designed as a coherent settings area before building. The output is `v2/design/pages/settings-pages.md` — no code.

**Related docs:**
- `v2/engineering/audits/api-review.md` — `users.js`, `teams.js`, and `verification.js` routes show what's settable; read them
- `v2/engineering/planning/permissions.md` — which settings are owner-only vs all roles
- `v2/design/general-formatting-standards.md` — spacing, type scale, motion budget

**Before asking any question, check if the answer is already in the codebase or a related doc listed above. Only ask questions about future design decisions that require the user's input — not questions about how the app currently works.**

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until every settings page and section is fully specced. Then write `v2/design/pages/settings-pages.md`.

1. Is settings a single page with sections, or a settings nav with separate sub-pages (Account, Team, Notifications, Billing)?
2. What user-level settings exist — name, avatar, email, password, notification preferences?
3. What team-level settings exist — team name, sport, invite link, branding?
4. Who can access team settings — owner only, or all coaches?
5. Is there a "danger zone" section (delete account, leave team, delete team)? What confirmation pattern does it use?
6. Can a coach manage multiple teams from settings, or is team-switching handled elsewhere?
7. Does changing email require re-verification? What's the flow?
8. Is there a notification preferences section — what can be toggled on/off?
9. Should settings be accessible from the sidebar, the header avatar, or both?
```

**Done looks like:** `v2/design/pages/settings-pages.md` documents the settings page structure, each section's content, and the role-based access rules. Ready to build.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 11.6 — Team management pages design ❌

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/design/pages/team-management.md`

**Background:** Coaches manage their roster — inviting players, changing roles, removing members. In v2 this needs to be a properly designed page or section, not an afterthought. The output is `v2/design/pages/team-management.md` — no code.

**Related docs:**
- `v2/engineering/audits/api-review.md` — `teams.js` route covers invite, join, leave, member management; read it for the data model
- `v2/engineering/planning/permissions.md` — who can manage roster (owner vs coach vs assistant)
- `v2/design/component-specs.md` — TeamMemberCard, AvatarGroup specs

**Before asking any question, check if the answer is already in the codebase or a related doc listed above. Only ask questions about future design decisions that require the user's input — not questions about how the app currently works.**

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until team management is fully specced. Then write `v2/design/pages/team-management.md`.

1. Is team management a page in the main nav, a section inside settings, or a modal?
2. What does the roster list show per member — avatar, name, role badge, join date, last active?
3. How are invites sent — by email, by shareable invite link, or both?
4. Can the invite link be revoked or regenerated? Is there an expiry?
5. What's the role-change flow — inline dropdown on the row, or a separate modal?
6. What happens when a member is removed — immediate, or do they get notified first?
7. Can there be multiple teams? If yes, where does team creation live — settings or a team switcher?
8. Is there a pending invites view — showing who was invited but hasn't accepted yet? Can the coach cancel a pending invite?
9. Can a coach set `assistantPermissions` from the roster page, or is that a separate settings area?
```

**Done looks like:** `v2/design/pages/team-management.md` documents the roster layout, invite flow, role management, and removal behavior. Ready to build.

> **Once complete:** Update the heading emoji to ✅ Done.

---

### 11.7 — Auth and account pages design ❌

```
/grill-me

Look inside `C:\Users\ericl\Desktop\coachable\v2\` and complete the task below using the related docs as context. Read every doc listed before asking questions.

**Task:** Write `v2/design/pages/auth-pages.md`

**Background:** Login, signup, password reset, and email verification are the first pages every user sees. In v2 these are built from scratch and the UX decisions — field layout, error handling, redirect behavior — need to be locked before building. The output is `v2/design/pages/auth-pages.md` — no code.

**Related docs:**
- `v2/engineering/audits/api-review.md` — `auth.js` and `verification.js` routes show what the server supports; read them
- `v2/engineering/audits/routing-and-flash-diagnosis.md` — v1 flash/redirect bugs these pages must not repeat; read it
- `v2/design/general-formatting-standards.md` — spacing, type scale, motion budget

**Before asking any question, check if the answer is already in the codebase or a related doc listed above. Only ask questions about future design decisions that require the user's input — not questions about how the app currently works.**

The questions below are a starting point. Ask me as many additional questions as needed — one at a time, waiting for my answer before moving to the next — until all auth pages are fully specced with no open questions. Then write `v2/design/pages/auth-pages.md`.

1. Login page: email + password fields, a "forgot password" link, and a sign-up link — is that the full content, or is there also a Google/SSO option?
2. Signup page: what fields does it collect — email, name, password, confirm password? Anything else?
3. After signup, where does the user land — email verification prompt, onboarding, or directly to the app?
4. Email verification: does the code arrive as a 6-digit OTP, a magic link, or something else?
5. Password reset: what's the flow — enter email → receive link → click link → enter new password → redirect to login?
6. What error messages are shown for wrong password, unverified account, account not found?
7. Should the auth pages use the same dark theme as the app, or a lighter standalone design?
8. After a successful login, where does the user land — plays page, or the page they were trying to access (`returnTo`)?
9. Is there a "remember me" checkbox, or are sessions always session-length?
```

**Done looks like:** `v2/design/pages/auth-pages.md` documents every auth page's layout, field set, error states, and redirect behavior. Ready to build.

> **Once complete:** Update the heading emoji to ✅ Done.

---

## Reference — What is done ✅

These planning docs are complete and live in `v2/` in the v1 repo. When the
new repo is initialized (TODO 1.2), they copy to `docs/v2/` and become the
starting documentation layer.

| Initiative | Doc |
|---|---|
| General formatting standards | `docs/v2/design/general-formatting-standards.md` |
| Mobile formatting standards | `docs/v2/design/mobile/mobile-formatting-standards.md` |
| Desktop formatting standards | `docs/v2/design/desktop/desktop-formatting-standards.md` |
| Accessibility standards | `docs/v2/design/accessibility-standards.md` |
| Frontend code standards | `docs/v2/engineering/frontend-code-standards.md` |
| Backend code standards | `docs/v2/engineering/backend-code-standards.md` |
| UI testing standards | `docs/v2/engineering/planning/testing/ui-testing-standards.md` |
| Server test plan (what to test, per-route list, CI wiring) | `docs/v2/engineering/planning/testing/test-suite-plan.md` |
| Security, CI/CD, and AI-friendliness plan | `docs/v2/engineering/planning/infrastructure/security-and-code-quality.md` |
| Target file structure | `docs/v2/engineering/planning/architecture/proposed-file-structure.md` |
| Mobile Slate wiring plan (technical) | `docs/v2/engineering/planning/features/mobile-slate-plan.md` |
| API surface audit | `docs/v2/engineering/audits/api-review.md` |
| Routing and flash diagnosis | `docs/v2/engineering/audits/routing-and-flash-diagnosis.md` |
| Design system unification attempt (post-mortem) | `docs/v2/engineering/audits/design-system-unification-attempt.md` |

---

## Cross-Reference Notes

**This doc is the master work list. All v2 docs should be consistent with the status entries here.**

**Things to be aware of:**

1. **Item 1.1 done note.** The grill questions mention regenerating HTML reference pages after token rename. Those HTML pages (`mobile-standards.html`, `desktop-standards.html`) were removed instead — visual examples will come from the component consolidation work (Group 6).

2. **`design/mobile/mobile-ui-standards.md`** — Older doc (pre-v2 formatting standards) with superseded content. Superseded by `mobile-formatting-standards.md` + `color-semantics.md`. Does not copy to the new repo.

3. **Item 3.2 "Done looks like"** — `v2/engineering/planning/api-standards.md` now exists. ✅

4. **Group 11 depends on Groups 6–7.** Page design specs reference component specs and the permission model. Run 11.x sessions after 6.3, 6.4, 7.2, and 7.4 are complete.
