import { app } from '@azure/functions';

/**
 * Health endpoint - true liveness check with zero I/O.
 * Returns 200 immediately with no dependencies, no async overhead.
 * Separate readiness checks should use /api/ready.
 */
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async () => new Response('ok', { status: 200 }),
});
