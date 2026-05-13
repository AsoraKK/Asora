-- Migration 002: Fix users tier constraint
-- ─────────────────────────────────────────────────────────────────────────────
-- The original CREATE TABLE statement used 'enterprise' as a tier value, but
-- all application code (TypeScript UserTier type, JWT claims, access-guard)
-- uses 'black' and 'admin'.  This migration aligns the DB constraint with the
-- application type.
--
-- Safe to run on an existing database; no row data is affected because no rows
-- should have tier='enterprise' in production.  If rows exist with that value,
-- update them first:
--   UPDATE users SET tier = 'black' WHERE tier = 'enterprise';
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Drop the old constraint (name may differ; adjust if needed)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tier_check;

-- Re-add the corrected constraint matching TypeScript UserTier
ALTER TABLE users
  ADD CONSTRAINT users_tier_check
  CHECK (tier IN ('free', 'premium', 'black', 'admin'));

COMMIT;
