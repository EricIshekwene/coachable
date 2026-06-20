# v2 TODO — Full-Stack Initiative List

Each item is a major workstream — roughly the same size as building the
testing standards. Work top to bottom. Items within a group can run in parallel;
groups generally depend on the ones above them.

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

### 1.1 — Design token and color system ❌
Deciding the complete token set every component and page will reference.
Confirms dark-first vs light. Adds semantic tokens (--color-error,
--color-warning, --color-success, --color-destructive) to `src/index.css`.
Audits existing BrandX tokens against v2 component library needs.

**Done looks like:** `src/index.css` has a complete named token set. A companion
`design/color-semantics.md` maps each semantic role to a specific token with
a usage rule and a contrast check.

---

### 1.2 — File structure migration ❌
Executing the proposed v2 structure. Moving source files into `src/app/`,
`src/admin/`, `src/auth/`, `src/slate/`, `src/ui/`, `src/marketing/`,
`src/shared-pages/`, `src/staff/`. Moving all scattered `.md` files into
`docs/`. Updating all imports.

**Done looks like:** Codebase matches the proposed structure. All imports
resolve. Dev server runs. No markdown in `server/routes/` or `src/pages/`.
`CLAUDE.md` updated to reflect new paths.

---

### 1.3 — CI/CD pipeline ⚠️
Wiring pre-push hooks (Husky), GitHub Actions (lint + test on every push),
Dependabot, and Secret Scanning. Plan is already written in
`engineering/planning/infrastructure/security-and-code-quality.md`.

**Done looks like:** `.github/workflows/ci.yml` is active. Pre-push hook
blocks on failing lint or tests. Dependabot config is in the repo. GitHub
Secret Scanning is enabled. Snyk is connected.

---

### 1.4 — Environment and secrets management ❌
Defining and documenting how secrets move between dev, production, and any
future staging environment. Covers: which env vars are required vs optional,
how to rotate JWT_SECRET and RESEND_API_KEY without downtime, how a new
developer gets a working local setup, and where secrets live (Railway dashboard,
`.env.local`, CI secrets). `.env.example` exists but there is no onboarding
doc for getting from zero to running.

**Done looks like:** `docs/environment.md` documents every env var, which
environment it belongs to, and how to rotate it. A new contributor can get
the app running locally in under 30 minutes by following it.

---

### 1.5 — CLAUDE.md and docs index ❌
Rewriting `CLAUDE.md` from an instruction list into an AI navigation index
(template is in `security-and-code-quality.md`). Creating `docs/INDEX.md`
as a master table of every doc with a one-line description.

**Done looks like:** `CLAUDE.md` tells an AI assistant where every domain of
the codebase lives and how the auth system works in under one page. `docs/INDEX.md`
lists every doc with a description.

---

### 1.6 — Staging environment and branch strategy ❌
Setting up a true second environment so all new work is tested on stage before
it ever reaches production. Three parts:

**Git strategy — decision needed:**
Adopt `feature/* → stage → main`. All feature branches merge into `stage`.
Once a week (or when stable), open a PR from `stage → main` as the release.
Never commit directly to `main`. This must be documented and enforced via
branch protection rules on GitHub.

**Railway — decision needed:**
Create a second Railway environment called `stage` inside the existing project.
It gets its own PostgreSQL database, its own env vars, and deploys from the
`stage` branch automatically. The staging database runs the same migrations as
production but holds only test data.

**DNS — action needed:**
Add a CNAME record on Cloudflare pointing `stage.coachableplays.com` at the
Railway staging service URL. No domain purchase needed — the subdomain is free
under the existing `coachableplays.com`. Cloudflare Pages will also produce
a branch preview URL automatically for the frontend (`stage.coachable.pages.dev`
or similar), which may be sufficient for the frontend side.

**Feature flags across environments — decision needed:**
Decide whether environment is passed as a context value to the flag system or
whether separate flag sets exist per environment (stage flags vs prod flags).
The staging environment should default all in-progress v2 flags to `on`; production
defaults them to `off` until deliberately flipped.

