# Settings Pages — Design Spec

**Status:** Authoritative design spec for settings in v2.
**Output:** Informs `src/app/pages/Profile.tsx` and `src/app/pages/Settings.tsx`.
**Routes:** `/app/profile`, `/app/profile/verify-email`, `/app/settings`
**Guards:** `RequireAuth → RequireVerifiedEmail → RequireOnboarded` on all routes.

---

## Overview

Settings are split across two routes that reflect the natural ownership boundary:

| Route | Scope | Who can access |
|---|---|---|
| `/app/profile` | User account — name, email, password | Any authenticated user |
| `/app/settings` | Team — name, sport, season year, assistant permissions | `owner` and `coach` only |

Both routes are accessed from the sidebar nav. The entry point for `/app/profile` is the user avatar at the bottom of the sidebar (or in the mobile header). `/app/settings` is a standard nav item, hidden for players and assistants.

---

## Profile page (`/app/profile`)

Single scrollable page with three sections separated by 24px vertical gaps. No sub-nav.

### Section 1 — Account

**Display name**
- Label: "Display name"
- Single `Input` field, pre-filled with `user.name`
- On blur: validates non-empty (min 2 chars)
- Save button: "Save" (`primary`, `sm`). Shows loading state while `PATCH /api/users/me` is in flight.
- Success: `showToast({ type: 'success', message: 'Name updated.' })`
- Error: `showToast({ type: 'error', message: err.message || 'Failed to update name.' })`

**Email**
- Label: "Email"
- Read-only display of current email (not an editable Input — email change is a deliberate multi-step flow)
- "Change email" link below the display: navigates to the email change form (inline expansion or separate sub-section — see below)
- Current email has a verified badge (`--ui-success-text` checkmark + "Verified") once `emailVerified === true`

**Email change flow (inline expansion):**
1. "New email" Input appears below the current email display
2. CTA: "Send verification code" — calls `POST /api/users/me/change-email`; requires current password field above new email for security (v2 requirement per api-review.md §auth problem 2)
3. A 6-digit OTP input renders after code is sent; navigates to `/app/profile/verify-email` where the user enters the code
4. On success: `POST /api/users/me/confirm-email-change`; email in the header/profile updates; success toast
5. Cancel link dismisses the expansion and restores the read-only display

**Password change**
- Label: "Password"
- Three `Input` fields stacked: "Current password" (type="password"), "New password" (type="password"), "Confirm new password" (type="password")
- On blur: new password validates min 8 chars; confirm validates match
- CTA: "Update password" (`primary`, `sm`)
- Calls `POST /api/users/me/change-password` with `{ currentPassword, newPassword }` (v2 endpoint — not the email-reset flow)
- Success: toast + all three fields cleared
- Error — wrong current password: inline error on "Current password" field
- Error — other: error toast

---

### Section 2 — Preferences

Notification and display preferences stored via `PATCH /api/users/me/preferences`.

**Theme**
- Label: "Theme"
- `Select` with options: System, Light, Dark
- On change: applies immediately via `ThemeScript` + persists to localStorage; calls `PATCH /api/users/me/preferences` to sync server-side for multi-device consistency

No notification preference toggles in v2 — notification settings are not per-user configurable in this version. This section may be extended in a future version.

---

### Section 3 — Danger zone

Visual treatment: section bordered with `var(--ui-error)` at 30% opacity, `--radius` (10px), 16px padding.

**Leave team**
- Visible only when user has a team membership (not solo workspace)
- Button: "Leave team" (`destructive`, `sm`)
- Click opens a `Modal` (size="sm") with title "Leave team?" and body: "You will lose access to this team's plays and data. This cannot be undone."
- Modal CTA: "Leave team" (`destructive`) → calls `POST /api/teams/:id/leave`. If no teams remain after leaving, server auto-creates a personal workspace.
- Cancel: "Keep my access" (`secondary`)

**Delete account**
- Button: "Delete my account" (`destructive`, `sm`)
- Click opens a `Modal` (size="sm") with title "Delete account?" and body: "Your account and all personal data will be permanently deleted. Team plays are not deleted."
- Requires typing `DELETE` in a confirmation Input before the destructive CTA becomes enabled.
- No dedicated delete-account endpoint in v1 — this is a v2 addition. Route: `DELETE /api/users/me`.

---

## Team settings page (`/app/settings`)

**Access guard:** `canEditTeamSettings` — rendered only for `owner` and `coach`. Assistants and players do not see this nav item. If an assistant navigates directly to `/app/settings`, the page renders an access-denied `EmptyState`.

Single scrollable page with three sections.

### Section 1 — Team info

**Team name**
- Input pre-filled with current team name
- Save button: "Save" (`primary`, `sm`) → calls `PATCH /api/teams/:id/settings` with `{ name }`
- Validates non-empty (min 2 chars)

**Sport**
- `Select` pre-filled with current sport value from the sports config list
- On save: calls `PATCH /api/teams/:id/settings` with `{ sport }`
- Save uses the same "Save" button as team name (one button saves both fields), or alternatively two inline save buttons — one per field. Recommended: per-field inline save to reduce accidental changes.

