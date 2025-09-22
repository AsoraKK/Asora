-- Asora Target Schema Migration
-- Aligns with canonical PostgreSQL + projection Cosmos architecture
-- Run this to upgrade from legacy schema to target state
-- Outbox pattern for reliable event propagation
CREATE TABLE IF NOT EXISTS outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate events
    CONSTRAINT unique_outbox_event UNIQUE (aggregate_type, aggregate_id, event_type, created_at)
);

-- Index for efficient worker queries with FOR UPDATE SKIP LOCKED
CREATE INDEX IF NOT EXISTS idx_outbox_worker_query 
ON outbox (processed_at, next_retry_at, retry_count) 
WHERE processed_at IS NULL; Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- 1) Users: Add UUID primary key with pgcrypto
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_uuid UUID DEFAULT gen_random_uuid();

-- Backfill and enforce non-null
UPDATE users SET user_uuid = gen_random_uuid() WHERE user_uuid IS NULL;
ALTER TABLE users ALTER COLUMN user_uuid SET NOT NULL;

-- Make user_uuid the primary key (keep old id for now)
ALTER TABLE users ADD CONSTRAINT users_pkey_uuid PRIMARY KEY (user_uuid);

-- Email hardening with proper index recreation
ALTER TABLE users ALTER COLUMN email TYPE citext USING email::citext;
DROP INDEX IF EXISTS idx_users_email;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unq ON users(email);

-- Keep other existing indexes but update them for performance
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_tier;
DROP INDEX IF EXISTS idx_users_created_at;
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_tier_idx ON users(tier);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at);

-- 2) Auth canonical tables
CREATE TABLE IF NOT EXISTS auth_identities (
  user_uuid UUID REFERENCES users(user_uuid) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, subject)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  jti UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid UUID NOT NULL REFERENCES users(user_uuid) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens(user_uuid);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_idx ON refresh_tokens(expires_at);

-- 3) Profiles canonical table
CREATE TABLE IF NOT EXISTS profiles (
  user_uuid UUID PRIMARY KEY REFERENCES users(user_uuid) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profiles_extras_gin ON profiles USING GIN (extras);
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON profiles(updated_at);

-- 4) Social graph canonical tables
CREATE TABLE IF NOT EXISTS follows (
  follower_uuid UUID REFERENCES users(user_uuid) ON DELETE CASCADE,
  followee_uuid UUID REFERENCES users(user_uuid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_uuid, followee_uuid),
  CHECK (follower_uuid <> followee_uuid)
);
CREATE INDEX IF NOT EXISTS follows_followee_idx ON follows(followee_uuid);
CREATE INDEX IF NOT EXISTS follows_created_at_idx ON follows(created_at);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_uuid UUID REFERENCES users(user_uuid) ON DELETE CASCADE,
  blocked_uuid UUID REFERENCES users(user_uuid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_uuid, blocked_uuid),
  CHECK (blocker_uuid <> blocked_uuid)
);
CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON blocks(blocked_uuid);

CREATE TABLE IF NOT EXISTS mutes (
  muter_uuid UUID REFERENCES users(user_uuid) ON DELETE CASCADE,
  muted_uuid UUID REFERENCES users(user_uuid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (muter_uuid, muted_uuid),
  CHECK (muter_uuid <> muted_uuid)
);
CREATE INDEX IF NOT EXISTS mutes_muted_idx ON mutes(muted_uuid);

-- 5) Moderation canonical tables
CREATE TABLE IF NOT EXISTS moderation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_ref TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'profile')),
  state TEXT NOT NULL CHECK (state IN ('open', 'under_review', 'resolved', 'escalated')),
  reason TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opened_by_uuid UUID REFERENCES users(user_uuid),
  assigned_to_uuid UUID REFERENCES users(user_uuid),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS moderation_cases_state_idx ON moderation_cases(state);
CREATE INDEX IF NOT EXISTS moderation_cases_opened_at_idx ON moderation_cases(opened_at);
CREATE INDEX IF NOT EXISTS moderation_cases_assigned_to_idx ON moderation_cases(assigned_to_uuid);

CREATE TABLE IF NOT EXISTS appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES moderation_cases(id) ON DELETE CASCADE,
  user_uuid UUID NOT NULL REFERENCES users(user_uuid) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT NOT NULL,
  response TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decision_at TIMESTAMPTZ,
  reviewed_by_uuid UUID REFERENCES users(user_uuid)
);
CREATE INDEX IF NOT EXISTS appeals_case_id_idx ON appeals(case_id);
CREATE INDEX IF NOT EXISTS appeals_user_uuid_idx ON appeals(user_uuid);
CREATE INDEX IF NOT EXISTS appeals_status_idx ON appeals(status);

