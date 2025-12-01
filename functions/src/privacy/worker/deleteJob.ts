import type { InvocationContext } from '@azure/functions';
import { createAuditEntry, DsrRequest } from '../common/models';
import { emitSpan } from '../common/telemetry';
import { patchDsrRequest, hasLegalHold } from '../service/dsrStore';
import { executeCascadeDelete } from '../service/cascadeDelete';
import { getErrorMessage } from '@shared/errorUtils';

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
    // Check for user-level legal hold before proceeding
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

    // Execute full cascade deletion/anonymization
    emitSpan(context, 'delete.cascade.start', { userId: request.userId });
    
    const cascadeResult = await executeCascadeDelete({
      userId: request.userId,
      deletedBy: `dsr:${requestId}`,
    });

    // Log cascade results
    context.log('dsr.delete.cascade.result', {
      requestId,
      userId: request.userId,
      cosmos: cascadeResult.cosmos,
      postgres: cascadeResult.postgres,
      errorCount: cascadeResult.errors.length,
    });

    // Check if there were critical errors
    if (cascadeResult.errors.length > 0) {
      // Log each error
      for (const error of cascadeResult.errors) {
        context.log('dsr.delete.cascade.error', { requestId, ...error });
      }

      // Check if it's a complete failure (e.g., legal hold blocked everything)
      const userHoldError = cascadeResult.errors.find(e => 
        e.container === 'user' && e.error.includes('legal hold')
      );
      
      if (userHoldError) {
        await patchDsrRequest(
          requestId,
          {
            status: 'failed',
            failureReason: userHoldError.error,
            completedAt: new Date().toISOString(),
          },
          createAuditEntry({ by: 'system', event: 'delete.hold', meta: { errors: cascadeResult.errors } }),
        );
        emitSpan(context, 'delete.hold', { requestId });
        return;
      }
    }

    emitSpan(context, 'delete.cascade.complete', { 
      requestId,
      cosmosDeleted: Object.values(cascadeResult.cosmos.deleted).reduce((a, b) => a + b, 0),
      cosmosAnonymized: Object.values(cascadeResult.cosmos.anonymized).reduce((a, b) => a + b, 0),
      postgresDeleted: Object.values(cascadeResult.postgres.deleted).reduce((a, b) => a + b, 0),
    });

    await patchDsrRequest(
      requestId,
      {
        status: 'succeeded',
        completedAt: new Date().toISOString(),
        failureReason: undefined,
      },
      createAuditEntry({ 
        by: 'system', 
        event: 'delete.succeeded',
        meta: {
          cosmos: cascadeResult.cosmos,
          postgres: cascadeResult.postgres,
          errorCount: cascadeResult.errors.length,
        },
      }),
    );
    emitSpan(context, 'delete.completed', { requestId });
  } catch (error: unknown) {
    const reason = getErrorMessage(error);
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
