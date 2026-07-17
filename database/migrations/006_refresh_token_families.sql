-- Lythaus MVP rotating refresh-session records.
-- Only JWT IDs are persisted; refresh token values are never stored.

CREATE TABLE IF NOT EXISTS refresh_tokens (
  jti UUID PRIMARY KEY,
  user_uuid UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_uuid
  ON refresh_tokens (user_uuid);

CREATE INDEX IF NOT EXISTS ix_refresh_tokens_expiry
  ON refresh_tokens (expires_at);

COMMENT ON TABLE refresh_tokens IS
  'Refresh-session JWT IDs for rotation, revocation, and reuse detection.';
