# Shared Play / Folder — Team Picker Fix

## The gap

When a coach clicked "Add to Playbook" on `/shared/:token` (`SharedPlay.jsx`) or
`/shared/folder/:token` (`SharedFolder.jsx`), the app never asked which team to
add the play/folder to. Server-side, `POST /shared/plays/:token/copy` and
`POST /shared/folders/:token/copy` (`server/routes/shared.js`) picked
`memberRows[0]` — the first row Postgres happened to return for
`SELECT ... FROM team_memberships WHERE user_id = $1`, with no `ORDER BY` and
no notion of "the team currently active in the app." A coach who belongs to
more than one team (a real, fully-supported case — see `TeamSwitcher.jsx` /
`AuthContext`'s `allTeams`) could have a play silently copied into the wrong
team's playbook with no way to tell beforehand.

## The fix

### Backend (`server/routes/shared.js`)
- Both copy routes now accept an optional `teamId` in the POST body.
- New helpers: `findMembership(userId, teamId)`, `resolveDefaultMembership(userId)`
  (active team → earliest membership, mirroring `platformPlays.js`'s pattern),
  and `resolveTargetMembership(userId, requestedTeamId)` which ties them
  together and does the coach-role check. An explicit `teamId` is always
  verified against the user's real memberships server-side — the client's
  choice is never trusted blindly.
- Omitting `teamId` keeps the previous (now-corrected) fallback behavior, so
  older cached clients still work.

### Frontend
- `copySharedPlay(token, teamId)` / `copySharedFolder(token, teamId)`
  (`src/utils/apiPlays.js`, `src/utils/apiFolders.js`) now take an optional
  target team id.
- `SharedPlay.jsx` / `SharedFolder.jsx` compute `coachEligibleTeams` from
  `allTeams` (from `AuthContext`), filtered to `owner`/`coach`/`assistant_coach`
  roles. If there's more than one eligible team, clicking "Add to Playbook"
  opens `TeamPickerModal` instead of guessing; with exactly one eligible team,
  it copies straight there (no added friction for the common single-team case).
- **`TeamPickerModal.jsx`** (`src/components/`) — a new, focused modal that
  lists the eligible teams (name, role, active-team checkmark), styled to
  match the app sidebar's `TeamSwitcher.jsx` list rows. It only handles
  "pick a team and report back" — it does not switch the user's active team
  session (unlike `TeamSwitcher`), since adding a play to a team you're not
  actively viewing shouldn't change what you're looking at.

## Tests

- `admin/test/sharedPlayTeamPicker.test.js`:
  - `coachEligibleTeams` filtering/active-marking logic (mirrors the page-level computation).
  - `resolveTargetMembership` branch coverage mirroring the server logic (explicit valid/invalid team, non-coach role, default-team fallback, no memberships at all).
  - `TeamPickerModal` rendering, team selection, and cancel behavior.
