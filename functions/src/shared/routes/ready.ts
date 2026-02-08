import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { configService } from '../../../shared/configService';

/**
 * Readiness probe — verifies that critical dependencies are configured
 * and accessible before the load balancer sends live traffic.
 *
 * GET /api/ready
 *
 * Returns 200 when Cosmos (required) is configured.
 * Returns 503 with details when a critical dependency is missing.
 */
const readyHandler = async (_req: HttpRequest): Promise<HttpResponseInit> => {
  try {
    const summary = configService.getHealthSummary();
    const cosmosInfo = summary.cosmos as { configured: boolean; databaseName: string };
    const checks: Record<string, boolean> = {
      cosmos: cosmosInfo.configured,
    };

    const allReady = Object.values(checks).every(Boolean);

    if (!allReady) {
      return {
        status: 503,
        jsonBody: {
          status: 'not_ready',
          checks,
          timestamp: new Date().toISOString(),
        },
      };
    }

    return {
      status: 200,
      jsonBody: {
        status: 'ready',
        checks,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (e) {
    return { status: 503, jsonBody: { status: 'degraded', error: String((e as Error)?.message ?? e) } };
  }
};

app.http('ready', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ready',
  handler: readyHandler,
});

export { readyHandler as ready };
