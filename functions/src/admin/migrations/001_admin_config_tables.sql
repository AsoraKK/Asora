-- Admin Configuration Tables Migration
-- Creates admin_config and admin_audit_log tables for the Admin API

-- ============================================================================
-- Table: admin_config
-- Single-row configuration store with optimistic locking via version field
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_config (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  version         INTEGER NOT NULL DEFAULT 1,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      TEXT NOT NULL DEFAULT 'system',
  payload_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Enforce single row constraint
  CONSTRAINT admin_config_single_row CHECK (id = 1)
);

-- Insert seed row if not exists (idempotent)
INSERT INTO admin_config (id, version, updated_at, updated_by, payload_json)
VALUES (1, 1, NOW(), 'system', '{"schemaVersion": 1}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Table: admin_audit_log
-- Append-only audit trail for all admin configuration changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              BIGSERIAL PRIMARY KEY,
  ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor           TEXT NOT NULL,
  action          TEXT NOT NULL,
  resource        TEXT NOT NULL,
  before_json     JSONB,
  after_json      JSONB
);

-- Index for efficient recent-first queries (GET /admin/audit?limit=...)
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_ts_desc ON admin_audit_log (ts DESC);

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE admin_config IS 'Single-row admin configuration store with versioned updates';
COMMENT ON COLUMN admin_config.version IS 'Monotonically increasing version for optimistic locking';
COMMENT ON COLUMN admin_config.payload_json IS 'Configuration payload (schemaVersion + dynamic fields)';

COMMENT ON TABLE admin_audit_log IS 'Append-only audit log for admin configuration changes';
COMMENT ON COLUMN admin_audit_log.actor IS 'Email/identifier of the user who made the change';
COMMENT ON COLUMN admin_audit_log.action IS 'Action type: create, update, delete';
COMMENT ON COLUMN admin_audit_log.resource IS 'Resource identifier (e.g., admin_config)';
COMMENT ON COLUMN admin_audit_log.before_json IS 'State before change (null for create)';
COMMENT ON COLUMN admin_audit_log.after_json IS 'State after change (null for delete)';
