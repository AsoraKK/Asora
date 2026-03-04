-- PostgreSQL schema definitions for Asora backend v1 identity tables.
-- UUIDs rely on uuid_generate_v7() for lexicographically ordered identifiers. Provide the function via an extension (e.g., pg-uuid-v7) or replace with another ordered UUID generator.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The canonical users table combines identity, tier, and reputation. Secondary emails are optional for account recovery.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  primary_email TEXT NOT NULL,
  secondary_emails TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  roles TEXT[] NOT NULL DEFAULT ARRAY['user']::TEXT[],
  tier TEXT NOT NULL DEFAULT 'free',
  reputation_score INT NOT NULL DEFAULT 0 CHECK (reputation_score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_primary_email ON users (primary_email);
CREATE INDEX IF NOT EXISTS ix_users_roles ON users (roles);
CREATE INDEX IF NOT EXISTS ix_users_tier ON users (tier);
CREATE INDEX IF NOT EXISTS ix_users_reputation_score ON users (reputation_score);
CREATE INDEX IF NOT EXISTS ix_users_created_at ON users (created_at);
CREATE INDEX IF NOT EXISTS ix_users_secondary_emails ON users USING GIN (secondary_emails);

COMMENT ON TABLE users IS 'Primary identity store; identity lives here while profile projections remain in Cosmos.';
COMMENT ON COLUMN users.primary_email IS 'Canonical email address used for authentication and invites.';
COMMENT ON COLUMN users.secondary_emails IS 'Additional verified emails for notifications/magic links.';
COMMENT ON COLUMN users.roles IS 'Set-based roles; moderators/journalists receive placement in the feed.';
COMMENT ON COLUMN users.tier IS 'Subscription tier that drives rate limits, custom feed counts, and access.';
COMMENT ON COLUMN users.reputation_score IS 'Rolling reputation metric; used for promoting high-rep contributions.';

-- Provider links derive an OAuth/sub identity to the canonical user ID.
CREATE TABLE IF NOT EXISTS provider_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_sub TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_provider_links_provider_sub ON provider_links (provider, provider_sub);
CREATE INDEX IF NOT EXISTS ix_provider_links_user_id ON provider_links (user_id);
COMMENT ON TABLE provider_links IS 'Maps third-party issuers to canonical users for token exchange.';

-- v2: Snapshots of reputation + tier over time; enables history and rollback analysis.
CREATE TABLE IF NOT EXISTS reputation_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id UUID NOT NULL REFERENCES users (id),
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_xp BIGINT NOT NULL DEFAULT 0,
  tier TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  CONSTRAINT uq_rep_snapshots_user_snapshot UNIQUE (user_id, snapshot_at)
);

CREATE INDEX IF NOT EXISTS ix_rep_snapshots_user_at ON reputation_snapshots (user_id, snapshot_at DESC);
COMMENT ON TABLE reputation_snapshots IS 'v2 table supporting XP/tier history for reputation dashboards.';

-- v2: Journalist verification workflow metadata.
CREATE TABLE IF NOT EXISTS journalist_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES users (id),
  reviewed_at TIMESTAMPTZ,
  assets JSONB NOT NULL DEFAULT '{}'::JSONB,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS ix_journalist_verifications_status ON journalist_verifications (status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_journalist_verifications_user ON journalist_verifications (user_id);
COMMENT ON TABLE journalist_verifications IS 'v2 table for journalist onboarding decisions and artifacts.';
