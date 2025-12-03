/**
 * Health Check HTTP Function
 * 
 * GET /api/health
 * 
 * Returns system health status, configuration summary, and readiness indicators.
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
 *   "config": {
 *     "environment": "string",
 *     "notificationHub": { "name": "string", "enabled": boolean },
 *     "cosmos": { "endpoint": "string" }
 *   }
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
    const notificationsInfo = configSummary.notifications as {
      enabled: boolean;
      fcmConfigured: boolean;
      fcmProjectId?: string;
    };
    const fcmStatus = getFcmConfigStatus();

    // Determine dependency health
    const cosmosHealthy = cosmosInfo.configured;
    const notificationsHealthy = fcmStatus.configured;

    let status: 'healthy' | 'degraded' = 'healthy';
    let httpStatus = 200;
    const degradations: string[] = [];

    if (!cosmosHealthy) {
      status = 'degraded';
      httpStatus = 503; // Cosmos is critical
      degradations.push('cosmos_not_configured');
    }

    if (!notificationsHealthy) {
      status = 'degraded';
      degradations.push('fcm_not_configured');
    }

    const response = {
      status,
      timestamp: new Date().toISOString(),
      degradations,
      config: configSummary,
      notifications: {
        enabled: notificationsInfo.enabled,
        fcmConfigured: fcmStatus.configured,
        projectId: fcmStatus.projectId || notificationsInfo.fcmProjectId || null,
        error: fcmStatus.error ?? null,
      },
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
        error: error instanceof Error ? error.message : 'Unknown error'
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
