# v2 TODO — Upgrade Initiative List

v2 is a complete rebuild in a new repo. Both `server/` and `src/` are
written from scratch. The only thing ported from v1 is the Slate canvas
editor. The v1 repo stays live and untouched as prod until v2 is ready
to cut over.

Each item is a major workstream. Work top to bottom. Items within a group
can run in parallel; groups generally depend on the ones above them.

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

**Done looks like:** `src/index.css` in the new repo has the complete `--ui-*`
token set per `design/color-semantics.md`. No `BrandX` classes used directly
in components — only `--ui-*` vars.

---

### 1.2 — Initialize new repo ❌

Creating the new repo and establishing the starting structure. The v1 repo
is untouched — this is a fresh GitHub repo for Coachable v2.

**Steps:**
1. Create new GitHub repo (e.g. `coachable-v2`)
2. Copy `src/slate/` from v1 as the starting point for the editor
3. Copy `v2/` planning docs folder into `docs/` in the new repo
4. Scaffold the full `src/` and `server/` directory trees per `proposed-file-structure.md`
5. Set up `package.json`, `vite.config.js`, `index.html`, `eslint.config.js`, `tailwind.config.js`
6. Write `CLAUDE.md` as an AI navigation index (per TODO 1.5)
7. Wire Railway to the new repo (per TODO 1.6)

**Done looks like:** New repo exists on GitHub. `src/slate/` is present and
working. `src/ui/index.js` barrel exists. All other folders scaffolded but
empty. `App.jsx` and `main.jsx` scaffolded with lazy imports. Server runs
with `node server/index.js` and returns a health check on `/api/health`.

---

### 1.3 — CI/CD pipeline ❌

Wiring pre-push hooks (Husky), GitHub Actions (lint + test on every push),
Dependabot, Secret Scanning, and Snyk. Plan is finalized in
`engineering/planning/infrastructure/security-and-code-quality.md`.

**Decisions made:**
- Pre-push hook: `npm test && npm run lint && npm audit --audit-level=high` via Husky. Wire after first tests pass.
- CI triggers on pushes to `main`. Runs lint + frontend tests; `test:server` step commented out until TODO 3.1 ships.
- `CI_ADMIN_HASH` GitHub secret = bcrypt hash of the admin password. Set in GitHub repo Settings → Secrets.
- Dependabot: manual review on all PRs, no auto-merge.
- Secret Scanning: enable in GitHub repo settings (not on by default).
- Snyk Code: free tier SAST. `eslint-plugin-security` + `eslint-plugin-no-secrets` alongside it.
- CodeRabbit: deferred until first collaborator joins.

**Done looks like:** Husky installed, `.husky/pre-push` committed, `.github/workflows/ci.yml`
committed, `.github/dependabot.yml` committed, Secret Scanning enabled in GitHub
settings, Snyk wired as GitHub Action, ESLint plugins added to config.

---

### 1.4 — Environment and secrets management ❌

Defining and documenting how secrets move between dev, production, and any
future staging environment.

**Grill questions:**
- What env vars are set in the Railway production dashboard right now? Is there a `.env.example` that covers all of them or are some undocumented?
- JWT is stored in localStorage under `coachable_token`. If `JWT_SECRET` is rotated, every logged-in user gets signed out immediately — is that acceptable or does it need a grace period with two valid secrets?
- R2 credentials — are those shared between dev and production or does dev use a separate bucket? Does dev currently hit the real R2 bucket?
- `RESEND_API_KEY` — is there a dev key and a prod key, or does dev also send real emails?
- How does a new developer get from zero to a running local server right now — is there any documented setup or is it tribal knowledge?

**Done looks like:** `docs/environment.md` documents every env var, which
environment it belongs to, and how to rotate it. A new contributor can get
the app running locally in under 30 minutes by following it.

---

### 1.5 — CLAUDE.md and docs index ❌

Rewriting `CLAUDE.md` from an instruction list into an AI navigation index.
Creating `docs/INDEX.md` as a master table of every doc with a one-line description.

**Grill questions:**
- `CLAUDE.md` currently has deployment instructions, the CRAWLER_MAP reference, and code rules. Should CRAWLER_MAP.md be absorbed into `docs/INDEX.md` or kept as its own file?
- If a cold Claude session reads only `CLAUDE.md`, what are the 5 most important things it needs to know to be immediately useful — where auth lives, where routes are, how the play editor is structured?
- The current CLAUDE.md has rules like "always ask clarifying questions before proceeding." Should those stay in CLAUDE.md or move to a separate `docs/contributing.md`?

