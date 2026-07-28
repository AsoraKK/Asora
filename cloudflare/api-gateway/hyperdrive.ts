import { Client, type QueryResult, type QueryResultRow } from 'pg';

export interface HyperdriveBinding {
  connectionString: string;
}

export interface HyperdriveEnv {
  HYPERDRIVE?: HyperdriveBinding;
}

/**
 * Execute a PostgreSQL query through the configured Hyperdrive binding.
 *
 * Callers should keep authentication, authorization, and transaction policy
 * in the route/service that invokes this helper. The gateway remains an Azure
 * proxy until the database-backed cutover is explicitly enabled.
 */
export async function queryHyperdrive<
  T extends QueryResultRow = QueryResultRow,
>(
  env: HyperdriveEnv,
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  const connectionString = env.HYPERDRIVE?.connectionString?.trim();
  if (!connectionString) {
    throw new Error('hyperdrive_not_configured');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    return await client.query<T>(text, values);
  } finally {
    await client.end();
  }
}
