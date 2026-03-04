import { Pool, PoolClient, PoolConfig } from 'pg';

let cachedPool: Pool | null = null;

const DEFAULT_CONFIG: PoolConfig = {
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
  max: Number(process.env.POSTGRES_POOL_MAX ?? '10'),
  idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT_MS ?? '30000'),
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};

export function getPool(config: PoolConfig = DEFAULT_CONFIG): Pool {
  if (!cachedPool) {
    cachedPool = new Pool(config);
  }
  return cachedPool;
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (cachedPool) {
    await cachedPool.end();
    cachedPool = null;
  }
}