**Done looks like:** `CLAUDE.md` tells an AI assistant where every domain of
the codebase lives and how the auth system works in under one page. `docs/INDEX.md`
lists every doc with a description.

---

### 1.6 — Railway setup for v2 repo ❌

Connecting the new repo to Railway so builds are automatic and the app
runs in a hosted environment during development.

**Setup:**
- New Railway project for v2 (separate from the v1 `resplendent-inspiration` project)
- One service per environment: `coachable-v2-dev` (always-on dev) and `coachable-v2-prod` (launch target)
- Each service gets its own PostgreSQL database — no shared DB with v1
- `ENVIRONMENT=development` on dev service; `ENVIRONMENT=production` on prod service
- v1 Railway project stays live and unchanged until cutover
- Cutover: when v2 is ready, update DNS/domain to point at `coachable-v2-prod`. v1 service stays up briefly as fallback, then decommissioned.

**Done looks like:** `coachable-v2-dev` Railway service is live, auto-deploys
on push to `main`, and serves the app at a `.railway.app` URL. PostgreSQL
service is connected. All env vars documented in `docs/environment.md` (TODO 1.4).

---

## Group 2 — Database

### 2.1 — Migration system formalization ❌

The current `schema.sql` is 942 lines of mixed `CREATE TABLE` and `ALTER TABLE`
with safe-re-run guards.

**Grill questions:**
- Has `schema.sql` ever been run more than once on the production database? Are the `IF NOT EXISTS` guards actually complete for every `ALTER TABLE` statement or are some bare?
- If a new column needs to be added right now, what's the exact process — edit `schema.sql` and run the whole file, or add a one-off `ALTER` statement manually?
- What would happen if `schema.sql` ran on a database that already had the full schema — would it error, no-op, or silently corrupt something?
- Preference: keep the single-file approach with stricter discipline, or switch to numbered migration files (`001_initial.sql`, `002_add_folders.sql`) with a migrations tracking table?

**Done looks like:** `docs/database.md` has a migrations section documenting
the chosen approach (single-file vs numbered), how to add a migration, and
the exact procedure for running one in production.

---

### 2.2 — Database backup and recovery strategy ❌

**Grill questions:**
- What Railway plan is the project on — does it include automated PostgreSQL backups? If yes, what's the retention window?
- Has a restore ever been tested? If the DB was corrupted right now, what would the recovery process be and who would do it?
- What's the acceptable data loss window — losing the last hour of coach edits, the last 24 hours, more?
- Are there tables where data loss would be catastrophic vs recoverable (e.g. user accounts vs play thumbnail cache)?

**Done looks like:** `docs/database.md` has a backup section that answers all
of the above. A recovery has been tested at least once.

---

### 2.3 — Index and query performance audit ❌

**Grill questions:**
- The plays query does `WHERE team_id = $1 AND archived_at IS NULL ORDER BY updated_at DESC` — is there a compound index on `(team_id, archived_at, updated_at)` or just individual column indexes?
- The notifications query joins `notification_recipients` on `user_id`. Does that column have an index?
- Have you seen any slow page loads in production that could be query-related?
- Is `EXPLAIN ANALYZE` something you've run on the production DB or only locally?

**Done looks like:** `engineering/audits/query-performance.md` documents the
three most critical query patterns, their current `EXPLAIN ANALYZE` plans,
and the index changes needed to improve them. Ready to execute.

---

### 2.4 — Schema documentation ❌

**Grill questions:**
- How many tables are there total? Which ones have relationships that aren't obvious from the column names alone?
- Are there invariants that aren't enforced by DB constraints — for example, "a team must have exactly one owner" or "a play can only be in one folder at a time"?
- The `notifications` table has a `blocks` column — is that JSONB? What's the shape of a block object?

**Done looks like:** `docs/database.md` has a table-by-table description:
what each table stores, what it references, and what the important constraints mean.

---

## Group 3 — Backend

### 3.1 — Server integration test suite ⚠️

Writing the full server-side test suite with Vitest + Supertest against a
real test database. Plan is in `engineering/planning/testing/test-suite-plan.md`.

