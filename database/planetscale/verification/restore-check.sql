-- Run against a restored temporary branch after extensions and grants are reapplied.
SELECT current_setting('server_version') AS server_version;
SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'pg_trgm', 'unaccent', 'pgcrypto') ORDER BY extname;
SELECT COUNT(*) AS schema_count
  FROM pg_namespace
 WHERE nspname IN ('identity', 'content', 'social', 'feed', 'moderation', 'privacy', 'trust', 'media', 'editorial', 'system');
SELECT COUNT(*) AS table_count
  FROM information_schema.tables
 WHERE table_schema IN ('identity', 'content', 'social', 'feed', 'moderation', 'privacy', 'trust', 'media', 'editorial', 'system')
   AND table_type = 'BASE TABLE';
SELECT to_regclass('system.outbox_events') AS outbox,
       to_regclass('privacy.subject_data_locations') AS subject_locator,
       to_regclass('media.upload_sessions') AS upload_sessions;
SELECT to_regclass('identity.password_reset_tokens') AS password_reset_tokens;
SELECT column_name FROM information_schema.columns
 WHERE table_schema = 'identity' AND table_name = 'users' AND column_name = 'token_version';
SELECT uuidv7() IS NOT NULL AS uuidv7_available;
