# Routing v2

**Status:** Authoritative routing plan for the v2 rebuild.
**Scope:** Full route tree, route guards, `returnTo` behavior, active team resolution, lazy import convention, and `App.tsx` composition model. Does not cover individual page layouts (see `v2/design/pages/`).

---

## File structure

`App.tsx` is a thin compositor. Routes are split into four feature routers — each file owns its own lazy imports, guards, and layout wrapper. This keeps every file under the 200-line target and lets a developer working on admin routes never open `App.tsx`.

```
src/
  App.tsx                      ← thin compositor; public routes inline + mounts feature routers
  auth/
    AuthRoutes.tsx             ← /login, /signup, /verify-email, /onboarding, /forgot-password, /reset-password
  app/
    AppRoutes.tsx              ← /app/* — authenticated app shell
  admin/
    AdminRoutes.tsx            ← /admin/* and /staff/* — internal tooling
```

Marketing and public share routes (`/`, `/rugby`, `/shared/:token`, `/slate`, etc.) stay inline in `App.tsx` — they are few, have no guards, and need no shared parent layout.

---

## Lazy import convention

Every page import in every router file is lazy. The only eager imports allowed are guard components, layout wrappers, and providers — these are tiny and needed immediately.

```tsx
// Every page — lazy
const Plays = lazyWithRetry(() => import('./pages/Plays'));
const PlayEditPage = lazyWithRetry(() => import('./pages/PlayEditPage'));

// Guards and layouts — eager (tiny, needed before any route resolves)
import { RequireAuth } from '@/auth/guards';
import { AppLayout } from '@/app/layouts/AppLayout';
```

`lazyWithRetry` is a thin wrapper at `src/utils/misc/lazyWithRetry.ts` that catches chunk-not-found errors after a Railway deploy and reloads once to pick up the new manifest.

A single `<Suspense>` wraps all routes in `App.tsx`. The fallback matches the current theme background — never a dark spinner on a light-mode user.

---

## Guards

| Guard | Location | What it checks | Redirects to |
|---|---|---|---|
| `RequireAuth` | `src/auth/guards.tsx` | JWT in localStorage via `AuthContext.user` | `/login?returnTo=<pathname>` |
| `RequireVerifiedEmail` | `src/auth/guards.tsx` | `user.emailVerified === true` | `/verify-email?returnTo=<pathname>` |
| `RequireOnboarded` | `src/auth/guards.tsx` | `user.onboarded === true && allTeams.length > 0` | `/onboarding` if not onboarded; `/no-team` if onboarded but teamless |
| `RequireNotOnboarded` | `src/auth/guards.tsx` | `!user.onboarded` | `/app/plays` if already onboarded |
| `RequireFlag` | `src/auth/guards.tsx` | Named feature flag enabled for this user | Configurable `fallback` prop (default `/app/plays`) |
| `RequireAdminSession` | `src/admin/guards.tsx` | `sessionStorage.getItem('coachable_admin_session')` truthy | `/admin` (login page) |
| `RequireStaffSession` | `src/admin/guards.tsx` | API probe to `GET /staff/session` succeeds | `/staff/login` |
| `RequirePerm` | `src/admin/guards.tsx` | Staff permission flags (see below) | `/staff` (dashboard) |

### Guard stack on protected routes

Guards compose in this order — outer to inner. Each checks its condition before the next is evaluated.

```
RequireAuth
  → RequireVerifiedEmail
    → RequireOnboarded
      → [route content]
```

`/verify-email` and `/onboarding` are intentional exceptions — see the route tree below.

### `RequireAdminSession` vs `RequireStaffSession`

Admin and staff use completely separate auth systems from the main app. Neither is subject to `RequireAuth`, `RequireVerifiedEmail`, or `RequireOnboarded` — they have their own identity.

- **Admin** (`/admin/*`): checks `sessionStorage` for `coachable_admin_session`. Gate is synchronous — no spinner.
- **Staff** (`/staff/*`): probes `GET /staff/session` on the server. Gate is async — shows a spinner while checking.

### `RequirePerm`

Staff routes additionally require specific permission flags set on the staff member's account. Usage:

