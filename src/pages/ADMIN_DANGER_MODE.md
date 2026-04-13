# Admin Danger Mode

## What it is

A second authentication layer (elevated permissions) that must be unlocked before any destructive admin action (user deletion, play deletion, folder deletion) can be performed.

This protects against accidental use or unauthorized access — even if someone steals your admin session cookie, they cannot delete data without also knowing the admin password.

---

## How it works

### Server-side (`server/routes/admin.js`)

- Sessions gain an `elevatedAt` timestamp field (null by default).
- A new endpoint `POST /admin/elevate` accepts the admin password. On success it sets `session.elevatedAt = Date.now()`.
- A `requireElevated` middleware checks that `elevatedAt` exists and is less than 10 minutes ago.
- Destructive routes now use `requireElevated` instead of `requireAdmin`:
  - `DELETE /admin/users/:id`
  - `DELETE /admin/users`
  - `DELETE /admin/plays/:id`
  - `DELETE /admin/platform-folders/:id`

Non-destructive routes (GET, POST, PATCH) still only require `requireAdmin`.

### Client-side

**`src/utils/adminElevation.js`** — shared utility:
- Stores the `elevatedUntil` timestamp in `sessionStorage` under `coachable_admin_elevated_until`.
- Exports `isAdminElevated()`, `getAdminElevatedUntil()`, `setAdminElevated(ts)`, `clearAdminElevated()`.

**Admin.jsx / AdminPlaysPage.jsx** both implement:
- `ensureElevated()` — async function; if not elevated opens the elevation modal and waits for the result.
- `handleElevate()` — submits password to `POST /admin/elevate`; on success stores the returned `elevatedUntil` timestamp.
- Elevation modal — dark red themed, separate from the regular confirm modal.
- A pulsing `⚠ Danger Mode · MM:SS` countdown badge in the sticky header (visible while elevated).
- `clearAdminElevated()` called on logout.

---

## UX Flow

1. Admin clicks "Delete User" (or Delete Play / Delete Folder).
2. If **not elevated**: the Danger Mode modal appears asking for the admin password.
   - Wrong password → red error message, stays on modal.
   - Correct password → modal closes, elevation active for 10 minutes.
   - Cancel → action aborted entirely.
3. If **already elevated**: no extra prompt — action proceeds to the normal confirm dialog.
4. The sticky header shows a pulsing red badge `⚠ Danger Mode · 9:45` counting down.
5. After 10 minutes the badge disappears and the next destructive action requires re-authentication.

---

## Elevation TTL

| Layer | Duration |
|---|---|
| Server `requireElevated` TTL | 10 minutes (`ELEVATED_TTL_MS`) |
| Client `sessionStorage` expiry | Same — set from server response `elevatedUntil` |

Both expire independently. Even if the client state says "elevated", the server will reject the request if the server-side TTL has elapsed.

---

## Tests

`admin/test/adminDangerMode.test.js` covers:
- `adminElevation` utility (set/get/clear/isElevated with past and future timestamps)
- Server-side `requireElevated` logic (pure function simulation)
