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
  'refresh_tokens',
];

const requiredColumns = {
  users: [
    'id',
    'primary_email',
    'roles',
    'tier',
    'reputation_score',
    'created_at',
    'updated_at',
  ],
  provider_links: ['id', 'user_id', 'provider', 'provider_sub', 'created_at'],
  refresh_tokens: ['jti', 'user_uuid', 'expires_at', 'created_at'],
};

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

  for (const [tableName, expectedColumns] of Object.entries(requiredColumns)) {
    const columns = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = ANY($2::text[])`,
      [tableName, expectedColumns],
    );
    if (columns.rowCount !== expectedColumns.length) {
      throw new Error(`${tableName} schema is incompatible`);
    }
  }

  console.log('MVP_AUTH_SCHEMA=ready');
} finally {
  await pool.end();
}
