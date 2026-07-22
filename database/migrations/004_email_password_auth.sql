-- Lythaus MVP email/password authentication.
-- Tokens are never stored in plaintext; only HMAC digests are persisted.

CREATE TABLE IF NOT EXISTS email_auth_credentials (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_auth_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  token_digest TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_email_auth_tokens_user_purpose
  ON email_auth_tokens (user_id, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_email_auth_tokens_expiry
  ON email_auth_tokens (expires_at)
  WHERE used_at IS NULL;

COMMENT ON TABLE email_auth_credentials IS
  'Argon2id email/password credentials for verified Lythaus accounts.';
COMMENT ON TABLE email_auth_tokens IS
  'Single-use HMAC digests for email verification and password reset.';
