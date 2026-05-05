# Admin Analytics Dashboard — Implementation Plan

## Overview

Replace the current `Admin.jsx` dashboard (a single long scrolling page with users table,
quick stats, errors, and issues) with a high-quality analytics-first dashboard that gives
an at-a-glance picture of platform health, growth, and engagement.

The current dashboard already uses the shared `AdminShell` / `AdminHeader` / `AdminCard`
design system. This plan layers analytics on top of that foundation without breaking any
existing functionality.

---

## Concept Comparison

### Concept A — "Pulse" (Metric Cards + Sparklines)

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD          [Refresh]  [7d ▾]                 │
├──────────┬──────────┬──────────┬──────────┬──────────┐      │
│ Users    │ Teams    │ Plays    │ Errors   │ Issues   │      │
│ 312  ↑8  │ 94  ↑3  │1,847 ↑34│  12  ↓2  │  5  ↓1  │      │
│ ▃▄▅▆▇█  │ ▃▃▄▄▅▅  │ ▄▅▅▆▇█  │ ██▅▃▂▁  │ ▃▂▁▁▁▂  │      │
├──────────┴──────────┴──────────┴──────────┴──────────┤      │
│  New Users (30d area chart)  │  Play Creation (bar)   │      │
│                              │                        │      │
├─────────────────────────────┬┴────────────────────────┤      │
│  Sport Distribution (donut) │  Onboarding Funnel      │      │
│                             │  (horizontal bar / %)   │      │
├─────────────────────────────┴────────────────────────┤       │
│  Recent Error Spikes  │  Open Issues  │  Latest Users │      │
└──────────────────────────────────────────────────────┘      │
```

**Pros:** Dense, fits many metrics above the fold. Sparklines give instant trend read.  
**Cons:** Requires compact chart implementation; hard to read on small screens.

---

### Concept B — "Command Center" (Full-Width Charts + Right Rail)

```
┌────────────────────────────────────────┬──────────────┐
│  Growth over time (area, 2 series)     │  Stat cards  │
│  — New users  — New teams              │  (vertical)  │
│                                        │              │
├────────────────────────────────────────┤              │
│  Play creation heatmap (month grid)    │  Top sports  │
│                                        │              │
├──────────────┬─────────────────────────┤              │
│  Onboarding  │  Error frequency        │  Quick links │
│  funnel      │  (line chart)           │              │
└──────────────┴─────────────────────────┴──────────────┘
```

**Pros:** Each chart gets enough width to tell its story clearly.  
**Cons:** Right rail stat cards feel disconnected from the charts next to them; tall page.

---

### Concept C — "Summary + Drill" (Recommended)

```
┌──────────────────────────────────────────────────────────┐
│  COACHABLE ADMIN        [Last 30d ▾]         [Refresh]   │
├────────┬────────┬────────┬────────┬────────┬────────┐    │
│ Users  │ Teams  │ Plays  │ Active │ Errors │ Issues │    │
│  312   │  94    │ 1,847  │  67%   │   12   │   5    │    │
│ +8 ↑   │ +3 ↑   │ +34 ↑  │ stable │ -2 ↓   │ -1 ↓   │    │
└────────┴────────┴────────┴────────┴────────┴────────┘    │
│                                                          │
│  ┌────────────────────────┐  ┌───────────────────────┐  │
│  │ New Users (area chart) │  │ Sport Mix  (donut)     │  │
│  │ 30-day rolling + trend │  │ Rugby 38% Ftbl 22% … │  │
│  └────────────────────────┘  └───────────────────────┘  │
│                                                          │
│  ┌────────────────────────┐  ┌───────────────────────┐  │
│  │ Play Activity (bar)    │  │ Onboarding Funnel (%)  │  │
│  │ created vs updated/day │  │ Signed up → Onboarded  │  │
│  └────────────────────────┘  └───────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Activity Feed    Latest users | Errors | Issues    │  │
│  └────────────────────────────────────────────────────┘  │
```

**Why this wins:**
- KPI strip above the fold for instant snapshot — no scrolling needed for top metrics
- 2×2 chart grid covers growth, distribution, activity, and health without crowding
- Activity feed at bottom matches linear "newest first" mental model
- Period selector (7d / 30d / 90d / All) applies globally — single source of truth
- Responsive: strip stacks to 2 columns on narrow viewports; charts stack to 1 column

---

## Recommended Concept: C — "Summary + Drill"

---

## Data Requirements

### New backend endpoint: `GET /admin/analytics?period=30d`

Returns all analytics data in one request to avoid waterfall:

```json
{
  "period": "30d",
  "summary": {
    "totalUsers": 312,
    "newUsers": 8,
    "totalTeams": 94,
    "newTeams": 3,
    "totalPlays": 1847,
    "newPlays": 34,
    "activeTeamsPct": 67,
    "openErrors": 12,
    "errorDelta": -2,
    "openIssues": 5,
    "issueDelta": -1
  },
  "userGrowth": [
    { "date": "2025-04-05", "count": 2 },
    ...30 rows
  ],
  "playActivity": [
    { "date": "2025-04-05", "created": 4, "updated": 11 },
    ...30 rows
  ],
  "sportMix": [
    { "sport": "rugby", "teams": 36 },
    { "sport": "football", "teams": 21 },
    ...
  ],
  "onboardingFunnel": {
    "registered": 312,
    "emailVerified": 289,
    "onboarded": 241,
    "hasTeam": 230,
    "hasPlays": 194
  },
  "recentUsers": [
    { "id": "...", "name": "Jane Doe", "email": "...", "createdAt": "...", "sport": "rugby" }
  ],
  "recentErrors": [
    { "id": "...", "title": "Login Route Failure", "count": 3, "lastSeen": "..." }
  ],
  "recentIssues": [
    { "id": "...", "title": "Can't export video", "status": "open", "createdAt": "..." }
  ]
}
```

### SQL queries needed

```sql
-- New users per day (userGrowth)
SELECT DATE(created_at) AS date, COUNT(*)::int AS count
FROM users
WHERE created_at >= now() - INTERVAL '$period'
GROUP BY 1 ORDER BY 1;

