# Feature Flags

**Status:** Decided — June 2026. Authoritative source for the v2 feature flag system.
**Scope:** Flag loading, client consumption, developer conventions, admin management, and server caching. Does not cover the targeting rule evaluation engine (carried forward from v1 unchanged).

---

## Decision summary

| Concern | Decision |
|---|---|
| Loading | Once per session on `userId` change; `FeatureFlagContext` owns the fetch |
| Context shape | `{ flags, loading, refreshFlags }` |
| Loading behavior | Render null — never redirect or evaluate while `loading` is true |
| Fail-closed | Unknown flag name → `false`; fetch error → all flags `false` |
| Component gate | `useFlag(FLAGS.X)` inline for simple checks; `FlagGate` from `src/ui/` for route-level guards |
| Admin gate | Inline `useFlag()` — `AdminFlagGate`'s separate fetch is dropped |
| Admin refresh | `refreshFlags()` called after admin saves a flag change; other sessions update on next page load |
| Developer marker | `@flagged flag_name` JSDoc tag on the gated component or hook |
| Flag keys | `FLAGS` constants object — no bare string literals |
| Flag lifecycle | Temporary — removed (flag + all callsites) when the feature ships end-to-end |
| Server cache | In-process 60-second TTL cache; invalidated on any flag write |

---

## 01. Context shape

`FeatureFlagContext` exposes three values:

```ts
interface FeatureFlagContextValue {
  flags: Record<string, boolean>;   // resolved map for the current user
  loading: boolean;                  // true until first fetch completes
  refreshFlags: () => Promise<void>; // manual re-fetch (called by admin after saving)
}
```

`loading` starts `true` and becomes `false` after the first fetch resolves (success or error). Components that gate on a flag must check `loading` before evaluating. The context never exposes a half-loaded state.

---

## 02. Loading and re-fetch behavior

Flags are fetched once per session. The fetch fires when `userId` changes — login, logout, or account switch — and not on navigation.

```
userId changes (login / logout / switch)
        ↓
GET /api/flags/me
        ↓
flags map + loading=false
```

**Fail-closed on error:** if the fetch fails, `flags` is set to `{}` and `loading` is set to `false`. All `useFlag` calls return `false`, hiding flagged features rather than breaking them.

**Manual refresh:** `refreshFlags()` re-runs the same fetch and replaces the flags map. The admin panel calls this after saving any flag change so the admin session immediately reflects the new state. End-user sessions pick up flag changes on their next page load.

---

## 03. `FLAGS` constants

All flag names are referenced through a central constants object. No bare string literals anywhere in the codebase.

```ts
// src/context/FeatureFlagContext.tsx (or co-located flags.ts)
export const FLAGS = {
  IN_APP_NOTIFICATIONS: 'in_app_notifications',
  BROADCAST_EMAILS:     'broadcast_emails',
  RECURRING_EMAILS:     'recurring_emails',
} as const;
```

**Why constants:** a typo on a string literal silently evaluates to `false` with no error. A typo on `FLAGS.X` is a reference error caught immediately. When a flag is retired, `grep FLAGS.X` across the codebase gives every removal site.

**Flag lifecycle:** flags are temporary scaffolding. When a feature ships end-to-end and is stable, open a cleanup PR that removes the `FLAGS` entry, all `useFlag` callsites, and all `@flagged` JSDoc tags for that flag. Do not leave retired flags in `FLAGS` as dead entries.

---

## 04. Current flags

Three flags exist. All are on for all authenticated users by default (empty rules array). Targeting rules are configured per-flag in the admin panel.

| Flag | `FLAGS` key | Gates |
|---|---|---|
| `in_app_notifications` | `FLAGS.IN_APP_NOTIFICATIONS` | Notification bell, unread-count polling, `/app/notifications` route |
| `broadcast_emails` | `FLAGS.BROADCAST_EMAILS` | Admin broadcast email composer page |
| `recurring_emails` | `FLAGS.RECURRING_EMAILS` | Admin recurring email campaign page |

No new flags are planned for the v2 launch.

---

## 05. Client consumption

### Simple component gate — `useFlag()`

For a component or section that should be hidden when a flag is off, call `useFlag()` and return `null` while loading or when the flag is disabled.

```tsx
/**
 * Notification bell in the app header.
 * @flagged in_app_notifications
 */
export function NotificationBell() {
  const { loading } = useFeatureFlags();
  const enabled = useFlag(FLAGS.IN_APP_NOTIFICATIONS);

  if (loading || !enabled) return null;
  return <Bell />;
}
```

`useFlag` returns `false` when `loading` is true (flags map is `{}`). Checking `loading` explicitly before `enabled` is required anywhere the difference matters — e.g. a route guard that would otherwise redirect prematurely.

### Route-level gate — `FlagGate`

`FlagGate` is a shared component in `src/ui/` that replaces v1's `RequireFlag` and `AdminFlagGate`. It renders `null` while loading and redirects (or hides) once flags resolve.

