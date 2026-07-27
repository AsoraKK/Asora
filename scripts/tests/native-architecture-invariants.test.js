import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');
const configs = [
  'apps/lythaus-public-api/wrangler.jsonc',
  'apps/lythaus-admin-api/wrangler.jsonc',
  'apps/lythaus-jobs/wrangler.jsonc',
];

test('native Workers disable production workers.dev and preview URLs', () => {
  for (const relative of configs) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    assert.match(source, /"workers_dev": false/);
    assert.match(source, /"preview_urls": false/);
    assert.match(source, /"nodejs_compat"/);
    assert.doesNotMatch(source, /azurewebsites\.net|asora\.co\.za/);
  }
});

test('native Workers declare cache-disabled Hyperdrive intent', () => {
  for (const relative of configs) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    assert.match(source, /HYPERDRIVE_QUERY_CACHE_MODE/);
    assert.match(source, /"disabled"/);
  }
});

test('migration baseline contains subject locator and idempotency tables', () => {
  const migration = fs.readFileSync(path.join(root, 'database/planetscale/migrations/0002_core_tables.sql'), 'utf8');
  assert.match(migration, /CREATE TABLE privacy\.subject_data_locations/);
  assert.match(migration, /CREATE TABLE system\.outbox_events/);
  assert.match(migration, /CREATE TABLE system\.consumer_inbox/);
  assert.match(migration, /CREATE TABLE system\.idempotency_keys/);
  assert.match(migration, /uuidv7\(\)/);
});

test('launch schema and media boundary are explicit', () => {
  const launch = fs.readFileSync(path.join(root, 'database/planetscale/migrations/0004_launch_contract.sql'), 'utf8');
  const media = fs.readFileSync(path.join(root, 'apps/lythaus-public-api/src/index.ts'), 'utf8');
  assert.match(launch, /CREATE TABLE social\.profiles/);
  assert.match(launch, /CREATE TABLE content\.content_declarations/);
  assert.match(launch, /CREATE TABLE system\.feature_flags/);
  assert.match(media, /createPresignedPutUrl/);
  assert.match(media, /uploadSessionId/);
  assert.doesNotMatch(media, /arrayBuffer\(\).*MEDIA_QUARANTINE\.put/s);
});

test('native auth and user controls are implemented behind configured secrets', () => {
  const source = fs.readFileSync(path.join(root, 'apps/lythaus-public-api/src/index.ts'), 'utf8');
  const grants = fs.readFileSync(path.join(root, 'database/planetscale/grants/roles.sql'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'database/planetscale/migrations/0004_launch_contract.sql'), 'utf8');
  assert.match(source, /hashPassword/);
  assert.match(source, /refresh_token_hash/);
  assert.match(source, /email_verification_tokens/);
  assert.match(source, /MEDIA_QUOTA_BYTES/);
  assert.match(source, /privacy\.set_retention_rule/);
  assert.match(source, /feed\.user_inbox/);
  assert.match(grants, /GRANT EXECUTE ON FUNCTION privacy\.set_retention_rule/);
  assert.match(migration, /SECURITY DEFINER/);
});

test('admin verifies Access JWTs independently', () => {
  const source = fs.readFileSync(path.join(root, 'apps/lythaus-admin-api/src/index.ts'), 'utf8');
  assert.match(source, /createRemoteJWKSet/);
  assert.match(source, /jwtVerify/);
  assert.match(source, /ACCESS_AUDIENCE/);
  assert.match(source, /admin_memberships/);
});

test('branch policy keeps ai-development as Git-only', () => {
  const guide = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  assert.match(guide, /Git convention only/);
  assert.match(guide, /ci-\*/);
  assert.match(guide, /Do not execute write queries against `main`/);
});

test('production deployment is manually gated and provisioned-only', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/native-workers-deploy.yml'), 'utf8');
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /validate:native-workers:provisioned/);
  assert.doesNotMatch(workflow, /on:\s*\n\s*push:/);
});