-- Play activity per day (playActivity)
SELECT DATE(created_at) AS date,
  COUNT(*) FILTER (WHERE created_at = updated_at OR updated_at - created_at < INTERVAL '1 minute')::int AS created,
  COUNT(*) FILTER (WHERE updated_at - created_at >= INTERVAL '1 minute')::int AS updated
FROM plays
WHERE created_at >= now() - INTERVAL '$period'
GROUP BY 1 ORDER BY 1;

-- Sport distribution (sportMix)
SELECT COALESCE(sport, 'unknown') AS sport, COUNT(*)::int AS teams
FROM teams WHERE deleted_at IS NULL
GROUP BY 1 ORDER BY 2 DESC;

-- Onboarding funnel (onboardingFunnel)
SELECT
  COUNT(*)                                     AS registered,
  COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL) AS email_verified,
  COUNT(*) FILTER (WHERE onboarded_at IS NOT NULL)     AS onboarded
FROM users;
-- hasTeam and hasPlays derived from memberships/plays counts
```

---

## Chart Library

Use **Recharts** — already a common React chart library that works well with Tailwind CSS
custom property tokens via inline styles. It renders SVG, which means crisp output at all
pixel ratios, and it tree-shakes well.

```
npm install recharts
```

Charts used:
| Chart | Recharts component |
|---|---|
| User growth area | `AreaChart` + `Area` |
| Play activity bars | `BarChart` + two `Bar` (created + updated) |
| Sport mix donut | `PieChart` + `Pie` with `innerRadius` |
| Onboarding funnel | `BarChart` horizontal + `Cell` for gradient fill |

All charts use `var(--adm-*)` CSS variable values read via `getComputedStyle` once on mount
and passed as `fill`/`stroke` props to Recharts.

---

## Component Architecture

```
src/pages/Admin.jsx            ← existing, add <AnalyticsDashboard> section
src/admin/analytics/
  AnalyticsDashboard.jsx       ← orchestrator: fetch, period selector, 6 sub-sections
  KpiStrip.jsx                 ← row of 6 KpiCard tiles
  KpiCard.jsx                  ← single stat: label, value, delta badge
  UserGrowthChart.jsx          ← AreaChart wrapper
  PlayActivityChart.jsx        ← BarChart wrapper
  SportMixChart.jsx            ← PieChart/donut wrapper
  OnboardingFunnel.jsx         ← horizontal BarChart
  ActivityFeed.jsx             ← tabbed latest users / errors / issues rows
  useDashboardAnalytics.js     ← fetch hook: GET /admin/analytics?period=...
