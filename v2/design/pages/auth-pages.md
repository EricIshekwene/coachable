# Auth Pages — Design Spec

**Status:** Authoritative design spec for all auth-flow pages in v2.
**Output:** Informs pages in `src/auth/pages/`.
**Routes:** `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`
**Guards:** Auth pages are public or `RequireAuth`-only — never behind `RequireVerifiedEmail` or `RequireOnboarded`.

---

## Overview

Auth pages are the first thing every user sees. Their job is to get the user to the app with as little friction as possible. v1 had three documented bugs in this flow — flash/redirect issues, returnTo threading failure, and the email verification code collision — all of which v2 must not repeat.

**No SSO or Google sign-in in v2.** Email + password only.

**Theme:** Dark — matching the app. The body and `html` background are `var(--ui-bg)` (set via the inline `<script>` in `index.html` before first paint). Auth pages are always dark regardless of the user's saved theme preference, since theme preference is only set after the user is logged in.

---

## Shared layout

All auth pages use the same two-column layout:

**Desktop (md+):**
- Left 3/5: white-on-dark form panel
- Right 2/5: brand photo with contextual copy (same treatment as `onboarding-flow.md`)

**Mobile:**
- Full width, single column. Right panel hidden.
- Natural scroll. CTA button stays in flow (not fixed) — the keyboard lifts the viewport, not the button.

**Safe area:** Padding respects `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.

**Shared header (left panel):**
- Coachable wordmark logo (top-left, links to `/home`)
- No nav, no sidebar, no header bar

---

## Login (`/login`)

**Right panel copy:**
- Eyebrow: "Welcome back"
- Headline: "Build. Strategize. Win."
- Body: "Your team is waiting."

**Form:**

```
[Email]           ← Input, type="email", label="Email", autoComplete="email"
[Password]        ← Input, type="password", label="Password", autoComplete="current-password"
                  "Forgot password?" link right-aligned below password field (navigates to /forgot-password)
[Log in]          ← Button, primary, full-width, type="submit"
```

Below the CTA: "Don't have an account? **Sign up**" (link to `/signup`)

**Behavior:**
- Validation fires on submit (not on blur for auth forms — users shouldn't see errors before they've finished typing)
- CTA shows `loading` state while `POST /api/auth/login` is in flight
- On success: navigate to `?returnTo` (validated: must start with `/`) or `/app/plays` if absent
- Email field: `autoFocus` on mount

**No "remember me" checkbox.** v2 uses short-lived access tokens with httpOnly refresh tokens. The session persists until the refresh token expires or the user explicitly logs out. A checkbox would be misleading.

**Error messages:**

| Server response | Displayed message |
|---|---|
| Invalid credentials | "Incorrect email or password." (inline error below password field, not a toast — keeps the user's cursor in the form) |
| Account not found | "Incorrect email or password." (same message — never confirm whether an email exists) |
| Unverified account | "Please verify your email before logging in." (with a "Resend verification email" link) |
| Account locked / rate limited | "Too many attempts. Try again in a few minutes." |
| Generic server error | Error toast: "Something went wrong. Try again." |

After login: if the user's `onboarded_at` is null, navigate to `/onboarding?returnTo=...`. If onboarded, navigate to `returnTo` or `/app/plays`.

---

## Signup (`/signup`)

**Right panel copy:**
- Eyebrow: "Get started free"
- Headline: "Build. Strategize. Win."
- Body: "Create your account and start building plays in minutes."

**Form:**

```
[Name]            ← Input, type="text", label="Name", autoComplete="name", autoFocus
[Email]           ← Input, type="email", label="Email", autoComplete="email"
[Password]        ← Input, type="password", label="Password", autoComplete="new-password"
                  Password strength hint below (not a meter — one-line text: "Use 8+ characters")
