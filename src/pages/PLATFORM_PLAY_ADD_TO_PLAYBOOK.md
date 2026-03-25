# Platform Play — Add to Playbook

## What was implemented

The `/platform-play/:playId` page (used for admin-shared plays) now matches the layout and functionality of the regular `/shared/:token` share page when a user is logged in.

### Changes

1. **Backend — `POST /platform-plays/:id/copy`** (`server/routes/platformPlays.js`)
   - New authenticated endpoint that copies a platform play into the user's team playbook.
   - Validates the user is a coach/owner/assistant_coach before allowing the copy.
   - Inserts a new row into the `plays` table with the platform play's title, play_data, and thumbnail.

2. **Frontend API — `copyPlatformPlay(playId)`** (`src/utils/apiPlays.js`)
   - New API helper that calls the copy endpoint using the existing `apiFetch` wrapper (auto-attaches auth token).

3. **Frontend — `PlatformPlayView.jsx`** (`src/pages/PlatformPlayView.jsx`)
   - **Auth-aware header**: When logged in, shows "Go to App" + user profile chip (matching SharedPlay). When not logged in, shows "Log in" / "Sign Up" buttons.
   - **Add to Playbook button**: Coaches see an orange "Add to Playbook" button. After successful copy, it turns green with "Added — View Playbook" linking to `/app/plays`. Non-logged-in visitors see the button too — clicking it redirects to login with a `returnTo` param.
   - **Login CTA card**: Non-logged-in visitors see a signup/login CTA card below the header (matching SharedPlay).
   - **Layout**: Uses the same `max-w-4xl`, `app-themed`, `BrandBlack` styling as SharedPlay for visual consistency.
   - Retains platform-play-specific fields (sport badge, description) that don't exist on shared plays.

### Key decisions

- The copy endpoint lives on the existing `platformPlays` router rather than `shared.js` since platform plays aren't token-based shares.
- No tags are copied since platform plays store tags as a simple array column, not via the `play_tag_links` join table. Tags could be added later if needed.
- The page still fetches from the public `/platform-plays/:id` endpoint (no auth needed to view), but the copy requires auth.

### Tests

- `admin/test/platformPlays.test.js` — 3 new tests covering:
  - Successful copy with auth header
  - 403 rejection for non-coach roles
  - 404 for missing platform play
