# Forgot Password / Password Reset Flow

## Overview
Secure password reset using a 6-digit email code — same pattern as email verification, but for unauthenticated users.

## Flow
1. User clicks "Forgot password?" on `/login` → navigates to `/forgot-password`
2. User enters email → `POST /auth/forgot-password` sends a 6-digit code (10 min expiry)
3. Redirects to `/reset-password?email=...` where user enters code + new password
4. `POST /auth/reset-password` validates code, hashes new password, updates user
5. On success, redirects to `/login`

## Security Decisions
- **No email enumeration**: `/forgot-password` always returns `{ ok: true }` regardless of whether the email exists
- **Rate limiting**: 60-second cooldown between code requests per user
- **Code expiry**: Codes expire after 10 minutes
- **Single-use codes**: Code is marked as used immediately on successful reset
- **Invalidation on re-request**: All previous unused codes are invalidated when a new code is generated
- **Password hashed with bcrypt** (10 salt rounds, same as signup)
- **Frontend enforces 8-char minimum** (backend enforces 6-char minimum as baseline)
- **Email is masked** on the reset page (e.g., `us****@example.com`)

## Files Changed
- `server/db/schema.sql` — `password_reset_codes` table
- `server/lib/email.js` — `sendPasswordResetEmail()` function
- `server/routes/auth.js` — `POST /auth/forgot-password` and `POST /auth/reset-password`
- `src/pages/ForgotPassword.jsx` — email entry page
- `src/pages/ResetPassword.jsx` — code + new password page
- `src/pages/Login.jsx` — wired "Forgot password?" link
- `src/App.jsx` — added `/forgot-password` and `/reset-password` routes
- `admin/test/forgotPassword.test.js` — 9 tests covering API and security properties

## Database Table
```sql
CREATE TABLE password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