```tsx
// Any of these flags — at least one must be true
<RequirePerm anyOf={['plays.viewFolders', 'plays.add']}>...</RequirePerm>

// Exactly this flag
<RequirePerm perm="users.viewTable">...</RequirePerm>

// Owner-only (no granular flag — only the staff owner can see this)
<RequirePerm ownerOnly>...</RequirePerm>
```

---

## `returnTo` flow

`returnTo` is a URL query param that persists the user's intended destination through the auth and verification funnel.

**Who writes it:**
- `RequireAuth` — appends `?returnTo=<encoded pathname>` to the `/login` redirect.
- `RequireVerifiedEmail` — appends `?returnTo=<encoded pathname>` to the `/verify-email` redirect.

**Who reads and propagates it:**
1. `Login.tsx` reads `?returnTo=`. If the user is already onboarded, navigates there directly. If not, passes it forward: `navigate('/onboarding?returnTo=...')`.
2. `VerifyEmail.tsx` reads `?returnTo=`. On successful verification, navigates to `/onboarding?returnTo=...` (threading the value through so it survives the onboarding step).
3. `Onboarding.tsx` reads `?returnTo=`. On completion, navigates there (or `/app/plays` if absent, or `/slate/:sport` for the solo path).

**Validation:** `returnTo` must be validated before use. Only values starting with `/` are accepted — absolute URLs are rejected to prevent open redirect. Example: `if (!returnTo.startsWith('/')) returnTo = '/app/plays'`.

**Full new-user funnel with a protected deep link:**

```
User hits /app/plays (unauthenticated)
  → RequireAuth → /login?returnTo=/app/plays
  → User logs in (new account, not yet verified)
  → Login navigates to /verify-email?returnTo=/app/plays
  → User verifies email
  → VerifyEmail navigates to /onboarding?returnTo=/app/plays
  → User completes onboarding
  → Onboarding navigates to /app/plays  ← original destination
```

---

## Active team resolution

The active team is resolved entirely server-side. `GET /auth/me` returns the active team embedded in the user object: `teamId`, `teamName`, `role`, `sport`, `seasonYear`. There is no team slug in the URL and no localStorage team key.

Team switching calls `POST /teams/:teamId/switch`, which returns the new active context. `AuthContext` updates `user` and `allTeams` in place — no page reload.

---

## Route tree

Routes are grouped by access level. All lazy imports are omitted for brevity — every page component is `lazyWithRetry(() => import(...))` in the actual router file.

---

### Public — no auth required

Handled inline in `App.tsx`.

| Path | Renders | Notes |
|---|---|---|
| `/` | `LandingGate` | Redirects to `/app` if onboarded; `/onboarding` if authed but not onboarded; else renders `Landing` |
| `/home` | `Landing` | Always renders landing regardless of auth state |
| `/rugby` | `Landing sport="rugby"` | Sport-specific landing |
| `/soccer` | `Landing sport="soccer"` | |
| `/football` | `Landing sport="football"` | |
| `/lacrosse` | `Landing sport="lacrosse"` | |
| `/basketball` | `Landing sport="basketball"` | |
| `/field-hockey` | `Landing sport="field hockey"` | |
| `/ice-hockey` | `Landing sport="ice hockey"` | |
| `/womens-lacrosse` | `Landing sport="womens lacrosse"` | |
| `/rugby/playbooks` | `PublicPlaybooksPage sport="rugby"` | Public platform playbooks by sport |
| `/soccer/playbooks` | `PublicPlaybooksPage sport="soccer"` | |
| `/football/playbooks` | `PublicPlaybooksPage sport="football"` | |
| `/lacrosse/playbooks` | `PublicPlaybooksPage sport="lacrosse"` | |
| `/basketball/playbooks` | `PublicPlaybooksPage sport="basketball"` | |
| `/field-hockey/playbooks` | `PublicPlaybooksPage sport="field hockey"` | |
| `/ice-hockey/playbooks` | `PublicPlaybooksPage sport="ice hockey"` | |
| `/womens-lacrosse/playbooks` | `PublicPlaybooksPage sport="womens lacrosse"` | |
| `/resources` | `Resources` | Marketing page |
| `/enterprise` | `Enterprise` | Marketing page |
| `/signup` | `Signup` | |
| `/login` | `Login` | Reads `?returnTo`, `?invite`, `?sport` |
| `/forgot-password` | `ForgotPassword` | |
| `/reset-password` | `ResetPassword` | |
| `/platform-play/:playId` | `PlatformPlayView` | Single play from the platform library |
| `/shared/:token` | `SharedPlay` | Coach-shared play link |
| `/shared/:token/view` | `SharedPlayView` | Read-only play viewer via share token |
| `/shared/folder/:token` | `SharedFolder` | Shared playbook folder |
| `/shared/folder/:token/play/:playId` | `SharedPlayView` | Individual play inside a shared folder |
| `/slate` | `SportPickerPage` | Standalone editor — pick sport first |
| `/slate/:sport` | `SlateWithSportParam` | Standalone editor with sport pre-selected |

