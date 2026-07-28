-- Run after restoring a PlanetScale backup into a temporary PostgreSQL 17+ branch.
-- This script is intentionally assertion-only and contains no destructive SQL.

DO $$
DECLARE
  missing_extensions text;
  object_count integer;
BEGIN
  IF current_setting('server_version_num')::integer < 170000 THEN
    RAISE EXCEPTION 'restore requires PostgreSQL 17 or newer';
  END IF;

  SELECT string_agg(required_name, ', ' ORDER BY required_name)
    INTO missing_extensions
    FROM (VALUES ('pgcrypto'), ('pg_trgm'), ('unaccent')) AS required(required_name)
   WHERE NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = required_name);
  IF missing_extensions IS NOT NULL THEN
    RAISE EXCEPTION 'required extensions missing after restore: %', missing_extensions;
  END IF;

  SELECT count(*)
    INTO object_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname IN ('identity', 'content', 'social', 'feed', 'moderation', 'privacy', 'trust', 'media', 'editorial', 'system')
     AND c.relkind IN ('r', 'p', 'v', 'm');
  IF object_count < 74 THEN
    RAISE EXCEPTION 'restore has only % Lythaus schema objects; expected at least 74', object_count;
  END IF;

  IF to_regprocedure('privacy.reconcile_subject_data_locations(uuid)') IS NULL THEN
    RAISE EXCEPTION 'subject-data locator reconciliation function is missing after restore';
  END IF;
END $$;

SELECT current_setting('server_version') AS server_version;
SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto', 'pg_trgm', 'unaccent') ORDER BY extname;
SELECT nspname AS schema_name
  FROM pg_namespace
 WHERE nspname IN ('identity', 'content', 'social', 'feed', 'moderation', 'privacy', 'trust', 'media', 'editorial', 'system')
 ORDER BY nspname;
