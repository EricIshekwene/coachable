# Onboarding Flow — Design Spec

**Status:** Authoritative design spec for the v2 onboarding page.
**Output:** Informs `src/auth/pages/Onboarding.tsx` (via `AuthRoutes.tsx`).
**Route:** `/onboarding`
**Guards:** `RequireAuth → RequireVerifiedEmail → RequireNotOnboarded` — email verification is a hard gate; already-onboarded users are redirected to `/app/plays`.

---

## Overview

Onboarding is the first screen a new user sees after verifying their email. Its job is to place the user in a valid team context (or a solo workspace) so they can immediately use the app. Drop-off here is activation drop-off — the flow must be as short as possible.

There are three paths. The path chosen determines the server call made and the post-onboarding destination.

| Path | Server call | Post-onboarding destination |
|---|---|---|
| Create team | `POST /api/onboarding/create-team` | `returnTo` or `/app/plays` |
| Join team | `POST /api/onboarding/join-team` | `returnTo` or `/app/plays` |
| Solo ("Just Make Plays") | `POST /api/onboarding/solo` | `returnTo` or `/slate/:sport` |

The server seeds a demo play on the create-team path. The user lands on `/app/plays` with one play already in their library.

---

## Layout

**Desktop (md+):** Split panel. Left 3/5 is white with the form content. Right 2/5 is a dark brand photo with contextual copy that updates based on the current step.

**Mobile:** Full width, white, natural scroll. The right panel is hidden.

**Typography and spacing:** All formatting follows `docs/design/general-formatting-standards.md`. Page heading is `heading` level (22px Manrope 600). Body copy is `body` (15px DmSans 400). Inputs use `--radius-md` (8px). CTA buttons use `--radius-md`.

**Scroll:** The left panel scrolls on mobile; on desktop it is locked to the viewport height (`var(--app-viewport-height)`). Use `dvh` units, not `vh`.

**Safe area:** Left panel padding respects `env(safe-area-inset-top)` at the top and `env(safe-area-inset-bottom) + var(--app-keyboard-inset)` at the bottom — the keyboard lifts the CTA on mobile.

---

## Progress indicator

None. No step dots, numbered steps, or progress bar. The back button provides navigation context. The flow is short enough that a progress indicator adds visual clutter without meaningful orientation value.

---

## State and persistence

All onboarding state is in-component React state. If the user closes the tab, refreshes, or navigates away mid-flow, state is lost and they restart from the choose step. Nothing is persisted to `localStorage` or the server until the final submit.

The `returnTo` and `invite` query params are read once from the URL on mount and stored in component state for the duration of the flow.

---

## Right panel copy (desktop only)

The right panel shows contextual copy that updates based on which step is active. Two states:

| Condition | Eyebrow | Headline | Body |
|---|---|---|---|
| Steps 1–2 (choose / details) | "Set up your space" | "Build. Strategize. Win." | Varies by `teamAction` — see below |
| Step 3 (sport picker) | "The modern playbook" | "Build. Strategize. Win." | Varies by `teamAction` |

**Body copy by `teamAction`:**
- `create` on details step: "As the team creator, you'll be the coach. Invite players after setup."
- `join` on details step: "Your invite code determines your role. Ask your coach for the right code."
- `create` on sport step: "Sets the right field, positions, and player defaults in the play editor."
- `solo` on sport step: "Start designing plays instantly. You can create or join a team anytime."

---

## Pre-invited users (invite link shortcut)

When `?invite=<code>` is present in the URL (the user arrived via a direct invite link), onboarding bypasses the choose step entirely. The user sees a dedicated one-screen view:

- White left panel with the Coachable logo, a handshake icon, and the heading "Join your team."
- The invite code is displayed in a read-only styled box (not an editable input) — orange border, monospaced font, uppercase.
- Subtext: "Your invite code has been pre-filled. Tap the button below to join."
- Single CTA: "Join team" → calls `POST /api/onboarding/join-team` immediately.
- Right panel: "Welcome to the team" eyebrow. Same brand photo. Body: "Your invite code determines your role. You'll be added to the team automatically."

The invite code value is pre-populated from `inviteCode` state (seeded from the URL param). No editable input — the user cannot modify it on this screen.

---

## Path 1 — Create Team

**Step sequence:** Choose → Name → Sport → Invite

**Step 1 — Choose**

Three equal-width cards in a 3-column grid:

| Card | Label | Subtext | Icon |
|---|---|---|---|
| Create Team | "Create Team" | "Start fresh" | `MdOutlineCreateNewFolder` |
| Join Team | "Join Team" | "Use invite code" | `FaRegHandshake` |
| Just Make Plays | "Just Make Plays" | "No team needed" | `FiEdit` |

Clicking "Create Team" advances to Step 2 with `teamAction = "create"`.

**Step 2 — Name your team**

- Heading: "Name your team"
- Body: "Give your team a name to get started."
- Single text input, auto-focused. Placeholder: "e.g. Riverside Rugby". Max length from `INPUT_LIMITS.NAME`.
- Validation: required, minimum 2 characters. CTA is disabled until valid.
- CTA: "Continue" → advances to Step 3. Enter key also advances if valid.
- Back button: returns to Step 1.

**Step 3 — Choose your sport**

- Eyebrow: "Team Setup" (in BrandOrange, uppercase tracking)
- Heading: "Choose your sport"
- Body: "Sets the field and player defaults in the play editor. You can change it later in settings."
- Sport grid: 2-column on mobile, 3-column on sm+. One card per sport + "Blank Canvas" fallback.
- Each sport card: colored background, field image at 60% opacity (80% on hover + scale 105%), sport name label at bottom. Ice hockey image is rotated 90°.
- Selecting a sport marks it with an orange checkmark badge (top-right). Does **not** submit yet.
- CTA: "Finish Setup" — enabled only after a sport is selected. Submitting state: "Setting up..."
- Footnote below CTA: orange dot + "You can change the sport anytime in team settings"
- Back button: returns to Step 2 (name).

