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
  ('landing.visualize.womens_lacrosse', 'Womens Lacrosse — Visualize',         'womens_lacrosse')
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
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- Drop old single-preset table (was keyed by sport TEXT PRIMARY KEY)
DROP TABLE IF EXISTS sport_presets;

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
