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

test('native production routing is custom-domain-only', () => {
  const validate = fs.readFileSync(path.join(root, 'scripts/validate-native-worker-config.mjs'), 'utf8');
  assert.match(validate, /workers\\\.dev/);
  assert.match(validate, /pages\\\.dev/);
  assert.match(validate, /r2\\\.dev/);
  assert.match(validate, /api\\\.lythaus\\\.co/);
  assert.match(validate, /admin-api\\\.lythaus\\\.co/);
});

test('native public and admin APIs enforce configured hostnames', () => {
  const observability = fs.readFileSync(path.join(root, 'packages/observability/src/index.ts'), 'utf8');
  const publicApi = fs.readFileSync(path.join(root, 'apps/lythaus-public-api/src/index.ts'), 'utf8');
  const adminApi = fs.readFileSync(path.join(root, 'apps/lythaus-admin-api/src/index.ts'), 'utf8');
  assert.match(observability, /assertExpectedHostname/);
  assert.match(observability, /hostname_not_configured/);
  assert.match(observability, /hostname_not_allowed/);
  assert.match(publicApi, /assertExpectedHostname\(request, env\.EXPECTED_HOSTNAMES\)/);
  assert.match(adminApi, /assertExpectedHostname\(request, env\.EXPECTED_HOSTNAMES\)/);
  assert.match(fs.readFileSync(path.join(root, 'apps/lythaus-public-api/wrangler.jsonc'), 'utf8'), /lythaus-public-api-development\.asora\.workers\.dev/);
  assert.match(fs.readFileSync(path.join(root, 'apps/lythaus-admin-api/wrangler.jsonc'), 'utf8'), /lythaus-admin-api-development\.asora\.workers\.dev/);
});

test('public API dispatch awaits rejection-prone async handlers', () => {
  const source = fs.readFileSync(path.join(root, 'apps/lythaus-public-api/src/index.ts'), 'utf8');
  for (const handler of ['emailAuth', 'verifyEmail', 'requestPasswordReset']) {
    assert.match(source, new RegExp(`return await ${handler}\\(`));
  }
  for (const handler of ['createPost', 'createUploadSession']) {
    assert.match(source, new RegExp(`return await idempotentMutation[\\s\\S]*${handler}\\(`));
  }
});

