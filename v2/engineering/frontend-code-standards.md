# Frontend Code Standards

**Status:** Authoritative source for frontend code conventions.  
**Scope:** All React/TypeScript source files. Does not cover styling (see `design/general-formatting-standards.md`) or accessibility behavior (see `design/accessibility-standards.md`).  
**Coachable-specific rules:** Deferred — this doc is general-first.

---

## 01. File Anatomy

Every file follows this top-to-bottom order, with a blank line between each group:

```
1. React import (if needed)
2. Third-party imports
3. Local absolute imports
4. Local relative imports
5. Type-only imports
6. Module-level constants
7. Types / interfaces
8. Component or function body
9. Exports
```

**Import ordering within each group:** alphabetical by module path.

```tsx
// 1. React
import { useState, useEffect } from 'react';

// 2. Third-party
import { useNavigate } from 'react-router-dom';

// 3. Local absolute
import { Button } from '@/ui/Button';

// 4. Local relative
import { TeamCard } from './TeamCard';

// 5. Type-only
import type { Team } from '@/types/team';

// 6. Module-level constants
const MAX_NAME_LENGTH = 64;

// 7. Types
interface Props {
  team: Team;
  onSelect: (id: string) => void;
}
```

No blank lines within an import group. One blank line between groups.

---

## 02. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Component | PascalCase | `TeamCard` |
| Hook | camelCase, `use` prefix | `useTeamList` |
| Event handler | camelCase, `handle` prefix | `handleSubmit` |
| Boolean variable | camelCase, `is/has/can` prefix | `isLoading`, `hasError` |
| Module-level constant | UPPER_SNAKE_CASE | `MAX_NAME_LENGTH` |
| Regular variable / function | camelCase | `fetchTeams`, `teamCount` |
| Type / Interface | PascalCase | `TeamMember`, `ApiResponse` |
| Enum | PascalCase (name) + UPPER_SNAKE_CASE (members) | `Role.ASSISTANT_COACH` |
| File — component | PascalCase | `TeamCard.tsx` |
| File — hook / utility / other | camelCase | `useTeamList.ts`, `formatDate.ts` |

---

## 03. TypeScript

- **No `any`.** Use `unknown` and narrow with a type guard, or type the value properly.
- **Prefer inference** for local variables where the type is obvious from the right-hand side.
- **Explicit return types** on all exported functions and hooks.
- **`interface` for object shapes.** `type` for unions, intersections, and aliases.
- **Never cast with `as T`** unless interfacing with an untyped external boundary (e.g., JSON from an API). If you cast, add a comment explaining why.
- **Enums for closed sets of values** — never union string literals that grow beyond 3 members.

```ts
// Prefer
function getLabel(role: Role): string { ... }

// Avoid
const getLabel = (role) => { ... }
```

---

## 04. Component Anatomy

Inside the component function, order is fixed:

```
1. Hooks (useState, useRef, useContext, custom hooks)
2. Derived / computed values (useMemo, or plain const from hook values)
3. Effects (useEffect)
4. Event handlers (handleXxx functions)
5. Early returns (loading, error, empty states)
6. Return JSX
```

```tsx
export function TeamCard({ team, onSelect }: Props) {
  // 1. Hooks
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  // 2. Derived
  const memberCount = team.members.length;

  // 3. Effects
  useEffect(() => {
    document.title = team.name;
  }, [team.name]);

  // 4. Handlers
  function handleClick() {
    onSelect(team.id);
    navigate(`/teams/${team.id}`);
  }

  // 5. Early returns
  if (!team.id) return null;

  // 6. JSX
  return (
    <div onClick={handleClick}>
      {team.name} · {memberCount} members
    </div>
  );
}
```

---

## 05. Functions

- **Arrow functions** for components, hooks, and inline handlers.
- **Named function declarations** (`function foo() {}`) for utilities and helpers defined outside a component — they hoist and are easier to stack-trace.
- **No function definitions inside loops or conditional blocks.**
- **No functions longer than ~50 lines** without extracting a helper — if the function name can't describe everything it does, it's doing too much.
- Parameters beyond 2: use a named options object.

```ts
// Prefer for utilities
function formatDate(iso: string, locale: string): string { ... }

// Prefer for components
const TeamCard = ({ team }: Props) => { ... };
```

---

## 06. Exports