-- 6) Audit canonical table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_uuid UUID REFERENCES users(user_uuid),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log(actor_uuid);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log(action);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS audit_log_target_idx ON audit_log(target_type, target_id);

-- 7) Admin/search mirror for posts
CREATE TABLE IF NOT EXISTS posts_admin_mirror (
  post_uuid UUID PRIMARY KEY,
  author_uuid UUID REFERENCES users(user_uuid),
  text TEXT,
  tags TEXT[],
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  fts tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);
CREATE INDEX IF NOT EXISTS posts_admin_mirror_fts ON posts_admin_mirror USING GIN (fts);
CREATE INDEX IF NOT EXISTS posts_admin_mirror_author_idx ON posts_admin_mirror(author_uuid);
CREATE INDEX IF NOT EXISTS posts_admin_mirror_status_idx ON posts_admin_mirror(status);
CREATE INDEX IF NOT EXISTS posts_admin_mirror_created_at_idx ON posts_admin_mirror(created_at DESC);

-- 8) Outbox for change propagation
CREATE TABLE IF NOT EXISTS outbox (
  id BIGSERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  key TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS outbox_unprocessed ON outbox (created_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS outbox_topic_idx ON outbox(topic);

-- Comments
COMMENT ON TABLE users IS 'Core user identity (canonical store)';
COMMENT ON COLUMN users.user_uuid IS 'Primary UUID identifier for cross-system references';
COMMENT ON COLUMN users.id IS 'Legacy integer ID (remove after migration)';

COMMENT ON TABLE auth_identities IS 'OAuth provider mappings (canonical store)';
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens (canonical store)';
COMMENT ON TABLE profiles IS 'User profile data (canonical store)';
COMMENT ON TABLE follows IS 'Social graph following relationships (canonical store)';
COMMENT ON TABLE blocks IS 'User blocking relationships (canonical store)';
COMMENT ON TABLE mutes IS 'User muting relationships (canonical store)';
COMMENT ON TABLE moderation_cases IS 'Content moderation cases (canonical store)';
COMMENT ON TABLE appeals IS 'Moderation appeal requests (canonical store)';
COMMENT ON TABLE audit_log IS 'System audit trail (canonical store)';
COMMENT ON TABLE posts_admin_mirror IS 'Post search/admin mirror (synchronized from Cosmos)';
COMMENT ON TABLE outbox IS 'Change event outbox for Cosmos projections';

COMMIT;

-- ============================================
-- Production Hardening: Constraints and RLS
-- ============================================

-- Enable RLS (Row Level Security) for production data isolation
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts_admin_mirror ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own data
CREATE POLICY user_isolation ON users
  FOR ALL
  TO authenticated_user
  USING (user_uuid = current_setting('app.current_user_id')::UUID);

-- RLS Policy: Users can read public profiles but only update their own
CREATE POLICY profile_read_public ON profiles
  FOR SELECT
  TO authenticated_user
  USING (privacy_level = 'public' OR user_uuid = current_setting('app.current_user_id')::UUID);

CREATE POLICY profile_update_own ON profiles
  FOR UPDATE
  TO authenticated_user
  USING (user_uuid = current_setting('app.current_user_id')::UUID);

-- Additional constraints for data integrity
ALTER TABLE auth_identities 
  ADD CONSTRAINT check_provider_valid 
  CHECK (provider IN ('google', 'apple', 'github', 'email'));

ALTER TABLE profiles
  ADD CONSTRAINT check_privacy_level_valid
  CHECK (privacy_level IN ('public', 'followers', 'private')),
  ADD CONSTRAINT check_display_name_length
  CHECK (LENGTH(display_name) BETWEEN 1 AND 50),
  ADD CONSTRAINT check_bio_length
  CHECK (LENGTH(bio) <= 500);

ALTER TABLE follows
  ADD CONSTRAINT check_not_self_follow
  CHECK (follower_uuid != followee_uuid);

ALTER TABLE blocks  
  ADD CONSTRAINT check_not_self_block
  CHECK (blocker_uuid != blocked_uuid);

ALTER TABLE mutes
  ADD CONSTRAINT check_not_self_mute
  CHECK (muter_uuid != muted_uuid);

ALTER TABLE moderation_cases
  ADD CONSTRAINT check_status_valid
  CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  ADD CONSTRAINT check_severity_valid
  CHECK (severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE appeals
  ADD CONSTRAINT check_appeal_status_valid
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Verification queries
SELECT 'users' as table_name, count(*) as row_count FROM users
UNION ALL
SELECT 'auth_identities', count(*) FROM auth_identities
UNION ALL
SELECT 'profiles', count(*) FROM profiles
UNION ALL
SELECT 'follows', count(*) FROM follows
UNION ALL
SELECT 'moderation_cases', count(*) FROM moderation_cases
UNION ALL
SELECT 'outbox', count(*) FROM outbox;

-- Show new structure
\d users