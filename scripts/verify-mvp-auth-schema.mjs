import pg from 'pg';

const connectionString =
  process.env.POSTGRES_CONN ||
  process.env.POSTGRES_CONNECTION_STRING ||
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('POSTGRES_CONN is required');
}

const expectedTables = [
  'email_auth_credentials',
  'email_auth_tokens',
  'provider_links',
];

const expectedProviderLinkColumns = [
  'id',
  'user_id',
  'provider',
  'provider_sub',
  'created_at',
];

const pool = new pg.Pool({ connectionString });

try {
  const tables = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])
     ORDER BY table_name`,
    [expectedTables],
  );
  if (tables.rowCount !== expectedTables.length) {
    throw new Error('MVP authentication schema is incomplete');
  }

  const columns = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'provider_links'
     ORDER BY ordinal_position`,
  );
  const actual = columns.rows.map((row) => row.column_name);
  if (
    actual.length !== expectedProviderLinkColumns.length ||
    actual.some((column, index) => column !== expectedProviderLinkColumns[index])
  ) {
    throw new Error('provider_links schema is incompatible');
  }

  console.log('MVP_AUTH_SCHEMA=ready');
} finally {
  await pool.end();
}