```

`AnalyticsDashboard` is mounted in `Admin.jsx` above the existing Users section, so all
current functionality (user table, inline error list, quick tests) is preserved and
scrolls below.

---

## Implementation Steps

### Step 1 — Backend: analytics endpoint

**File:** `server/routes/admin.js`

Add `GET /analytics` route (protected by `requireAdmin`):

```js
router.get("/analytics", requireAdmin, async (req, res, next) => {
  const period = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "all": null }[req.query.period] ?? "30 days";
  // Run all SQL queries in parallel via Promise.all(...)
  // Return single JSON object
});
```

No migration needed — all tables already exist.

### Step 2 — `useDashboardAnalytics.js`

Custom hook that:
- Accepts `{ session, period }` props
- Fetches `GET /admin/analytics?period=${period}` with `x-admin-session` header
- Returns `{ data, loading, error, refetch }`
- Calls `refetch` when `period` changes

### Step 3 — `KpiCard` + `KpiStrip`

`KpiCard`:
```jsx
function KpiCard({ label, value, delta, deltaLabel, onClick }) {
  return (
    <button onClick={onClick} style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)", ... }}>
      <span style={{ color: "var(--adm-muted)" }}>{label}</span>
      <span style={{ color: "var(--adm-text)" }}>{value}</span>
      <span style={{ color: delta > 0 ? "#4ade80" : delta < 0 ? "var(--adm-danger)" : "var(--adm-muted)" }}>
        {delta > 0 ? "+" : ""}{delta} {deltaLabel}
      </span>
    </button>
  );
}
```

`KpiStrip` renders 6 `KpiCard` tiles in a CSS grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`).
Clicking a card scrolls to the relevant section (Users, Errors, Issues).

### Step 4 — Chart components

Each chart component:
- Accepts pre-fetched `data` prop (no internal fetch)
- Reads `var(--adm-*)` tokens once on mount via `getComputedStyle(document.documentElement)`
- Renders `<ResponsiveContainer width="100%" height={200}>`
- Shows `<AdminSpinner />` while `data === null`
- Shows a minimal "no data" message if data is empty

