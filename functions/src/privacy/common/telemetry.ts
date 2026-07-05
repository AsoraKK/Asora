import type { InvocationContext } from '@azure/functions';
import { getTelemetryClient, trackAppEvent } from '@shared/appInsights';
import { createHash } from 'node:crypto';

type DsrTelemetryProperties = Record<string, string | number | boolean | null | undefined>;

export function emitSpan(
  context: InvocationContext,
  name: string,
  meta: Record<string, unknown> = {},
): void {
  context.log(`dsr.${name}`, {
    invocationId: context.invocationId,
    ...meta,
  });
}

export function trackDsrEvent(name: string, properties: DsrTelemetryProperties = {}): void {
  const normalizedProperties: Record<string, string | number | boolean | undefined> = {};
  for (const [key, value] of Object.entries(properties)) {
    normalizedProperties[key] = value === null ? undefined : value;
  }

  trackAppEvent({
    name,
    properties: normalizedProperties,
  });
  getTelemetryClient()?.flush();
}

export function auditLog(context: InvocationContext, message: string, meta: Record<string, unknown> = {}): void {
  context.log('dsr.audit', {
    message,
    timestamp: new Date().toISOString(),
    invocationId: context.invocationId,
    ...meta,
  });
}

export function safeHashIdentifier(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}
