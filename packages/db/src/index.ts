import { Client, type QueryResult, type QueryResultRow } from 'pg';

export interface HyperdriveBinding {
  connectionString: string;
}

export interface DatabaseEnv {
  connection: HyperdriveBinding;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  binding: HyperdriveBinding,
  text: string,
  values: readonly unknown[] = []
): Promise<QueryResult<T>> {
  assertVerifyFull(binding.connectionString);
  const client = new Client({ connectionString: binding.connectionString });
  await client.connect();
  try {
    return await client.query<T>(text, values as unknown[]);
  } finally {
    await client.end();
  }
}

export async function transaction<T>(
  binding: HyperdriveBinding,
  work: (client: Client) => Promise<T>
): Promise<T> {
  assertVerifyFull(binding.connectionString);
  const client = new Client({ connectionString: binding.connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

export function assertVerifyFull(connectionString: string): void {
  const url = new URL(connectionString);
  if (url.searchParams.get('sslmode') !== 'verify-full') {
    throw new Error('hyperdrive_requires_sslmode_verify_full');
  }
}
