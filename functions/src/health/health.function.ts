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

    // Determine overall health status
    // System is "healthy" if Cosmos is configured (critical dependency)
    // Notification Hub is optional (can be disabled in dev/test)
    const cosmosInfo = configSummary.cosmos as { configured: boolean; databaseName: string };
    const isHealthy = cosmosInfo.configured;
    const status = isHealthy ? 'healthy' : 'degraded';
    const httpStatus = isHealthy ? 200 : 503;

    // Response body
    const response = {
      status,
      timestamp: new Date().toISOString(),
      config: configSummary
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
