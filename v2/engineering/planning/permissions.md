# Permissions

**Status:** Authoritative permission model for v2. No open decisions.
**Scope:** Team role permissions, `assistantPermissions` overrides, `playerViewMode` behavior, and the `usePermissions()` hook contract. Does not cover staff/admin permissions — those are handled by `staffAuth.js` and `RequirePerm` in `routing.md`.

---

## Roles

Four roles are stored in `team_memberships.role`:

| Role | Access level |
|---|---|
| `owner` | Full access including ownership transfer |
| `coach` | Full access except ownership transfer |
| `assistant_coach` | Restricted by default; expandable per-operation via `assistantPermissions` |
| `player` | View-only; can favorite plays and respond to notifications |

`owner` is a strict superset of `coach`. The only owner-exclusive operation is `canTransferOwnership`.

---

## Permission matrix

All flags follow the `can*` prefix convention (`frontend-code-standards.md §02`).

### Plays

| Flag | owner | coach | asst | player | Notes |
|---|---|---|---|---|---|
| `canCreatePlay` | ✓ | ✓ | ✓* | — | Gatable via `assistantPermissions` |
| `canEditPlay` | ✓ | ✓ | ✓* | — | Gatable — canvas editing |
| `canSharePlay` | ✓ | ✓ | ✓ | — | Always true for assistant |
| `canDuplicatePlay` | ✓ | ✓ | ✓ | — | Always true for assistant |
| `canFavoritePlay` | ✓ | ✓ | ✓ | ✓ | All roles |
| `canViewTrash` | ✓ | ✓ | ✓ | — | Always true for assistant |
| `canBulkEdit` | ✓ | ✓ | — | — | Role-only; not gatable |
| `canRenamePlay` | ✓ | ✓ | own + * | — | Own-play always; others via flag |
| `canMovePlay` | ✓ | ✓ | own + * | — | Own-play always; others via flag |
| `canHideFromPlayers` | ✓ | ✓ | own + * | — | Own-play always; others via flag |
| `canArchivePlay` | ✓ | ✓ | own + * | — | Own-play always; others via flag |
| `canRestorePlay` | ✓ | ✓ | own + * | — | Own-play always; others via flag |
| `canDeletePlay` | ✓ | ✓ | own + * | — | Trash view only; own-play always; others via flag |
| `canPostToCommunity` | ✓ | ✓ | own + * | — | Own-play always; others via flag; feature flag also required |

### Folders

| Flag | owner | coach | asst | player |
|---|---|---|---|---|
| `canManageFolders` | ✓ | ✓ | ✓ | — |

Assistants can create, rename, reorder, delete, and share any folder by default. No per-assistant override.

### Roster and team

| Flag | owner | coach | asst | player | Notes |
|---|---|---|---|---|---|
| `canManageRoster` | ✓ | ✓ | ✓* | — | Gatable — restrictable by coach |
| `canManageInviteCodes` | ✓ | ✓ | ✓ | — | View and rotate invite codes |
| `canSendInvites` | ✓ | ✓ | —* | — | Gatable — grantable by coach |
| `canEditTeamSettings` | ✓ | ✓ | — | — | Role-only; assistants excluded to prevent privilege escalation |
| `canTransferOwnership` | ✓ | — | — | — | Owner-only |

### UI

| Flag | owner | coach | asst | player |
|---|---|---|---|---|
| `canViewAdmin` | ✓ | ✓ | ✓ | — |

`canViewAdmin` gates coach-facing UI: team settings section, invite code management, admin-specific nav items. It does not control access to `/admin/*` or `/staff/*` — those use entirely separate auth systems.

---

## assistantPermissions

A per-team object stored in `team_settings` and configured by the coach or owner. It is **not per-assistant** — every assistant on a team shares the same permission set.

Returned from `GET /api/auth/me` as part of the active team context. The frontend reads it from `AuthContext`; it never fetches `team_settings` directly.

### Flag list and defaults

`assistantPermissions` replaces the old coarse `canCreateEditDeletePlays` column with individual flags. The database schema for `team_settings` changes accordingly.

