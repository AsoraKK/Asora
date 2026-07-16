/**
 * Health Check HTTP Function
 * 
 * GET /api/health
 * 
 * Returns a minimal liveness/readiness envelope.
 * Used by Azure health probes and monitoring.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { configService } from '../../shared/configService';
import { getFcmConfigStatus } from '../notifications/clients/fcmClient';

/**
 * Health Check Handler
 * 
 * Returns:
 * - 200: System healthy and ready
 * - 503: System degraded or not ready
 * 
 * Response format:
 * {
 *   "status": "healthy" | "degraded",
 *   "timestamp": "ISO8601",
 *   "ready": boolean
 * }
 */
async function healthCheck(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('[Health Check] Executing health check');

  try {
    // Get config summary (no secrets)
    const configSummary = configService.getHealthSummary();
    const cosmosInfo = configSummary.cosmos as { configured: boolean; databaseName: string };
    const fcmStatus = getFcmConfigStatus();

    // Determine dependency health
    const cosmosHealthy = cosmosInfo.configured;
    const notificationsHealthy = fcmStatus.configured;

    // ── EasyAuth configuration check ──────────────────────────────
    const easyAuthEnabled = process.env.WEBSITE_AUTH_ENABLED?.toLowerCase() === 'true';
    const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
    const appEnv = (process.env.APP_ENV ?? '').toLowerCase();
    const isProductionLike =
      nodeEnv === 'production' ||
      nodeEnv === 'staging' ||
      appEnv === 'production' ||
      appEnv === 'prod' ||
      appEnv === 'staging';
    const easyAuthMisconfigured = isProductionLike && !easyAuthEnabled;

    let status: 'healthy' | 'degraded' = 'healthy';
    let httpStatus = 200;
    if (!cosmosHealthy) {
      status = 'degraded';
      httpStatus = 503; // Cosmos is critical
    }

    if (!notificationsHealthy) {
      status = 'degraded';
    }

    if (easyAuthMisconfigured) {
      status = 'degraded';
      httpStatus = 503; // Auth infra is critical
    }

    // Do not disclose runtime environment, dependency names, infrastructure
    // configuration, provider project IDs, or error classifications to a
    // public health caller. Those details are available through protected
    // operational telemetry.
    const response = {
      status,
      timestamp: new Date().toISOString(),
      ready: status === 'healthy',
    };

    context.log(`[Health Check] Status: ${status}`);

    return {
      status: httpStatus,
      jsonBody: response,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    };
  } catch (error) {
    context.error('[Health Check] Error during health check:', error);

    return {
      status: 503,
      jsonBody: {
        status: 'error',
        timestamp: new Date().toISOString(),
        ready: false,
        error: 'Health check failed',
      },
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    };
  }
}

// Register HTTP trigger
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthCheck
});
