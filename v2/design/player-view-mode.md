# Player View Mode

**Status:** Authoritative UX spec for v2. No open decisions.
**Scope:** What playerViewMode hides, the toggle entry/exit, the persistent indicator, and persistence behavior. Permission resolution logic lives in `engineering/planning/permissions.md`.

---

## Purpose

`playerViewMode` lets a coach preview the app exactly as a player sees it — same play list, same navigation, same play detail view, no coach-only UI. It is a read-only diagnostic tool, not a persistent work mode.

---

## Entry

A **"Switch to Player View"** button appears in the Settings page under a "Player View" section.

**Visibility conditions — all must be true:**
- User role is `coach` or `owner`
- `playerViewMode` is currently `false`
- Active team is not a personal workspace (`isPersonalTeam === false`)

When activated, `playerViewMode` is set to `true` in `AuthContext` and the app navigates to `/app/plays`.

`assistant_coach` and `player` roles never see this section. There is no shortcut in the nav or plays list — Settings is the only entry point.

---

## Exit

**Manual:** A persistent orange banner is rendered at the top of the app shell (above all content, below the status bar) while `playerViewMode` is active. The banner contains an **"Exit Player View"** button that sets `playerViewMode` to `false`. The banner is always visible — no scroll required to reach it.

**Automatic reset** — `playerViewMode` resets to `false` on any of the following:
- Logout
- Team switch
- Join team
- Create team
- Create personal workspace
- Leave team

---

## Persistent Indicator

While `playerViewMode` is active, two indicators are always visible:

**1. Top banner** — full-width, rendered above the app content area:

- Background: `var(--ui-accent)` at 10% opacity (`BrandOrange/10`)
- Bottom border: `var(--ui-accent)` at 30% opacity (`BrandOrange/30`)
- Left side: eye icon (`--icon-sm`, BrandOrange) + **"Player View"** label (`label` type, BrandOrange) + em-dash + descriptor text `"You're previewing the app as a player sees it"` (`caption` type, BrandGray)
- Right side: "Exit Player View" button (BrandOrange fill, `label` type, white text, `--radius-md`)

**2. Sidebar user card** — the role label beneath the coach's name changes from their actual role (e.g. `"coach"`) to `"player"`. This provides a secondary at-a-glance reminder without requiring the coach to look at the banner.

---

## What Is Hidden

`playerViewMode` produces a **perfect player replica** — the UI must be indistinguishable from what a real player sees. No coach-only state leaks through.

### Permission layer

When `playerViewMode === true`, `usePermissions()` returns player-level permissions: only `canFavoritePlay: true`, all other flags `false`. This automatically suppresses any component that gates on a `can*` flag.

See `engineering/planning/permissions.md §playerViewMode` for the full resolution order.

### Plays list

- Plays with `hiddenFromPlayers: true` are **absent** from the list. No placeholder, no count of hidden plays, no indication that any plays are missing.
- Clicking a play navigates to `/app/plays/:id/view` (view-only), never to the editor.
- Bulk edit mode is not available (`canBulkEdit: false`).
- All coach action buttons (hide, archive, move, share, duplicate, etc.) are hidden.
- The "Recently Edited" section follows the same `hiddenFromPlayers` filter.

### Play detail

- The play opens in view-only mode. The edit button is not rendered.
- All coach-only metadata fields are hidden: notes, hidden-from-players status, tag management, share controls.
- The player sees only the canvas and the play title.

### Navigation

- `canViewAdmin: false` — any nav items gated on `canViewAdmin` (team settings, invite management) are hidden.
- The Settings page hides: the Assistant Permissions section, the Player View entry section, and any coach-only team management options.
- The Team page hides: invite codes, member role management, kick-member controls, ownership transfer.

### Hardcoded role checks

Any component using `user?.role === 'coach'` or `user?.role === 'owner'` directly (bypassing `usePermissions()`) **must** additionally check `!playerViewMode`. The canonical pattern:

```tsx
const isCoach = (user?.role === 'coach' || user?.role === 'owner') && !playerViewMode;
```

This applies in: `Plays.jsx`, `PlayView.jsx`, `Team.jsx`, `Settings.jsx`, and any future component that needs to distinguish coach from player without going through `usePermissions()`.

---

## Persistence

`playerViewMode` is **session-only**.

- Stored in `AuthContext` as `useState(false)`. Initialized to `false` on every mount.
- Not written to localStorage.
- No DB column in v2. (`user_preferences.player_view_mode` from v1 is dropped.)
- Resets on page refresh.

**Why session-only:** Player view is a quick diagnostic action, not a persistent work mode. The banner already prevents a coach from forgetting they are in it within a session. Persisting across refreshes would increase the risk of a coach accidentally operating in a restricted view without realizing it.

---

## API Behavior

`playerViewMode` is **frontend-only**. The server is unaware of it.

- The API returns all plays for the coach's team, including plays with `hiddenFromPlayers: true`.
- Client-side filtering (`playerVisible` predicate) removes hidden plays from the rendered list.
- The coach's real role and permissions are preserved in `AuthContext` — `playerViewMode` is a read-only overlay in `usePermissions()`, not a mutation of the user object.
- Because the server enforces role-based access independently, there is no security concern with frontend-only filtering here. A coach in player view retains their real server-side role.

---

## Cross-Reference Notes

**References:**
- `engineering/planning/permissions.md` — `usePermissions()` resolution order; playerViewMode overlay behavior
- `design/general-formatting-standards.md` — banner typography (`label`, `caption`), color tokens, border rules
- `design/color-semantics.md` — `var(--ui-accent)` token used in banner
- `engineering/audits/api-review.md` — `user_preferences` table (v1 `player_view_mode` column dropped in v2)

**Referenced by:**
- `engineering/planning/permissions.md §playerViewMode`
- `engineering/planning/state-management.md` — `AuthContext` shape
- `design/pages/plays-page.md` — plays list behavior in player view (task 11.1)
- `design/pages/player-experience.md` — player permission set (task 11.4)
- `design/pages/settings-pages.md` — Settings page section visibility (task 11.5)
- `design/pages/team-management.md` — Team page in player view (task 11.6)
