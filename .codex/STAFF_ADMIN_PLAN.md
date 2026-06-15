# Staff Admin — Final Implementation Plan

> Final plan, merged from the initial draft + codex's review corrections. Ready to implement in the PR sequence at the bottom.

## Context

Today Coachable has a single shared admin password (`ADMIN_HASH`) gating every `/admin/*` route. The owner wants to invite other people to act as scoped sub-admins (e.g. to create plays on his behalf) with per-permission, per-sport access — like Google Workspace admin roles.

This plan adds a **staff admin** tier:

- Sub-admins are real `users` accounts with an additional `staff_admins` row carrying a permissions JSON.
- A new `/staff/*` route tree mirrors the admin UI but only renders sections the user has permission for.
- The owner keeps the existing `/admin` password flow **unchanged** (break-glass + day-to-day).
- The existing `/admin/*` data API is reused, not duplicated — its middleware is widened to accept **either** the legacy admin session **or** a regular user JWT, and gates each endpoint on a specific permission key.

---

## Locked decisions

| Decision | Choice |
|---|---|
| Sub-admin identity | Real `users.id` with attached `staff_admins` row |
| UI entry | Separate `/staff/*` route tree |
| Owner identity | `OWNER_USER_ID` env var (immutable integer) |
| Legacy `ADMIN_HASH` | Stays indefinitely as break-glass; treated as owner-equivalent on the server |
| Permissions shape | Single `JSONB` column |
| Group rules | Independent server-side toggles; UI shows soft dependency warnings only |
| Danger Mode (`requireElevated`) for staff | **Never granted to staff.** Owner-only regardless of related permission |
| Audit log | Ships in v1, mutation-only (not read events) |
| Login | `/staff/login` is its own page that reuses `POST /auth/login`, then verifies via `GET /staff/session` |

---

## Permission catalog

Stored as a single JSONB blob on `staff_admins.permissions`. Boolean unless marked sport-scoped (array of sport keys or `"*"`).

### Dashboard / users
- `dashboard.viewAnalytics` (bool)
- `users.viewTable` (bool) — list at all
- `users.viewEmails` (bool) — unmask emails (else `a*****@example.com`)
- `users.viewUsernames` (bool) — unmask display name (else `User #1234`)
- `users.editStatus` (bool) — toggle beta-tester etc.
- `users.delete` (bool) — **never effective for staff** (Danger Mode owner-only); checkbox hidden in invite UI with tooltip
- `tests.run` (bool)
- `errors.viewReports` (bool)
- `issues.view` (bool) / `issues.resolve` (bool)

### Plays (admin library)
- `plays.viewFolders` (bool) — see platform folders at all
- `plays.sportScope` (sport-scoped) — restricts every play action; sport derived from `platform_play_folders.sport`
- `plays.add` (bool)
- `plays.editContent` (bool) — *added by codex review:* editor save/PATCH content (separate from rename/tags so editor access can be granted independently)
- `plays.rename` (bool)
- `plays.editTags` (bool)
- `plays.copyShareLinks` (bool)
- `plays.delete` (bool) — **never effective for staff** (Danger Mode)

### Page sections
- `pageSections.manage` (bool)

### Playbook sessions
- `playbooks.view` (bool)
- `playbooks.addPlays` (bool)

### Sport presets
- `presets.sportScope` (sport-scoped) — which sports they can act on
- `presets.create` (bool)
- `presets.edit` (bool) — *added by codex review:* PATCH existing preset, reorder
- (Delete remains owner-only; staff cannot trigger `requireElevated`)

### Prefabs
- `prefabs.manage` (bool) — *added by codex review:* admin prefab GET/POST/DELETE + editor use

### Demo videos
- `videos.addDemo` (bool)

### Owner-only (no permission key — always require owner)
- Security email config; backfill-seeded-plays; cleanup; create-account; bulk user delete; deleted-team restore; every `requireElevated` endpoint; staff invite CRUD; staff member CRUD.

---

## Server changes

### New tables — [`server/db/schema.sql`](server/db/schema.sql) (idempotent, auto-migrated on boot)

