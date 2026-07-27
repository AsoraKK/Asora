import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDir = path.join(root, 'database', 'planetscale', 'migrations');
const requiredMigrations = ['0000_preflight.sql', '0001_extensions_and_schemas.sql', '0002_core_tables.sql', '0003_domain_extensions.sql', '0004_launch_contract.sql', '0005_auth_revocation.sql', '0006_admin_role_expansion.sql'];
const requiredSeeds = ['0001_feature_flags.sql'];
const requiredRecoveryFiles = ['restore-verify.sql'];
const requiredSchemas = ['identity', 'content', 'social', 'feed', 'moderation', 'privacy', 'trust', 'media', 'editorial', 'system'];
const requiredTables = [
  'identity.users', 'identity.provider_links', 'identity.handles', 'identity.email_credentials', 'identity.refresh_token_families',
  'identity.auth_sessions', 'identity.consent_records', 'identity.user_region_preferences', 'identity.admin_memberships',
  'identity.email_verification_tokens', 'identity.password_reset_tokens', 'identity.account_events',
  'content.places', 'content.posts', 'content.post_locations', 'content.comments', 'content.content_declarations',
  'social.follows', 'social.reactions', 'social.profiles', 'social.profile_private_fields', 'social.blocks', 'social.mutes',
  'social.bookmarks', 'social.custom_feeds', 'social.custom_feed_rules',
  'feed.user_inbox', 'feed.author_outbox', 'feed.discovery_candidates', 'feed.feed_events', 'feed.topic_memberships',
  'feed.regional_memberships', 'feed.notifications',
  'moderation.content_flags', 'moderation.cases', 'moderation.detector_runs', 'moderation.decisions', 'moderation.appeals',
  'moderation.appeal_votes', 'moderation.policy_versions', 'moderation.enforcement_events',
  'privacy.requests', 'privacy.request_events', 'privacy.legal_holds', 'privacy.subject_data_locations',
  'privacy.deletion_tombstones', 'privacy.export_manifests', 'privacy.retention_rules',
  'trust.provenance_events', 'trust.human_contribution_events', 'trust.reputation_events', 'trust.reputation_balances',
  'trust.source_citations', 'trust.accountability_signals', 'trust.policy_versions',
  'media.upload_sessions', 'media.storage_ledger', 'media.objects', 'media.variants', 'media.moderation_results',
  'media.ownership', 'media.deletion_events',
  'editorial.memberships', 'editorial.membership_events', 'editorial.applications', 'editorial.portfolio_items',
  'editorial.peer_reviews', 'editorial.publications',
  'system.outbox_events', 'system.consumer_inbox', 'system.idempotency_keys', 'system.audit_events', 'system.feature_flags',
  'system.schema_migrations',
];
const requiredViews = ['media.storage_ledgers'];
const failures = [];
for (const file of requiredMigrations) {
  if (!fs.existsSync(path.join(migrationDir, file))) failures.push(`missing migration: ${file}`);
}
for (const file of requiredSeeds) {
  if (!fs.existsSync(path.join(root, 'database', 'planetscale', 'seeds', file))) failures.push(`missing seed: ${file}`);
}
for (const file of requiredRecoveryFiles) {
  if (!fs.existsSync(path.join(root, 'database', 'planetscale', 'recovery', file))) failures.push(`missing recovery script: ${file}`);
}
const source = requiredMigrations.map((file) => fs.readFileSync(path.join(migrationDir, file), 'utf8')).join('\n');
for (const schema of requiredSchemas) {
  if (!new RegExp(`CREATE SCHEMA (IF NOT EXISTS )?${schema}\\b`, 'i').test(source)) failures.push(`missing schema: ${schema}`);
}
for (const table of requiredTables) {
  const [schema, name] = table.split('.');
  if (!new RegExp(`CREATE TABLE (IF NOT EXISTS )?${schema.replace('.', '\\.') }\\.${name}\\b`, 'i').test(source)) failures.push(`missing table: ${table}`);
}
for (const view of requiredViews) {
  const [schema, name] = view.split('.');
  if (!new RegExp(`CREATE VIEW ${schema}\\.${name}\\b`, 'i').test(source)) failures.push(`missing view: ${view}`);
}
for (const required of ['postgis', 'pg_trgm', 'unaccent', 'pgcrypto', 'uuidv7']) {
  if (!source.toLowerCase().includes(required.toLowerCase())) failures.push(`missing extension/function reference: ${required}`);
}
if (!/server_version_num.*180000/s.test(source)) failures.push('PostgreSQL 18 preflight missing');
if (/password|token/i.test(source) && /plaintext|secret_value/i.test(source)) failures.push('migration appears to contain secret material');
if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${requiredMigrations.length} PlanetScale migration files and ${requiredTables.length} launch tables.`);
}
