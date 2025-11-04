import { app, HttpResponseInit } from '@azure/functions';

/**
 * Health endpoint - true liveness check with zero I/O.
 * Returns 200 immediately with no dependencies, minimal processing.
 * Never throws - wrapped in try-catch to guarantee 200 response.
 */
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async (): Promise<HttpResponseInit> => {
    try {
      const commit = process.env.GIT_SHA ?? 'unknown';
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { status: 'ok', commit },
      };
    } catch {
      // Never crash liveness - return minimal response if anything fails
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { status: 'ok' },
      };
    }
  },
});
