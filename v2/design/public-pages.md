# Public Pages

**Status:** Design complete. Ready to execute.  
**Scope:** SharedPlay, SharedFolder, SharedPlayView, and PlatformPlayView — pages accessible without authentication. Does not cover marketing pages (Landing, sport landings, PublicPlaybooks, Enterprise, Resources).

---

## Page inventory

| Route | Page | Indexed |
|---|---|---|
| `/shared/:token` | SharedPlay | noindex |
| `/shared/:token/view` | SharedPlayView | noindex |
| `/shared/folder/:token` | SharedFolder | noindex |
| `/shared/folder/:token/play/:playId` | SharedPlayView | noindex |
| `/platform-play/:playId` | PlatformPlayView | ✓ Sitemap |
| `/platform-play/:playId/view` | PlatformPlayView — Slate viewer | noindex |

`/platform-play/:playId/view` is new in v2 — add it to `routing.md`.

---

## Shared patterns

### Top nav

All landing pages (SharedPlay, SharedFolder, PlatformPlayView) use an identical nav.

| Auth state | Left | Right |
|---|---|---|
| Anonymous | Logo → `/` | "Log in" ghost link + "Sign Up" BrandOrange button |
| Logged in | Logo → `/` | "Go to App" ghost button → `/app/plays` · profile pill (name + team → `/app/profile`) |

SharedPlayView has no nav — it is full-screen Slate with the editor's own back button.

### Theme

Anonymous visitors default to **light mode**. Logged-in users see their saved preference (localStorage). Theme is applied synchronously via `ThemeScript` in `index.html` — no flash on load.

### CTA rules

| Auth state | "Add to Playbook" | "View in Slate" | Inline sign-up card |
|---|---|---|---|
| Anonymous | ✓ — redirects to `/login?returnTo=<path>` | ✓ | ✓ |
| Coach (owner / coach / assistant_coach) | ✓ — copies to their team | ✓ | — |
| Player | — | ✓ | — |

After a successful copy, "Add to Playbook" becomes "Added — View Playbook" (BrandGreen button → `/app/plays`).

"Go to App" appears in the nav for all logged-in users, not in the action row.

### Inline sign-up card

Shown to anonymous visitors only. Placed below the page header, above the play preview.

- **Heading:** "Get started with Coachable!"
- **Body:** see per-page copy below
- **Actions:** "Log in" ghost button + "Sign Up" BrandOrange button — both include `returnTo` set to the current path

### Error state

A single centered error state covers all failure cases (expired, revoked, removed). No separate expired-link page — links are always valid at creation time.

| Page | Title | Body |
|---|---|---|
| SharedPlay / SharedFolder | "This link is unavailable" | "This share link may have expired or been revoked." |
| PlatformPlayView | "Play not found" | "This play may have been removed or the link is invalid." |

All error states include a "Go Home" button → `/`.

---

## SharedPlay (`/shared/:token`)

### Layout

Full-page scrollable. `min-h-[100dvh]`.

```
Nav
─────────────────────────────────────────────────
"Shared from [Team name]"    ← caption, BrandGray
[Play title]                 ← heading
[Updated timestamp]          ← caption, BrandGray2

[View in Slate]  [Add to Playbook]   ← action row

[Inline sign-up card — anon only]

[Animated play preview]      ← full content width

[Tags — if present]
[Coach notes card — if present]
```

Content: `max-w-4xl`, centred, `px-6 md:px-10`.

### Play preview

`PlayPreviewPlayer`. Shape: wide. Camera: fit-distribution. Background: field. This is the landing experience — not the full editor.

### "View in Slate"

Always visible regardless of auth state. Navigates to `/shared/:token/view` → `SharedPlayView`, where visitors can scrub the animation and step through keyframes.

### Inline sign-up card copy

"Sign up to add this play to your playbook and start building plays."

---

## SharedFolder (`/shared/folder/:token`)

### Layout

Full-page scrollable. `min-h-[100dvh]`.

```
Nav
─────────────────────────────────────────────────
"Shared from [Team name]"    ← caption, BrandGray
[Folder icon]  [Folder name] ← heading
"[N] plays"                  ← caption, BrandGray2

[Add to Playbook]            ← action row

[Inline sign-up card — anon only]

[Play card grid]
  1 col mobile / 2 col sm / 3 col lg
  Each card: preview thumbnail · title · timestamp · tags
```

Content: `max-w-5xl`, centred, `px-6 md:px-10`.

No "View in Slate" on the folder page — the play cards are the entry point to the full viewer.

### Play cards

Clicking a card navigates to `/shared/folder/:token/play/:playId` → `SharedPlayView`. The back button in `SharedPlayView` returns to `/shared/folder/:token`.

### Inline sign-up card copy

"Sign up to add this folder to your playbook and start building plays."

---

## PlatformPlayView (`/platform-play/:playId`)

A single play from the Coachable platform library. Google-indexed; included in the sitemap.

### Layout

Same structure as SharedPlay. `max-w-4xl`, centred.

```
Nav
─────────────────────────────────────────────────
[Sport badge — pill]         ← BrandGray2/20 bg, BrandGray text, uppercase
[Play title]                 ← heading
[Description — if present]   ← body, BrandGray

[View in Slate]  [Add to Playbook]   ← action row

[Inline sign-up card — anon only]

[Animated play preview]      ← full content width

[Tags — if present]
```

### Play preview

`PlayPreviewCard` with `autoplay="always"`. Shape: wide. Camera: fit-distribution. Background: field.

### "View in Slate"

Added in v2 (absent in v1). Navigates to `/platform-play/:playId/view` → full-screen read-only Slate viewer. That route is `noindex`.

### Inline sign-up card copy

"Sign up to add this play to your playbook and start building plays."

---

## SharedPlayView (full-screen read-only editor)

Reached from three entry points:

| Entry point | Route |
|---|---|
| SharedPlay | `/shared/:token/view` |
| SharedFolder play card | `/shared/folder/:token/play/:playId` |
| PlatformPlayView | `/platform-play/:playId/view` |

### Layout

Full-screen (`height: 100dvh`). No nav. No header. Slate editor in `viewOnly` mode fills the entire viewport.

The editor's back button returns to the originating page:
- SharedPlay → `/shared/:token`
- SharedFolder → `/shared/folder/:token`
- PlatformPlayView → `/platform-play/:playId`

Visitors can scrub the animation timeline and step through keyframes. No editing, no saving.

Loading: centered spinner over dark background, fades out on ready.

---

## Decisions

| Decision | Choice |
|---|---|
| Default theme for anonymous visitors | Light |
| Expired / revoked link handling | Single error state — no separate page |
| Inline sign-up CTA | Inline card — same form as v1 |
| SharedPlay viewer mode | Two-step: animated preview → "View in Slate" → full read-only editor |
| "Add to Playbook" eligibility | Coaches only (owner / coach / assistant_coach) |
| SharedFolder play navigation | Navigate to full-screen SharedPlayView — no modal |
| PlatformPlayView "View in Slate" | Added in v2; routes to `/platform-play/:playId/view` |
| Extra CTAs | None — only Add to Playbook, Go to App, View in Slate |

---

## Cross-Reference Notes

**References:**
- `v2/engineering/planning/routing.md` — add `/platform-play/:playId/view` to the public route table
- `v2/engineering/planning/features/seo-plan.md` — noindex rules for shared pages; PlatformPlayView sitemap inclusion
- `v2/design/general-formatting-standards.md` — typography, spacing, and color tokens apply throughout

**Referenced by:**
- `v2/engineering/planning/routing.md` — new `/platform-play/:playId/view` route depends on this doc
