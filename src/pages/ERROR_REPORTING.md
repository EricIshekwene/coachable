# Error Reporting System

## Overview
Client-side error reporting that captures errors, device context, and user actions,
then stores them in Postgres for admin review via a dedicated dashboard.

## Architecture

### Client Side
- **`src/utils/errorReporter.js`** — Core utility
  - `reportError()` — fire-and-forget POST to `/error-reports`
  - `reportApiError()` — standardized backend/route failure reports for shared API calls
  - `installGlobalErrorHandlers()` — catches `window.onerror` and `unhandledrejection` in production
  - `setErrorReporterUserId()` — syncs with AuthContext for user attribution
  - Auto-collects: device info, screen size, pixel ratio, mobile detection, page URL, user agent

- **Wiring:**
  - `App.jsx` → calls `installGlobalErrorHandlers()` on mount (ThemeInit component)
  - `api.js` → reports backend connection failures and 5xx route failures through `reportApiError()`
  - `AuthContext.jsx` → syncs user ID via `setErrorReporterUserId()`
  - `Slate.jsx` → explicit `reportError()` call in video export catch block with extra context (codec, resolution, quality settings)

### Server Side
- **`server/routes/errorReports.js`** — Express routes
  - `POST /error-reports` — public (no auth), accepts error report payload
  - `GET /error-reports` — admin only, pagination + component filter
  - `DELETE /error-reports/:id` — admin only, delete single report
  - `DELETE /error-reports` — admin only, clear all reports

- **`server/db/schema.sql`** — `error_reports` table with indexes on `created_at` and `component`

### Admin UI
- **`src/pages/AdminErrors.jsx`** — accessible at `/admin/errors`
  - Expandable report cards with summary + full detail view
  - Device badge, component badge, relative timestamps
  - Full stack trace viewer, extra context (JSON), user agent
  - Filter by component, pagination, clear all
  - Link from main Admin page nav

## Data Shape
Each error report contains:
- `error_message` — the error text
- `error_stack` — stack trace if available
- `component` — which module (e.g., "videoExport", "global")
- `action` — what the user was doing (e.g., "exportVideo", "POST /auth/login")
- `page_url` — full URL where error occurred
- `user_agent` — raw UA string
- `device_info` — structured JSON: platform, screen size, pixel ratio, mobile flag
- `extra` — arbitrary JSON context (codec info, quality settings, etc.)
- `user_id` — authenticated user UUID (nullable)
- `session_id` — per-tab UUID for grouping errors from the same session

## Key Decisions
- **Public POST endpoint**: Errors can happen before login, so no auth required on submit.
  Payload is size-capped (2000 chars message, 5000 chars stack) to prevent abuse.
- **Fire-and-forget**: `reportError()` never throws or blocks the UI. If reporting
  fails, it fails silently — we never want error reporting to cause more errors.
- **Route-first backend reporting**: shared API failures now report as `component: "api"`
  with normalized route actions so admin can focus on login/team/playbook breakages.
- **No dev-time global noise**: uncaught syntax/runtime handlers are disabled in local dev
  so hot-reload mistakes do not flood production-facing admin reports.
- **Session ID per tab**: Generated with `crypto.randomUUID()` on module load. Helps
  group related errors from the same user session without requiring auth.
