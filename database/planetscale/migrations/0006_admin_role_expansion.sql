ALTER TABLE identity.admin_memberships
  DROP CONSTRAINT IF EXISTS admin_memberships_role_check;

ALTER TABLE identity.admin_memberships
  ADD CONSTRAINT admin_memberships_role_check
  CHECK (role IN ('moderator', 'privacy_operator', 'editorial', 'operations', 'owner', 'administrator'));
