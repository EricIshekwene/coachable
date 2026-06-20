# Mobile UI Standards — Coachable

**Status:** Reference doc for v2. Describes the current architecture, root causes of recurring mobile breakage, and the rules every page and component must follow going forward.

---

## Why Claude Gets Mobile Wrong — The Root Causes

This is not a Claude problem. It is a missing contract problem. When there are no enforced rules for how a page is supposed to look on mobile, every new page session reinvents the layout from scratch and gets different things wrong. The specific failure modes that appear repeatedly are:

### 1. Wrong background colors in light mode

The Brand tokens are named by color, not by semantic role:

```
Dark mode                      Light mode override
--color-BrandBlack: #121212    → #ffffff  (pure white)
--color-BrandBlack2: #2a2e34   → #fafbfc  (near white)
--color-BrandGray:  #9AA0A6    → #6b7280
--color-BrandGray2: #4b5157    → #9ca3af
--color-BrandText:  #f5f7fa    → #1a1a1a
```

When a page or component uses `bg-BrandBlack2` as a card or surface background (which looks like a dark gray `#2a2e34` in dark mode), in light mode it becomes `#fafbfc` — near white on a white background. The card disappears. The same happens with `border-BrandGray2/20` — in light mode `BrandGray2` is `#9ca3af` at 20% opacity, which is invisible on white.

The name `BrandBlack` implies it is always dark. It is not. A new page session reads `BrandBlack` and uses it as a dark surface — which is correct in dark mode and wrong in light mode.

**The fix:** Token names must describe semantic role, not color value. `BrandBlack` should be called `bg-surface` or `bg-page`. Until that rename happens in v2, every AI-assisted page build must be told explicitly: `BrandBlack` = page background, `BrandBlack2` = elevated surface, and both change to white variants in light mode.

### 2. Scroll containers fighting each other

`AppLayout` sets the scroll container on `<main>`:
```jsx
<main className="min-h-0 flex-1 touch-scroll overflow-x-hidden overflow-y-auto ...">
  <Outlet />
</main>
```

When a page inside the outlet adds its own `overflow-y-auto` or `h-screen` or `min-h-screen`, it creates a nested scroll container. On desktop this often looks fine because the outer scroll container is tall enough. On mobile it produces double scrollbars, content that can't scroll past a fixed height, or content that clips entirely.

**The fix:** Pages inside the outlet must never set their own scroll container. The parent `<main>` is the scrollport. Pages should be flat, height-driven by their content, not by viewport height.

### 3. Bottom nav collision

The mobile bottom nav is `fixed bottom-0` at `4rem` height. `AppLayout` adds `pb-[calc(4rem+env(safe-area-inset-bottom))]` to `<main>` to compensate. This works for pages that sit inside `<main>` as the outlet.

It breaks when:
- A page adds its own bottom-fixed element (modal footer, action bar) without accounting for the nav height
- A page uses `h-screen` or `100vh` which does not account for the nav
- A page uses `sticky bottom-0` elements that land behind the nav

**The fix:** Every bottom-anchored element inside a page must use `bottom-[calc(4rem+env(safe-area-inset-bottom))]` not `bottom-0`. Use `100dvh` not `100vh`. Never use `h-screen` inside a page component.

### 4. Touch targets too small

Buttons and interactive elements that work on desktop (small icon buttons, dense list rows, tight form controls) become untappable on mobile. The minimum touch target is 44×44px per Apple HIG and 48×48dp per Material. A `p-1` icon button is roughly 24×24px — half the minimum.

### 5. Horizontal overflow on mobile

Components built for desktop often have min-widths, fixed widths, or spacing assumptions that cause horizontal overflow on narrow screens. This shows up as a scrollbar on `<body>` or content clipping at the right edge. `AppLayout` sets `overflow-x-hidden` on `<main>`, which hides the scrollbar but leaves the content clipped.

---

## Current Mobile Architecture

### Shell (`AppLayout.jsx`)

```
┌──────────────────────────────────────────────┐
│  Player View Banner (conditional, full width) │
├──────────────────────────────────────────────┤
│                                              │
│  <main>                                      │
│  overflow-y-auto  overflow-x-hidden          │
│  touch-scroll (pan-y, -webkit-overflow...)   │
│  pb-[calc(4rem + safe-area-inset-bottom)]    │  ← clears fixed bottom nav
│                                              │
│    <Outlet />                                │  ← your page goes here
│                                              │
└──────────────────────────────────────────────┘
│  Bottom Nav (fixed, z-50, md:hidden)         │  ← 4rem tall
│  bg-BrandBlack  safe-area-inset-bottom       │
└──────────────────────────────────────────────┘
```

