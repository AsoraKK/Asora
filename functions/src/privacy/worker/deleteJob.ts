import type { InvocationContext } from '@azure/functions';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { createAuditEntry, DsrRequest } from '../common/models';
import { emitSpan } from '../common/telemetry';
import { patchDsrRequest, hasLegalHold } from '../service/dsrStore';

const CONTAINERS_TO_MARK = [
  { name: 'users', filter: 'c.id = @userId', params: [{ name: '@userId', value: '' }], holdScope: 'user' },
  { name: 'posts', filter: 'c.authorId = @userId', params: [{ name: '@userId', value: '' }], holdScope: 'post' },
  { name: 'comments', filter: 'c.authorId = @userId', params: [{ name: '@userId', value: '' }] },
  { name: 'likes', filter: 'c.userId = @userId', params: [{ name: '@userId', value: '' }] },
  { name: 'content_flags', filter: 'c.authorId = @userId', params: [{ name: '@userId', value: '' }] },
  { name: 'appeals', filter: 'c.userId = @userId', params: [{ name: '@userId', value: '' }] },
  { name: 'appeal_votes', filter: 'c.userId = @userId', params: [{ name: '@userId', value: '' }] },
];

async function markDeletedRecords(
  containerName: string,
  filter: string,
  params: Record<string, unknown>[],
  now: string,
  holdScope?: string,
) {
  const db = getCosmosDatabase();
  const container = db.container(containerName);
  const iterator = container.items.query({
    query: `SELECT * FROM c WHERE ${filter}`,
    parameters: params,
  });
  const { resources } = await iterator.fetchAll();

  for (const item of resources) {
    if (holdScope && (await hasLegalHold(holdScope, item.id))) {
      continue;
    }

    try {
      await container.item(item.id, item.id).replace({
        ...item,
        deleted: true,
        deletedAt: now,
        deletedBy: 'privacy_delete_job',
      });
    } catch {
      // continue on failure; best-effort
    }
  }
}

export async function runDeleteJob(request: DsrRequest, context: InvocationContext): Promise<void> {
  const requestId = request.id;
  const now = new Date().toISOString();
  await patchDsrRequest(
    requestId,
    {
      status: 'running',
      startedAt: now,
      attempt: request.attempt + 1,
    },
    createAuditEntry({ by: 'system', event: 'delete.started' }),
  );

  try {
    if (await hasLegalHold('user', request.userId)) {
      const message = 'Delete blocked: active legal hold';
      await patchDsrRequest(
        requestId,
        {
          status: 'failed',
          failureReason: message,
          completedAt: new Date().toISOString(),
        },
        createAuditEntry({ by: 'system', event: 'delete.hold', meta: { reason: message } }),
      );
      emitSpan(context, 'delete.hold', { requestId });
      return;
    }

    emitSpan(context, 'delete.soft', { userId: request.userId });

    for (const bucket of CONTAINERS_TO_MARK) {
      const parameters = bucket.params.map(param =>
        param.name === '@userId' ? { ...param, value: request.userId } : param,
      );
      await markDeletedRecords(bucket.name, bucket.filter, parameters, now, bucket.holdScope);
    }

    await patchDsrRequest(
      requestId,
      {
        status: 'succeeded',
        completedAt: new Date().toISOString(),
        failureReason: undefined,
      },
      createAuditEntry({ by: 'system', event: 'delete.succeeded' }),
    );
    emitSpan(context, 'delete.completed', { requestId });
  } catch (error: any) {
    const reason = error?.message ?? 'delete job failed';
    await patchDsrRequest(
      requestId,
      {
        status: 'failed',
        failureReason: reason,
        completedAt: new Date().toISOString(),
      },
      createAuditEntry({ by: 'system', event: 'delete.failed', meta: { reason } }),
    );
    emitSpan(context, 'delete.error', { reason });
    throw error;
  }
}
