import { app, InvocationContext } from '@azure/functions';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { emitSpan } from '../common/telemetry';
import { hasLegalHold } from '../service/dsrStore';

const PURGE_WINDOW_DAYS = Number(process.env.DSR_PURGE_WINDOW_DAYS ?? '30');

const CONTAINERS_TO_PURGE = [
  { name: 'users', scope: 'user' },
  { name: 'posts', scope: 'post' },
  { name: 'comments' },
  { name: 'likes' },
  { name: 'content_flags' },
  { name: 'appeals' },
  { name: 'appeal_votes' },
];

async function removeExpiredRecords(cutoff: string, requiredScope?: string) {
  const db = getCosmosDatabase();
  const containers = requiredScope
    ? CONTAINERS_TO_PURGE.filter(container => container.scope === requiredScope)
    : CONTAINERS_TO_PURGE;

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

app.timer(
  'privacyDsrPurge',
  {
    schedule: '0 0 2 * * *',
    runOnStartup: false,
    useMonitor: true,
  },
  async (context: InvocationContext): Promise<void> => {
    await runPurgeJobTask(context);
  },
);