Example target state:
| Flag             | stage | prod (main)          |
|------------------|-------|----------------------|
| newFileStructure | on    | off                  |
| v2TestRunner     | on    | off                  |
| mobileEditor     | on    | off (until shipped)  |

**Note:** The file structure reorganization (1.2) is the one exception to the
incremental/flag approach — it touches every import path and cannot be usefully
flagged. Do it as a single dedicated PR into `stage`, let it bake, then merge.

**Done looks like:** `stage` branch exists and is protected. Railway staging
environment auto-deploys on push to `stage`. `stage.coachableplays.com` resolves
to the staging service. A new feature branch can be opened, merged to `stage`,
tested, and promoted to `main` without any manual DNS or Railway changes.
The flag environment split is documented in `docs/environment.md` (connects to 1.4).

---

## Group 2 — Database

### 2.1 — Migration system formalization ❌
The current `schema.sql` is 942 lines of mixed `CREATE TABLE` and `ALTER TABLE`
with safe-re-run guards. This works but adds risk as the schema grows: running
the full file on production restarts every constraint check, and there is no
record of which changes have been applied or when. Options: keep the current
approach with stricter discipline (document the convention explicitly), or adopt
numbered migration files (`001_initial.sql`, `002_add_folders.sql`, etc.) with
a `migrations` tracking table.

**This is a decision-first initiative.** The decision and its rationale go in
`docs/database.md` before any files move.

**Done looks like:** The migration approach is documented and consistently
followed. Running migrations in production is a known, scripted procedure,
not a manual step.

---

### 2.2 — Database backup and recovery strategy ❌
Railway's PostgreSQL includes automated backups on paid plans, but there is
no documented recovery process. What is the backup retention window? How is a
specific point-in-time restore triggered? Who does it? How long does recovery
take? What data could be lost in the worst case?

**Done looks like:** `docs/database.md` has a backup section that answers all
of the above. A recovery has been tested at least once (you know the process
works before you need it under pressure).

---

### 2.3 — Index and query performance audit ❌
The schema has grown organically. Foreign keys, common filter columns
(`team_id`, `user_id`, `folder_id`), and sort columns (`updated_at`,
`created_at`) may be missing indexes. Plays, folders, and notifications are
queried on every page load — slow queries here affect every user on every
request.

**Done looks like:** Every frequently-queried column has an index in the schema.
The three most common query patterns (load team plays, load team folders, load
user notifications) have been run through `EXPLAIN ANALYZE` and their plans
are reasonable. Results are documented.

---

### 2.4 — Schema documentation ❌
The 942-line schema is the source of truth for the data model, but there is
no human-readable explanation of what each table represents, what its key
relationships are, or what invariants it maintains. When adding a new feature,
it is easy to build inconsistently with existing patterns.

**Done looks like:** `docs/database.md` has a table-by-table description:
what each table stores, what it references, and what the important constraints
mean. Not a schema dump — a readable narrative.

---

## Group 3 — Backend

### 3.1 — Server integration test suite ⚠️
Writing the full server-side test suite with Vitest + Supertest against a
real test database. Covers all auth, teams, plays, folders, platform plays,
notifications, shared routes, admin routes, middleware, and email mocks. Plan
and per-route test list are in `engineering/planning/testing/test-suite-plan.md`.

**Done looks like:** `npm run test:server` passes from the CLI. Every route
in `test-suite-plan.md` has integration test coverage. CI runs it on every push.

---

### 3.2 — API contract and error model ❌
Standardizing how the server communicates success and failure. Decides:
does `apiFetch` throw on non-2xx (try/catch model) or return `{ ok, data, error }`
(check model)? Standardizes function names across `src/utils/api/` (`getPlays`,
`createPlay`, `updatePlay`, `deletePlay` — REST verb as prefix). Decides the
error surfacing model (silent `.catch(() => {})` vs toast on failure). Decides
optimistic update rollback behavior.

**Done looks like:** `engineering/planning/api-standards.md` covers error
contract, naming convention, auth expiry handling, and optimistic update pattern.
All `src/utils/api/` files renamed to match.

---

