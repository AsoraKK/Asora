import { app, InvocationContext, Timer } from '@azure/functions';
import { Container } from '@azure/cosmos';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { emitSpan } from '../common/telemetry';
import { hasLegalHold } from '../service/dsrStore';

const PURGE_WINDOW_DAYS = Number(process.env.DSR_PURGE_WINDOW_DAYS ?? '30');

type LegalHoldScope = 'user' | 'post' | 'case';

interface HoldReference {
  scope: LegalHoldScope;
  idFields: string[];
}

export type PurgeContainer = {
  name: string;
  partitionKeyFields: string[];
  holdReferences?: HoldReference[];
};

export const CONTAINERS_TO_PURGE: PurgeContainer[] = [
  {
    name: 'users',
    partitionKeyFields: ['id'],
    holdReferences: [{ scope: 'user', idFields: ['id'] }],
  },
  {
    name: 'posts',
    partitionKeyFields: ['authorId', 'id'],
    holdReferences: [{ scope: 'post', idFields: ['id'] }],
  },
  {
    name: 'comments',
    partitionKeyFields: ['postId', '_partitionKey', 'id'],
    holdReferences: [{ scope: 'post', idFields: ['postId'] }],
  },
  {
    name: 'likes',
    partitionKeyFields: ['contentId', 'id'],
    holdReferences: [{ scope: 'post', idFields: ['contentId'] }],
  },
  {
    name: 'content_flags',
    partitionKeyFields: ['targetId', '_partitionKey', 'contentId', 'id'],
    holdReferences: [{ scope: 'post', idFields: ['targetId', 'contentId'] }],
  },
  {
    name: 'appeals',
    partitionKeyFields: ['id', 'contentId'],
    holdReferences: [
      { scope: 'case', idFields: ['id'] },
      { scope: 'post', idFields: ['contentId'] },
    ],
  },
  {
    name: 'appeal_votes',
    partitionKeyFields: ['appealId', 'id'],
    holdReferences: [{ scope: 'case', idFields: ['appealId'] }],
  },
  {
    name: 'moderation_decisions',
    partitionKeyFields: ['itemId', 'partitionKey', '_partitionKey', 'id'],
    holdReferences: [
      { scope: 'case', idFields: ['caseId', 'appealId'] },
      { scope: 'post', idFields: ['contentId', 'itemId'] },
    ],
  },
];

interface RemoveExpiredRecordsOptions {
  containers?: PurgeContainer[];
  database?: { container: (name: string) => Container };
}

function readStringField(item: Record<string, unknown>, field: string): string | null {
  const value = item[field];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

async function isProtectedByLegalHold(
  item: Record<string, unknown>,
  holdReferences: HoldReference[] = [],
): Promise<boolean> {
  for (const reference of holdReferences) {
    for (const field of reference.idFields) {
      const scopeId = readStringField(item, field);
      if (scopeId && (await hasLegalHold(reference.scope, scopeId))) {
        return true;
      }
    }
  }
  return false;
}

async function deleteItem(
  container: Container,
  item: Record<string, unknown>,
  partitionKeyFields: string[],
): Promise<void> {
  const id = readStringField(item, 'id');
  if (!id) {
    throw new Error('Purge candidate is missing id');
  }

  const partitionKeys = [
    ...partitionKeyFields.map(field => readStringField(item, field)),
    readStringField(item, 'partitionKey'),
    readStringField(item, '_partitionKey'),
    id,
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);

  let lastError: unknown;
  for (const partitionKey of partitionKeys) {
    try {
      await container.item(id, partitionKey).delete();
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Unable to resolve partition key for purge candidate ${id}`);
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
      query: `
        SELECT * FROM c
        WHERE
          (c.deleted = true AND IS_DEFINED(c.deletedAt) AND c.deletedAt <= @cutoff)
          OR
          (c.anonymized = true AND IS_DEFINED(c.anonymizedAt) AND c.anonymizedAt <= @cutoff)
      `,
      parameters: [{ name: '@cutoff', value: cutoff }],
    });

    const { resources } = await iterator.fetchAll();
    for (const item of resources) {
      if (await isProtectedByLegalHold(item, entry.holdReferences)) {
        continue;
      }
      try {
        await deleteItem(container, item, entry.partitionKeyFields);
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