```tsx
// Route wiring in App.tsx
<Route
  path="notifications"
  element={
    <FlagGate flag={FLAGS.IN_APP_NOTIFICATIONS} redirect="/app/plays">
      <Notifications />
    </FlagGate>
  }
/>
```

```tsx
// Props
interface FlagGateProps {
  flag: string;           // FLAGS constant
  redirect?: string;      // path to redirect when flag is off (route use)
  children: ReactNode;
}
```

When `loading` is true, `FlagGate` renders `null`. When `loading` is false and the flag is off, it either redirects (if `redirect` is set) or renders nothing. When the flag is on, it renders `children`.

### Admin pages

Admin pages that are gated on a flag use `useFlag()` inline. `AdminFlagGate` (v1's separate `/flags/admin` fetch) is **not carried forward** — the admin user's resolved flags from `FeatureFlagContext` are authoritative. If a flag is globally disabled, `useFlag` returns `false` for the admin too.

```tsx
export function AdminEmailPage() {
  const { loading } = useFeatureFlags();
  const enabled = useFlag(FLAGS.BROADCAST_EMAILS);

  if (loading) return <AdminSpinner />;
  if (!enabled) return <AdminEmptyState title="Feature disabled" />;
  return <EmailComposer />;
}
```

---

## 06. Developer convention — `@flagged`

Any component or hook that conditionally renders or behaves based on a feature flag must have a `@flagged flag_name` JSDoc tag.

```tsx
/**
 * Renders the recurring email campaign manager.
 * @flagged recurring_emails
 */
export function RecurringEmailPage() { ... }
```

**Purpose:** a developer reading a component can immediately see it is behind a flag without tracing hook calls. `grep -r "@flagged"` across the codebase gives the complete flag surface — useful both for auditing and for retirement cleanup.

**Placement:** on the nearest named function or component that contains the `useFlag` guard. If the guard is deep inside a component, lift the check to the component boundary and tag there.

---

## 07. Server — caching

In v1, `GET /flags/me` fires two DB queries on every call (full flag table + user context) with no caching. Flag data changes almost never.

In v2, the server maintains an **in-process cache** for the resolved flags response:

- **TTL:** 60 seconds per user.
- **Invalidation:** any write to a flag (`POST/PUT/DELETE /api/flags/admin/*`) clears the full cache immediately.
- **Implementation:** a simple `Map<userId, { flags, expiresAt }>` in `server/lib/featureFlags.ts` — no Redis required.
- **Cold miss:** on cache miss or expiry, the two DB queries run as before and the result is cached.

This eliminates the DB hit on every page load for all authenticated users without introducing external infrastructure.

---

## 08. Server — flag model (carried forward)

The targeting rule engine from v1 is carried forward unchanged. All rules in `rules[]` must match (AND semantics). Empty `rules` = on for all authenticated users.

| Rule type | Schema | Description |
|---|---|---|
| `sport` | `{ type, values: string[] }` | User must be on a team with one of these sports |
| `team_role` | `{ type, roles: string[] }` | User must hold one of these roles on any team |
| `user_type` | `{ type, values: ['onboarded'\|'registered'] }` | Account onboarding state |
| `rollout_percentage` | `{ type, value: number }` | Stable 0–100% rollout via `SHA-256(userId:flagName) % 100` |
| `geolocation` | `{ type, countries: string[], states: string[] }` | IP-based via geoip-lite (offline MaxMind DB) |

Unauthenticated callers always receive all flags as `false`.

---

## 09. Adding a new flag

1. Add the flag name to `FLAGS` in `src/context/FeatureFlagContext.tsx`
2. Add a seed row to `server/db/schema.sql` (`INSERT … ON CONFLICT DO NOTHING`)
3. Use `useFlag(FLAGS.YOUR_FLAG)` in the component; add `@flagged your_flag` JSDoc
4. Configure targeting rules in `/admin/feature-flags` after deploying

---

## 10. Retiring a flag

When a feature is stable and ships to all users:

1. Delete the `FLAGS` entry
2. Remove all `useFlag(FLAGS.X)` calls — unwrap the conditional render and ship the feature unconditionally
3. Remove all `@flagged flag_name` JSDoc tags
4. Delete the DB row via the admin panel (or migration)

Retired flags must not remain as dead entries in `FLAGS`. A flag that is always `true` in practice is not a flag — it is dead code.

---

## Key files

| File | Purpose |
|---|---|
| `src/context/FeatureFlagContext.tsx` | Context, `useFlag`, `useFeatureFlags`, `FLAGS` constants |
| `src/ui/FlagGate.tsx` | Route-level gate component |
| `server/lib/featureFlags.ts` | Evaluation engine + in-process cache |
| `server/routes/flags.ts` | `GET /api/flags/me` (user) + admin CRUD |
| `server/db/schema.sql` | `feature_flags` table + seed rows |

---

## Cross-reference

- `engineering/planning/state-management.md` — `FeatureFlagContext` is one of the four shared session contexts; React Query caching adds no value here
- `engineering/audits/api-review.md` — flags caching recommendation (Layer 3, problem 6); original `featureFlags.js` evaluation engine
