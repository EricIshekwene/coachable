-- Coachable API Schema
-- Run with: node db/migrate.js

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
DO $$ BEGIN
  CREATE TYPE team_role AS ENUM ('owner', 'coach', 'assistant_coach', 'player');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE join_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 1. Core identity
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  onboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 1b. Email verification
-- ============================================================

-- Add email_verified_at to existing users table (safe to re-run)
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_verification_codes_user_idx ON email_verification_codes(user_id);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
  player_view_mode BOOLEAN NOT NULL DEFAULT false,
  notify_players_join_team BOOLEAN NOT NULL DEFAULT true,
  notify_coaches_make_changes BOOLEAN NOT NULL DEFAULT true,
  notify_invite_accepted BOOLEAN NOT NULL DEFAULT true,
  -- Player-specific notification preferences
  notify_new_plays BOOLEAN NOT NULL DEFAULT true,
  notify_play_updates BOOLEAN NOT NULL DEFAULT true,
  notify_team_announcements BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add player notification columns to existing tables (safe to re-run)
DO $$ BEGIN
  ALTER TABLE user_preferences ADD COLUMN notify_new_plays BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE user_preferences ADD COLUMN notify_play_updates BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE user_preferences ADD COLUMN notify_team_announcements BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Remove logo_url column from teams (safe to re-run)
DO $$ BEGIN
  ALTER TABLE teams DROP COLUMN IF EXISTS logo_url;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Add is_personal flag for solo/casual users (safe to re-run)
DO $$ BEGIN
  ALTER TABLE teams ADD COLUMN is_personal BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 2. Teams and membership
-- ============================================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sport TEXT,
  season_year TEXT,
  owner_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration: add soft-delete support to teams (safe to re-run)
DO $$ BEGIN
  ALTER TABLE teams ADD COLUMN deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS teams_deleted_at_idx ON teams(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS team_settings (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  assistant_can_create_edit_delete_plays BOOLEAN NOT NULL DEFAULT true,
  assistant_can_manage_roster BOOLEAN NOT NULL DEFAULT true,
  assistant_can_send_invites BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role team_role NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_memberships_user_idx ON team_memberships(user_id);
CREATE INDEX IF NOT EXISTS team_memberships_team_role_idx ON team_memberships(team_id, role);

-- ============================================================
-- 3. Invites and join requests
-- ============================================================

CREATE TABLE IF NOT EXISTS team_invite_codes (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'coach')),
  code TEXT NOT NULL UNIQUE,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ,
  PRIMARY KEY (team_id, role)
);

-- Migration: add role column to existing team_invite_codes (safe to re-run)
DO $$ BEGIN
  ALTER TABLE team_invite_codes ADD COLUMN role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'coach'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Migration: drop old single-column PK and add composite PK (safe to re-run)
DO $$ BEGIN
  ALTER TABLE team_invite_codes DROP CONSTRAINT team_invite_codes_pkey;
  ALTER TABLE team_invite_codes ADD PRIMARY KEY (team_id, role);
EXCEPTION WHEN others THEN NULL;
END $$;

-- Migration: generate coach codes for existing teams that only have a player code
INSERT INTO team_invite_codes (team_id, code, created_by_user_id, role)
SELECT team_id, upper(encode(gen_random_bytes(4), 'hex')), created_by_user_id, 'coach'
FROM team_invite_codes WHERE role = 'player'
ON CONFLICT (team_id, role) DO NOTHING;

CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES users(id),
  contact_email TEXT,
  contact_phone TEXT,
  requested_role team_role NOT NULL DEFAULT 'player',
  status invite_status NOT NULL DEFAULT 'pending',
  token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES users(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_invites_team_idx ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS team_invites_status_idx ON team_invites(status);

CREATE TABLE IF NOT EXISTS team_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code_submitted TEXT,
  requested_role team_role NOT NULL DEFAULT 'player',
  status join_request_status NOT NULL DEFAULT 'pending',
  reviewed_by_user_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. Playbook
-- ============================================================

CREATE TABLE IF NOT EXISTS play_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES play_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, parent_id, name)
);

CREATE INDEX IF NOT EXISTS play_folders_team_idx ON play_folders(team_id);

CREATE TABLE IF NOT EXISTS plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES play_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  play_data JSONB,
  thumbnail_url TEXT,
  notes TEXT NOT NULL DEFAULT '',
  notes_author_name TEXT NOT NULL DEFAULT '',
  notes_updated_at TIMESTAMPTZ,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  updated_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  hidden_from_players BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS plays_team_idx ON plays(team_id);
