-- Lythaus email-verification v2.
-- PostgreSQL is authoritative; Cosmos receives an idempotent projection event.

BEGIN;

ALTER TABLE email_auth_tokens
  ADD COLUMN IF NOT EXISTS key_id TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS action_target TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

ALTER TABLE email_auth_tokens
  DROP CONSTRAINT IF EXISTS email_auth_tokens_action_target_check;

ALTER TABLE email_auth_tokens
  ADD CONSTRAINT email_auth_tokens_action_target_check
  CHECK (action_target IS NULL OR action_target IN ('production', 'preview'));

CREATE INDEX IF NOT EXISTS ix_email_auth_tokens_active_verify
  ON email_auth_tokens (user_id, created_at DESC)
  WHERE purpose = 'verify_email' AND used_at IS NULL AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS email_auth_deliveries (
  id UUID PRIMARY KEY,
  token_id UUID NOT NULL UNIQUE REFERENCES email_auth_tokens(id) ON DELETE CASCADE,
  message_class TEXT NOT NULL CHECK (message_class IN ('verification', 'password_reset')),
  recipient_ref TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('created', 'send_submitted', 'accepted', 'failed')),
  provider_message_id TEXT,
  terminal_state TEXT,
  terminal_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_email_auth_deliveries_provider_message
  ON email_auth_deliveries (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS email_auth_delivery_events (
  event_id TEXT PRIMARY KEY,
  provider_message_id TEXT NOT NULL,
  recipient_ref TEXT,
  state TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_email_auth_delivery_events_provider_message
  ON email_auth_delivery_events (provider_message_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS auth_email_projection_outbox (
  id UUID PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  dead_lettered_at TIMESTAMPTZ,
  last_error_class TEXT
);

CREATE INDEX IF NOT EXISTS ix_auth_email_projection_outbox_ready
  ON auth_email_projection_outbox (next_attempt_at, created_at)
  WHERE processed_at IS NULL AND dead_lettered_at IS NULL;

COMMENT ON TABLE email_auth_deliveries IS
  'Sanitized application send state; accepted is distinct from terminal delivery outcomes.';
COMMENT ON TABLE email_auth_delivery_events IS
  'Deduplicated ACS Event Grid delivery reports without raw recipient payloads.';
COMMENT ON TABLE auth_email_projection_outbox IS
  'Idempotent verified-user projection events; payloads contain no raw email or bearer token.';

COMMIT;
