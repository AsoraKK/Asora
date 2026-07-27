-- Provision these login roles through PlanetScale's role-management workflow.
-- Do not commit passwords or use the default postgres role from Workers.
--
-- lythaus_runtime, lythaus_admin, lythaus_jobs and lythaus_privacy must be
-- non-owning login roles. lythaus_migrations is the only DDL-capable role.

ALTER ROLE lythaus_runtime NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE lythaus_admin NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE lythaus_jobs NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE lythaus_privacy NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE lythaus_migrations NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

REVOKE ALL ON ALL TABLES IN SCHEMA identity, content, social, feed, moderation, privacy, trust, media, editorial, system FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA identity, content, social, feed, moderation, privacy, trust, media, editorial, system FROM PUBLIC;

GRANT CONNECT ON DATABASE postgres TO lythaus_runtime, lythaus_admin, lythaus_jobs, lythaus_privacy, lythaus_migrations;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA identity, content, social, feed, moderation, privacy, trust, media, editorial, system TO lythaus_runtime, lythaus_admin, lythaus_jobs, lythaus_privacy;

GRANT USAGE ON SCHEMA identity, content, social, feed, moderation, trust, media TO lythaus_runtime;
GRANT USAGE ON SCHEMA privacy TO lythaus_runtime;
GRANT SELECT, INSERT, UPDATE ON identity.users, identity.handles, identity.email_credentials, identity.auth_sessions, identity.refresh_token_families, identity.provider_links, identity.consent_records, identity.user_region_preferences, identity.email_verification_tokens, identity.password_reset_tokens, identity.account_events TO lythaus_runtime;
GRANT SELECT, INSERT, UPDATE ON content.posts, content.comments, content.content_declarations, content.places, content.post_locations TO lythaus_runtime;
GRANT SELECT, INSERT, DELETE ON social.follows, social.reactions, social.blocks, social.mutes, social.bookmarks TO lythaus_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON social.profiles, social.profile_private_fields, social.custom_feeds, social.custom_feed_rules TO lythaus_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON feed.user_inbox, feed.feed_events, feed.notifications TO lythaus_runtime;
GRANT SELECT, INSERT ON media.upload_sessions, media.objects, media.storage_ledger TO lythaus_runtime;
GRANT SELECT, INSERT ON moderation.content_flags, moderation.cases, moderation.appeals TO lythaus_runtime;
GRANT SELECT, INSERT ON system.outbox_events, system.idempotency_keys TO lythaus_runtime;
GRANT EXECUTE ON FUNCTION privacy.set_retention_rule(uuid, text, interval, text) TO lythaus_runtime;

GRANT USAGE ON SCHEMA identity, content, moderation, trust, editorial, system TO lythaus_admin;
GRANT SELECT, UPDATE ON identity.users TO lythaus_admin;
GRANT SELECT ON identity.handles, identity.admin_memberships TO lythaus_admin;
GRANT SELECT, INSERT, UPDATE ON identity.auth_sessions, identity.refresh_token_families, identity.account_events TO lythaus_admin;
GRANT SELECT, INSERT, UPDATE ON content.posts, content.comments, content.content_declarations, moderation.content_flags, moderation.cases, moderation.decisions, moderation.detector_runs, moderation.appeals, moderation.appeal_votes, moderation.enforcement_events, trust.provenance_events, trust.human_contribution_events, trust.reputation_events, trust.source_citations, trust.accountability_signals, editorial.memberships, editorial.membership_events, editorial.applications, editorial.portfolio_items, editorial.peer_reviews, editorial.publications TO lythaus_admin;
GRANT SELECT, INSERT ON system.audit_events TO lythaus_admin;

GRANT USAGE ON SCHEMA content, moderation, feed, social, trust, media, system TO lythaus_jobs;
GRANT SELECT, INSERT, UPDATE ON content.posts, content.comments, content.content_declarations, moderation.cases, moderation.decisions, moderation.detector_runs, moderation.appeals, moderation.enforcement_events, feed.author_outbox, feed.discovery_candidates, feed.user_inbox, feed.feed_events, feed.topic_memberships, feed.regional_memberships, feed.notifications, media.upload_sessions, media.objects, media.storage_ledger, media.variants, media.moderation_results, media.deletion_events, system.outbox_events, system.consumer_inbox TO lythaus_jobs;
GRANT INSERT ON trust.provenance_events, trust.human_contribution_events TO lythaus_jobs;
GRANT SELECT, DELETE ON social.follows, social.reactions, social.bookmarks TO lythaus_jobs;
GRANT SELECT, INSERT ON system.audit_events TO lythaus_jobs;

GRANT USAGE ON SCHEMA privacy, media, identity, social, system TO lythaus_privacy;
GRANT SELECT, INSERT, UPDATE ON privacy.requests, privacy.request_events, privacy.legal_holds, privacy.retention_rules, privacy.subject_data_locations, privacy.deletion_tombstones, privacy.export_manifests, media.objects, media.storage_ledger, media.ownership, media.deletion_events, identity.users, identity.account_events, identity.auth_sessions, identity.refresh_token_families TO lythaus_privacy;
GRANT DELETE ON identity.provider_links, identity.email_credentials, identity.handles, identity.auth_sessions, identity.refresh_token_families, identity.email_verification_tokens, identity.password_reset_tokens TO lythaus_privacy;
GRANT SELECT, DELETE ON social.profile_private_fields TO lythaus_privacy;
GRANT SELECT, INSERT ON system.audit_events TO lythaus_privacy;

GRANT USAGE, CREATE ON SCHEMA identity, content, social, feed, moderation, privacy, trust, media, editorial, system TO lythaus_migrations;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA identity, content, social, feed, moderation, privacy, trust, media, editorial, system TO lythaus_migrations;

ALTER DEFAULT PRIVILEGES FOR ROLE lythaus_migrations REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE lythaus_migrations REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE lythaus_migrations REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE lythaus_migrations IN SCHEMA identity, content, social, feed, moderation, privacy, trust, media, editorial, system GRANT USAGE, SELECT ON SEQUENCES TO lythaus_runtime, lythaus_admin, lythaus_jobs, lythaus_privacy;
REVOKE CREATE, USAGE ON SCHEMA privacy FROM lythaus_runtime, lythaus_admin, lythaus_jobs;
REVOKE CREATE, CREATEROLE, CREATEDB ON DATABASE postgres FROM lythaus_runtime, lythaus_admin, lythaus_jobs, lythaus_privacy;

-- Runtime roles must not own database objects or receive CREATE/CREATEROLE/CREATEDB.
-- Verify with database/planetscale/verification/role-negative-tests.sql.
