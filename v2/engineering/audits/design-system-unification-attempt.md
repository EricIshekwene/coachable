# Design System Unification — Branch Attempt Summary

**Branch:** `design-system-unification`
**Status:** Abandoned / not merged
**Scale:** 290 commits · 470 files changed · 18,219 insertions · 6,748 deletions

This document summarizes what was attempted in the `design-system-unification` branch and what it produced. It is written as a retrospective on the attempt — not as a plan for what to do next.

---

## What the Branch Was Trying to Do

The branch had two parallel workstreams running at the same time, documented in `.codex/COMPONENT_SYSTEM_PLAN.md` and `FILE_STRUCTURE_PLAN.md`:

**Part A — Component Consolidation:** Build a unified shared design system barrel under `src/design-system/components/` so that both the admin shell and the main app pull from the same set of primitives. Kill all `Admin*`-prefixed aliases. Replace inline raw JSX in pages with named, exported components.

**Part B — Directory Restructuring:** Reorganize `src/pages/`, `src/utils/`, `src/admin/`, and `src/layouts/` into a cleaner folder hierarchy. This ran alongside Part A.

Running both at the same time is the core reason the branch became hard to follow.

---

## What Was Actually Built (Outputs)

### Token Layer

A `--ui-*` CSS custom property layer was added to `src/index.css` (`:root` block). These tokens were designed to replace all raw `Brand*` Tailwind class usage across the app so that light mode and dark mode would both resolve correctly. The tokens defined:

```
--ui-bg, --ui-surface, --ui-surface-2
--ui-border, --ui-border-strong
--ui-text, --ui-text-muted, --ui-text-subtle
--ui-accent, --ui-accent-muted
--ui-success, --ui-danger, --ui-warning, --ui-info
```

Most pages were **not** fully migrated to use these tokens before the branch was abandoned. The migration was in progress but incomplete.

### New Shared Components (`src/design-system/components/`)

The branch created a shared barrel at `src/design-system/components/index.js` and built the following components into it across Q2, Q3, and Q4 sessions:

**Q2 — Primitives and low-level controls:**
- `Button`, `Input`, `Field` (label + input + error wrapper)
- `Card`, `Section` (surface containers)
- `Modal`, `ConfirmDialog`
- `Toast` (replaces scattered toast patterns)
- `Menu`, `Popover` (overlay primitives)
- `Divider`, `Badge`, `Spinner`
- Every component required a `data-component="ComponentName"` attribute on its root DOM node for the dev overlay.

**Q3 — Molecules (patterns that compose primitives):**
- `StatCard` — metric card with label, value, optional trend
- `ListItem` — generic row with leading/trailing slots
- `SettingsRow` — label + description + control row (used in settings pages)
- `DataTable` — sortable table with column definitions
- `SearchInput` — search field with clear button
- `FilterBar` — horizontal row of filter chips
- `BulkBar` — contextual action bar when items are selected
- `NotificationItem` — notification row with read/unread state
- `SidebarNavItem` — nav link with icon, label, active state
- `DangerZone` — red-bordered section for destructive actions
- `SelectableCard` — card with checkbox selection state