**Grill questions:**
- Does `server/db/migrate.js` exist yet and work headlessly — takes `DATABASE_URL` from env, no prompts? That's the prerequisite for CI running tests against a fresh schema.
- What's the seed data strategy — hard-coded fixture objects in `tests/helpers/seed.js`, or does each test bootstrap state by hitting the actual signup/create-team routes?
- Is there a test DB running locally right now or does this need to be set up from scratch?

**Done looks like:** `engineering/planning/testing/test-suite-plan.md` is
the complete server test plan: every route listed with its test cases, seed
strategy decided, test DB setup documented, and CI wiring specified. Ready to execute.

---

### 3.2 — API contract and error model ❌

`apiFetch` throws on non-2xx. Client function names are inconsistent (`fetchPlays`, `apiDeletePlay`, `apiToggleFavorite`).

**Grill questions:**
- `apiFetch` throws on non-2xx — does that mean every call site needs a try/catch? Looking at `Plays.jsx`, functions like `handleDeletePlay` — do those have try/catch today or do failures silently disappear?
- The naming is inconsistent: `fetchPlays`, `deletePlay as apiDeletePlay`, `apiToggleFavorite`. Should the standard be REST verb prefix (`getPlays`, `deletePlay`, `updatePlay`) or something else?
- When an API call fails, does the user see a toast, a console error, or nothing? Where does error surfacing happen today?
- For optimistic updates (e.g. toggling favorite) — if the server call fails, does the UI roll back, or does it stay in the wrong state?

**Done looks like:** `engineering/planning/api-standards.md` covers error
contract, naming convention, auth expiry handling, and optimistic update pattern.
All `src/utils/api/` files renamed to match.

---

### 3.3 — Security hardening ❌

**Grill questions:**
- `CORS_ORIGINS` env var exists. Is it actually wired in `server/index.js` right now, or is it defined but not used?
- Auth routes (login, signup, forgot-password, reset-password) — is there any rate limiting on them currently?
- JWT is in localStorage — XSS-accessible. Is that a known accepted tradeoff or something to address?
- `server/lib/validate.js` has `requireString`, `optionalString`, etc. Are those used on every route that accepts user input, or are there routes where `req.body.x` flows directly into a query?
- `npm audit --audit-level=high` — has that been run recently? Any known high/critical vulnerabilities?

**Done looks like:** `engineering/audits/security-hardening.md` documents
every security gap found — missing auth guards, unprotected routes, rate
limiting gaps, CORS/CSP configuration — and specifies the fix for each.
Ready to execute.

---

### 3.4 — Route-level JSDoc pass ❌

**Grill questions:**
- Some routes already have JSDoc (`notifications.js` has it, `plays.js` has a helper JSDoc). Is the format consistent or does each file do it differently?
- What's the minimum JSDoc needed to be useful to Claude — just auth requirement and return shape, or also request body schema?
- Routes that are intentionally public (shared play view, platform plays) — should those explicitly say "no auth required" in JSDoc so it's obvious vs accidentally missing?

**Done looks like:** `engineering/backend-code-standards.md` specifies the
exact JSDoc format required for every route handler, with a worked example
and the required fields (auth requirement, request body, return shape).
Ready to execute the pass.

---

## Group 4 — Production readiness

### 4.1 — Error monitoring ❌

The server has only `console.log`. `errorReporter.js` sends client errors to
the admin backend but there is no external aggregation or alerting.

**Grill questions:**
- Is Sentry the call or is something else on the table? What's the budget?
- The custom `errorReporter.js` currently sends to `/api/error-reports` which stores in the DB and surfaces in the admin. Should that be kept and augmented with Sentry, or replaced entirely?
- Should client errors and server errors go to the same Sentry project or separate ones?
- What's the alert threshold — every unhandled error, or only when error rate spikes above some baseline?

**Done looks like:** `engineering/planning/infrastructure/ops-setup.md` has
an error monitoring section: tool decision, Sentry project structure (server
vs client), and alert thresholds. All decisions made. Ready to execute.

---

### 4.2 — Structured logging ❌

**Grill questions:**
- Is pino the right choice or is a hand-rolled JSON middleware sufficient at this scale?
- What fields need to be on every log line — request ID, user ID, route, status, response time?
- Are there fields that must never be logged — tokens, passwords, raw play data?
- Does Railway's log view support filtering on JSON fields, or do logs need to go to an external drain for structured queries to be useful?