Desktop: sidebar replaces bottom nav, `<main>` has no bottom padding.

### Breakpoint

The single breakpoint used throughout: `md` = 768px.
- Below 768px: mobile layout (bottom nav, no sidebar, stacked UI)
- 768px+: desktop layout (sidebar, no bottom nav, wider UI)

`MOBILE_BREAKPOINT = 768` appears as a JS constant in `Plays.jsx` and `MobileViewOnlyGate.jsx` for imperative checks. Tailwind `md:` is the CSS equivalent.

### Safe Areas

iOS notch and home indicator are handled with:
- `env(safe-area-inset-top)` — used by the Slate mobile editor's top bar
- `env(safe-area-inset-bottom)` — used by the bottom nav and `<main>` bottom padding
- `height: 100dvh` — used on the root shell to account for browser chrome on mobile Safari

---

## The Standards — Rules Every Page Must Follow

These are the non-negotiable rules. When building a new page, these apply before anything else.

### Rule 1: Never set your own scroll container

```jsx
// WRONG — creates a nested scroll conflict
<div className="h-screen overflow-y-auto">
  ...
</div>

// WRONG — clips to viewport, fights with parent scroll
<div className="h-[100vh] overflow-hidden">
  ...
</div>

// RIGHT — let height be driven by content; parent <main> is the scrollport
<div className="flex flex-col gap-4 p-4 md:p-6">
  ...
</div>
```

Exception: modals and drawers that need their own scroll area inside a fixed overlay. These must be positioned with `position: fixed` and must not affect the document scroll.

### Rule 2: Never use `h-screen`, `min-h-screen`, or `100vh` inside a page

Use `100dvh` only on the root shell. Inside pages, height should be `auto` or `min-h-0`. If you need a full-height page section, use `flex-1` inside a flex column.

### Rule 3: Background colors — always use semantic intent

Until v2 renames the tokens, follow this mapping explicitly:

| Intent | Token to use | Dark mode result | Light mode result |
|---|---|---|---|
| Page background | `bg-BrandBlack` | `#121212` | `#ffffff` |
| Elevated surface (card, panel) | `bg-BrandBlack2` | `#2a2e34` | `#fafbfc` |
| Primary text | `text-BrandText` | `#f5f7fa` | `#1a1a1a` |
| Muted text | `text-BrandGray` | `#9AA0A6` | `#6b7280` |
| Subtle text / placeholder | `text-BrandGray2` | `#4b5157` | `#9ca3af` |
| Hairline border | `border-BrandGray2/20` | dark gray at 20% | light gray at 20% — INVISIBLE on white |

**The border problem:** `border-BrandGray2/20` disappears in light mode. Use `border-BrandGray2/30` minimum on light-mode-capable surfaces, or use `border-BrandBlack2` (which inverts correctly).

**Never use raw hex in component styles.** Never use `bg-[#2a2e34]`. Always use a token so light mode overrides apply.

### Rule 4: Every bottom-anchored element needs safe-area offset

```jsx
// WRONG — lands behind the bottom nav
<div className="fixed bottom-0 left-0 right-0 bg-BrandBlack2">

// RIGHT — clears the nav + safe area
<div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-BrandBlack2">
```

Inside the Slate editor (full-screen, no nav), use `bottom-[env(safe-area-inset-bottom)]` instead.

### Rule 5: Touch targets minimum 44px

```jsx
// WRONG — icon button at ~24x24px
<button className="p-1">
  <FiTrash2 />
</button>

// RIGHT — minimum 44x44px tap target
<button className="p-3">   {/* 12px × 2 + icon ~20px = ~44px */}
  <FiTrash2 />
</button>

// Or use explicit min sizing
<button className="min-h-[44px] min-w-[44px] flex items-center justify-center">
  <FiTrash2 />
</button>
```

### Rule 6: Mobile layout is stacked, not side-by-side

Any two-column or multi-column layout on desktop must stack vertically on mobile.

```jsx
// RIGHT pattern
<div className="flex flex-col gap-4 md:flex-row md:gap-6">
  <div className="flex-1">...</div>
  <div className="w-full md:w-64 flex-shrink-0">...</div>
</div>
```

