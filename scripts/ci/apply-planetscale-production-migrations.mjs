import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import pg from 'pg';

const { Client } = pg;
const root = process.cwd();
const branch = process.env.PSCALE_BRANCH_NAME ?? '';
const approval = process.env.PLANETSCALE_PRODUCTION_MIGRATIONS_APPROVED ?? '';
const usageApproval = process.env.PLANETSCALE_MIGRATION_USAGE_APPROVED ?? '';
const usageMaxUsd = Number(process.env.PLANETSCALE_MIGRATION_USAGE_MAX_USD ?? '0');
const databaseUrl = process.env.PLANETSCALE_ADMIN_DATABASE_URL ?? '';
const roleIdentifiers = JSON.parse(process.env.PSCALE_ROLE_IDENTIFIERS ?? '{}');

if (branch !== 'main') throw new Error('production migrations require PSCALE_BRANCH_NAME=main');
if (approval !== 'approved') throw new Error('production migrations require PLANETSCALE_PRODUCTION_MIGRATIONS_APPROVED=approved');
if (usageApproval !== 'approved' || !(usageMaxUsd > 0)) throw new Error('production migrations require measured migration usage approval and a positive PLANETSCALE_MIGRATION_USAGE_MAX_USD');
if (!databaseUrl) throw new Error('PLANETSCALE_ADMIN_DATABASE_URL is required');
const connection = new URL(databaseUrl);
if (connection.searchParams.get('sslmode') !== 'verify-full') throw new Error('production migrations require sslmode=verify-full');

const migrationsDir = path.join(root, 'database', 'planetscale', 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => ({ name: file, file: path.join(migrationsDir, file), sql: fs.readFileSync(path.join(migrationsDir, file), 'utf8') }));
const grantsFile = path.join(root, 'database', 'planetscale', 'grants', 'roles.sql');
const roleLabels = ['runtime', 'admin', 'jobs', 'privacy', 'migrations'];

const quoteRoleIdentifier = (value) => {
  if (!/^pscale_api_[a-z0-9]+$/.test(value)) throw new Error(`invalid PlanetScale role identifier: ${value}`);
  return `"${value}"`;
};

for (const label of roleLabels) {
  if (!roleIdentifiers[`lythaus_${label}`]) {
    throw new Error(`missing PSCALE_ROLE_IDENTIFIERS entry for lythaus_${label}`);
  }
  quoteRoleIdentifier(roleIdentifiers[`lythaus_${label}`]);
}

function checksum(sql) {
  return createHash('sha256').update(sql).digest('hex');
}

async function withClient(callback) {
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function hasRegistry(client) {
  const result = await client.query(`SELECT to_regclass('system.schema_migrations') AS registry`);
  return Boolean(result.rows[0]?.registry);
}

async function registryRows(client) {
  if (!(await hasRegistry(client))) return new Map();
  const result = await client.query('SELECT version, checksum FROM system.schema_migrations');
  return new Map(result.rows.map((row) => [row.version, row.checksum]));
}

async function recordMigrations(client, rows) {
  if (!(await hasRegistry(client))) return;
  for (const row of rows) {
    await client.query(
      `INSERT INTO system.schema_migrations (version, checksum)
       VALUES ($1, $2)
       ON CONFLICT (version) DO UPDATE SET checksum = EXCLUDED.checksum`,
      [row.name, row.checksum]
    );
  }
}

await withClient(async (client) => {
  const existingUsers = await client.query("SELECT to_regclass('identity.users') AS users");
  if (existingUsers.rows[0]?.users) {
    const existingRows = await client.query('SELECT count(*)::bigint AS count FROM identity.users');
    if (Number(existingRows.rows[0]?.count ?? 0) !== 0) throw new Error('main contains application users; refusing clean-slate production migration');
  }
  const existing = await registryRows(client);
  const applied = [];
  for (const migration of migrationFiles) {
    const digest = checksum(migration.sql);
    const recorded = existing.get(migration.name);
    if (recorded) {
      if (recorded !== digest) throw new Error(`migration checksum mismatch: ${migration.name}`);
      continue;
    }

    await client.query('BEGIN');
    try {
      process.stdout.write(`Applying ${migration.name}\n`);
      await client.query(migration.sql);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    }
    applied.push({ name: migration.name, checksum: digest });
    const current = await registryRows(client);
    if (current.size !== 0) {
      await recordMigrations(client, applied);
      applied.length = 0;
    }
  }

  const finalRegistry = await registryRows(client);
  if (finalRegistry.size === 0) throw new Error('migration registry was not created');
  for (const migration of migrationFiles) {
    const recorded = finalRegistry.get(migration.name);
    if (recorded !== checksum(migration.sql)) throw new Error(`migration registry incomplete: ${migration.name}`);
  }

  const grantsTemplate = fs.readFileSync(grantsFile, 'utf8');
  const grantsSql = grantsTemplate.replace(/\blythaus_(runtime|admin|jobs|privacy|migrations)\b/g, (label) => {
    const identifier = roleIdentifiers[label];
    if (!identifier) throw new Error(`missing PSCALE_ROLE_IDENTIFIERS entry for ${label}`);
    return quoteRoleIdentifier(identifier);
  });
  await client.query(grantsSql);
  console.log(`Validated and applied PlanetScale production migrations on ${branch}; development seed was not applied.`);
});