test('admin API dispatch awaits rejection-prone mutations', () => {
  const source = fs.readFileSync(path.join(root, 'apps/lythaus-admin-api/src/index.ts'), 'utf8');
  assert.match(source, /return await decideModeration\(/);
  assert.match(source, /return await updateAccountStatus\(/);
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
  assert.match(migration, /state text NOT NULL DEFAULT 'processing'/);
  assert.match(migration, /claimed_at timestamptz NOT NULL DEFAULT now\(\)/);
  assert.match(migration, /id uuid PRIMARY KEY/);
  assert.doesNotMatch(migration, /DEFAULT uuidv7\(\)/);
});

test('native queue consumers claim, retry, and complete duplicate events safely', () => {
  const jobs = fs.readFileSync(path.join(root, 'apps/lythaus-jobs/src/index.ts'), 'utf8');
  assert.match(jobs, /ON CONFLICT \(consumer_name, event_id\) DO NOTHING/);
  assert.match(jobs, /message\.retry\(\)/);
  assert.match(jobs, /state = 'completed'/);
  assert.match(jobs, /claimed_at < now\(\) - interval '5 minutes'/);
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

test('native media buckets are isolated by Wrangler environment', () => {
  for (const relative of ['apps/lythaus-public-api/wrangler.jsonc', 'apps/lythaus-jobs/wrangler.jsonc']) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    const production = source.slice(0, source.indexOf('"env"'));
    const development = source.slice(source.indexOf('"development"'));
    assert.match(production, /MEDIA_(?:QUARANTINE|APPROVED)_BUCKET[^\n]*lythaus-media-(?:quarantine|approved)-dev/);
    assert.match(development, /MEDIA_(?:QUARANTINE|APPROVED)_BUCKET[^\n]*lythaus-media-(?:quarantine|approved)-dev/);
  }
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

test('native authentication supports account-level token revocation and social controls', () => {
  const migration = fs.readFileSync(path.join(root, 'database/planetscale/migrations/0005_auth_revocation.sql'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'apps/lythaus-public-api/src/index.ts'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'apps/lythaus-admin-api/src/index.ts'), 'utf8');
  assert.match(migration, /token_version/);
  assert.match(source, /tokenVersion/);
  assert.match(source, /social\.blocks/);
  assert.match(source, /social\.mutes/);
  assert.match(source, /social\.bookmarks/);
  assert.match(admin, /account\.status_changed/);
});

test('password hashing fallback is explicitly environment-gated', () => {
  const source = fs.readFileSync(path.join(root, 'apps/lythaus-public-api/src/index.ts'), 'utf8');
  assert.match(source, /PASSWORD_HASH_ALLOW_SCRYPT_FALLBACK === 'true'/);
  assert.match(source, /fallbackToScrypt:/);
  assert.match(source, /needsPasswordRehash/);
  const config = fs.readFileSync(path.join(root, 'apps/lythaus-public-api/wrangler.jsonc'), 'utf8');
  assert.match(config, /"PASSWORD_HASH_ALLOW_SCRYPT_FALLBACK": "false"/);
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

test('resource registry is complete and discover-before-create guarded', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'infrastructure/lythaus-resource-registry.json'), 'utf8'));
  assert.equal(registry.policy.discoverBeforeCreate, true);
  assert.equal(registry.policy.creationRequiresOwnerApproval, true);
  assert.ok(registry.resources.some((resource) => resource.resourceName === 'lythaus-public-api-development'));
  assert.ok(registry.resources.some((resource) => resource.resourceName === 'development' && resource.temporary === true));
});

test('production deployment is manually gated and provisioned-only', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/native-workers-deploy.yml'), 'utf8');
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /validate:native-workers:provisioned/);
  assert.doesNotMatch(workflow, /on:\s*\n\s*push:/);
});

test('Cloudflare scope manifest forbids known shared and unrelated resources', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'infrastructure/cloudflare/native-scope.json'), 'utf8'));
  assert.equal(manifest.production.accountId, 'e5b7ae46e04698f507b7e4b3d4ef1af0');
  assert.equal(manifest.production.zoneId, '7bc572c8b7cd3c00be9c655176c29382');
  assert.equal(manifest.production.sharedAccountMustDiffer, false);
  assert.ok(manifest.forbiddenResourcePrefixes.includes('nite-owl-'));
  assert.ok(manifest.approvedLegacyResourcePrefixes.includes('asora-azure-compat'));
});

test('production config reuses existing Workers and disables paid or incomplete features', () => {
  for (const relative of configs) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    assert.doesNotMatch(source.slice(0, source.indexOf('"env"')), /"images"\s*:/);
  }
  const publicConfig = fs.readFileSync(path.join(root, configs[0]), 'utf8');
  const jobsConfig = fs.readFileSync(path.join(root, configs[2]), 'utf8');
  assert.match(publicConfig, /"name": "lythaus-public-api-development"/);
  assert.match(publicConfig, /"EMAIL_PROVIDER_MODE": "disabled"/);
  assert.match(publicConfig, /"MEDIA_UPLOADS_ENABLED": "false"/);
  assert.match(jobsConfig, /"MEDIA_PROCESSING_ENABLED": "false"/);
});

test('native Workers have an explicit Azure dependency scan', () => {
  const script = fs.readFileSync(path.join(root, 'scripts/validate-native-azure-dependencies.mjs'), 'utf8');
  assert.match(script, /azurewebsites/);
  assert.match(script, /CosmosClient/);
  assert.match(script, /applicationinsights/);
});

