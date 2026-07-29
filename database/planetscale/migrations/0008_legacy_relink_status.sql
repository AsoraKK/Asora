ALTER TABLE identity.users
  DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE identity.users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'suspended', 'deleted', 'locked', 'relink_required'));

COMMENT ON COLUMN identity.users.status IS
  'relink_required preserves a legacy account without fabricating or trusting an unverified identity-provider mapping.';
