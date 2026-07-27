-- Account-level access-token revocation. Increment token_version to invalidate
-- otherwise-valid access tokens without exposing signing material to SQL.
ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_token_version_positive'
      AND conrelid = 'identity.users'::regclass
  ) THEN
    ALTER TABLE identity.users
      ADD CONSTRAINT users_token_version_positive CHECK (token_version > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_token_version_idx
  ON identity.users (id, token_version, status);