**Done looks like:** `engineering/planning/infrastructure/ops-setup.md` has
a logging section: tool decision (pino vs hand-rolled), required fields on
every log line, and the explicit list of fields that must never be logged.
Ready to execute.

---

### 4.3 — Health check endpoint ❌

**Grill questions:**
- Does Railway have a default health check path it expects, or can `/health` be configured freely in Railway settings?
- Should the check verify the DB pool is accepting queries, or just that the process is alive?
- Should R2 connectivity be checked or just the DB?

**Done looks like:** `engineering/planning/infrastructure/ops-setup.md` has
a health check section: what the endpoint verifies (DB pool only vs R2),
Railway configuration steps, and the expected response shape. Ready to execute.

---

### 4.4 — Uptime monitoring ❌

**Grill questions:**
- Should alerts go to email, phone (SMS), or both? What's the acceptable time-to-know — 1 minute of downtime, 5 minutes?
- BetterStack, UptimeRobot, or Checkly — preference, or just whatever has the best free tier?

**Done looks like:** `engineering/planning/infrastructure/ops-setup.md` has
an uptime monitoring section: tool decision, check interval, and alert routing
(email vs SMS, who gets notified). Ready to execute.

---

### 4.5 — Frontend performance baseline ❌

The bundle includes `@ffmpeg/core` (WASM, can exceed 30MB), `@mui/material`,
`react-konva`, `recharts`, and the full Slate editor.

**Grill questions:**
- Has a Lighthouse run ever been done on the main app route? What's the current LCP on a cold load?
- Is `@ffmpeg/core` loaded eagerly on page load or only when the GIF export modal opens? If it's eager that alone could be the main bundle problem.
- What's the acceptable LCP target — under 2.5s, 3s, something else?

**Done looks like:** `engineering/audits/performance-baseline.md` captures
Lighthouse results (LCP, CLS, TBT) and Vite bundle output as the pre-optimization
baseline. Referenced again after MUI removal (7.1) to measure improvement.

---

## Group 5 — Platform

### 5.1 — Billing and monetization ❌

**Grill questions:**
- Is there a timeline for monetization or is this intentionally deferred until user count grows to a threshold?
- If a pricing model were designed today, what would the tiers be — free for individuals, paid for teams? Per seat or flat team price?
- Which features would be gated — mobile editor, GIF export, playbook sections, team size limits?
- Stripe subscriptions vs one-time payment — is this a recurring SaaS model?

**Done looks like:** Either "not in v2" is documented as an intentional decision,
or `docs/billing.md` describes the Stripe integration plan before any code is written.

---

### 5.2 — Email deliverability ❌

**Grill questions:**
- What domain does Resend send from — `coachableplays.com` or a subdomain? Are SPF, DKIM, and DMARC records configured on that domain right now?
- Has anyone tested whether signup verification emails land in the inbox or spam on Gmail, Yahoo, and Apple Mail?
- Are there any user reports of not receiving verification or invite emails?

**Done looks like:** `engineering/audits/email-deliverability.md` records the
DNS configuration, mxtoolbox results, and inbox test results per provider.
Ready to execute.

---

### 5.3 — Storage and media lifecycle ❌

**Grill questions:**
- When a play is deleted, what happens to any GIF or video exports generated from it — do they stay in R2 indefinitely?
- Is there a max file size enforced server-side for R2 uploads, or can a user export a 500MB video with no limit?
- How many active teams are there and roughly how many exports have been generated — is R2 cost already noticeable?
- Should exports be ephemeral (TTL-deleted after 24 hours) or persistent (tied to the play, deleted when the play is deleted)?

**Done looks like:** `engineering/planning/features/media-lifecycle.md`
documents the TTL decision, size limit, cleanup approach, and R2 cost baseline.
Ready to execute.

---

### 5.4 — Real-time and notification delivery ❌

Notifications are fetched on demand, capped at 100. There is no push mechanism.

**Grill questions:**
- What's the acceptable delay — a player needs to know within how long that a new play was assigned? Seconds, minutes, next time they open the app?
- How many concurrent logged-in users are there at peak? That determines whether polling or SSE makes sense.
- The `notifications` table has a `priority` column — is high-priority supposed to deliver faster, or is priority only about display order?
- If polling: what interval — 30 seconds, 60 seconds? Does it happen on every page or only the notifications page?