**Step 4 — Invite members**

> **v2 addition — not present in v1**

After the server call from Step 3 completes successfully and before navigating to `/app/plays`, show an invite step.

- Heading: "Invite your team"
- Body: "Add players and coaches by email. You can skip this and invite them later from the team page."
- Email input(s): allow adding multiple emails (inline "Add another" link, up to a reasonable limit).
- CTA: "Send invites & finish"
- Skip link: "Skip for now" — navigates to `returnTo || /app/plays` without sending invites.
- If invites are sent: calls the invite API, then navigates to `returnTo || /app/plays`.
- This step runs **after** the team is created. If the user skips, the team already exists and they land on `/app/plays` with the seeded demo play.

---

## Path 2 — Join Team

**Step sequence:** Choose → Code → submit

**Step 1 — Choose**

Same 3-column grid as Create Team path. Clicking "Join Team" advances with `teamAction = "join"`.

**Step 2 — Join a team**

- Heading: "Join a team"
- Body: "Enter the invite code your coach shared with you."
- Text input for invite code. Auto-focused. `autoCapitalize="characters"`. Max length from `INPUT_LIMITS.INVITE_CODE`. Placeholder: "Paste your invite code".
- Subtext below input: "Your role (coach or player) is determined by the code."
- Validation: minimum 6 characters. CTA is disabled until valid.
- CTA: "Join team" → calls `POST /api/onboarding/join-team`. Enter key also submits if valid.
- Submitting state: "Joining..."
- Back button: returns to Step 1.
- No sport step. Role and team context are resolved from the invite code server-side.

**Post-submit:** navigates to `returnTo || /app/plays`.

---

## Path 3 — Solo ("Just Make Plays")

**Step sequence:** Choose → Sport → immediate submit on click

**Step 1 — Choose**

Same 3-column grid. Clicking "Just Make Plays" advances directly to the sport step (skips Step 2) with `teamAction = "solo"`.

**Step 2 — Choose your sport**

- Eyebrow: "Play Designer" (in BrandOrange)
- Heading: "Choose your sport"
- Body: "Select a sport to open the editor with the right field and defaults."
- Same sport grid as Create Team's sport step.
- **One-click submit:** clicking a sport card immediately calls `POST /api/onboarding/solo`. No separate CTA button. While submitting, the grid is disabled and a centered spinner + "Setting up..." text appears below the grid.
- Back button: returns to Step 1.

**Post-submit:** navigates to `returnTo || /slate/:sport` (or `/slate/blank` if "Blank Canvas" was selected).

---

## Back navigation

Back buttons appear on Steps 2, 3, and 4. They do not call any server routes — they only update local step state. Navigating back does not clear previously entered values (team name is preserved if the user returns from the sport step).

Clicking "Back to home" (top-left link on Steps 1–2) calls `logout()` and navigates to `/home`. This is available on all non-sport steps in the main flow and on the pre-invited view.

---

## Error handling

Errors from any server call are surfaced via `AppMessageContext.showMessage()` as a toast. No inline field-level error for API failures — the toast pattern is consistent with the rest of the app.

Client-side validation errors (empty name, code too short) block the CTA via disabled state — they do not fire toasts.

Error messages (toast):
- Missing team name: "Please enter a team name to continue."
- Name too short: "Team name must be at least 2 characters."
- Missing invite code: "Enter an invite code to join a team."
- Code too short: "Invite code looks too short."
- Generic API failure: `err.message || "Could not complete setup."`

---

## Animation

The left panel uses two absolutely-positioned layers that slide in/out with `opacity` and `translateX` transitions:
- Layer 1 (Steps 1–2): slides out left (`translateX(-32px)`) and fades when sport step is active.
- Layer 2 (sport step): slides in from right (`translateX(32px)`) and fades in when active.
- Transition: `opacity 0.25s ease, transform 0.25s ease` — within the 150–300ms motion budget.
- `pointer-events` is set to `none` on the inactive layer to prevent ghost clicks.

---

## Decisions made in this doc

| Decision | Choice |
|---|---|
| Layout | 3/5 left white + 2/5 right dark brand photo on desktop; full width on mobile |
| Progress indicator | None |
| Create-team steps | Choose → Name → Sport → Invite (skippable) |
| Join-team steps | Choose → Code → submit (no sport step) |
| Solo steps | Choose → Sport → immediate submit on click |
| Sport step in join-team | No — role and team come from invite code, no sport needed |
| Invite members step | Added in v2 after team creation; skippable |
| Required vs optional | Name and Sport are required; Invite is always skippable |
| Pre-invited UX | Bypass choose; single screen with pre-filled read-only code |
| Mid-flow persistence | None — state resets on navigation away |
| Post-onboarding create/join | `returnTo` or `/app/plays` |
| Post-onboarding solo | `returnTo` or `/slate/:sport` (or `/slate/blank`) |
| Back-to-home | Calls logout + navigates to `/home` |
| Tone | Utilitarian form with warm aspirational brand copy on right panel |

---

## Cross-Reference Notes

**References:**
- `docs/engineering/planning/routing.md` — route guards, `returnTo` threading, `/onboarding` guard stack
- `docs/engineering/audits/api-review.md` — `onboarding.js` route behavior (create-team, join-team, solo, demo play seed)
- `docs/design/general-formatting-standards.md` — spacing, type scale, motion budget

**Referenced by:**
- `src/auth/pages/Onboarding.tsx` — implementation file for this spec
- `docs/engineering/planning/routing.md` — `/onboarding` route entry