```sql
CREATE TABLE IF NOT EXISTS staff_admins (
  user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  permissions  JSONB NOT NULL DEFAULT '{}'::jsonb,
  invited_by   INTEGER REFERENCES users(id),
  invited_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at  TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS staff_admin_invites (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  token         TEXT NOT NULL UNIQUE,
  created_by    INTEGER NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  accepted_at   TIMESTAMPTZ,
  accepted_user INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_staff_invites_email
  ON staff_admin_invites(LOWER(email)) WHERE accepted_at IS NULL;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              BIGSERIAL PRIMARY KEY,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_auth_mode TEXT NOT NULL,        -- 'legacy_admin' | 'staff' | 'owner_jwt'
  actor_user_id   INTEGER,              -- nullable; legacy_admin attributes to OWNER_USER_ID
  action          TEXT NOT NULL,        -- e.g. 'play.delete'
  target_type     TEXT,                 -- e.g. 'play'
  target_id       TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON admin_audit_log(actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_log(action, occurred_at DESC);
```

### New middleware — [`server/middleware/staffAuth.js`](server/middleware/staffAuth.js) (new file)

- `requireAdminOrStaff` — accepts the legacy `admin_sid` session **or** the `coachable_session` JWT cookie tied to a `users.id` with a non-revoked, accepted `staff_admins` row. Attaches `req.actor = { authMode, userId, isOwner, permissions }`. Legacy admin → `{ authMode: "legacy_admin", userId: OWNER_USER_ID, isOwner: true }`.
- `requireOwnerOrLegacyAdmin` — owner-only routes (staff invites, dangerous maintenance). Accepts the legacy admin session OR a JWT whose userId === `OWNER_USER_ID`.
- `requirePerm(path)` — factory; checks `req.actor.permissions` for a dotted path. Owner short-circuits true.
- `requireSportScope(path, resolveSport)` — factory; verifies that the sport (from `req.params.sport`, or resolved from a target row via `resolveSport(req)`) is in the actor's permission array. Owner short-circuits.
- `redactByPerm(fieldMap)` — response transformer that masks fields the caller can't see. Owner skips redaction.
- `writeAudit(req, action, { targetType, targetId, metadata })` — helper that inserts into `admin_audit_log` using `req.actor`.

### Owner-only routes (new) — added to [`server/routes/admin.js`](server/routes/admin.js)

```
POST   /admin/staff-invites             create invite
GET    /admin/staff-invites             list pending
DELETE /admin/staff-invites/:id         revoke pending
GET    /admin/staff-admins              list active staff
PATCH  /admin/staff-admins/:userId      update permissions
DELETE /admin/staff-admins/:userId      revoke staff access
```

All gated by `requireOwnerOrLegacyAdmin`.

### Public + JWT routes (new) — [`server/routes/staff.js`](server/routes/staff.js) (new file)

```
GET  /staff/session         (requires JWT + staff_admins row) → returns permissions + isOwner
POST /staff/accept-invite   public; { token, password? } — links existing user or returns signup hint
```

Login itself is the existing `POST /auth/login` — no new endpoint.

### Endpoint → permission mapping (complete, including endpoints codex found that were missing from earlier draft)

