# Team Management — Design Spec

**Status:** Authoritative design spec for the team management page in v2.
**Output:** Informs `src/app/pages/Team.tsx`.
**Route:** `/app/team`
**Guards:** `RequireAuth → RequireVerifiedEmail → RequireOnboarded`

---

## Overview

The Team page is a dedicated route in the main app nav — not a section inside Settings. It is the single place for roster viewing, member management, invite sending, and invite code management.

All roles can access `/app/team`. What is rendered depends on the viewer's role:
- **Owner / Coach / Assistant (with canManageRoster):** Full roster + invite controls
- **Assistant (without canManageRoster):** Roster view + invite code (read-only) — no remove controls
- **Player:** Roster view only — no invite or management controls

---

## Layout

`PageShell` with `title="Team"`. Full-width content area with no sidebar restriction.

Two-column layout on desktop (md+): roster list on the left (60%), invite panel on the right (40%). Single-column stack on mobile (roster above invite panel).

---

## Roster list

### Header

Subheading: "Members" (17px Manrope 600). Member count in `caption` typography to the right: "5 members".

### Member rows

Each member renders as a `TeamMemberCard`:

```
[Avatar] [Name]         [Role badge]   [Remove button]
         [Email]
```

- Avatar: initials fallback (no avatar upload in v2 — `avatarUrl` will be null for all users; component renders initials)
- Name: `body-strong`
- Email: `caption`, `var(--ui-text-subtle)`
- Role badge: `label` typography, `--radius-sm`, role-specific background tint. Values: Owner, Coach, Assistant Coach, Player
- Remove button: trash icon, `ghost` variant. Only rendered when `canManageRoster` is true AND `!isCurrentUser`. On click: opens a confirmation `Modal` (size="sm") before calling `DELETE /api/teams/:id/members/:userId`.

**Role badge colors:**

| Role | Background | Text |
|---|---|---|
| owner | `var(--ui-success-text)` at 15% | `var(--ui-success-text)` |
| coach | `var(--ui-accent)` at 15% | `var(--ui-accent)` |
| assistant_coach | `var(--ui-info-text)` at 15% | `var(--ui-info-text)` |
| player | `var(--ui-surface-muted)` | `var(--ui-text-muted)` |

**Remove confirmation modal:**
- Title: "Remove [Name]?"
- Body: "[Name] will immediately lose access to this team and its plays."
- CTA: "Remove" (`destructive`) — calls `DELETE /api/teams/:id/members/:userId`; server sends a removal email to the removed user (fire-and-forget)
- Cancel: "Keep member" (`secondary`)
- `TeamMemberCard` shows `loading={true}` on the remove button while the request is in flight

### Current user row

The viewer's own row is always visible and marked `isCurrentUser={true}`. No remove button on the viewer's own row. A "You" label may be appended in `caption` typography next to the name.

### Sort order

Members sorted: owner first, then coach, then assistant_coach, then player. Within each role: alphabetical by name.

---

## Invite panel

Visible to coaches, owners, and assistants with `canSendInvites` or `canManageInviteCodes`.

### Invite by email

Heading: "Invite by email" (subheading level)

- `Input` (type="email") with placeholder "Enter email address"
- Role `Select` below: options "Coach", "Assistant Coach", "Player" — determines which invite code is sent in the email (coach code, assistant code, or player code)
- "Add another" link adds a second email Input (and third, up to 5 simultaneous invites)
- CTA: "Send invite" (`primary`) → calls `POST /api/teams/:id/invites` for each email
- Visible to: coach and owner always; assistant only when `canSendInvites === true`

**Sent state:**
- Success: inputs clear, toast "Invite sent."
- Error: toast with message

### Invite by link

Heading: "Invite by link" (subheading level)

Three invite links displayed — one per role (coach, assistant, player). Each row:

```
[Role label]   [code displayed in monospace]   [Copy] [Rotate]
```

- Code displayed in a styled `Input` with `disabled={true}` (looks like a read-only field, `--radius-md`)
- "Copy" button (`ghost`, `sm`): copies the full invite link (not just the code) to clipboard; shows "Copied!" for 2 seconds via tooltip or brief state change
- "Rotate" button (`ghost`, `sm`, rotate icon): calls `POST /api/teams/:id/invite-codes/rotate` with the appropriate role. Opens a confirmation modal first:
  - Title: "Rotate [Role] invite code?"
  - Body: "The current code will stop working immediately. Anyone with the old link won't be able to join."
  - CTA: "Rotate" (`destructive`), Cancel: "Keep current" (`secondary`)

Invite codes do not expire automatically in v2 — rotation is manual and always explicit.

- Visible to: coach and owner always; assistant when `canManageInviteCodes === true`
- Players see neither invite section

---

## Pending invites (future scope — not v2)

A "Pending invites" section showing email invites sent but not yet accepted is not included in v2. The current invite flow sends the standing invite code, not a one-time token, so there is no per-invite tracking to display. This can be added once invite tokens are one-time and trackable.

---

## Empty state

When the team has no other members (owner is the only member):
- Icon: `UsersIcon` at `--icon-lg`
- Heading: "Just you so far"
- Body: "Invite teammates to collaborate on plays."
- No action CTA — the invite panel above already provides the action

---

## Role change

Role changes are not available in the Team page UI in v2. Role is determined by the invite code used to join. Changing a member's role requires re-inviting with a different code. This keeps the UI scope manageable for v2 and avoids surfacing the `PATCH /api/teams/:id/members/:userId/role` endpoint that does not exist in v1.

If a role-change UI becomes necessary in a future version, it would be an inline role `Select` on the `TeamMemberCard` row, visible to owner only.

---

## Ownership transfer

Ownership transfer is accessible from `/app/settings` (team settings danger zone), not from the Team page. The Team page focuses on member management; ownership transfer is a high-consequence operation that belongs in the settings danger zone with explicit confirmation.

---

## Multiple teams

If a user is a member of more than one team, team-switching is handled globally in the sidebar (the team slot at the top with `onSwitchTeam` callback). The Team page always displays the current active team's roster. Switching teams via the sidebar switcher updates `AuthContext` and re-renders the Team page with the new team's data.

The Team page never shows members from other teams — it is always scoped to the active team.

---

## Decisions made in this doc

| Decision | Choice |
|---|---|
| Page location | Dedicated `/app/team` route in main nav |
| Layout | Two-column desktop (roster left, invite right); single-column mobile |
| Remove confirmation | Modal required before deletion |
| Invite code visibility | Shown to owner, coach, and assistant (with canManageInviteCodes) |
| Invite by email visibility | Owner and coach always; assistant only with canSendInvites |
| Role change | Not available in v2 — role determined by invite code used |
| Pending invites | Not in v2 — deferred until one-time tokens are implemented |
| Ownership transfer | In `/app/settings` danger zone, not on Team page |
| Code rotation | Requires confirmation modal before executing |

---

## Cross-Reference Notes

**References:**
- `docs/engineering/audits/api-review.md` — `teams.js` route: invite, join, leave, member management, invite-codes/rotate
- `docs/engineering/planning/permissions.md` — `canManageRoster`, `canManageInviteCodes`, `canSendInvites` per role
- `docs/design/component-specs.md` — `TeamMemberCard` props and visual spec

**Referenced by:**
- `src/app/pages/Team.tsx`
- `docs/design/pages/settings-pages.md` — ownership transfer lives in settings danger zone
