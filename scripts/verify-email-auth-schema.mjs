import pg from 'pg';

const connectionString =
  process.env.POSTGRES_CONN ||
  process.env.POSTGRES_CONNECTION_STRING ||
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('POSTGRES_CONN is required');
}

const pool = new pg.Pool({ connectionString });
try {
  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('email_auth_credentials', 'email_auth_tokens')
    ORDER BY table_name
  `);
  if (tables.rowCount !== 2) {
    throw new Error('Email authentication schema is incomplete');
  }

  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM email_auth_credentials)::int AS credentials,
      (SELECT COUNT(*) FROM email_auth_tokens)::int AS tokens
  `);
  console.log(`EMAIL_AUTH_TABLE_COUNT=${tables.rowCount}`);
  console.log(`EMAIL_AUTH_ROWS=${counts.rows[0].credentials},${counts.rows[0].tokens}`);
} finally {
  await pool.end();
}