---

### Pre-verification — `RequireAuth` only

The user is logged in but has not yet verified their email. These routes are the verification funnel itself — they cannot be behind `RequireVerifiedEmail` or the user would loop.

| Path | Guard stack | Renders |
|---|---|---|
| `/verify-email` | `RequireAuth` | `VerifyEmail` — 6-digit OTP entry; on success navigates to `/onboarding?returnTo=...` |

---

### Pre-onboarding — `RequireAuth + RequireVerifiedEmail`

The user is verified but has not completed onboarding. These routes are the onboarding funnel — they cannot be behind `RequireOnboarded`.

| Path | Guard stack | Renders |
|---|---|---|
| `/onboarding` | `RequireAuth → RequireVerifiedEmail → RequireNotOnboarded` | `Onboarding` — three paths: create team, join team, solo |
| `/no-team` | `RequireAuth → RequireVerifiedEmail` | `NoTeam` — reached when `user.onboarded && allTeams.length === 0` |

`RequireNotOnboarded` on `/onboarding` redirects already-onboarded users to `/app/plays` so they cannot re-enter onboarding.

`/no-team` is the safety-net destination when `RequireOnboarded` detects an onboarded user with no team memberships (e.g., last team was left or deleted before the server auto-created a personal workspace).

---

### App shell — `RequireAuth + RequireVerifiedEmail + RequireOnboarded`

Handled in `src/app/AppRoutes.tsx`. The full guard stack is applied at the `/app` parent route and propagates to all children.

#### Inside `AppLayout` (sidebar and nav persist across navigations)

| Path | Renders | Notes |
|---|---|---|
| `/app` | redirect → `/app/plays` | Index redirect |
| `/app/plays` | `Plays` | Main plays list |
| `/app/plays/new` | `PlayNew` | New play creation flow |
| `/app/plays/:playId` | `PlayView` | Play detail / read view |
| `/app/team` | `Team` | Team roster and invite management |
| `/app/profile` | `Profile` | User profile settings |
| `/app/profile/verify-email` | `ProfileEmailVerification` | Email *change* verification (different from initial email verification at `/verify-email`) |
| `/app/settings` | `Settings` | App and team settings |
| `/app/report-issue` | `ReportIssue` | In-app issue reporting |
| `/app/notifications` | `RequireFlag('in_app_notifications') → Notifications` | In-app notification center; gated by feature flag |
| `/app/playbooks` | `Playbooks` | Playbook section root |
| `/app/playbooks/:sectionId` | `Playbooks` | Playbook section deep link |
| `/app/videos` | `DemoVideos` | Demo video library |

#### Outside `AppLayout` — full-screen (no nav chrome)

These are siblings of the `/app` layout route, not children. They carry the same guard stack but mount independently — the entire DOM swaps on navigation between inside/outside `AppLayout`. Use View Transitions on links into and out of these routes (see `routing-and-flash-diagnosis.md`).

| Path | Guard stack | Renders |
|---|---|---|
| `/app/plays/:playId/edit` | `RequireAuth → RequireVerifiedEmail → RequireOnboarded` | `PlayEditPage` — full-screen Slate editor |
| `/app/plays/:playId/view` | `RequireAuth → RequireVerifiedEmail → RequireOnboarded` | `PlayViewOnlyPage` — full-screen read-only viewer |