- **Named exports only** — no default exports. Named exports survive refactors and make imports self-documenting.
- Export types separately from implementations.
- One primary export per file. Barrel files (`index.ts`) allowed only at feature/module boundaries, not nested.

```ts
// Good
export function TeamCard(...) { ... }
export type { Props as TeamCardProps };

// Avoid
export default function TeamCard(...) { ... }
```

---

## 07. Constants and Magic Values

- **No inline magic numbers or strings.** Extract to a named constant.
- Module-level constants go above types, below imports.
- Constants shared across files go in a dedicated `constants/` file.

```ts
// Avoid
if (name.length > 64) ...

// Prefer
const MAX_NAME_LENGTH = 64;
if (name.length > MAX_NAME_LENGTH) ...
```

---

## 08. What Never Goes in a File

- Commented-out code — delete it, git remembers.
- `console.log`, `console.warn`, `console.error` in committed code unless behind an explicit `isDev` guard.
- `// TODO` / `// FIXME` comments — file a ticket instead.
- `@ts-ignore` / `@ts-expect-error` without an explanation comment directly above it.
- `eslint-disable` without an explanation comment directly above it.

---

## 09. Comments

Follow the same rule as the general formatting doc: only write a comment when the **why** is non-obvious. Never describe what the code does — the code does that.

```ts
// Correct: explains a non-obvious invariant
// tabindex -1 here so focus lands on main after route change, not the first focusable element
main.setAttribute('tabindex', '-1');

// Wrong: restates the code
// set tabindex to -1
main.setAttribute('tabindex', '-1');
```

---

## 10. JSX Rules

- **One component per file.**
- **No inline object/array literals as props** — extract to a variable above the return.
- **No ternary deeper than one level** inside JSX — extract to a variable or early return.
- **Fragments** (`<>...</>`) over wrapping `<div>` when the wrapper has no semantic or styling purpose.
- Self-close elements with no children: `<Icon />` not `<Icon></Icon>`.

```tsx
// Avoid — deeply nested ternary in JSX
{isLoading ? <Spinner /> : hasError ? <Error /> : <Content />}

// Prefer — extract
const body = isLoading ? <Spinner /> : hasError ? <Error /> : <Content />;
return <div>{body}</div>;
```

---

## 11. Component Registration

Every new shared component must be added to the component catalogue when it is created — not after, not eventually. The catalogue is the single place where:

- All available components are discoverable
- Visual states (default, hover, active, disabled, error) are demonstrated
- Props and usage notes are shown

**Location:** `src/admin/pages/AdminDesignSystem.jsx` — accessible at `/admin/design-system` in the running dev server.

**What counts as a shared component:** anything in `src/ui/` that is used in more than one feature or page. One-off components scoped to a single page do not need to be catalogued.

**What the catalogue entry must include:**
- Component name and a one-line description of its purpose
- A live render of every meaningful visual state
- The import path (`@/ui/ComponentName`)

Skipping the catalogue is not acceptable. A component that is not in the catalogue does not officially exist — other developers will rebuild it.

---

## 12. File Size

- **Target: under 200 lines per file.** This is a strong default, not a hard cutoff — the goal is that any file can be read and fully understood in one sitting.
- If a file is growing past 200 lines, treat it as a signal that the file is doing too much. Extract hooks, helpers, or sub-components into their own files.
- **A file that is hard to understand is too big regardless of line count.** If you have to scroll to remember what a variable was, split the file.
- Types and interfaces that are shared between files belong in their own `types/` file, not mixed into a component file.

---

### What belongs on the page `.tsx` file itself

A page file should be easy to read at a glance. Keep it to:

- Simple `const` declarations (no computation — just values)
- Component composition — assembling child components
- Prop passing
- Importing and calling hooks

If you are writing logic, transformations, filtering, formatting, or calculations directly on the page file, that code belongs in `utils/` instead. The page file describes **what is shown and how it fits together** — not how data is processed.

```tsx
// Good — page file is thin
const PAGE_TITLE = 'Team Roster';

export function TeamPage({ teamId }: Props) {
  const { members, isLoading } = useTeamMembers(teamId);
  const sorted = useSortedMembers(members);

  if (isLoading) return <Spinner />;

  return (
    <PageShell title={PAGE_TITLE}>
      <MemberList members={sorted} />
    </PageShell>
  );
}

// Avoid — logic on the page file
export function TeamPage({ teamId }: Props) {
  const { members } = useTeamMembers(teamId);
  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name));
  const formatted = sorted.map(m => ({ ...m, label: `${m.name} (${m.role})` }));
  // ...
}
```