### 3.3 — Security hardening ❌
Auditing every server route for missing auth middleware. Adding rate limiting
to auth endpoints (login, signup, forgot password, reset password). Verifying
CORS is locked to known origins (`CORS_ORIGINS` env var exists but needs
to be confirmed active in `server/index.js`). Adding Content Security Policy
headers. Reviewing JWT handling for expiry, rotation, and leakage. Verifying
that all user-supplied input reaching a DB query goes through parameterized
queries (no string concatenation). Ensuring `npm audit --audit-level=high`
passes.

**Done looks like:** Every route either has `requireAuth` or is documented as
intentionally public. Auth endpoints are rate-limited. CORS and CSP headers
are present and correct on every response. `npm audit` passes at high severity.

---

### 3.4 — Route-level JSDoc pass ❌
Adding JSDoc to every route handler: what auth it requires, what the request
body shape is, what it returns, what can go wrong. The format is in
`security-and-code-quality.md`. This is not documentation for human readers —
it is a navigation signal for AI-assisted development.

**Done looks like:** Every route handler in every `server/routes/*.js` file
has a JSDoc block. No exceptions.

---

## Group 4 — Production readiness

These are invisible until something breaks in production. They have no
external impact when working — only when they are missing.

### 4.1 — Error monitoring ❌
The server has only `console.log`. When a route throws an unhandled exception
in production, it either crashes silently or logs to Railway's console, which
nobody is watching. There is a custom `errorReporter.js` on the client that
sends errors to the admin backend, but there is no external aggregation,
alerting, or grouping. Sentry (free tier covers this scale) or a Railway
log drain would change this.

**Done looks like:** Uncaught server errors and unhandled promise rejections
are captured and visible in a dashboard outside of Railway logs. Client-side
React errors are captured separately. An alert fires when error rate spikes.

---

### 4.2 — Structured logging ❌
Current server logging is `console.log` strings. In production this means
all logs are unfiltered plaintext in Railway's log view. Adding structured
JSON logging (request ID, user ID, route, response time, status code) makes
Railway logs filterable and makes debugging production issues possible without
reading the full log stream.

**Done looks like:** Every incoming request logs a structured entry with
method, route, status, and response time. Errors log with request context.
Sensitive fields (passwords, tokens) are never logged.

---

### 4.3 — Health check endpoint ❌
Railway uses a health check URL for zero-downtime deploys. If no health check
is configured, Railway considers a deploy successful as soon as the process
starts, even if the DB connection hasn't been established yet. A `/health`
endpoint that verifies the DB connection is live makes Railway's health gate
meaningful.

**Done looks like:** `GET /health` returns `200 { status: "ok" }` when the
DB pool is healthy and `503` when it is not. Railway is configured to use
this URL for health checks.

---

### 4.4 — Uptime monitoring ❌
There is no external service watching whether the Railway deployment is
responding. If the service crashes, users know before you do. BetterStack,
UptimeRobot, and Checkly all have free tiers that ping a URL every 1–5 minutes
and alert via email/SMS on downtime.

**Done looks like:** An external monitor pings the `/health` endpoint every
minute. An alert goes to your phone within two minutes of downtime.

---

### 4.5 — Frontend performance baseline ❌
The bundle includes `@ffmpeg/core` (a WASM binary that can exceed 30MB),
`@mui/material`, `react-konva`, `recharts`, and the full Slate editor. No
one has measured the current bundle size or Core Web Vitals. Until you have
a baseline, you cannot know whether the MUI removal (Group 7) or code splitting
(Group 7) actually improves anything.

**Done looks like:** A Lighthouse run on the main app route is documented
(LCP, CLS, TBT, bundle size). Vite's `--reporter=verbose` build output is
captured. This becomes the baseline against which bundle improvements are
measured.

---

## Group 5 — Platform

### 5.1 — Billing and monetization ❌
There is no Stripe integration. The app has users and coaches but no payment
system. This is either intentional (free while building, monetize later) or
an oversight. Decisions needed: freemium model vs paid from day one, what
the pricing tiers are, whether Stripe handles subscriptions or one-time
payments, and what features are gated behind payment.

**This is a product decision before it is an engineering initiative.** The
output of the decision is either "not in v2" (documented, intentional) or a
`docs/billing.md` describing the Stripe integration plan before any code is
written.