```jsx
function UserGrowthChart({ data }) {
  if (!data) return <AdminSpinner />;
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--adm-accent").trim();
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={accent} stopOpacity={0.3} />
            <stop offset="95%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="count" stroke={accent} fill="url(#userGrad)" dot={false} />
        <Tooltip contentStyle={{ backgroundColor: "var(--adm-surface2)", border: "none" }} />
        <XAxis dataKey="date" tick={{ fill: "var(--adm-muted)", fontSize: 11 }} />
        <YAxis tick={{ fill: "var(--adm-muted)", fontSize: 11 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

### Step 5 — `ActivityFeed`

Three tabs: **New Users** | **Errors** | **Issues**

Tabs styled same as `AdminPlaysPage` tab bar (CSS var tokens, active = accent underline).
Each tab shows the most recent 5–10 rows with a "View all →" link using `adminPath`.

### Step 6 — `AnalyticsDashboard` orchestration

```jsx
export default function AnalyticsDashboard({ session }) {
  const { basePath } = useAdmin();
  const [period, setPeriod] = useState("30d");
  const { data, loading, error, refetch } = useDashboardAnalytics({ session, period });

  return (
    <div>
      {/* Period selector + refresh */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["7d","30d","90d","all"].map(p => (
          <AdminBtn key={p} variant={period === p ? "primary" : "ghost"} onClick={() => setPeriod(p)}>{p}</AdminBtn>
        ))}
        <AdminBtn variant="ghost" onClick={refetch}>Refresh</AdminBtn>
      </div>

      {loading && <AdminSpinner />}
      {error && <p style={{ color: "var(--adm-danger)" }}>{error}</p>}
      {data && <>
        <KpiStrip summary={data.summary} basePath={basePath} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
          <AdminCard>
            <AdminSection title="New Users" subtitle={`Last ${period}`} />
            <UserGrowthChart data={data.userGrowth} />
          </AdminCard>
          <AdminCard>
            <AdminSection title="Sport Mix" />
            <SportMixChart data={data.sportMix} />
          </AdminCard>
          <AdminCard>
            <AdminSection title="Play Activity" subtitle="Created vs updated" />
            <PlayActivityChart data={data.playActivity} />
          </AdminCard>
          <AdminCard>
            <AdminSection title="Onboarding Funnel" />
            <OnboardingFunnel data={data.onboardingFunnel} />
          </AdminCard>
        </div>
        <AdminCard style={{ marginTop: 24 }}>
          <ActivityFeed
            users={data.recentUsers}
            errors={data.recentErrors}
            issues={data.recentIssues}
            basePath={basePath}
          />
        </AdminCard>
      </>}
    </div>
  );
}
```

### Step 7 — Mount in `Admin.jsx`

In `Admin.jsx`, before the existing Users `<AdminSection>`:

```jsx
{authed && (
  <AdminSection title="Analytics Overview">
    <AnalyticsDashboard session={session} />
  </AdminSection>
)}
```

The existing users table, error list, issues list, and test runner all remain below.

### Step 8 — Tests

`admin/test/analyticsDashboard.test.jsx`:
- `useDashboardAnalytics` fetches with correct `period` query param
- `KpiCard` shows green delta for positive, red for negative
- `ActivityFeed` switches tabs correctly
- `AnalyticsDashboard` shows spinner on load, shows data after resolve

### Step 9 — Documentation

`src/admin/analytics/ANALYTICS_DASHBOARD.md` — describes endpoint, data shape, chart library choice.

---

## Verification Checklist

- [ ] `GET /admin/analytics?period=30d` returns correct JSON with all fields
- [ ] KPI strip shows all 6 metrics immediately above the fold
- [ ] Period toggle rerenders charts without page reload
- [ ] All charts render correctly in dark mode (CSS vars applied)
- [ ] All charts render correctly in light mode (same vars, different values)
- [ ] Activity feed tab switching works
- [ ] Clicking a KPI card scrolls to the relevant section
- [ ] Responsive: 2 chart columns on desktop, 1 on mobile
- [ ] Existing users table / errors / issues / test runner still function below analytics
- [ ] `npm test` passes including new analytics tests

---

## File Inventory

| File | Action |
|---|---|
| `server/routes/admin.js` | Add `GET /analytics` route |
| `src/admin/analytics/useDashboardAnalytics.js` | New fetch hook |
| `src/admin/analytics/AnalyticsDashboard.jsx` | New orchestrator |
| `src/admin/analytics/KpiCard.jsx` | New |
| `src/admin/analytics/KpiStrip.jsx` | New |
| `src/admin/analytics/UserGrowthChart.jsx` | New |
| `src/admin/analytics/PlayActivityChart.jsx` | New |
| `src/admin/analytics/SportMixChart.jsx` | New |
| `src/admin/analytics/OnboardingFunnel.jsx` | New |
| `src/admin/analytics/ActivityFeed.jsx` | New |
| `src/admin/analytics/ANALYTICS_DASHBOARD.md` | New doc |
| `src/pages/Admin.jsx` | Mount `<AnalyticsDashboard>` |
| `admin/test/analyticsDashboard.test.jsx` | New tests |

**Dependencies to add:** `recharts` (MIT license, ~300 KB gzipped)