| Flag | Default | Behavior |
|---|---|---|
| `canCreatePlay` | `true` | When `false`, assistants cannot create new plays |
| `canEditPlay` | `true` | When `false`, assistants cannot open the play editor on any play |
| `canRenamePlay` | `false` | When `true`, assistants can rename any play (not just own) |
| `canMovePlay` | `false` | When `true`, assistants can move any play to a folder |
| `canHideFromPlayers` | `false` | When `true`, assistants can hide/show any play |
| `canArchivePlay` | `false` | When `true`, assistants can archive any play |
| `canRestorePlay` | `false` | When `true`, assistants can restore any play from trash |
| `canDeletePlay` | `false` | When `true`, assistants can permanently delete any play from trash |
| `canPostToCommunity` | `false` | When `true`, assistants can post any play to community (feature flag still required) |
| `canManageRoster` | `true` | When `false`, assistants cannot remove members from the team |
| `canSendInvites` | `false` | When `true`, assistants can send invite emails |

### Own-play exception

Regardless of `assistantPermissions`, assistants always get the full coach action set on plays they created. This is enforced at the component level by PlayCard via the `isCreatedByViewer` prop — computed as `createdByUserId === viewer.id` at the call site.

`usePermissions()` does **not** encode this rule. The hook resolves flags assuming the user is acting on a play they did not create. Components combine `usePermissions()` with `isCreatedByViewer` to determine what to show.

```tsx
// PlayCard — Rename is shown if the user has the flag OR created the play
const { canRenamePlay } = usePermissions();
const showRename = canRenamePlay || isCreatedByViewer;
```

### Where assistantPermissions is configured

Accessible to `owner` and `coach` only. `PATCH /api/teams/:id/settings` is restricted to those roles in v2 — assistants cannot modify their own permission set (privilege escalation).

---

## playerViewMode

A UI toggle that lets a coach preview the app as a player sees it. Stored in `AuthContext`; has no server representation.

When `playerViewMode === true`, `usePermissions()` returns player-level permissions regardless of the user's actual role. All coach-exclusive flags return `false`; only `canFavoritePlay` returns `true`.

The user's actual role and `assistantPermissions` are preserved in `AuthContext` — `playerViewMode` is a read-only overlay in `usePermissions()`, not a mutation of the user object.

For the full playerViewMode UX spec (what is visually hidden, the toggle placement, persistence), see `design/player-view-mode.md` (task 9.3).

---

## usePermissions()

A derived hook — no network request, no new context, no new state. Reads from `AuthContext`:

```
user.role               → role baseline
user.assistantPermissions → per-operation overrides (null when role !== 'assistant_coach')
playerViewMode          → UI overlay
```

### Resolution order

1. If `playerViewMode === true` → return player permissions (`canFavoritePlay: true`, all others `false`)
2. If `role === 'owner'` → return full permission set (all `true`)
3. If `role === 'coach'` → return full permission set except `canTransferOwnership: false`
4. If `role === 'assistant_coach'` → start from assistant baseline, apply `assistantPermissions` overrides
5. If `role === 'player'` → return player permissions (`canFavoritePlay: true`, all others `false`)

### Assistant baseline (before assistantPermissions overrides)

```
canCreatePlay:        true
canEditPlay:          true
canSharePlay:         true
canDuplicatePlay:     true
canFavoritePlay:      true
canViewTrash:         true
canManageFolders:     true
canManageRoster:      true
canManageInviteCodes: true
canViewAdmin:         true

canBulkEdit:          false
canSendInvites:       false
canEditTeamSettings:  false
canTransferOwnership: false

canRenamePlay:        false  ← own-play exception applies in components
canMovePlay:          false  ← own-play exception applies in components
canHideFromPlayers:   false  ← own-play exception applies in components
canArchivePlay:       false  ← own-play exception applies in components
canRestorePlay:       false  ← own-play exception applies in components
canDeletePlay:        false  ← own-play exception applies in components
canPostToCommunity:   false  ← own-play exception applies in components
```

`assistantPermissions` flags override the values marked with `←` (and `canCreatePlay`, `canEditPlay`, `canManageRoster`, `canSendInvites`).

### Return type

```ts
interface Permissions {
  // Plays — always available to assistants
  canCreatePlay: boolean;
  canEditPlay: boolean;
  canSharePlay: boolean;
  canDuplicatePlay: boolean;
  canFavoritePlay: boolean;
  canViewTrash: boolean;
  canBulkEdit: boolean;

  // Plays — own-play exception applies for assistants
  canRenamePlay: boolean;
  canMovePlay: boolean;
  canHideFromPlayers: boolean;
  canArchivePlay: boolean;
  canRestorePlay: boolean;
  canDeletePlay: boolean;
  canPostToCommunity: boolean;

  // Folders
  canManageFolders: boolean;

  // Roster and team
  canManageRoster: boolean;
  canManageInviteCodes: boolean;
  canSendInvites: boolean;
  canEditTeamSettings: boolean;
  canTransferOwnership: boolean;

  // UI
  canViewAdmin: boolean;
}
```

