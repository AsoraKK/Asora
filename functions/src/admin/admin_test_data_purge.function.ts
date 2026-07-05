/**
 * Test Data Purge Admin Endpoint
 * 
 * POST /api/admin/test-data/purge
 * 
 * Manual purge of test data for admin use.
 * Supports purging by session ID or purging all expired test data.
 * 
 * Requires admin role.
 */

import { app, type HttpRequest } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { purgeExpiredTestData, purgeTestSession } from './test_data_cleanup.function';
import { requireActiveAdmin } from './adminAuthUtils';
import { buildAdminAuditIdentity } from './auditContext';
import { recordAdminAudit } from './auditLogger';

interface PurgeRequest {
  /** Specific session ID to purge (optional) */
  sessionId?: string;
  /** Purge all expired test data (default: false) */
  purgeExpired?: boolean;
}

interface PurgeResponse {
  success: boolean;
  deletedCount: number;
  expiredCount: number;
  errors: string[];
  durationMs: number;
}

export const admin_test_data_purge = httpHandler<PurgeRequest, PurgeResponse>(async (ctx) => {
  ctx.context.log(`[admin_test_data_purge] Purge request [${ctx.correlationId}]`);

  // SECURITY: Block test data purge in production environments
  const env = process.env.NODE_ENV || 'production';
  if (env === 'production') {
    return ctx.forbidden(
      'Test data purge is not available in production',
      'PRODUCTION_BLOCKED'
    );
  }

  try {
    const { sessionId, purgeExpired = false } = ctx.body || {};

    if (!sessionId && !purgeExpired) {
      return ctx.badRequest(
        'Either sessionId or purgeExpired must be specified',
        'INVALID_REQUEST'
      );
    }

    let result;

    if (sessionId) {
      // Purge specific session
      ctx.context.log('[admin_test_data_purge] Purging session', { sessionId });
      result = await purgeTestSession(sessionId, ctx.context);
    } else {
      // Purge all expired test data
      ctx.context.log('[admin_test_data_purge] Purging all expired test data');
      result = await purgeExpiredTestData(ctx.context);
    }

    const auditRequest = ctx.request ?? ({ headers: new Headers() } as HttpRequest);

    await recordAdminAudit({
      ...buildAdminAuditIdentity(auditRequest, ctx.context),
      action: 'TEST_DATA_PURGE',
      subjectId: sessionId ?? 'expired-test-data',
      targetType: 'config',
      reasonCode: purgeExpired ? 'TEST_DATA_PURGE_EXPIRED' : 'TEST_DATA_PURGE_SESSION',
      note: sessionId ?? null,
      before: {
        purgeExpired,
        sessionId: sessionId ?? null,
      },
      after: {
        deletedCount: result.deletedCount,
        expiredCount: result.expiredCount,
      },
      metadata: {
        durationMs: result.durationMs,
      },
    });

    return ctx.ok({
      success: result.errors.length === 0,
      deletedCount: result.deletedCount,
      expiredCount: result.expiredCount,
      errors: result.errors,
      durationMs: result.durationMs,
    });
  } catch (error) {
    ctx.context.error(`[admin_test_data_purge] Error: ${error}`, { correlationId: ctx.correlationId });

    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('admin_test_data_purge', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'admin/test-data/purge',
  handler: requireActiveAdmin(admin_test_data_purge as any),
});
