import { app, HttpResponseInit } from '@azure/functions';

/**
 * Health endpoint - true liveness check with zero I/O.
 * Returns 200 immediately with no dependencies, minimal processing.
 * Separate readiness checks should use /api/ready.
 */
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async (): Promise<HttpResponseInit> => ({ status: 200, body: 'ok' }),
});
