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
  archived_at TIMESTAMPTZ
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