CREATE INDEX IF NOT EXISTS plays_folder_idx ON plays(folder_id);
CREATE INDEX IF NOT EXISTS plays_updated_at_idx ON plays(updated_at DESC);

-- Safe migration: mark plays seeded during onboarding so analytics can exclude them
DO $$ BEGIN
  ALTER TABLE plays ADD COLUMN is_seeded BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Safe migration: track which platform play a team play was copied from (null = user-created)
DO $$ BEGIN
  ALTER TABLE plays ADD COLUMN copied_from_platform_play_id UUID REFERENCES platform_plays(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS play_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  normalized_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, normalized_label)
);

CREATE TABLE IF NOT EXISTS play_tag_links (
  play_id UUID NOT NULL REFERENCES plays(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES play_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (play_id, tag_id)
);

CREATE TABLE IF NOT EXISTS play_favorites (
  play_id UUID NOT NULL REFERENCES plays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (play_id, user_id)
);

CREATE TABLE IF NOT EXISTS play_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  play_id UUID NOT NULL REFERENCES plays(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS play_share_links_play_idx ON play_share_links(play_id);

CREATE TABLE IF NOT EXISTS folder_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES play_folders(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS folder_share_links_folder_idx ON folder_share_links(folder_id);

-- ============================================================
-- 5. Error reports
-- ============================================================

CREATE TABLE IF NOT EXISTS error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component TEXT,
  action TEXT,
  page_url TEXT,
  user_agent TEXT,
  device_info JSONB,
  extra JSONB,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_reports_created_at_idx ON error_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS error_reports_component_idx ON error_reports(component);

-- ============================================================
-- 6. Password reset codes
-- ============================================================

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_codes_user_idx ON password_reset_codes(user_id);
CREATE INDEX IF NOT EXISTS password_reset_codes_email_idx ON password_reset_codes(email);

-- ============================================================
-- 7. Platform plays (admin-curated, not team-scoped)
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_play_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES platform_play_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_id, name)
);

CREATE INDEX IF NOT EXISTS platform_play_folders_parent_idx
  ON platform_play_folders(parent_id);

-- Safe migration: add sport identity columns to platform_play_folders
DO $$ BEGIN
  ALTER TABLE platform_play_folders ADD COLUMN sport TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE platform_play_folders ADD COLUMN is_sport_folder BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Only one sport folder per sport name
CREATE UNIQUE INDEX IF NOT EXISTS platform_play_folders_sport_unique
  ON platform_play_folders(sport) WHERE is_sport_folder = true;

CREATE TABLE IF NOT EXISTS platform_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES platform_play_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sport TEXT,
  play_data JSONB,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe migration: add folder_id to existing platform_plays table
DO $$ BEGIN
  ALTER TABLE platform_plays ADD COLUMN folder_id UUID REFERENCES platform_play_folders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Safe migration: add previous_play_data for one-step rollback
DO $$ BEGIN
  ALTER TABLE platform_plays ADD COLUMN previous_play_data JSONB;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Safe migration: flag plays submitted via the community post flow
DO $$ BEGIN
  ALTER TABLE platform_plays ADD COLUMN is_community_submitted BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Backfill: mark any existing play that lives in a community section
UPDATE platform_plays
SET is_community_submitted = true
WHERE is_community_submitted = false
  AND id IN (
    SELECT psp.play_id
    FROM playbook_section_plays psp
    JOIN playbook_sections ps ON ps.id = psp.section_id
    WHERE ps.is_default = false
  );

-- Cleanup: signup seed comes from page_sections instead of an is_demo flag
DROP INDEX IF EXISTS platform_plays_one_demo_per_sport_idx;
ALTER TABLE platform_plays DROP COLUMN IF EXISTS is_demo;

CREATE INDEX IF NOT EXISTS platform_plays_featured_idx
  ON platform_plays(is_featured, sort_order);

CREATE INDEX IF NOT EXISTS platform_plays_folder_idx
  ON platform_plays(folder_id);

-- ============================================================
-- 8. Page sections (admin-assigned play previews for site pages)
-- ============================================================

CREATE TABLE IF NOT EXISTS page_sections (
  section_key VARCHAR(100) PRIMARY KEY,
  label       TEXT NOT NULL,
  page        TEXT NOT NULL,
  play_id     UUID REFERENCES platform_plays(id) ON DELETE SET NULL,
  is_priority BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe migration: add is_priority to existing page_sections table
DO $$ BEGIN
  ALTER TABLE page_sections ADD COLUMN is_priority BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Seed default sections (idempotent)
INSERT INTO page_sections (section_key, label, page) VALUES
  ('landing.visualize',                 'Landing — Visualize',                 'landing'),
  ('landing.visualize.rugby',           'Rugby — Visualize',                   'rugby'),
  ('landing.visualize.football',        'Football — Visualize',                'football'),
  ('landing.visualize.lacrosse',        'Lacrosse — Visualize',                'lacrosse'),
  ('landing.visualize.basketball',      'Basketball — Visualize',              'basketball'),
  ('landing.visualize.soccer',          'Soccer — Visualize',                  'soccer'),
  ('landing.visualize.ice_hockey',      'Ice Hockey — Visualize',              'ice_hockey'),
  ('landing.visualize.field_hockey',    'Field Hockey — Visualize',            'field_hockey'),
  ('landing.visualize.womens_lacrosse', 'Womens Lacrosse — Visualize',         'womens_lacrosse'),
  ('one-pager.play',                    'One Pager — Play Preview',            'one-pager')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. Beta tester flag on users
-- ============================================================

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN is_beta_tester BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 11. Active team tracking (multi-team support)
-- ============================================================

-- Tracks which team the user currently has selected across sessions.
-- NULL means "use first membership" (handles existing accounts safely).
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN active_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 10. User-reported issues (beta tester feedback)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 12. Playbook sections (admin-curated, coach-facing play collections)
-- ============================================================

CREATE TABLE IF NOT EXISTS playbook_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sport       TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe migration: add is_default to existing rows if the column doesn't exist yet
DO $$ BEGIN
  ALTER TABLE playbook_sections ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- One default playbook per sport (NULL sport excluded — only named sports get a default)
-- Guard with pg_indexes check so this is safe to re-run after the column migration above
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'playbook_sections_default_sport_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX playbook_sections_default_sport_unique
      ON playbook_sections(sport) WHERE is_default = true AND sport IS NOT NULL';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS playbook_section_plays (
  section_id UUID NOT NULL REFERENCES playbook_sections(id) ON DELETE CASCADE,
  play_id    UUID NOT NULL REFERENCES platform_plays(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (section_id, play_id)
);

CREATE INDEX IF NOT EXISTS playbook_section_plays_section_idx
  ON playbook_section_plays(section_id);
CREATE INDEX IF NOT EXISTS playbook_section_plays_play_idx
  ON playbook_section_plays(play_id);

CREATE INDEX IF NOT EXISTS user_issues_created_at_idx ON user_issues(created_at DESC);
CREATE INDEX IF NOT EXISTS user_issues_user_id_idx ON user_issues(user_id);

-- ============================================================
-- 13. Demo videos (admin-managed tutorial videos)
-- ============================================================

CREATE TABLE IF NOT EXISTS demo_videos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  youtube_url TEXT,
  keywords   TEXT NOT NULL DEFAULT '',
  done       BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe migration: add keywords to existing demo_videos rows
DO $$ BEGIN
  ALTER TABLE demo_videos ADD COLUMN keywords TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS demo_videos_sort_idx ON demo_videos(sort_order ASC, created_at ASC);

-- ============================================================
-- User prefabs (per-user, cross-device)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_prefabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  prefab_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_prefabs_user_idx ON user_prefabs(user_id);

-- ============================================================
-- Admin prefabs (global, cross-device, all sports)
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_prefabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  prefab_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Sport presets (admin-managed, multiple per sport, shown to all users)
-- ============================================================

CREATE TABLE IF NOT EXISTS sport_presets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport      TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT 'Preset',
  play_data  JSONB NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_hidden  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe migration: add is_hidden to existing sport_presets rows (defaults to true = hidden)
DO $$ BEGIN
  ALTER TABLE sport_presets ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS sport_presets_sport_idx ON sport_presets(sport);

-- ============================================================
-- Sport prefab presets (admin-managed reusable player groupings, per sport)
-- Distinct from sport_presets (full starting canvases). These appear in the
-- Slate Prefabs panel for every user of the matching sport when published.
-- See src/pages/SPORT_PREFAB_PRESETS.md for the design rationale.
-- ============================================================

CREATE TABLE IF NOT EXISTS sport_prefab_presets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport       TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT 'Prefab',
  prefab_data JSONB NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_hidden   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sport_prefab_presets_sport_idx ON sport_prefab_presets(sport);

-- ============================================================
-- Ownership columns for admin-managed assets (staff_admins.md feature).
-- created_by lets staff edit/delete their own creations without needing the
-- broader "manage others' resources" permission. NULL = legacy (owner-created).
-- ============================================================

DO $$ BEGIN
  ALTER TABLE platform_plays ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS platform_plays_created_by_idx ON platform_plays(created_by);

DO $$ BEGIN
  ALTER TABLE sport_presets ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS sport_presets_created_by_idx ON sport_presets(created_by);

DO $$ BEGIN
  ALTER TABLE sport_prefab_presets ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS sport_prefab_presets_created_by_idx ON sport_prefab_presets(created_by);

DO $$ BEGIN
  ALTER TABLE admin_prefabs ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS admin_prefabs_created_by_idx ON admin_prefabs(created_by);

-- ============================================================
-- Staff admins (scoped admin invites — see STAFF_ADMIN_PLAN.md)
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_admin_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_roles_name_unique
  ON staff_admin_roles(LOWER(name));

CREATE TABLE IF NOT EXISTS staff_admins (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  permissions  JSONB NOT NULL DEFAULT '{}'::jsonb,
  invited_by   UUID REFERENCES users(id),
  invited_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at  TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS staff_admin_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  token         TEXT NOT NULL UNIQUE,
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  accepted_at   TIMESTAMPTZ,
  accepted_user UUID REFERENCES users(id)
);

ALTER TABLE staff_admins
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES staff_admin_roles(id) ON DELETE SET NULL;

ALTER TABLE staff_admin_invites
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES staff_admin_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_staff_admins_role_id
  ON staff_admins(role_id);

CREATE INDEX IF NOT EXISTS idx_staff_invites_role_id
  ON staff_admin_invites(role_id);

CREATE INDEX IF NOT EXISTS idx_staff_invites_email
  ON staff_admin_invites(LOWER(email)) WHERE accepted_at IS NULL;

-- ============================================================
-- Admin audit log (mutation-only — staff actions + legacy admin)
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              BIGSERIAL PRIMARY KEY,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_auth_mode TEXT NOT NULL,         -- 'legacy_admin' | 'staff' | 'owner_jwt'
  actor_user_id   UUID,                  -- legacy_admin attributes to OWNER_USER_ID
  action          TEXT NOT NULL,         -- e.g. 'play.delete'
  target_type     TEXT,                  -- e.g. 'play'
  target_id       TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_actor
  ON admin_audit_log(actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action
  ON admin_audit_log(action, occurred_at DESC);

-- ============================================================
-- Recurring email campaigns (admin-only, owner-gated)
-- frequency_type: 'weekly' | 'monthly' | 'custom'
-- weekly:  frequency_day_of_week (0=Sun..6=Sat) + frequency_hour
-- monthly: frequency_day_of_month (1-31) + frequency_hour
-- custom:  frequency_interval_days + frequency_hour
-- All times are stored/computed in UTC.
-- ============================================================

CREATE TABLE IF NOT EXISTS recurring_email_campaigns (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  subject                 TEXT NOT NULL,
  subheader               TEXT NOT NULL DEFAULT '',
  body                    TEXT NOT NULL,
  youtube_url             TEXT NOT NULL DEFAULT '',
  gif_url                 TEXT NOT NULL DEFAULT '',
  audience_user_type      TEXT NOT NULL DEFAULT 'onboarded',
  audience_sport          TEXT NOT NULL DEFAULT '',
  frequency_type          TEXT NOT NULL,
  frequency_day_of_week   INT,
  frequency_day_of_month  INT,
  frequency_interval_days INT,
  frequency_hour          INT NOT NULL DEFAULT 9,
  active                  BOOLEAN NOT NULL DEFAULT true,
  next_send_at            TIMESTAMPTZ,
  last_sent_at            TIMESTAMPTZ,
  play_embed              JSONB DEFAULT NULL,
  send_count              INT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE recurring_email_campaigns ADD COLUMN IF NOT EXISTS play_embed JSONB DEFAULT NULL;
ALTER TABLE recurring_email_campaigns ADD COLUMN IF NOT EXISTS audience_roles TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_recurring_email_active_next
  ON recurring_email_campaigns(active, next_send_at)
  WHERE active = true;

-- ============================================================
-- In-app notifications (admin-authored, owner-gated)
-- A notification is an ordered list of blocks (text + question blocks).
-- Each send fans out one notification_recipients row per targeted user.
-- Recipients can answer embedded question blocks → notification_responses.
-- See src/pages/NOTIFICATIONS_PAGE.md for the end-to-end design.
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  subject         TEXT NOT NULL DEFAULT '',
  priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'critical')),
  blocks          JSONB NOT NULL DEFAULT '[]'::jsonb,
  audience        JSONB NOT NULL DEFAULT '{}'::jsonb,
  audience_label  TEXT NOT NULL DEFAULT '',
  is_test         BOOLEAN NOT NULL DEFAULT false,
  recipient_count INT NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS notification_recipients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS notification_recipients_user_idx
  ON notification_recipients(user_id, read_at);
CREATE INDEX IF NOT EXISTS notification_recipients_notif_idx
  ON notification_recipients(notification_id);

CREATE TABLE IF NOT EXISTS notification_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS notification_responses_notif_idx
  ON notification_responses(notification_id);

-- ============================================================
-- Feature Flags
-- Flags control access to features for targeted user segments.
-- Each flag has a global kill-switch (enabled) and an optional
-- array of rules (JSONB). All rules must match for a user to
-- see the feature (AND logic). An empty rules array = everyone.
--
-- Rule shapes:
--   { "type": "sport",               "values": ["football","rugby"] }
--   { "type": "team_role",           "roles": ["owner","coach","assistant_coach","player"] }
--   { "type": "user_type",           "values": ["onboarded","registered"] }
--   { "type": "rollout_percentage",  "value": 50 }   -- sticky per user via hash
--   { "type": "geolocation",         "countries": ["US"], "states": ["OH","CA"] }
-- ============================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  enabled     BOOLEAN NOT NULL DEFAULT true,
  rules       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the three initial flags (idempotent)
INSERT INTO feature_flags (name, description, enabled, rules)
VALUES
  ('in_app_notifications', 'In-app notification bell and popup toasts for end users', true, '[]'::jsonb),
  ('broadcast_emails',     'Admin broadcast email composer and send capability',      true, '[]'::jsonb),
  ('recurring_emails',     'Recurring email campaign scheduler',                      true, '[]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Outreach scraper (admin tool: scrape college athletic staff
-- directories → filter by sport/role → export CSV for outreach).
-- See OUTREACH_SCRAPER_PLAN.md / server/lib/outreachScraper/.
-- ============================================================

CREATE TABLE IF NOT EXISTS outreach_schools (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name      TEXT NOT NULL,
  short_name          TEXT,
  athletic_domain     TEXT NOT NULL UNIQUE,
  platform            TEXT NOT NULL DEFAULT 'unknown'
                        CHECK (platform IN
                          ('sidearm_legacy','sidearm_nextgen',
                           'prestosports','wordpress','custom','unknown')),
  staff_directory_url TEXT,
  division            TEXT,
  scrapeable          BOOLEAN NOT NULL DEFAULT FALSE,
  last_scraped_at     TIMESTAMPTZ,
  last_scrape_error   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outreach_scraped_staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES outreach_schools(id) ON DELETE CASCADE,
  name        TEXT,
  title       TEXT,
  sport       TEXT,
  role_tags   TEXT[] NOT NULL DEFAULT '{}',
  email       TEXT,
  phone       TEXT,
  source      TEXT NOT NULL DEFAULT 'scrape' CHECK (source IN ('scrape','manual')),
  scraped_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_staff_school ON outreach_scraped_staff(school_id);
CREATE INDEX IF NOT EXISTS idx_outreach_staff_sport  ON outreach_scraped_staff(sport);

-- Seed the Ohio target list (idempotent). Platforms verified live; see the plan
-- doc's appendix. scrapeable=false rows are manual-entry only in the UI.
INSERT INTO outreach_schools
  (canonical_name, short_name, athletic_domain, platform, staff_directory_url, division, scrapeable)
VALUES
  ('Ohio State University','Ohio State','ohiostatebuckeyes.com','sidearm_nextgen','https://ohiostatebuckeyes.com/staff-directory','FBS-B1G',TRUE),
  ('Ohio University','Ohio','ohiobobcats.com','sidearm_nextgen','https://ohiobobcats.com/staff-directory','MAC',TRUE),
  ('Bowling Green State University','BGSU','bgsufalcons.com','sidearm_nextgen','https://bgsufalcons.com/staff-directory','MAC',TRUE),
  ('Kent State University','Kent State','kentstatesports.com','sidearm_nextgen','https://kentstatesports.com/staff-directory','MAC',TRUE),
  ('Miami University (OH)','Miami (OH)','miamiredhawks.com','sidearm_nextgen','https://miamiredhawks.com/staff-directory','MAC',TRUE),
  ('University of Toledo','Toledo','utrockets.com','sidearm_nextgen','https://utrockets.com/staff-directory','MAC',TRUE),
  ('University of Akron','Akron','gozips.com','sidearm_nextgen','https://gozips.com/staff-directory','MAC',TRUE),
  ('University of Dayton','Dayton','daytonflyers.com','sidearm_legacy','https://daytonflyers.com/staff-directory','FCS',TRUE),
  ('Youngstown State University','Youngstown State','ysusports.com','sidearm_legacy','https://ysusports.com/staff-directory','FCS',TRUE),
  ('Ashland University','Ashland','goashlandeagles.com','sidearm_legacy','https://goashlandeagles.com/staff-directory','D2',TRUE),
  ('University of Findlay','Findlay','findlayoilers.com','sidearm_legacy','https://findlayoilers.com/staff-directory','D2',TRUE),
  ('Lake Erie College','Lake Erie','lakeeriestorm.com','sidearm_legacy','https://lakeeriestorm.com/staff-directory','D2',TRUE),
  ('Walsh University','Walsh','athletics.walsh.edu','sidearm_legacy','https://athletics.walsh.edu/staff-directory','D2',TRUE),
  ('Baldwin Wallace University','Baldwin Wallace','bwyellowjackets.com','sidearm_legacy','https://bwyellowjackets.com/staff-directory','D3',TRUE),
  ('Capital University','Capital','athletics.capital.edu','sidearm_legacy','https://athletics.capital.edu/staff-directory','D3',TRUE),
  ('Case Western Reserve University','Case Western','athletics.case.edu','sidearm_legacy','https://athletics.case.edu/staff-directory','D3',TRUE),
  ('John Carroll University','John Carroll','jcusports.com','sidearm_legacy','https://jcusports.com/staff-directory','D3',TRUE),
  ('Kenyon College','Kenyon','athletics.kenyon.edu','sidearm_legacy','https://athletics.kenyon.edu/staff-directory','D3',TRUE),
  ('University of Mount Union','Mount Union','athletics.mountunion.edu','sidearm_legacy','https://athletics.mountunion.edu/staff-directory','D3',TRUE),
  ('Ohio Wesleyan University','Ohio Wesleyan','battlingbishops.com','sidearm_legacy','https://battlingbishops.com/staff-directory','D3',TRUE),
  ('Otterbein University','Otterbein','otterbeincardinals.com','sidearm_legacy','https://otterbeincardinals.com/staff-directory','D3',TRUE),
  ('Wilmington College','Wilmington','wilmingtonquakers.com','sidearm_legacy','https://wilmingtonquakers.com/staff-directory','D3',TRUE),
  ('Central State University','Central State','centralstatesports.com','unknown','https://centralstatesports.com/staff-directory','D2',TRUE),
  ('Tiffin University','Tiffin','godragons.com','unknown','https://godragons.com/staff-directory','D2',TRUE),
  ('Defiance College','Defiance','defianceathletics.com','prestosports',NULL,'D3',FALSE),
  ('Marietta College','Marietta','pioneersathletics.com','prestosports',NULL,'D3',FALSE),
  ('Ohio Northern University','Ohio Northern','onusports.com','prestosports',NULL,'D3',FALSE),
  ('Wittenberg University','Wittenberg','wittenbergtigers.com','prestosports',NULL,'D3',FALSE),
  ('Hiram College','Hiram','hiramathletics.com','wordpress',NULL,'D3',FALSE),
  ('Muskingum University','Muskingum','muskies.com','wordpress',NULL,'D3',FALSE),
  ('Heidelberg University','Heidelberg','heidelberg.edu','unknown',NULL,'D3',FALSE),
  ('Ohio Dominican University','Ohio Dominican','ohiodominican.com','custom',NULL,'D2',FALSE),
  ('Notre Dame College','Notre Dame (OH)','ndcfalcons.com','custom',NULL,'D2',FALSE),
  ('Urbana University','Urbana','urbanaathletics.com','custom',NULL,'D2',FALSE)
ON CONFLICT (athletic_domain) DO NOTHING;
