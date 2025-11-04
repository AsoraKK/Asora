import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * Readiness endpoint - checks critical dependencies with tight timeouts.
 * Returns 200 if all dependencies are ready, 503 if any are unavailable.
 * 
 * This endpoint is separate from /health to allow deployment probes to succeed
 * even when dependencies (DB, caches) are temporarily unavailable.
 */
export async function ready(
  _req: HttpRequest,
  _ctx: InvocationContext
): Promise<HttpResponseInit> {
  const checks: { name: string; status: 'ok' | 'fail'; message?: string }[] = [];
  
  // Check 1: Environment variables
  const requiredEnvVars = ['COSMOS_CONNECTION_STRING', 'EMAIL_HASH_SALT'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    checks.push({
      name: 'environment',
      status: 'fail',
      message: `Missing: ${missingVars.join(', ')}`
    });
  } else {
    checks.push({ name: 'environment', status: 'ok' });
  }
  
  // Check 2: Cosmos DB connection (if implemented)
  // TODO: Add actual DB ping with 1-second timeout when Cosmos client is ready
  // try {
  //   await cosmosClient.database('asora').container('users').readItem('healthcheck', 'healthcheck', { timeout: 1000 });
  //   checks.push({ name: 'cosmos', status: 'ok' });
  // } catch (err) {
  //   checks.push({ name: 'cosmos', status: 'fail', message: err.message });
  // }
  
  const allReady = checks.every(c => c.status === 'ok');
  const status = allReady ? 200 : 503;
  
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
    jsonBody: {
      ready: allReady,
      checks,
      timestamp: new Date().toISOString(),
    },
  };
}

app.http('ready', {
  methods: ['GET'],
  authLevel: 'function', // Requires function key
  route: 'ready',
  handler: ready,
});
