# Admin Design Standards

**Status:** Authoritative. Applies to every page under `src/admin/`.  
**Audience:** Internal only — you and staff. Not user-facing.  
**Scope:** Decisions that differ from, extend, or confirm the shared standards for the admin surface. Read `general-formatting-standards.md` and `color-semantics.md` first — this doc only adds or overrides.

---

## 01 — Color theme: follows system preference

Admin defaults to `prefers-color-scheme`. Dark tokens apply when the OS is in dark mode; light tokens apply when it is light. No hardcoded default.

The existing selector in `color-semantics.md` handles the light override:

```css
[data-admin-theme="light"]
```

Dark mode tokens live in `:root` and apply by default. Light overrides are applied via `[data-admin-theme="light"]` — the same semantic `--ui-*` tokens resolve correctly in both modes.

No custom time-based logic. The OS auto-switches (e.g. at 5pm) and admin follows it automatically via `prefers-color-scheme`.

**Implementation:** A JS bootstrap on admin mount reads `window.matchMedia('(prefers-color-scheme: light)')` and sets `data-admin-theme="light"` on the document root when true. A `change` listener keeps it in sync if the OS switches while the tab is open. No CSS file needed — the `[data-admin-theme="light"]` selector in `src/index.css` handles the rest.

---

## 02 — Polish standard: functional and clean

Admin is internal — you and staff use it, not coaches or players. The standard is **functional and clean**: no broken layouts, readable tables, working forms, correct contrast. It does not need the same micro-interaction and animation polish as the coach-facing product.

That said, polish cannot slip indefinitely. Staff will eventually use admin regularly, and broken or hard-to-navigate pages cost real time. The bar is: a staff member who has never seen a page before can figure out what to do without asking.

This does not relax any hard rules (contrast, focus rings, semantic HTML, 4px grid). It relaxes the expectation that every hover state is pixel-perfect and every transition is tuned.

---

## 03 — Grid, typography, spacing: identical to the app

`general-formatting-standards.md` §01 scope line: *"Everything in this doc applies to every surface."* Admin is not an exception.

- **4px grid** — all padding, gap, and margin are multiples of 4px. No exceptions.
- **Six type levels** — `heading`, `subheading`, `body`, `body-strong`, `label`, `caption`. No ad-hoc sizes.
- **Borders** — 1px only.
- **Focus rings** — `outline: 2px solid var(--ui-accent); outline-offset: 2px` on every interactive element.
- **Motion** — 150–300ms, `transform` + `opacity` only. Disabled at `prefers-reduced-motion: reduce`.

Being internal does not relax these rules. Inconsistent spacing and ad-hoc sizes accumulate the same way in admin as in the app, and admin pages are still read by humans.

---

## 04 — `--ui-*` tokens: all apply to admin

Every `--ui-*` token from `color-semantics.md` applies to admin surfaces without restriction. Admin is covered by the same `:root` token declarations.

Admin pages use the full token set: backgrounds, borders, text, accent, success, error, warning, info. No admin-specific token overrides — ever.

---

## 05 — Components: `src/ui/` for everything, no exceptions

Admin uses components from `src/ui/`. There is no `src/admin/components/` folder. Every component — regardless of whether it was first needed for admin or for the app — lives in `src/ui/` so it is available everywhere.

If a component is needed for admin, build it in `src/ui/`, export it from `src/ui/index.ts`, and register it in the catalogue (§06). The same component can then be used on any app or admin page.

Admin pages using `PageShell` with `ADMIN_NAV_ITEMS` is the established pattern — `component-specs.md` §PageShell shows this explicitly.

---

## 06 — Component catalogue: `AdminDesignSystem.jsx` stays

`src/admin/pages/AdminDesignSystem.jsx` is the mandatory catalogue for every shared component. This carries forward from v1 and is referenced as a hard requirement in `component-specs.md` §08:

> *"Every component is registered in `src/admin/pages/AdminDesignSystem.jsx` when created."*

Route: `/admin/design-system`. A component that is not in the catalogue does not officially exist — it will be rebuilt by the next person who needs it.

---

## 07 — Shell: `PageShell` with `ADMIN_NAV_ITEMS`

Admin pages use `PageShell` from `src/ui/` with a separate nav items array (`ADMIN_NAV_ITEMS`). The shell chrome — sidebar, header, bottom nav — is identical to the app's shell. No admin-specific layout wrapper.

```tsx
export function AdminDashboard() {
  return (
    <PageShell
      navItems={ADMIN_NAV_ITEMS}
      team={{ name: 'Coachable Admin' }}
      title="Dashboard"
    >
      <AnalyticsDashboard />
    </PageShell>
  );
}
```

---

## Quick reference

| Decision | Rule |
|---|---|
| Default theme | `prefers-color-scheme` — dark when OS is dark, light when OS is light |
| Light mode selector | `[data-admin-theme="light"]` set by JS bootstrap on mount |
| Spacing | 4px grid — same as app |
| Typography | Six named levels — same as app |
| Color tokens | All `--ui-*` tokens apply — no admin-specific overrides |
| Separate admin CSS | None — `src/index.css` is the only stylesheet |
| Components | `src/ui/` — no exceptions, no `src/admin/components/` |
| Component catalogue | `AdminDesignSystem.jsx` — mandatory for every component |
| Shell | `PageShell` with `ADMIN_NAV_ITEMS` |

---

## Related docs

| Doc | What it covers |
|---|---|
| `design/general-formatting-standards.md` | Grid, typography, borders, focus, motion — all apply to admin |
| `design/color-semantics.md` | `--ui-*` token values and admin theme selector |
| `design/component-specs.md` | `PageShell` usage, prop conventions, catalogue requirement |
| `design/accessibility-standards.md` | ARIA, keyboard, focus management — no admin exceptions |
| `src/admin/pages/AdminDesignSystem.jsx` | Live component catalogue |
