# Main-App Layout System (`src/components/layout/`)

A small set of page-layout primitives so every main-app page (`src/pages/app/*.jsx`)
shares the same structure. This is the main-app analog of the admin
`AdminShell → AdminHeader → AdminPage → AdminSection → AdminCard` system.

**Goal:** make it harder to write raw `<div>` soup than to pull a pre-styled
primitive from the barrel. Import from the barrel:

```jsx
import { AppShell, AppHeader, AppPage, AppSection, AppCard } from "../../components/layout";
```

## ⚠️ AppShell is NOT the navigation shell

The main app's **nav, auth guard, background, player-view banner and the
scrollable `<main>` are owned by `src/layouts/AppLayout.jsx`** — the route-level
wrapper mounted at `/app` in `App.jsx`. `AppLayout` is the true analog of admin's
`AdminShell`.

`AppShell` (this folder) is a **page-body** wrapper that renders inside
`AppLayout`'s `<Outlet/>`. It does not render nav and must not — doing so would
duplicate `AppLayout` and break routing.

> The original plan diagram showed `<AppShell>` owning nav + auth guard. That
> turned out to already exist as `AppLayout`, so the layout system was scoped to
> the page body instead. See `COMPONENT_SYSTEM_PLAN.md`.

## Hierarchy

```
AppLayout (src/layouts/AppLayout.jsx)   ← nav, auth guard, background, scrollable <main>  [NOT in this folder]
  <Outlet/>
    AppShell        ← page-body shell: scroll root + AppPage + optional AppHeader
      AppHeader     ← page title, optional back link, optional actions, optional breadcrumb (children)
      AppPage       ← centered max-width column, responsive padding, overflow-y-auto
        AppSection  ← titled content block (uppercase micro-label heading, optional icon/actions)
          AppCard   ← rounded surface card (Brand palette)
```

## Components

### `AppShell`
The one-import path for a standard page. Renders a scrollable root, then an
`AppPage` containing an optional `AppHeader` and your content (wrapped in a
`flex flex-col gap-6`).

```jsx
<AppShell title="Profile" maxWidth="2xl">
  <AppSection title="Account Info">
    <AppCard>…</AppCard>
  </AppSection>
</AppShell>
```

Props: `title`, `subtitle`, `backTo`, `backLabel`, `actions`, `headerExtra`,
`maxWidth` (`"2xl" | "4xl" | "6xl" | "full"`, default `"4xl"`), `className`,
`contentClassName`.

### `AppPage`
Centered, width-constrained, padded column. Use directly when you need full
control over the page body (e.g. a page with custom inter-block spacing). Always
carries `overflow-y-auto` to satisfy the project scroll rule; this is a no-op
inside `AppLayout` (height is unconstrained there) so it never creates a nested
scrollbar.

Props: `maxWidth`, `className`.

### `AppHeader`
In-column page header (title / subtitle / back link / actions). `children`
render below the title — use them for breadcrumbs or custom header content.
Unlike `AdminHeader`, this is an in-flow block, not a sticky full-width bar,
because the main app renders its title inside the content column.

### `AppSection`
Titled content block. The title renders as an uppercase micro-label
(`text-xs uppercase tracking-widest`), matching the existing app convention.
Optional leading `icon` (a react-icons component) and right-aligned `actions`.
Canonical use: wrap an `AppCard`.

### `AppCard`
Rounded surface card matching the existing app styling
(`rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30`, `p-5` by default).
`padding` accepts `true` (`p-5`), a custom class string, or `false`. Passing
`onClick` adds hover/pointer affordances.

## When to use what

- **Standard page** → `AppShell` with `AppSection`/`AppCard` inside.
- **Custom body spacing / non-card layout** → `AppPage` + `AppHeader` directly,
  then your own content (this is how `Plays.jsx` is migrated, since it has search
  bars, grids and drag-and-drop that don't fit the section/card mold).
- **Never** reach for a raw `<div className="mx-auto max-w-... px-... py-...">`
  page root — use `AppPage`/`AppShell`.

## Theming

All components use the `--color-Brand*` palette via Tailwind utility classes
(`BrandText`, `BrandGray2`, `BrandOrange`, `BrandBlack2`, …), so they
automatically respond to the app's light/dark `data-theme` switch. No inline
style tokens.

## `data-component` attributes

Each component sets `data-component="<Name>"` on its root element. This is
forward-looking support for the dev component inspector overlay (a later phase)
and has zero runtime cost.

## Migrated pages (proof of concept)

- `src/pages/app/Profile.jsx` — full migration to `AppShell` + `AppSection` + `AppCard`.
- `src/pages/app/Plays.jsx` — `AppPage` + `AppHeader` on both the main and trash
  views; the heavy internals (folder/play grids, context menus, modals,
  drag-and-drop) are intentionally left untouched.

## Tests

`admin/test/appLayout.test.js` — mirrors each component's className/structural
logic as pure functions (matching the `adminShell.test.js` style), asserting the
scroll rule, max-width mapping, padding resolution, and header/section rendering
decisions. Full RTL/virtual-DOM rendering tests are deferred to the testing phase.
