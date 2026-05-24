# Feature Flags

## Overview

Feature flags control which users see a given feature. They are evaluated server-side per authenticated user and delivered to the client as a simple `{ flagName: boolean }` map.

## Architecture

```
DB: feature_flags table
        ↓
server/lib/featureFlags.js   ← evaluation engine (sport, role, geo, %, type)
        ↓
server/routes/flags.js       ← GET /flags/me  (user)
                             ← CRUD /flags/admin/* (owner only)
        ↓
src/context/FeatureFlagContext.jsx  ← fetches on login, re-fetches on userId change
        ↓
useFlag("flag_name")         ← boolean hook for any component
```

## Database Schema

```sql
CREATE TABLE feature_flags (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,       -- snake_case identifier
  description TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT true,  -- global kill-switch
  rules       JSONB NOT NULL DEFAULT '[]',    -- targeting rules (AND)
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ
);
```

## Targeting Rule Types

All rules in `rules[]` must match (AND semantics). Empty `rules` = on for everyone.

| Type | Schema | Description |
|---|---|---|
| `sport` | `{ type, values: string[] }` | User must be on a team with one of these sports |
| `team_role` | `{ type, roles: string[] }` | User must hold one of these roles on any team |
| `user_type` | `{ type, values: ["onboarded"\|"registered"] }` | Account onboarding state |
| `rollout_percentage` | `{ type, value: number }` | Stable 0–100% rollout via `hash(userId:flagName) % 100` |
| `geolocation` | `{ type, countries: string[], states: string }` | IP-based (geoip-lite, offline) |

### Rollout Stability

The `rollout_percentage` rule uses `SHA-256(userId:flagName)` truncated to an integer mod 100. This means:
- The same user is always in the same bucket for a given flag
- Different flags produce independent bucketing
- No database state required — fully deterministic

### Geolocation

Uses [geoip-lite](https://www.npmjs.com/package/geoip-lite) — a bundled MaxMind database, no API key or network calls. Resolves to ISO country code + region/state code. `X-Forwarded-For` is read first (Railway/Cloudflare proxy), then `req.socket.remoteAddress`.

## Seeded Flags

Three flags are seeded on first migration:

| Flag | Description | Default |
|---|---|---|
| `in_app_notifications` | Notification bell, polling, and /app/notifications page | on (all users) |
| `broadcast_emails` | Admin broadcast email composer page | on (all users) |
| `recurring_emails` | Admin recurring email campaign page | on (all users) |

## Client Usage

```jsx
import { useFlag } from "../context/FeatureFlagContext";

function MyComponent() {
  const notifEnabled = useFlag("in_app_notifications");
  if (!notifEnabled) return null;
  return <NotificationBell />;
}
```

The `RequireFlag` route guard in App.jsx redirects to `/app/plays` if a flag is off:

```jsx
<Route path="notifications" element={
  <RequireFlag flag="in_app_notifications">
    <Notifications />
  </RequireFlag>
} />
```

## Admin Pages

`AdminFlagGate` wraps admin pages that should be hidden when a flag is globally disabled:

```jsx
<AdminFlagGate flagName="broadcast_emails">
  <AdminShell>…</AdminShell>
</AdminFlagGate>
```

The gate uses the `/flags/admin` endpoint (admin auth) and checks only the `enabled` boolean — targeting rules are for end-user segmentation, not admin access control.

## Adding a New Flag

1. Add an `INSERT … ON CONFLICT DO NOTHING` row to `schema.sql`
2. Run migration (or redeploy)
3. Use `useFlag("your_flag_name")` in the component
4. Visit `/admin/feature-flags` to configure targeting rules

## Key Files

| File | Purpose |
|---|---|
| `server/db/schema.sql` | Table definition + seed rows |
| `server/lib/featureFlags.js` | Evaluation engine |
| `server/routes/flags.js` | REST endpoints |
| `server/index.js` | Route mount (`/flags`) |
| `src/context/FeatureFlagContext.jsx` | Client context + `useFlag` hook |
| `src/App.jsx` | `FeatureFlagBridge`, `RequireFlag`, route wiring |
| `src/layouts/AppLayout.jsx` | `in_app_notifications` gate |
| `src/admin/AdminFlagGate.jsx` | Admin page gate component |
| `src/pages/AdminFeatureFlagsPage.jsx` | CRUD UI |
