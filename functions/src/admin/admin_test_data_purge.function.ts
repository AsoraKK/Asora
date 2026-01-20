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

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { purgeExpiredTestData, purgeTestSession } from './test_data_cleanup.function';

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

  try {
    // Extract and verify admin JWT
    const auth = await extractAuthContext(ctx);
    
    // Verify admin role
    if (!auth.roles?.includes('admin')) {
      return ctx.forbidden('Admin role required', 'FORBIDDEN');
    }

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

    return ctx.ok({
      success: result.errors.length === 0,
      deletedCount: result.deletedCount,
      expiredCount: result.expiredCount,
      errors: result.errors,
      durationMs: result.durationMs,
    });
  } catch (error) {
    ctx.context.error(`[admin_test_data_purge] Error: ${error}`, { correlationId: ctx.correlationId });

    if (error instanceof Error) {
      if (error.message.includes('JWT verification failed') || error.message.includes('Missing Authorization')) {
        return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
      }
    }

    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('admin_test_data_purge', {
  methods: ['POST'],
  authLevel: 'anonymous', // Auth verified in handler via JWT
  route: 'admin/test-data/purge',
  handler: admin_test_data_purge,
});