test('jobs Worker exposes durable privacy and appeal workflows', () => {
  const config = fs.readFileSync(path.join(root, 'apps/lythaus-jobs/wrangler.jsonc'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'apps/lythaus-jobs/src/index.ts'), 'utf8');
  assert.match(config, /APPEAL_LIFECYCLE/);
  assert.match(source, /class AppealLifecycleWorkflow/);
  assert.match(source, /moderation\.appeal\.created/);
  assert.match(source, /ON CONFLICT DO NOTHING/);
  assert.match(config, /BACKUP_VALIDATION/);
  assert.match(source, /class BackupValidationWorkflow/);
  assert.match(source, /independent_backup_healthcheck_not_configured/);
});

test('temporary PlanetScale CI is branch-scoped and cleans up safely', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/native-planetscale-ci.yml'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'scripts/ci/apply-planetscale-migrations.mjs'), 'utf8');
  assert.match(workflow, /PSCALE_BRANCH_NAME: ci-\$\{\{ github\.run_id \}\}/);
  assert.match(workflow, /--from main --major-version 18/);
  assert.match(workflow, /branch delete/);
  assert.match(script, /refusing to run outside a ci-\* PlanetScale branch/);
  assert.doesNotMatch(workflow, /branch delete.*main/s);
});

test('production migrations are explicit, TLS-verified, and approval-gated', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/native-workers-deploy.yml'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'scripts/ci/apply-planetscale-production-migrations.mjs'), 'utf8');
  assert.match(workflow, /Apply approved production migrations/);
  assert.match(workflow, /PLANETSCALE_PRODUCTION_MIGRATIONS_APPROVED/);
  assert.match(workflow, /PSCALE_BRANCH_NAME: main/);
  assert.match(script, /branch !== 'main'/);
  assert.match(script, /approval !== 'approved'/);
  assert.match(script, /sslmode.*verify-full/);
  assert.match(script, /migration checksum mismatch/);
  assert.doesNotMatch(script, /0001_feature_flags/);
});

test('production deployment is fail-closed on the five acceptance gates', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/native-workers-deploy.yml'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'infrastructure/cloudflare/production-gates.json'), 'utf8'));
  const validator = fs.readFileSync(path.join(root, 'scripts/validate-production-gates.mjs'), 'utf8');
  assert.match(workflow, /Validate all production acceptance gates/);
  assert.equal(Object.keys(manifest.gates).length, 5);
  assert.equal(manifest.cutoverAuthorized, false);
  assert.equal(manifest.azureDeletionAuthorized, false);
  assert.match(validator, /--require-pass/);
});

test('jobs role can read trust ledgers required by Data Passport exports', () => {
  const grants = fs.readFileSync(path.join(root, 'database/planetscale/grants/roles.sql'), 'utf8');
  const jobs = fs.readFileSync(path.join(root, 'apps/lythaus-jobs/src/index.ts'), 'utf8');
  assert.match(grants, /GRANT SELECT, INSERT ON trust\.provenance_events, trust\.human_contribution_events TO lythaus_jobs/);
  assert.match(grants, /GRANT SELECT ON trust\.reputation_events TO lythaus_jobs/);
  assert.match(jobs, /FROM trust\.provenance_events/);
  assert.match(jobs, /FROM trust\.human_contribution_events/);
  assert.match(jobs, /FROM trust\.reputation_events/);
});

test('privacy workflows reconcile the subject-data locator before export or deletion', () => {
  const migration = fs.readFileSync(path.join(root, 'database/planetscale/migrations/0004_launch_contract.sql'), 'utf8');
  const grants = fs.readFileSync(path.join(root, 'database/planetscale/grants/roles.sql'), 'utf8');
  const jobs = fs.readFileSync(path.join(root, 'apps/lythaus-jobs/src/index.ts'), 'utf8');
  assert.match(migration, /CREATE OR REPLACE FUNCTION privacy\.reconcile_subject_data_locations/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(grants, /GRANT EXECUTE ON FUNCTION privacy\.reconcile_subject_data_locations\(uuid\) TO lythaus_privacy/);
  assert.equal((jobs.match(/privacy\.reconcile_subject_data_locations/g) ?? []).length, 2);
});
