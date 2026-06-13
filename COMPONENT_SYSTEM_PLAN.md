# Coachable Component System Foundation Plan

## Questions for You (Answer These First)

---

**Q1 — Main app component naming prefix**
When we create shared layout components for the main app (mirrors of AdminShell, AdminPage, etc.), what prefix should they use?

- A) `App*` — AppShell, AppPage, AppCard, AppSection
- B) `Coach*` — CoachShell, CoachPage, CoachCard
- C) No prefix — Shell, Page, Card (simpler, but harder to grep)
- D) Other (write in):

---

**Q2 — Where do shared components live?**
Some components (e.g., PlayCard) could be used in both admin and the main app. How should we handle sharing?

- A) Keep separate: admin components → `src/admin/components/`, app components → `src/components/` (two barrels, no overlap)
- B) Create a unified `src/design-system/components/` folder for anything used in both
- C) Only share if truly used in both places — otherwise keep it with whoever owns it

---

**Q3 — Dev component overlay behavior**
The "hover to see component name" inspector for new developers:

- A) Keyboard shortcut toggle (Ctrl+Shift+D) — outlines + name badges appear everywhere across the whole app
- B) Hover only — small badge pops up on mouseover of any design-system component (always on in dev, invisible in prod)
- C) Only visible inside the `/design-system` docs pages (scoped, zero risk of interfering with real UI)

---

**Q4 — Test file location**
Where should new component-level (virtual DOM / role-permission) tests live?

- A) All tests in `admin/test/` — matches existing convention, one place to look
- B) Co-located — `AdminPlayCard.test.jsx` lives next to `AdminPlayCard.jsx`
- C) Split: `src/test/` for component tests, `admin/test/` for API/integration tests

---

**Q5 — Phase priority**
What do we tackle first?

- A) Testing setup first — install RTL, configure Vitest jsdom, write sample tests so every new component is tested from day 1
- B) Component extraction first — pull PlayCard, FolderCard, etc. out of pages into the barrel, then add tests
- C) AppShell / page layout first — nail the consistent page skeleton so contributors know what to copy

---

## Direction Summary

We are building the foundation that will make Coachable contributor-ready. Three sessions of prior planning converge on the same goal: stop writing raw div-soup in page files and replace it with named, testable, reusable components — exactly what admin already does well. The main work is:

1. **Virtual DOM testing** (Vitest + React Testing Library) so role/permission rendering can be verified automatically
2. **Component extraction** (pull PlayCard, FolderCard, etc. out of page files into the barrel)
3. **AppShell layout system** (consistent page skeleton for main app, like AdminShell is for admin)
4. **Dev component inspector overlay** (hover/toggle badge showing component name + usage, dev-only)

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

This branch (`claude/component-system-foundation`) holds the plan and all implementation work.  
Each phase is merged to `main` as a separate PR when complete, so main is never broken.

| Branch | Contents |
|--------|----------|
| `main` | Always shippable |
| `claude/component-system-foundation` | This plan file (Phase 0) |
| `claude/rtl-testing-setup` | Phase 1 implementation |
| `claude/component-extraction` | Phase 2 implementation |
| `claude/app-shell-layout` | Phase 3 implementation |
| `claude/dev-component-overlay` | Phase 4 implementation |