---

### 5.2 — Email deliverability ❌
Resend sends transactional email (verification, password reset, invites,
broadcasts). Whether those emails land in inboxes or spam depends entirely on
DNS records (SPF, DKIM, DMARC) that are configured outside the codebase. If
these are not set, a meaningful fraction of signup verification emails are
being silently junked and users cannot verify their accounts.

**Done looks like:** SPF, DKIM, and DMARC records exist and pass a check
(mxtoolbox.com or similar). A test email chain (signup → verify → invite →
reset) has been sent from the production domain and verified to land in the
inbox. This is documented.

---

### 5.3 — Storage and media lifecycle ❌
R2 is used for GIF and video exports (`r2Upload.js`, `gifAssetStore.js`).
There is no visible cleanup strategy — exported GIFs accumulate indefinitely.
Open questions: what happens to a GIF export when the play is deleted? Is there
a maximum file size enforced? Is there a per-user or per-team storage limit?
What does R2 cost at scale (1,000 teams × average exports)?

**Done looks like:** A lifecycle rule in R2 or a server-side cleanup job removes
exports after a defined TTL (e.g., 24 hours for one-time exports, longer for
saved ones). Max file size is enforced at upload. Storage cost per unit is
known and has a ceiling.

---

### 5.4 — Real-time and notification delivery ❌
Notifications exist in the database and the `NotificationsContext` fetches them,
but there is no visible mechanism for delivering a new notification to a logged-in
user in real time. The current behavior appears to be: a new play is added,
nothing happens for the player until they navigate to the notifications page or
refresh the app. Decisions needed: polling interval (simple, works for this scale),
Server-Sent Events (one-directional stream, no library), or WebSockets (full
duplex, more complex).

**Done looks like:** A player who is logged in receives a notification within
N seconds of a coach adding a new play, without refreshing the page. The
approach is documented and tested.

---

### 5.5 — SEO for public pages ❌
Marketing pages, SharedPlay, PlatformPlayView, and sport-specific pages are
the only pages search engines can index. `sportSeo.js` and `usePageMeta.js`
exist in the codebase but coverage is unknown. Missing: Open Graph tags for
share previews (when a coach sends a link, the preview card should show the
play title and sport), a sitemap at `/sitemap.xml`, canonical URLs, and
structured data for sport-specific pages.

**Done looks like:** Every public page has a unique `<title>`, `<meta
description>`, and OG tags. A `/sitemap.xml` exists and lists all public
routes. Running the Google Rich Results test on a shared play URL shows
the preview card correctly.

---

## Group 6 — Frontend component library (src/ui/)

### 6.1 — Component prop convention ❌
Deciding the shared prop API before any `src/ui/` component is built. Covers:
whether all components accept `className`, what `size` and `variant` values
are standard, how loading and disabled states are handled. Written as
`design/component-specs.md`.

**Done looks like:** `component-specs.md` covers the prop convention and specs
the four highest-priority components (Button, Input, Modal, Toast) with variant
tables and examples.

---

### 6.2 — Build the primitives ❌
Building: Button, Input, Textarea, Select, Checkbox, Toggle, Modal, Toast,
Spinner, Skeleton, EmptyState, Alert. These replace AdminBtn, AdminModal,
AdminInput, etc. and the scattered components in `src/components/`.

**Done looks like:** All primitives exist in `src/ui/`, exported from
`src/ui/index.js`. The design system viewer renders them. AdminBtn,
AdminModal, AdminInput deleted.

---

### 6.3 — Build the display and domain components ❌
Building: PlayCard, FolderCard, Avatar, Badge, Chip, Tooltip, DataTable,
ListItem, StatCard, Tabs, Breadcrumbs, Pagination, NotificationItem.
PlayPreviewCard from `src/components/` becomes PlayCard here.

**Done looks like:** All display and domain components exist in `src/ui/`.
Every surface that had its own version (AdminBadge, etc.) is migrated.

---

### 6.4 — Layout and shell components ❌
Building: Sidebar, Header, PageShell — the chrome wrapping every page.
Currently embedded in `AppShell.jsx` and the admin layout.

