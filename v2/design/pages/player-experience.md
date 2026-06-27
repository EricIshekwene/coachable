# Player Experience — Design Spec

**Status:** Authoritative design spec for all player-facing pages in v2.
**Output:** Informs `src/app/pages/Plays.tsx`, `src/app/pages/PlayView.tsx`, `src/app/pages/Notifications.tsx`, `src/app/pages/Team.tsx`, `src/app/pages/Profile.tsx`.
**Routes:** `/app/plays`, `/app/plays/:playId`, `/app/notifications`, `/app/team`, `/app/profile`
**Guards:** `RequireAuth → RequireVerifiedEmail → RequireOnboarded` on all routes.

---

## Overview

Players have a fundamentally read-only experience. They cannot create, edit, or delete plays, manage the roster, or modify team settings. They can view all non-hidden plays, favorite plays, respond to notifications, and manage their own profile.

Players share the same app shell (`PageShell`) and route tree as coaches. The difference is entirely in what is rendered within each page — coach-exclusive controls are hidden, not disabled.

---

## Permission set

Derived from `usePermissions()` with `role === 'player'`:

| Flag | Value |
|---|---|
| `canFavoritePlay` | `true` |
| All other flags | `false` |

Players never see create, edit, delete, share, duplicate, bulk-edit, or folder-management controls. Role gating follows the "hide, don't disable" rule — unavailable actions are not rendered at all.

---

## Home — Plays page (`/app/plays`)

Players land on the standard plays page. The server filters the response: `hidden_from_players` plays are excluded for players at the API level (`GET /api/:teamId/plays`).

**What players see:**
- All non-hidden team plays as `PlayCard` components in `context="team"` and `role="player"`
- Folders (navigate into folders to see their plays)
- Search and tag filter bar (read-only — searching and filtering a read-only list)
- Their own favorites accessible via the filter bar

**What players do not see:**
- "New Play" button
- Bulk-edit mode toggle
- Trash / archived plays
- Any play that has `hidden_from_players = true`

**PlayCard action menu (player):**

| Action | Visible to player |
|---|---|
| Open | ✓ |
| Favorite / Unfavorite | ✓ |
| Share | — |
| Duplicate | — |
| Rename / Move / Hide / Archive | — |
| Post to Community | — |

The kebab menu (⋯) still renders for players — it contains Open and Favorite. If a play has neither available (e.g., in a future restricted context), the kebab does not render.

**Empty state:**

When no plays are visible (all plays are hidden from players, or no plays exist):
- Icon: `PlayIcon` at `--icon-lg`
- Heading: "No plays yet"
- Body: "Your coach hasn't added any plays yet. Check back soon."
- No action CTA

---

## Play viewer (`/app/plays/:playId`)

When a player opens a play, they see `PlayView` — the in-layout read-only viewer. This is distinct from the full-screen viewer (`/app/plays/:playId/view` — `PlayViewOnlyPage`).

The `PlayView` page renders inside `PageShell` with the sidebar and nav visible. It displays:
- Play title and sport badge
- The canvas/animation in read-only playback mode — no editor chrome, no toolbar
- Tags (read-only `TagPill` components)
- Play notes (read-only)
- Favorite toggle (the one mutation available to players)

Players cannot navigate to `/app/plays/:playId/edit` — that route requires a coach+ role enforced at the page level via `usePermissions()`.

---

## Notifications (`/app/notifications`)

Players receive in-app notifications via the `NotificationsContext` polling mechanism (60-second interval on `GET /api/notifications/unread-count`).

The notification bell in the nav shows an unread badge when count > 0. Opening the bell fetches `GET /api/notifications` and shows the full list.

The `/app/notifications` route renders the full notification center (gated by the `in_app_notifications` feature flag, same as coaches).

**Notification list (player view):**
- `NotificationItem` components sorted by priority descending, then `created_at` descending
- Unread items show a left 3px `--ui-accent` border and `--ui-surface-raised` background
- `critical` and `high` priority items show the appropriate alert icon

**Notification detail panel:**
- Full `BlockRenderer` in `interactive={true}` mode — players can respond to question blocks
- Response submission calls `POST /api/notifications/:id/respond`
- Once responded, the panel re-renders with `disabled={true}` on all question fields and the "Responded" badge appears on the list item

**Empty state (no notifications):**
- Icon: `BellIcon` at `--icon-lg`
- Heading: "No notifications"
- Body: "You'll see messages from your coaching staff here."
- No action CTA

---

## Team roster (`/app/team`)

Players can view the team roster but cannot manage it. The `Team` page renders the same `TeamMemberCard` list visible to coaches, with all management controls hidden.

**What players see:**
- Full roster: avatar, name, email, role badge for all members
- Their own card is marked with `isCurrentUser={true}`

**What players do not see:**
- Remove button (hidden when player is the viewer — `canManageRoster` is false)
- Invite section (invite codes, email invite form)
- Role-change controls

Players have no reason to be blocked from seeing who is on their team. Roster visibility is not role-restricted at the API level (`GET /api/teams/:id/members` is open to any member).

---

## Profile (`/app/profile`)

Players manage their own profile at `/app/profile`, identical to coaches. There is no role restriction on profile settings.

**Available actions:**
- Update display name (`PATCH /api/users/me`)
- Change email — sends verification code to new address, user confirms via code (`POST /api/users/me/change-email` + `/api/users/me/confirm-email-change`)
- Change password — requires current password (`POST /api/users/me/change-password` — v2 addition)
- Update preferences (`PATCH /api/users/me/preferences`)

Profile is not a team-management surface. Account management is always available to every authenticated user regardless of role.

---

## Navigation items (player)

Players use the same `PageShell` as coaches. The sidebar and bottom nav items are role-filtered — coach-exclusive items are not rendered for players.

**Player nav items:**
- Plays (`/app/plays`)
- Notifications (`/app/notifications`) — badge shows unread count
- Team (`/app/team`)
- Profile (`/app/profile`)

**Hidden from players:**
- Any nav item that only makes sense with `canViewAdmin` — team settings shortcuts, etc.

---

## Mobile vs desktop

Player experience is the same on mobile and desktop — same layout, same `PageShell`, same `BottomNav` / `Sidebar` switch at the `md` breakpoint. There is no separate mobile-only or player-only layout.

---

## Decisions made in this doc

| Decision | Choice |
|---|---|
| Play visibility | All non-hidden plays visible to players; filtering is server-side |
| Play opening | `/app/plays/:playId` (PlayView, inside AppLayout) — not full-screen viewer |
| Notification responding | Players can respond to question blocks in notification detail |
| Roster visibility | Players can view roster; management controls hidden |
| Profile management | Players have full access to their own profile |
| Mobile layout | Identical to desktop — no player-only layout |

---

## Cross-Reference Notes

**References:**
- `docs/engineering/planning/permissions.md` — player permission set, `usePermissions()` resolution
- `docs/design/component-specs.md` — PlayCard action matrix (player context), NotificationItem, TeamMemberCard, EmptyState
- `docs/engineering/planning/features/notification-delivery.md` — polling mechanism, priority display, response flow
- `docs/engineering/planning/routing.md` — route guard stack, `/app/*` route tree

**Referenced by:**
- `src/app/pages/Plays.tsx` — hides coach controls based on `usePermissions()`
- `src/app/pages/PlayView.tsx` — read-only viewer spec
- `src/app/pages/Notifications.tsx` — notification center
- `docs/engineering/planning/permissions.md` — player flag definitions
