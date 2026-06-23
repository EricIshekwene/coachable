# Notification Delivery — v2 Plan

**Decided:** June 2026
**Status:** Ready to execute

---

## Decision summary

| Question | Decision |
|---|---|
| Acceptable delay | 2–5 minutes |
| Delivery mechanism | Polling |
| Poll interval | 60 seconds |
| Poll scope | Every authenticated page |
| Poll target | `/api/notifications/unread-count` (count only) |
| Priority effect on delivery | Display order only — no interval tiering |
| Web push | Explicitly out of scope for v2 |

---

## Delivery mechanism — polling

Coachable uses **polling** for in-app notification delivery. SSE and WebSockets are not used in v2.

**Why polling:**
- Peak concurrent users is ~50. SSE holds one open connection per user — the overhead is invisible at this scale but adds server complexity (long-lived connection handling, reconnect logic, Railway config) for no practical benefit.
- The acceptable delay is 2–5 minutes. A 60-second poll interval is well inside that window.
- Polling is stateless, trivially observable, and can be replaced with SSE in a future version if usage demands it without changing any client-facing API contracts.

**What gets polled:**
- Every authenticated page polls `GET /api/notifications/unread-count` every 60 seconds.
- This is the cheap count-only endpoint — a single `SELECT count(*) WHERE read_at IS NULL` query. At 50 concurrent users this is ~50 requests/minute, trivial load.
- The full notification list (`GET /api/notifications`) is fetched **only** when the user opens the notification bell. It is not polled.

**Where polling lives:**
- `NotificationsContext` (`src/context/NotificationsContext.jsx`) owns the poll interval via `setInterval` on mount.
- The unread count is stored in context and consumed by the nav badge.
- On bell open, the context fetches the full list and clears the badge.

---

## Priority — display order only

The `notifications` table has a `priority` column with values `normal`, `high`, `critical`.

Priority affects **display order and visual treatment only** — it does not affect delivery speed or poll interval.

- Notifications are sorted by priority descending, then by `created_at` descending within each tier.
- Visual treatment (badge color, prominence in the bell dropdown) is determined by the highest-priority unread notification.
- Two-tier polling intervals (faster poll for `critical`) are not used. The client has no way to know a critical notification is pending before it polls, so it would need to run the faster interval always — which defeats the purpose.

---

## Email channel — deferred queue with cancellation window

In-app notifications and email notifications are **separate channels** that can fire independently per notification type.

### Cancellation window (v2)

Email notifications are **not sent immediately** on fan-out. They are queued with a 3-minute delay. If the triggering event is reversed within that window (e.g. a coach unassigns a play they just assigned), the queued email is cancelled and the player receives nothing.

This prevents noise from rapid coach edits — the player only gets an email if the assignment is still in effect after the window closes.

**Implementation sketch:**
- On notification fan-out, insert a row into an `email_notification_queue` table with `send_after = now() + interval '3 minutes'` and a reference to the triggering event.
- A background job (Railway cron or BullMQ) processes rows where `send_after <= now()` and `cancelled_at IS NULL`.
- The cancellation path sets `cancelled_at` on the queue row before `send_after` elapses.

### Per-type channel config (future scope — not v2)

Eventually, admin should be able to configure **per notification type** which channels fire:

| Notification type | In-app | Email |
|---|---|---|
| Play assigned | ✓ | ✓ |
| Team announcement | ✓ | configurable |
| Roster change | ✓ | configurable |
| ... | | |

This requires a `notification_types` table (or config object) mapping `type → { inApp: bool, email: bool }`. The email path plugs into the deferred queue above. The in-app path is unchanged.

**This is not built in v2.** The schema and fan-out logic should not preclude it — avoid hardcoding channel decisions in the notification send path. Document it as a planned extension point.

---

## Web push — explicitly out of scope

Browser-level push notifications (service worker + VAPID keys + push subscription table) are **not in v2**.

Email is the out-of-app channel for v2. Web push solves a gap that does not exist at current scale. This is a documented intentional decision, not an oversight.

Revisit when: email open rates are low and users are missing time-sensitive notifications despite email delivery.

---

## Architecture touchpoints

| Layer | What changes |
|---|---|
| `src/context/NotificationsContext.jsx` | Add 60s `setInterval` polling `GET /api/notifications/unread-count`. Clear on bell open. |
| `GET /api/notifications/unread-count` | Already exists. No changes needed. |
| `GET /api/notifications` | Already exists. Called on bell open only, not polled. |
| Notification fan-out (server) | Add `email_notification_queue` insert with 3-min delay. Add cancellation path. |
| Background job | Process `email_notification_queue` where `send_after <= now() AND cancelled_at IS NULL`. |

---

## Out of scope for v2

- SSE or WebSocket delivery
- Web push notifications
- Per-type channel configuration in admin UI (schema should allow it; UI is deferred)
- Delivery receipts or read-confirmation webhooks