### Rule 7: Text truncation, not overflow

Text that can be long (team names, play names, user names) must truncate, not wrap or overflow.

```jsx
<p className="truncate text-sm font-semibold">{play.name}</p>
```

### Rule 8: Modals must be full-screen on mobile

A modal that is `max-w-md` centered on desktop should be full-screen on mobile with rounded top corners (bottom sheet pattern) or full full-screen. Never let a modal overflow a small viewport.

```jsx
// Pattern
<div className="fixed inset-0 z-modal flex items-end md:items-center justify-center">
  <div className="w-full rounded-t-2xl md:rounded-xl md:max-w-md bg-BrandBlack2 ...">
    ...
  </div>
</div>
```

### Rule 9: Forms must account for the on-screen keyboard

On mobile, the on-screen keyboard pushes the viewport up. Inputs near the bottom of the screen get hidden. Use `focus:scroll-into-view` behavior and avoid placing inputs very low on the page without a way to scroll them into view. The shell already has `installMobileViewportFixes` for the Slate editor — equivalent behavior is needed in form-heavy pages.

### Rule 10: No horizontal scroll

Every page must fit within the viewport width. Test at 375px (iPhone SE) as the minimum. Common culprits:
- Tables with many columns → use horizontal scroll inside a constrained container, not on body
- Grid layouts with `grid-cols-3` that don't collapse → add `grid-cols-2` or `grid-cols-1` breakpoints
- Flex rows that don't wrap → add `flex-wrap` or hide items on mobile

---

## Proposed Solutions

### Option A — Page Wrapper Component (Recommended for v2)

Create a `<AppPage>` component that encodes all the mobile rules. Every page uses it as its outermost element. It is impossible to build a page without it and accidentally get the rules wrong.

```jsx
// src/components/layout/AppPage.jsx
export default function AppPage({ children, className = "", noPad = false }) {
  return (
    <div
      className={`
        flex flex-col
        ${noPad ? "" : "px-4 py-4 md:px-6 md:py-6"}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
