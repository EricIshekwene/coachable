# Account Deleted Notification Email

## What this does

When a Coachable user account is removed — either by the **stale-account
auto-cleanup** (runs every 6 hours, deletes any user with
`onboarded_at IS NULL` older than 24 hours) or by an **admin Danger Mode
delete** — we now send the user an email so they aren't silently stranded
on the next login attempt.

Previously the deletion was invisible: the user would try to log in, get
"Invalid email or password", try forgot-password, get a fake "ok" response
(anti-enumeration), and have no way to recover. They'd just churn.

## How it works

### `sendAccountDeletedEmail({ toEmail, userName, reason })`
New helper in [server/lib/email.js](./email.js). Two reasons are supported:

| `reason`  | Subject                                         | Body copy                                                                          |
|-----------|-------------------------------------------------|------------------------------------------------------------------------------------|
| `"stale"` | "Your unfinished Coachable signup was removed"  | "Your Coachable signup was never finished, so our automatic cleanup removed it."  |
| `"admin"` | "Your Coachable account was removed"            | "A Coachable admin has removed your account. Reply to this email if you think it's a mistake." |

Both versions include a CTA button to `${FRONTEND_URL}/signup` so the user
can re-create an account immediately.

### Wired into both delete paths
[`deleteUserCascade(userId, reason)`](../routes/admin.js) in
`server/routes/admin.js` now:

1. **Snapshots** `email`/`name` from the `users` row inside the transaction,
   before deletion.
2. Performs the existing cascade delete.
3. **After commit**, fires `sendAccountDeletedEmail` as a best-effort send.
   Any Resend failure is logged but does **not** roll back the delete —
   we don't want a transient email outage to leave the user record around.

The two callers pass the right reason:

- `cleanupStaleAccounts()` → `deleteUserCascade(userId, "stale")`
- `DELETE /admin/users/:id` route → `deleteUserCascade(userId, "admin")`
  (default)

## Testable seam

`email.js` exports `__setResendClientForTests(client)` so tests can swap in
a fake `{ emails: { send: ... } }` without hitting the real Resend API.
The production Resend client is lazily constructed on first use, so the
module no longer crashes at import time when `RESEND_API_KEY` is missing
(which happens in test environments).

## Tests

[admin/test/accountDeletedEmail.test.js](../../admin/test/accountDeletedEmail.test.js)
covers:

- Subject/copy switches correctly between `stale` and `admin` reasons
- Falls back to "Hey there" when no name is on the user row
- Throws when Resend returns an error (so caller's `try/catch` can log it)
- Sign-up CTA points at `${FRONTEND_URL}/signup`

## Operational notes

- This is a **route change** (admin delete + auto-cleanup behavior), so it
  must be redeployed to Railway per the project's Railway checklist.
- No schema change. No migration required.
- Backward-compatible: if a user row has no email (impossible today but
  defensive), the send is skipped.

## Why we didn't change the cleanup window

The 24-hour cleanup window is aggressive and is the root cause of most
"my account disappeared" reports. We're leaving the policy alone for now
— the notification email gives users a concrete next step ("sign up
again") instead of silent failure. If we still see churn from this,
the next steps would be:

1. Extend the cleanup window (e.g., 7 days).
2. Send a **warning** email at the 23-hour mark before deletion.
3. Only cleanup accounts that never verified their email — keep verified
   but un-onboarded accounts indefinitely.
