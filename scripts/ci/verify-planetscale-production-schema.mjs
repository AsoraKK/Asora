import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import pg from 'pg';

const { Client } = pg;
const root = process.cwd();
const branch = process.env.PSCALE_BRANCH_NAME ?? '';
const databaseUrl = process.env.PLANETSCALE_ADMIN_DATABASE_URL ?? '';

if (branch !== 'main') throw new Error('production schema verification requires PSCALE_BRANCH_NAME=main');
if (!databaseUrl) throw new Error('PLANETSCALE_ADMIN_DATABASE_URL is required');

const connection = new URL(databaseUrl);
if (connection.searchParams.get('sslmode') !== 'verify-full') {
  throw new Error('production schema verification requires sslmode=verify-full');
}

const migrationsDir = path.join(root, 'database', 'planetscale', 'migrations');
const migrations = fs.readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((name) => ({
    name,
    checksum: createHash('sha256')
      .update(fs.readFileSync(path.join(migrationsDir, name), 'utf8'))
      .digest('hex'),
  }));

const migrationSetSha256 = createHash('sha256')
  .update(migrations.map(({ name, checksum }) => `${name}:${checksum}`).join('\n'))
  .digest('hex');

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: true } });
await client.connect();
try {
  await client.query('BEGIN READ ONLY');
  const registry = await client.query(
    'SELECT version, checksum FROM system.schema_migrations ORDER BY version'
  );
  const recorded = new Map(registry.rows.map((row) => [row.version, row.checksum]));

  for (const migration of migrations) {
    if (recorded.get(migration.name) !== migration.checksum) {
      throw new Error(`production migration registry mismatch: ${migration.name}`);
    }
  }
  if (recorded.size !== migrations.length) {
    throw new Error(`production migration registry contains ${recorded.size} entries; repository contains ${migrations.length}`);
  }

  const requiredRelations = [
    'identity.users',
    'social.profiles',
    'content.posts',
    'content.comments',
    'moderation.appeals',
    'privacy.subject_data_locations',
    'system.outbox_events',
  ];
  for (const relation of requiredRelations) {
    const result = await client.query('SELECT to_regclass($1) AS relation', [relation]);
    if (!result.rows[0]?.relation) throw new Error(`required production relation missing: ${relation}`);
  }

  await client.query('ROLLBACK');
  console.log(`Verified read-only PlanetScale production schema on ${branch}.`);
  console.log(`Approved migration-set SHA-256: ${migrationSetSha256}`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
