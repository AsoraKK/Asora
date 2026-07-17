-- Lythaus MVP Google identity mapping.
-- Provider subjects are never public Lythaus user IDs. The service supplies
-- UUIDv7 link IDs, so this migration does not depend on a database UUIDv7
-- extension.

CREATE TABLE IF NOT EXISTS provider_links (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_sub TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_provider_links_provider_sub
  ON provider_links (provider, provider_sub);

CREATE INDEX IF NOT EXISTS ix_provider_links_user_id
  ON provider_links (user_id);

COMMENT ON TABLE provider_links IS
  'Maps third-party provider subjects to canonical Lythaus users.';