---

### Utils co-location hierarchy

There are two layers of utils. Use the one that matches the scope of the code:

| Layer | Location | Use when... |
|---|---|---|
| **Page/section utils** | `utils/` folder co-located next to the page file | The helper is only relevant to this page or section |
| **Shared utils** | `src/utils/` grouped by concern | The helper is used by two or more pages or features |

Co-located utils live alongside the page file, the same way co-located tests do:

```
src/app/pages/
  Team.tsx
  utils/
    sortMembers.ts
    formatMemberLabel.ts
  tests/
    team.members/
      roles.test.js
```

A helper starts co-located. If a second page needs it, move it up to `src/utils/` at that point — not before.

**Common split patterns:**

| When you see... | Extract to... |
|---|---|
| Logic or computation on a page file | Co-located `utils/` folder |
| Helper needed by a second page | `src/utils/` grouped by concern |
| Multiple hooks inside one component file | A dedicated `useXxx.ts` hook file |
| More than one component in a file | One file per component |
| Large type definitions | A `types/` file |

---

## 13. Testing

All UI code must follow the testing standards defined in `ui-testing-standards.md`.

**Location:** `v2/engineering/planning/testing/ui-testing-standards.md`

Key rules from that doc that apply here:

- Every new page or section must have a corresponding test file co-located in a `tests/` folder next to the page file.
- Simple pages: `tests/page-name.test.js`. Complex pages (multiple distinct functions): `tests/page-name.function/roles.test.js` and optionally `flow.test.js`.
- Tests use `renderAs(role, component)` — never construct full user objects inside a test.
- Test at the point of use, not on the component itself. A shared `Button` does not get a test; a page that shows that button to some roles but not others does.
- Use `queryBy*` selectors, never `getBy*`. Assert both what a role can see and what it cannot.

For the full standard — selector patterns, comment block format, shared test infrastructure location — read `ui-testing-standards.md` directly.

---

## 14. Validation, Role Gating, and Error Display

### Client-side validation

All user inputs must be validated on the client before the request is sent to the backend. The backend will also validate everything — but client-side validation is the user's first line of feedback. Sending invalid data to the server and waiting for a rejection is a bad experience.

- Validate on submit, not on every keystroke unless the field has already been submitted once.
- Show inline errors next to the relevant field — not a generic banner.
- Block the submit entirely if required fields are empty or known-invalid — do not send the request.
- Validation rules on the client must match what the server enforces. If they diverge, the client rule wins for UX; the server rule wins for correctness.

```tsx
function handleSubmit() {
  if (!name.trim()) {
    setError('name', 'Name is required');
    return; // never reach the API call
  }
  if (name.length > MAX_NAME_LENGTH) {
    setError('name', `Name must be ${MAX_NAME_LENGTH} characters or fewer`);
    return;
  }
  await createTeam({ name });
}
```

---

### Role gating

Use the user's role to control what is rendered — do not render a component and then disable or block it based on role. If a user cannot perform an action, they should not see the trigger for it.

- **Hide, don't disable.** A coach's "Delete Team" button is not shown to a player at all — not shown greyed out, not shown with a tooltip saying "you don't have permission."
- Gate at the component level using a role check before rendering. A `<RequireRole>` wrapper or an inline role check both work — the key is the check happens before anything renders.
- Role checks on the frontend are a UX convenience. The backend enforces the actual permission. Never rely solely on a frontend gate for security.

```tsx
// Good — player never sees this
{user.role === 'coach' && <DeleteTeamButton />}

// Avoid — player sees a dead button
<DeleteTeamButton disabled={user.role !== 'coach'} />
```

---

### Error display

When a backend error does come back, the frontend does not show it raw. Error messages, status codes, and technical details stay out of the UI. Instead, map the error to a user-actionable message that tells the user what they can do next.

- Maintain an error alias map: a known error code or condition maps to a plain-English message + a suggested action.
- The message should describe what happened in user terms and point toward a next step — not restate the HTTP status.
- If the error is unexpected (no alias match), show a generic fallback and surface a way to retry or get help.