**Q4 — Additional components and page migrations:**
- `IconBubble`, `AccordionItem`, `InlineEdit`, `TimestampChip`, `TokenBox`, `AuthCard`
- `VideoCard`, `BrowseTile`
- `TagInput`, `StarRating`, `QuestionCard`, `CodeInput`
- `PlayPickerCard`, `RecentlyEditedChip`
- `Sidebar`, `SidebarNavItem` (migrated into AppLayout's desktop sidebar)

### Extracted Admin Composites (`src/admin/components/`)

Three large inline component definitions that lived inside page files were pulled out into standalone files:

- `AdminPlayCard.jsx` (~490 lines) — extracted from `AdminPlaysPage.jsx`; handles play card display, menus, permissions, preview
- `AdminFolderCard.jsx` (~99 lines) — extracted from `AdminPlaysPage.jsx`; folder row with rename/delete/move actions
- `AdminSectionRow.jsx` (~230 lines) — section row with expand/collapse/manage actions

### Alias Purge

All `Admin*`-prefixed re-export aliases in `src/admin/components/index.js` were removed in Q4 Session 1. These had been compatibility shims left over from when admin components started moving to the shared barrel. The purge removed ~30 alias exports.

### Dev Overlay

A keyboard-toggled component inspector overlay was added (`Ctrl+Shift+D`). When toggled on, it renders outlines and name badges on every DOM element that has a `data-component` attribute. This was intended to make the shared component barrel discoverable while building. The overlay lives in `src/components/DevOverlay/`.

### Directory Restructure (Part B)

Eight restructuring commits (`Restructure B1–B8`) reorganized the codebase:

- **B1:** Merged `src/layouts/` into `src/components/layout/`, merged messaging components, created `src/data/`, cleaned up the component barrel.
- **B2:** Extracted `src/api/` (API call helpers) and `src/hooks/` (shared hooks) from `src/utils/`.
- **B3:** Moved all `Admin*.jsx` page files into `src/pages/admin/`.
- **B4:** Moved auth pages into `src/pages/auth/` and public pages into `src/pages/public/`.
- **B5:** Moved slate-editor-specific components from `src/components/` into `src/features/slate/components/`. A fixup commit (B5 fixup) repaired broken imports that resulted from this move.
- **B6:** Moved `src/pages/designSystem/` into `src/admin/designSystem/`.
- **B7:** Renamed `admin/test/` to `test-harness/test/`.
- **B8:** Moved debug logger files into `canvas/debug/` and `slate/debug/`.
- **B9:** Renamed `src/testing/` to `src/test-runner/`.

`App.jsx` was updated after each restructure commit to reflect the new import paths (~86 lines changed overall).

### Test Infrastructure

A new `vitest.config.js` was added at the project root (separate from the existing one under `admin/`). New test files were written in `test-harness/test/` (the renamed `admin/test/`) for most of the extracted components:

Notable new test files: `componentExtraction.test.js` (373 lines), `designSystemSectionReconciliation.test.js` (419 lines), `designSystemGuards.test.js`, `designSystemBarrel.test.js`, `appLayout.test.js` (140 lines), `listItem.test.js` (168 lines), `settingsRow.test.js` (212 lines), `dataTable.test.js` (212 lines), `sidebarNavItem.test.js` (185 lines), `notificationItem.test.js` (145 lines), `statCard.test.js` (167 lines), and ~20 more component-level test files.

A `lightModeColorGuard.test.js` was also added — a regression guard asserting that `--ui-*` tokens have valid light-mode values. This was written in response to a known regression introduced during Q2 (see below).

### Planning Docs Created

The branch created a `.codex/` folder with session prompt files and plan documents:

- `.codex/COMPONENT_SYSTEM_PLAN.md` — locked design decisions for the component system
- `.codex/DESIGN_SYSTEM_Q2_PLAN.md` — Q2 primitive layer plan
- `.codex/DESIGN_SYSTEM_Q3_PLAN.md` — Q3 molecule extraction plan
- `FILE_STRUCTURE_PLAN.md` — full directory restructure plan (Parts A + B)
- `AGENTS.md` — Codex agent context file (30 lines)
- `.codex/CODEX_SESSION_1_PROMPT.md` through `SESSION_4_PROMPT.md` — session prompts used to drive Codex

---

## Known Problems When the Branch Was Stopped

### Light Mode Regression
Q2 introduced a visual regression in the user-facing app under light mode. Pages that still used raw `Brand*` Tailwind classes (e.g., `bg-BrandBlack2/50`, `border-BrandGray2/20`, `text-BrandGray2`) broke in light mode because the `--color-BrandBlack2` CSS variable remaps to near-white (`#fafbfc`) in light mode. Affected surfaces: search inputs, dropdown buttons, card sections, and the notifications page. The `--ui-*` token layer was designed to fix this, but the page migration was incomplete when the branch was abandoned.

### Two Workstreams Running Simultaneously
Part A (component work) and Part B (directory restructure) ran in the same branch at the same time. Every restructure commit changed import paths across dozens of files, which created noise that made it hard to track what component changes were actually doing. The B5 fixup commit (repairing broken imports from the slate components move) is an example of the kind of breakage that resulted.

### Incomplete Migration
The last commit on the branch is titled `WIP: design system unification — in-progress component token migration`. The `--ui-*` token migration across real app pages was not finished. Many app pages still referenced raw `Brand*` classes.

### Scope Too Large
The branch tried to: purge aliases, build ~30 new components, migrate multiple pages, restructure the directory tree, add a test harness, and add a dev overlay — all in one branch. The result is a branch too large and tangled to selectively merge.

---

## What I Actually Wanted (The Original Intent)

The goal was simple: somewhere under `src/` — whether under `components/` or a dedicated `design-system/` folder — there should be a single set of files where every reusable UI piece in Coachable lives. Not just admin components. Not just app components. Every component that could appear in admin, in the main app, or even in a future version of Coachable entirely, should come from that one place.

The components themselves should be simple: just React with props passed through. No div slop. No scattered inline HTML that gets copy-pasted between pages and drifts apart. If something is reused more than once anywhere in the platform, it belongs in that folder with a clear name and a clear prop interface.

Concrete examples of what that means in practice:
- An `IntakeForm` component that takes in field definitions as props — not four different forms built from scratch across four different pages
- A `NotificationBar` with props for type, message, and dismiss — not a different toast implementation in every feature
- A `Sidebar` that takes nav items as props — not two separate sidebar implementations for admin and app
- A `Header` with props for title and actions — not raw `<div>` headers rebuilt on every page
- A `PlayCard` that takes a play object and a role — not three slightly different play card layouts depending on which page you're on

The idea is that when a new page or feature gets built, the developer (or AI assistant) reaches for that folder first. If the component they need is there, they use it. If it is not there yet, they add it to the folder before using it anywhere. The folder becomes the path of least resistance, not an afterthought.

What happened instead was that through fast iteration — often with AI assistance — every session produced new raw HTML and inline JSX in the page files. Pages accumulated their own local component definitions, their own layout patterns, and their own styling choices. By the time the unification branch was started, there were multiple slightly different versions of the same UI pattern scattered across `AdminPlaysPage.jsx`, `Plays.jsx`, the app pages, and the design system section files. The branch tried to extract and consolidate all of that at once, which is what made it unmanageable.

The result is real technical debt. The platform has components that exist in three or four near-identical forms instead of one shared source. Adding a new feature means choosing which version to copy from, or building a fifth version. Changing a shared pattern means hunting down every place it was duplicated.

The exact folder structure for v2 is not decided yet. Whether it lives at `src/components/`, `src/design-system/`, `src/ui/`, or somewhere else is an open question. But the need itself is not — a single, clean, prop-driven component library that covers the entire platform is a pain point that has to be addressed in v2 before iteration starts again.

> **Note (added post-mortem):** The folder question is now resolved. `engineering/planning/architecture/proposed-file-structure.md` (done ✅) establishes `src/ui/` as the location for all shared components. The location ambiguity described above no longer applies.

---

## What the Branch Is Useful For

Despite not being merged, the branch produced real reference material for v2:

- The `--ui-*` token vocabulary is solid and worth carrying forward as-is.
- The component list (especially Q3 molecules: `StatCard`, `ListItem`, `SettingsRow`, `DataTable`, `NotificationItem`, `SidebarNavItem`, `FilterBar`, `BulkBar`) represents the right set of components to build — they just need to be built cleanly, not mid-restructure.
- The `data-component` convention for the dev overlay is a good pattern to keep.
- `AdminPlayCard.jsx`, `AdminFolderCard.jsx`, and `AdminSectionRow.jsx` are solid extractions and worth reviewing as references.
- The test file patterns in `test-harness/test/` (especially `componentExtraction.test.js` and `designSystemGuards.test.js`) are worth using as templates.
- The decision to separate Part A and Part B into independent branches is the key lesson. In v2, directory restructure and component work should never share a branch.

---

## Cross-Reference Notes

**Referenced by:** `v2/TODO.md` (item 6.2 — build the primitives). **References:** `src/design-system/components/` (old path, superseded).

**Inconsistencies to resolve — newer docs take priority:**

1. **Component location — resolved.** This doc says the folder location was an open question. `engineering/planning/architecture/proposed-file-structure.md` (newer, done ✅) resolves it as `src/ui/`. Not `src/design-system/components/` as this branch used.

2. **`--ui-*` token names — partially outdated.** The branch defined: `--ui-bg`, `--ui-surface`, `--ui-surface-2`, `--ui-border`, `--ui-border-strong`, `--ui-text`, `--ui-text-muted`, `--ui-text-subtle`, `--ui-accent`, `--ui-accent-muted`, `--ui-success`, `--ui-danger`, `--ui-warning`, `--ui-info`. `design/color-semantics.md` (newer, done ✅) uses a superset with these differences:
   - Branch: `--ui-surface-2` → Current: `--ui-surface-raised` (floating) + `--ui-surface-muted` (disabled/inactive)
   - Branch: `--ui-danger` → Current: `--ui-error` (with full `--ui-error-muted`, `--ui-error-text` family)
   - Current adds: `--ui-accent-hover`, `--ui-accent-pressed`, `--ui-accent-border`, `--ui-accent-text`, `--ui-success-muted`, `--ui-success-text`, `--ui-warning-muted`, `--ui-warning-text`, `--ui-info-muted`, `--ui-info-text`
   **Any component code from this branch using `--ui-danger` or `--ui-surface-2` must be updated.**

3. **`data-component` attribute convention.** Branch added `data-component="ComponentName"` on every component's root node for the dev overlay. This convention is not referenced in any other v2 doc. If carried forward into v2, document it in `engineering/frontend-code-standards.md`.

4. **Test files in `test-harness/test/`.** Branch renamed `admin/test/` to `test-harness/test/`. `proposed-file-structure.md` does not include `test-harness/`. Server tests go to `server/tests/`. Frontend tests go co-located with pages in `tests/` subfolders. The `test-harness/` location is abandoned along with the branch.