---

### Admin — `AdminShell mode="admin"`

Handled in `src/admin/AdminRoutes.tsx`. A single `AdminShell` component wraps all `/admin/*` and `/staff/*` routes with `AdminProvider`. The `basePath` and `mode` props determine which identity system applies and how internal links resolve.

```tsx
<Route element={<AdminShell mode="admin" basePath="/admin" />}>
  <Route path="/admin" element={<AdminLogin />} />         {/* login page — no RequireAdminSession */}
  <Route path="/admin/tests" element={<RequireAdminSession><AdminTests /></RequireAdminSession>} />
  {/* ... */}
</Route>
```

`/admin` itself (the login page) is exempt from `RequireAdminSession` — it is the gate.

| Path | Renders |
|---|---|
| `/admin` | `AdminLogin` |
| `/admin/tests` | `AdminTests` |
| `/admin/errors` | `AdminErrors` |
| `/admin/slate` | `SlateRoot adminMode` |
| `/admin/record` | `SlateRecordRoot` |
| `/admin/drawing` | `SlateDrawingRoot` |
| `/admin/app` | `AdminPlaysPage` |
| `/admin/plays/:playId/edit` | `AdminPlayEditPage` |
| `/admin/presets/:sport` | `AdminSportPresetsPage` |
| `/admin/presets/:sport/:presetId/edit` | `AdminPresetEditPage` |
| `/admin/prefab-presets/:sport` | `AdminSportPrefabPresetsPage` |
| `/admin/prefab-presets/:sport/:prefabPresetId/edit` | `AdminPrefabPresetEditPage` |
| `/admin/users` | `AdminUsersPage` |
| `/admin/users/:userId` | `AdminUserActivity` |
| `/admin/user-issues` | `AdminUserIssues` |
| `/admin/mobile-view` | `AdminMobileView` |
| `/admin/test` | `AdminTestSlate` |
| `/admin/gif-test` | `AdminGIFTest` |
| `/admin/demo-videos` | `AdminDemoVideos` |
| `/admin/one-page` | `AdminOnePage` |
| `/admin/design-system` | `AdminDesignSystem` — component catalogue (renamed from v1's `/admin/design-rules`) |
| `/admin/design-system/:section` | `AdminDesignSystem` — section deep link |
| `/admin/staff` | `AdminStaff` |
| `/admin/email` | `AdminEmailPage` |
| `/admin/email/recurring` | `AdminRecurringEmailPage` |
| `/admin/notifications` | `AdminNotificationsPage` |
| `/admin/feature-flags` | `AdminFeatureFlagsPage` |
| `/admin/outreach-scraper` | `AdminOutreachScraperPage` |

---

### Staff — `AdminShell mode="staff" basePath="/staff"`

Staff reuse admin page components with `basePath="/staff"` so internal links resolve to `/staff/...` instead of `/admin/...`. `RequireStaffSession` replaces `RequireAdminSession`. Each route additionally gates on `RequirePerm` with the flags appropriate to that surface.

| Path | Permission | Renders |
|---|---|---|
| `/staff/login` | Public | `StaffLogin` |
| `/staff/accept-invite` | Public | `StaffAcceptInvite` |
| `/staff` | `RequireStaffSession` | `StaffDashboard` |
| `/staff/app` | `anyOf: plays.viewFolders, pageSections.manage, playbooks.view, presets.create, presets.edit, prefabs.manage` | `AdminPlaysPage` |
| `/staff/plays/:playId/edit` | `anyOf: plays.viewFolders, plays.add, plays.editContent, plays.rename, plays.editTags` | `AdminPlayEditPage` |
| `/staff/presets/:sport` | `anyOf: presets.create, presets.edit` | `AdminSportPresetsPage` |
| `/staff/presets/:sport/:presetId/edit` | `anyOf: presets.create, presets.edit` | `AdminPresetEditPage` |
| `/staff/prefab-presets/:sport` | `prefabs.manage` | `AdminSportPrefabPresetsPage` |
| `/staff/prefab-presets/:sport/:prefabPresetId/edit` | `prefabs.manage` | `AdminPrefabPresetEditPage` |
| `/staff/users` | `users.viewTable` | `AdminUsersPage` |
| `/staff/users/:userId` | `users.viewTable` | `AdminUserActivity` |
| `/staff/user-issues` | `issues.view` | `AdminUserIssues` |
| `/staff/errors` | `errors.viewReports` | `AdminErrors` |
| `/staff/demo-videos` | `videos.addDemo` | `AdminDemoVideos` |
| `/staff/one-page` | `pageSections.manage` | `AdminOnePage` |
| `/staff/tests` | `tests.run` | `AdminTests` |
| `/staff/staff` | `ownerOnly` | `AdminStaff` |

---

### Fallback

| Path | Renders |
|---|---|
| `*` | `NotFound` |

---

## `App.tsx` composition

```tsx
function App() {
  return (
    <BrowserRouter>
      <ThemeScript />   {/* inline <script> in index.html — not a component; applies data-theme before first paint */}
      <AuthProvider>
        <FeatureFlagBridge>
          <AppMessageProvider>
            <MessagePopup />
            <Suspense fallback={<AppLoadingFallback />}>
              <Routes>
                {/* Public and marketing routes — inline */}
                <Route path="/" element={<LandingGate />} />
                <Route path="/home" element={<Landing />} />
                {/* ... sport landing pages, shared routes, /slate ... */}

                {/* Feature routers */}
                <Route path="/auth/*" element={<AuthRoutes />} />    {/* /login, /signup, /verify-email, /onboarding ... */}
                <Route path="/app/*" element={<AppRoutes />} />
                <Route path="/admin/*" element={<AdminRoutes />} />
                <Route path="/staff/*" element={<AdminRoutes />} />  {/* AdminRoutes handles both /admin and /staff */}

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AppMessageProvider>
        </FeatureFlagBridge>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

`ThemeScript` is not a React component — it is an inline `<script>` tag in `index.html` that reads `localStorage.getItem('theme')` and sets `data-theme` on `<html>` synchronously before any CSS or JS executes. This prevents the wrong-theme flash on first paint. `ThemeInit` (v1's `useEffect`-based approach) is removed; the inline script is the permanent solution.

---

## Decisions made in this doc

| Decision | Choice |
|---|---|
| Router file structure | Split: `AuthRoutes`, `AppRoutes`, `AdminRoutes` — `App.tsx` is thin compositor |
| Lazy imports | All page imports are `lazyWithRetry(() => import(...))` — no exceptions |
| Guard stack order | `RequireAuth → RequireVerifiedEmail → RequireOnboarded` |
| Email verification | Hard gate (`RequireVerifiedEmail`) — unverified users cannot access `/onboarding` or `/app/*` |
| Verify-before-onboard | Yes — `/verify-email` → `/onboarding` → `/app/*` |
| `returnTo` validation | Must start with `/` — absolute URLs rejected |
| `returnTo` threading | Survives verify-email step (v1 bug fixed) |
| Admin + staff layout | Unified `AdminShell` with `mode` and `basePath` props — same chrome, separate identity systems |
| Active team resolution | Server-side via `GET /auth/me` — no URL slug, no localStorage |
| `/admin/design-system` | Renamed from v1's `/admin/design-rules` |

---

## Cross-Reference Notes

**References:**
- `v2/engineering/audits/routing-and-flash-diagnosis.md` — root cause analysis for v1 flash issues; View Transitions and `lazyWithRetry` are the fixes
- `v2/engineering/frontend-code-standards.md` — lazy import convention, file anatomy
- `v2/engineering/planning/permissions.md` — `RequirePerm` flags (TODO 7.4, ❌ Not started); the staff permission table above matches v1 exactly and will be validated against that doc once it exists
- `v2/engineering/planning/feature-flags.md` — `RequireFlag` convention (TODO 7.7, ❌ Not started)

**Referenced by:**
- `v2/engineering/planning/features/seo-plan.md` — uses this doc to determine which routes are indexable
- `v2/design/public-pages.md` — uses this doc for the public route list
- `v2/design/component-specs.md §6.4` — layout and shell components reference which routes share `AppLayout`
- `v2/TODO.md` item 7.5 (error boundaries) — every route in `App.tsx` gets wrapped
