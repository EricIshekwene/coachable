# Backend Flows and Required Tables

This document maps the current frontend behavior to backend flows and a concrete Postgres schema.

Source of truth used while writing this spec:
- `src/context/AuthContext.jsx`
- `src/pages/app/*.jsx`
- `src/pages/Onboarding.jsx`
- `src/pages/PlayEditPage.jsx`
- `src/components/SaveToPlaybookModal.jsx`
- `src/utils/dataContracts.js`
- `src/utils/appPlaysStorage.js`

## 1. Scope and assumptions

- Replace local state/localStorage behavior with API + database persistence.
- Keep current frontend contracts for plays/teams (see `dataContracts.js`).
- Use Postgres as primary relational database.
- Authentication provider is not prescribed here; schema assumes we have a stable `users.id` for app logic.

## 2. Canonical data contracts (already aligned in frontend)

### PlayRecord

Required fields:
- `id`
- `teamId`
- `folderId`
- `title`
- `tags[]`
- `playData` (JSON payload)
- `thumbnail`
- `notes`
- `notesAuthorName`
- `notesUpdatedAt`
- `favorited`
- `createdAt`
- `updatedAt`

Legacy aliases to support in API adapters during migration:
- `playName -> title`
- `savedAt -> updatedAt`

### TeamRecord

Required fields:
- `id`
- `name`
- `sport`
- `seasonYear`
- `ownerId`
- `createdAt`
- `updatedAt`

Legacy alias:
- `teamName -> name`

## 3. Required backend flows

## Flow A: Auth and session

Frontend behavior:
- Signup creates a user profile.
- Login returns user + role/team context.
- Logout clears session.

Backend responsibilities:
- Create user account.
- Issue and validate sessions/tokens.
- Return profile payload for app shell.

Suggested endpoints:
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Tables touched:
- `users`
- (auth/session tables if using first-party auth)

## Flow B: Onboarding (create team)

Frontend behavior:
- User selects create team.
- Provides `teamName`, optional `sport`.
- Becomes `coach` + team owner.

Backend responsibilities:
- Create team.
- Create membership row for creator.
- Set owner on team.
- Mark user onboarded.

Suggested endpoint:
- `POST /onboarding/create-team`

Tables touched:
- `teams`
- `team_memberships`
- `users`

## Flow C: Onboarding (join team by invite code)

Frontend behavior:
- User enters invite code.
- Picks role (`coach` or `player`).

Backend responsibilities:
- Validate invite code.
- Create membership.
- Mark invite accepted.
- Mark user onboarded.

Suggested endpoint:
- `POST /onboarding/join-team`

Tables touched:
- `team_invites` or `team_invite_codes`
- `team_memberships`
- `users`

## Flow D: Team invites and join requests

Frontend behavior:
- Coach can copy a team invite code.
- Coach can send invite by email/text.
- Player can request to join another team from profile.

Backend responsibilities:
- Generate and rotate invite codes.
- Create direct invite records (email/text).
- Track invite status lifecycle.
- Track join requests and approval/rejection.

Suggested endpoints:
- `GET /teams/:teamId/invite-code`
- `POST /teams/:teamId/invites`
- `POST /teams/:teamId/join-requests`
- `POST /teams/:teamId/join-requests/:requestId/approve`
- `POST /teams/:teamId/join-requests/:requestId/reject`

Tables touched:
- `team_invite_codes`
- `team_invites`
- `team_join_requests`

## Flow E: Team membership and ownership

Frontend behavior:
- Team page lists members.
- Profile allows ownership transfer (owner only).
- Player can leave team.

Backend responsibilities:
- List members by team.
- Enforce RBAC for owner-only actions.
- Transfer ownership atomically.
- Remove membership when leaving.

Suggested endpoints:
- `GET /teams/:teamId/members`
- `POST /teams/:teamId/ownership-transfer`
- `DELETE /teams/:teamId/members/:userId`

Tables touched:
- `teams`
- `team_memberships`

## Flow F: Profile updates and email change verification