| Endpoint | Today | After |
|---|---|---|
| `GET /admin/analytics` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("dashboard.viewAnalytics")` |
| `GET /admin/users` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("users.viewTable")` + `redactByPerm({ email: "users.viewEmails", username: "users.viewUsernames" })` |
| `GET /admin/users/:id/activity` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("users.viewTable")` |
| `PATCH /admin/users/:id/beta-tester` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("users.editStatus")` + audit |
| `DELETE /admin/users/:id` | `requireElevated` | unchanged (owner Danger Mode only) |
| `DELETE /admin/users` (bulk) | `requireElevated` | `requireOwnerOrLegacyAdmin` + Danger Mode |
| `POST /admin/create-account` | `requireAdmin` | `requireOwnerOrLegacyAdmin` |
| `POST /admin/cleanup` | `requireAdmin` | `requireOwnerOrLegacyAdmin` |
| `POST /admin/backfill-seeded-plays` | `requireAdmin` | `requireOwnerOrLegacyAdmin` |
| `GET/PUT /admin/settings/security-email[/confirm]` | `requireAdmin` | `requireOwnerOrLegacyAdmin` |
| `GET /admin/users/:id/deleted-teams` | `requireAdmin` | `requireOwnerOrLegacyAdmin` |
| `POST /admin/teams/:teamId/restore` | `requireAdmin` | `requireOwnerOrLegacyAdmin` |
| `GET /admin/plays` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("plays.viewFolders")` + sport-filter result by `plays.sportScope` |
| `GET /admin/plays/:id` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("plays.viewFolders")` + `requireSportScope("plays.sportScope")` |
| `POST /admin/plays` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("plays.add")` + sport scope + audit |
| `PATCH /admin/plays/:id` | `requireAdmin` | conditional perm: rename → `plays.rename`; tag changes → `plays.editTags`; content → `plays.editContent`; all + sport scope + audit |
| `POST /admin/plays/:id/restore` | `requireAdmin` | `requireOwnerOrLegacyAdmin` |
| `DELETE /admin/plays/:id` | `requireElevated` | unchanged (owner only) |
| `POST /admin/plays/:id/duplicate` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("plays.add")` + sport scope + audit |
| `GET/POST/PATCH /admin/platform-folders[/:id]` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("plays.viewFolders")` (read) / `pageSections.manage` (write) — codex to confirm; defaulting to `plays.viewFolders` for read, owner-only for write |
| `DELETE /admin/platform-folders/:id` | `requireElevated` | unchanged |
| `GET /admin/page-sections` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("pageSections.manage")` |
| `PATCH /admin/page-sections/:key` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("pageSections.manage")` + audit |
| `GET /admin/playbook-sections[/...]` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("playbooks.view")` |
| `POST /admin/playbook-sections` | `requireAdmin` | `requireOwnerOrLegacyAdmin` |
| `PATCH/DELETE /admin/playbook-sections/:id` | `requireAdmin` | `requireOwnerOrLegacyAdmin` |
| `GET /admin/playbook-sections/:id/plays` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("playbooks.view")` |
| `POST /admin/playbook-sections/:id/plays` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("playbooks.addPlays")` + audit |
| `DELETE/PATCH /admin/playbook-sections/:id/plays/:playId` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("playbooks.addPlays")` + audit |
| `GET /admin/sport-presets[/...]` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("presets.sportScope")` (filter by scope; sport-param routes require scope includes `:sport`) |
| `POST /admin/sport-presets/:sport/reorder` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("presets.edit")` + `requireSportScope("presets.sportScope")` + audit |
| `POST /admin/sport-presets/:sport` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("presets.create")` + `requireSportScope("presets.sportScope")` + audit |
| `PATCH /admin/sport-presets/:sport/:id` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("presets.edit")` + `requireSportScope("presets.sportScope")` + audit |
| `DELETE /admin/sport-presets/:sport/:id` | `requireElevated` | unchanged |
| `GET /admin/prefabs` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("prefabs.manage")` |
| `POST /admin/prefabs` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("prefabs.manage")` + audit |
| `DELETE /admin/prefabs/:id` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("prefabs.manage")` + audit |
| `GET /admin/user-issues` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("issues.view")` |
| `PATCH /admin/user-issues/:id` | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("issues.resolve")` + audit |
| `DELETE /admin/user-issues/:id` | `requireAdmin` | `requireOwnerOrLegacyAdmin` |
| Error reports — [`server/routes/errorReports.js`](server/routes/errorReports.js) admin endpoints | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("errors.viewReports")` |
| Demo videos — [`server/routes/demoVideos.js`](server/routes/demoVideos.js) admin POST | `requireAdmin` | `requireAdminOrStaff` + `requirePerm("videos.addDemo")` + audit |
| `POST /admin/tests/run` (if exists; otherwise frontend-only) | n/a | `requireAdminOrStaff` + `requirePerm("tests.run")` |

### Email — [`server/lib/email.js`](server/lib/email.js)
- New helper `sendStaffAdminInviteEmail(toEmail, { inviteUrl, ownerName, permissionsSummary })`. Subject: "You've been invited as a Coachable staff admin." CTA links to `/staff/accept-invite?token=…`.

---

## Frontend changes

### Shared transport helper (required correction from codex review)

Most existing admin pages call `fetch(\`${API_URL}/admin/...\`, { headers: { "x-admin-session": session } })` directly with the session from `sessionStorage["coachable_admin_session"]`. Staff JWT auth needs cookies (`credentials: "include"`) and an `Authorization: Bearer` header — different transport. We need one helper both paths route through.

- **New file** [`src/admin/adminTransport.js`](src/admin/adminTransport.js)
  - `adminApi(path, opts)` — single async helper. Reads from `useAdminShellContext` (or a module-level resolver) which transport mode is active:
    - `authMode: "legacy_admin"` → sends `x-admin-session` header (existing behavior)
    - `authMode: "staff"` → sends nothing extra; relies on JWT cookie with `credentials: "include"`. Also accepts a bearer token for cross-origin dev.
  - Replaces every `fetch(\`${API_URL}/admin/...\`, { headers: { "x-admin-session": ... } })` call in the 16 files identified.

### Files that need un-hardcoding (confirmed via grep)

- [`src/pages/Admin.jsx`](src/pages/Admin.jsx) — defines `SESSION_KEY` and mixes `adminFetch` + raw `fetch(\`${API_URL}/admin/user-issues\`)`
- [`src/pages/AdminPlaysPage.jsx`](src/pages/AdminPlaysPage.jsx) — heavy `fetch` + `x-admin-session` usage
- [`src/pages/AdminPlayEditPage.jsx`](src/pages/AdminPlayEditPage.jsx) — load/create/save play
- [`src/pages/AdminSportPresetsPage.jsx`](src/pages/AdminSportPresetsPage.jsx)
- [`src/pages/AdminPresetEditPage.jsx`](src/pages/AdminPresetEditPage.jsx)
- [`src/pages/AdminUserActivity.jsx`](src/pages/AdminUserActivity.jsx)
- [`src/pages/AdminUserIssues.jsx`](src/pages/AdminUserIssues.jsx)
- [`src/pages/AdminErrors.jsx`](src/pages/AdminErrors.jsx)
- [`src/pages/AdminDemoVideos.jsx`](src/pages/AdminDemoVideos.jsx)
- [`src/pages/AdminOnePage.jsx`](src/pages/AdminOnePage.jsx)
- [`src/components/wideSidebar/WideSidebarRoot.jsx`](src/components/wideSidebar/WideSidebarRoot.jsx) — codex flagged
- [`src/utils/prefabsApi.js`](src/utils/prefabsApi.js) — uses `x-admin-session` header
- [`src/admin/analytics/useDashboardAnalytics.js`](src/admin/analytics/useDashboardAnalytics.js)
- [`src/App.jsx`](src/App.jsx) — router; references `SESSION_KEY`

After migration these all read transport mode from context instead of hardcoding.

### Shell context — extend [`src/admin/AdminContext.jsx`](src/admin/AdminContext.jsx)

Broaden to a shared admin-like shell context consumed by both `/admin` and `/staff`:

```jsx
{
  theme, setTheme,
  basePath,           // "/admin" or "/staff"
  authMode,           // "legacy_admin" | "staff"
  isOwner,            // legacy_admin → true; staff JWT → derived from session
  permissions,        // owner: implicit-all; staff: from /staff/session
  hasPerm(path),
  hasSportScope(path, sport),
  canDangerMode,      // true only for legacy_admin path
}
```

Owner browsing `/staff` (for testing) gets `isOwner: true` and all perms pass. Regularly the owner uses `/admin`.

### Route tree — [`src/App.jsx`](src/App.jsx)

| Path | File / wrapper |
|---|---|
| `/staff/login` | New `StaffLogin.jsx` — wraps `POST /auth/login`, then verifies via `GET /staff/session` |
| `/staff/accept-invite` | New `StaffAcceptInvite.jsx` |
| `/staff` | Reuses `Admin.jsx` shell inside `<RequireStaffSession>` + `<StaffShellProvider basePath="/staff" authMode="staff">` |
| `/staff/users[/:id]` | reuses Admin users sections |
| `/staff/tests`, `/staff/errors`, `/staff/user-issues` | reuse Admin* pages |
| `/staff/app` | reuses `AdminPlaysPage` |
| `/staff/plays/:playId/edit` | reuses `AdminPlayEditPage` (return link goes to `/staff/app`, not `/admin/app`) |
| `/staff/presets/:sport` + `/staff/presets/:sport/:id/edit` | reuses preset pages |
| `/staff/page-sections`, `/staff/playbook-sections` | reuse existing components |
| `/staff/demo-videos` | reuses `AdminDemoVideos` |

`RequireStaffSession` calls `GET /staff/session` and either populates the context or redirects to `/staff/login`.

### Conditional UI — hide buttons/columns based on perms

Each reused page reads `useAdminShell()` and hides UI it doesn't have:

| File | Hide if missing |
|---|---|
| Users section in [`Admin.jsx`](src/pages/Admin.jsx) | email column → `users.viewEmails`; username → `users.viewUsernames`; status edit → `users.editStatus`; delete → `users.delete` (always for staff) |
| [`AdminPlaysPage.jsx`](src/pages/AdminPlaysPage.jsx) | New → `plays.add`; Delete → `plays.delete` (always for staff); Rename → `plays.rename`; Share → `plays.copyShareLinks`; Tags → `plays.editTags`; sport filter scoped to `plays.sportScope` |
| [`AdminPlayEditPage.jsx`](src/pages/AdminPlayEditPage.jsx) | Save → `plays.editContent` |
| [`AdminSportPresetsPage.jsx`](src/pages/AdminSportPresetsPage.jsx) | New preset → `presets.create`; sport picker → `presets.sportScope`; edit → `presets.edit` |
| [`AdminPresetEditPage.jsx`](src/pages/AdminPresetEditPage.jsx) | Save → `presets.edit` |
| [`AdminUserIssues.jsx`](src/pages/AdminUserIssues.jsx) | Status change → `issues.resolve` |
| [`AdminDemoVideos.jsx`](src/pages/AdminDemoVideos.jsx) | Upload → `videos.addDemo` |
| Prefab usage in editor (`useCustomPrefabs`, `prefabsApi`) | Admin prefab CRUD → `prefabs.manage` |

### Owner invite UI — lives in `/admin` (not `/staff`)

New section inside [`Admin.jsx`](src/pages/Admin.jsx) (or extracted `AdminStaffManager.jsx`):
- "Invite staff admin" modal — email + checkbox grid grouped by section, sport scope chips, soft dependency warnings ("Edit user status requires View users — also check?").
- "Active staff" list with edit/revoke.
- "Pending invites" list with resend/revoke.

---

## Tests — [`admin/test/`](admin/test/)

### Server
- `staffPermissions.test.js` — JSON shape, `hasPerm`, sport-scope resolver
- `staffAuthMiddleware.test.js` — `requireAdminOrStaff` accepts both modes; `requireOwnerOrLegacyAdmin` accepts legacy admin + owner JWT; missing perm → 403
- `staffInviteFlow.test.js` — create/list/revoke/accept invites; expiry; duplicate email; link existing user vs new signup
- `staffPlaysSportScope.test.js` — staff with `["rugby"]` cannot read/write football platform plays
- `staffRedaction.test.js` — `/admin/users` masks email/username when perm missing
- `staffPrefabsPermission.test.js` — prefab GET/POST/DELETE gated by `prefabs.manage`
- `dangerModeStaffBlocked.test.js` — staff with `users.delete` / `plays.delete` / preset delete still gets 403
- `staffEndpointCoverage.test.js` — assertion that every `/admin/*` route is mapped to either a permission or `requireOwnerOrLegacyAdmin` (no unguarded staff path)
- `adminAuditLog.test.js` — mutations write rows with `actor_auth_mode`, `actor_user_id`, action, target, metadata; legacy admin attributes to `OWNER_USER_ID`

### Frontend
- `staffNavFiltering.test.js` — nav renders only granted sections
- `staffTransport.test.js` — `adminApi` sends `x-admin-session` in legacy mode, `credentials: "include"` in staff mode
- `staffRouteGuards.test.js` — unauthed → redirect to `/staff/login`; authed but missing perm → "no access" empty state
- `staffEditorReturnLinks.test.js` — editor save returns to `/staff/app` when entered via `/staff/plays/:id/edit`
- `staffConditionalUI.test.js` — buttons/columns hidden per perm across users, plays, presets, issues, videos, prefabs

---

## Rollout — 8 PRs, each independently shippable

1. **Schema + owner identity.** New tables (`staff_admins`, `staff_admin_invites`, `admin_audit_log`), `OWNER_USER_ID` env var + boot validation, `isOwner(userId)` helper, `requireOwnerOrLegacyAdmin` middleware. No UI yet.
2. **Staff auth foundation.** `requireAdminOrStaff`, `requirePerm`, `requireSportScope`, `redactByPerm`, `writeAudit`. Convert `GET /admin/analytics` as proof of pattern + tests.
3. **Endpoint conversion.** Swap every route per the mapping table; add `requireOwnerOrLegacyAdmin` to owner-only maintenance routes; wire `writeAudit` on every mutation. Per-endpoint tests. `staffEndpointCoverage.test.js` ensures no gap.
4. **Invite flow.** Owner CRUD endpoints; `POST /staff/accept-invite`; `GET /staff/session`; `sendStaffAdminInviteEmail`. Tests cover all paths.
5. **Shared transport helper + un-hardcode pages.** Add `adminTransport.js`, broaden `AdminContext`, migrate all 16 files off raw `x-admin-session` to `adminApi(path, opts)`. Existing `/admin` flow regression-tested — same behavior, new plumbing.
6. **`/staff` route tree.** Login, accept-invite, guard, route mounts reusing Admin* pages with `basePath="/staff"`. Editor return links read from `basePath`.
7. **Conditional UI** in reused pages — hide buttons/columns/actions by `hasPerm`. Add `staffConditionalUI.test.js`.
8. **Owner invite UI** in `/admin` — checkbox-grid modal, active staff list, pending invites list. Update [`CRAWLER_MAP.md`](CRAWLER_MAP.md) (add `/staff/*` routes, `src/staff/` if used, new server files, new tables). Add brief `src/staff/STAFF.md` explaining auth modes + permission gates.

Each PR leaves the system functional: at any cut-point `/admin` still works and `/staff` either isn't reachable yet or works for what's been built.

---

## Deployment

DB schema and routes both change → **Railway redeploy required** for PRs 1, 3, 4. Follow the deploy checklist in [`CLAUDE.md`](CLAUDE.md) (run from project root, `--service resplendent-inspiration`, no `--ci` flag, `.railwayignore` present).

---

## Verification (end-to-end smoke test post-PR-8)

1. Set `OWNER_USER_ID` env to your dev account's `users.id`. Boot server.
2. Log in to `/admin` with `ADMIN_HASH` — confirm legacy flow unchanged. Open "Invite staff admin," invite a second test account with `dashboard.viewAnalytics + users.viewTable + plays.{viewFolders,sportScope:[rugby],rename,editTags,editContent}`.
3. Open the invite email link in a private window → accept → sign in.
4. Visit `/staff` as the invited account. Confirm:
   - Nav shows only Dashboard, Users, Plays.
   - Users table shows masked emails + masked usernames.
   - Plays library shows only rugby folders/plays.
   - Editor save works; return goes to `/staff/app`.
   - Delete buttons are hidden; trying `DELETE /admin/plays/:id` via fetch returns 403.
   - `/staff/presets/:sport` and other un-granted routes show a "no access" state.
5. In owner `/admin`, edit the staff member's permissions to add `presets.create + presets.sportScope:[rugby]`. Reload `/staff`. Presets section appears.
6. Revoke the staff member. Next `/staff` request 401s and redirects to login.
7. Inspect `admin_audit_log` — confirm rows for every mutating action with correct `actor_auth_mode` ("staff") and `actor_user_id` (test account's id). Owner actions via legacy `/admin` show `actor_auth_mode = "legacy_admin"` and `actor_user_id = OWNER_USER_ID`.
8. Run `npm run test` — all suites in `admin/test/` pass.
