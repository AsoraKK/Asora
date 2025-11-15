import { app, InvocationContext, trigger } from '@azure/functions';

import { emitSpan } from '../common/telemetry';
import type { DsrQueueMessage } from '../common/models';
import { getDsrRequest } from '../service/dsrStore';
import { runExportJob } from './exportJob';
import { runDeleteJob } from './deleteJob';

const QUEUE_NAME = process.env.DSR_QUEUE_NAME ?? 'dsr-requests';
const QUEUE_CONNECTION = process.env.DSR_QUEUE_CONNECTION ?? 'AzureWebJobsStorage';
const MAX_CONCURRENCY = Number(process.env.DSR_MAX_CONCURRENCY ?? '5');

let runningExports = 0;

function parseMessage(message: unknown): DsrQueueMessage | null {
  if (typeof message === 'string') {
    try {
      return JSON.parse(message) as DsrQueueMessage;
    } catch {
      return null;
    }
  }

  if (typeof message === 'object' && message !== null) {
    return message as DsrQueueMessage;
  }

  return null;
}

export async function handleDsrQueue(payload: unknown, context: InvocationContext): Promise<void> {
  const parsed = parseMessage(payload);
  if (!parsed) {
    context.log('dsr.queue.invalid', { payload });
    return;
  }

  const request = await getDsrRequest(parsed.id);
  if (!request) {
    context.log('dsr.queue.missing_request', { id: parsed.id });
    return;
  }

  if (!['queued', 'failed', 'canceled'].includes(request.status)) {
    context.log('dsr.queue.skipped_status', { id: request.id, status: request.status });
    return;
  }

  if (parsed.type === 'export') {
    if (runningExports >= MAX_CONCURRENCY) {
      context.log('dsr.queue.export_rate_limit', { runningExports, max: MAX_CONCURRENCY });
      return;
    }
    runningExports += 1;
    try {
      emitSpan(context, 'queue.export.dispatch', { requestId: request.id });
      await runExportJob(request, context);
    } finally {
      runningExports -= 1;
    }
  } else if (parsed.type === 'delete') {
    emitSpan(context, 'queue.delete.dispatch', { requestId: request.id });
    await runDeleteJob(request, context);
  } else {
    context.log('dsr.queue.unknown_type', { type: parsed.type });
  }
}

app.storageQueue('privacyDsrProcessor', {
  queueName: QUEUE_NAME,
  connection: QUEUE_CONNECTION,
  handler: handleDsrQueue,
});