Frontend behavior:
- User updates name.
- User requests email change.
- User confirms after verification step.

Backend responsibilities:
- Patch profile fields.
- Create email-change request with token.
- Verify token and apply email update.

Suggested endpoints:
- `PATCH /users/me`
- `POST /users/me/email-change`
- `POST /users/me/email-change/verify`

Tables touched:
- `users`
- `email_change_requests`

## Flow G: Team/user settings

Frontend behavior:
- Notification preferences.
- Assistant coach permissions.
- Team defaults (`teamName`, `sport`, `teamLogo`, `seasonYear`).
- Theme selection and player-view toggle.

Backend responsibilities:
- Persist user-level preferences.
- Persist team-level permissions/defaults.

Suggested endpoints:
- `PATCH /users/me/preferences`
- `PATCH /teams/:teamId/settings`

Tables touched:
- `user_preferences`
- `team_settings`
- `teams` (for editable defaults like name/sport/logo/season)

## Flow H: Play CRUD (core)

Frontend behavior:
- Create play (`title`, optional tags).
- Edit play data from Slate (autosave/manual save).
- Delete play.
- List plays with metadata.

Backend responsibilities:
- CRUD APIs for play records.
- Validate `playData` JSON shape at API boundary.
- Track `created_by` / `updated_by`.

Suggested endpoints:
- `GET /teams/:teamId/plays`
- `POST /teams/:teamId/plays`
- `GET /teams/:teamId/plays/:playId`
- `PATCH /teams/:teamId/plays/:playId`
- `DELETE /teams/:teamId/plays/:playId`

Tables touched:
- `plays`

## Flow I: Folder management and move operations

Frontend behavior:
- Create nested folders (up to depth 4 in UI).
- Rename/delete folder.
- Move play into folder (single-folder membership behavior).

Backend responsibilities:
- CRUD folders with parent references.
- Move play by updating `plays.folder_id`.
- Guard against invalid parent trees.

Suggested endpoints:
- `GET /teams/:teamId/folders`
- `POST /teams/:teamId/folders`
- `PATCH /teams/:teamId/folders/:folderId`
- `DELETE /teams/:teamId/folders/:folderId`
- `PATCH /teams/:teamId/plays/:playId/folder`

Tables touched:
- `play_folders`
- `plays`

## Flow J: Tags, favorites, notes

Frontend behavior:
- Play tags.
- Favorite toggles.
- Notes with author + timestamp.

Backend responsibilities:
- Normalize tags.
- Store favorites per user.
- Persist notes metadata.

Suggested endpoints:
- `PATCH /teams/:teamId/plays/:playId/tags`
- `PUT /teams/:teamId/plays/:playId/favorite`
- `PATCH /teams/:teamId/plays/:playId/notes`

Tables touched:
- `play_tags`
- `play_tag_links`
- `play_favorites`
- `plays`

## Flow K: View-only sharing

Frontend behavior:
- "Copy link" for play view route.
- Player/read-only mode for play rendering.

Backend responsibilities:
- Generate revocable share tokens.
- Resolve share token to readable play.

Suggested endpoints:
- `POST /teams/:teamId/plays/:playId/share-links`
- `GET /share/:token`
- `DELETE /teams/:teamId/plays/:playId/share-links/:linkId`

Tables touched:
- `play_share_links`

## Flow L: Import/export payloads

Frontend behavior:
- Import/export full play JSON (`play-export-v2`).

Backend responsibilities:
- Not required for MVP persistence.
- Optional endpoint for server-side validation and storage of imports.

Suggested optional endpoint:
- `POST /teams/:teamId/plays/import`

## 4. Postgres tables to create

## 4.1 Extensions and enums

```sql
create extension if not exists pgcrypto;

create type team_role as enum ('owner', 'coach', 'assistant_coach', 'player');
create type invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type join_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type email_change_status as enum ('pending', 'verified', 'cancelled', 'expired');
```