**Done looks like:** `engineering/planning/features/notification-delivery.md`
documents the chosen approach (polling vs SSE), the interval, and how priority
affects delivery. Ready to execute.

---

### 5.5 — SEO for public pages ❌

`sportSeo.js` and `usePageMeta.js` exist but coverage is unknown.

**Grill questions:**
- Which pages need SEO treatment — SharedPlay, SharedFolder, PlatformPlayView, Landing, Enterprise, PublicPlaybooks? Which are actually indexable vs require auth?
- Is there a `/sitemap.xml` right now? Are canonical URLs set on any page?
- When a coach shares a play link, what should the OG preview card show — play title, sport, a screenshot/thumbnail?
- Does a shared play have a stable canonical URL or does it vary?

**Done looks like:** `engineering/planning/features/seo-plan.md` documents
which pages are covered, OG tag specs, and the sitemap approach. Ready to execute.

---

## Group 6 — Component library (src/ui/)

Building the shared component layer at `src/ui/` from scratch. Every component is written new against the component specs — no code is extracted or ported from the v1 codebase. The v1 `design-system-unification` branch (`engineering/audits/design-system-unification-attempt.md`) produced a solid component list and `--ui-*` token vocabulary worth referencing, but the implementations themselves start fresh.

### 6.1 — Component prop convention ❌

**Grill questions:**
- Should all `src/ui/` components accept a `className` prop for one-off styling, or does that create escape-hatch inconsistency?
- Size values — `sm`/`md`/`lg`, numeric px, or Tailwind size names?
- How are loading states handled on Button — a `loading` boolean that shows a spinner inside the button, or a wrapper?
- Variant naming for Button: `primary`/`secondary`/`ghost`/`destructive` — are those the four, or are there others?
- `AppMessageContext` handles toasts today. Does `Toast` in `src/ui/` replace that context entirely, or is Toast a display component and the context stays for managing toast queue state?

**Done looks like:** `design/component-specs.md` covers the prop convention and specs
Button, Input, Modal, and Toast with variant tables and examples.

---

### 6.2 — Build primitives in src/ui/ ❌

**Grill questions:**
- Should `Modal` use a React portal (`createPortal`) to escape stacking context issues?
- The current toast pattern fires via `AppMessageContext`. Should `Toast` in `src/ui/` be a purely display component, with `AppMessageContext` still managing the queue?

**Done looks like:** `design/component-specs.md` updated to confirm each
primitive is complete. Ready to execute.

---

### 6.3 — Build display and domain components in src/ui/ ❌

**Grill questions:**
- `PlayCard` — what props does it need to serve app, admin, and platform plays surfaces? Define the prop API before building.
- `NotificationItem` — is the block renderer (the `blocks` JSONB array with question/text/etc. types) part of `NotificationItem` or a separate component?

**Done looks like:** `design/component-specs.md` updated with the full
component list. Ready to execute.

---

### 6.4 — Build layout and shell components ❌

**Grill questions:**
- Does `Sidebar` compose nav items as children or accept them as a prop array?
- Does the admin share the app shell (`PageShell`) or have its own layout wrapper?
- `PageShell` — does it include sidebar + header together, or are they composed by the consumer?

**Done looks like:** `design/component-specs.md` updated with shell component
specs and composition rules. Ready to execute.

---

## Group 7 — Frontend architecture

### 7.1 — MUI removal ❌

**Grill questions:**
- Where is MUI actually used right now — which components and what specifically (`DataGrid`, `Autocomplete`, `DatePicker`, etc.)? Running `grep -r "@mui" src/` would answer this.
- Is there anything MUI provides with complex built-in accessibility behavior (e.g. focus trap, ARIA) that would need to be rebuilt from scratch?

**Done looks like:** `engineering/audits/performance-baseline.md` updated
with post-MUI-removal bundle sizes to document the improvement against the
4.5 baseline. Ready to execute.

---

### 7.2 — Routing v2 ❌

**Grill questions:**
- `App.jsx` has all routes today. Should it split into feature routers (one per domain: app, admin, auth) or stay as a single file with logical sections?
- How does `returnTo` work currently — is there a query param on the login redirect that brings the user back after auth? Where does that get set and consumed?
- Are there route guards beyond `requireAuth` — for example, a guard blocking unverified users or users who haven't completed onboarding?
- Should admin routes have a separate layout wrapper (`AdminShell`) or share the app shell?