### Usage patterns

```tsx
// Route guard — redirect if lacking permission
const { canViewTrash } = usePermissions();
if (!canViewTrash) return <Navigate to="/app/plays" />;

// Component gating — hide, never disable
const { canCreatePlay } = usePermissions();
{canCreatePlay && <NewPlayButton />}

// Assistant + own-play pattern
const { canRenamePlay } = usePermissions();
const showRename = canRenamePlay || isCreatedByViewer;
{showRename && <RenameMenuItem />}
```

Role checks on the frontend are a UX convenience. `requireTeamRole` middleware enforces permissions on the server independently. Never rely on frontend gating alone for security.

---

## Concrete example — end-to-end flow

**Scenario:** An assistant coach with `canEditPlay: false` in `assistantPermissions` tries to open the play editor.

1. **Route guard** (`/app/plays/:id/edit`) — `RequireAuth → RequireVerifiedEmail → RequireOnboarded` pass. No role-specific route guard exists for the edit route — the guard is in the page.

2. **Page (`PlayEditPage`)** — calls `usePermissions()`. Resolves `canEditPlay`: role is `assistant_coach`, `assistantPermissions.canEditPlay` is `false`, so `canEditPlay: false`. Page renders a redirect or an access-denied state rather than the editor.

3. **API** — if the assistant bypasses the frontend and hits `PATCH /api/teams/:id/plays/:playId` directly, `requireTeamRole('coach')` passes (assistant_coach satisfies coach+). The server does not enforce `canEditPlay`. **Frontend permission flags are not a security boundary** — the server relies on role membership, not the granular flags.

This means `canEditPlay: false` is a UX restriction only. If strict server-side enforcement is required for a given flag, the relevant API route must be updated to check `team_settings` directly.

---

## postToCommunity — triple gate

`canPostToCommunity` requires all three conditions:

1. `usePermissions().canPostToCommunity === true` (role / assistantPermissions)
2. `isCreatedByViewer === true` (only the creator can post their play)
3. `canRolePostToCommunity` feature flag enabled for the user

Neither condition alone is sufficient. The check in the component is:

```tsx
const { canPostToCommunity } = usePermissions();
const { canRolePostToCommunity } = useFeatureFlags();
const showPostToCommunity = canPostToCommunity && isCreatedByViewer && canRolePostToCommunity;
```

---

## Layer responsibilities

| Layer | Responsibility |
|---|---|
| `usePermissions()` | Resolves role + assistantPermissions + playerViewMode into a flat `Permissions` object |
| PlayCard / components | Per-play `isCreatedByViewer` exception for assistants; combines with `usePermissions()` |
| Route guards | Consume `canViewTrash`, `canViewAdmin` for route-level access |
| API middleware (`requireTeamRole`) | Server-side role enforcement — independent of frontend flags |
| `team_settings` | Stores `assistantPermissions` for the team; read by the server and returned in `/auth/me` |

---

## Cross-reference notes

**References:**
- `engineering/audits/api-review.md` — `requireTeamRole` middleware, current `team_settings` schema
- `engineering/frontend-code-standards.md §14` — hide don't disable; `can*` naming convention
- `design/component-specs.md` — PlayCard action matrix, `AssistantPermissions` interface (needs update to match expanded flag list above)
- `engineering/planning/state-management.md §08` — `usePermissions()` is a derived hook reading from `AuthContext`
- `engineering/planning/routing.md` — route guards that consume permission flags
- `design/player-view-mode.md` — full playerViewMode UX spec (task 9.3)

**Referenced by:**
- `engineering/planning/routing.md` — `RequirePerm` for staff; team role guards for app routes
- `design/component-specs.md` — PlayCard `assistantPermissions` prop and action matrix
- `engineering/planning/testing/ui-testing-standards.md` — role-based test patterns
- `design/pages/plays-page.md` — which actions are shown per role (task 11.1)
- `design/pages/team-management.md` — who can manage roster and invites (task 11.6)
- `design/pages/settings-pages.md` — who can access team settings (task 11.5)
- `design/pages/player-experience.md` — player permission set (task 11.4)
