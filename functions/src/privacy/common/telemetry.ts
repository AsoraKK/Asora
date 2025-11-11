import type { InvocationContext } from '@azure/functions';

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
