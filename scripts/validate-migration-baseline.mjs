import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDir = path.join(root, 'database', 'planetscale', 'migrations');
const requiredMigrations = ['0000_preflight.sql', '0001_extensions_and_schemas.sql', '0002_core_tables.sql', '0003_domain_extensions.sql', '0004_launch_contract.sql'];
const requiredSeeds = ['0001_feature_flags.sql'];
const requiredTables = [
  'identity.users', 'identity.email_verification_tokens', 'identity.password_reset_tokens', 'content.posts', 'content.content_declarations',
  'social.profiles', 'social.follows', 'feed.user_inbox', 'feed.notifications',
  'moderation.detector_runs', 'moderation.enforcement_events', 'privacy.subject_data_locations',
  'trust.provenance_events', 'media.upload_sessions', 'media.storage_ledger',
  'editorial.applications', 'system.outbox_events', 'system.consumer_inbox', 'system.idempotency_keys',
];
const failures = [];
for (const file of requiredMigrations) {
  if (!fs.existsSync(path.join(migrationDir, file))) failures.push(`missing migration: ${file}`);
}
for (const file of requiredSeeds) {
  if (!fs.existsSync(path.join(root, 'database', 'planetscale', 'seeds', file))) failures.push(`missing seed: ${file}`);
}
const source = requiredMigrations.map((file) => fs.readFileSync(path.join(migrationDir, file), 'utf8')).join('\n');
for (const table of requiredTables) {
  const [schema, name] = table.split('.');
  if (!new RegExp(`CREATE TABLE (IF NOT EXISTS )?${schema.replace('.', '\\.') }\\.${name}\\b`, 'i').test(source)) failures.push(`missing table: ${table}`);
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
