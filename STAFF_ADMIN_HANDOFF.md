# Staff Admin — Handoff

**Status:** scoped staff admin tier shipped and live on Railway. Frontend changes from this session are not yet committed (working tree dirty). The owner manages staff at `/admin/staff`; staff log in at `/staff/login`.

---

## What's live

### Server (Railway, current deploy: `c8e82d8e-87be-4d0e-b186-fe457d2eb932`)

**Schema** — three new tables (auto-migrated on boot) plus `created_by` columns:
- `staff_admins` — `{ user_id PK → users.id, permissions JSONB, invited_by, invited_at, accepted_at, revoked_at }`
- `staff_admin_invites` — `{ id, email, permissions, token, expires_at, accepted_at, … }`
- `admin_audit_log` — mutation log: `{ actor_auth_mode, actor_user_id, action, target_type, target_id, metadata }`
- `created_by UUID REFERENCES users(id)` added to: `platform_plays`, `sport_presets`, `sport_prefab_presets`, `admin_prefabs`. Existing rows = `NULL` (treated as owner-created → staff need the permission).

**Auth middleware** ([server/middleware/staffAuth.js](server/middleware/staffAuth.js)):
- `requireAdminOrStaff` — accepts legacy admin session or staff JWT
- `requireOwnerOrLegacyAdmin` — owner-only routes
- `requirePerm`, `requireAnyPerm` — boolean permission gates
- `requireSportScope` — case-insensitive sport-scope check (DB stores `"Rugby"`, UI grants `"rugby"`)
- `redactByPerm` — server-side field masking (emails / usernames)
- `actorOwnsResource(actor, createdBy)` — true if creator
- `actorCanModify(actor, createdBy, permPath)` — true if creator OR has perm
- `writeAudit(req, action, opts)` — fire-and-forget audit log write
- `resolveJwtActor(req)` — JWT-only resolver (used by `/staff/session` so a stale admin session can't leak owner privileges)

**Route map** ([server/routes/admin.js](server/routes/admin.js), [server/routes/staff.js](server/routes/staff.js)):
| Surface | Auth |
|---|---|
| `/staff/session` | JWT only → returns `{ authMode, userId, isOwner, permissions }` |
| `/staff/accept-invite` | public, token-gated |
| `/admin/staff-invites` (CRUD) + `/admin/staff-admins` (PATCH/DELETE) | `requireOwnerOrLegacyAdmin` |
| `/admin/users`, `/admin/users/:id/activity` | `users.viewTable` + `redactByPerm` |
| `/admin/users/:id/beta-tester` (PATCH) | `users.editStatus` |
| `/admin/plays` (GET/POST/PATCH) | `plays.viewFolders` / `plays.add` / per-field with ownership bypass |
| `/admin/plays/:id` (DELETE) | **No Danger Mode** — staff need ownership or `plays.delete`; owner deletes directly |
| `/admin/platform-folders` (GET) | `plays.viewFolders` + sport-scoped filter; (POST/PATCH/DELETE) `requireOwnerOrLegacyAdmin` |
| `/admin/page-sections` | `pageSections.manage` |
| `/admin/playbook-sections` GET / POST plays into | `playbooks.view` / `playbooks.addPlays`; section CRUD owner-only |
| `/admin/sport-presets/*` (POST/PATCH/DELETE) | `presets.create` / ownership-aware edit / ownership-aware delete |
| `/admin/sport-prefab-presets/*` | `prefabs.manage` for create; ownership-aware edit/delete |
| `/admin/prefabs` (POST/DELETE) | `prefabs.manage` for create; ownership-aware delete |
| `/admin/user-issues`, `/admin/error-reports`, `/admin/demo-videos` | gated by `issues.view` / `issues.resolve` / `errors.viewReports` / `videos.addDemo` |
| Owner-only maintenance (`cleanup`, `create-account`, `backfill-seeded-plays`, security email, deleted-team restore) | `requireOwnerOrLegacyAdmin` |

**Email** ([server/lib/email.js](server/lib/email.js)) — new `sendStaffAdminInviteEmail` via Resend.

**Env** — `OWNER_USER_ID` is set on Railway (`db60e1c2-bfbb-4482-aa3a-d7c80f481000`, `ericishcollege@gmail.com`).

### Frontend

- **`AdminContext`** ([src/admin/AdminContext.jsx](src/admin/AdminContext.jsx)) — exposes `basePath`, `authMode`, `isOwner`, `userId`, `permissions`, `hasPerm`, `hasSportScope`, `ownsResource`, `canModifyResource`, `sessionLoaded`. Probes `/staff/session` in `mode="staff"`.
- **`adminTransport.js`** ([src/admin/adminTransport.js](src/admin/adminTransport.js)) — shared transport. Sends `x-admin-session` only when NOT on `/staff/*` (prevents stale-admin-session leakage), always sends JWT cookie + Bearer.
- **`/staff` route tree** ([src/App.jsx](src/App.jsx)):
  - `/staff/login` ([StaffLogin.jsx](src/pages/StaffLogin.jsx)) — reuses `/auth/login`, verifies via `/staff/session`
  - `/staff/accept-invite` ([StaffAcceptInvite.jsx](src/pages/StaffAcceptInvite.jsx))
  - `/staff` dashboard ([StaffDashboard.jsx](src/pages/StaffDashboard.jsx)) — analytics for owner / first-allowed for staff / empty state if no perms
  - All other staff routes mount existing `Admin*` pages inside `RequireStaffSession` + `RequirePerm` (each route uses `anyOf` perms where appropriate)
- **`StaffAdminManager`** ([src/admin/StaffAdminManager.jsx](src/admin/StaffAdminManager.jsx)) — owner-only UI at `/admin/staff`: invite creation with permission grid, active staff with click-to-edit permission modal, pending invites with cancel.
- **Sidebar + nav** ([AdminSidebar.jsx](src/admin/components/AdminSidebar.jsx) / [AdminNav.jsx](src/admin/components/AdminNav.jsx)) — items filtered by perm; "Staff" entry visible only to owner; suppress flash until `sessionLoaded`.
- **`AdminPlaysPage`** ([src/pages/AdminPlaysPage.jsx](src/pages/AdminPlaysPage.jsx)):
  - PlayCard buttons (Edit / Rename / Tags / Delete) gated by `canModifyResource(play.createdBy, ...)` so own plays stay editable
  - "All Plays" entry hidden for non-owners
  - Auto-selects the first sport-scoped folder on page load
  - Danger Mode prompt removed from `handleDelete`

---

## Permission model

Stored as JSONB on `staff_admins.permissions`. Boolean unless sport-scoped (array of sport keys or `"*"`).

| Key | Type | Notes |
|---|---|---|
| `dashboard.viewAnalytics` | bool | |
| `users.viewTable` / `viewEmails` / `viewUsernames` / `editStatus` | bool | emails / usernames redacted server-side when missing |
| `tests.run` | bool | gated route, no current server endpoint |
| `errors.viewReports` | bool | error report list |
| `issues.view` / `issues.resolve` | bool | user-reported issues |
| `plays.viewFolders` | bool | enter library |
| `plays.add` | bool | create new plays |
| `plays.rename` / `editTags` / `editContent` | bool | gate **others'** plays only; staff always edit their own |
| `plays.delete` | bool | delete others' plays (own is always allowed) |
| `plays.copyShareLinks` | bool | |
| `plays.sportScope` | sport-scoped | per-sport access |
| `pageSections.manage` | bool | |
| `playbooks.view` / `playbooks.addPlays` | bool | |
| `presets.create` / `presets.edit` | bool | gate **others'** presets only |
| `presets.sportScope` | sport-scoped | shared with prefab presets |
| `prefabs.manage` | bool | gate others' prefab presets + admin prefabs |
| `videos.addDemo` | bool | |

**Ownership rule:** if `req.actor.userId === resource.created_by`, the actor can edit and delete that resource without needing the corresponding "manage others" permission. Owner always passes.

**Danger Mode:** still exists as middleware (`requireElevated`) and OTP infra in `/admin/elevate/*`. Removed from play delete in this session. Still active on the `/elevate` endpoints themselves; no other routes currently use it.

---

## How to test end-to-end

1. **Log in as owner at `/admin`** with `ADMIN_HASH` password.
2. **Go to `/admin/staff`**. Invite a test email with a partial permission grid (e.g. `plays.viewFolders` + `plays.add` + sport scope `rugby`).
3. **Open the invite link** in a private window — the modal shows both a production URL and a local-dev URL clickable when running localhost.
4. **Accept the invite** (signup if no account, otherwise direct accept).
5. **Log in at `/staff/login`** with that account.
6. Verify: sidebar shows only granted sections; "All Plays" is hidden; only the rugby folder is visible; new plays can be created and edited by that account; previously-owner-created plays cannot be edited.
7. Back in `/admin/staff`, click the staff member's name → modal opens with their current permissions → toggle a permission → Save. Refresh `/staff` to see it reflected.

---

## Still TODO (not done this session)

1. **Sport presets / prefab preset UI ownership** — `AdminSportPresetsPage` and `AdminSportPrefabPresetsPage` don't yet visually distinguish own vs others' presets. Server enforces correctly; UI is permissive. Add `canModifyResource(preset.createdBy, "presets.edit")` gates on the edit/delete buttons in those lists.
2. **Folder ownership** — `platform_play_folders` has no `created_by`. Folders remain owner-managed (only owner can create/rename/delete). Acceptable for now unless staff need to organise their own work into custom folders.
3. **Granular prefab preset permissions** — currently a single `prefabs.manage` toggle. The user wanted finer control (separate add vs edit vs delete). Would need three new permission keys.
4. **Cleanup of remaining hard-coded `coachable_admin_session` reads** — 16 admin pages were migrated to drop the header on `/staff/*` and add `credentials: "include"`, but the per-file pathname checks (`window.location.pathname.startsWith("/staff") ? null : ...`) are scattered. Future cleanup: one shared `useAdminTransport()` hook that all pages consume.
5. **Audit log UI** — `admin_audit_log` is being written but there's no UI to view it yet. Useful for the owner to see what staff have done.
6. **Tests for ownership-aware routes** — current tests cover the auth middleware family but not the new PATCH/DELETE ownership branches. Worth adding for regression safety.

---

## Working tree state

**Uncommitted changes** (all currently deployed on Railway):
- Removed Danger Mode from `DELETE /admin/plays/:id` server-side
- Removed `ensureElevated()` from `handleDelete` in `AdminPlaysPage.jsx`
- Route guard fix for `/staff/plays/:playId/edit` (now uses `anyOf` instead of just `plays.editContent`)
- "All Plays" hidden for non-owners + auto-select first folder
- Case-insensitive sport-scope helpers (server + frontend)
- Ownership-aware POST / PATCH / DELETE on plays, presets, prefab presets, admin prefabs
- `created_by` schema columns + indexes

**Pushed commits on main:**
- `e7323c9` — initial scoped staff admin tier
- `b8e1cc5` — ownership-aware permissions

Don't commit or push automatically — per [memory/feedback_push_control.md](memory/feedback_push_control.md), the user controls all pushes explicitly.

---

## File index

**New files this session:**
- [server/middleware/staffAuth.js](server/middleware/staffAuth.js)
- [server/routes/staff.js](server/routes/staff.js)
- [src/admin/adminTransport.js](src/admin/adminTransport.js)
- [src/admin/RequirePerm.jsx](src/admin/RequirePerm.jsx)
- [src/admin/StaffAdminManager.jsx](src/admin/StaffAdminManager.jsx)
- [src/pages/StaffLogin.jsx](src/pages/StaffLogin.jsx)
- [src/pages/StaffAcceptInvite.jsx](src/pages/StaffAcceptInvite.jsx)
- [src/pages/StaffDashboard.jsx](src/pages/StaffDashboard.jsx)
- [src/pages/AdminStaff.jsx](src/pages/AdminStaff.jsx)
- [admin/test/staffAuthOwner.test.js](admin/test/staffAuthOwner.test.js)
- [admin/test/staffAuthMiddleware.test.js](admin/test/staffAuthMiddleware.test.js)
- [STAFF_ADMIN_PLAN.md](STAFF_ADMIN_PLAN.md) — the original design plan

**Notably modified:**
- [server/db/schema.sql](server/db/schema.sql) — 3 new tables + 4 created_by columns
- [server/routes/admin.js](server/routes/admin.js) — full permission gating, ownership-aware mutations, staff invite endpoints
- [server/middleware/auth.js](server/middleware/auth.js) — exposed `verifySessionToken`, `readSessionToken` for compositional auth
- [server/lib/email.js](server/lib/email.js) — `sendStaffAdminInviteEmail`
- [server/index.js](server/index.js) — mounted `/staff` router
- [src/App.jsx](src/App.jsx) — `/staff` route tree + `StaffLayout` + `RequireStaffSession`
- [src/admin/AdminContext.jsx](src/admin/AdminContext.jsx) — staff session probe + ownership helpers
- [src/admin/components/AdminSidebar.jsx](src/admin/components/AdminSidebar.jsx), [AdminNav.jsx](src/admin/components/AdminNav.jsx) — perm-filtered nav
- 16 reused admin pages — credentials, basePath-aware redirects, null session on `/staff`

**Crawler map** ([CRAWLER_MAP.md](CRAWLER_MAP.md)) updated with new files, routes, and tables.