[Create account]  ← Button, primary, full-width, type="submit"
```

No confirm-password field. Reduces friction — if they mistype, they can reset it. The cost of a typo here is a password reset, not onboarding failure.

Below the CTA: "Already have an account? **Log in**" (link to `/login`)

Below that: fine print in `caption` typography: "By creating an account you agree to our Terms of Service and Privacy Policy." (links open in new tab)

**Behavior:**
- Validation on submit: name required (min 2 chars), email valid format, password min 8 chars
- On success: `POST /api/auth/signup` creates the user and issues the session. Navigate to `/verify-email?returnTo=<returnTo or /app/plays>` — email verification is required before onboarding.
- `?invite=<code>` and `?sport=<sport>` query params are threaded through to `/verify-email` and then to `/onboarding` so invite-linked signups land in the right place.

**Error messages:**

| Condition | Displayed |
|---|---|
| Name too short | Inline: "Name must be at least 2 characters." |
| Invalid email | Inline: "Enter a valid email address." |
| Password too short | Inline: "Password must be at least 8 characters." |
| Email already in use | Inline below email field: "An account with this email already exists. **Log in instead?**" (link) |
| Blocked domain | Inline: "This email domain is not allowed." |
| Generic server error | Error toast: "Something went wrong. Try again." |

---

## Email verification (`/verify-email`)

**Guard:** `RequireAuth` only. This page is the verification funnel — it cannot be behind `RequireVerifiedEmail`.

**Purpose:** Verify the user's email address after signup before they can proceed to onboarding.

**Right panel copy:**
- Eyebrow: "One more step"
- Headline: "Check your inbox."
- Body: "We've sent a 6-digit code to [masked email]. Enter it below to continue."

**Form:**

```
[6-digit code]    ← Single Input, type="text", inputMode="numeric", pattern="[0-9]*", maxLength=6
                  Auto-submits when 6 digits are entered (no explicit CTA needed)
[Verify]          ← Button, primary, shown as fallback if auto-submit fails
```

Below the CTA: "Didn't get the code? **Resend** (60-second cooldown enforced — the button shows a countdown when cooling down)

**Behavior:**
- Auto-submit fires `POST /api/verification/verify` when the 6th digit is entered
- On success: navigate to `?returnTo` threaded through from signup, or `/onboarding` → `/app/plays`
- Code expires after 15 minutes (server-enforced). After expiry, user must request a resend.

**Error messages:**

| Condition | Displayed |
|---|---|
| Wrong code | Inline error on the OTP Input: "Incorrect code. Try again." |
| Expired code | Inline: "That code has expired. Request a new one." (with Resend link highlighted) |
| Generic server error | Error toast |

**v2 note:** The OTP input uses `purpose: 'verify_account'` on the server (the `email_verification_codes` table now has a `purpose` column). This prevents the v1 bug where requesting an email change while an account verification code is pending silently invalidated the verification code.

---

## Forgot password (`/forgot-password`)

**Right panel copy:**
- Eyebrow: "Password reset"
- Headline: "Let's get you back in."
- Body: "Enter your email and we'll send a reset code."

**Form:**

```
[Email]           ← Input, type="email", label="Email", autoFocus
[Send reset code] ← Button, primary, full-width
```

Below CTA: "Remember your password? **Log in**" (link to `/login`)

**Behavior:**
- On submit: `POST /api/auth/forgot-password`
- Server always returns `ok: true` regardless of whether the email exists (prevents email enumeration)
- On response: page transitions to a confirmation state (same page, no navigation):

**Confirmation state:**

```
✓ Check your email
"We sent a reset code to [email] if it's registered. Enter the code below."

