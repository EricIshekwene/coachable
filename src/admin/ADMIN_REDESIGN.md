# Admin UI Redesign

## What was implemented

A shared design system for all admin pages under `/admin`, built as a set of reusable
React components and CSS custom properties scoped to the `[data-admin-theme]` attribute.

All 8 admin pages were migrated from hardcoded dark hex colors, raw HTML buttons, native
selects, and inline overlay modals to the shared system described below.

---

## Files created

### `src/admin/admin.css`

Defines `--adm-*` CSS custom properties scoped to `[data-admin-theme="dark"]` and
`[data-admin-theme="light"]`. Variables cover background layers, text, borders, accent
color (BrandOrange `#FF7A18`), and danger red.

Imported in `src/main.jsx`.

### `src/admin/AdminContext.jsx`

React context that provides `{ theme, basePath }` to all admin pages.
`AdminProvider` accepts `theme` ("dark" | "light") and `basePath` ("/admin" | "/admin2")
and wraps the admin route subtree in `src/App.jsx`.

### `src/admin/adminNav.js`

```js
export function adminPath(basePath, path) {
  return `${basePath}${path}`;
}
```

Every `navigate("/admin/...")` and `<Link to="/admin/...">` in admin pages was replaced
with `adminPath(basePath, "...")` so the same components work under both `/admin` and
any future `/admin2` mirror.

### `src/admin/components/`

| Component | Purpose |
|---|---|
| `AdminShell` | Root div with `data-admin-theme`, `overflow-y-auto`, `h-screen`, `font-DmSans` |
| `AdminHeader` | Sticky top bar — title, optional back link, optional `actions` slot |
| `AdminNav` | Horizontal pill nav (used in `Admin.jsx` only) |
| `AdminPage` | `max-w-6xl mx-auto px-6 py-8` content wrapper |
| `AdminCard` | Rounded surface with `--adm-surface` background and `--adm-border` border |
| `AdminSection` | Section heading + optional `subtitle` + optional `action` slot |
| `AdminBtn` | Variants: `primary` (orange fill), `secondary` (border), `danger` (red), `ghost` (text-only) |
| `AdminInput` | Styled `<input>` using `--adm-surface2` background and `--adm-text` text |
| `AdminSelect` | Styled `<select>` wrapper |
| `AdminCheckbox` | Styled checkbox using `--adm-accent` for checked state |
| `AdminModal` | Fixed overlay + centered panel — replaces all inline `fixed inset-0 z-50` modal patterns |
| `AdminBadge` | Status badge for issues (`open`, `in_progress`, `resolved`) and errors |
| `AdminEmptyState` | Centered icon + message for empty lists |
| `AdminSpinner` | Loading spinner |

All components use `var(--adm-*)` inline styles (not Tailwind utilities) for colors that
need to respond to the theme attribute. This is required because Tailwind v4 hover
utilities cannot reference CSS variables via the `[data-admin-theme]` selector.

---

## Pages migrated

| Page | Key changes |
|---|---|
| `src/pages/Admin.jsx` | `AdminShell`, `AdminHeader`, `AdminNav`, replaced 2 inline modals, basePath routing |
| `src/pages/AdminPlaysPage.jsx` | `AdminShell`, `AdminModal` for 3 inline modals, tab bar, `adminPath` throughout |
| `src/pages/AdminSportPresetsPage.jsx` | `AdminShell`, `AdminHeader`, `AdminModal`, `adminPath` |
| `src/pages/AdminUserActivity.jsx` | `AdminShell`, `AdminHeader`, `AdminSpinner`, stat card `valueStyle` migration |
| `src/pages/AdminErrors.jsx` | `AdminShell`, `AdminHeader`, `AdminBadge` |
| `src/pages/AdminUserIssues.jsx` | `AdminShell`, `AdminHeader`, `AdminBadge`, `AdminSelect` for status update |
| `src/pages/AdminDemoVideos.jsx` | `AdminShell`, `AdminHeader`, `AdminModal` for 2 inline modals |
| `src/pages/AdminTests.jsx` | `AdminShell`, `AdminHeader`, stat card `valueStyle` migration |

### Pages explicitly out of scope (no visual changes)

`AdminPlayEditPage.jsx`, `AdminPresetEditPage.jsx`, `AdminMobileView.jsx`,
`AdminTestSlate.jsx` — these wrap the Slate/Konva editor and must not be styled.

---

## Key decisions

### CSS variables over Tailwind utilities for theming

Tailwind v4 cannot apply hover/focus utilities that reference `[data-admin-theme]` scoped
variables via the cascade. Every color that must change between dark and light mode is
applied via `style={{ color: "var(--adm-text)" }}` rather than a Tailwind class.
Structural classes (padding, flex, grid, font-size) still use Tailwind.

### `AdminModal` replaces all inline overlay patterns

Every admin page previously had 1–3 `<div className="fixed inset-0 z-50 ...">` inline
modal patterns with different implementations. `AdminModal` standardizes: `open` prop,
`onClose` prop, `title` prop, `children` slot. `ConfirmModal` (used outside admin for
delete confirmations) was left unchanged.

### `adminPath` ensures dual-path readiness

All hardcoded `/admin/...` strings are replaced. When the `/admin2` light-mode mirror is
added (see `ANALYTICS_DASHBOARD_PLAN.md` → Plan 2), no page-level code changes are needed.

### `AdminBtn` hover via `onMouseEnter`/`onMouseLeave`

Same CSS variable limitation applies to hover states. `AdminBtn` manages a `hovered`
React state and applies the correct `backgroundColor` imperatively on enter/leave.

---

## How to add a new admin page

1. Import `AdminShell`, `AdminHeader`, `AdminPage` from `../admin/components`
2. Import `useAdmin` from `../admin/AdminContext` and `adminPath` from `../admin/adminNav`
3. Wrap with `<AdminShell><AdminHeader .../><AdminPage>...</AdminPage></AdminShell>`
4. Use `adminPath(basePath, "/your-route")` for all navigation and links
5. Use `AdminBtn`, `AdminInput`, `AdminSelect`, `AdminModal` for all interactive elements
6. Use `style={{ color: "var(--adm-text)" }}` (etc.) for all theme-sensitive colors

---

## Future: `/admin2` light-mode mirror

All pages are basePath-aware via `useAdmin()`. To add the light mirror:

1. Add `[data-admin-theme="light"]` token block to `admin.css` (token values already planned
   in `ANALYTICS_DASHBOARD_PLAN.md`)
2. Add `/admin2` route subtree in `App.jsx` wrapping with `<AdminProvider theme="light" basePath="/admin2">`
3. No page-level code changes required