**Done looks like:** `engineering/planning/routing.md` documents the v2 route
structure. Lazy loading is active for admin and Slate routes. Route guards are consistent.

---

### 7.3 — State management decision and implementation ❌

`Plays.jsx` has 30+ useState calls. No Zustand or React Query today.

**Grill questions:**
- In `Plays.jsx`, what's actually server state (plays list, folders list) vs local UI state (menu open, rename input value, toast)? The goal is to understand how much of the 30+ useStates are real complexity vs UI noise.
- Is there any data that needs to be shared across pages today — for example, does the notification badge in the sidebar need to sync with `NotificationsContext`? That's what would push toward Zustand.
- React Query vs SWR for server state — any preference? The main value is caching, automatic refetch, and built-in loading/error states.
- If React Query handles the plays list, does the optimistic update on favorite toggle become a React Query mutation or stay manual?

**Done looks like:** `engineering/planning/state-management.md` documents the
decision. Plays.jsx serves as the reference implementation.

---

### 7.4 — Permission abstraction ❌

`Plays.jsx` has `const isCoach = (user?.role === "coach" || user?.role === "owner") && !playerViewMode` inline. `assistantPermissions` is an object on the user with `canCreateEditDeletePlays`, `canManageRoster`, `canSendInvites`.

**Grill questions:**
- What are all the permission flags that need to exist — `canCreatePlay`, `canEditPlay`, `canDeletePlay`, `canManageRoster`, `canSendInvites`, `canViewAdmin`, `canViewTrash` — what else?
- Should `usePermissions()` fold `assistantPermissions` in directly, or is there a separate path for assistant coach permissions?
- `playerViewMode` overrides role — should `usePermissions()` take that into account internally, or is it the caller's job to check?
- Are there team-level settings that affect permissions (some teams restrict what coaches can do) or is it purely role-based?

**Done looks like:** `engineering/planning/permissions.md` documents all
permission flags, the role matrix, and how `assistantPermissions` and
`playerViewMode` are handled. Ready to execute.

---

### 7.5 — Error boundaries ❌

**Grill questions:**
- Should the boundary show a retry button or just an error message with a "go home" link?
- The boundary needs to report to monitoring (4.1). Should it be written now with a no-op report function, or should 4.1 be done first?
- Should there be nested boundaries (per section of a page) or one per route?

**Done looks like:** `engineering/frontend-code-standards.md` updated with
the error boundary pattern: component location, fallback UI spec, and the
requirement that every route is wrapped. Ready to execute.

---

### 7.6 — isMobile JS check elimination ❌

`Plays.jsx` has `const MOBILE_BREAKPOINT = 768` and uses `window.matchMedia` in a useEffect. Same pattern is repeated across multiple page components.

**Grill questions:**
- Which behaviors in `Plays.jsx` gated on `isMobile` can become CSS-only (hiding a button, changing layout), vs which truly require JS (disabling canvas interaction)?
- `canCreatePlay = isCoach && !isMobile` is going away once mobile editing is enabled (9.2). Is the isMobile elimination in 7.6 blocked on 9.2 or independent?
- If a shared `useBreakpoint()` hook is written, should it return a single `isMobile` boolean or a more general breakpoint value (`sm`/`md`/`lg`)?

**Done looks like:** `engineering/frontend-code-standards.md` updated to
document the hook API and which behaviors should remain CSS-only vs require JS.
Ready to execute.

---

### 7.7 — Feature flag integration ❌

`AdminFlagGate.jsx` exists. `FeatureFlagContext.jsx` provides flags. Usage is inconsistent.

**Grill questions:**
- How are flags loaded today — does `FeatureFlagContext` fetch `/api/flags` on mount? Are they re-fetched on navigation or only once per session?
- Should `AdminFlagGate` generalize into `src/ui/FlagGate.jsx` that works everywhere, or is the inline `useFeatureFlags()` pattern preferred for non-admin gates?
- Can a flag be toggled in the admin and take effect without a page refresh, or does the user need to reload?
- What's the rule for how a developer reading a component knows it's behind a flag — a comment, a JSDoc note, something else?

**Done looks like:** `engineering/planning/feature-flags.md` documents the
chosen pattern, how flags are loaded, and the developer convention for marking
flagged components. Ready to execute.

---

## Group 8 — UI testing