## 4.2 Core identity

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  player_view_mode boolean not null default false,
  notify_players_join_team boolean not null default true,
  notify_coaches_make_changes boolean not null default true,
  notify_invite_accepted boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table email_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  current_email text not null,
  next_email text not null,
  verification_token text not null unique,
  status email_change_status not null default 'pending',
  requested_at timestamptz not null default now(),
  verified_at timestamptz,
  expires_at timestamptz not null
);

create index email_change_requests_user_idx on email_change_requests(user_id);
create index email_change_requests_status_idx on email_change_requests(status);
```

## 4.3 Teams and membership

```sql
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport text,
  season_year text,
  logo_url text,
  owner_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table team_settings (
  team_id uuid primary key references teams(id) on delete cascade,
  assistant_can_create_edit_delete_plays boolean not null default true,
  assistant_can_manage_roster boolean not null default true,
  assistant_can_send_invites boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role team_role not null,
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index team_memberships_user_idx on team_memberships(user_id);
create index team_memberships_team_role_idx on team_memberships(team_id, role);
```

## 4.4 Invites and join requests

```sql
create table team_invite_codes (
  team_id uuid primary key references teams(id) on delete cascade,
  code text not null unique,
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

create table team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  invited_by_user_id uuid not null references users(id),
  contact_email text,
  contact_phone text,
  requested_role team_role not null default 'player',
  status invite_status not null default 'pending',
  token text unique,
  expires_at timestamptz,
  accepted_by_user_id uuid references users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check ((contact_email is not null) or (contact_phone is not null))
);

create index team_invites_team_idx on team_invites(team_id);
create index team_invites_status_idx on team_invites(status);

create table team_join_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  requester_user_id uuid not null references users(id) on delete cascade,
  invite_code_submitted text,
  requested_role team_role not null default 'player',
  status join_request_status not null default 'pending',
  reviewed_by_user_id uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index team_join_requests_pending_unique
  on team_join_requests(team_id, requester_user_id)
  where status = 'pending';
```

## 4.5 Playbook

```sql
create table play_folders (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  parent_id uuid references play_folders(id) on delete set null,
  name text not null,
  sort_order int not null default 0,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, parent_id, name)
);

create index play_folders_team_idx on play_folders(team_id);

create table plays (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  folder_id uuid references play_folders(id) on delete set null,
  title text not null,
  play_data jsonb,
  thumbnail_url text,
  notes text not null default '',
  notes_author_name text not null default '',
  notes_updated_at timestamptz,
  created_by_user_id uuid not null references users(id),
  updated_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index plays_team_idx on plays(team_id);
create index plays_folder_idx on plays(folder_id);
create index plays_updated_at_idx on plays(updated_at desc);

create table play_tags (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  label text not null,
  normalized_label text not null,
  created_at timestamptz not null default now(),
  unique (team_id, normalized_label)
);

create table play_tag_links (
  play_id uuid not null references plays(id) on delete cascade,
  tag_id uuid not null references play_tags(id) on delete cascade,
  primary key (play_id, tag_id)
);

create table play_favorites (
  play_id uuid not null references plays(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (play_id, user_id)
);

create table play_share_links (
  id uuid primary key default gen_random_uuid(),
  play_id uuid not null references plays(id) on delete cascade,
  created_by_user_id uuid not null references users(id),
  token text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index play_share_links_play_idx on play_share_links(play_id);
```

## 5. Implementation order (recommended)

1. `users`, `teams`, `team_memberships`, `plays`, `play_folders`.
2. Auth + onboarding endpoints.
3. Play CRUD + folder endpoints.
4. Tags/favorites/notes endpoints.
5. Invites/join requests/ownership transfer.
6. Preferences + email change verification.
7. Share links and read-only play endpoint.

## 6. Notes for frontend migration

- Keep `toPlayEndpointPayload()` and `toTeamEndpointPayload()` as request payload adapters.
- For API responses, return canonical fields (`title`, `updatedAt`, etc.) and avoid relying on legacy aliases.
- Favor `folder_id` on `plays` as the source of truth (not folder-side `playIds` arrays).