**Done looks like:** `src/ui/Sidebar.jsx`, `Header.jsx`, `PageShell.jsx`
exist. App shell and admin shell both use them. Sidebar nav follows desktop
formatting standard.

---

## Group 7 — Frontend architecture

### 7.1 — MUI removal ❌
Auditing the MUI footprint (`grep -r "@mui" src/`) and replacing every usage
with a `src/ui/` component or Tailwind equivalent. `@mui/material` is a large
dependency that conflicts with the v2 component library goal.

**Done looks like:** No `@mui/material` imports in the codebase. Package
removed from `package.json`. Bundle size is re-baselined (see 4.5).

---

### 7.2 — Routing v2 ❌
Redesigning the routing layer to match the v2 folder structure. Deciding
whether `App.jsx` stays as a single file or splits into feature routers.
Adding route-level code splitting (`React.lazy` + `Suspense`) for admin,
Slate, and shared pages. Documenting route guards, `returnTo` handling,
and the onboarding redirect chain.

**Done looks like:** `engineering/planning/routing.md` documents the v2
route structure. Lazy loading is active for admin and Slate routes. Route
guards are consistent and documented.

---

### 7.3 — State management decision and implementation ❌
Deciding whether v2 adds Zustand (cross-page state), React Query/SWR (server
state), or keeps React state + Context. If adding a library: implementing it
on Plays.jsx as the reference case (30+ useState calls). If staying with React
state: documenting what lives where (local, context, URL params).

**Done looks like:** `engineering/planning/state-management.md` documents the
decision and pattern. Plays.jsx serves as the reference implementation.

---

### 7.4 — Permission abstraction ❌
Replacing the copy-pasted `isCoach` boolean across every page with a
`usePermissions()` hook returning named flags (`canCreatePlay`, `canDeletePlay`,
`canManageRoster`, `canViewTrash`). Folds in `assistantPermissions` (currently
an object on the user, checked inline).

**Done looks like:** `usePermissions()` exists in `src/context/`. Every page
uses it. No page has an inline `user?.role === "coach"` check. `isCoach` deleted.

---

### 7.5 — Error boundary implementation ❌
Adding React error boundaries at the page level so a JS error in one page
doesn't crash the whole app. Defining the fallback UI. Connected to the error
monitoring initiative (4.1) — the boundary should report to whatever monitoring
system is chosen.

**Done looks like:** A reusable `ErrorBoundary` exists in `src/ui/`. Every
page route is wrapped in it. Errors caught by the boundary are sent to the
monitoring system from 4.1.

---

### 7.6 — isMobile JS check elimination ❌
Removing `window.matchMedia` mobile detection from component state (Plays.jsx,
PlayEdit.jsx, etc.) and replacing with CSS-first responsive behavior. For cases
where behavior truly differs on mobile, a single shared `useBreakpoint()` hook
replaces per-component `matchMedia` calls.

**Done looks like:** No `window.matchMedia` calls in page components. JSDOM
test environment no longer produces false results for mobile-gated features.

---

### 7.7 — Feature flag integration ❌
Deciding how a component uses feature flags: a general `<FlagGate>` wrapper
vs inline `useFeatureFlags()` calls. `AdminFlagGate.jsx` already exists —
does it generalize? Documenting how a developer reading a component can tell
it is behind a flag.

**Done looks like:** One pattern is documented and used consistently.
`AdminFlagGate` is either generalized into `src/ui/FlagGate.jsx` or deleted
in favor of the inline pattern.

---

## Group 8 — UI testing

### 8.1 — Wire existing tests to CLI ⚠️
The existing six browser test suites already work in Vitest — they just run
in the browser. This initiative moves them to `vitest run` from the terminal.

**Done looks like:** `npm run test:frontend` runs all six suites from the CLI
and exits with pass/fail. CI picks them up automatically.

---

### 8.2 — Role-based UI test suite ❌
Writing the full role-based UI test suite using the standards in
`engineering/planning/testing/ui-testing-standards.md`. Covers every page
in `src/app/pages/` and `src/admin/pages/` — visibility assertions and flow
tests. Uses `renderAs()` and the `tests/` subfolder pattern.