```ts
// Error alias map
const ERROR_ALIASES: Record<string, string> = {
  TEAM_NAME_TAKEN: 'That team name is already in use. Try a different name.',
  INVITE_EXPIRED:  'This invite has expired. Ask your coach to send a new one.',
  PLAN_LIMIT:      'Your plan has reached its team limit. Upgrade to add more teams.',
};

function getErrorMessage(code: string): string {
  return ERROR_ALIASES[code] ?? 'Something went wrong. Please try again or contact support.';
}
```

The error alias map is a shared file, not defined per-component. Every component pulls from the same map so messaging is consistent across the app.

---

## 15. Breakpoint Detection — `useBreakpoint()`

All breakpoint-based logic in JS must go through `useBreakpoint()`. No component or page may call `window.matchMedia` directly.

**Location:** `src/utils/misc/useBreakpoint.ts`

**Return shape:**

```ts
interface Breakpoint {
  isMobile: boolean;
}
```

Future breakpoints (`isTablet`, `breakpoint`) can be added to this object without breaking existing destructures.

**Threshold:** Mobile is **below 768px** — matching the `md` breakpoint in both Tailwind and `design/mobile/mobile-formatting-standards.md`. The `matchMedia` query is `(max-width: 767px)`. Export `MOBILE_BREAKPOINT = 768` from the hook file so the value has one source of truth on the JS side.

**Implementation:** Use `matchMedia.addEventListener('change', ...)`, not `window.addEventListener('resize', ...)`. `matchMedia` fires only when the threshold is crossed — no debounce is needed.

**Initial value:** Initialize synchronously from `window.matchMedia(...).matches`. No SSR guard is needed — this app is client-only.

---

### CSS-only vs JS-gated

Default to CSS. Use the hook only when JS must drive the behavior.

| Behavior | Approach |
|---|---|
| Hide or show a button or panel on mobile | CSS — `hidden md:block` or `@media (min-width: 768px)` |
| Change layout direction or spacing on mobile | CSS |
| Mount a different component tree on mobile (e.g., `mobileLayout` on Slate) | `useBreakpoint()` |
| Enable or disable a touch interaction model | `useBreakpoint()` |

The rule: if you can describe the change as "show/hide" or "rearrange," use CSS. If it requires mounting a different set of components or wiring a different event model, use `useBreakpoint()`.

---

### Usage

```tsx
import { useBreakpoint } from '@/utils/misc/useBreakpoint';

export function PlayEditPage() {
  const { isMobile } = useBreakpoint();

  return <Slate mobileLayout={isMobile} />;
}
```

Never call `window.matchMedia` in a page or component:

```tsx
// Wrong — bypass of the shared hook
const isMobile = window.matchMedia('(max-width: 767px)').matches;
```

---

## Quick Reference

| Rule | Decision |
|---|---|
| Default exports | Never |
| `any` type | Never |
| `var` | Never |
| Magic numbers | Never — named constant |
| Import order | React → 3rd party → local abs → local rel → types |
| Component internals order | Hooks → derived → effects → handlers → early returns → JSX |
| File naming — component | PascalCase.tsx |
| File naming — everything else | camelCase.ts |
| Handlers | `handleXxx` prefix |
| Booleans | `isXxx` / `hasXxx` / `canXxx` prefix |
| `console.log` | Never in committed code |
| Commented-out code | Delete it |
| Comment style | Why only, never what |
| File size | Target under 200 lines — split if hard to read |
| New shared components | Must be added to the component catalogue (location TBD) |
| Client-side validation | Validate before sending — block submit on invalid input |
| Role gating | Hide components the user can't use — never show and disable |
| Error display | Map backend errors to user-actionable aliases — never show raw errors |
| Breakpoint detection | `useBreakpoint()` only — no direct `window.matchMedia` in pages |

---

## Cross-Reference Notes

**References:** `design/general-formatting-standards.md` (styling), `design/accessibility-standards.md`, `engineering/planning/testing/ui-testing-standards.md`

**Open items:**

1. **§14 Role gating — `usePermissions()` not yet built.** The section describes `usePermissions()` as the target pattern. Per `v2/TODO.md` item 7.4, this hook is ❌ Not started. Until it exists, use inline `user.role === 'coach'` checks. Switch to `usePermissions()` once item 7.4 is done.

2. **`data-component` attribute convention.** The abandoned `design-system-unification` branch added `data-component="ComponentName"` on every component root for a dev overlay. If carried forward in v2, document the convention here. Decision not yet made.