[6-digit code]  ← Input, type="text", inputMode="numeric"
[Continue]      ← Button, primary — navigates to /reset-password?email=[email]&code=[code]
```

On "Continue": navigate to `/reset-password` with the email and code as query params. The reset-password page pre-fills the code and proceeds to step 2.

Resend link with 60-second cooldown (same pattern as verify-email).

---

## Reset password (`/reset-password`)

**Right panel copy:**
- Eyebrow: "Almost there"
- Headline: "Choose a new password."
- Body: "Make it strong — at least 8 characters."

**Form:**

```
[New password]          ← Input, type="password", autoFocus, autoComplete="new-password"
[Confirm new password]  ← Input, type="password", autoComplete="new-password"
[Update password]       ← Button, primary, full-width
```

**Behavior:**
- Code and email are read from query params (`?email=...&code=...`) and submitted as hidden values
- Validate: min 8 chars, both fields match
- Calls `POST /api/auth/reset-password` with `{ email, code, newPassword }`
- On success: navigate to `/login` with a success message state (not a query param — use React Router `state`): "Password updated. Log in with your new password." — rendered as a non-dismissable info banner at the top of the login form.

**Error messages:**

| Condition | Displayed |
|---|---|
| Passwords don't match | Inline on confirm field: "Passwords don't match." |
| Password too short | Inline: "Password must be at least 8 characters." |
| Invalid / expired code | Inline error above fields: "This reset link has expired. **Request a new one**" (link to /forgot-password) |
| Generic server error | Error toast |

---

## `returnTo` behavior

`returnTo` is threaded through the entire auth funnel to land users at their intended destination:

```
/app/plays (unauthenticated)
  → RequireAuth → /login?returnTo=/app/plays
  → Login.tsx reads ?returnTo, navigates on success to:
      /verify-email?returnTo=/app/plays    (if unverified)
      /onboarding?returnTo=/app/plays      (if unverified + goes through verify)
      /app/plays                           (if already onboarded)
```

`returnTo` validation: must start with `/`. Absolute URLs are rejected. If invalid, fall back to `/app/plays`.

`?invite=<code>` from a team invite link is preserved through signup → verify → onboarding so the user arrives in the correct path (join-team with pre-filled code).

---

## Flash prevention

These decisions are structural, not cosmetic. They exist specifically to prevent the v1 flash bugs documented in `routing-and-flash-diagnosis.md`:

1. **Inline `<script>` in `index.html`** sets `data-theme` before any CSS is parsed. No `useEffect` for theme — the first paint already has the correct theme.
2. **`html[data-theme]` on `body`** tracks the theme background. No dark flash on light-mode pages.
3. **Auth pages are always dark.** They do not switch between light and dark based on user preference — this eliminates the transition flash between auth and app if the user has light mode set.
4. **Auth guard spinner is skeleton-colored.** `RequireAuth` loading state uses the app's background color, not a dark spinner on a white background.

---

## Decisions made in this doc

| Decision | Choice |
|---|---|
| SSO / Google sign-in | None in v2 — email + password only |
| Theme | Auth pages are always dark |
| Confirm password field | No — friction reduction; mistyped password → password reset |
| Remember me | No checkbox — refresh tokens handle session persistence |
| Login error messages | Never confirm email existence; same message for wrong password and not found |
| returnTo validation | Must start with `/`; otherwise fall back to `/app/plays` |
| Verification code format | 6-digit numeric OTP (matches v1 server behavior) |
| Purpose column on codes | Required (v2 schema fix) — prevents v1 code collision bug |
| Password reset flow | Email → 6-digit code → new password (no magic link) |

---

## Cross-Reference Notes

**References:**
- `docs/engineering/audits/api-review.md` — `auth.js` and `verification.js` route behavior; v2 considerations for short-lived tokens and `purpose` column
- `docs/engineering/audits/routing-and-flash-diagnosis.md` — flash causes and v2 structural fixes; `returnTo` threading bug that these pages must not repeat
- `docs/design/general-formatting-standards.md` — spacing, type scale, motion budget
- `docs/engineering/planning/routing.md` — guard stacks, `returnTo` flow, `/verify-email` and `/onboarding` guard exceptions

**Referenced by:**
- `src/auth/pages/Login.tsx`
- `src/auth/pages/Signup.tsx`
- `src/auth/pages/VerifyEmail.tsx`
- `src/auth/pages/ForgotPassword.tsx`
- `src/auth/pages/ResetPassword.tsx`