### 8.1 — Establish Vitest config and write first tests ❌

The v1 browser-based test suites in `src/testing/suites/` do not carry over
to the `stage` branch. The new build starts with no existing UI tests.

**What this means:** Skip directly to building the test infrastructure from
scratch. Set up `vitest.config.js` with JSDOM environment, write `src/tests/renderAs.js`
and `src/tests/assertions.js` per `ui-testing-standards.md`, and write the
first co-located role tests alongside the first pages built in 8.2.

**Grill questions:**
- What mock strategy for API calls in UI tests — MSW (intercept at network level) or `vi.mock` the api module?
- `assistant_coach` is a role with `assistantPermissions` that differ from regular coaches. Does it need its own fixture, or share the coach fixture with permission overrides?

**Done looks like:** `src/tests/renderAs.js`, `src/tests/assertions.js`, and
`src/tests/fixtures/` exist and work. At least one page has a co-located
`tests/` folder with a passing `roles.test.js`. Ready to execute.

---

### 8.2 — Role-based UI test suite ❌

Full role-based test suite per `engineering/planning/testing/ui-testing-standards.md`.

**Grill questions:**
- Does `renderAs(role)` exist anywhere yet, or does it need to be written from scratch per the standards doc?
- What's the mock strategy for API calls in UI tests — MSW (intercept at network level), `vi.mock` the api module, or something else?
- `assistant_coach` is a role with `assistantPermissions` that differ from regular coaches. Does it need its own fixture, or can it share the coach fixture with permission overrides?

**Done looks like:** `engineering/planning/testing/ui-testing-standards.md`
has a complete role-based test suite section: `renderAs(role)` helper spec,
mock strategy decision, and the per-page test file list. Ready to execute.

---

## Group 9 — Core product

### 9.1 — Slate UX standards ❌

**Grill questions:**
- The draw tool has multiple modes (pen, arrow, shape, eraser). Is the state machine mutually exclusive — can a player be selected at the same time as draw mode is active?
- Field orientation: some sports are vertical (basketball), some horizontal (football). Is orientation decided per-sport or can a coach rotate within the editor?
- When a coach adds a keyframe, what gets captured — all player positions, or only positions of players that moved since the last keyframe?
- Undo/redo scope: does undo go back one atomic action (move one player) or one gesture (a full drag)?
- On mobile, what's the gesture for "select player" vs "pan canvas" vs "start drawing" — is that already decided and in `MOBILE_EDITOR.md`?

**Done looks like:** `design/slate/slate-ux-standards.md` is as thorough as
`desktop-formatting-standards.md`. The mobile Slate UX is fully specified.

---

### 9.2 — Mobile editor launch ⚠️

Blocked on 9.1 confirming the mobile editor UX is ready for users.
Wiring plan is in `engineering/planning/features/mobile-slate-plan.md`.

**Grill questions:**
- Which sports have been tested end-to-end on mobile and confirmed working — football, basketball, soccer, lacrosse?
- Is `MobileViewOnlyGate` the only block or are there other `!isMobile` checks in the editor path — `PlayNew.jsx`, `Plays.jsx`?
- Is `mobileLayout` already accepted as a prop by `Slate.jsx` in the user-facing version, or only in the admin path?

**Done looks like:** `engineering/planning/features/mobile-slate-plan.md`
updated to mark the launch complete and note any divergences from the wiring
plan. Ready to execute.

---

### 9.3 — PlayerViewMode UX ❌

`playerViewMode` is a boolean in `AuthContext`. `Plays.jsx` uses `&& !playerViewMode` in all role checks.

**Grill questions:**
- How does a coach currently toggle `playerViewMode` — is there any UI for it, or is it only accessible via a dev tool?
- What should be hidden in playerViewMode — just coach action buttons, or also UI chrome that reveals coach-only information like `hiddenFromPlayers` badges?
- Does `playerViewMode` persist across page navigation and refreshes, or is it session-only (reset on refresh)?
- Should a coach in playerViewMode see a persistent indicator (a banner, a badge in the nav) so they don't forget?

**Done looks like:** `design/player-view-mode.md` documents what is hidden
in playerViewMode, the indicator spec, toggle placement, and persistence
behavior. Ready to execute.

---

### 9.4 — Shared and public page redesign ❌

