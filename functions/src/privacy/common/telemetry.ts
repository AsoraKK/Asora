import type { InvocationContext } from '@azure/functions';
import { createHash } from 'node:crypto';

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