**Done looks like:** Every page in the "Example file structure" section of
`ui-testing-standards.md` has a `tests/` folder with the appropriate
`roles.test.js` and `flow.test.js` files.

---

## Group 9 — Core product

### 9.1 — Slate UX standards ❌
Building the design standards doc for the play editor — same interview-driven
process as the formatting standards. Covers: draw tool selection and states,
field orientation per sport, animation timeline UX, player placement, control
pill states, color picker constraints, undo/redo, mobile editor layout.
Output: `design/slate/slate-ux-standards.md`.

**Done looks like:** `slate-ux-standards.md` is as thorough as
`desktop-formatting-standards.md`. The mobile Slate UX is fully specified,
not just technically planned.

---

### 9.2 — Mobile editor launch ⚠️
Removing `MobileViewOnlyGate` from the user editor path and wiring the full
mobile editing experience for regular coaches. Wiring plan is in
`engineering/planning/features/mobile-slate-plan.md`. Blocked on 9.1 confirming
the mobile editor UX is ready for users.

**Done looks like:** Coaches on mobile can open and edit a play at
`/app/plays/:id/edit`. `MobileViewOnlyGate` is deleted or repurposed.
The feature is no longer admin-only.

---

### 9.3 — PlayerViewMode UX ❌
Specifying and implementing playerViewMode end to end. Currently the mode
silently changes what renders with no visual indicator — a coach has no
confirmation they are seeing what a player sees. Covers: persistent mode
indicator, how the coach enters/exits, whether it affects navigation or only
content, and role-based test coverage for all playerViewMode states.

**Done looks like:** A coach in playerViewMode sees a clear persistent
indicator. The toggle is discoverable. Tests cover the context override.

---

### 9.4 — Shared and public page redesign ❌
Redesigning SharedPlay, SharedFolder, and PlatformPlayView with a clear
stance on: dark vs light, navigation presence, "Get Coachable" CTA, expired
link handling, and whether the shared play view is a full read-only editor or
an animated preview only. Output: `design/shared-pages.md`.

**Done looks like:** All three public page types match a documented spec.
An expired link shows a proper error state. SEO tags are present (connects
to 5.5).

---

## Group 10 — Documentation cleanup (parallel with everything else)

### 10.1 — Migrate scattered markdown to docs/ ❌
Moving every `.md` file in `server/routes/`, `server/lib/`, `src/pages/`,
and `src/features/slate/` into the `docs/` folder. Updating any links.

**Done looks like:** No `.md` files in `server/` or `src/`. All docs are
in `docs/`. `docs/INDEX.md` has an entry for every file.

---

### 10.2 — Admin design standards ❌
Deciding whether v2 admin is dark (matches the app) or a different treatment,
and documenting the formatting rules for admin pages. Output:
`design/admin-standards.md`.

**Done looks like:** Admin pages are built to a documented standard. No
ambiguity about whether an admin page should match the app or differ.

---

## Reference — What is done ✅

| Initiative | Doc |
|---|---|
| General formatting standards | `design/general-formatting-standards.md` |
| Mobile formatting standards | `design/mobile/mobile-formatting-standards.md` |
| Desktop formatting standards | `design/desktop/desktop-formatting-standards.md` |
| Accessibility standards | `design/accessibility-standards.md` |
| UI testing standards | `engineering/planning/testing/ui-testing-standards.md` |
| Server test plan (what to test, per-route list, CI wiring) | `engineering/planning/testing/test-suite-plan.md` |
| Security, CI/CD, and AI-friendliness plan | `engineering/planning/infrastructure/security-and-code-quality.md` |
| Proposed v2 file structure | `engineering/planning/architecture/proposed-file-structure.md` |
| Mobile Slate wiring plan (technical) | `engineering/planning/features/mobile-slate-plan.md` |
| API surface audit | `engineering/audits/api-review.md` |
| Routing and flash diagnosis | `engineering/audits/routing-and-flash-diagnosis.md` |
| Design system unification attempt (post-mortem) | `engineering/audits/design-system-unification-attempt.md` |
