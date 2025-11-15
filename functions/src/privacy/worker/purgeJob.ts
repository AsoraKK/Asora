import { app, InvocationContext, Timer } from '@azure/functions';
import { Container } from '@azure/cosmos';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { emitSpan } from '../common/telemetry';
import { hasLegalHold } from '../service/dsrStore';

const PURGE_WINDOW_DAYS = Number(process.env.DSR_PURGE_WINDOW_DAYS ?? '30');

export type PurgeContainer = { name: string; scope?: string };

const CONTAINERS_TO_PURGE: PurgeContainer[] = [
  { name: 'users', scope: 'user' },
  { name: 'posts', scope: 'post' },
  { name: 'comments' },
  { name: 'likes' },
  { name: 'content_flags' },
  { name: 'appeals' },
  { name: 'appeal_votes' },
];

interface RemoveExpiredRecordsOptions {
  containers?: PurgeContainer[];
  database?: { container: (name: string) => Container };
}

export async function removeExpiredRecords(
  cutoff: string,
  options: RemoveExpiredRecordsOptions = {},
) {
  const db = options.database ?? getCosmosDatabase();
  const containers = options.containers ?? CONTAINERS_TO_PURGE;

  for (const entry of containers) {
    const container = db.container(entry.name);
    const iterator = container.items.query({
      query: 'SELECT * FROM c WHERE c.deleted = true AND c.deletedAt <= @cutoff',
      parameters: [{ name: '@cutoff', value: cutoff }],
    });

    const { resources } = await iterator.fetchAll();
    for (const item of resources) {
      if (entry.scope && (await hasLegalHold(entry.scope, item.id))) {
        continue;
      }
      try {
        await container.item(item.id, item.id).delete();
      } catch {
        // best-effort
      }
    }
  }
}

export async function runPurgeJobTask(context: InvocationContext, windowDays = PURGE_WINDOW_DAYS) {
  const cutoffDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  emitSpan(context, 'delete.purge', { cutoff: cutoffDate });
  await removeExpiredRecords(cutoffDate);
  emitSpan(context, 'delete.purge.completed', { cutoff: cutoffDate });
}

app.timer('privacyDsrPurge', {
  schedule: '0 0 2 * * *',
  handler: async (myTimer: Timer): Promise<void> => {
    // Create a minimal InvocationContext for the purge task
    const context = {
      invocationId: `timer-${Date.now()}`,
      functionName: 'privacyDsrPurge',
    } as InvocationContext;
    await runPurgeJobTask(context);
  },
});
