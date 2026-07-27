SELECT current_setting('server_version') AS postgres_version;
SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'pg_trgm', 'unaccent', 'pgcrypto') ORDER BY extname;
SELECT nspname FROM pg_namespace WHERE nspname IN ('identity', 'content', 'social', 'feed', 'moderation', 'privacy', 'trust', 'media', 'editorial', 'system') ORDER BY nspname;
SELECT to_regclass('system.outbox_events') AS outbox_table;
SELECT to_regclass('privacy.subject_data_locations') AS subject_locator;
SELECT to_regclass('media.upload_sessions') AS upload_sessions;
SELECT to_regclass('identity.email_verification_tokens') AS email_verification_tokens;
SELECT to_regclass('identity.password_reset_tokens') AS password_reset_tokens;
SELECT to_regclass('identity.users') AS users;
SELECT to_regclass('social.profiles') AS profiles;
SELECT to_regclass('content.content_declarations') AS content_declarations;
SELECT to_regclass('feed.notifications') AS notifications;
SELECT to_regclass('moderation.enforcement_events') AS enforcement_events;
SELECT to_regclass('trust.source_citations') AS source_citations;
SELECT to_regclass('media.storage_ledgers') AS storage_ledgers;
SELECT to_regclass('editorial.applications') AS editorial_applications;
SELECT to_regclass('system.feature_flags') AS feature_flags;
SELECT uuidv7() IS NOT NULL AS uuidv7_available;
SELECT column_name FROM information_schema.columns
 WHERE table_schema = 'identity' AND table_name = 'users' AND column_name = 'token_version';
SELECT check_clause FROM information_schema.check_constraints
 WHERE constraint_name = 'admin_memberships_role_check';
