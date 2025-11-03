import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

const GIT_SHA = process.env.GIT_SHA || 'dev';
const START_TIME = Date.now();

/**
 * Health endpoint - fully static, no external dependencies.
 * Returns 200 with build metadata and uptime.
 * Must never touch Cosmos, Key Vault, or auth to ensure reliability.
 */
export async function health(
  _req: HttpRequest,
  _ctx: InvocationContext
): Promise<HttpResponseInit> {
  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);
  
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Commit': GIT_SHA,
      'X-Uptime-Seconds': uptimeSeconds.toString(),
    },
    jsonBody: {
      status: 'ok',
      version: GIT_SHA,
      uptimeSeconds,
      timestamp: new Date().toISOString(),
    },
  };
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: health,
});