**Season year**
- `Input` (type="number") pre-filled with `seasonYear` — e.g. 2026
- Optional field; can be cleared
- Saved alongside team name / sport via `PATCH /api/teams/:id/settings`

---

### Section 2 — Assistant permissions

Visible to owner and coach. Controls the `assistantPermissions` object stored in `team_settings`.

Section heading: "Assistant coach permissions" (subheading level, 17px Manrope 600)
Body below heading: "These settings apply to all assistant coaches on this team."

Each permission is a `Checkbox` with a label and one-line description:

| Checkbox label | Description | Default |
|---|---|---|
| Create plays | Assistants can create new plays | ✓ checked |
| Edit plays | Assistants can edit any play | ✓ checked |
| Rename plays | Assistants can rename any play | unchecked |
| Move plays | Assistants can move any play to a folder | unchecked |
| Hide / show plays from players | Assistants can toggle play visibility | unchecked |
| Archive plays | Assistants can archive any play | unchecked |
| Restore from trash | Assistants can restore archived plays | unchecked |
| Delete from trash | Assistants can permanently delete plays | unchecked |
| Post to community | Assistants can post any play to the community | unchecked |
| Manage roster | Assistants can remove members | ✓ checked |
| Send invites | Assistants can send email invites | unchecked |

Save button: "Save permissions" (`primary`) at the bottom of the section → calls `PATCH /api/teams/:id/settings` with the full `assistantPermissions` object.

Note: assistants always retain full actions on plays they created regardless of these settings (own-play exception enforced in `PlayCard`).

---

### Section 3 — Danger zone

Visual treatment: same as Profile danger zone (error-bordered panel).

**Transfer ownership (owner only)**
- Visible only when `canTransferOwnership === true` (i.e., viewer is owner)
- Button: "Transfer ownership" (`destructive`, `sm`)
- Opens Modal (size="md") with a `Select` of current team members (coaches and assistants only — players cannot receive ownership)
- CTA: "Transfer" → calls `POST /api/teams/:id/ownership-transfer`
- After transfer: viewer's role becomes coach; the selected user becomes owner. Page reloads with updated permissions.

**Delete team (owner only)**
- Visible only when viewer is owner
- Button: "Delete team" (`destructive`, `sm`)
- Opens Modal (size="sm") with title "Delete team?" and body: "All plays, folders, and team data will be permanently deleted. Members will be removed."
- Requires typing the team name in a confirmation Input before the destructive CTA becomes enabled.
- CTA: "Delete team" (`destructive`) → calls the relevant delete endpoint.
- After deletion: viewer is navigated to `/app/plays` with their personal workspace active (auto-created by server).

---

## Navigation access

| Nav item | owner | coach | assistant | player |
|---|---|---|---|---|
| Profile (`/app/profile`) | ✓ | ✓ | ✓ | ✓ |
| Settings (`/app/settings`) | ✓ | ✓ | — | — |

Profile is always accessible via the user avatar at the bottom of the sidebar. Settings is a standard nav item shown only when `canEditTeamSettings === true`.

On mobile, profile access is via the header avatar or bottom nav (if included in the nav item list for the user's role).

---

## Email change verification page (`/app/profile/verify-email`)

A minimal full-width page within `PageShell` (no sidebar — `sidebar={false}`). Used only for the email-change OTP flow, not for the initial account verification (which is at `/verify-email`).

- Heading: "Verify your new email"
- Body: "Enter the 6-digit code sent to [new email]."
- Six-digit OTP input (single `Input` with `type="text"` and digit-input behavior, or six individual single-char inputs — implementation choice)
- CTA: "Confirm" → calls `POST /api/users/me/confirm-email-change`
- Resend link: "Resend code" → calls `POST /api/users/me/change-email` again with the same new email; rate-limited to once per 60 seconds
- On success: navigates back to `/app/profile` with a success toast: "Email updated."
- On error (wrong code): inline error on the OTP input

---

## Decisions made in this doc

| Decision | Choice |
|---|---|
| Profile vs settings split | `/app/profile` = user account; `/app/settings` = team settings |
| Settings page structure | Single scrollable page with sections, no sub-nav |
| Email change flow | Requires current password re-confirmation (v2 security fix) + 6-digit OTP to new email |
| Password change | Dedicated inline form via new `POST /api/users/me/change-password` endpoint (v2 addition) |
| Assistant permissions UI | Per-flag checkboxes saved as a group |
| Theme preference | Saved to server preferences for multi-device consistency |
| Danger zone confirmation | Delete requires typing name/DELETE; transfer requires selecting user |
| Notification preferences | Not configurable per-user in v2; deferred |

---

## Cross-Reference Notes

**References:**
- `docs/engineering/audits/api-review.md` — `users.js`, `teams.js`, `verification.js` routes; v2 considerations for password change endpoint and email change security
- `docs/engineering/planning/permissions.md` — `canEditTeamSettings` (owner + coach only), `canTransferOwnership` (owner only), `assistantPermissions` flag list and defaults
- `docs/design/general-formatting-standards.md` — spacing, type scale, form validation, danger zone pattern

**Referenced by:**
- `src/app/pages/Profile.tsx`
- `src/app/pages/Settings.tsx`
- `src/app/pages/ProfileEmailVerification.tsx`
