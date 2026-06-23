# Coachable — AI Navigation Index

This is the first file to read in a new session. It tells you where every domain of the codebase lives. Read this before asking where anything is.

---

## Where things live

### Frontend (`src/`)

| Domain | Path | Notes |
|---|---|---|
| Shared components | `src/ui/` | All prop-driven components. Barrel export at `src/ui/index.js`. If it is used by 2+ surfaces, it lives here. |
| Core play editor | `src/slate/` | **Closed boundary.** Canvas, animation engine, hooks, and all editor-exclusive chrome live here. Nothing outside imports from inside it. |
| App pages (authenticated) | `src/app/pages/` | Coach and player-facing experience. Layouts in `src/app/layouts/`. |
| Admin pages (internal) | `src/admin/pages/` | Internal staff dashboard. Analytics in `src/admin/analytics/`. Guards in `src/admin/guards/`. |
| Auth flows | `src/auth/` | Login, signup, password reset, email verification, onboarding, sport picker. |
| Marketing pages | `src/marketing/` | Public-facing, unauthenticated. |
| Public share pages | `src/shared-pages/` | SharedPlay, SharedFolder, PlatformPlayView — no auth required. |
| Staff pages | `src/staff/` | Separate from admin — staff login, dashboard, and invite acceptance. |
| Global React contexts | `src/context/` | `AuthContext`, `FeatureFlagContext`, `NotificationsContext`, `AppMessageContext`. |
| Client API calls | `src/utils/api/` | One file per resource, mirrors `server/routes/`. Base fetch wrapper at `src/utils/api/api.js`. |
| Storage utilities | `src/utils/storage/` | Local play and playbook persistence. |
| Export utilities | `src/utils/export/` | GIF encoder, video encoder, play import/export. |
| Misc utilities | `src/utils/misc/` | Input validation, error reporter, mobile viewport, SEO, routing helpers. |
| Component catalogue | `src/admin/pages/AdminDesignSystem.jsx` | Route: `/admin/design-system`. Every shared component must be registered here. |
| Shared test infrastructure | `src/tests/` | `renderAs.js`, `assertions.js`, `fixtures/`. |

### Backend (`server/`)

| Domain | Path | Notes |
|---|---|---|
| Route handlers | `server/routes/` | One `.js` file per resource. No `.md` files here. |
| Middleware | `server/middleware/` | `auth.js`, `staffAuth.js`, `rateLimit.js`, `bodyBounds.js`. |
| Database queries | `server/db/` | One file per resource. Functions named with a verb: `getTeamById`, `insertPlay`. |
| Shared server lib | `server/lib/` | Email, feature flags, notification audience, GIF/R2 upload, outreach scraper. |
| Server config | `server/config/` | Environment and app config. |
| Server test infrastructure | `server/tests/helpers/` | `requestAs.js`, `seed.js`, `assertions.js`. |

### Documentation (`docs/`)

All steering documents live in `docs/`. No `.md` files in `src/` or `server/`.

**See `docs/INDEX.md` for the full map of every doc with a one-line description.**

---

## Auth system

- JWT stored in **localStorage** as `coachable_token`.
- `AuthContext` (`src/context/AuthContext.jsx`) reads it on mount via `GET /auth/me`.
- Server auth middleware: `server/middleware/auth.js`.
- Staff auth middleware: `server/middleware/staffAuth.js` — separate identity system.
- User roles per team: `owner`, `coach`, `assistant_coach`, `player`.
- Feature flags seeded from `GET /flags` into `FeatureFlagContext` (`src/context/FeatureFlagContext.jsx`).

---

## How to add a new route

1. Add handler to the relevant file in `server/routes/`
2. Add JSDoc to the handler (auth requirements, body shape, return shape)
3. Add client fetch helper to the matching file in `src/utils/api/`
4. Add integration test to `server/tests/routes/`
5. Add role-based UI test co-located at `src/[surface]/pages/tests/`

Route handler order is always: **Input → Auth → Logic → Response.**

---

## How to add a new shared component

1. Build it in `src/ui/`
2. Export it by name from `src/ui/index.js`
3. Add it to the component catalogue at `src/admin/pages/AdminDesignSystem.jsx`

A shared component that is not in the catalogue does not officially exist — other developers will rebuild it.

---

## Testing

- **UI tests** co-locate in a `tests/` folder next to the page file (`src/app/pages/tests/`, `src/admin/pages/tests/`, etc.).
- **Server tests** live in `server/tests/`, mirroring the route structure.
- Simple pages: `tests/page-name.test.js`. Complex pages: `tests/page-name.function/roles.test.js` + optional `flow.test.js`.
- Tests use `renderAs(role, component)` — never construct full user objects inline.
- Server tests use `requestAs(role)` — seeds a fresh user + team per test, never share identity state.
- Full standards: `docs/engineering/planning/testing/ui-testing-standards.md` and `server-testing-standards.md`.

---

## Critical rules

### Never

- **Never import from `src/slate/` outside of `src/slate/`** — it is a closed boundary. The editor exposes itself through `Slate.jsx` only. Violating this breaks the port boundary and makes the editor un-portable.
- **Never put `.md` files in `src/` or `server/`** — all docs go in `docs/`. Markdown next to code is the v1 anti-pattern this structure was built to fix.
- **Never use default exports** — named exports only, everywhere. Default exports allow silent renames and break barrel exports.
- **Never concatenate user input into SQL** — parameterized queries only, no exceptions. String interpolation into queries is a SQL injection vulnerability.
- **Never commit `console.log`** — remove before pushing, or guard behind an explicit `isDev` check.

### Always

- **JSDoc on every route handler and every hook.** Include: what it does, auth requirements, body/params shape, return shape.
- **All new shared components must be added to the component catalogue** (`src/admin/pages/AdminDesignSystem.jsx`) when created — not after, not eventually.
- **No inline magic numbers or strings** — extract to a named constant (`UPPER_SNAKE_CASE`).
- **TypeScript: no `any`** — use `unknown` and narrow, or type the value properly.
- **Client-side validation before every API call** — validate inputs and block the submit before the request goes out. The server also validates everything, but the client must validate first for UX.
- **Role gating: hide, don't disable** — if a user can't perform an action, don't render the trigger at all.
- **Error display: map to aliases** — never show raw API errors in the UI. Map `code` values to user-actionable messages via a shared alias map.

---

## Full standards docs

| Doc | Path |
|---|---|
| Frontend code standards | `docs/engineering/frontend-code-standards.md` |
| Backend code standards | `docs/engineering/backend-code-standards.md` |
| UI testing standards | `docs/engineering/planning/testing/ui-testing-standards.md` |
| Server testing standards | `docs/engineering/planning/testing/server-testing-standards.md` |
| Design — general | `docs/design/general-formatting-standards.md` |
| Design — color tokens | `docs/design/color-semantics.md` |
| Design — mobile | `docs/design/mobile/mobile-formatting-standards.md` |
| Design — desktop | `docs/design/desktop/desktop-formatting-standards.md` |
| Accessibility | `docs/design/accessibility-standards.md` |
| Security and CI | `docs/engineering/planning/infrastructure/security-and-code-quality.md` |
| File structure | `docs/engineering/planning/architecture/proposed-file-structure.md` |
