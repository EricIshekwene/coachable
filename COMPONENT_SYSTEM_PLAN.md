# Coachable Component System Foundation Plan

## Decisions (Locked)

**Q1 — Component naming:** Descriptive and specific to the component's purpose. No rigid prefix — name should immediately tell you what the component is. Examples: `PlayCard`, `PageShell`, `SectionBlock`, `NavBar`. Avoid long compound names.

**Q2 — Shared component location:** `src/design-system/components/` — unified folder for everything, used by both admin and app. All components are treated as shared by default; admin-specific behavior is handled via props, not separate files.

**Q3 — Dev overlay:** Keyboard shortcut toggle `Ctrl+Shift+D` — outlines + name badges appear everywhere across the app. Off by default, toggled on when building.

**Q4 — Test location + scope:** `src/test/` for component/virtual DOM tests, `admin/test/` for API/integration tests. Tests are written **per page** (not per route), covering what a user at a given role sees on that page. Staff roles must be included alongside user/admin.

**Q5 — Phase order (decided):** AppShell first → Component extraction second → Testing setup third → Dev overlay fourth. AppShell establishes the structure that extraction populates; testing then locks in those extracted components. This is the only order where each phase builds on the previous.

---

## Direction Summary

The real problem is styling errors and technical debt — every new feature or agent session reinvents layout from scratch because the right components aren't easy to find or obviously reachable. Admin already solved this: it has 28 named components in a barrel, and pages pull from that barrel cleanly. The main app has no equivalent, so every page session produces new raw div-soup that drifts from the design system.

The goal here is a **styling guardrail**: make it harder to write raw JSX than to just pull a pre-styled component from the barrel. The dev overlay supports this by showing what already exists while building. Tests lock in that existing components don't regress when someone touches them.

Priority order reflects this — the guardrail (AppShell + component extraction) comes first, tests second, overlay third:

1. **AppShell / page layout system** (consistent page skeleton so the correct structure is the path of least resistance)
2. **Component extraction** (pull PlayCard, FolderCard, etc. into the barrel so they're one import away)
3. **Virtual DOM testing** (lock in that components render correctly so extraction doesn't silently break things)
4. **Dev component inspector overlay** (hover/toggle badge showing component name + usage, dev-only — makes the barrel discoverable while building)

GitHub CI (automated PR checks) is deferred — it depends on this test infrastructure being solid first.

---

## Phase 1 — Testing Foundation

**Goal:** Any component in the design system can be rendered in a virtual DOM and role/permission behavior can be asserted.

**Why first (if Q5=A):** New components extracted in Phase 2 should be tested the moment they're created. Setting up the harness first means Phase 2 produces tested components, not "tests to be added later."

### Tasks

- [ ] Install `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
- [ ] Create `vitest.config.js` with `environment: 'jsdom'` and a `setupFiles` pointing to a setup file
- [ ] Create `src/test/setup.js` — imports `@testing-library/jest-dom` matchers
- [ ] Write 3 sample role/permission tests as a template pattern for contributors:
  - `AdminFlagGate` — renders children only for admin users
  - `RequirePerm` — hides content for insufficient permissions
  - One admin component (e.g., `AdminBtn`) — renders disabled/hidden state correctly
- [ ] Document the test pattern in a short `admin/test/README.md` so contributors know what to copy

**Output:** `vitest.config.js`, `src/test/setup.js`, 3 sample test files, `admin/test/README.md`

---

## Phase 2 — Component Extraction

**Goal:** Eliminate the inline div-soup in page files by pulling recurring UI patterns into named, exported components.

**Target files with the most raw JSX:**
- `src/pages/AdminPlaysPage.jsx` — `PlayCard` (local, lines ~653–1090), `FolderItem` (~513–591), `SectionRow` (~1100–1308)
- `src/pages/app/Plays.jsx` — folder grid cards (~626–708), play grid cards (~750–857)
- `src/pages/app/Playbooks.jsx` — similar card patterns

### Tasks

**Admin side (admin/components/):**
- [ ] Extract `AdminPlayCard.jsx` from `AdminPlaysPage.jsx` — single play card with menus, permissions, preview
- [ ] Extract `AdminFolderCard.jsx` — folder item with rename/delete/move actions
- [ ] Extract `AdminSectionRow.jsx` — section row with expand/collapse/manage actions
- [ ] Export all three from `src/admin/components/index.js` barrel
- [ ] Update `AdminPlaysPage.jsx` to import from barrel (no local definitions)
- [ ] Write RTL tests for each: assert that permission-gated actions show/hide correctly

**App side (src/components/):**
- [ ] Extract `PlayPreviewCard.jsx` — play card for the main app Plays/Playbooks pages (if not already reusable)
- [ ] Extract `FolderCard.jsx` — folder card UI for main app
- [ ] Create/update `src/components/index.js` barrel export
- [ ] Update `src/pages/app/Plays.jsx` and `Playbooks.jsx` to import from barrel
- [ ] Write RTL tests for each app component

**Output:** ~6 new component files, updated pages, ~6 new test files

---

## Phase 3 — AppShell / Page Layout System

**Goal:** Every page in the main app has the same consistent structure (widescreen + mobile), exactly like admin uses `AdminShell → AdminHeader → AdminPage → AdminSection`.

**Current problem:** Main app pages (`src/pages/app/*.jsx`) each invent their own top-level structure — different padding, different overflow handling, different mobile breakpoints. No consistency for contributors to follow.

### Proposed component hierarchy (pending Q1 answer)

```
<AppShell>               ← nav, auth guard, background
  <AppHeader />          ← page title, breadcrumb, action button slot
  <AppPage>              ← max-width, padding, overflow-y-auto (fixes the scroll rule)
    <AppSection>         ← titled content block
      <AppCard>          ← surface card
      </AppCard>
    </AppSection>
  </AppPage>
</AppShell>
```

### Tasks

- [ ] Create `src/components/layout/AppShell.jsx` — wraps nav + main content, handles auth guard
- [ ] Create `src/components/layout/AppHeader.jsx` — page title, optional back button, optional right action slot
- [ ] Create `src/components/layout/AppPage.jsx` — max-width container, responsive padding, `overflow-y-auto` on root (enforces existing scroll rule from memory)
- [ ] Create `src/components/layout/AppSection.jsx` — titled section block
- [ ] Create `src/components/layout/AppCard.jsx` — surface card matching design tokens
- [ ] Export all from `src/components/layout/index.js` barrel
- [ ] Migrate 2 existing pages to the new shell as proof-of-concept: `src/pages/app/Plays.jsx` + `src/pages/app/Profile.jsx`
- [ ] Write layout tests: assert AppPage always has `overflow-y-auto`, AppShell renders nav
- [ ] Create `src/components/layout/LAYOUT.md` — documents the shell hierarchy and when to use each component

**Output:** 5 new layout components, updated pages, tests, layout docs

---

## Phase 4 — Dev Component Inspector Overlay

**Goal:** Any developer (human or agent) hovering over a component sees a small badge with the component name and a usage hint. Dev-only, zero impact in production.

**Approach (pending Q3 answer — recommended B or A):**

Every component in the design system adds a `data-component="ComponentName"` attribute to its root element. A thin dev-only layer reads this attribute and renders a floating badge on hover.

### Implementation options

**Option A — CSS-only `data-component` badge (simplest)**
In `dev` mode only, inject a global CSS rule:
```css
[data-component]:hover::before {
  content: attr(data-component);
  /* badge styles */
}
```
Zero JS overhead. Badge appears on hover automatically for any component that opts in.

**Option B — React context + DevOverlay component (more control)**
`DevOverlayProvider` wraps the app in dev mode. Each design-system component calls `useDevOverlay({ name, usage })` on mount, which registers it. Hovering triggers a floating tooltip showing name + example JSX usage.

**Recommendation: Start with Option A** — add `data-component` attrs to all design-system components now, add the CSS in dev mode. Can upgrade to Option B later if more detail is needed.

### Tasks

- [ ] Add `data-component="AdminShell"` (and similar) to every component in `src/admin/components/`
- [ ] Add `data-component` to new layout components from Phase 3
- [ ] Add dev-only CSS (injected via `index.html` or Vite plugin conditioned on `import.meta.env.DEV`)
- [ ] For Option B (if chosen): create `src/components/DevOverlay/DevOverlayProvider.jsx` + `useDevOverlay.js`
- [ ] Write a test: in dev mode, component root has `data-component` attribute; in prod build, it does not

**Output:** Updated components with `data-component` attrs, dev overlay CSS/JS, tests

---

## Phase 5 (Deferred) — GitHub CI

Blocked on Phases 1–2 being complete. Once there is a meaningful test suite and a linting config, CI becomes useful. Before that it would just run an empty test suite.

- [ ] Create `.github/workflows/ci.yml` — runs lint + test + build on every PR
- [ ] Add `.github/PULL_REQUEST_TEMPLATE.md` — checklist: tests added? CRAWLER_MAP updated? JSDoc added?
- [ ] Add `.github/CODEOWNERS` — auto-assign review for server/ routes, schema.sql
- [ ] Add Prettier config `.prettierrc`
- [ ] Add eslint-plugin-jsdoc to enforce JSDoc requirement from CLAUDE.md
- [ ] Enable branch protection: require CI to pass before merge

---

## What NOT to Break

The following must continue to work exactly as-is throughout every phase:

- All 60+ tests in `admin/test/` must still pass (`vitest run`)
- The app builds without errors (`vite build`)
- The canvas / Slate / Konva animation system is untouched
- Admin pages render identically — component extraction is a refactor, not a redesign
- All routes and auth guards continue to work

**Rule:** Every phase ends with `vitest run` passing and `vite build` succeeding before committing.

---

## Branch Strategy

One branch per phase. Each phase is merged to `main` when complete before the next phase begins.

**Why separate branches:** Phases are sequential but each takes multiple sessions. If all work lives on one branch, a problem in phase 3 blocks merging phases 1 and 2 — which are already working and shippable. Separate branches mean completed phases land in main immediately, keeping main clean and usable at all times. Each new phase branch is cut from main after the previous merge.

| Branch | Phase | Merge when... |
|--------|-------|---------------|
| `main` | — | Always shippable |
| `claude/component-system-foundation` | Phase 0 — Plan | Already merged |
| `claude/app-shell-layout` | Phase 1 — AppShell + page layout | All pages using new shell, build passes |
| `claude/component-extraction` | Phase 2 — Extract PlayCard, FolderCard, etc. | All target pages using barrel imports, build passes |
| `claude/rtl-testing-setup` | Phase 3 — Vitest jsdom + RTL + page-based tests | Tests written for all extracted components, `vitest run` passes |
| `claude/dev-component-overlay` | Phase 4 — Ctrl+Shift+D inspector overlay | Overlay works in dev, invisible in prod build |
