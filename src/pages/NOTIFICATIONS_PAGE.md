# In-App Notifications — End to End

A complete in-app notification system: an owner-only admin command center to
compose / target / preview / test-send / broadcast notifications, and a
user-facing inbox (bell + page) where recipients read them and answer embedded
questions. Responses flow back to the admin detail view as live analytics.

## Data model (`server/db/schema.sql`)

- **`notifications`** — one row per send. `blocks` (JSONB) is the ordered body:
  an array of `{ id, kind: "text", html }` and `{ id, kind: "question", type,
  label, required, options?, scaleMax?, ... }` blocks, so text and questions
  interleave. `audience` (JSONB) + `audience_label` snapshot the targeting;
  `priority` is `normal | high | critical`; `is_test` flags single-recipient
  test sends; `recipient_count` is denormalized for fast list rendering.
- **`notification_recipients`** — fan-out, one row per targeted user, with
  `read_at` and `responded_at`. Unique on `(notification_id, user_id)`.
- **`notification_responses`** — a user's `answers` (`{ [questionId]: value }`)
  to the question blocks. Unique on `(notification_id, user_id)` (upsert).

## Server

### Admin (owner-gated, `requireOwnerOrLegacyAdmin`) — in `server/routes/admin.js`
- `POST /admin/notifications/preview-audience` → `{ count, label, preview[] }`.
- `POST /admin/notifications/send` — with `testRecipient.email` delivers only to
  that **registered** user (404 if the email isn't an account, since in-app
  sends need a real user); otherwise resolves the audience and bulk-inserts a
  recipient row per matching user.
- `GET /admin/notifications` — past sends with read/response counts.
- `GET /admin/notifications/:id` — full detail: read-by-day series, read/unread
  donut, and per-question response aggregation.

Pure, testable helpers live in **`server/lib/notificationAudience.js`**:
`buildNotifAudienceSql` (audience → SQL WHERE + params),
`buildNotifAudienceLabel`, and `aggregateNotifResponses`.

Audience filters: `mode` (all / active / inactive / coaches / players), `sport`,
`playFilter` (any / has_plays / no_plays), and a `signupFrom`–`signupTo` range.
"Active" = created/updated a play in the last 30 days.

### User (`requireAuth`) — in `server/routes/notifications.js`, mounted at `/notifications`
- `GET /notifications` — the caller's notifications (incl. `blocks`, read/respond state).
- `GET /notifications/unread-count` — badge count.
- `POST /notifications/:id/read`, `POST /notifications/read-all`.
- `POST /notifications/:id/respond` — validates the notification was sent to the
  caller and has questions, keeps only answers matching real question ids, then
  upserts the response and marks read + responded.

## Frontend

### Admin — `src/pages/AdminNotificationsPage.jsx`
Block-based composer (text + question blocks, drag-and-drop reorder, collapse),
Form/Preview tabs, live audience count, Test Send modal, broadcast confirm, and a
past-notifications table whose **Details** modal renders real charts + response
analytics with CSV export. Reachable from the admin sidebar (**Notifications**,
owner-only).

### User — app shell (`src/layouts/AppLayout.jsx`)
- `src/context/NotificationsContext.jsx` — shared store; fetches + polls (60s),
  exposes `unreadCount`, `markRead`, `markAllRead`, `respond`. Wraps the app shell
  so the bell badge and page stay in sync.
- `src/components/NotificationBell.jsx` — bell + unread badge + dropdown of recent
  items (desktop sidebar header).
- `src/pages/app/Notifications.jsx` — `/app/notifications` master/detail inbox.
  Renders blocks in order; question blocks become interactive fields with
  required-field validation; after submit (or if already responded) they show
  read-only with a confirmation. Also linked as **Inbox** in the app nav.
- `src/utils/notificationsApi.js` — thin `apiFetch` wrappers.

## Test send → see it in the app
Test Send delivers to a single registered user (e.g. your own account email),
flagged `is_test`. Open the app as that user → the bell badge increments and the
notification appears in the inbox, exactly as a real recipient sees it.

## Tests
`admin/test/adminNotifications.test.js` covers the audience SQL builder, audience
labels, and response aggregation (choice / rating / scale / checkbox / free-text,
plus the empty-response case).

## Deploy note
This feature changed `schema.sql` and added server routes, so it **requires a
Railway redeploy** (auto-migration runs the schema on boot). The frontend ships
via the normal Cloudflare Pages build.
