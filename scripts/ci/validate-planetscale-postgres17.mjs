import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const root = process.cwd();
const connectionString = process.env.PLANETSCALE_PG17_TEST_DATABASE_URL ?? '';
if (!connectionString) throw new Error('PLANETSCALE_PG17_TEST_DATABASE_URL is required for the local PostgreSQL 17 compatibility test');
const connection = new URL(connectionString);
if (!['localhost', '127.0.0.1', '::1'].includes(connection.hostname)) throw new Error('PostgreSQL 17 compatibility validation refuses non-local database hosts');

const migrationDir = path.join(root, 'database', 'planetscale', 'migrations');
const migrations = fs.readdirSync(migrationDir).filter((file) => file.endsWith('.sql')).sort();
const client = new Client({ connectionString, ssl: false });
await client.connect();
try {
  const version = await client.query('SELECT current_setting(\'server_version_num\')::integer AS version');
  if (Number(version.rows[0]?.version) < 170000 || Number(version.rows[0]?.version) >= 180000) throw new Error(`local compatibility server must be PostgreSQL 17.x; found ${version.rows[0]?.version}`);
  for (const file of migrations) {
    process.stdout.write(`Applying ${file}\n`);
    await client.query(fs.readFileSync(path.join(migrationDir, file), 'utf8'));
  }
  const grants = fs.readFileSync(path.join(root, 'database', 'planetscale', 'grants', 'roles.sql'), 'utf8');
  for (const role of ['lythaus_runtime', 'lythaus_admin', 'lythaus_jobs', 'lythaus_privacy', 'lythaus_migrations']) {
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN CREATE ROLE ${role}; END IF; END $$;`);
  }
  await client.query(grants);
  const checks = await client.query(`
    SELECT
      to_regclass('identity.users') AS users,
      to_regclass('content.posts') AS posts,
      to_regclass('privacy.subject_data_locations') AS subject_locations,
      to_regclass('system.idempotency_keys') AS idempotency,
      to_regprocedure('privacy.reconcile_subject_data_locations(uuid)') AS locator_function,
      (SELECT count(*) FROM pg_extension WHERE extname IN ('pgcrypto', 'pg_trgm', 'unaccent')) AS extension_count
  `);
  const row = checks.rows[0];
  for (const field of ['users', 'posts', 'subject_locations', 'idempotency', 'locator_function']) if (!row[field]) throw new Error(`PostgreSQL 17 compatibility check missing ${field}`);
  if (Number(row.extension_count) !== 3) throw new Error(`PostgreSQL 17 compatibility check expected 3 required extensions, found ${row.extension_count}`);
  console.log(JSON.stringify({ serverVersion: version.rows[0].version, migrations, checks: row }, null, 2));
} finally {
  await client.end();
}