```

Usage:
```jsx
export default function Team() {
  return (
    <AppPage>
      <h1 className="text-xl font-semibold text-BrandText">Team</h1>
      ...
    </AppPage>
  );
}
```

This is not new — `AppPage` already exists at `src/components/layout/AppPage.jsx` from the unification branch. The problem is it was never mandated. In v2, using `<AppPage>` must be required for all app pages.

**Pros:** Zero-config correct behavior. Hard to get wrong.
**Cons:** Requires all existing pages to be updated to use it.

### Option B — Prompt Contract (Required regardless of which solution is chosen)

Every AI-assisted page build must start with this explicit context block:

```
Mobile rules for Coachable:
- Do not add overflow-y-auto or h-screen to page components. AppLayout's <main> is the scrollport.
- Use bg-BrandBlack for page background, bg-BrandBlack2 for card/panel surfaces.
- These tokens invert in light mode — never use raw hex.
- Add pb-[calc(4rem+env(safe-area-inset-bottom))] to any fixed bottom element, not just bottom-0.
- All interactive elements must be at least 44px tall on mobile.
- Two-column layouts must stack on mobile: flex-col md:flex-row.
- Modals must be full-screen on mobile (items-end + rounded-t-xl) not centered small boxes.
- Use 100dvh not 100vh. Use min-h-0 not min-h-screen inside pages.
- The breakpoint is md (768px). Nothing below md is desktop.
```

This does not fix the structural problem but it gives any Claude session the contract upfront.

### Option C — Design Token Rename (v2 only)

Rename the Brand tokens to semantic names. This is the root fix.

```
Before              After
BrandBlack    →     surface-page
BrandBlack2   →     surface-elevated
BrandText     →     text-primary
BrandGray     →     text-secondary
BrandGray2    →     text-subtle
BrandOrange   →     accent (unchanged)
BrandGreen    →     success (unchanged)
```

With semantic names, an AI session building a page cannot accidentally use `bg-surface-page` on a card (which is wrong) because the name makes the intent obvious. `bg-surface-elevated` is unambiguously "card or panel background."

This is a large rename that touches every file in the project. It should be done once at the start of v2 before any UI work begins, not during.

### Option D — Tailwind Component Classes (Complements A)

Define reusable Tailwind component classes in `index.css` for the most common patterns so they cannot be done wrong:

```css
@layer components {
  .page-container {
    @apply flex flex-col px-4 py-4 md:px-6 md:py-6;
  }

  .card {
    @apply bg-BrandBlack2 border border-BrandGray2/20 rounded-xl p-4;
  }

  .section-heading {
    @apply text-sm font-semibold text-BrandText mb-3;
  }

  .btn-primary {
    @apply bg-BrandOrange text-white font-semibold rounded-lg px-4 py-2.5
           min-h-[44px] flex items-center justify-center
           hover:brightness-110 transition active:scale-95;
  }

  .btn-ghost {
    @apply text-BrandGray hover:text-BrandText hover:bg-BrandBlack2
           rounded-lg px-3 py-2.5 min-h-[44px] flex items-center
           gap-2 transition text-sm;
  }

  .input-base {
    @apply bg-BrandBlack2 border border-BrandGray2/20 rounded-lg px-3 py-2.5
           text-sm text-BrandText placeholder-BrandGray2
           focus:outline-none focus:border-BrandOrange/50
           min-h-[44px] w-full;
  }

  .modal-overlay {
    @apply fixed inset-0 z-modal flex items-end md:items-center justify-center
           bg-black/50 backdrop-blur-sm;
  }

  .modal-sheet {
    @apply w-full rounded-t-2xl md:rounded-xl md:max-w-md
           bg-BrandBlack2 border border-BrandGray2/20;
  }

  .bottom-safe {
    /* Use on any fixed bottom element inside the app (not in the Slate editor) */
    bottom: calc(4rem + env(safe-area-inset-bottom));
  }
}
```

With these classes, a page built by Claude uses `.card` and `.btn-primary` and gets mobile behavior for free.

---

## How Desktop and Mobile Should Be Considered Together

Mobile is not a separate mode. Every page has one codebase that responds to screen size. The design decision order is:

1. **Start with mobile layout.** What is the smallest usable version of this page? What can be removed or collapsed? This forces priority decisions about what actually matters on this screen.

2. **Layer in desktop enhancements.** Wider screens get more columns, richer sidebars, hover states, drag-and-drop, more visible metadata.

3. **Never use `md:hidden` to hide critical functionality.** If something is hidden on mobile with `md:hidden`, mobile users lose access to it entirely. That should be a conscious product decision, not a layout shortcut.

4. **Use `hidden md:flex` for desktop-only chrome.** Sidebar, wide panels, hover tooltips.

5. **Use `md:hidden` only for mobile-only chrome.** Bottom nav, mobile-specific action sheets, compact mobile headers.

The play list (`Plays.jsx`) already does this reasonably well — it detects `isMobile` and disables play creation/editing on mobile, which is an intentional product decision. The mobile play card is still functional (tappable, shows metadata, shows tags). That is the right pattern: not removing content, but adapting the interaction model.

---

## Page-by-Page Mobile Audit (Current State)

| Page | Mobile Issues |
|---|---|
| `Plays.jsx` | Long inline JSX, 800+ lines. Mobile detection via JS `matchMedia` — correct. Play creation disabled on mobile — intentional. Card layout adapts. Main issues: long menus overflow on small screens, search bar needs better mobile height. |
| `Team.jsx` | Member list rows have small action buttons. Invite code copy button is usable. Overall passable. |
| `Profile.jsx` | Form inputs likely need `min-h-[44px]` audit. |
| `Settings.jsx` | Settings rows are usable. Danger Zone section's confirm input needs min-height audit. |
| `Notifications.jsx` | Notification rows are passable. Mark-all button needs tap target audit. |
| `Playbooks.jsx` | Similar issues to Plays. Full audit needed. |
| `PlayView.jsx` | View-only player — needs `overflow` audit on canvas container. |
| All pages | Bottom-padding from AppLayout is correct. Light-mode background correctness needs page-by-page audit. |

---

## What to Do Before Building Any New Page in v2

In order:

1. Rename tokens to semantic names (`surface-page`, `surface-elevated`, `text-primary`, etc.)
2. Define the Tailwind component classes listed in Option D above
3. Create or mandate `<AppPage>` as the outer wrapper for all pages
4. Add the mobile prompt contract (Option B) to `CLAUDE.md` so it is always in Claude's context
5. Build pages mobile-first, add desktop enhancements second

Without steps 1 and 4, every new session will make the same mistakes. Steps 1 and 4 are the most important.
