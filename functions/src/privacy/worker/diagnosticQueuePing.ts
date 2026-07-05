import { app, InvocationContext } from '@azure/functions';

const DIAGNOSTIC_QUEUE_ENABLED = process.env.DSR_DIAGNOSTIC_QUEUE_ENABLED === 'true';
const DIAGNOSTIC_QUEUE_NAME = process.env.DSR_DIAGNOSTIC_QUEUE_NAME ?? 'dsr-diagnostic-ping';
const DIAGNOSTIC_QUEUE_CONNECTION =
  process.env.DSR_DIAGNOSTIC_QUEUE_CONNECTION ??
  process.env.DSR_QUEUE_CONNECTION ??
  'AzureWebJobsStorage';

type DiagnosticPingMessage = {
  type?: string;
  correlationId?: string;
};

function sanitizeCorrelationId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    return 'missing';
  }

  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64) || 'missing';
}

function parseMessage(payload: unknown): DiagnosticPingMessage | null {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as DiagnosticPingMessage;
    } catch {
      return null;
    }
  }

  if (typeof payload === 'object' && payload !== null) {
    return payload as DiagnosticPingMessage;
  }

  return null;
}

export async function handleDiagnosticQueuePing(
  payload: unknown,
  context: InvocationContext,
): Promise<void> {
  const parsed = parseMessage(payload);
  if (!parsed) {
    context.log('dsr.diagnostic.ping.invalid', { payloadType: typeof payload });
    return;
  }

  context.log('dsr.diagnostic.ping.received', {
    correlationId: sanitizeCorrelationId(parsed.correlationId),
    type: parsed.type ?? 'unknown',
    queue: DIAGNOSTIC_QUEUE_NAME,
  });
}

if (DIAGNOSTIC_QUEUE_ENABLED) {
  app.storageQueue('privacyDsrDiagnosticPing', {
    queueName: DIAGNOSTIC_QUEUE_NAME,
    connection: DIAGNOSTIC_QUEUE_CONNECTION,
    handler: handleDiagnosticQueuePing,
  });
}
