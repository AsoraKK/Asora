-- PostGIS is a required launch capability, but PlanetScale may temporarily
-- exclude it from the extension allowlist. The explicit install script lives
-- in extensions/postgis.sql and must be applied before geography features are
-- enabled. Development can continue with the documented JSON boundary
-- fallback while the provider capability remains unavailable.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    RAISE NOTICE 'PostGIS is not installed; geography features remain blocked and content.places uses the JSON boundary fallback';
  END IF;
END
$$;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS social;
CREATE SCHEMA IF NOT EXISTS feed;
CREATE SCHEMA IF NOT EXISTS moderation;
CREATE SCHEMA IF NOT EXISTS privacy;
CREATE SCHEMA IF NOT EXISTS trust;
CREATE SCHEMA IF NOT EXISTS media;
CREATE SCHEMA IF NOT EXISTS editorial;
CREATE SCHEMA IF NOT EXISTS system;

COMMENT ON SCHEMA identity IS 'Authentication, identity and account state';
COMMENT ON SCHEMA content IS 'Authoritative posts, comments and places';
COMMENT ON SCHEMA privacy IS 'Restricted DSR, retention and legal-hold state';
COMMENT ON SCHEMA system IS 'Transactional outbox, idempotency and audit events';
