# Error Reporting: Noise Filters & Network-Failure Resilience

Implemented July 2026 after triaging the admin error log: ~80% of "Backend
Connection Failure" reports were not real backend problems (bots, offline
devices, transient blips that recovered on retry), and one real bug was hiding
among them — a network failure during session restore logged users out.

## What was implemented

### 1. Session-restore retry (`src/context/AuthContext.jsx`)

The on-mount `GET /auth/me` previously treated a network failure exactly like a
401: `user` stayed `null`, route guards redirected to `/login`, and a user with
a perfectly valid token got spuriously logged out whenever the first fetch hit
a dead spot (the signature of the recurring iPhone "Load failed" reports).

Now the bootstrap:
- retries network failures (`err.code === "network_error"`) up to 3 attempts
  with 1s / 2s backoff,
- keeps `loading` true throughout, so `RequireAuth` / `LandingGate` keep
  showing the spinner instead of redirecting,
- treats any definitive HTTP response (401 etc.) as final — no retry,
- only settles as logged out after a real 401 or exhausted retries.

### 2. Retry-aware error reporting (`src/utils/api.js`)

`apiFetch` accepts `skipNetworkErrorReport: true`, which suppresses the
network-failure report for that call. Retry loops (auth bootstrap,
`NotificationsContext.refresh`) pass it on every attempt except the last, so a
blip that recovers on retry never reaches the error log. Server (5xx) reporting
is unaffected.

### 3. Reporter noise filters (`src/utils/errorReporter.js`)

- **In-app browser injection** — `window.webkit.messageHandlers` errors
  (`sendDataToNative` / `processLargestContentfulPaintEvent`) come from scripts
  that iOS in-app browsers inject into the page; added to
  `GLOBAL_IGNORED_MESSAGES`.
- **Bot filter** — reports from crawler user agents (Google-Safety, headless,
  bot/spider/lighthouse, etc.) are dropped; crawlers run the SPA but fail its
  cross-origin API fetches, producing fake connection failures.
- **Offline guard** — network-kind reports are skipped while
  `navigator.onLine === false`; a failure with no connection says nothing about
  the backend. Non-network errors still report.
- **Triage tags** — every report's `extra` now includes `onLine` and
  `visibility` (tab state) at report time. A network error with `onLine: true`
  and `visibility: "visible"` is a genuinely flaky path worth looking at.

### 4. Polling hygiene (`src/context/NotificationsContext.jsx`)

The 60s notifications poll skips ticks while the tab is hidden or the device is
offline (a laptop waking from sleep used to fire the poll before Wi-Fi
reconnected), and refreshes immediately when the tab becomes visible again.

## Key decisions

- Retries stop at 3 attempts (~3s worst-case extra spinner) rather than waiting
  indefinitely for connectivity; a persistently offline device lands on the
  logged-out view, which is acceptable since nothing works offline anyway.
- `skipNetworkErrorReport` only affects network-level failures; 5xx responses
  always report regardless.
- Bot filtering happens client-side in `reportError` (cheapest place); the
  `/error-reports` route was not changed.

## Tests

- `admin/test/authBootstrapRetry.test.js`
- `admin/test/errorReporter.test.js` (bot filter, offline guard, tagging,
  ignored-message list)
- `admin/test/notificationsRetry.test.js` (report suppression, hidden/offline
  poll skipping)