**Grill questions:**
- Are SharedPlay, SharedFolder, and PlatformPlayView currently dark or light? Is that a deliberate decision?
- What should happen when a share link expires — a specific error page, generic 404?
- Should there be a "Get Coachable" CTA on shared pages for viewers without an account — and if so, where (banner, floating button)?
- Is a shared play a full read-only editor (can scrub animation, see keyframes) or a static animated preview only?

**Done looks like:** `design/public-pages.md` is the spec — covers SharedPlay,
SharedFolder, and PlatformPlayView: layout, CTA placement, expired-link error
state, and editor mode. Ready to execute.

---

## Group 10 — Documentation cleanup (parallel with everything else)

### 10.1 — Migrate scattered markdown to docs/ ❌

`server/routes/` has `DEMO_VIDEOS.md`, `FORGOT_PASSWORD.md`, `PLAY_COPY_ANALYTICS_FIX.md`.
`src/pages/` has `MOBILE_EDITOR.md`, `HIDE_FROM_PLAYERS.md`, `NOTIFICATIONS_PAGE.md`, and more.

**Grill questions:**
- When these move to `docs/`, do any of them have links or references in code comments that would break?
- `CRAWLER_MAP.md` at the root maps features to files. Does that move to `docs/` or stay at root for Claude to find easily?
- Some files are fix notes (`PLAY_COPY_ANALYTICS_FIX.md`, `CODEX_VIDEO_EXPORT_FIX.txt`). Are those worth keeping now that the fix is already in, or just delete them?

**Done looks like:** `docs/INDEX.md` has an entry for every file moved.
Ready to execute.

---

### 10.2 — Admin design standards ❌

**Grill questions:**
- The admin has its own `admin.css`. Is the intent for admin to match the dark app, or is a lighter admin UI acceptable since it's internal-staff-only?
- Who uses the admin — just you, or are there other staff members who log in? That affects how polished it needs to be.
- Should admin pages follow the same 4px grid and typography scale from `general-formatting-standards.md`, or does the admin get its own looser standards?

**Done looks like:** `design/admin-standards.md` documents whether admin matches
the app or has its own rules, the grid and typography decisions, and which
`--ui-*` tokens admin surfaces use. No ambiguity about how an admin page should look.

---

## Reference — What is done ✅

| Initiative | Doc |
|---|---|
| General formatting standards | `design/general-formatting-standards.md` |
| Mobile formatting standards | `design/mobile/mobile-formatting-standards.md` |
| Desktop formatting standards | `design/desktop/desktop-formatting-standards.md` |
| Accessibility standards | `design/accessibility-standards.md` |
| Frontend code standards | `engineering/frontend-code-standards.md` |
| Backend code standards | `engineering/backend-code-standards.md` |
| UI testing standards | `engineering/planning/testing/ui-testing-standards.md` |
| Server test plan (what to test, per-route list, CI wiring) | `engineering/planning/testing/test-suite-plan.md` |
| Security, CI/CD, and AI-friendliness plan | `engineering/planning/infrastructure/security-and-code-quality.md` |
| Target file structure | `engineering/planning/architecture/proposed-file-structure.md` |
| Mobile Slate wiring plan (technical) | `engineering/planning/features/mobile-slate-plan.md` |
| API surface audit | `engineering/audits/api-review.md` |
| Routing and flash diagnosis | `engineering/audits/routing-and-flash-diagnosis.md` |
| Design system unification attempt (post-mortem) | `engineering/audits/design-system-unification-attempt.md` |

---

## Cross-Reference Notes

**This doc is the master work list. All v2 docs should be consistent with the status entries here.**

**Things to be aware of:**

1. **Item 1.1 done note.** The grill questions mention regenerating HTML reference pages after token rename. Those HTML pages (`mobile-standards.html`, `desktop-standards.html`) were removed instead — visual examples will come from the component consolidation work (Group 6).

2. **`design/mobile/mobile-ui-standards.md`** — Older doc (pre-v2 formatting standards) with superseded content. Superseded by `mobile-formatting-standards.md` + `color-semantics.md`. Retire it: add a deprecation header pointing to the current docs, then ignore it.

3. **Item 3.2 "Done looks like"** — References `engineering/planning/api-standards.md`. This doc does not exist yet. Consistent with ❌ Not started status.

4. **All file paths in the done table** use the current `v2/` prefix (v1 repo location). In the new repo, these docs live at `docs/v2/` from the start per the file structure plan.
