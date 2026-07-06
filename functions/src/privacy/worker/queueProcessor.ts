import { app, InvocationContext } from '@azure/functions';

import { emitSpan, safeHashIdentifier, trackDsrEvent } from '../common/telemetry';
import type { DsrQueueMessage } from '../common/models';
import { getDsrRequest } from '../service/dsrStore';
import { runExportJob } from './exportJob';
import { runDeleteJob } from './deleteJob';

const QUEUE_NAME = process.env.DSR_QUEUE_NAME ?? 'dsr-requests';
const QUEUE_CONNECTION = process.env.DSR_QUEUE_CONNECTION ?? 'AzureWebJobsStorage';
const MAX_CONCURRENCY = Number(process.env.DSR_MAX_CONCURRENCY ?? '5');

let runningExports = 0;

function isValidMessage(value: unknown): value is DsrQueueMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    (candidate.type === 'export' || candidate.type === 'delete') &&
    typeof candidate.submittedAt === 'string' &&
    candidate.submittedAt.length > 0
  );
}

export function parseDsrQueueMessage(message: unknown): DsrQueueMessage | null {
  let parsed: unknown = message;
  if (typeof message === 'string') {
    try {
      parsed = JSON.parse(message) as unknown;
    } catch {
      return null;
    }
  }

  return isValidMessage(parsed) ? parsed : null;
}

export async function handleDsrQueue(payload: unknown, context: InvocationContext): Promise<void> {
  const parsed = parseDsrQueueMessage(payload);
  if (!parsed) {
    context.log('dsr.queue.invalid', { reason: 'invalid_shape' });
    return;
  }

  context.log('dsr.queue.received', {
    invocationId: context.invocationId,
    requestId: parsed.id,
    type: parsed.type,
    submittedAt: parsed.submittedAt,
  });

  const request = await getDsrRequest(parsed.id);
  if (!request) {
    context.log('dsr.queue.missing_request', { id: parsed.id });
    return;
  }

  if (!['queued', 'failed', 'canceled'].includes(request.status)) {
    context.log('dsr.queue.skipped_status', { id: request.id, status: request.status });
    return;
  }

  context.log('dsr.queue.resolved_request', {
    invocationId: context.invocationId,
    requestId: request.id,
    type: request.type,
    userIdHash: safeHashIdentifier(request.userId),
    status: request.status,
    attempt: request.attempt,
  });

  try {
    if (parsed.type === 'export') {
      if (runningExports >= MAX_CONCURRENCY) {
        context.log('dsr.queue.export_rate_limit', { runningExports, max: MAX_CONCURRENCY });
        return;
      }
      runningExports += 1;
      try {
        emitSpan(context, 'queue.export.dispatch', { requestId: request.id, attempt: request.attempt });
        await runExportJob(request, context);
      } finally {
        runningExports -= 1;
      }
    } else {
      emitSpan(context, 'queue.delete.dispatch', { requestId: request.id, attempt: request.attempt });
      await runDeleteJob(request, context);
    }

    const event = {
      invocationId: context.invocationId,
      requestId: request.id,
      type: parsed.type,
      previousAttempt: request.attempt,
    };
    context.log('dsr.queue.completed', event);
    trackDsrEvent('dsr.queue.completed', event);
  } catch (error) {
    const event = {
      invocationId: context.invocationId,
      requestId: request.id,
      type: parsed.type,
      previousAttempt: request.attempt,
      message: error instanceof Error ? error.message : String(error),
    };
    context.log('dsr.queue.failed', event);
    trackDsrEvent('dsr.queue.failed', event);
    throw error;
  }
}

app.storageQueue('privacyDsrProcessor', {
  queueName: QUEUE_NAME,
  connection: QUEUE_CONNECTION,
  handler: handleDsrQueue,
});
