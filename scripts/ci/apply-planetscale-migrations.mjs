import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const root = process.cwd();
const branch = process.env.PSCALE_BRANCH_NAME ?? '';
const databaseUrl = process.env.PLANETSCALE_ADMIN_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
if (!/^ci-[a-z0-9-]+$/.test(branch)) throw new Error('refusing to run outside a ci-* PlanetScale branch');
if (!databaseUrl) throw new Error('PLANETSCALE_ADMIN_DATABASE_URL or DATABASE_URL is required');

const migrationsDir = path.join(root, 'database', 'planetscale', 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
const files = [
  ...migrationFiles.map((file) => path.join(migrationsDir, file)),
  path.join(root, 'database', 'planetscale', 'grants', 'roles.sql'),
  path.join(root, 'database', 'planetscale', 'seeds', '0001_feature_flags.sql'),
];

async function withClient(connectionString, callback) {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: true } });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

await withClient(databaseUrl, async (client) => {
  for (const file of files) {
    process.stdout.write(`Applying ${path.relative(root, file)}\n`);
    await client.query(fs.readFileSync(file, 'utf8'));
  }
});

const roleUrls = JSON.parse(process.env.PSCALE_ROLE_URLS ?? '{}');
const checks = {
  lythaus_runtime: [
    ['table', 'privacy.legal_holds', 'SELECT', false],
    ['schema', 'content', 'CREATE', false],
    ['database', 'postgres', 'CREATE', false],
  ],
  lythaus_jobs: [
    ['schema', 'content', 'CREATE', false],
    ['schema', 'privacy', 'CREATE', false],
    ['database', 'postgres', 'CREATEROLE', false],
  ],
  lythaus_admin: [
    ['database', 'postgres', 'CREATE', false],
    ['database', 'postgres', 'CREATEROLE', false],
  ],
  lythaus_privacy: [
    ['table', 'identity.email_credentials', 'SELECT', false],
  ],
  lythaus_migrations: [
    ['schema', 'content', 'CREATE', true],
  ],
};
for (const [role, roleChecks] of Object.entries(checks)) {
  if (!roleUrls[role]) throw new Error(`missing connection URL for ${role}`);
  await withClient(roleUrls[role], async (client) => {
    for (const [kind, target, privilege, expected] of roleChecks) {
      const expression = kind === 'table'
        ? 'has_table_privilege(current_user, $1, $2)'
        : kind === 'schema'
          ? 'has_schema_privilege(current_user, $1, $2)'
          : 'has_database_privilege(current_user, current_database(), $1)';
      const params = kind === 'database' ? [privilege] : [target, privilege];
      const result = await client.query(`SELECT ${expression} AS allowed`, params);
      const allowed = result.rows[0]?.allowed === true;
      if (allowed !== expected) throw new Error(`${role} privilege check failed: ${kind} ${target} ${privilege} expected ${expected} got ${allowed}`);
    }
  });
}

console.log(`Validated direct PlanetScale migrations and role-negative checks on ${branch}.`);
